import cache = require('memory-cache');
import IVLE_CREDENTIALS = require('./private/ivle_credentials.json');
import APP_CREDENTIALS = require('./private/app_credentials.json');
import db = require('./db');
import sessions = require('./sessions');

export function getOTP(key) {
    var randomOTP = "" + Math.floor(Math.random() * 1000000);
    cache.put(key, randomOTP, 2 * 60 * 1000);
    return randomOTP;
}

export function validateOTP(key, OTP) {
    var storedOTP = cache.get(key);
    if (storedOTP === OTP) {
        cache.del(key);
        return true;
    }
    return false;
}

export function register(chatId, callback) {
    var regSession = sessions.createRegisterSession(chatId);

    var msg = "*Cinnabot Registration*\n\n";
    msg += "In order to enjoy more functions of Cinnabot, ";
    msg += "you have to register via IVLE for us to confirm ";
    msg += "that you are a resident of Cinnamon College.\n\n";
    msg += "Please type or press /agree to initiate the authentication process.\n\n";
    msg += "Type /cancel to cancel the request.";

    return callback(msg);
}

export function agree(userId, callback) {
    var regSession = sessions.getRegisterSession(userId);

    if (!regSession) {
        return callback("You have to /register before /agree!");
    }

    var OTP = getOTP(userId);
    var link = "https://ivle.nus.edu.sg/api/login/?apikey=" + IVLE_CREDENTIALS.APIKey + "&url=" + APP_CREDENTIALS.url + "/ivle_register/" + userId + "?OTP=" + OTP;
    var msg = "Press [here](" + link + ") to register via IVLE.";
    callback(msg);
}

export function isCinnamonResident(userId, finalCallback) {
    function callback(err, row) {
        if (!err) {
            finalCallback(row);
        }
    }
    return db.getUser(userId, callback);
}