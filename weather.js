var rest = require('restler');
var jf = require('jsonfile');

var neaCredentialsPath = './private/nea_credentials.json';
var neaAuthKey = jf.readFileSync(neaCredentialsPath).key;

var nowcastURL = 'http://www.nea.gov.sg/api/WebAPI?dataset=nowcast&keyref=' +
    neaAuthKey;
var nowcastJSON;
var clementiNowcast;

var psiURL = 'http://www.nea.gov.sg/api/WebAPI/?dataset=psi_update&keyref=' +
    neaAuthKey;
var psiJSON;
var westPSI3;
var westPSI24;

rest.get(nowcastURL).on('complete', function(data) {
    nowCastJSON = data.channel.item[0];
    clementiNowcast = nowCastJSON.weatherForecast[0].area[9].$.forecast; // area[9] is Clementi
});

rest.get(psiURL).on('complete', function(data) {
    psiJSON = data;

    // region[4] is for West Singapore
    westPSI24 = psiJSON.channel.item[0].region[4].record[0].reading[0].$.value;
    westPSI3 = psiJSON.channel.item[0].region[4].record[0].reading[1].$.value;
});

function getWeather() {
    return 'Clementi weather: ' + clementiNowcast + '\n24 Hour PSI: ' +
        westPSI24 + '\n3 Hour PSI: ' + westPSI3 + '.';
}

module.exports = {
    getWeather: getWeather
};
