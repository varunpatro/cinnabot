var rest = require('restler');
var db = require('./db');
var util = require('./util');
var auth = require('./auth');
var sessions = require('./sessions');

var MSG_INFO = "\nType /back to go back. Type /cancel to cancel feedback.";

function start(chatId, bot, callback) {
    function authCallback(row) {
        if (!row) {
            callback('Sorry you\'re not registered. Type /register to register.');
            // } else if (!row.isCinnamonResident) {
            //     bot.sendMessage(chatId, 'Sorry you must be a Cinnamon resident to use this feature :(');
        } else {
            var faultSession = sessions.createFaultSession(chatId);
            ask_category(chatId, bot, faultSession);
        }
    }
    auth.isCinnamonResident(chatId, authCallback);
}

function continueFeedback(chatId, body, bot) {
    var faultSession = sessions.getFaultSession(chatId);
    if (faultSession.key === 'phone') {
        if ((body.length !== 8) || isNaN(parseInt(body))) {
            return bot.sendMessage(chatId, 'Phone number must be 8 numerical digits.').then(function() {
                ask_phone(chatId, bot, faultSession);
            });
        }
    }
    if (faultSession.key === 'description') {
        var remindDone = function() {
            bot.sendMessage(chatId, "Please remember to type /done when you are done.");
            //setTimeout(remindDone, 20 * 1000);
        };
        setTimeout(remindDone, 20 * 1000);
        if (body.endsWith('/done')) {
            faultSession.faultFeedback[faultSession.key] += body.substring(0, body.length - 6);
            if (faultSession.faultFeedback.description.length < 24) {
                return bot.sendMessage(chatId, 'You have entered:\n"' + faultSession.faultFeedback.description.trim() + '"\nDescription should be at least 23 characters.').then(function() {
                    ask_continue_description(chatId, bot, faultSession);
                });
            }
            return submit(chatId, bot, faultSession.faultFeedback);
        }
        faultSession.faultFeedback[faultSession.key] += body;
    } else {
        faultSession.faultFeedback[faultSession.key] = body;
    }
    return faultSession.next(chatId, bot, faultSession);
}

function ask_category(chatId, bot, faultSession) {
    var opts = {
        parse_mode: "Markdown",
        reply_markup: JSON.stringify({
            keyboard: [
                ['New'],
                ['Reported but not rectified'],
                ['Reported, rectified but re-occurred'],
            ],
            one_time_keyboard: true
        })
    };
    bot.sendMessage(chatId, "*Welcome to Cinnabot's Fault Reporting System*\nThis will send an email to OHS, Cinnamon so please do not abuse it.", {
        parse_mode: "Markdown"
    }).then(function() {
        msg = "What is your *Problem Category*?\n" + MSG_INFO;
        bot.sendMessage(chatId, msg, opts);
    });
    faultSession.key = "category";
    faultSession.next = ask_urgency;
    faultSession.back = ask_category;
}

function ask_urgency(chatId, bot, faultSession) {
    var opts = {
        parse_mode: "Markdown",
        reply_markup: JSON.stringify({
            keyboard: [
                ['Very Urgent', 'Urgent'],
                ['Slightly Urgent', 'Can Wait'],
            ],
            one_time_keyboard: true
        })
    };
    msg = "How *urgent* is your problem?\n" + MSG_INFO;
    bot.sendMessage(chatId, msg, opts);
    faultSession.key = "urgency";
    faultSession.next = ask_location;
    faultSession.back = ask_category;
}

function ask_location(chatId, bot, faultSession) {
    var opts = {
        parse_mode: "Markdown",
        reply_markup: JSON.stringify({
            hide_keyboard: true
        })
    };
    msg = "Where is the problem *located*?:\n" + MSG_INFO;
    bot.sendMessage(chatId, msg, opts);
    faultSession.key = "location";
    faultSession.next = ask_name;
    faultSession.back = ask_urgency;
}

function ask_name(chatId, bot, faultSession) {
    db.getUser(chatId, callback);

    function callback(err, row) {
        var opts = {
            parse_mode: "Markdown",
            reply_markup: JSON.stringify({
                keyboard: [
                    [row.name],
                ],
                one_time_keyboard: true
            })
        };
        msg = "Select your *name* below:\n\nOr write your name if it doesn't match.\n" + MSG_INFO;
        bot.sendMessage(chatId, msg, opts);
        faultSession.key = "name";
        faultSession.next = ask_room;
        faultSession.back = ask_location;
    }
}

function ask_room(chatId, bot, faultSession) {
    var opts = {
        parse_mode: "Markdown",
        reply_markup: JSON.stringify({
            hide_keyboard: true
        })
    };
    msg = "Please enter your *room number*:\n" + MSG_INFO;
    bot.sendMessage(chatId, msg, opts);
    faultSession.key = "room";
    faultSession.next = ask_matric;
    faultSession.back = ask_name;
}

function ask_matric(chatId, bot, faultSession) {
    db.getUser(chatId, callback);

    function callback(err, row) {
        var opts = {
            parse_mode: "Markdown",
            reply_markup: JSON.stringify({
                keyboard: [
                    [util.calculateNUSMatricNumber(row.matric)],
                ],
                one_time_keyboard: true
            })
        };
        msg = "Select your *matric no.* below:\n\nOr write your matric no. if it doesn't match.\n" + MSG_INFO;
        bot.sendMessage(chatId, msg, opts);
        faultSession.key = "matric";
        faultSession.next = ask_email;
        faultSession.back = ask_room;
    }
}

function ask_email(chatId, bot, faultSession) {
    db.getUser(chatId, callback);

    function callback(err, row) {
        var opts = {
            parse_mode: "Markdown",
            reply_markup: JSON.stringify({
                keyboard: [
                    [row.email],
                ],
                one_time_keyboard: true
            })
        };
        msg = "Select your *email* below:\n\nOr write your email if it doesn't match.\n" + MSG_INFO;
        bot.sendMessage(chatId, msg, opts);
        faultSession.key = "email";
        faultSession.next = ask_phone;
        faultSession.back = ask_matric;
    }
}

function ask_phone(chatId, bot, faultSession) {
    var opts = {
        parse_mode: "Markdown",
        reply_markup: JSON.stringify({
            hide_keyboard: true
        })
    };
    msg = "Please enter your *phone number*:\n" + MSG_INFO;
    bot.sendMessage(chatId, msg, opts);
    faultSession.key = "phone";
    faultSession.next = ask_permission;
    faultSession.back = ask_email;
}

function ask_permission(chatId, bot, faultSession) {
    var opts = {
        parse_mode: "Markdown",
        reply_markup: JSON.stringify({
            keyboard: [
                ['Yes', 'No']
            ],
            one_time_keyboard: true
        })
    };
    msg = "*Do you consent to OHS entering your room without your presence to rectify the fault?*\n" + MSG_INFO;
    bot.sendMessage(chatId, msg, opts);
    faultSession.key = "permission";
    faultSession.back = ask_phone;
    faultSession.next = ask_description;
}


function ask_description(chatId, bot, faultSession) {
    var opts = {
        parse_mode: "Markdown",
        reply_markup: JSON.stringify({
            hide_keyboard: true
        })
    };
    msg = "Enter the problem description. Type /done to end the description.\n" + MSG_INFO;
    bot.sendMessage(chatId, msg, opts);
    faultSession.key = "description";
    faultSession.next = ask_continue_description;
    faultSession.back = ask_phone;
}

function ask_continue_description(chatId, bot, faultSession) {
    faultSession.faultFeedback.description += "\n";
    faultSession.key = "description";
    faultSession.next = ask_continue_description;
    faultSession.back = ask_phone;
}

function submit(chatId, bot, faultFeedback) {
    var feedbackURL = "https://docs.google.com/forms/d/1mh5jD1RfstgrbJPefjyPoM2OyLqsZt6C87g1suQ1TuI/formResponse?";
    feedbackURL +=
        'entry.2132193706=' + faultFeedback.category +
        // '&entry.2132193706.other_option_response=' + faultFeedback.category +
        '&entry.749088216=' + faultFeedback.urgency +
        '&entry.2133800720=' + faultFeedback.location +
        '&entry.787536878=' + faultFeedback.name +
        '&entry.1813223989=' + faultFeedback.room +
        '&entry.1836226199=' + faultFeedback.matric +
        '&entry.2119962668=' + faultFeedback.email +
        '&entry.858293967=' + faultFeedback.phone +
        '&entry.1755718880=' + faultFeedback.permission +
        '&entry.113024073=' + faultFeedback.description;

    sessions.deleteFaultSession(chatId);
    console.log(feedbackURL);
}

module.exports = {
    ask_category,
    ask_urgency,
    ask_location,
    ask_name,
    ask_matric,
    ask_phone,
    ask_room,
    ask_permission,
    ask_description,
    ask_continue_description,
    start,
    continueFeedback,
    submit
};
