var rest = require('restler');
var util = require('./util');

function getEvents(chatId, bot) {
    var spacesURL = 'http://www.nususc.com/USCWebsiteInformationAPI.asmx/GetAllEvents';
    var data = {
        authenticationCode: "USC$2016DevTool"
    };
    rest.postJson(spacesURL, data, {
        timeout: 5000
    }).on('timeout', function() {
        bot.sendMessage("USC website is taking too long to respond. Please try again later 😊");
    }).on('complete', function(data, response) {
        var header = "Upcoming Events:\n";
        header += "==============\n\n";
        var msg = filterEvents(data);
        if (msg !== "") {
            bot.sendMessage(chatId, header + msg);
        }
        bot.sendMessage(chatId, "No Upcoming Events");
    }).on('error', function(err) {
        console.log(error);
    });
}

function filterEvents(data) {
    var filteredMsg = "";
    for (var i = 0; i < Math.min(data.d.length, 10); i++) {
        var event = data.d[i];
        filteredMsg += event.EventName + '\n';
        filteredMsg += event.Venue + '\n';
        filteredMsg += event.Date + ' ' + event.StartTime + ' to ' + event.EndTime + '\n';
        filteredMsg += "http://www.nususc.com/EventRegistration.aspx?id=" + event.ID + '\n\n';
    }
    return filteredMsg;
}

function getAllSpaces(chatId, bot) {
    getSpaces(chatId, bot, 1);
    getSpaces(chatId, bot, 2);
    getSpaces(chatId, bot, 3);
    getSpaces(chatId, bot, 5);
    getSpaces(chatId, bot, 6);
}

function getSpaces(chatId, bot, id) {
    var spacesURL = 'http://www.nususc.com/USCWebsiteInformationAPI.asmx/GetSpacesBookingRecord';
    var data = {
        'facilityID': id
    };
    rest.postJson(spacesURL, data).on('complete', function(data, response) {
        var header;
        switch (id) {
            case 1:
                header = "Theme Room 1:\n";
                break;
            case 2:
                header = "Theme Room 2:\n";
                break;
            case 3:
                header = "CTPH:\n";
                break;
            case 4:
                header = "Amphitheatre:\n";
                break;
            case 6:
                header = "Chatterbox:\n";
                break;
        }
        header += "==============\n\n";

        var msg = filterSpaces(data);
        if (msg !== "") {
            bot.sendMessage(chatId, header + msg);
        }

    });
}

function filterSpaces(data) {
    var filteredMsg = "";

    var today = new Date();
    var threeDays = new Date();
    var timeOffset = 8 * 60 * 60 * 1000;
    threeDays.setDate(threeDays.getDate() + 3);
    data.d.forEach(function(event) {
        var startTime = new Date(new Date(event.start) - timeOffset);
        var endTime = new Date(new Date(event.end) - timeOffset);
        if (startTime < threeDays && startTime > today) {
            filteredMsg += event.title + '\n' + util.formatDate(startTime) + ' from ' + util.formatTime(startTime) + ' to ' + util.formatTime(endTime) + '\n\n';
        }
    });

    return filteredMsg;
}


module.exports = {
    getAllSpaces: getAllSpaces,
    getEvents: getEvents
};
