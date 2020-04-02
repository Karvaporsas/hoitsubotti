/*jslint node: true */
/*jshint esversion: 6 */
'use strict';

/**
 * Builds a constant length string with white space at the end
 *
 * @param {string|number|boolean} message to send
 * @param {number} maxLength into what length message is trimmed to
 *
 * @returns trimmed string
 */
function getIndentedColMessage(message, maxLength) {
    const countValue = maxLength + 1 - message.toString().length;
    return '' + message + (' ').repeat(countValue);
}

/**
 * Helper
 */
module.exports = {
    /**
     * Parses command and attributes out of input
     * @param {string} message to parse
     *
     * @returns object containing command name and args
     */
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

    /**
     * @param {object} event as input
     *
     * @returns userid of event sender
     */
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
    /**
     * Creates table from input with custom rows
     * @param {Array} rows to put into table
     * @param {Array} cols of table
     *
     * @returns string constisting ASCII-kind of table
     */
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
    /**
     * @param {object} event as input
     *
     * @returns chat id of event
     */
    getEventChatId(event) {
        var chatId = 0;
        if (event.body.message && event.body.message.chat && event.body.message.chat.id) {
            chatId = event.body.message.chat.id;
        } else if (event.body.channel_post && event.body.channel_post.chat && event.body.channel_post.chat.id) {
            chatId = event.body.channel_post.chat.id;
        }

        return chatId;
    },
    /**
     * @param {object} event as input
     *
     * @returns chat title of event
     */
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
    /**
     * @param {Object} event as input
     *
     * @returns message text of event
     */
    getEventMessageText(event) {
        var message = '';
        if (event.body.channel_post && event.body.channel_post.text) {
            message = event.body.channel_post.text;
        } else if (event.body.message && event.body.message.text) {
            message = event.body.message.text;
        }

        return message;
    },
    getSourceString(dataSource) {
        switch (dataSource) {
            case 'S3':
                return '<strong>THL avoin data</strong>';
            case 'DB':
            default:
                return '<strong>HS avoin data</strong>';
        }
    }
};
