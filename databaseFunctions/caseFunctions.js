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
const VACCINATIONS_TABLE = process.env.VACCINATIONS_TABLE;
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
                                            date: md,
                                            healthCareDistrict: dayOfHCD.healthCareDistrict,
                                            insertDateSortString: md.format(utils.getTimeFormat())
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
        var m = moment();
        console.log('Starting to get confirmed cases');

        return new Promise((resolve, reject) => {
            var params = {
                TableName: CONFIRMED_TABLE,
                ProjectionExpression: '#id, #d, #hcd, #is, #isc, #insDate, #datesort, #insertdatesort',
                FilterExpression: '#isremoved <> :isremoved',
                ExpressionAttributeNames: {
                    '#id': 'id',
                    '#d': 'date',
                    '#hcd': 'healthCareDistrict',
                    '#is': 'infectionSource',
                    '#isc': 'infectionSourceCountry',
                    '#insDate': 'insertDate',
                    '#isremoved': 'isremoved',
                    '#datesort': 'dateSortString',
                    '#insertdatesort': 'insertDateSortString'
                },
                ExpressionAttributeValues: {
                    ':isremoved': true
                }
            };

            utils.performScan(dynamoDb, params).then((cases) => {
                if (!cases || !cases.length) {
                    resolve([]);
                } else {
                    console.log('Ready to resolve in ' + moment().diff(m) + ' milliseconds');
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
                ProjectionExpression: '#id, #d, #hcd, #insDate, #datesort, #insertdatesort',
                FilterExpression: '#isremoved <> :isremoved',
                ExpressionAttributeNames: {
                    '#id': 'id',
                    '#d': 'date',
                    '#hcd': 'healthCareDistrict',
                    '#insDate': 'insertDate',
                    '#isremoved': 'isremoved',
                    '#datesort': 'dateSortString',
                    '#insertdatesort': 'insertDateSortString'
                },
                ExpressionAttributeValues: {
                    ':isremoved': true
                }
            };

            utils.performScan(dynamoDb, params).then((cases) => {
                if (!cases || !cases.length) {
                    resolve([]);
                } else {
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
                ProjectionExpression: '#id, #d, #hcd, #insDate, #datesort, #insertdatesort',
                FilterExpression: '#isremoved <> :isremoved',
                ExpressionAttributeNames: {
                    '#id': 'id',
                    '#d': 'date',
                    '#hcd': 'healthCareDistrict',
                    '#insDate': 'insertDate',
                    '#isremoved': 'isremoved',
                    '#datesort': 'dateSortString',
                    '#insertdatesort': 'insertDateSortString'
                },
                ExpressionAttributeValues: {
                    ':isremoved': true
                }
            };

            utils.performScan(dynamoDb, params).then((cases) => {
                if (!cases || !cases.length) {
                    resolve([]);
                } else {
                    resolve(cases);
                }
            }).catch((e) => {
                console.error('error getting confirmed cases');
                console.log(e);
                reject(e);
            });
        });
    },
    getVaccinationData(dynamoDb, area, dateTreshold = 0) {
        return new Promise((resolve, reject) => {
            var params = {
                TableName: VACCINATIONS_TABLE,
                ProjectionExpression: '#area, #date, #shots, #datesort',
                FilterExpression: '#isremoved <> :isremoved AND #datesort >= :datetreshold AND #area = :area',
                ExpressionAttributeNames: {
                    '#area': 'area',
                    '#date': 'date',
                    '#shots': 'shots',
                    '#datesort': 'dateSortString',
                    '#isremoved': 'isremoved'
                },
                ExpressionAttributeValues: {
                    ':isremoved': true,
                    ':datetreshold': moment().subtract(dateTreshold, 'days').format(utils.getSortDateFormat()),
                    ':area': area
                }
            };

            utils.performScan(dynamoDb, params).then((vaccinations) => {
                if (!vaccinations || !vaccinations.length) {
                    resolve([]);
                } else {
                    resolve(vaccinations);
                }
            }).catch((e) => {
                console.error('error getting vaccinations');
                console.log(e);
                reject(e);
            });
        });
    }
};