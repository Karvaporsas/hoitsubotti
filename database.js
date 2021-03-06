/*jslint node: true */
/*jshint esversion: 6 */
'use strict';

const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const caseFunctions = require('./databaseFunctions/caseFunctions');
const operationFunctions = require('./databaseFunctions/operationFunctions');
const notificationFunctions = require('./databaseFunctions/notificationFunctions');
const dynamoDb = new AWS.DynamoDB.DocumentClient();

function _getCurrentVaccinationData(data) {
    if (!data) return null;

    var newest = '';
    var vaccination = null;

    for (const v of data) {
        if (newest < v.dateSortString || !newest) {
            newest = v.dateSortString;
            vaccination = v;
        }
    }

    return vaccination;
}

function _getOldestVaccinationData(data) {
    if (!data) return null;

    var oldest = '';

    var vaccination = null;

    for (const v of data) {
        if (oldest > v.dateSortString || !oldest) {
            oldest = v.dateSortString;
            vaccination = v;
        }
    }

    return vaccination;
}

/**
 * Routes database calls to proper handlers and initializes db.
 */
module.exports = {
    /**
     * Gets latest-run operation from database
     * @param {string} operationMainType to search
     */
    getLatestOperation(operationMainType) {
        return caseFunctions.getLatestOperation(dynamoDb, operationMainType);
    },
    getConfirmedCases(dataSource) {
        switch (dataSource) {
            case 'S3':
                return caseFunctions.getConfirmedCasesFromS3(s3, dynamoDb);
            case 'DB':
            default:
                return caseFunctions.getConfirmedCases(dynamoDb);
        }

    },
    getCurrentVaccinationData(area) {
        return caseFunctions.getVaccinationData(dynamoDb, area, 7).then(data => {
            if (data.length) {
                var vaccination = _getCurrentVaccinationData(data);

                return new Promise((resolve, reject) => {
                    if (vaccination) {
                        resolve(vaccination);
                    } else {
                        reject();
                    }
                });
            } else {
                return caseFunctions.getVaccinationData(dynamoDb, area, 180).then(bigData => {
                    var vaccination = _getCurrentVaccinationData(bigData);

                    return new Promise((resolve, reject) => {
                        if (vaccination) {
                            resolve(vaccination);
                        } else {
                            reject();
                        }
                    });
                });
            }
        });
    },
    getVaccinationDataDaysAgo(area, daysAgo) {
        return caseFunctions.getVaccinationData(dynamoDb, area, daysAgo).then(data => {
            var vaccination = _getOldestVaccinationData(data);

            return new Promise((resolve, reject) => {
                if (vaccination) {
                    resolve(vaccination);
                } else {
                    reject();
                }
            });
        });
    },
    getDeadCases() {
        return caseFunctions.getDeadCases(dynamoDb);
    },
    getRecoveredCases() {
        return caseFunctions.getRecoveredCases(dynamoDb);
    },
    updateOperation(operation) {
        return operationFunctions.updateOperation(dynamoDb, operation);
    },
    getChartLink(chartName) {
        return operationFunctions.getChartLink(dynamoDb, chartName);
    },
    updateChartLink(chartLink) {
        return operationFunctions.updateChartLink(dynamoDb, chartLink);
    },
    insertPushNotificator(notificator) {
        return notificationFunctions.insertPushNotificator(dynamoDb, notificator);
    },
    updatePushNotificator(notificator) {
        return notificationFunctions.updatePushNotificator(dynamoDb, notificator);
    },
    getPushNotificator(chatId, origin) {
        return notificationFunctions.getPushNotificator(dynamoDb, chatId, origin);
    },
    getNotificators(origin) {
        return notificationFunctions.getNotificators(dynamoDb, origin);
    }
};
