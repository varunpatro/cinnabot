var rest = require('restler');
var jf = require('jsonfile');
var util = require('./util');

var neaCredentialsPath = './private/nea_credentials.json';
var neaAuthKey = jf.readFileSync(neaCredentialsPath).key;

var nowcastURL = 'http://www.nea.gov.sg/api/WebAPI?dataset=nowcast&keyref=' + neaAuthKey;
var psiURL = 'http://sgp.si/now.json';

function getWeather(callback) {
    rest.get(nowcastURL).on('complete', function(data) {
        var nowCastJSON = data.channel.item[0];
        var clementiNowcast = nowCastJSON.weatherForecast[0].area[9].$.forecast; // area[9] is Clementi
        var clementiNowcastCode = nowCastJSON.weatherForecast[0].area[9].$.icon; // area[9] is Clementi
        rest.get(psiURL).on('complete', function(data) {
            var time = new Date();
            var westPSI_24HR = data.west.psi_24h;
            var westPSI_3HR = data.overall.psi_3h;
            var westPM2_5_1HR = data.west.pm2_5_1h;
            var msg = "Good " + util.currentTimeGreeting() + ", the weather in Clementi at " + util.formatTime(time) + ' is: ' + clementiNowcast + " " + getWeatherEmoji(clementiNowcastCode) + " " + '\n\nHere are the PSI readings:\n24 Hour PSI: ' +
                westPSI_24HR + '\n3 Hour PSI: ' + westPSI_3HR + '\n1 Hour PM 2.5: ' + westPM2_5_1HR + '.';
            callback(msg);
        });
    });
}

function getWeatherEmoji(weatherCode) {
    weatherEmojiMap = {
        "FD": "☀️",
        "FN": "🌙",
        "PC": "⛅️",
        "CD": "☁️",
        "HZ": "😷",
        "WD": "🍃",
        "RA": "☔",
        "PS": "☔",
        "SH": "☔",
        "TS": "☔⚡️️",
    };
    return weatherEmojiMap[weatherCode];
}

module.exports = {
    getWeather: getWeather
};
