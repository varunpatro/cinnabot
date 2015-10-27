var rest = require('restler');
var jf = require('jsonfile');
var util = require('./util');

var neaCredentialsPath = './private/nea_credentials.json';
var neaAuthKey = jf.readFileSync(neaCredentialsPath).key;

var nowcastURL = 'http://www.nea.gov.sg/api/WebAPI?dataset=nowcast&keyref=' + neaAuthKey;
var nowcastJSON;
var clementiNowcast;

var psiURL = 'http://sgp.si/now.json';
var westPSI_3HR;
var westPSI_24HR;
var westPM2_5_1HR;
var time;

rest.get(nowcastURL).on('complete', function(data) {
    nowCastJSON = data.channel.item[0];
    clementiNowcast = nowCastJSON.weatherForecast[0].area[9].$.forecast; // area[9] is Clementi
});

rest.get(psiURL).on('complete', function(data) {
    time = new Date(data.time);
    westPSI_24HR = data.west.psi_24h;
    westPSI_3HR = data.overall.psi_3h;
    westPM2_5_1HR = data.west.pm2_5_1h;
});

function getWeather() {
    var msg = 'Time: ' + util.formatTime(time) + '\n\nClementi weather: ' + clementiNowcast + '\n24 Hour PSI: ' +
        westPSI_24HR + '\n3 Hour PSI: ' + westPSI_3HR + '\n1 Hour PM 2.5: ' + westPM2_5_1HR + '.';
    return msg;
}

module.exports = {
    getWeather: getWeather
};