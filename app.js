var jf = require('jsonfile');
var TelegramBot = require('node-telegram-bot-api');
var chalk = require('chalk')
var credentialsFilePath = './private/telegram_credentials.json';
var logger = require('./logger')
var weather = require('./weather')
var traffic = require('./traffic')

var CREDENTIALS = jf.readFileSync(credentialsFilePath);
var bot = new TelegramBot(CREDENTIALS.token, {
    polling: true
});

console.log(chalk.blue("============================"))
console.log(chalk.blue("                            "))
console.log(chalk.blue("      TeleTham Started      "))
console.log(chalk.blue("                            "))
console.log(chalk.blue("============================"))
console.log(chalk.blue("                            "))

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
    }

    // manage markups
    switch(body) {
        case 'I wanna go Buona Vista':
            return bus(msgId, chatId, 19051);
        case 'I wanna go Clementi':
            return bus(msgId, chatId, 19059);
        default:
            return default_msg(chatId);
    }
});


function psi(chatId) {
    bot.sendMessage(chatId, weather.getWeather());
}

function bus(msgId, chatId, busstop) {
    function callback(data) {
        var opts = {
            reply_markup: JSON.stringify({
                keyboard: [
                    ['I wanna go Buona Vista'],
                    ['I wanna go Clementi']
                ],
                one_time_keyboard: true
            })
        };
        bot.sendMessage(chatId, data, opts);
    }
    
    if (busstop) {
        return traffic.busStopQuery(busstop, callback);    
    }
    callback("Choose Direction:");
}

function default_msg(chatId) {
    bot.sendMessage(chatId, "Unknown Command.");
}