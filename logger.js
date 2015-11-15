var emojiStrip = require('emoji-strip');
var rest = require('restler');
var db = require('./db');
var logStmt = db.getLogStmt();
var feedbackStmt = db.getFeebackStmt();

function log(msg) {
    cinnalog(msg);
    if (logStmt) {
        logStmt.run(new Date(), emojiStrip(msg.text), msg.from.id, msg.from.username, msg.from.first_name, msg.from.last_name);
    }
}

function feedback(bot, feedbackMsg, msg) {
    if (feedbackStmt) {
        feedbackStmt.run(new Date(), emojiStrip(feedbackMsg), msg.from.id, msg.from.username, msg.from.first_name, msg.from.last_name);
    }
    var msgToSend = "FEEDBACK MESSAGE\n==============\n";
    msgToSend += "From: " + msg.from.first_name + " " + msg.from.last_name + " (" + msg.from.username + ")\n";
    msgToSend += "Message: " + feedbackMsg;
    bot.sendMessage('49892469', msgToSend);
    bot.sendMessage('102675141', msgToSend);
}

function cinnalog(msg) {
    var logURL = "https://docs.google.com/forms/d/1Xpeeh72BKwjyIqeetVdt8Vra7JLZJFKgjXLt_AcJu8w/formResponse?entry.1944201912=" + msg.from.username + "&entry.1892303243=" + msg.from.id + "&entry.735577696=" + msg.text + "&entry.1541043242=" + msg.from.first_name + "&entry.439602784=" + msg.from.last_name;
    return rest.get(logURL).on('complete', function(data) {});
}

module.exports = {
    "log": log,
    "feedback": feedback
};
