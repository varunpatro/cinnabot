var rest = require('restler');
var cheerio = require('cheerio');
var geolib = require('geolib');
var parseString = require('xml2js').parseString;
var util = require('./util');
var nusbusstops = require('./nusbusstops.json');
var publicBusStops = require('./busstops.json');
var ltaCredentials = require('./private/lta_credentials.json');

var defaultBusstop = 19059;

var busstopUrl =
    'http://datamall2.mytransport.sg/ltaodataservice/BusArrival?BusStopID=';

var busstopHeaders = {
    'AccountKey': ltaCredentials.AccountKey,
    'UniqueUserID': ltaCredentials.UniqueUserID
};

function bus(chatId, busstop, location, callback) {
    var locResponse = "Please send me your location to find public bus timings for the nearest bus stop:\n\n";
    locResponse += "You can do this by selecting the paperclip icon (📎) ";
    locResponse += "followed by attaching your location (📌).";


    var greeting = "Good " + util.currentTimeGreeting() + ", where do you want to go today?";

    if (busstop === "nearest bus stop") {
        return callback(locResponse);
    } else if ((busstop || location)) {
        if (busstop !== "bus") {
            return publicBusQuery(busstop, callback, location);
        }
    } else {
        return callback(greeting);
    }
}

function publicBusQuery(id, callback, location) {
    function processBusInfo(data, callback, busstop_name) {
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
                busTimingsList += '*' + bus.ServiceNo + '* - ' +
                    util.timeLeftMin(nextBusTime) + ', ' +
                    util.timeLeftMin(subseqBusTime) + '\n';
            }
        });
        header = (busTimingsList === "") ? "Go walk home 😜" : "Bus Stop: \n" + "_" + busstop_name + "_\nBuses in operation:";
        busTimingsList = (busTimingsList) ? busTimingsList : "";
        callback(header + '\n' + busTimingsList);
    }

    var busstop_name;
    if (location) {
        id = nearestPublicBusstop(location);
    }

    for (var i = 0; i < publicBusStops.length; i++) {
        if (id === publicBusStops[i].id) {
            busstop_name = publicBusStops[i].name;
        }
    }

    var reqUrl = busstopUrl + id.toString();
    var reqOptions = {
        'headers': busstopHeaders,
        'timeout': 5000
    };

    rest.get(reqUrl, reqOptions).on('timeout', function() {
        callback("LTA service is busy at the moment. Please try again in a few minutes 😊");
    }).on('complete', function(data) {
        processBusInfo(data, callback, busstop_name);
    });
}

function nusbus(chatId, busstop, location, callback) {
    var locResponse = "Please send me your location to find public bus timings for the nearest bus stop:\n\n";
    locResponse += "You can do this by selecting the paperclip icon (📎) ";
    locResponse += "followed by attaching your location (📌).";

    var greeting = "Good " + util.currentTimeGreeting() + ", where would you like NUS bus timings for?";

    if (busstop === "nearest bus stop") {
        return callback(locResponse);
    } else if ((busstop || location)) {
        if (busstop !== "bus") {
            return nusBusQuery(busstop, callback, location);
        }
    } else {
        return callback(greeting);  
    }
}

function nusBusQuery(busstop_name, callback, location) {
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
        busstop = nearestNUSBusstop(location);
    } else {
        busstop = busstopMap[busstop_name];
    }
    if (!busstop) {
        return callback("Invalid Bus Stop Chosen. Send location or choose again", null);
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
                    } else if ((shuttle.arrivalTime === "Arr") || (shuttle.nextArrivalTime === "Arr")) {
                        shuttleMessage += shuttle.arrivalTime + " , ";
                        shuttleNextMessage += shuttle.nextArrivalTime + " ";
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

function nearestNUSBusstop(start) {
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

function nearestPublicBusstop(start) {
    var minDist = Infinity;
    var minBusstopID = 19059;
    for (var i = 0; i < publicBusStops.length; i++) {
        var dist = geolib.getDistance(start, publicBusStops[i].coordinates);
        if (dist < minDist) {
            minDist = dist;
            minBusstopID = publicBusStops[i].id;
        }
    }
    return minBusstopID;
}

module.exports = {
    'nusbus': nusbus,
    'bus': bus
};