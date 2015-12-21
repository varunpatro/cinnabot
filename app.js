var TelegramBot = require('node-telegram-bot-api');
var chalk = require('chalk');
var readline = require('readline');
var rest = require('restler');
var Promise = require('bluebird');
var logger = require('./logger');
var weather = require('./weather');
var travel = require('./travel');
var dining = require('./dining');
var fault = require('./fault');
var do_not_open = require('./do_not_open');
var broadcast = require('./broadcast');
var cinnamon = require('./cinnamon');
var db = require('./db');
var statistics = require('./statistics');
var auth = require('./auth');
var util = require('./util');
var CREDENTIALS = require('./private/telegram_credentials.json');
var admin = require('./frontend/admin');

var bot = new TelegramBot(CREDENTIALS.token, {
    polling: true
});

console.log(chalk.blue("============================"));
console.log(chalk.blue("                            "));
console.log(chalk.blue("      CinnaBot Started      "));
console.log(chalk.blue("                            "));
console.log(chalk.blue("============================"));
console.log(chalk.blue("                            "));

admin.startServer(bot);

console.log(chalk.green("============================"));
console.log(chalk.green("                            "));
console.log(chalk.green("     CinnaAdmin Started     "));
console.log(chalk.green("                            "));
console.log(chalk.green("============================"));
console.log(chalk.green("                            "));

var diningSessions = {};
var feedbackSessions = {};
var registerSessions = {};
var faultSessions = {};
var nusbusSessions = {};
var publicbusSessions = {};

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
        if (!msg.hasOwnProperty('text') && !msg.hasOwnProperty('location')) {
            return false;
        }
        logger.log(msg);

        if (msg.hasOwnProperty('location')) {
            return processLocation(msg);
        }

        if (msg.hasOwnProperty('reply_to_message') && [49892469, 102675141].indexOf(msg.from.id) > -1) {
            return processFeedbackReply(msg);
        }

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
            case "nusbus":
                return nusbus_ask(chatId);
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
            case "register":
                return register(chatId);
            case "agree":
                return agree(msg.from.id);
            case "fault":
                faultSessions[chatId] = faultSessions[chatId] || new FaultSession(chatId);
                return ask_fault_feedback(chatId);
            case "back":
                if (faultSessions[chatId]) {
                    return faultSessions[chatId].back(chatId, bot, faultSessions[chatId]);
                }
                return default_msg(chatId);
            case "cancel":
                return cancel(chatId);
        }

        // manage markups
        switch (body.toLowerCase()) {
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
                var nusbusSession = nusbusSessions[chatId] || new NusBusSession(chatId);
                if (nusbusSession.onGoing) {
                    return nusbus_query(chatId, body.toLowerCase(), msg.location);
                }
                var publicbusSession = publicbusSessions[chatId] || new PublicBusSession(chatId);
                if (publicbusSession.onGoing) {
                    return bus(chatId, body.toLowerCase(), msg.location);
                }
                var faultSession = faultSessions[chatId] || new FaultSession(chatId);
                if (faultSession.onGoing) {
                    return continue_fault_feedback(chatId, body);
                }
        }
        if (body.toLowerCase().indexOf("thanks") > -1) {
            return welcome_msg(chatId);
        }
        return default_msg(chatId);
    } catch (e) {
        bot.sendMessage(msg.chat.id, "Cinnabot is sleeping right now 😴 Wake him up later.").then(function() {
            bot.sendMessage(msg.chat.id, "Here's a catfact instead:").then(function() {
                catfact(msg.chat.id);
            });
        });
        bot.sendMessage('102675141', e.toString());
    }
});

function processFeedbackReply(msg) {
    var fullMsg = msg.reply_to_message.text;
    for (var useridStr = "", useridIndex = fullMsg.indexOf("User Id: ") + 9; fullMsg[useridIndex] !== "\n"; useridIndex++) {
        useridStr += fullMsg[useridIndex];
    }
    for (var timeStr = "", timeIndex = fullMsg.indexOf("Time: ") + 6; fullMsg[timeIndex] !== "\n"; timeIndex++) {
        timeStr += fullMsg[timeIndex];
    }
    var time = parseInt(timeStr);
    var replyId = parseInt(useridStr);
    var replyMsg = msg.text;
    db.getFeedbackMsg(time, callback);

    function callback(err, feedbackEntry) {
        if (err) {
            return bot.sendMessage(msg.from.id, "Something went wrong in accessing the feedback table.");
        }
        var msgToSend = "FEEDBACK REPLY\n==============\n";
        msgToSend += "We refer to the your message:\n";
        msgToSend += "\"_" + feedbackEntry.msg.trim() + "_\"\n\n";
        msgToSend += replyMsg;
        bot.sendMessage(replyId, msgToSend, {
            parse_mode: "Markdown"
        });
    }
}

function processLocation(msg) {
    var chatId = msg.chat.id;
    var nusbusSession = nusbusSessions[chatId] || new NusBusSession(chatId);
    if (nusbusSession.onGoing) {
        return nusbus_query(chatId, msg.text, msg.location);
    }
    var publicbusSession = publicbusSessions[chatId] || new PublicBusSession(chatId);
    if (publicbusSession.onGoing) {
        return bus(chatId, msg.text, msg.location);
    }
    return default_msg(chatId);
}

function cancel(chatId) {
    diningSessions[chatId] = new DiningSession(chatId);
    feedbackSessions[chatId] = new FeedbackSession(chatId);
    registerSessions[chatId] = new RegisterSession(chatId);
    nusbusSessions[chatId] = new NusBusSession(chatId);
    publicbusSessions[chatId] = new PublicBusSession(chatId);
    faultSessions[chatId] = new FaultSession(chatId);
    bot.sendMessage(chatId, "Your command has been *canceled*", {
        parse_mode: "Markdown",
        reply_markup: JSON.stringify({
            hide_keyboard: true
        })
    });
}

function help(chatId) {
    var helpMessage =
        "Here's what you can ask Cinnabot!\n\n" +
        "/bus                      - check bus timings for UTown and Dover road\n" +
        "/bus <busstop>   - check bus timings for <busstop>\n" +
        "/dining                  - tell us how the food was\n" +
        "/events                 - view upcoming USP events\n" +
        "/fault                     - report building faults in Cinnamon\n" +
        "/feedback             - send suggestions and complaints\n" +
        "/links                     - view useful links\n" +
        "/nusbus                - check bus timings for NUS buses\n" +
        "/psi                       - get the psi and weather conditions\n" +
        "/register               - register your NUS account!\n" +
        "/spaces                - view upcoming activities in USP spaces\n" +
        "/stats                    - view key statistics";
    bot.sendMessage(chatId, helpMessage);
}

function register(chatId) {
    registerSessions[chatId] = new RegisterSession();
    registerSessions[chatId].hasPrompt = true;
    return auth.register(bot, chatId);
}

function agree(userId) {
    var registerSession = registerSessions[userId];
    if (!registerSession || !registerSession.hasPrompt) {
        return default_msg(userId);
    }
    registerSessions[userId] = new RegisterSession();
    return auth.agree(bot, userId);
}

function links(chatId) {
    var linkText =
        "USEFUL LINKS:\n" +
        "==============\n\n";

    function callback(row) {
        if (!row) {
            return bot.sendMessage(chatId, "Sorry you're not registered. Type /register to register.");
        } else {
            if (!row.isCinnamonResident) {
                linkText +=
                    "Check your NUS library account:\n" +
                    "https://linc.nus.edu.sg/patroninfo/\n\n";
            }
            if (row.isCinnamonResident) {
                linkText +=
                    "Check the USP reading room catalogue:\n" +
                    "https://myaces.nus.edu.sg/libms_isis/login.jsp\n\n" +
                    "Check your meal credits:\n" +
                    "https://bit.ly/hungrycinnamon\n\n" +
                    "Report faults in Cinnamon:\n" +
                    "https://bit.ly/faultycinnamon\n\n" +
                    "Check your air-con credits:\n" +
                    "https://bit.ly/chillycinnamon";
            }
        }
        bot.sendMessage(chatId, linkText, {
            disable_web_page_preview: true
        });
    }
    auth.isCinnamonResident(chatId, callback);
}

function stats(chatId) {
    function callback(data) {
        bot.sendMessage(chatId, data, {
            parse_mode: "Markdown"
        });
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

function nusbus_ask(chatId) {
    var opts = {
        reply_markup: JSON.stringify({
            keyboard: [
                ['Nearest Bus Stop'],
                ['UTown', 'Computing'],
                ['Central Library', 'Computer Centre'],
                ['Science', 'Business'],
                ['Kent Ridge MRT', 'Bukit Timah Campus']
            ],
            one_time_keyboard: true
        })
    };
    var greeting = "Good " + util.currentTimeGreeting() + ", where would you like NUS bus timings for?";
    bot.sendMessage(chatId, greeting, opts);
    nusbusSessions[chatId] = new NusBusSession(chatId);
    nusbusSessions[chatId].onGoing = true;
}

function nusbus_query(chatId, busstop_name, location) {
    var locResponse = "Please send me your location to find NUS bus timings for the nearest bus stop:\n\n";
    locResponse += "You can do this by selecting the paperclip icon (📎) ";
    locResponse += "followed by attaching your location (📌).";

    if (busstop_name === "nearest bus stop") {
        return bot.sendMessage(chatId, locResponse, {
            reply_markup: JSON.stringify({
                hide_keyboard: true
            })
        });
    }

    function callback(err, data) {
        if (err) {
            return bot.sendMessage(chatId, err, {
                parse_mode: "Markdown",
                reply_markup: JSON.stringify({
                    hide_keyboard: true
                })
            });
        }
        bot.sendMessage(chatId, data, {
            parse_mode: "Markdown",
            reply_markup: JSON.stringify({
                hide_keyboard: true
            })
        });
        nusbusSessions[chatId] = new NusBusSession(chatId);
    }
    travel.nusbus(callback, busstop_name, location);
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
    function callback(row) {
        if (!row) {
            bot.sendMessage(chatId, "Sorry you're not registered. Type /register to register.");
        } else if (!row.isCinnamonResident) {
            bot.sendMessage(chatId, "Sorry you must be a cinnamon resident to use this feature :(");
        } else {
            cinnamon.getAllSpaces(chatId, bot);
        }
    }
    auth.isCinnamonResident(chatId, callback);
}

function ask_dining_feedback(chatId) {
    function callback(row) {
        if (!row) {
            bot.sendMessage(chatId, "Sorry you're not registered. Type /register to register.");
        } else if (!row.isCinnamonResident) {
            bot.sendMessage(chatId, "Sorry you must be a cinnamon resident to use this feature :(");
        } else {
            var diningSession = diningSessions[chatId];
            diningSession.inThread.status = true;
            dining.ask_when_dining_feedback(chatId, bot);
            diningSession.inThread.next = ask_where_dining_feedback;
        }
    }
    auth.isCinnamonResident(chatId, callback);
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

function RegisterSession(chatId) {
    this.chatId = chatId;
    this.hasPrompt = false;
    registerSessions[chatId] = this;
}

function NusBusSession(chatId) {
    this.chatId = chatId;
    this.onGoing = false;
    nusbusSessions[chatId] = this;
}

function PublicBusSession(chatId) {
    this.chatId = chatId;
    this.onGoing = false;
    publicbusSessions[chatId] = this;
}

function ask_fault_feedback(chatId) {
    function callback(row) {
        if (!row) {
            bot.sendMessage(chatId, "Sorry you're not registered. Type /register to register.");
        } else if (!row.isCinnamonResident) {
            bot.sendMessage(chatId, "Sorry you must be a cinnamon resident to use this feature :(");
        } else {
            var faultSession = faultSessions[chatId];
            faultSession.onGoing = true;
            fault.ask_category(chatId, bot, faultSession);
        }
    }
    auth.isCinnamonResident(chatId, callback);
}

function continue_fault_feedback(chatId, body) {
    var faultSession = faultSessions[chatId];
    if (faultSession.key === "phone") {
        if ((body.length !== 8) || isNaN(parseInt(body))) {
            return bot.sendMessage(chatId, "Phone number must be 8 numerical digits.").then(function() {
                fault.ask_phone(chatId, bot, faultSession);
            });
        }
    }
    if (faultSession.key === "description") {
        if (body.endsWith("/done")) {
            faultSession.faultFeedback[faultSession.key] += body.substring(0, body.length - 6);
            if (faultSession.faultFeedback.description.length < 24) {
                return bot.sendMessage(chatId, "Description should be at least 23 characters.").then(function() {
                    fault.ask_continue_description(chatId, bot, faultSession);
                });
            }
            return done_fault(chatId);
        }
        faultSession.faultFeedback[faultSession.key] += body;
    }
    faultSession.faultFeedback[faultSession.key] = body;
    return faultSession.next(chatId, bot, faultSession);
}

function done_fault(chatId) {
    var faultSession = faultSessions[chatId];
    bot.sendMessage(chatId, JSON.stringify(faultSession.faultFeedback));
    fault.submit(chatId, bot, faultSession.faultFeedback);
}

function FaultSession(chatId) {
    this.chatId = chatId;
    this.onGoing = false;
    this.key = "category";
    this.next = ask_fault_feedback;
    this.faultFeedback = new FaultFeedback();
    faultSessions[chatId] = this;
}

function FaultFeedback() {
    this.category = "New";
    this.urgency = "Urgent";
    this.location = "";
    this.name = "";
    this.room = "";
    this.matric = "";
    this.email = "";
    this.phone = "";
    this.description = "";
}

function psi(chatId) {
    function callback(msg) {
        bot.sendMessage(chatId, msg, {
            parse_mode: "Markdown"
        });
    }
    weather.getWeather(callback);
}

function bus(chatId, busstop, location) {
    var locResponse = "Please send me your location to find public bus timings for the nearest bus stop:\n\n";
    locResponse += "You can do this by selecting the paperclip icon (📎) ";
    locResponse += "followed by attaching your location (📌).";

    if (busstop === "nearest bus stop") {
        return bot.sendMessage(chatId, locResponse, {
            parse_mode: "Markdown",
            reply_markup: JSON.stringify({
                hide_keyboard: true,
            })
        });
    }

    function basicCallback(data) {
        bot.sendMessage(chatId, data, {
            parse_mode: "Markdown",
            disable_web_page_preview: true,
            reply_markup: JSON.stringify({
                hide_keyboard: true
            })
        });
        publicbusSessions[chatId] = new PublicBusSession(chatId);
    }

    function callback(data) {
        var opts = {
            reply_markup: JSON.stringify({
                keyboard: [
                    ['Nearest Bus Stop'],
                    ['Towards Buona Vista'],
                    ['Towards Clementi'],
                ],
                one_time_keyboard: true
            })
        };
        bot.sendMessage(chatId, data, opts);
        publicbusSessions[chatId] = new PublicBusSession(chatId);
        publicbusSessions[chatId].onGoing = true;
    }

    if (busstop || location) {
        return travel.busStopQuery(busstop, basicCallback, location);
    }
    var greeting = "Good " + util.currentTimeGreeting() + ". Where do you want to go today?";
    callback(greeting);
}

function welcome_msg(chatId) {
    bot.sendMessage(chatId, "You're welcome 😚", {
        reply_markup: JSON.stringify({
            hide_keyboard: true
        })
    });
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
