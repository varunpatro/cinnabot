var cache = require('memory-cache');
var IVLE_CREDENTIALS = require('./private/ivle_credentials.json');
var APP_CREDENTIALS = require('./private/app_credentials.json');
var db = require('./db');
var sessions = require('./sessions');

function getOTP(key) {
    var randomOTP = "" + Math.floor(Math.random() * 1000000);
    cache.put(key, randomOTP, 2 * 60 * 1000);
    return randomOTP;
}

function validateOTP(key, OTP) {
    var storedOTP = cache.get(key);
    if (storedOTP === OTP) {
        cache.del(key);
        return true;
    }
    return false;
}

function register(chatId, callback) {
    var regSession = sessions.createRegisterSession(chatId);
    regSession.hasPrompt = true;

    var msg = "*Cinnabot Registration*\n\n";
    msg += "In order to enjoy more functions of Cinnabot, ";
    msg += "you have to register via IVLE for us to confirm ";
    msg += "that you are a resident of Cinnamon College.\n\n";
    msg += "Please type or press /agree to initiate the authentication process.\n\n";
    msg += "Type /cancel to cancel the request.";

    return callback(msg);
}

function agree(userId, callback) {
    var regSession = sessions.getRegisterSession(userId);
    if (!regSession || !regSession.hasPrompt) {
        return callback("You have to /register before /agree!");
    }
    sessions.deleteRegisterSession(userId);

    var OTP = getOTP(userId);
    var link = "https://ivle.nus.edu.sg/api/login/?apikey=" + IVLE_CREDENTIALS.APIKey + "&url=" + APP_CREDENTIALS.url + "/ivle_register/" + userId + "?OTP=" + OTP;
    var msg = "Press [here](" + link + ") to register via IVLE.";
    callback(msg);
}

function isCinnamonResident(userId, finalCallback) {
    function callback(err, row) {
        if (!err) {
            finalCallback(row);
        }
    }
    return db.getUser(userId, callback);
}

module.exports = {
    register: register,
    agree: agree,
    isCinnamonResident: isCinnamonResident,
    validateOTP: validateOTP
};
