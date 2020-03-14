/*jslint node: true */
/*jshint esversion: 6 */
'use strict';

function getIndentedColMessage(message, maxLength) {
    const countValue = maxLength + 1 - message.toString().length;
    return '' + message + (' ').repeat(countValue);
}

/**
 * Helper
 */
module.exports = {
    parseCommand(message) {
        const tokens = message.split(' ');
        if (!tokens[0].match(/^\//)) {
            return {name: ''};
        }
        var c = {};
        const cmd = tokens.shift();
        const match = cmd.match(/\/(\w*)/);
        if (match.length > 0) {
            c.args = tokens;
            c.name = match[1];
        }

        return c;
    },

    getEventUserId(event) {
        var userId = 0;

        if (event.body.message && event.body.message.from) userId = event.body.message.from.id;

        return userId;
    },
    /**
     * Creates list type message to show to user
     * @param {string} title of message
     * @param {string} description of message
     * @param {Array} rows to show as list
     * @param {Array} cols to show from rows
     *
     * @returns Listing kind message as string
     */
    formatListMessage(title, description, rows, cols) {
        let message = '';

        if (title.length > 0) {
            message = `<strong>${title}</strong>`;
        }

        if (description && description.length > 0) {
            message += `\n\n${description}\n`;
        }

        message += this.formatTableDataString(rows, cols);

        return message;
    },
    formatTableDataString(rows, cols) {
        var message = '';

        if(rows && rows.length > 0) {
            var colLenghts = {};
            var header = '';

            for (const col of cols) {
                var maxLength = col.headerName.length;
                for (const row of rows) {
                    var rowLenght = row[col.colProperty].toString().length;
                    if (rowLenght > maxLength) maxLength = rowLenght;
                }
                colLenghts[col.colProperty] = maxLength;
            }

            message += '\n<pre>';

            for (const col of cols) {
                header += getIndentedColMessage(col.headerName, colLenghts[col.colProperty]);
            }

            message += header + '\n';

            for (const row of rows) {
                var rowString = '';
                for (const col of cols) {
                    rowString += getIndentedColMessage(row[col.colProperty], colLenghts[col.colProperty]);
                }
                message += rowString + '\n';
            }
            message += '</pre>';
        }

        return message;
    },
    getEventChatId(event) {
        var chatId = 0;
        if (event.body.message && event.body.message.chat && event.body.message.chat.id) {
            chatId = event.body.message.chat.id;
        } else if (event.body.channel_post && event.body.channel_post.chat && event.body.channel_post.chat.id) {
            chatId = event.body.channel_post.chat.id;
        }

        return chatId;
    },
    getEventChatTitle(event) {
        var title = '';

        if (event.body.message && event.body.message.chat && event.body.message.chat.title) {
            title = event.body.message.chat.title;
        } else if (event.body.message && event.body.message.chat && event.body.message.chat.username) {
            title = event.body.message.chat.username;
        } else if (event.body.channel_post && event.body.channel_post.chat && event.body.channel_post.chat.title) {
            title = event.body.channel_post.chat.title;
        }

        return title;
    },
    getEventMessageText(event) {
        var message = '';
        if (event.body.channel_post && event.body.channel_post.text) {
            message = event.body.channel_post.text;
        } else if (event.body.message && event.body.message.text) {
            message = event.body.message.text;
        }

        return message;
    }
};
