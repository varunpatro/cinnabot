var rest = require('restler');
var db = require('./db');
var util = require('./util');

//var postURL = "https://docs.google.com/forms/d/1mh5jD1RfstgrbJPefjyPoM2OyLqsZt6C87g1suQ1TuI/formResponse";
var postURL = "http://localhost"; // Use this in dev mode
var MSG_INFO = "\nType /back to go back. Type /cancel to cancel feedback.";

function ask_category(chatId, bot, faultSession) {
    var opts = {
        reply_markup: JSON.stringify({
            keyboard: [
                ['New'],
                ['Reported but not rectified'],
                ['Reported, rectified but re-occurred'],
            ],
            one_time_keyboard: true
        })
    };
    msg = "Problem Category?\n\nFor other categories, please write.\n" + MSG_INFO;
    bot.sendMessage(chatId, msg, opts);
    faultSession.key = "category";
    faultSession.next = ask_urgency;
    faultSession.back = ask_category;
}

function ask_urgency(chatId, bot, faultSession) {
    var opts = {
        reply_markup: JSON.stringify({
            keyboard: [
                ['Very Urgent', 'Urgent'],
                ['Slightly Urgent', 'Can Wait'],
            ],
            one_time_keyboard: true
        })
    };
    msg = "Problem Urgency?\n" + MSG_INFO;
    bot.sendMessage(chatId, msg, opts);
    faultSession.key = "urgency";
    faultSession.next = ask_location;
    faultSession.back = ask_category;
}

function ask_location(chatId, bot, faultSession) {
    var opts = {
        reply_markup: JSON.stringify({
            hide_keyboard: true
        })
    };
    msg = "Please enter your problem location:\n" + MSG_INFO;
    bot.sendMessage(chatId, msg, opts);
    faultSession.key = "location";
    faultSession.next = ask_name;
    faultSession.back = ask_urgency;
}

function ask_name(chatId, bot, faultSession) {
    db.getUser(chatId, callback);

    function callback(err, row) {
        var opts = {
            reply_markup: JSON.stringify({
                keyboard: [
                    [row.name],
                ],
                one_time_keyboard: true
            })
        };
        msg = "Click your name below:\n\nOr write your name if it doesn't match.\n" + MSG_INFO;
        bot.sendMessage(chatId, msg, opts);
        faultSession.key = "name";
        faultSession.next = ask_room;
        faultSession.back = ask_location;
    }
}

function ask_room(chatId, bot, faultSession) {
    var opts = {
        reply_markup: JSON.stringify({
            hide_keyboard: true
        })
    };
    msg = "Enter your room no:\n" + MSG_INFO;
    bot.sendMessage(chatId, msg, opts);
    faultSession.key = "room";
    faultSession.next = ask_matric;
    faultSession.back = ask_name;
}

function ask_matric(chatId, bot, faultSession) {
    db.getUser(chatId, callback);

    function callback(err, row) {
        var opts = {
            reply_markup: JSON.stringify({
                keyboard: [
                    [util.calculateNUSMatricNumber(row.matric)],
                ],
                one_time_keyboard: true
            })
        };
        msg = "Click your matric no. below:\n\nOr write your matric no. if it doesn't match.\n" + MSG_INFO;
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
            reply_markup: JSON.stringify({
                keyboard: [
                    [row.email],
                ],
                one_time_keyboard: true
            })
        };
        msg = "Click your email below:\n\nOr write your email if it doesn't match.\n" + MSG_INFO;
        bot.sendMessage(chatId, msg, opts);
        faultSession.key = "email";
        faultSession.next = ask_phone;
        faultSession.back = ask_matric;
    }
}

function ask_phone(chatId, bot, faultSession) {
    var opts = {
        reply_markup: JSON.stringify({
            hide_keyboard: true
        })
    };
    msg = "Enter your phone number:\n" + MSG_INFO;
    bot.sendMessage(chatId, msg, opts);
    faultSession.key = "phone";
    faultSession.next = ask_description;
    faultSession.back = ask_email;
}

function ask_description(chatId, bot, faultSession) {
    var opts = {
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
        '&entry.113024073=' + faultFeedback.description;

    rest.get(feedbackURL).on('complete', function(data) {
        bot.sendMessage(chatId, "Thanks!");
    });
}

module.exports = {
    ask_category: ask_category,
    ask_urgency: ask_urgency,
    ask_location: ask_location,
    ask_name: ask_name,
    ask_matric: ask_matric,
    ask_phone: ask_phone,
    ask_room: ask_room,
    ask_description: ask_description,
    ask_continue_description: ask_continue_description,
    submit: submit
};
