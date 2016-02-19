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
        parse_mode : 'Markdown',
        reply_markup: JSON.stringify({
            keyboard: [
                ['Rate Food', 'View Ratings'],
                ['Give Feedback']
            ],
            one_time_keyboard: true
        })
    };
    var msg = '*Cinnabot Dining Service\n\n*';
    msg += 'What would you like to do?\n' + MSG_CANCEL;
    bot.sendMessage(chatId, msg, opts);
    sessions.getDiningSession(chatId).next = dispatch_option;
}

function dispatch_option(chatId, bot, option) {
    if (option === 'Rate Food') {
        ask_when(chatId, bot);
    } else if (option === 'View Ratings') {
        view_ratings();
    } else if (option === 'Give Feedback') {
        ask_feedback(chatId, bot, null, true);
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
    var msg = 'When did you eat?\n' + MSG_CANCEL;
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
    var msg = 'Which stall?\n' + MSG_CANCEL;
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
    var msg = 'How was it?\n' + MSG_CANCEL;
    bot.sendMessage(chatId, msg, opts);
    diningSession.next = ask_feedback;
}

function ask_feedback(chatId, bot, how, onlyFeedback) {
    var diningSession = sessions.getDiningSession(chatId);
    var validOptions = ['👍', '👍👍', '👍👍👍', '👍👍👍👍', '👍👍👍👍👍'];
    if (onlyFeedback || validOptions.indexOf(how) < 0) {
        return ask_how(chatId, bot, diningSession.diningFeedback.where);
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

function viewRatings(chatId, bot) {
    var ratings = "";
    var breakfastStr = "";
    var dinnerStr = "";
    var message = "";

    var breakfastRatings = {
        'Asian': ' N.A\n',
        'Western': ' N.A\n',
        'Muslim': ' N.A\n',
        'Toast': ' N.A\n',
        'Grab & Go': ' N.A\n'
    };

    var dinnerRatings = {
        'Noodle': ' N.A\n',
        'Asian': ' N.A\n',
        'Western - Main Course': ' N.A\n',
        'Western - Panini': ' N.A\n',
        'Indian': ' N.A\n',
        'Malay': ' N.A\n',
        'Late Plate': ' N.A\n'
    };

    BPromise.promisify(db.getBreakfastRatings)().then(function(rows) {
        rows.forEach(function(row) {
            var entryStr;
            for (var key in breakfastRatings) {
                if (key === row.stall) {
                    if (row.stallCount > 1) {
                        entryStr = "entries";
                    } else {
                        entryStr = "entry";
                    }
                    breakfastRatings[key] = ' ' + parseFloat(Math.round(row.average * 100) / 100).toFixed(2) + ' (_out of ' + row.stallCount + ' ' + entryStr + '_)\n';
                }
            }
        });
    }).then(function() {
        BPromise.promisify(db.getDinnerRatings)().then(function(rows) {
            rows.forEach(function(row) {
                for (var item in dinnerRatings) {
                    if (item === row.stall) {
                        if (row.stallCount > 1) {
                            entryStr = "entries";
                        } else {
                            entryStr = "entry";
                        }
                        dinnerRatings[item] = ' ' + parseFloat(Math.round(row.average * 100) / 100).toFixed(2) + ' (_out of ' + row.stallCount + ' ' + entryStr + '_)\n';
                    }
                }

            });
        }).then(function() {
            var today = new Date();
            header = '*Food Rating for ' + util.formatDate(today) + '*\n\n';
            var bfastHeader = '_Breakfast (7.00am - 10.30am)_\n\n';
            var dinnerHeader = '_Dinner (5.30pm - 9.30pm)_\n\n';

            for (var key in breakfastRatings) {
                breakfastStr += key + ':' + breakfastRatings[key];
            }

            for (var item in dinnerRatings) {
                dinnerStr += item + ':' + dinnerRatings[item];
            }

            if ((today.getHours() > 7) && (today.getHours() < 17)) {
                ratings = bfastHeader + breakfastStr;
            } else if ((today.getHours() > 17) && (today.getHours() < 23)) {
                ratings = dinnerHeader + dinnerStr;
            }   else  {
                ratings = 'It is not a valid meal time 😔';
            }

            message = header + ratings;

            bot.sendMessage(chatId, message, {
                parse_mode: 'Markdown',
                reply_markup: JSON.stringify({
                    hide_keyboard: true
                })
            });
        });
    });
}
module.exports = {
    start
};
