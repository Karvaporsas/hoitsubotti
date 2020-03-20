/*jslint node: true */
/*jshint esversion: 6 */
'use strict';

const moment = require('moment');
const OPERATIONS_TABLE = process.env.OPERATIONS_TABLE;
const CONFIRMED_TABLE = process.env.CONFIRMED_TABLE;
const DEATHS_TABLE = process.env.DEATHS_TABLE;
const RECOVERED_TABLE = process.env.RECOVERED_TABLE;

const utils = require('../utils');

module.exports = {
    getLatestOperation(dynamoDb, operationMainType) {
        return new Promise((resolve, reject) => {
            var params = {
                TableName: OPERATIONS_TABLE,
                FilterExpression: '#maintype = :maintype and #active = :istrue',
                ExpressionAttributeNames: {
                    '#maintype': 'maintype',
                    '#active': 'active'
                },
                ExpressionAttributeValues: {
                    ':maintype': operationMainType,
                    ':istrue': true
                }
            };

            utils.performScan(dynamoDb, params).then((operations) => {
                if (!operations || !operations.length) {
                    reject('No operations found');
                } else {
                    for (const op of operations) {
                        var d = new Date(op.yr, op.mon, op.day, op.hour, op.minute);
                        op.lastRun = d;
                    }
                    operations.sort(function (a, b) {
                        return b.lastRun - a.lastRun;
                    });

                    resolve(operations[0]);
                }
            }).catch((e) => {
                console.log('Error getting operations');
                console.log(e);
                reject(e);
            });
        });
    },
    getConfirmedCases(dynamoDb) {
        return new Promise((resolve, reject) => {
            var params = {
                TableName: CONFIRMED_TABLE,
                ProjectionExpression: '#id, #acq, #hcd, #is, #isc, #insDate',
                FilterExpression: '#isremoved <> :isremoved',
                ExpressionAttributeNames: {
                    '#id': 'id',
                    '#acq': 'acqDate',
                    '#hcd': 'healthCareDistrict',
                    '#is': 'infectionSource',
                    '#isc': 'infectionSourceCountry',
                    '#insDate': 'insertDate',
                    '#isremoved': 'isremoved'
                },
                ExpressionAttributeValues: {
                    ':isremoved': true
                }
            };

            utils.performScan(dynamoDb, params).then((cases) => {
                if (!cases || !cases.length) {
                    resolve([]);
                } else {
                    for (const coronaCase of cases) {
                        coronaCase.acqDate = moment(coronaCase.acqDate);
                        coronaCase.insertDate = moment(coronaCase.insertDate);
                    }
                    resolve(cases);
                }
            }).catch((e) => {
                console.error('error getting confirmed cases');
                console.log(e);
                reject(e);
            });
        });
    },
    getDeadCases(dynamoDb) {
        return new Promise((resolve, reject) => {
            var params = {
                TableName: DEATHS_TABLE,
                ProjectionExpression: '#id, #d, #hcd, #insDate',
                FilterExpression: '#isremoved <> :isremoved',
                ExpressionAttributeNames: {
                    '#id': 'id',
                    '#d': 'date',
                    '#hcd': 'healthCareDistrict',
                    '#insDate': 'insertDate',
                    '#isremoved': 'isremoved'
                },
                ExpressionAttributeValues: {
                    ':isremoved': true
                }
            };

            utils.performScan(dynamoDb, params).then((cases) => {
                if (!cases || !cases.length) {
                    resolve([]);
                } else {
                    for (const coronaCase of cases) {
                        coronaCase.date = moment(coronaCase.date);
                        coronaCase.insertDate = moment(coronaCase.insertDate);
                    }
                    resolve(cases);
                }
            }).catch((e) => {
                console.error('error getting confirmed cases');
                console.log(e);
                reject(e);
            });
        });
    },
    getRecoveredCases(dynamoDb) {
        return new Promise((resolve, reject) => {
            var params = {
                TableName: RECOVERED_TABLE,
                ProjectionExpression: '#id, #d, #hcd, #insDate',
                FilterExpression: '#isremoved <> :isremoved',
                ExpressionAttributeNames: {
                    '#id': 'id',
                    '#d': 'date',
                    '#hcd': 'healthCareDistrict',
                    '#insDate': 'insertDate',
                    '#isremoved': 'isremoved'
                },
                ExpressionAttributeValues: {
                    ':isremoved': true
                }
            };

            utils.performScan(dynamoDb, params).then((cases) => {
                if (!cases || !cases.length) {
                    resolve([]);
                } else {
                    for (const coronaCase of cases) {
                        coronaCase.date = moment(coronaCase.date);
                        coronaCase.insertDate = moment(coronaCase.insertDate);
                    }
                    resolve(cases);
                }
            }).catch((e) => {
                console.error('error getting confirmed cases');
                console.log(e);
                reject(e);
            });
        });
    }
};