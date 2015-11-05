var rest = require('restler');
var util = require('./util');

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

        var msg = filter(data);
        if (msg !== "") {
            bot.sendMessage(chatId, header + msg);
        }

    });
}

function filter(data) {
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
    getSpaces: getSpaces
};