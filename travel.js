var rest = require('restler');
var jf = require('jsonfile');
var cheerio = require('cheerio');
var util = require('./util');

var ltaCredFile = './private/lta_credentials.json';
var ltaCredentials = jf.readFileSync(ltaCredFile);

var busStops = [19059, 19051, 17099, 17091];
var defaultBusStop = 19059;

var busStopUrl =
    'http://datamall2.mytransport.sg/ltaodataservice/BusArrival?BusStopID=';

var busStopHeaders = {
    'AccountKey': ltaCredentials.AccountKey,
    'UniqueUserID': ltaCredentials.UniqueUserID
};

function busStop(id, callback) {
    if (callback === undefined) {
        callback = console.log;
    }
    var reqUrl = busStopUrl + id.toString();
    var reqOptions = {
        'headers': busStopHeaders
    };
    var response = send(reqUrl, reqOptions, callback);
    return response;
}

function send(reqUrl, reqOptions, callback) {
    return rest.get(reqUrl, reqOptions).on('complete', function(data) {
        processInfo(data, callback);
    });
}

function processInfo(data, callback) {
    if (data.hasOwnProperty("odata.error")) {
        return callback("Invalid Bus Stop ID :(\nTry again.");
        // return callback(data["odata.error"].message.value);
    }

    var busTimingsList = "";
    var header;
    data.Services.forEach(function(bus) {
        if (bus.Status === 'In Operation') {
            var nextBusTime = new Date(bus.NextBus.EstimatedArrival);
            var subseqBusTime = new Date(bus.SubsequentBus.EstimatedArrival);
            busTimingsList += bus.ServiceNo + ' - ' +
                util.timeLeftMin(nextBusTime) + ', ' +
                util.timeLeftMin(subseqBusTime) + '\n';
        }
    });
    header = (busTimingsList === "") ? "Go walk home 😜." : "Buses in operation:";
    busTimingsList = (busTimingsList) ? busTimingsList : "";
    callback(header + '\n' + busTimingsList);
}

function utownBUS(callback) {
    var reqURL = 'http://seagame.comfortdelgro.com.sg/shuttle.aspx?caption=University%20Town&name=UTown';
    rest.get(reqURL).on('complete', function(data) {
        var $ = cheerio.load(data);
        var d1 = "D1: " + $('#GridView1_ctl02_lblarrivalTime').text() + ', ' + $('#GridView1_ctl02_lblnextArrivalTime').text();
        var d2 = "D2: " + $('#GridView1_ctl03_lblarrivalTime').text() + ', ' + $('#GridView1_ctl03_lblnextArrivalTime').text();
        var msg = 'UTown Bus Timings:\n' + d1 + '\n' + d2;
        return callback(msg);
    });
}

module.exports = {
    'busStopQuery': busStop,
    'defaultBusStop': defaultBusStop,
    'utownBUS': utownBUS
};
