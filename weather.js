var rest = require('restler');
var jf = require('jsonfile');
var util = require('./util');

var neaCredentialsPath = './private/nea_credentials.json';
var neaAuthKey = jf.readFileSync(neaCredentialsPath).key;

var nowcastURL = 'http://www.nea.gov.sg/api/WebAPI?dataset=nowcast&keyref=' +
    neaAuthKey;
var nowcastJSON;
var clementiNowcast;

var psiURL = 'http://www.nea.gov.sg/api/WebAPI/?dataset=psi_update&keyref=' +
    neaAuthKey;
var pm25URL = 'http://www.nea.gov.sg/api/WebAPI/?dataset=pm2.5_update&keyref=' +
    neaAuthKey;
var psiJSON;
var pmJSON;
var westPSI3;
var westPSI24;
var westPM25;
var timeStamp;

function getTime(timeStr) {
    var yy = timeStr.substr(0, 4);
    var MM = timeStr.substr(4, 2);
    var dd = timeStr.substr(6, 2);
    var HH = timeStr.substr(8, 2);
    var mm = timeStr.substr(10, 2);
    var ss = timeStr.substr(12, 2);
    var str = MM + ' ' + dd + ' ' + yy + ' ' + HH + ':' + mm + ':' + ss;
    return new Date(str);
}

rest.get(nowcastURL).on('complete', function(data) {
    nowCastJSON = data.channel.item[0];
    clementiNowcast = nowCastJSON.weatherForecast[0].area[9].$.forecast; // area[9] is Clementi
});

rest.get(psiURL).on('complete', function(data) {
    psiJSON = data.channel.item[0];

    // region[4] is for West Singapore
    westPSI24 = psiJSON.region[4].record[0].reading[0].$.value;
    westPSI3 = psiJSON.region[4].record[0].reading[1].$.value;
});

rest.get(pm25URL).on('complete', function(data) {
    pmJSON = data.channel.item[0];

    // region[4] is for West Singapore
    westPM25 = pmJSON.region[3].record[0].reading[0].$.value;
    timeStamp = pmJSON.region[3].record[0].$.timestamp;
});

function getWeather() {
    return 'Time: ' + util.formatTime(getTime(timeStamp)) + '\n\nClementi weather: ' + clementiNowcast + '\n24 Hour PSI: ' +
        westPSI24 + '\n3 Hour PSI: ' + westPSI3 + '\n1 Hour PM 2.5: ' + westPM25 + '.';
}

module.exports = {
    getWeather: getWeather
};
