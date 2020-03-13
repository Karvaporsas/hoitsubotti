/*jslint node: true */
/*jshint esversion: 6 */
'use strict';

const OPERATIONS_TABLE = process.env.TABLE_OPERATIONS;

module.exports = {
    updateOperation(dynamoDb, operation) {
        return new Promise((resolve, reject) => {
            var d = new Date();
            var params = {
                TableName: OPERATIONS_TABLE,
                Key: {
                    name: operation.name
                },
                UpdateExpression: 'set #yr = :yr, #mon = :mon, #day = :day, #hour = :hour, #minute = :minute',
                ExpressionAttributeNames: {
                    '#yr': 'yr',
                    '#mon': 'mon',
                    '#day': 'day',
                    '#hour': 'hour',
                    '#minute': 'minute'
                },
                ExpressionAttributeValues: {
                    ':yr': d.getFullYear(),
                    ':mon': d.getMonth(),
                    ':day': d.getDate(),
                    ':hour': d.getHours(),
                    ':minute': d.getMinutes()
                }
            };

            dynamoDb.update(params, function (err, data) {
                if (err) {
                    console.log('Error while updating operation');
                    console.log(err);
                    reject(err);
                } else {
                    resolve({status: 1, message: 'success'});
                }
            });
        });
    }
};
