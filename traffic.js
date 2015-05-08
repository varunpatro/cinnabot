var rest = require('restler');
var jf = require('jsonfile');
var util = require('./util');

var ltaCredFile = './private/lta_credentials.json';
var ltaCredentials = jf.readFileSync(ltaCredFile);

var busStops = [19059, 19051, 17099, 17091];

var busStopUrl = 'http://datamall2.mytransport.sg/ltaodataservice/BusArrival?BusStopID=' ;

var busStopHeaders = {
    "AccountKey": ltaCredentials.AccountKey, 
    "UniqueUserID": ltaCredentials.UniqueUserID
};

function busStop(id, callback) {
    var req_url = busStopUrl + id.toString();
    var req_options = {"headers": busStopHeaders};
    var response = send(req_url, req_options, callback);
    return response;
}

function process_info(data, callback) {
    var processed_data = "Buses in operations:";
    data.Services.forEach(function(bus) {
    if (bus.Status === 'In Operation') {
        processed_data += '\n' + bus.ServiceNo + " \t- " + util.timeLeftMin(new Date(bus.NextBus.EstimatedArrival)) + ", " + util.timeLeftMin(new Date(bus.SubsequentBus.EstimatedArrival));
            }
    });
    callback(processed_data);
}

function send(req_url, req_options, callback) {
    return rest.get(req_url, req_options).on('complete', function(data) {
        process_info(data, callback);
    });
}

module.exports = {
    'busStopQuery': busStop
}

