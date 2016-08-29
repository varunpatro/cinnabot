var moment = require('moment');
var rest = require('restler');

var util = require('./util');
var config = require('./../private/config.json');

var neaAuthKey = config.NEA.key;
var nowcastURL = 'http://www.nea.gov.sg/api/WebAPI?dataset=nowcast&keyref=' + neaAuthKey;
var psiURL = 'http://www.nea.gov.sg/api/WebAPI/?dataset=psi_update&keyref=' + neaAuthKey;
var pm2_5URL = 'http://www.nea.gov.sg/api/WebAPI/?dataset=pm2.5_update&keyref=' + neaAuthKey;

function getWeather(callback) {
    rest.get(nowcastURL).on('complete', function(data) {
        var nowCastJSON = data.channel.item[0];
        var clementiNowcast = nowCastJSON.weatherForecast[0].area[9].$.forecast.trim(); // area[9] is Clementi
        var clementiNowcastCode = nowCastJSON.weatherForecast[0].area[9].$.icon; // area[9] is Clementi
        rest.get(psiURL).on('complete', function(data) {
            var time = moment(data.channel.item[0].region[4].record[0].$.timestamp, 'YYYYMMDDHHmmss').toDate();
            var westPSI_24HR = data.channel.item[0].region[4].record[0].reading[0].$.value;
            var westPSI_3HR = data.channel.item[0].region[4].record[0].reading[1].$.value;
            rest.get(pm2_5URL).on('complete', function(data) {
                westPM2_5_1HR = data.channel.item[0].region[3].record[0].reading[0].$.value;
                var msg = '*Cinnabot Weather Service*\n';
                msg += 'Good ' + util.currentTimeGreeting() + ', the weather in *Clementi* at ' +
                    util.formatTime(time) + ' is: _' + clementiNowcast + '_ ' +
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
    var weatherEmojiMap = {
        'FD': '☀️',
        'FN': '🌙',
        'PC': '⛅️',
        'CD': '☁️',
        'HZ': '😷',
        'HA': '😷',
        'WD': '🍃',
        'RA': '☔',
        'PS': '☔',
        'SH': '☔',
        'TS': '☔⚡️️',
    };
    return weatherEmojiMap[weatherCode];
}

module.exports = {
    getWeather
};
