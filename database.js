/*jslint node: true */
/*jshint esversion: 6 */
'use strict';

const AWS = require('aws-sdk');
const caseFunctions = require('./databaseFunctions/caseFunctions');
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
    }
};
