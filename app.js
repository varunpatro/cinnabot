var jf = require('jsonfile');
var TelegramBot = require('node-telegram-bot-api');
var chalk = require('chalk');
var credentialsFilePath = './private/telegram_credentials.json';
var logger = require('./logger');
var weather = require('./weather');
var traffic = require('./traffic');
var feedback = require('./feedback');

var CREDENTIALS = jf.readFileSync(credentialsFilePath);
var bot = new TelegramBot(CREDENTIALS.token, {
    polling: true
});

console.log(chalk.blue("============================"));
console.log(chalk.blue("                            "));
console.log(chalk.blue("      CinnaBot Started      "));
console.log(chalk.blue("                            "));
console.log(chalk.blue("============================"));
console.log(chalk.blue("                            "));

var sessions = {};
var session;

// Any kind of message
bot.on('message', function(msg) {
    console.log(msg);
    var chatId = msg.chat.id;
    var msgId = msg.message_id;
    var body = msg.text;
    var command = body;
    var args = body;
    if (body.charAt(0) === '/') {
        command = body.split(' ')[0].substr(1);
        args = body.split(' ')[1];
    }
    // manage commands
    switch (command) {
        case "psi":
            return psi(chatId);
        case "bus":
            var busstop = args;
            return bus(msgId, chatId, busstop);
        case "feedback":
            session = sessions[chatId] || new Session(chatId);
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
            session = sessions[chatId] || new Session(chatId);
            if (session.inThread.status) {
                return session.inThread.next(body, chatId);
            }
            return default_msg(chatId);
    }
});

function cancel(chatId) {
    inThread.status = false;
    bot.sendMessage(chatId, "Canceled.");
}

function ask_dining_feedback(chatId) {
    session.inThread.status = true;
    feedback.ask_when_dining_feedback(chatId, bot);
    session.inThread.next = ask_where_dining_feedback;
}

function ask_where_dining_feedback(when, chatId) {
    var validOptions = ["Breakfast", "Dinner"];
    if (validOptions.indexOf(when) < 0) {
        return ask_dining_feedback(chatId);
    }
    session.diningFeedback.when = when;
    feedback.ask_where_dining_feedback(chatId, bot, when);
    session.inThread.next = ask_how_dining_feedback;
}

function ask_how_dining_feedback(where, chatId) {
    var df = session.diningFeedback;
    var validOptions = [];
    if (df.when === "Breakfast") {
        validOptions = ['Asian', 'Western', 'Muslim', 'Toast', 'Other'];
    } else if (df.when === "Dinner") {
        validOptions = ['Noodle', 'Asian', 'Western - Main Course', 'Western - Panini', 'Indian', 'Malay', 'Late Plate'];
    }
    if (validOptions.indexOf(where) < 0) {
        return ask_where_dining_feedback(df.when, chatId);
    }
    df.where = where;
    feedback.ask_how_dining_feedback(chatId, bot);
    session.inThread.next = done_dining_feedback;
}

function done_dining_feedback(how, chatId) {
    var df = session.diningFeedback;
    var validOptions = ['👍', '👍👍', '👍👍👍', '👍👍👍👍', '👍👍👍👍👍'];
    if (validOptions.indexOf(how) < 0) {
        return ask_how_dining_feedback(df.where, chatId);
    }
    df.how = how.length / 2;
    feedback.dining_feedback(df.when, df.where, df.how);
    bot.sendMessage(chatId, "Thanks!");
    session = new Session(chatId);
}

function Session(chatId) {
    this.chatId = chatId;
    this.inThread = {
        "status": false,
        "next": ask_where_dining_feedback
    };
    this.diningFeedback = new DiningFeedback();
    sessions[chatId] = this;
}

function DiningFeedback() {
    this.when = "";
    this.where = "";
    this.how = -1;
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
