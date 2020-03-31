/*jslint node: true */
/*jshint esversion: 6 */
'use strict';

const OPERATIONS_TABLE = process.env.OPERATIONS_TABLE;
const CHARTS_TABLE = process.env.CHARTS_TABLE;

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
    },
    getChartLink(dynamoDb, chartName){
        return new Promise((resolve, reject) => {
            var params = {
                TableName: CHARTS_TABLE,
                Key: {
                    chartName: chartName
                },
                ProjectionExpression: '#chartName, #updated, #url, #used',
                ExpressionAttributeNames: {
                    '#chartName': 'chartName',
                    '#updated': 'updated',
                    '#url': 'url',
                    '#used': 'used'
                }
            };
            dynamoDb.get(params, function (err, data) {
                if (err || !data) {
                    console.log('Error getting link');
                    console.log(err);
                    reject(err);
                } else {
                    resolve(data.Item);
                }
            });
        });
    },
    updateChartLink(dynamoDb, link) {
        return new Promise((resolve, reject) => {
            var params = {
                TableName: CHARTS_TABLE,
                Key: {
                    chartName: link.chartName
                },
                UpdateExpression: 'set #used = #used + :val',
                ExpressionAttributeNames: {
                    '#used': 'used'
                },
                ExpressionAttributeValues:{
                    ":val": 1
                }
            };

            dynamoDb.update(params, function(err, data) {
                if (err) {
                    console.log('Error updating chartlink');
                    console.log(err);
                    reject(err);
                } else {
                    resolve({status: 1, message: 'success', link: link});
                }
            });
        });
    }
};
