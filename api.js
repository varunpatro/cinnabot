var auth = require('./auth');
var rest = require('restler');
var util = require('./util');
var weather = require('./weather');
var traffic = require('./traffic');

var help_message = 
    "Here's what you can ask Cinnabot!\n /fault - report a fault in the building \n /menu - check what Compass has in store this week \n /nextbus<space>bustop # - see the next bus timings \n /weather - get a weather report";

var syntax_error_message = 
    "Cinnabot didn't understand that command. Type \"/help\" for more information.";

var invalid_user_message = 
    "Hi, you're not registered in the cinnabot server. Please contact your RA to register.";

function request(msgObj, callback) { //msg object. Returns a msgObj
    var msgFrom = util.getPhoneNum(msgObj.from);
    var msgRequest = msgObj.body;
    var msgType = "";
    var msgResponse = "";
    
    if (!auth.isAllowed(msgFrom)) {
        msgResponse = invalid_user_message;
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
    if(input[0] != '/') {
        //log error message
        return syntax_error_message;
    }
    var cmd = input.substr(1).split(' ');
    switch(cmd[0]) {
        case 'menu':
            return "image";
        case 'nextbus':
            return 'function';
        default: 
            return "text";
    }
}

function parseCmd(input, phone, msgObj, callback) { 
    if(input[0] != '/') {
        //log error message
        return syntax_error_message;
    }
    var cmd = input.substr(1).split(' ');
    switch(cmd[0]) {
            case 'fault':
                return faultResponse(msgObj);
            case 'help':
                return help_message;
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
                return help_messge;
    }
}

function menuResponse(msgObj) {
    var imgURL = 'menu.jpg';
    return imgURL;
}

function faultResponse(msgObj) { //FAULT <LVL> <DETAILS>
    
    var problem_category = null; //new; reported but not rectified; reported, rectified but reoccurred; other
    var problem_urgency = null; //very urgent, urgent, slightly urgent, can wait
    var problem_location = null; //string
    var problem_description = null;

    //Should get these from database
    var name = null; //str
    var room_number = null; //str
    var matric_number = null; //str
    var nus_email = null; //str
    var phone_number = null;
    
    var category_qn = "What kind of issue is it?\n 1) New\n 2) Reported but not rectified\n 3) Reported and rectified but reoccurred\n 4) Other";
    var urgency_qn = "How urgent is it?\n 1) Very urgent\n 2) Urgent\n 3) Slightly urgent\n 4) Can wait";
    var location_qn = "Where is the problem?";
    var info_qn = "Enter your name and matric number, separated by a comma.\n e.g. Cinna Bot, U0123456X";
    var roomno_qn = "Your room number:";
    var description_qn = "Describe the problem. If you answered 'New' to the first question, include date of first occurrence.";

    wa.sendMessage(msgObj.from, category_qn, function(err, id) {
	    if (err) {
            console.log(err.message);
            return;
        } else {
            
        }
    });

}


module.exports = {
    'request': request
};
