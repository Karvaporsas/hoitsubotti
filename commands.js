/*jslint node: true */
/*jshint esversion: 6 */
'use strict';

const helper = require('./helper');
const utils = require('./utils');
const statsHandler = require('./handlers/statsHandler');
const pushHandler = require('./handlers/pushHanlder');
const chartsHandler = require('./handlers/chartsHandler');
const SECRET_CHALLENGE = process.env.SECRET_CHALLENGE;

function _getHelpMessage(resolve, reject) {
    var message = `Jos löydät botista virheen tai sinulla on parannusehdotuksia, voit kirjata ne minulle täällä:\n\nhttps://github.com/Karvaporsas/hoitsubotti/issues`;

    resolve({
        status: 1,
        type: 'text',
        message: message
    });
}

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

            if (helper.isCallback(event)) {
                var data = helper.parseCallbackData(helper.getCallbackData(event));
                const callbackId = helper.getCallbackId(event);
                const callbackUserId = helper.getCallbackUserId(event);
                const replyId = helper.getCallbackReplyId(event);
                const replyChatId = helper.getCallbackChatId(event);
                var first = data.shift();

                console.log("starting to handle callback");

                switch (first) {
                    case 'charttarget':
                        chartsHandler.getCharts(callbackId, callbackUserId, replyId, replyChatId, data, resolve, reject);
                        break;
                    default:
                        resolve({status: 0, message: 'No such handler'});
                        break;
                }

                return;
            } else if (!chatId) {
                if (event.challengeResponse !== SECRET_CHALLENGE || !event.challengeResponse) {
                    reject('Not authorized');
                    return;
                }
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
                switch (command.name) {
                    case 'stats':
                        statsHandler.getStatistics(resolve, reject);
                        break;
                    case 'doublingtime':
                        statsHandler.getDoublingTime(command.args, resolve, reject);
                        break;
                    case 'startupdates':
                        pushHandler.startPushNotifications(chatId, chatTitle, resolve, reject);
                        break;
                    case 'stopupdates':
                        pushHandler.stopPushNotifications(chatId, chatTitle, resolve, reject);
                        break;
                    case 'charts':
                        //chartsHandler.getCharts(command.args, resolve, reject);
                        var wholeCountry = ['Koko maa'];
                        var hcds = utils.getHCDNames();
                        var opts = helper.getButtonData(wholeCountry.concat(hcds.sort()), 'charttarget', [chatId]);

                        resolve({status: 1, message: `<strong>Valitse alue</strong>`, type: 'text', keyboard: opts, replyToMessageId: helper.getEventMessageId(event)});

                        break;
                    case 'hospitals':
                        chartsHandler.getHospitalCharts(resolve, reject);
                        break;
                    case 'vaccinations':
                        statsHandler.getVaccinations(command.args, resolve, reject);
                        break;
                    case 'help':
                        _getHelpMessage(resolve, reject);
                        break;
                    default:
                        resolve({status: 0, message: 'Not a command'});
                        break;
                }
            }
        });
    }
};
