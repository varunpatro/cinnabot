var async = require('async');
var rest = require('restler');
var geolib = require('geolib');
var xml2js = require('xml2js');
var _ = require('lodash');
var util = require('./util');

var nusbusstops = require('./../static/nusbusstops.json');
var publicBusStops = require('./../static/busstops.json');
var config = require('./../private/config.json');

const busstopUrl =
    'http://datamall2.mytransport.sg/ltaodataservice/BusArrival?BusStopID=';

var busstopHeaders = {
    'AccountKey': config.LTA.AccountKey,
    'UniqueUserID': config.LTA.UniqueUserID
};

function bus(chatId, busstop, location, callback) {
    var greeting = 'Good ' + util.currentTimeGreeting() + ', where do you want to go today?';

    if ((busstop || location)) {
        if (busstop !== 'bus') {
            return publicBusQuery(busstop, callback, location);
        }
    } else {
        return callback(greeting);
    }
}

function publicBusQuery(id, callback, location) {
    function processBusInfo(data, busstop_name) {
        if (data.hasOwnProperty('odata.error')) {
            return 'Invalid Bus Stop ID :(\nTry again.';
        }

        var busTimingsList = '';
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
        header = 'Bus Stop: \n' + '_' + busstop_name + '_\nBuses in operation:';
        busTimingsList = (busTimingsList) ? busTimingsList : 'None :(\n';
        return header + '\n' + busTimingsList;
    }

    function processID(id) {
        return function (callback) {
            var busstop_name;
            for (var i = 0; i < publicBusStops.length; i++) {
                if (id === publicBusStops[i].id) {
                    busstop_name = publicBusStops[i].name;
                }
            }
            if (!busstop_name) {
                return callback('Invalid Bus Stop ID chosen.');
            }
            var reqUrl = busstopUrl + id.toString();
            var reqOptions = {
                'headers': busstopHeaders,
                'timeout': 10000
            };

            rest.get(reqUrl, reqOptions).on('timeout', function() {
                callback('LTA service is busy at the moment. Please try again in a few minutes 😊');
            }).on('complete', function(data) {
                callback(null, processBusInfo(data, busstop_name));
            });
        };
    }

    if (location) {
        ids = nearestPublicBusstops(location, 3);
        ids = _.map(ids, x => x.id);
    } else {
        ids = [id];
    }

    async.parallel(_.map(ids, processID), function(err, results) {
        if (err) {
            callback(err);
            // throw err;
        }
        callback(_.join(results, '\n'));
    });
}


function nusbus(chatId, busstop, location, callback) {
    var greeting = 'Good ' + util.currentTimeGreeting() + ', where would you like NUS bus timings for?';

    if ((busstop || location)) {
        if (busstop !== 'bus') {
            return nusBusQuery(busstop, callback, location);
        }
    } else {
        return callback(greeting);
    }
}

function nusBusQuery(busstop_name, callback, location) {
    var busstopMap = {
        'utown': 'UTown',
        'computing': 'COM2',
        'central library': 'CENLIB',
        'computer centre': 'COMCEN',
        'science': 'LT29',
        'business': 'HSSML-OPP',
        'kent ridge mrt': 'KR-MRT',
        'museum': 'MUSEUM',
        'bukit timah campus': 'BUKITTIMAH-BTC2',
        'pgp terminal': 'PGPT'
    };

    var busstop;
    if (location) {
        busstops = _.map(nearestNUSBusstops(location, 2), 'name');
    } else {
        busstops = [busstopMap[busstop_name]];
    }

    if (!_.every(busstops)) {
        return callback('Invalid Bus Stop Chosen. Send location or choose again');
    }

    async.parallel(_.map(busstops, processStops), function(err, results) {
        if (err) {
            callback(err);
            // throw err;
        }
        callback(_.join(results, '\n'));
    });

    function processStops(busstop) {
        return function (callback) {
            var reqURL = 'http://nextbus.comfortdelgro.com.sg//testMethod.asmx/GetShuttleService?busstopname=' + busstop;
            var reqOptions = {
                timeout: 10000
            };

            rest.get(reqURL, reqOptions).on('timeout', function() {
                callback('NUS Bus Service is busy at the moment. Please try again in a few minutes 😊');
            }).on('complete', function(data) {
                xml2js.parseString(data, function(err, result) {
                    if (!err) {
                        var busdata = JSON.parse(result.string._);
                        var list = 'Bus Stop: _' + busstop + '_\n';
                        busdata.ShuttleServiceResult.shuttles.forEach(function(shuttle) {
                            var shuttleMessage = '';
                            var shuttleNextMessage = '';
                            if ((shuttle.arrivalTime === '-') || (shuttle.arrivalTime === 'N.A')) {
                                if ((shuttle.nextArrivalTime === '-') || (shuttle.nextArrivalTime === 'N.A')) {
                                    shuttleMessage += ' 🚫 The Service is *Not* Available ';
                                } else {
                                    shuttleNextMessage += shuttle.nextArrivalTime + ' min';
                                }
                            } else if ((shuttle.arrivalTime === 'Arr') || (shuttle.nextArrivalTime === 'Arr')) {
                                shuttleMessage += shuttle.arrivalTime + ' , ';
                                shuttleNextMessage += shuttle.nextArrivalTime + ' ';
                            } else {
                                shuttleMessage += shuttle.arrivalTime + ' min, ';
                                shuttleNextMessage += shuttle.nextArrivalTime + ' min';
                            }

                            list += '*' + shuttle.name + '*' + ': ';
                            list += shuttleMessage;
                            list += shuttleNextMessage + '\n';
                        });
                        return callback(null, list);
                    }
                });
            });
        };
    }
}

function nearestNUSBusstops(start, count) {
    var sortedNUSBusStops = _.sortBy(nusbusstops, function(end) {
        return geolib.getDistance(start, end);
    });
    return sortedNUSBusStops.slice(0, count);
}

function nearestPublicBusstops(start, count) {
    var sortedPublicBusStops = _.sortBy(publicBusStops, function(end) {
        return geolib.getDistance(start, end.coordinates);
    });
    return sortedPublicBusStops.slice(0, count);
}

module.exports = {
    nusbus, bus
};
