/*jslint node: true */
/*jshint esversion: 6 */
'use strict';

const database = require('./../database');
const helper = require('./../helper');
const moment = require('moment');
const _ = require('underscore');

function _capitalizeFirstWord(s) {
    var result = '';
    s = s.toString();

    if (!s || !s.length) {
        return result;
    }

    result = s.charAt(0);
    result = result.toUpperCase();

    if (s.length > 1) {
        result += s.substr(1);
    }

    return result;
}

module.exports = {
    getStatistics(chatId, resolve, reject) {
        var initialPromises = [];

        initialPromises.push(database.getLatestOperation('coronaloader'));
        initialPromises.push(database.getConfirmedCases());
        initialPromises.push(database.getDeadCases());
        initialPromises.push(database.getRecoveredCases());

        Promise.all(initialPromises).then((allInitResults) => {
            var operation = allInitResults[0];
            var lastUpdate = moment(`${operation.yr}-${operation.mon}-${operation.day} ${operation.hour}:${operation.minute}`, 'YYYY-MM-DD HH:mm');
            lastUpdate.add(2, 'hours');
            var lastUpdateString = lastUpdate.format('DD.MM.YYYY HH:mm');
            var confirmedCases = allInitResults[1];

            var countyGroups = _.groupBy(confirmedCases, function (c) {
                return c.healthCareDistrict;
            });

            var treshold = moment().add(-1, 'day');
            function isAfterTreshold(c) {
                return c.acqDate.isAfter(treshold);
            }
            var allNew = _.filter(confirmedCases, isAfterTreshold);
            var allPercent = (allNew.length / (confirmedCases.length || 1) * 100).toFixed(0);

            var caseData = [];

            for (const countyName in countyGroups) {
                if (countyGroups.hasOwnProperty(countyName)) {
                    const g = countyGroups[countyName];
                    const newCases = _.filter(g, isAfterTreshold);
                    var changepct = (newCases.length / (g.length || 1) * 100).toFixed(0);
                    caseData.push({
                        healthCareDistrict: countyName,
                        amt: g.length,
                        newCases: newCases.length,
                        changePct: changepct
                    });
                }
            }

            caseData.sort(function(a, b) {
                return b.amt - a.amt;
            });

            var cols = [
                {colProperty: 'healthCareDistrict', headerName: 'Alue'},
                {colProperty: 'amt', headerName: `Tapauksia`},
                {colProperty: 'newCases', headerName: `24h`}
                //{colProperty: 'changePct', headerName: `%`}
            ];

            var ingress = `Tartuntoja ${confirmedCases.length}, joista uusia ${allNew.length}.\nKasvua ${allPercent}% vuorokaudessa.\nPäivitetty ${lastUpdateString}`;
            var resultMsg = helper.formatListMessage(`Tilastot`, ingress, caseData, cols);

            var response = {status: 1,
                type: 'text',
                message: resultMsg
            };

            resolve(response);
        }).catch((e) => {
            reject(e);
        });
    }
};