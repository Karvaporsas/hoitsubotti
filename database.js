/*jslint node: true */
/*jshint esversion: 6 */
'use strict';

const AWS = require('aws-sdk');
const caseFunctions = require('./databaseFunctions/caseFunctions');
const operationFunctions = require('./databaseFunctions/operationFunctions');
const notificationFunctions = require('./databaseFunctions/notificationFunctions');
const dynamoDb = new AWS.DynamoDB.DocumentClient();

module.exports = {
    getLatestOperation(operationMainType) {
        return caseFunctions.getLatestOperation(dynamoDb, operationMainType);
    },
    getConfirmedCases() {
        return caseFunctions.getConfirmedCases(dynamoDb);
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
