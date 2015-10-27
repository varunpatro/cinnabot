var jf = require('jsonfile');
var TelegramBot = require('node-telegram-bot-api');
var chalk = require('chalk');
var readline = require('readline');
var rest = require('restler');
var credentialsFilePath = './private/telegram_credentials.json';
var logger = require('./logger');
var weather = require('./weather');
var travel = require('./travel');
var dining = require('./dining');
var do_not_open = require('./do_not_open');
var broadcast = require('./broadcast');
var cinnamon = require('./cinnamon');

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

// start CLI app
var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
});

rl.on('line', function(line) {
    parseCommand(line);
});

function parseCommand(command) {
    chatIds = [49892469, 102675141];
    switch (command) {
        case 'bcast':
            return broadcast.broadcast_input(chatIds, bot);
        case 'exit':
            return process.exit();
    }
}

// Any kind of message
bot.on('message', function(msg) {
    console.log(msg);
    if (!msg.hasOwnProperty('text')) {
        return false;
    }
    cinnalog(msg);
    logger.log(msg);
    var chatId = msg.chat.id;
    var body = msg.text;
    var command = body;
    var args = body;
    if (body.charAt(0) === '/') {
        command = body.split(' ')[0].substr(1);
        args = body.split(' ')[1];
    }
    // manage commands
    switch (command) {
        case "start":
            return help(chatId);
        case "help":
            return help(chatId);
        case "psi":
            return psi(chatId);
        case "bus":
            var busstop = args;
            return bus(chatId, busstop);
        case "dining":
            session = sessions[chatId] || new Session(chatId);
            return ask_dining_feedback(chatId);
        case "spaces":
            return spaces(chatId);
        case "cat":
            return catfact(chatId);
        case "cancel":
            return cancel(chatId);
    }

    // manage markups
    switch (body) {
        case 'Show me UTown Buses':
            return nusbus(chatId);
        case 'Towards Buona Vista':
            return bus(chatId, 19051);
        case 'Towards Clementi':
            return bus(chatId, 19059);
        default:
            session = sessions[chatId] || new Session(chatId);
            if (session.inThread.status) {
                return session.inThread.next(body, chatId);
            }
            return default_msg(chatId);
    }
});

function cancel(chatId) {
    session = new Session(chatId);
    bot.sendMessage(chatId, "Canceled.", {
        reply_markup: JSON.stringify({
            hide_keyboard: true
        })
    });
}

function help(chatId) {
    var helpMessage =
        "Here's what you can ask Cinnabot!\n\n" +
        "/psi - get the psi and weather conditions\n" +
        "/bus - check bus timings for UTown and Dover road\n" +
        "/bus <busstop> - check bus timings for <busstop>\n" +
        "/dining - tell us how the food was\n" +
        "/spaces - view upcoming events in USP spaces";
    bot.sendMessage(chatId, helpMessage);
}

function nusbus(chatId) {
    function callback(data) {
        bot.sendMessage(chatId, data, {
            reply_markup: JSON.stringify({
                hide_keyboard: true
            })
        });
    }
    travel.utownBUS(callback);
}

function catfact(chatId) {
    return do_not_open.catfact(chatId, bot);
}

function cnjoke(chatId) {
    return do_not_open.cnjoke(chatId, bot);
}

function spaces(chatId) {
    cinnamon.getSpaces(chatId, bot, 1);
    cinnamon.getSpaces(chatId, bot, 2);
    cinnamon.getSpaces(chatId, bot, 3);
}

function ask_dining_feedback(chatId) {
    session.inThread.status = true;
    dining.ask_when_dining_feedback(chatId, bot);
    session.inThread.next = ask_where_dining_feedback;
}

function ask_where_dining_feedback(when, chatId) {
    var validOptions = ["Breakfast", "Dinner"];
    if (validOptions.indexOf(when) < 0) {
        return ask_dining_feedback(chatId);
    }
    session.diningFeedback.when = when;
    dining.ask_where_dining_feedback(chatId, bot, when);
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
    dining.ask_how_dining_feedback(chatId, bot);
    session.inThread.next = done_dining_feedback;
}

function done_dining_feedback(how, chatId) {
    var df = session.diningFeedback;
    var validOptions = ['👍', '👍👍', '👍👍👍', '👍👍👍👍', '👍👍👍👍👍'];
    if (validOptions.indexOf(how) < 0) {
        return ask_how_dining_feedback(df.where, chatId);
    }
    df.how = how.length / 2;
    dining.dining_feedback(chatId, bot, df.when, df.where, df.how);
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

function bus(chatId, busstop) {
    function basicCallback(data) {
        bot.sendMessage(chatId, data, {
            reply_markup: JSON.stringify({
                hide_keyboard: true
            })
        });
    }

    function callback(data) {
        var opts = {
            reply_markup: JSON.stringify({
                keyboard: [
                    ['Show me UTown Buses'],
                    ['Towards Buona Vista'],
                    ['Towards Clementi'],
                ],
                one_time_keyboard: true
            })
        };
        bot.sendMessage(chatId, data, opts);
    }

    if (busstop) {
        return travel.busStopQuery(busstop, basicCallback);
    }
    callback("Where do you want to go?");
}

function default_msg(chatId) {
    bot.sendMessage(chatId, "Hey we didn't understand you! Here's a chuck norris fact instead:\n", {
        reply_markup: JSON.stringify({
            hide_keyboard: true
        })
    }).then(function() {
        return cnjoke(chatId);
    });
}

function cinnalog(msg) {
    var logURL = "https://docs.google.com/forms/d/1Xpeeh72BKwjyIqeetVdt8Vra7JLZJFKgjXLt_AcJu8w/formResponse?entry.1944201912=" + msg.from.username + "&entry.1892303243=" + msg.from.id + "&entry.735577696=" + msg.text + "&entry.1541043242=" + msg.from.first_name + "&entry.439602784=" + msg.from.last_name;
    return rest.get(logURL).on('complete', function(data) {});
}