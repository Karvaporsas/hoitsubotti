/*jslint node: true */
/*jshint esversion: 6 */
'use strict';

const helper = require('./helper');
const statsHandler = require('./handlers/statsHandler');
const pushHandler = require('./handlers/pushHanlder');

/**
 * Commands
 */
module.exports = {
    /**
     * Creates error message
     * @param {Object} error To send
     * @returns Promise
     */
    error(error) {
        return new Promise((resolve, reject) => {
            if (error) {
                reject(error);
            }
            else {
                resolve({status: 1, message: "Mitä täällä tapahtuu?", type: "text"});
            }
        });
    },
    /**
     * Handles processing any command
     *
     * @param {Object} event Message from Telegram
     * @param {int} chatId Id of chat where it came from
     *
     * @returns Promise
     */
    processCommand(event, chatId) {
        return new Promise((resolve, reject) => {
            const messageText = helper.getEventMessageText(event);
            const command = helper.parseCommand(messageText);

            if (!chatId) {
                switch (command.name) {
                    case 'notifynewcases':
                        statsHandler.checkNewCases(resolve, reject);
                        break;
                    default:
                        console.error("No chat id!");
                        reject();
                        break;
                }
            } else {
                var chatTitle = helper.getEventChatTitle(event);
                console.log(event.body.message);
                console.log(chatTitle);
                switch (command.name) {
                    case 'stats':
                        statsHandler.getStatistics(resolve, reject);
                        break;
                    case 'startupdates':
                        pushHandler.startPushNotifications(chatId, chatTitle, resolve, reject);
                        break;
                    case 'stopupdates':
                        pushHandler.stopPushNotifications(chatId, chatTitle, resolve, reject);
                        break;
                    default:
                        resolve({status: 0, message: 'Not a command'});
                        break;
                }
            }
        });
    }
};
