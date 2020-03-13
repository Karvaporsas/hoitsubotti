/*jslint node: true */
/*jshint esversion: 6 */
'use strict';

const database = require('./../database');
const helper = require('./../helper');
const moment = require('moment');
const _ = require('underscore');
const _treshold = moment().add(-1, 'day');

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

module.exports = {
    getStatistics(chatId, resolve, reject) {
        var initialPromises = [];

        initialPromises.push(database.getLatestOperation('coronaloader'));
        initialPromises.push(database.getConfirmedCases());
        initialPromises.push(database.getDeadCases());
        initialPromises.push(database.getRecoveredCases());

        Promise.all(initialPromises).then((allInitResults) => {
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

            var operation = allInitResults[0];
            var confirmedCases = allInitResults[1];
            var deadCases = allInitResults[2];
            var recoveredCases = allInitResults[3];
            var lastUpdateString = moment(`${operation.yr}-${operation.mon}-${operation.day} ${operation.hour}:${operation.minute}`, 'YYYY-MM-DD HH:mm')
                .add(2, 'hours')
                .format('DD.MM.YYYY HH:mm');
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

            resolve({
                status: 1,
                type: 'text',
                message: `${resultMsg}${confirmedDataString}${recoveredDataString}${deadDataString}`
            });
        }).catch((e) => {
            reject(e);
        });
    }
};