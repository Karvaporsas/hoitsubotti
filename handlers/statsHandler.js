/*jslint node: true */
/*jshint esversion: 6 */
'use strict';

const database = require('./../database');
const helper = require('./../helper');
const moment = require('moment');
const _ = require('underscore');
const _treshold = moment().add(-1, 'day');
const _botNotificationName = 'hoitsubotti';

function _getLatestOperationTime(operation) {
    const mon = parseInt(operation.mon) + 1;
    return moment(`${operation.yr}-${mon}-${operation.day} ${operation.hour}:${operation.minute}:00`, 'YYYY-MM-DD HH:mm:ss');
}

function _parseCountyName(countyName) {
    if (countyName == 'Pohjois-Pohjanmaa') {
        return 'P-Pohjanmaa';
    }

    return countyName;
}

function _isAfterTreshold(c) {
    if (c.hasOwnProperty('acqDate')) {
        return c.acqDate.isAfter(_treshold);
    }
    if (c.hasOwnProperty('date')) {
        return c.date.isAfter(_treshold);
    }

    return false;
}

function _getCaseDataTableString(cases, cols) {
    var caseData = [];

    var countyGroups = _.groupBy(cases, function (c) {
        return c.healthCareDistrict;
    });

    for (const countyName in countyGroups) {
        if (countyGroups.hasOwnProperty(countyName)) {
            const g = countyGroups[countyName];
            const newCases = _.filter(g, _isAfterTreshold);

            caseData.push({
                healthCareDistrict: _parseCountyName(countyName),
                amt: g.length,
                newCases: newCases.length
            });
        }
    }

    caseData.sort(function(a, b) {
        return b.amt - a.amt;
    });

    return helper.formatTableDataString(caseData, cols) || '';
}

function _processData(operation, confirmedCases, deadCases, recoveredCases) {
    const confirmedCols = [
        {colProperty: 'healthCareDistrict', headerName: 'Alue'},
        {colProperty: 'amt', headerName: `Tartunnat`},
        {colProperty: 'newCases', headerName: `24h`}
    ];
    const recoveredCols = [
        {colProperty: 'healthCareDistrict', headerName: 'Alue'},
        {colProperty: 'amt', headerName: `Parantuneet`},
        {colProperty: 'newCases', headerName: `24h`}
    ];
    const deadCols = [
        {colProperty: 'healthCareDistrict', headerName: 'Alue'},
        {colProperty: 'amt', headerName: `Kuolleet`},
        {colProperty: 'newCases', headerName: `24h`}
    ];

    var lastUpdateString = _getLatestOperationTime(operation).add(2, 'hours').format('DD.MM.YYYY HH:mm');
    var confirmedNew = _.filter(confirmedCases, _isAfterTreshold);
    var recoveredNew = _.filter(recoveredCases, _isAfterTreshold);
    var confirmedPercent = (confirmedNew.length / (confirmedCases.length || 1) * 100).toFixed(0);
    var ingress = `Tartuntoja ${confirmedCases.length}, joista 24h aikana ${confirmedNew.length}.\nKasvua ${confirmedPercent}% vuorokaudessa.\n\nParantuneita ${recoveredCases.length}, joista 24h aikana ${recoveredNew.length}.`;

    var resultMsg = helper.formatListMessage(`Tilastot (${lastUpdateString})`, ingress, [], []);
    var confirmedDataString = _getCaseDataTableString(confirmedCases, confirmedCols);
    var recoveredDataString = _getCaseDataTableString(recoveredCases, recoveredCols);
    var deadDataString = '';

    if (deadCases.length) {
        var deadNew = _.filter(deadCases, _isAfterTreshold);
        ingress += `\n\nKuolleita ${deadCases.length}, joista 24h aikana ${deadNew.length}.`;
        deadDataString = _getCaseDataTableString(deadCases, deadCols);
    }

    return {
        status: 1,
        type: 'text',
        message: `${resultMsg}${confirmedDataString}${recoveredDataString}${deadDataString}`
    };
}

module.exports = {
    checkNewCases(resolve, reject) {
        database.getNotificators(_botNotificationName).then((chatsToNotify) => {
            if (!chatsToNotify.length) {
                reject('No chats to notify. Set NOTIFIED_CHATS');
            } else {
                var initialPromises = [];

                initialPromises.push(database.getLatestOperation('coronaautosender'));
                initialPromises.push(database.getConfirmedCases());
                initialPromises.push(database.getDeadCases());
                initialPromises.push(database.getRecoveredCases());
                initialPromises.push(database.getLatestOperation('coronaloader'));

                Promise.all(initialPromises).then((results) => {
                    var operation = results[0];
                    var operationTreshold = _getLatestOperationTime(operation).subtract(1, 'minute');
                    var allCases = results[1].concat(results[2]).concat(results[3]);
                    var allNewCases = _.filter(allCases, function (c) { return c.insertDate.isAfter(operationTreshold); });

                    if (!allNewCases.length) {
                        resolve({status: 0, message: 'No new cases'});
                    } else {
                        database.updateOperation(operation).then(() => {
                            var resultMessage = _processData(results[4], results[1], results[2], results[3]);
                            var result = {
                                status: 1,
                                hasMultipleMessages: true,
                                message: resultMessage,
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
    getStatistics(resolve, reject) {
        var initialPromises = [];

        initialPromises.push(database.getLatestOperation('coronaloader'));
        initialPromises.push(database.getConfirmedCases());
        initialPromises.push(database.getDeadCases());
        initialPromises.push(database.getRecoveredCases());

        Promise.all(initialPromises).then((allInitResults) => {
            var result = _processData(allInitResults[0], allInitResults[1], allInitResults[2], allInitResults[3]);
            resolve(result);
        }).catch((e) => {
            reject(e);
        });
    }
};