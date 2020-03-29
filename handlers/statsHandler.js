/*jslint node: true */
/*jshint esversion: 6 */
'use strict';

const database = require('./../database');
const helper = require('./../helper');
const moment = require('moment');
const _ = require('underscore');
const _botNotificationName = 'hoitsubotti';

var _treshold = moment().add(-1, 'day');
const _perHourTimeWindow = moment().add(-3, 'days');

/**
 * Calculates case doubling time
 * @param {float} growthRate of cases in time period
 *
 * @returns number of period units is required for cases to double. -1 is returned if there is no growth at all.
 */
function _getDoublingTime(growthRate) {
    if (growthRate == 0) return -1;

    return Math.log(2) / Math.log(1 + growthRate); // using the formula from here https://en.wikipedia.org/wiki/Doubling_time
}

/**
 * Calculates periodical growth rate of cases
 * @param {Array} casesInPeriod
 * @param {Array} allCases
 *
 * @returns number indicating growth rate percentage. 5% growth rate is returned as 0.05, not 5
 */
function _getGrowthRate(casesInPeriod, allCases) {
    if (allCases.length == 0) return 0;

    return casesInPeriod.length / allCases.length;
}

/**
 * Gets cases that occured x days ago, from array of cases
 * @param {int} daysAgo which day's cases to fetch. 0 is today, 1 is yesterday...
 * @param {Array} allCases from where to find cases
 *
 * @returns cases in array
 */
function _getCasesByDate(daysAgo, allCases) {
    const beginMoment = moment().subtract(daysAgo, 'days').hour(0).minute(0).second(0);
    const endMoment  = moment().subtract(daysAgo, 'days').hour(23).minute(59).second(59);

    return _.filter(allCases, function (c) { return c.acqDate.isAfter(beginMoment) && c.acqDate.isBefore(endMoment); });
}

/**
 * Gets cases that occure before x days ago.
 * @param {int} daysAgo treshold value. Cases before end of this date are returned
 * @param {Array} allCases All cases
 *
 * @returns array of cases occuring before certain point in time
 */
function _getCasesBeforeDate(daysAgo, allCases) {
    const endMoment  = moment().subtract(daysAgo, 'days').hour(23).minute(59).second(59);

    return _.filter(allCases, function (c) { return c.acqDate.isBefore(endMoment); });
}

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
    if  (!countyName) {
        return 'Tuntematon';
    }
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
        return _parseCountyName(c.healthCareDistrict);
    });

    for (const countyName in countyGroups) {
        if (countyGroups.hasOwnProperty(countyName)) {
            const g = countyGroups[countyName];
            const newCases = _.filter(g, function(c) { return c[tresholdParam].isAfter(treshold); }); //jshint ignore:line
            if (!hideIfNoNewCases || (hideIfNoNewCases && newCases.length)) {
                caseData.push({
                    healthCareDistrict: countyName,
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

    var lastUpdateString = _getLatestOperationTime(operation).add(3, 'hours').format('DD.MM.YYYY HH:mm'); //Localize fo FIN time
    var confirmedNew = _.filter(confirmedCases, function (c) { return c.acqDate.isAfter(_treshold); });
    var confirmedPerHour = (_.filter(confirmedCases, function (c) { return c.acqDate.isAfter(_perHourTimeWindow); }).length / 72).toFixed(1);
    var recoveredNew = _.filter(recoveredCases, function (c) { return c.date.isAfter(_treshold); });
    var deadNew = _.filter(deadCases, function (c) { return c.date.isAfter(_treshold); });
    var confirmedPercent = (confirmedNew.length / (confirmedCases.length || 1) * 100).toFixed(0);
    var ingress = `Tartuntoja <strong>${confirmedCases.length}</strong>, joista 24h aikana <strong>${confirmedNew.length}</strong>.\nKasvua <strong>${confirmedPercent}</strong>% vuorokaudessa.\n\n<strong>${confirmedPerHour}</strong> uutta tartuntaa tunnissa viimeisen 3 päivän aikana.\n\nParantuneita <strong>${recoveredCases.length}</strong>, joista 24h aikana <strong>${recoveredNew.length}</strong>.`;

    if (deadCases.length) ingress += `\n\nKuolleita <strong>${deadCases.length}</strong>, joista 24h aikana <strong>${deadNew.length}</strong>.`;

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
                    var operationTreshold = _getLatestOperationTime(operation).subtract(30, 'seconds');
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
                            var newSinceString = operationTreshold.add(2, 'hours').format('DD.MM.YYYY HH:mm'); // FROM GMT to FIN
                            var ingress = `Uudet tapaukset ${newSinceString} lähtien.`;
                            var header = helper.formatListMessage(`Uudet tapaukset`, ingress, [], []);
                            var resultMessage = `${header}`;

                            if (hasNewConfirmed) resultMessage += `\nTartunnat${confirmedTableString}`;
                            if (hasNewRecovered) resultMessage += `\nParantuneet${recoveredTableString}`;
                            if (hasNewDeaths) resultMessage += `\nKuolleet${deathsTableString}`;

                            resultMessage += `\n\nHae lisää infoa /stats -komennolla.`;

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
    },
    /**
     * Generates statistics about the doubling time of virus
     * @param {Array} args contains arguments for function. [0] health care district name (string)
     * @param {function} resolve executed when caller function is successfully finished. Contains result of this
     * @param {function} reject executed when caller function receives an error
     */
    getDoublingTime(args, resolve, reject) {
        const doublingTimeCols = [
            {colProperty: 'dateString', headerName: 'Pvm'},
            {colProperty: 'dt', headerName: `Aika`}
        ];
        var initialPromises = [];

        initialPromises.push(database.getConfirmedCases());

        Promise.all(initialPromises).then((allInitResults) => {
            var cases = allInitResults[0];
            var hcd = '';
            if (args && args.length > 0) {
                cases = _.filter(cases, function (c) { return c.healthCareDistrict == args[0]; });

                if (!cases.length) {
                    resolve({
                        status: 1,
                        message: 'Nothing to show'
                    });
                    return;
                } else {
                    hcd = args[0];
                }
            }

            var doublingTimes = [];
            for (let daysAgo = 0; daysAgo < 14; daysAgo++) {
                const casesBeforeDate = _getCasesBeforeDate(daysAgo, cases);
                const casesAtDate = _getCasesByDate(daysAgo, casesBeforeDate);
                const growthRate = _getGrowthRate(casesAtDate, casesBeforeDate);
                const dt = _getDoublingTime(growthRate).toFixed(1);
                const dtString = dt > 0 ? `${dt} päivää` : 'Ei muutosta';
                const daysAgoDateString = moment().subtract(daysAgo, 'days').format('D.M.');

                if (daysAgo % 7 == 0 && daysAgo > 0) {
                    doublingTimes.push({
                        dateString: ' ',
                        dt: ' '
                    });
                }

                doublingTimes.push({
                    dateString: daysAgoDateString,
                    dt: dtString
                });
            }
            const ingress = 'Tartuntojen tuplaantumisajan muutos viimeisen 2 viikon ajalta';
            const header = hcd ? `Tuplaantumisaika (${hcd})` : `Tuplaantumisaika`;
            const resultMsg = helper.formatListMessage(header, ingress, doublingTimes, doublingTimeCols);

            resolve({
                status: 1,
                type: 'text',
                message: resultMsg
            });
        }).catch((e) => {
            reject(e);
        });
    }
};