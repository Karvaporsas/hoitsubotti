/*jslint node: true */
/*jshint esversion: 6 */
'use strict';

const database = require('./../database');
const _ = require('underscore');
const _botNotificationName = 'hoitsubotti';
const _activationMessage = 'Tapausten seuranta on aloitettu. Saat ilmoituksia uusista tapauksista kunnes perut ilmoitukset /stopupdates komennolla';
const _disabledMessage = 'Tapausten seuranta on lopetettu. Saat ilmoitukset uusista tapauksista /startupdates komennolla';

function _setPushNotifications(notificationState, chatId, title, resolve, reject) {
    if (!chatId) {
        reject('No chat id given');
    }

    var messageToSend = notificationState ? _activationMessage : _disabledMessage;

    var initialPromises = [];
    initialPromises.push(database.getPushNotificator(chatId, _botNotificationName));

    Promise.all(initialPromises).then((initialResults) => {
        var secondaryPromises = [];
        var notificator = initialResults[0];

        if (notificator) {
            notificator.isActive = notificationState;
            notificator.chatTitle = title;
            secondaryPromises.push(database.updatePushNotificator(notificator));
        } else {
            notificator = {
                chatId: chatId,
                origin: _botNotificationName,
                isActive: notificationState,
                chatTitle: title
            };
            secondaryPromises.push(database.insertPushNotificator(notificator));
        }

        return Promise.all(secondaryPromises);
    }).then((notifierResult) => {
        resolve({
            status: 1,
            type: 'text',
            message: messageToSend
        });
    }).catch((e) => {
        reject(e);
    });
}

module.exports = {
    startPushNotifications(chatId, title, resolve, reject) {
        _setPushNotifications(true, chatId, title, resolve, reject);
    },
    stopPushNotifications(chatId, title, resolve, reject) {
        _setPushNotifications(false, chatId, title, resolve, reject);
    }
};