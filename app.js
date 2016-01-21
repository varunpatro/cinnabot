var TelegramBot = require('node-telegram-bot-api');
var chalk = require('chalk');
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
var admins = require('./private/config.json').admins;
var admin = require('./frontend/admin');
var misc = require('./misc');
var sessions = require('./sessions');

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
var faultSessions = {};

function createBasicCallback(chatId) {
    return function(msg, sendId) {
        if (typeof sendId !== 'number') {
            sendId = chatId;
        }
        bot.sendMessage(sendId, msg, {
            parse_mode: "Markdown",
        });
    };
}

function createPublicBusResponseCallback(chatId) {
    return function(data) {
        bot.sendMessage(chatId, data, {
            parse_mode: "Markdown",
            disable_web_page_preview: true,
            reply_markup: JSON.stringify({
                hide_keyboard: true
            })
        });
        sessions.deletePublicBusSession(chatId);
    };
}

function createPublicBusOptionsCallback(chatId) {
    return function(data) {
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
        sessions.createPublicBusSession(chatId);
    };
}

function createNusBusResponseCallback(chatId) {
    return function(data) {
        bot.sendMessage(chatId, data, {
            parse_mode: "Markdown",
            disable_web_page_preview: true,
            reply_markup: JSON.stringify({
                hide_keyboard: true
            })
        });
    };
}

function createNusBusOptionsCallback(chatId) {
    return function(data) {
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
        bot.sendMessage(chatId, data, opts);
        sessions.createNusBusSession(chatId);
    };
}

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

        if (msg.hasOwnProperty('reply_to_message') && admins.indexOf(msg.from.id) > -1) {
            return processFeedbackReply(msg);
        }

        var chatId = msg.chat.id;
        var body = msg.text;
        command = body.split(' ')[0].substr(0);
        var args = body.split(' ')[1];
        if (body.charAt(0) === '/') {
            command = body.split(' ')[0].substr(1);
            args = body.split(' ')[1];
        }

        var basicCallback = createBasicCallback(chatId);
        // manage commands
        switch (command.toLowerCase()) {
            case "start":
                return misc.help(basicCallback);
            case "help":
                return misc.help(basicCallback);
            case "psi":
                return weather.getWeather(basicCallback);
            case "bus":
                var busstop = args;
                return travel.bus(chatId, busstop, msg.location, createPublicBusOptionsCallback(chatId));
            case "nusbus":
                var busstop = args;
                return travel.nusbus(chatId, busstop, msg.location, createNusBusOptionsCallback(chatId));
            case "dining":
                diningSessions[chatId] = diningSessions[chatId] || new DiningSession(chatId);
                return ask_dining_feedback(chatId);
            case "spaces":
                return cinnamon.getAllSpaces(chatId, basicCallback);
            case "events":
                return cinnamon.getEvents(basicCallback);
            case "cat":
                return catfact(chatId);
            case "feedback":
                return misc.start_feedback(chatId, basicCallback);
            case "stats":
                return statistics.getAllSummary(basicCallback);
            case "links":
                var cb = function(msg) {
                    bot.sendMessage(chatId, msg, {
                        disable_web_page_preview: true
                    });
                };
                return misc.getLinks(chatId, cb);
            case "register":
                return auth.register(chatId, basicCallback);
            case "agree":
                return auth.agree(msg.from.id, basicCallback);
            case "fault":
                faultSessions[chatId] = faultSessions[chatId] || new FaultSession(chatId);
                return ask_fault_feedback(chatId);
            case "back":
                if (faultSessions[chatId]) {
                    return faultSessions[chatId].back(chatId, bot, faultSessions[chatId]);
                }
                return default_msg(chatId);
            case "cancel":
                var cancelCallback = function(msg) {
                    bot.sendMessage(chatId, msg, {
                        parse_mode: "Markdown",
                        reply_markup: JSON.stringify({
                            hide_keyboard: true
                        })
                    });
                };
                return sessions.cancel(chatId, cancelCallback);
        }

        // manage markups
        switch (body.toLowerCase()) {
            case 'towards buona vista':
                return bus(chatId, "19051");
            case 'towards clementi':
                return bus(chatId, "19059");
            default:
                var diningSession = diningSessions[chatId] || new DiningSession(chatId);
                if (diningSession.inThread.status) {
                    return diningSession.inThread.next(body, chatId);
                }
                if (sessions.getFeedbackSession(chatId)) {
                    return misc.continue_feedback(body, chatId, msg, basicCallback);
                }
                if (sessions.getNusBusSession(chatId)) {
                    return travel.nusbus(chatId, body.toLowerCase(), msg.location, createNusBusResponseCallback(chatId));
                }
                if (sessions.getPublicBusSession(chatId)) {
                    return travel.bus(chatId, body.toLowerCase(), msg.location, createPublicBusResponseCallback(chatId));
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
        msgToSend += "We refer to your message:\n";
        msgToSend += "\"_" + feedbackEntry.msg.trim() + "_\"\n\n";
        msgToSend += replyMsg;
        msgToSend += "\n-- " + msg.from.first_name;
        bot.sendMessage(replyId, msgToSend, {
            parse_mode: "Markdown"
        });
        admins.forEach(function(admin) {
            if (admin !== msg.from.id) {
                msgToSend = "==============\nADMIN REPLY\n==============\n" + msgToSend;
                bot.sendMessage(admin, msgToSend, {
                    parse_mode: "Markdown"
                });
            }
        });
    }
}

function processLocation(msg) {
    var chatId = msg.chat.id;
    if (sessions.getNusBusSession(chatId)) {
        return travel.nusbus(chatId, msg.text, msg.location, createNusBusResponseCallback(chatId));
    }
    if (sessions.getPublicBusSession(chatId)) {
        return travel.bus(chatId, msg.text, msg.location, createPublicBusResponseCallback(chatId));
    }
    return default_msg(chatId);
}

function cancel(chatId) {
    diningSessions[chatId] = new DiningSession(chatId);
    faultSessions[chatId] = new FaultSession(chatId);
    bot.sendMessage(chatId, "Your command has been *canceled*.", {
        parse_mode: "Markdown",
        reply_markup: JSON.stringify({
            hide_keyboard: true
        })
    });
}

function catfact(chatId) {
    return do_not_open.catfact(chatId, bot);
}

function cnjoke(chatId) {
    return do_not_open.cnjoke(chatId, bot);
}

function ask_dining_feedback(chatId) {
    function callback(row) {
        if (!row) {
            bot.sendMessage(chatId, "Sorry you're not registered. Type /register to register.");
            // } else if (!row.isCinnamonResident) {
            //     bot.sendMessage(chatId, "Sorry you must be a Cinnamon resident to use this feature :(");
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

function ask_fault_feedback(chatId) {
    function callback(row) {
        if (!row) {
            bot.sendMessage(chatId, "Sorry you're not registered. Type /register to register.");
            // } else if (!row.isCinnamonResident) {
            //     bot.sendMessage(chatId, "Sorry you must be a Cinnamon resident to use this feature :(");
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