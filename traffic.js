var rest = require('restler');
var jf = require('jsonfile');

var ltaCredFile = './lta_credentials.json';
var ltaCredentials = jf.readFileSync(ltaCredFile);

var busStopUrl = 'http://datamall2.mytransport.sg/ltaodataservice/BusArrival?BusStopID=' ;

var busStopHeaders = {
    "AccountKey": ltaCredentials.AccountKey, 
    "UniqueUserID": ltaCredentials.UniqueUserID
};

function busStop(id) {
    var req_url = busStopUrl + id.toString();
    var req_options = {"headers": busStopHeaders};
    var response = send(req_url, req_options);
    return response;
}

function send(req_url, req_options) {
    return rest.get(req_url, req_options).on('complete', process_info);
}

function process_info(data) {
    console.log (data);
}

module.exports = {
    'busStopQuery': busStop
}

