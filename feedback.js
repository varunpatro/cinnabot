var rest = require('restler');

function dining_feedback(eatingPeriod, stall, rating) {
    var feedbackURL = "https://docs.google.com/forms/d/17IQ-KQCiDWPlJ992yIQIFxocPbBvvqKJTXmzoxOUPJQ/formResponse?entry.1834728229=" + eatingPeriod + "&entry.385772714=" + rating;

    if (eatingPeriod === "Dinner") {
        feedbackURL += "&entry.1055773284=" + stall;
    } else if (eatingPeriod === "Breakfast") {
        feedbackURL += "&entry.1929069273=" + stall;
    }

    rest.get(feedbackURL).on('complete', function(data) {
    });
    console.log(feedbackURL);
    return "Feedback collected."
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
    if (when === "Breakfast") {
        var keyboard = [
            ['Asian', 'Western'],
            ['Muslim', 'Toast'],
            ['Other']
        ];
    } else if (when === "Dinner") {
    	keyboard = [
            ['Noodle', 'Asian'],
            ['Western - Main Course'],
            ['Western - Panini'],
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
            keyboard: [['👍', '👍👍', '👍👍👍'], ['👍👍👍👍', '👍👍👍👍👍']],
            one_time_keyboard: true
        })
    };
    bot.sendMessage(chatId, "How was it?", opts);
}

module.exports = {
	"dining_feedback": dining_feedback,
	"ask_where_dining_feedback": ask_where_dining_feedback,
    "ask_when_dining_feedback": ask_when_dining_feedback,
    "ask_how_dining_feedback": ask_how_dining_feedback
};