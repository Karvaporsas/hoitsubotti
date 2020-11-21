/*jslint node: true */
/*jshint esversion: 6 */
'use strict';

const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const fs = require('fs');
const database = require('./../database');
const helper = require('./../helper');
const utils = require('./../utils');
const DEBUG_MODE = process.env.DEBUG_MODE === 'ON';
const CHART_LINK_DAILY_NEW = process.env.CHART_LINK_DAILY_NEW;
const CHART_LINK_HOSPITALIZATIONS = process.env.CHART_LINK_HOSPITALIZATIONS;
const CHART_BUCKET = process.env.CHART_BUCKET;
const DATASOURCE = process.env.DATASOURCE || 'DB';

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
    getCharts(callbackId, userId, replyId, chatId, convertedData, resolve, reject) {
        if (DEBUG_MODE) {
            console.log('starting to get charts');
            console.log(convertedData);
        }
        var linkItem;
        var imgToSend;
        var specificChartLink = CHART_LINK_DAILY_NEW;

        if (convertedData && convertedData[0] && convertedData[0] != 'Koko maa') {
            var healthCareDistricts = utils.getHCDNames();

            if (healthCareDistricts.indexOf(convertedData[0]) > -1) specificChartLink += `_${convertedData[0]}`; // injection secure.
        }

        database.getChartLink(specificChartLink).then((chartLink) => {
            linkItem = chartLink;
            return _getChart(chartLink);
        }).then((img) => {
            imgToSend = img;
            return database.updateChartLink(linkItem);
        }).then(() => {
            var caption = 'Uudet tartunnat 30 päivän ajalta. Lähde: ' + helper.getSourceString(DATASOURCE);
            resolve({
                status: 1,
                type: 'image',
                image: imgToSend,
                caption: caption,
                chatId: chatId,
                handleCallBack: {
                    callbackId: callbackId
                },
                updateMessage: {
                    message: `Uudet tartunnat ${convertedData[0]}`,
                    replyId: replyId,
                    chatId: chatId
                }
            });
        }).catch((e) => {
            reject(e);
        });
    },
    getHospitalCharts(resolve, reject) {
        if (DEBUG_MODE) {
            console.log('starting to get charts');
        }
        var linkItem;
        var imgToSend;

        database.getChartLink(CHART_LINK_HOSPITALIZATIONS).then((chartLink) => {
            linkItem = chartLink;
            return _getChart(chartLink);
        }).then((img) => {
            imgToSend = img;
            return database.updateChartLink(linkItem);
        }).then(() => {
            var caption = 'Potilaat sairaalahoidossa. Lähde: ' + helper.getSourceString(DATASOURCE);
            resolve({
                status: 1,
                type: 'image',
                image: imgToSend,
                caption: caption
            });
        }).catch((e) => {
            reject(e);
        });
    }
};