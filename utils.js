/*jslint node: true */
/*jshint esversion: 6 */
'use strict';

module.exports = {
    /**
     * Performs scan for database. Results are sent to resolve function
     *
     * @param {Object} dynamoDb db object
     * @param {Object} params of
     * @param {Promise.resolve} resolve called on success
     * @param {Promise.reject} reject called on failure
     */
    performScan(dynamoDb, params) {
        return new Promise((resolve, reject) => {
            function chatScan(err, data) {
                if (err) {
                    console.log("error while scanning");
                    console.log(err);
                    reject(err);
                } else if (!data) {
                    console.log("no data, no error");
                    resolve(allResults);
                }
                allResults = allResults.concat(data.Items);

                // continue scanning if we have more, because
                // scan can retrieve a maximum of 1MB of data
                if (typeof data.LastEvaluatedKey != "undefined") {
                    console.log("Scanning for more...");
                    params.ExclusiveStartKey = data.LastEvaluatedKey;
                    dynamoDb.scan(params, chatScan);
                } else {
                    resolve(allResults);
                }
            }

            var allResults = [];

            dynamoDb.scan(params, chatScan);
        });
    },
    getTimeFormat() {
        return 'YYYY-MM-DD HH:mm:ss';
    },
    getHCDNames() {
        return [
            'Ahvenanmaa',
            'Varsinais-Suomi',
            'Satakunta',
            'Kanta-Häme',
            'Pirkanmaa',
            'Päijät-Häme',
            'Kymenlaakso',
            'Etelä-Karjala',
            'Etelä-Savo',
            'Itä-Savo',
            'Pohjois-Karjala',
            'Pohjois-Savo',
            'Keski-Suomi',
            'Etelä-Pohjanmaa',
            'Vaasa',
            'Keski-Pohjanmaa',
            'Pohjois-Pohjanmaa',
            'Kainuu',
            'Länsi-Pohja',
            'Lappi',
            'HUS'
        ];
    },
};