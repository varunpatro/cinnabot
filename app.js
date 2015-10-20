var jf = require('jsonfile');
var TelegramBot = require('node-telegram-bot-api');
var chalk = require('chalk')
var credentialsFilePath = './private/telegram_credentials.json';
var logger = require('./logger')
var weather = require('./weather')
var traffic = require('./traffic')
var feedback = require('./feedback')

var CREDENTIALS = jf.readFileSync(credentialsFilePath);
var bot = new TelegramBot(CREDENTIALS.token, {
    polling: true
});

console.log(chalk.blue("============================"))
console.log(chalk.blue("                            "))
console.log(chalk.blue("      CinnaBot Started      "))
console.log(chalk.blue("                            "))
console.log(chalk.blue("============================"))
console.log(chalk.blue("                            "))

// Persistent data
var inThread = {
    "status": false,
    "next": ask_where_dining_feedback
};

var DiningFeedback = {};

// Any kind of message
bot.on('message', function(msg) {
    console.log(msg);
    var chatId = msg.chat.id;
    var msgId = msg.message_id;
    var body = msg.text;
    if (body.charAt(0) === '/') {
        var command = body.split(' ')[0].substr(1);
        var args = body.split(' ')[1];
    }
    // manage commands
    switch (command) {
        case "psi":
            return psi(chatId);
        case "bus":
            var busstop = args;
            return bus(msgId, chatId, busstop);
        case "feedback":
            return ask_dining_feedback(chatId);
        case "cancel":
            return cancel(chatId);
    }

    // manage markups
    switch (body) {
        case 'I wanna go Buona Vista':
            return bus(msgId, chatId, 19051);
        case 'I wanna go Clementi':
            return bus(msgId, chatId, 19059);
        default:
            if (inThread.status) {
                return inThread.next(body, chatId);
            }
            return default_msg(chatId);
    }
});

function cancel(chatId) {
    inThread.status = false;
    bot.sendMessage(chatId, "Canceled.");
}

function ask_dining_feedback(chatId) {
    inThread.status = true;
    feedback.ask_when_dining_feedback(chatId, bot);
    inThread.next = ask_where_dining_feedback;
}

function ask_where_dining_feedback(body, chatId) {
    var validOptions = ["Breakfast", "Dinner"];
    if (validOptions.indexOf(body) < 0) {
        return ask_dining_feedback(chatId);
    }
    DiningFeedback.when = body;
    feedback.ask_where_dining_feedback(chatId, bot, body);
    inThread.next = ask_how_dining_feedback;
}

function ask_how_dining_feedback(body, chatId) {
    if (DiningFeedback.when === "Breakfast") {
        var validOptions = ['Asian', 'Western', 'Muslim', 'Toast', 'Other'];
    } else if (DiningFeedback.when === "Dinner") {
        var validOptions = ['Noodle', 'Asian', 'Western - Main Course', 'Western - Panini', 'Indian', 'Malay', 'Late Plate'];
    }
    if (validOptions.indexOf(body) < 0) {
        return ask_dining_feedback(chatId);
    }
    DiningFeedback.where = body;
    feedback.ask_how_dining_feedback(chatId, bot);
    inThread.next = done_dining_feedback;
}

function done_dining_feedback(body, chatId) {
    var validOptions = ['👍', '👍👍', '👍👍👍', '👍👍👍👍', '👍👍👍👍👍'];
    if (validOptions.indexOf(body) < 0) {
        return ask_dining_feedback(chatId);
    }
    DiningFeedback.how = body.length / 2;
    inThread.status = false;
    feedback.dining_feedback(DiningFeedback.when, DiningFeedback.where, DiningFeedback.how)
    bot.sendMessage(chatId, "Thanks!");
}

function psi(chatId) {
    bot.sendMessage(chatId, weather.getWeather());
}

function bus(msgId, chatId, busstop) {
    function basicCallback(data) {
        bot.sendMessage(chatId, data);
    }
    function callback(data) {
        var opts = {
            reply_markup: JSON.stringify({
                keyboard: [
                    ['I wanna go Buona Vista'],
                    ['I wanna go Clementi'],
                ],
                one_time_keyboard: true
            })
        };
        bot.sendMessage(chatId, data, opts);
    }

    if (busstop) {
        return traffic.busStopQuery(busstop, basicCallback);
    }
    callback("Choose Direction:");
}

function default_msg(chatId) {
    bot.sendMessage(chatId, "Unknown Command.");
}