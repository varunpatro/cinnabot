var rest = require('restler');
var jf = require('jsonfile');

var nea_credentials_path = './nea_credentials.json';
var neaAuthKey = jf.readFileSync(nea_credentials_path).key;

var nowcastURL = 'http://www.nea.gov.sg/api/WebAPI?dataset=nowcast&keyref=' + neaAuthKey;
var nowcastJSON;
var CLEMENTI_nowcast = undefined;

var psiURL = 'http://www.nea.gov.sg/api/WebAPI/?dataset=psi_update&keyref=' + neaAuthKey;
var psiJSON;
var westPSI_3HR = undefined;
var westPSI_24HR = undefined;

rest.get(nowcastURL).on('complete', function (data) {
    nowCastJSON = data;
    CLEMENTI_nowcast = data.channel.item[0].weatherForecast[0].area[9].$.forecast; // area[9] is Clementi
});

rest.get(psiURL).on('complete', function (data) {
    psiJSON = data;
    
    // region[4] is for West Singapore
    westPSI_24HR = psiJSON.channel.item[0].region[4].record[0].reading[0].$.value;
    westPSI_3HR = psiJSON.channel.item[0].region[4].record[0].reading[1].$.value;
});

function getWeather() {
    return "Clementi weather: " + CLEMENTI_nowcast + '\n 24 Hour PSI: ' + westPSI_24HR + ', 3 Hour PSI: ' + westPSI_3HR + '.';
}

module.exports = {
    getWeather: getWeather
}
