/*jslint node: true */
/*jshint esversion: 6 */
'use strict';

const database = require('./../database');
const helper = require('./../helper');
const moment = require('moment');
const _ = require('underscore');
const _botNotificationName = 'hoitsubotti';

var _treshold = moment().add(-1, 'day');

/**
 * Gets last operation run time
 * @param {operation} operation from where to extract time
 *
 * @returns moment of last time this operation was run successfully
 */
function _getLatestOperationTime(operation) {
    const mon = parseInt(operation.mon) + 1;
    return moment(`${operation.yr}-${mon}-${operation.day} ${operation.hour}:${operation.minute}:00`, 'YYYY-MM-DD HH:mm:ss');
}

/**
 * Parses county names so that they are not too long (mobile friendly "tables" on client)
 * @param {string} countyName to parse
 *
 * @returns short enough county string
 */
function _parseCountyName(countyName) {
    if (countyName == 'Pohjois-Pohjanmaa') {
        return 'P-Pohjanmaa';
    }

    return countyName;
}

/**
 * Formats message string from input
 * @param {Array} cases of corona
 * @param {Array} cols to present
 *
 * @returns message string
 */
function _getCaseDataTableString(cases, cols, tresholdParam, treshold, hideIfNoNewCases = false) {
    var caseData = [];

    var countyGroups = _.groupBy(cases, function (c) {
        return c.healthCareDistrict;
    });

    for (const countyName in countyGroups) {
        if (countyGroups.hasOwnProperty(countyName)) {
            const g = countyGroups[countyName];
            const newCases = _.filter(g, function(c) { return c[tresholdParam].isAfter(treshold); }); //jshint ignore:line
            if (!hideIfNoNewCases || (hideIfNoNewCases && newCases.length)) {
                caseData.push({
                    healthCareDistrict: _parseCountyName(countyName),
                    amt: g.length,
                    newCases: newCases.length
                });
            }
        }
    }

    caseData.sort(function(a, b) {
        return b.amt - a.amt;
    });

    return helper.formatTableDataString(caseData, cols) || '';
}

/**
 * Creates message object with old and fresh (24h) cases that can be sent to telegram chats and channels
 *
 * @param {operation} operation of last successfull input operation from source data
 * @param {Array} confirmedCases of corona
 * @param {Array} deadCases from corona
 * @param {Array} recoveredCases of corona
 *
 * @returns message object to send to telegram
 */
function _createCaseData(operation, confirmedCases, deadCases, recoveredCases) {
    const confirmedCols = [
        {colProperty: 'healthCareDistrict', headerName: 'Alue'},
        {colProperty: 'amt', headerName: `Tartunnat`},
        {colProperty: 'newCases', headerName: '24h'}
    ];
    const recoveredCols = [
        {colProperty: 'healthCareDistrict', headerName: 'Alue'},
        {colProperty: 'amt', headerName: `Parantuneet`},
        {colProperty: 'newCases', headerName: '24h'}
    ];
    const deadCols = [
        {colProperty: 'healthCareDistrict', headerName: 'Alue'},
        {colProperty: 'amt', headerName: `Kuolleet`},
        {colProperty: 'newCases', headerName: '24h'}
    ];

    var lastUpdateString = _getLatestOperationTime(operation).add(2, 'hours').format('DD.MM.YYYY HH:mm');
    var confirmedNew = _.filter(confirmedCases, function (c) { return c.acqDate.isAfter(_treshold); });
    var recoveredNew = _.filter(recoveredCases, function (c) { return c.date.isAfter(_treshold); });
    var deadNew = _.filter(deadCases, function (c) { return c.date.isAfter(_treshold); });
    var confirmedPercent = (confirmedNew.length / (confirmedCases.length || 1) * 100).toFixed(0);
    var ingress = `Tartuntoja ${confirmedCases.length}, joista 24h aikana ${confirmedNew.length}.\nKasvua ${confirmedPercent}% vuorokaudessa.\n\nParantuneita ${recoveredCases.length}, joista 24h aikana ${recoveredNew.length}.`;

    if (deadCases.length) ingress += `\n\nKuolleita ${deadCases.length}, joista 24h aikana ${deadNew.length}.`;

    var resultMsg = helper.formatListMessage(`Tilastot (${lastUpdateString})`, ingress, [], []);
    var confirmedDataString = _getCaseDataTableString(confirmedCases, confirmedCols, 'acqDate', _treshold);
    var recoveredDataString = _getCaseDataTableString(recoveredCases, recoveredCols, 'date', _treshold);
    var deadDataString = deadCases.length ? _getCaseDataTableString(deadCases, deadCols, 'date', _treshold) : '';

    return {
        status: 1,
        type: 'text',
        message: `${resultMsg}${confirmedDataString}${recoveredDataString}${deadDataString}`
    };
}

module.exports = {
    /**
     * Check if there are new cases and creates message based on them
     *
     * @param {function} resolve contains message object for further use
     * @param {function} reject contains error info
     */
    checkNewCases(resolve, reject) {
        database.getNotificators(_botNotificationName).then((chatsToNotify) => {
            if (!chatsToNotify.length) {
                reject('No chats to notify.');
            } else {
                var initialPromises = [];

                initialPromises.push(database.getLatestOperation('coronaautosender'));
                initialPromises.push(database.getConfirmedCases());
                initialPromises.push(database.getDeadCases());
                initialPromises.push(database.getRecoveredCases());

                Promise.all(initialPromises).then((results) => {
                    const cols = [
                        {colProperty: 'healthCareDistrict', headerName: 'Alue'},
                        {colProperty: 'newCases', headerName: 'Uusia'}
                    ];

                    var operation = results[0];
                    var operationTreshold = _getLatestOperationTime(operation).subtract(1, 'minute');
                    const hasNewConfirmed = _.filter(results[1], function(c) { return c.insertDate.isAfter(operationTreshold); }).length > 0;
                    const hasNewDeaths = _.filter(results[2], function(c) { return c.insertDate.isAfter(operationTreshold); }).length > 0;
                    const hasNewRecovered = _.filter(results[3], function(c) { return c.insertDate.isAfter(operationTreshold); }).length > 0;

                    if (!hasNewConfirmed && !hasNewDeaths && !hasNewRecovered) {
                        resolve({status: 0, message: 'No new cases'});
                    } else {
                        const confirmedTableString = _getCaseDataTableString(results[1], cols, 'insertDate', operationTreshold, true);
                        const deathsTableString = _getCaseDataTableString(results[2], cols, 'insertDate', operationTreshold, true);
                        const recoveredTableString = _getCaseDataTableString(results[3], cols, 'insertDate', operationTreshold, true);

                        database.updateOperation(operation).then(() => {
                            var newSinceString = operationTreshold.format('DD.MM.YYYY HH:mm');
                            var ingress = `Uudet tapaukset ${newSinceString} lähtien.`;
                            var header = helper.formatListMessage(`Uudet tapaukset`, ingress, [], []);
                            var resultMessage = `${header}`;

                            if (hasNewConfirmed) resultMessage += `\nTartunnat${confirmedTableString}`;
                            if (hasNewRecovered) resultMessage += `\nParantuneet${recoveredTableString}`;
                            if (hasNewDeaths) resultMessage += `\nKuolleet${deathsTableString}`;

                            var result = {
                                status: 1,
                                hasMultipleMessages: true,
                                message: {
                                    status: 1,
                                    type: 'text',
                                    message: resultMessage
                                },
                                chatIds: []
                            };

                            for (const notificator of chatsToNotify) {
                                result.chatIds.push(parseInt(notificator.chatId));
                            }

                            resolve(result);
                        }).catch((e) => {
                            reject(e);
                        });
                    }
                }).catch((e) => {
                    reject(e);
                });
            }

        }).catch((e) => {
            reject(e);
        });
    },
    /**
     * Generates statistics based on given inputs about decease situation
     * @param {function} resolve contains message object for further use
     * @param {function} reject contains error info
     */
    getStatistics(resolve, reject) {
        var initialPromises = [];

        initialPromises.push(database.getLatestOperation('coronaloader'));
        initialPromises.push(database.getConfirmedCases());
        initialPromises.push(database.getDeadCases());
        initialPromises.push(database.getRecoveredCases());

        Promise.all(initialPromises).then((allInitResults) => {
            resolve(_createCaseData(allInitResults[0], allInitResults[1], allInitResults[2], allInitResults[3]));
        }).catch((e) => {
            reject(e);
        });
    }
};