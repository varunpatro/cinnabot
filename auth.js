var IVLE_CREDENTIALS = require('./private/ivle_credentials.json');
var db = require('./db');

function register(bot, chatId) {
    var msg = "In order to enjoy more functions of Cinnabot,";
    msg += " you HAVE to register via IVLE for us to confirm";
    msg += " that you are a resident of Cinnamon College.";
    msg += " If you agree type /agree for us to generate a";
    msg += " one-time secure link for you to register.\n Also,";
    msg += " by doing so, you give us permission to send you";
    msg += " important messages via our broadcasting service.";
    msg += " Rest assured, access to this function is tightly";
    msg += " controlled and you can opt out anytime for non";
    msg += " essential messages.\n\n";

    return bot.sendMessage(chatId, msg);
}

function agree(bot, userId) {
    var link = "https://ivle.nus.edu.sg/api/login/?apikey=" + IVLE_CREDENTIALS.APIKey + "&url=http://172.18.13.189:3000/ivle_register?userId=" + userId;
    var msg = "Login to IVLE to register:\n";
    bot.sendMessage(userId, msg + link);
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
    isCinnamonResident: isCinnamonResident
};
