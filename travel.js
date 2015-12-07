var rest = require('restler');
var cheerio = require('cheerio');
var geolib = require('geolib');
var parseString = require('xml2js').parseString;
var util = require('./util');
var nusbusstops = require('./nusbusstops.json');
var ltaCredentials = require('./private/lta_credentials.json');

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
        'headers': busStopHeaders,
        'timeout': 5000
    };
    var response = send(reqUrl, reqOptions, callback);
    return response;
}

function send(reqUrl, reqOptions, callback) {
    return rest.get(reqUrl, reqOptions).on('timeout', function() {
        callback("LTA service is busy at the moment. Please try again in a few minutes 😊");
    }).on('complete', function(data) {
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
    header = (busTimingsList === "") ? "Go walk home 😜" : "Buses in operation:";
    busTimingsList = (busTimingsList) ? busTimingsList : "";
    callback(header + '\n' + busTimingsList);
}

function nusbus(callback, busstop_name, location) {
    var busstopMap = {
        "utown": "UTown",
        "computing": "COM2",
        "central library": "CENLIB",
        "computer centre": "COMCEN",
        "science": "LT29",
        "business": "HSSML-OPP",
        "kent ridge mrt": "KR-MRT",
        "bukit timah campus": "BUKITTIMAH-BTC2",
        "pgp terminal": "PGPT"
    };

    var busstop;
    if (location) {
        busstop = nearestNUSBustop(location);
    } else {
        busstop = busstopMap[busstop_name];
    }
    if (!busstop) {
        return callback("❗️ Invalid Bus Stop Chosen. Send location or choose again ", null);
    }

    var reqURL = "http://nextbus.comfortdelgro.com.sg//testMethod.asmx/GetShuttleService?busstopname=" + busstop;
    rest.get(reqURL, {
        timeout: 5000
    }).on('timeout', function() {
        callback("NUS Bus Service is busy at the moment. Please try again in a few minutes 😊");
    }).on('complete', function(data) {
        parseString(data, function(err, result) {
            if (!err) {
                var busdata = JSON.parse(result.string._);
                var list = "";
                if (location) {
                    list = "From your location, I have identified: " + "_" + busstop + "_" + " as the nearest bus stop\n\n";
                } else {
                    list = "Your selected location is " + "_" + busstop + "_" + "\n\n";
                }
                list += "Here are the Buses and the respective timings:\n";
                busdata.ShuttleServiceResult.shuttles.forEach(function(shuttle) {
                    var shuttleMessage = "";
                    var shuttleNextMessage = "";
                    if ((shuttle.arrivalTime === "-") || (shuttle.arrivalTime === "N.A")) {
                        if ((shuttle.nextArrivalTime === "-") || (shuttle.nextArrivalTime === "N.A")) {
                            shuttleMessage += " 🚫 The Service is *Not* Available ";
                        } else {
                            shuttleNextMessage += shuttle.nextArrivalTime + " min";
                        }
                    } else {
                        shuttleMessage += shuttle.arrivalTime + " min, ";
                        shuttleNextMessage += shuttle.nextArrivalTime + " min";
                    }


                    list += "*" + shuttle.name + "*" + ": ";
                    list += shuttleMessage;
                    list += shuttleNextMessage + "\n";
                });
                return callback(null, list);
            }
        });
    });
}

function nearestNUSBustop(start) {
    var minDist = Infinity;
    var minLoc = "UTown";
    for (var i = 0; i < nusbusstops.length; i++) {
        var dist = geolib.getDistance(start, nusbusstops[i]);
        if (dist < minDist) {
            minDist = dist;
            minLoc = nusbusstops[i].name;
        }
    }
    return minLoc;
}

module.exports = {
    'busStopQuery': busStop,
    'defaultBusStop': defaultBusStop,
    'nusbus': nusbus
};
