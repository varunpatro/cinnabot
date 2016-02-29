var _ = require('lodash');
var rest = require('restler');

var auth = require('./auth');
var util = require('./util');

function getEvents(callback) {
    var spacesURL = 'http://www.nususc.com/USCWebsiteInformationAPI.asmx/GetAllEvents';
    var data = {
        authenticationCode: 'USC$2016DevTool'
    };
    rest.postJson(spacesURL, data, {
        timeout: 5000
    }).on('timeout', x => callback('USC website is taking too long to respond. Please try again later 😊'))
    .on('complete', function(data, response) {
        var header = 'Upcoming Events:\n';
        header += '==============\n\n';
        var msg = filterEvents(data);
        if (msg !== '') {
            return callback(header + msg);
        }
        callback('No Upcoming Events');
    }).on('error', err => console.log(err));
}

function filterEvents(data) {
    var filteredMsg = '';
    for (var i = 0; i < Math.min(data.d.length, 4); i++) {
        var event = data.d[i];
        filteredMsg += event.EventName + '\n';
        filteredMsg += event.Venue + '\n';
        filteredMsg += event.Date + ' ' + event.StartTime + ' to ' + event.EndTime + '\n';
        filteredMsg += 'http://www.nususc.com/EventRegistration.aspx?id=' + event.ID + '\n\n';
    }
    return filteredMsg;
}

function getAllSpaces(chatId, callback) {
    function authCallback(row) {
        if (!row) {
            callback('Sorry you\'re not registered. Type /register to register.');
            // } else if (!row.isCinnamonResident) {
            //     callback('Sorry you must be a Cinnamon resident to use this feature :(');
        } else {
            getSpaces(1, callback);
            getSpaces(2, callback);
            getSpaces(3, callback);
            getSpaces(4, callback);
            getSpaces(6, callback);
        }
    }
    auth.isCinnamonResident(chatId, authCallback);
}

function getSpaces(id, callback) {
    var spacesURL = 'http://www.nususc.com/USCWebsiteInformationAPI.asmx/GetSpacesBookingRecord';
    var data = {
        'facilityID': id
    };
    rest.postJson(spacesURL, data).on('complete', function(data, response) {
        var header;
        switch (id) {
            case 1:
                header = 'Theme Room 1:\n';
                break;
            case 2:
                header = 'Theme Room 2:\n';
                break;
            case 3:
                header = 'CTPH:\n';
                break;
            case 4:
                header = 'Amphitheatre:\n';
                break;
            case 6:
                header = 'Chatterbox:\n';
                break;
        }
        header += '==============\n\n';

        var msg = filterSpaces(data);
        if (msg !== '') {
            callback(header + msg);
        } else {
            callback(header + 'No Upcoming Events.');
        }
    });
}

function filterSpaces(data) {
    var filteredMsg = '';
    var choosenEvents = [];
    var today = new Date();
    var threeDays = new Date();
    var timeOffset = 8 * 60 * 60 * 1000;
    threeDays.setDate(threeDays.getDate() + 3);
    data.d.forEach(event => {
        var startTime = new Date((new Date(event.start)).getTime() - timeOffset);
        var endTime = new Date((new Date(event.end)).getTime() - timeOffset);
        if (startTime < threeDays && startTime > today) {
            choosenEvents.push({
                title: event.title,
                startTime: startTime,
                endTime: endTime
            });

        }
    });

    var sortedEvents = _.sortBy(choosenEvents, 'startTime', 'endTime');
    sortedEvents.forEach(sortedEvent => {
            filteredMsg += sortedEvent.title + '\n' + util.formatDate(sortedEvent.startTime) + ' from ' + util.formatTime(sortedEvent.startTime) + ' to ' + util.formatTime(sortedEvent.endTime) + '\n\n';
    });

    return filteredMsg;
}

module.exports = {
    getEvents, getAllSpaces, getSpaces
};
