var auth = require('./auth');
var rest = require('restler');
var util = require('./util');
var weather = require('./weather');
var traffic = require('./traffic');

var helpMessage =
    'Here\'s what you can ask Cinnabot!\n /fault - report a fault in the ' +
    'building \n /menu - check what Compass has in store this week \n ' +
    '/nextbus<space>bustop # - see the next bus timings \n /weather - get a ' +
    'weather report';

var syntaxErrorMessage =
    'Cinnabot didn\'t understand that command. Type \'/help\' for more' +
    ' information.';

var invalidUserMessage =
    'Hi, you\'re not registered in the cinnabot server. Please contact your' +
    'RA to register.';

function request(msgObj, callback) { //msg object. Returns a msgObj
    var msgFrom = util.getPhoneNum(msgObj.from);
    var msgRequest = msgObj.body;
    var msgType = '';
    var msgResponse = '';

    if (!auth.isAllowed(msgFrom)) {
        msgResponse = invalidUserMessage;
    } else {
        msgResponse = parseCmd(msgRequest, msgFrom, msgObj, callback);
        msgType = responseType(msgRequest);
    }

    return {
        phone: msgFrom,
        type: msgType,
        message: msgResponse
    };
}

function responseType(input) {
    if (input[0] != '/') {
        //log error message
        return syntaxErrorMessage;
    }
    var cmd = input.substr(1).split(' ');
    switch (cmd[0]) {
        case 'menu':
            return 'image';
        case 'nextbus':
            return 'function';
        default:
            return 'text';
    }
}

function parseCmd(input, phone, msgObj, callback) {
    if (input[0] != '/') {
        //log error message
        return syntaxErrorMessage;
    }
    var cmd = input.substr(1).split(' ');
    switch (cmd[0]) {
        case 'fault':
            return faultResponse(msgObj);
        case 'help':
            return helpMessage;
        case 'mealcr/ed':
        case 'menu':
            return menuResponse(msgObj);
        case 'nextbus':
            var busStop = cmd[1] ? cmd[1] : traffic.defaultBusStop;
            return traffic.busStopQuery(busStop, function(data) {
                callback(phone, data);
            });
        case 'weather':
            return weather.getWeather();
        default:
            return helpMessge;
    }
}

function menuResponse(msgObj) {
    var imgURL = 'menu.jpg';
    return imgURL;
}

function faultResponse(msgObj) { //FAULT <LVL> <DETAILS>
    return 'Work in progress. Check back later.';
}

module.exports = {
    'request': request
};
