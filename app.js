var TelegramBot = require('node-telegram-bot-api');
var chalk = require('chalk');
var readline = require('readline');
var rest = require('restler');
var Promise = require('bluebird');
var logger = require('./logger');
var weather = require('./weather');
var travel = require('./travel');
var dining = require('./dining');
var do_not_open = require('./do_not_open');
var broadcast = require('./broadcast');
var cinnamon = require('./cinnamon');
var db = require('./db');
var statistics = require('./statistics');
var util = require('./util');
var CREDENTIALS = require('./private/telegram_credentials.json');

var bot = new TelegramBot(CREDENTIALS.token, {
    polling: true
});

console.log(chalk.blue("============================"));
console.log(chalk.blue("                            "));
console.log(chalk.blue("      CinnaBot Started      "));
console.log(chalk.blue("                            "));
console.log(chalk.blue("============================"));
console.log(chalk.blue("                            "));

var diningSessions = {};
var feedbackSessions = {};

// start CLI app
var rl = readline.createInterface(process.stdin, process.stdout);
rl.prompt();
rl.on('line', function(line) {
    switch (line.trim()) {
        case 'bcast':
            broadcast.broadcast(bot);
            break;
        case 'exit':
            return process.exit(0);
        case 'hello':
            console.log('world!');
            break;
        default:
            console.log("Didn't catch that!");
            break;
    }
    rl.prompt();
});

// Any kind of message
bot.on('message', function(msg) {
    try {
        console.log(msg);
        if (!msg.hasOwnProperty('text')) {
            return false;
        }
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
        switch (command.toLowerCase()) {
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
                diningSessions[chatId] = diningSessions[chatId] || new DiningSession(chatId);
                return ask_dining_feedback(chatId);
            case "spaces":
                return spaces(chatId);
            case "events":
                return events(chatId);
            case "cat":
                return catfact(chatId);
            case "feedback":
                return feedback(chatId);
            case "stats":
                return stats(chatId);
            case "links":
                return links(chatId);
            case "cancel":
                return cancel(chatId);
        }

        // manage markups
        switch (body.toLowerCase()) {
            case 'show me utown buses':
                return nusbus(chatId);
            case 'towards buona vista':
                return bus(chatId, 19051);
            case 'towards clementi':
                return bus(chatId, 19059);
            default:
                var diningSession = diningSessions[chatId] || new DiningSession(chatId);
                if (diningSession.inThread.status) {
                    return diningSession.inThread.next(body, chatId);
                }
                var feedbackSession = feedbackSessions[chatId] || new FeedbackSession(chatId);
                if (feedbackSession.onGoing) {
                    return continue_feedback(body, chatId, msg);
                }
                return default_msg(chatId);
        }
    } catch (e) {
        bot.sendMessage(msg.chat.id, "Cinnabot is sleeping right now 😴 Wake him up later.").then(function() {
            bot.sendMessage(msg.chat.id, "Here's a catfact instead:").then(function() {
                catfact(msg.chat.id);
            });
        });
        bot.sendMessage('102675141', e.toString());
    }
});

function cancel(chatId) {
    diningSessions[chatId] = new DiningSession(chatId);
    feedbackSessions[chatId] = new FeedbackSession(chatId);
    bot.sendMessage(chatId, "Canceled.", {
        reply_markup: JSON.stringify({
            hide_keyboard: true
        })
    });
}

function help(chatId) {
    var helpMessage =
        "Here's what you can ask Cinnabot!\n\n" +
        "/psi            - get the psi and weather conditions\n" +
        "/bus            - check bus timings for UTown and Dover road\n" +
        "/bus <busstop>  - check bus timings for <busstop>\n" +
        "/dining         - tell us how the food was\n" +
        "/spaces         - view upcoming activities in USP spaces\n" +
        "/events         - view upcoming USP events\n" +
        "/links          - view useful links\n" +
        "/feedback       - send suggestions and complaints\n" +
        "/stats          - view key statistics\n";
    bot.sendMessage(chatId, helpMessage);
}

function links(chatId) {
    var linkText =
        "USEFUL LINKS:\n" +
        "==============\n\n" +
        "Check your meal credits:\n" +
        "https://bit.ly/hungrycinnamon\n\n" +
        "Report faults in Cinnamon:\n" +
        "https://bit.ly/faultycinnamon\n\n" +
        "Check your air-con credits:\n" +
        "https://bit.ly/chillycinnamon";
    bot.sendMessage(chatId, linkText, {
        disable_web_page_preview: true
    });
}

function stats(chatId) {
    function callback(data) {
        bot.sendMessage(chatId, data);
    }
    statistics.getAllSummary(callback);
}

function done_feedback(chatId, msg) {
    var feedbackSession = feedbackSessions[chatId];
    var feedbackMsg = feedbackSession.feedbackMsg;
    feedbackMsg = feedbackMsg.substring(0, feedbackMsg.length - 6);
    logger.feedback(bot, feedbackMsg, msg);
    feedbackSessions[chatId] = new FeedbackSession(chatId);
    var doneMsg = "Thanks for the feedback 😁";
    return bot.sendMessage(chatId, doneMsg);
}

function continue_feedback(body, chatId, msg) {
    var feedbackSession = feedbackSessions[chatId];
    feedbackSession.feedbackMsg += body + "\n";
    if (body.endsWith("/done")) {
        return done_feedback(chatId, msg);
    }
    return;
}

function feedback(chatId) {
    var feedbackMsg = "Thanks for using Cinnabot 😁\n";
    feedbackMsg += "Feel free to tell us how cinnabot can be improved.\n";
    feedbackMsg += "Type /done to end the feedback session.\n";
    feedbackMsg += "Type /cancel to cancel feedback";
    var feedbackSession = new FeedbackSession();
    feedbackSession.onGoing = true;
    feedbackSessions[chatId] = feedbackSession;
    return bot.sendMessage(chatId, feedbackMsg);
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

function events(chatId) {
    cinnamon.getEvents(chatId, bot);
}

function spaces(chatId) {
    cinnamon.getAllSpaces(chatId, bot);
}

function ask_dining_feedback(chatId) {
    var diningSession = diningSessions[chatId];
    diningSession.inThread.status = true;
    dining.ask_when_dining_feedback(chatId, bot);
    diningSession.inThread.next = ask_where_dining_feedback;
}

function ask_where_dining_feedback(when, chatId) {
    var validOptions = ["Breakfast", "Dinner"];
    if (validOptions.indexOf(when) < 0) {
        return ask_dining_feedback(chatId);
    }
    var diningSession = diningSessions[chatId];
    diningSession.diningFeedback.when = when;
    dining.ask_where_dining_feedback(chatId, bot, when);
    diningSession.inThread.next = ask_how_dining_feedback;
}

function ask_how_dining_feedback(where, chatId) {
    var diningSession = diningSessions[chatId];
    var df = diningSession.diningFeedback;
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
    diningSession.inThread.next = done_dining_feedback;
}

function done_dining_feedback(how, chatId) {
    var diningSession = diningSessions[chatId];
    var df = diningSession.diningFeedback;
    var validOptions = ['👍', '👍👍', '👍👍👍', '👍👍👍👍', '👍👍👍👍👍'];
    if (validOptions.indexOf(how) < 0) {
        return ask_how_dining_feedback(df.where, chatId);
    }
    df.how = how.length / 2;
    dining.dining_feedback(chatId, bot, df.when, df.where, df.how);
    diningSessions[chatId] = new DiningSession(chatId);
}

function DiningSession(chatId) {
    this.chatId = chatId;
    this.inThread = {
        "status": false,
        "next": ask_where_dining_feedback
    };
    this.diningFeedback = new DiningFeedback();
    diningSessions[chatId] = this;
}

function DiningFeedback() {
    this.when = "";
    this.where = "";
    this.how = -1;
}

function FeedbackSession(chatId) {
    this.chatId = chatId;
    this.onGoing = false;
    this.feedbackMsg = "";
    feedbackSessions[chatId] = this;
}

function psi(chatId) {
    function callback(msg) {
        bot.sendMessage(chatId, msg);
    }
    weather.getWeather(callback);
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
    var greeting = "Good " + util.currentTimeGreeting() + ". Where do you want to go today?";
    callback(greeting);
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
