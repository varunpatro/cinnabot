var rest = require('restler');
var auth = require('./auth');
var logger = require('./logger');
var sessions = require('./sessions');

const MSG_CANCEL = 'Type /cancel to cancel feedback.';

function start(chatId, bot) {
    function authCallback(row) {
        if (!row) {
            bot.sendMessage(chatId, 'Sorry you\'re not registered. Type /register to register.');
            // } else if (!row.isCinnamonResident) {
            //     bot.sendMessage(chatId, 'Sorry you must be a Cinnamon resident to use this feature :(');
        } else {
            var diningSession = sessions.createDiningSession(chatId);
            choose_option(chatId, bot);
        }
    }
    auth.isCinnamonResident(chatId, authCallback);
}

function choose_option(chatId, bot) {
    var opts = {
        reply_markup: JSON.stringify({
            keyboard: [
                ['Rate Food', 'View Ratings'],
                ['Give Feedback']
            ],
            one_time_keyboard: true
        })
    };
    msg = 'What would you like to do?\n' + MSG_CANCEL;
    bot.sendMessage(chatId, msg, opts);
    sessions.getDiningSession(chatId).next = dispatch_option;
}

function dispatch_option(chatId, bot, option) {
    if (option === 'Rate Food') {
        ask_when(chatId, bot);
    } else if (option === 'View Ratings') {
        view_ratings();
    } else if (option === 'Give Feedback') {
        ask_feedback(chatId, bot);
    } else {
        bot.sendMessage(chatId, 'Hey we didn\'t understand that option! Try again.\n' + MSG_CANCEL);
        choose_option(chatId, bot);
    }
}

function ask_when(chatId, bot) {
    var opts = {
        reply_markup: JSON.stringify({
            keyboard: [
                ['Breakfast', 'Dinner'],
            ],
            one_time_keyboard: true
        })
    };
    msg = 'When did you eat?\n' + MSG_CANCEL;
    bot.sendMessage(chatId, msg, opts);
    sessions.getDiningSession(chatId).next = ask_where;
}

function ask_where(chatId, bot, when) {
    var diningSession = sessions.getDiningSession(chatId);
    diningSession.diningFeedback.when = when;

    var keyboard = [];
    if (when === 'Breakfast') {
        keyboard = [
            ['Asian', 'Western'],
            ['Muslim', 'Toast'],
            ['Grab & Go']
        ];
    } else if (when === 'Dinner') {
        keyboard = [
            ['Noodle', 'Asian'],
            ['Western - Main Course', 'Western - Panini'],
            ['Indian', 'Malay', 'Late Plate']
        ];
    }
    var opts = {
        reply_markup: JSON.stringify({
            keyboard: keyboard,
            one_time_keyboard: true
        })
    };
    msg = 'Which stall?\n' + MSG_CANCEL;
    bot.sendMessage(chatId, msg, opts);
    diningSession.next = ask_how;
}

function ask_how(chatId, bot, where) {
    var diningSession = sessions.getDiningSession(chatId);
    diningSession.diningFeedback.where = where;

    var opts = {
        reply_markup: JSON.stringify({
            keyboard: [
                ['👍', '👍👍', '👍👍👍'],
                ['👍👍👍👍', '👍👍👍👍👍']
            ],
            one_time_keyboard: true
        })
    };
    msg = 'How was it?\n' + MSG_CANCEL;
    bot.sendMessage(chatId, msg, opts);
    diningSession.next = ask_feedback;
}

function ask_feedback(chatId, bot, how) {
    var diningSession = sessions.getDiningSession(chatId);
    var validOptions = ['👍', '👍👍', '👍👍👍', '👍👍👍👍', '👍👍👍👍👍'];
    if (validOptions.indexOf(how) < 0) {
        return ask_how(df.where, chatId);
    }
    diningSession.diningFeedback.how = how.length / 2;

    bot.sendMessage(chatId, 'Any additional comments?\n\nType /done to end.\n' + MSG_CANCEL);
    diningSession.next = continue_feedback;
}

function continue_feedback(chatId, bot, msg) {
    msg = (msg) ? msg : "";
    var diningSession = sessions.getDiningSession(chatId);
    diningSession.diningFeedback.feedbackMsg += msg + '\n';

    if (msg.endsWith('/done')) {
        done(chatId, bot);
    } else {
        diningSession.next = continue_feedback;
    }
}

function done(chatId, bot) {
    var diningSession = sessions.getDiningSession(chatId);
    submit(chatId, bot);
    sessions.deleteDiningSession(chatId);
}

function submit(chatId, bot) {
    var diningSession = sessions.getDiningSession(chatId);
    var df = diningSession.diningFeedback;

    logger.dining(chatId, bot);

    // TODO: Remove remote logging of dining feedback.
    var feedbackURL = 'https://docs.google.com/forms/d/17IQ-KQCiDWPlJ992yIQIFxocPbBvvqKJTXmzoxOUPJQ/formResponse?entry.1834728229=' + df.when + '&entry.385772714=' + df.how;

    if (df.when === 'Dinner') {
        feedbackURL += '&entry.1055773284=' + df.where;
    } else if (df.when === 'Breakfast') {
        feedbackURL += '&entry.1929069273=' + df.where;
    }
    rest.get(feedbackURL).on('complete', function(data) {
        // bot.sendMessage(chatId, 'Thanks!');
        // return stats(chatId, bot);
    });
}

function stats(chatId, bot, when, where, how) {
    var statsURL = 'https://script.google.com/macros/s/AKfycbw22JUY0XVktavbywTQ7z--mTe7CFbL8X-Bgb6fX-JVNcjGBbeA/exec?';
    statsURL += 'when=' + when;
    statsURL += '&where=' + where;

    function callback(data) {
        var avgRating = parseFloat(data);
        var roundedAvgRating = Math.round(avgRating * 100) / 100;
        roundedAvgRating = (isNaN(roundedAvgRating) ? how : roundedAvgRating);
        var msg = 'Avg rating for ' + where + ' stall at ' + when + ' is: ' + roundedAvgRating;
        bot.sendMessage(chatId, msg, {
            reply_markup: JSON.stringify({
                hide_keyboard: true
            })
        });
    }
    rest.get(statsURL).on('complete', callback);
}



module.exports = {
    start,
};
