/*jslint node: true */
/*jshint esversion: 6 */
'use strict';

const NOTIFICATIONS_TABLE = process.env.NOTIFICATIONS_TABLE;

function _convertNotificator(dbNotificator) {
    return {
        'chatId': dbNotificator.chatid,
        'origin': dbNotificator.origin,
        'chatTitle': dbNotificator.chattitle,
        'isActive': dbNotificator.isactive
    };
}

module.exports = {
    insertPushNotificator(dynamoDb, notificator) {
        return new Promise((resolve, reject) => {
            var params = {
                TableName: NOTIFICATIONS_TABLE,
                Item: {
                    'chatid': notificator.chatId,
                    'origin': notificator.origin,
                    'isactive': notificator.isActive,
                    'chattitle': notificator.chatTitle
                }
            };

            dynamoDb.put(params, function (err, data) {
                if (err) {
                    console.log('Error in inserting notificator');
                    console.log(err);
                    reject(err);
                } else {
                    resolve(data.Item);
                }
            });
        });
    },
    updatePushNotificator(dynamoDb, notificator) {
        return new Promise((resolve, reject) => {
            console.log('updating');
            console.log(notificator);

            var params = {
                TableName: NOTIFICATIONS_TABLE,
                Key: {
                    'chatid': notificator.chatId,
                    'origin': notificator.origin
                },
                UpdateExpression: 'set #ia = :ia, #ct = :ct',
                ExpressionAttributeNames: {
                    '#ia': 'isactive',
                    '#ct': 'chattitle',
                },
                ExpressionAttributeValues: {
                    ':ia': notificator.isActive,
                    ':ct': notificator.chatTitle
                }
            };

            dynamoDb.update(params, function (err, data) {
                if (err) {
                    console.error(`Error updating notificator for chat ${notificator.chatId} by ${notificator.origin}`);
                    console.log(err);
                    reject(err);
                } else {
                    resolve('Success');
                }
            });
        });
    },
    getPushNotificator(dynamoDb, chatId, origin) {
        return new Promise((resolve, reject) => {
            var params = {
                TableName: NOTIFICATIONS_TABLE,
                Key: {
                    'chatid': chatId,
                    'origin': origin
                }
            };

            dynamoDb.get(params, function (err, data) {
                if (err) {
                    console.error(`Error getting notificator from ${chatId} by ${origin}`);
                    console.log(err);
                    reject(err);
                } else {
                    if (data.Item) {
                        resolve(_convertNotificator(data.Item));
                    } else {
                        resolve();
                    }

                }
            });
        });
    },
    getNotificators(dynamoDb, origin) {
        return new Promise((resolve, reject) => {
            var params = {
                TableName: NOTIFICATIONS_TABLE,
                KeyConditionExpression: '#origin = :o',
                FilterExpression: '#ia = :ia',
                ExpressionAttributeNames:{
                    '#origin': 'origin',
                    '#ia': 'isactive'
                },
                ExpressionAttributeValues: {
                    ':o': origin,
                    ':ia': true
                }
            };

            dynamoDb.query(params, function (err, data) {
                if (err) {
                    console.error(`Failed to get notificators by ${origin}`);
                    console.log(err);
                    reject(err);
                } else {
                    var notificators = [];
                    for (const n of data.Items) {
                        notificators.push(_convertNotificator(n));
                    }
                    resolve(notificators);
                }
            });
        });
    }
};