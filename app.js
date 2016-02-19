var TelegramBot = require('node-telegram-bot-api');
var chalk = require('chalk');


var auth = require('./lib/auth');
var broadcast = require('./lib/broadcast');
var cinnamon = require('./lib/cinnamon');
var db = require('./lib/db');
var dining = require('./lib/dining');
var do_not_open = require('./lib/do_not_open');
var fault = require('./lib/fault');
var logger = require('./lib/logger');
var misc = require('./lib/misc');
var sessions = require('./lib/sessions');
var statistics = require('./lib/statistics');
var travel = require('./lib/travel');
var util = require('./lib/util');
var weather = require('./lib/weather');

var CREDENTIALS = require('./private/telegram_credentials.json');
var adminServer = require('./frontend/admin');
var config = require('./private/config.json');


var bot = new TelegramBot(CREDENTIALS.token, {
    polling: true
});

adminServer.startServer(bot);

function createBasicCallback(chatId) {
    return function(msg, sendId) {
        if (typeof sendId !== 'number') {
            sendId = chatId;
        }
        bot.sendMessage(sendId, msg, {
            parse_mode: 'Markdown',
        });
    };
}

function createPublicBusResponseCallback(chatId) {
    return function(data) {
        bot.sendMessage(chatId, data, {
            parse_mode: 'Markdown',
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
            parse_mode: 'Markdown',
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
    'use strict';
    try {
        console.log(msg);
        if (!msg.hasOwnProperty('text') && !msg.hasOwnProperty('location')) {
            return false;
        }
        logger.log(msg);

        if (msg.hasOwnProperty('location')) {
            return processLocation(msg);
        }

        if (msg.hasOwnProperty('reply_to_message') && config.admins.indexOf(msg.from.id) > -1) {
            return processFeedbackReply(msg);
        }

        var chatId = msg.chat.id;
        var body = msg.text;
        var command = body.split(' ')[0].substr(0);
        var args = body.split(' ')[1];
        if (body.charAt(0) === '/') {
            command = body.split(' ')[0].substr(1);
            args = body.split(' ')[1];
        }

        var basicCallback = createBasicCallback(chatId);
        // manage commands
        switch (command.toLowerCase()) {
            case 'start':
                return misc.help(basicCallback);
            case 'help':
                return misc.help(basicCallback);
            case 'psi':
                return weather.getWeather(basicCallback);
            case 'bus':
                var busstop = args;
                return travel.bus(chatId, busstop, msg.location, createPublicBusOptionsCallback(chatId));
            case 'nusbus':
                busstop = args;
                return travel.nusbus(chatId, busstop, msg.location, createNusBusOptionsCallback(chatId));
            case 'dining':
                return dining.start(chatId, bot);
            case 'spaces':
                return cinnamon.getAllSpaces(chatId, basicCallback);
            case 'events':
                return cinnamon.getEvents(basicCallback);
            case 'cat':
                return do_not_open.catfact(createBasicCallback(chatId));
            case 'feedback':
                return misc.start_feedback(chatId, basicCallback);
            case 'stats':
                return statistics.getAllSummary(basicCallback);
            case 'links':
                return misc.getLinks(chatId, bot);
            case 'register':
                return auth.register(chatId, basicCallback);
            case 'agree':
                return auth.agree(chatId, basicCallback);
            case 'fault':
                return fault.start(chatId, bot, basicCallback);
            case 'back':
                let faultSession = sessions.getFaultSession(chatId);
                if (faultSession) {
                    return fault.back(chatId, bot, faultSession);
                }
                return default_msg(chatId);
            case 'cancel':
                var cancelCallback = (msg => {
                    bot.sendMessage(chatId, msg, {
                        parse_mode: 'Markdown',
                        reply_markup: JSON.stringify({
                            hide_keyboard: true
                        })
                    });
                });
                return sessions.cancel(chatId, cancelCallback);
        }

        switch (body.toLowerCase()) {
            case 'towards buona vista':
                return travel.bus(chatId, '19051', null, createPublicBusResponseCallback(chatId));
            case 'towards clementi':
                return travel.bus(chatId, '19059', null, createPublicBusResponseCallback(chatId));
            default:
                var diningSession = sessions.getDiningSession(chatId);
                if (diningSession) {
                    return diningSession.next(chatId, bot, body);
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
                if (sessions.getFaultSession(chatId)) {
                    return fault.continueFeedback(chatId, body, bot);
                }
        }

        return default_msg(chatId);
    } catch (e) {
        var errloc = e.stack.split('\n')[1];
        bot.sendMessage(msg.chat.id, 'Cinnabot is sleeping right now 😴 Wake him up later.').then(function() {
            do_not_open.catfact(msg => bot.sendMessage(msg.chat.id, 'Here\'s a catfact instead:\n\n + msg'));
            admins.forEach(admin => bot.sendMessage(admin, e.toString() + '\n' + errloc));
        });
    }
});

function processFeedbackReply(msg) {
    var fullMsg = msg.reply_to_message.text;
    for (var useridStr = '', useridIndex = fullMsg.indexOf('User Id: ') + 9; fullMsg[useridIndex] !== '\n'; useridIndex++) {
        useridStr += fullMsg[useridIndex];
    }
    for (var timeStr = '', timeIndex = fullMsg.indexOf('Time: ') + 6; fullMsg[timeIndex] !== '\n'; timeIndex++) {
        timeStr += fullMsg[timeIndex];
    }
    var time = parseInt(timeStr);
    var replyId = parseInt(useridStr);
    var replyMsg = msg.text;
    db.getFeedbackMsg(time, callback);

    function callback(err, feedbackEntry) {
        if (err) {
            return bot.sendMessage(msg.from.id, 'Something went wrong in accessing the feedback table.');
        }
        var msgToSend = 'FEEDBACK REPLY\n==============\n';
        msgToSend += 'We refer to your message:\n';
        msgToSend += '\'_' + feedbackEntry.msg.trim() + '_\'\n\n';
        msgToSend += replyMsg;
        msgToSend += '\n-- ' + msg.from.first_name;
        bot.sendMessage(replyId, msgToSend, {
            parse_mode: 'Markdown'
        });
        config.admins.forEach(function(admin) {
            if (admin !== msg.from.id) {
                msgToSend = '==============\nADMIN REPLY\n==============\n' + msgToSend;
                bot.sendMessage(admin, msgToSend, {
                    parse_mode: 'Markdown'
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

function catfact(chatId) {
    return do_not_open.catfact(chatId, bot);
}

function default_msg(chatId) {
    do_not_open.cnjoke(msg => {
        bot.sendMessage(chatId, 'Hey we didn\'t understand you!Here\'s a chuck norris fact instead:\n\n' + msg, {
            reply_markup: JSON.stringify({
                hide_keyboard: true
            })
        });
    });
}
