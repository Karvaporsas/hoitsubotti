/*jslint node: true */
/*jshint esversion: 6 */
'use strict';

const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const _ = require('underscore');
const moment = require('moment');
const fs = require('fs');
const database = require('./../database');
const DEBUG_MODE = process.env.DEBUG_MODE === 'ON';
const CHART_LINK_DAILY_NEW = process.env.CHART_LINK_DAILY_NEW;
const CHART_BUCKET = process.env.CHART_BUCKET;

function _getChart(chartLink) {
    return new Promise((resolve, reject) => {
        const inputFilename = '/tmp/' + chartLink.url;

        const writeStream = fs.createWriteStream(inputFilename);
        s3.getObject({
            Bucket: CHART_BUCKET,
            Key: chartLink.url
        }).createReadStream().pipe(writeStream);
        writeStream.on('finish', function() {
            resolve(inputFilename);
        });
        writeStream.on('error', function (err) {
            console.log('Error getting image from S3');
            console.log(err);
            reject(err);
        });
    });
}

module.exports = {
    getCharts(resolve, reject) {
        if (DEBUG_MODE) {
            console.log('starting to get charts');
        }
        var linkItem;
        var imgToSend;

        database.getChartLink(CHART_LINK_DAILY_NEW).then((chartLink) => {
            linkItem = chartLink;
            return _getChart(chartLink);
        }).then((img) => {
            imgToSend = img;
            return database.updateChartLink(linkItem);
        }).then(() => {
            resolve({
                status: 1,
                type: 'image',
                image: imgToSend,
                caption: 'Uudet tartunnat Suomessa 30 päivän ajalta'
            });
        }).catch((e) => {
            reject(e);
        });
    }
};