/*jslint node: true */
/*jshint esversion: 6 */
'use strict';

const moment = require('moment');
const fs = require('fs');
const operations = require('./operationFunctions');
const OPERATIONS_TABLE = process.env.OPERATIONS_TABLE;
const CONFIRMED_TABLE = process.env.CONFIRMED_TABLE;
const DEATHS_TABLE = process.env.DEATHS_TABLE;
const RECOVERED_TABLE = process.env.RECOVERED_TABLE;
const CASE_BUCKET = process.env.CHART_BUCKET;
const THL_CASES_LINK = process.env.THL_CASES_LINK;
const utils = require('../utils');

const _hcdNames = [
    'Ahvenanmaa',
    'Varsinais-Suomi',
    'Satakunta',
    'Kanta-Häme',
    'Pirkanmaa',
    'Päijät-Häme',
    'Kymenlaakso',
    'Etelä-Karjala',
    'Etelä-Savo',
    'Itä-Savo',
    'Pohjois-Karjala',
    'Pohjois-Savo',
    'Keski-Suomi',
    'Etelä-Pohjanmaa',
    'Vaasa',
    'Keski-Pohjanmaa',
    'Pohjois-Pohjanmaa',
    'Kainuu',
    'Länsi-Pohja',
    'Lappi',
    'HUS'
];

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
    getConfirmedCasesFromS3(s3, dynamoDb) {
        return new Promise((resolve, reject) => {
            operations.getChartLink(dynamoDb, THL_CASES_LINK).then((chartLink) => {
                const inputFilename = '/tmp/' + chartLink.url;
                const writeStream = fs.createWriteStream(inputFilename);

                s3.getObject({
                    Bucket: CASE_BUCKET,
                    Key: chartLink.url
                }).createReadStream().pipe(writeStream);
                writeStream.on('finish', function() {
                    fs.readFile(inputFilename, 'utf8', function(err, data) {
                        if (err) {
                            console.log('Error reading case file');
                            console.log(err);
                            reject(err);
                        } else {
                            var parsedData = JSON.parse(data);
                            var results = [];
                            for (const hcd of _hcdNames) {
                                var casesFromDistrict = parsedData[hcd];
                                for (const dayOfHCD of casesFromDistrict) {
                                    for (let index = 0; index < dayOfHCD.value; index++) {
                                        var md = moment(dayOfHCD.date);
                                        results.push({
                                            acqDate: md,
                                            healthCareDistrict: dayOfHCD.healthCareDistrict,
                                            insertDate: md
                                        });
                                    }
                                }
                            }

                            resolve(results);
                        }

                    });
                });
                writeStream.on('error', function (err) {
                    console.log('Error getting image from S3');
                    console.log(err);
                    reject(err);
                });
            }).catch((e) => {
                console.log('Error getting chart link');
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