var emojiStrip = require('emoji-strip');
var rest = require('restler');
var db = require('./db');
var sessions = require('./sessions');
var admins = require('./private/config.json').admins;
var logStmt = db.getLogStmt();
var feedbackStmt = db.getFeebackStmt();
var diningStmt = db.getDiningStmt();

function log(msg) {
    cinnalog(msg);
    if (logStmt) {
        var text = msg.text ? msg.text : "";
        var location = msg.location ? msg.location : {};
        if (!msg.location) {
            location.latitude = null;
            location.longitude = null;
        }
        logStmt.run(new Date(), emojiStrip(text), msg.from.id, msg.from.username, msg.from.first_name, msg.from.last_name, location.latitude, location.longitude);
    }
}

function feedback(feedbackMsg, msg, callback) {
    var now = new Date();
    if (feedbackStmt) {
        feedbackStmt.run(now, emojiStrip(feedbackMsg), msg.from.id, msg.from.username, msg.from.first_name, msg.from.last_name);
    }
    var msgToSend = "FEEDBACK MESSAGE\n==============\n";
    msgToSend += "Time: " + now.getTime() + "\n";
    msgToSend += "User Id: " + msg.from.id + "\n";
    msgToSend += "From: " + msg.from.first_name + " " + msg.from.last_name + " (" + msg.from.username + ")\n";
    msgToSend += "Message: " + feedbackMsg;
    admins.forEach(function(admin) {
        callback(msgToSend, admin);
    });
}

function dining(chatId, bot) {
    var df = sessions.getDiningSession(chatId).diningFeedback;
    var now = new Date();
    if (diningStmt) {
        diningStmt.run(now, chatId, df.when, df.where, df.how, df.feedbackMsg);
        bot.sendMessage(chatId, 'Thanks!');
    }

    if (df.feedbackMsg.length > 100) {
        var msgToSend = "DINING FEEDBACK MESSAGE\n==============\n";
        msgToSend += "Time: " + now.getTime() + "\n";
        msgToSend += "User Id: " + chatId + "\n";
        // msgToSend += "From: " + msg.from.first_name + " " + msg.from.last_name + " (" + msg.from.username + ")\n";
        msgToSend += "Message: " + df.feedbackMsg;
        admins.forEach(function(admin) {
            bot.sendMessage(admin, msgToSend);
        });
    }
}

function cinnalog(msg) {
    var logURL = "https://docs.google.com/forms/d/1Xpeeh72BKwjyIqeetVdt8Vra7JLZJFKgjXLt_AcJu8w/formResponse?entry.1944201912=" + msg.from.username + "&entry.1892303243=" + msg.from.id + "&entry.735577696=" + msg.text + "&entry.1541043242=" + msg.from.first_name + "&entry.439602784=" + msg.from.last_name;
    return rest.get(logURL).on('complete', function(data) {});
}

module.exports = {
    log,
    feedback,
    dining,
};
