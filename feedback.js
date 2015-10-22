var rest = require('restler');

function dining_stats(chatId, bot, when, where) {
    var statsURL = 'https://script.google.com/macros/s/AKfycbw22JUY0XVktavbywTQ7z--mTe7CFbL8X-Bgb6fX-JVNcjGBbeA/exec?';
    statsURL += 'when=' + when;
    statsURL += '&where=' + where;

    function callback(data) {
        var avgRating = parseFloat(data);
        var roundedAvgRating = Math.round(avgRating * 100) / 100;
        var msg = "Avg rating for " + where + " stall at " + when + " is: " + roundedAvgRating;
        bot.sendMessage(chatId, msg, {
            reply_markup: JSON.stringify({
                hide_keyboard: true
            })
        });
    }
    rest.get(statsURL).on('complete', callback);
}

function dining_feedback(chatId, bot, when, where, how) {
    var feedbackURL = "https://docs.google.com/forms/d/17IQ-KQCiDWPlJ992yIQIFxocPbBvvqKJTXmzoxOUPJQ/formResponse?entry.1834728229=" + when + "&entry.385772714=" + how;

    if (when === "Dinner") {
        feedbackURL += "&entry.1055773284=" + where;
    } else if (when === "Breakfast") {
        feedbackURL += "&entry.1929069273=" + where;
    }

    rest.get(feedbackURL).on('complete', function(data) {
        bot.sendMessage(chatId, "Thanks!");
        return dining_stats(chatId, bot, when, where);
    });
}

function ask_when_dining_feedback(chatId, bot) {
    var opts = {
        reply_markup: JSON.stringify({
            keyboard: [
                ['Breakfast', 'Dinner'],
            ],
            one_time_keyboard: true
        })
    };
    bot.sendMessage(chatId, "When did you eat?", opts);
}

function ask_where_dining_feedback(chatId, bot, when) {
    var keyboard = [];
    if (when === "Breakfast") {
        keyboard = [
            ['Asian', 'Western'],
            ['Muslim', 'Toast'],
            ['Other']
        ];
    } else if (when === "Dinner") {
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
    bot.sendMessage(chatId, "Where did you eat?", opts);
}

function ask_how_dining_feedback(chatId, bot) {
    var opts = {
        reply_markup: JSON.stringify({
            keyboard: [
                ['👍', '👍👍', '👍👍👍'],
                ['👍👍👍👍', '👍👍👍👍👍']
            ],
            one_time_keyboard: true
        })
    };
    bot.sendMessage(chatId, "How was it?", opts);
}

module.exports = {
    "dining_feedback": dining_feedback,
    "dining_stats": dining_stats,
    "ask_where_dining_feedback": ask_where_dining_feedback,
    "ask_when_dining_feedback": ask_when_dining_feedback,
    "ask_how_dining_feedback": ask_how_dining_feedback
};
