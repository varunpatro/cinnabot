/* @flow */
var moment = require('moment');
var rest = require('restler');

var util = require('./util');
var config = require('./../private/config.json');

var neaAuthKey = config.NEA.key;
var nowcastURL = 'http://api.nea.gov.sg/api/WebAPI?dataset=2hr_nowcast&keyref=' + neaAuthKey;
var psiURL = 'http://api.nea.gov.sg/api/WebAPI/?dataset=psi_update&keyref=' + neaAuthKey;
var pm2_5URL = 'http://api.nea.gov.sg/api/WebAPI/?dataset=pm2.5_update&keyref=' + neaAuthKey;

function getWeather(callback) {
    function onFailureCB() {
        return callback('Something went wrong. Please try again later.');
    }

    function onErrorCB() {
        return callback('There was an error while retrieving the data. Please try again later.');
    }

    function onTimeoutCB() {
        return callback('NEA is taking too long to respond. Please try again later.');
    }

    rest.get(nowcastURL, {timeout: 10000})
        .on('fail', onFailureCB)
        .on('timeout', onTimeoutCB)
        .on('error', onErrorCB)
        .on('success', function(data) {
            var nowCastJSON = data.channel.item[0];
            var clementiNowcastCode = nowCastJSON.weatherForecast[0].area[9].$.forecast.trim(); // area[9] is Clementi
            rest.get(psiURL, {timeout: 10000})
                .on('fail', onFailureCB)
                .on('timeout', onTimeoutCB)
                .on('error', onErrorCB)
                .on('success', function(data) {
                    var time = moment(data.channel.item[0].region[4].record[0].$.timestamp, 'YYYYMMDDHHmmss').toDate();
                    var westPSI_24HR = data.channel.item[0].region[4].record[0].reading[0].$.value;
                    var westPSI_3HR = data.channel.item[0].region[4].record[0].reading[1].$.value;
                    rest.get(pm2_5URL, {timeout:10000})
                        .on('fail', onFailureCB)
                        .on('timeout', onTimeoutCB)
                        .on('error', onErrorCB)
                        .on('success', function(data) {
                            var westPM2_5_1HR = data.channel.item[0].region[3].record[0].reading[0].$.value;
                            var msg = '*Cinnabot Weather Service*\n';
                            msg += 'Good ' + util.currentTimeGreeting() + ', the weather in *Clementi* at ' +
                                util.formatTime(time) + ' is: _' + getWeatherDesc(clementiNowcastCode) + '_ ' +
                                getWeatherEmoji(clementiNowcastCode) + ' ' +
                                '\n\nHere are the PSI readings:\n*24 Hour PSI:* ' +
                                westPSI_24HR + '\n*3 Hour PSI*: ' + westPSI_3HR +
                                '\n*1 Hour PM 2.5*: ' + westPM2_5_1HR + '.';
                            callback(msg);
                        });
                });
        });
}

function getWeatherEmoji(weatherCode) {
    return weatherEmojiMap[weatherCode];
}

function getWeatherDesc(weatherCode) {
    return weatherDescMap[weatherCode];
}

var weatherEmojiMap = {
        'BR':'🌫',
        'CL':'☁️',
        'DR':'🌧',
        'FA':'☀️',
        'FG':'🌫',
        'FN':'🌙',
        'FW':'☀️',
        'HG':'⛈🍃',
        'HR':'🌧🌧',
        'HS':'🌧🌧',
        'HT':'⛈⛈',
        'HZ':'🌫',
        'LH':'😷',
        'LR':'🌧',
        'LS':'🌧',
        'OC':'☁️',
        'PC':'⛅',
        'PN':'☁️',
        'PS':'🍃🌧',
        'RA':'🌧',
        'SH':'🌧',
        'SK':'🍃🌧',
        'SN':'⛄',
        'SR':'🍃🌧',
        'SS':'🌨',
        'SU':'☀️',
        'SW':'🍃🍃',
        'TL':'⛈',
        'WC':'🍃☁️',
        'WD':'🍃',
        'WF':'🍃',
        'WR':'🍃🌧',
        'WS':'🍃🌧',
};

var weatherDescMap = {
    'BR':'Mist',
    'CL':'Cloudy',
    'DR':'Drizzle',
    'FA':'Fair (Day)',
    'FG':'Fog',
    'FN':'Fair (Night)',
    'FW':'Fair & Warm',
    'HG':'Heavy Thundery Showers with Gusty Winds',
    'HR':'Heavy Rain',
    'HS':'Heavy Showers',
    'HT':'Heavy Thundery Showers',
    'HZ':'Hazy',
    'LH':'Slightly Hazy',
    'LR':'Light Rain',
    'LS':'Light Showers',
    'OC':'Overcast',
    'PC':'Partly Cloudy (Day)',
    'PN':'Partly Cloudy (Night)',
    'PS':'Passing Showers',
    'RA':'Moderate Rain',
    'SH':'Showers',
    'SK':'Strong Winds, Showers',
    'SN':'Snow',
    'SR':'Strong Winds, Rain',
    'SS':'Snow Showers',
    'SU':'Sunny',
    'SW':'Strong Winds',
    'TL':'Thundery Showers',
    'WC':'Windy, Cloudy',
    'WD':'Windy',
    'WF':'Windy, Fair',
    'WR':'Windy, Rain',
    'WS':'Windy, Showers',
};


module.exports = {
    getWeather
};
