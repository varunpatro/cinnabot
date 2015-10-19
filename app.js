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
    if (msg.text.charAt(0) === '/') {
        var command = msg.text.substr(1);
    }
    switch(command) {
        case "psi":
            return psi(chatId);
        case "bus":
            var busstop = msg.text.split(' ')[1];
            return bus(chatId, busstop);
        default:
            return default_msg(chatId);
    }
});


function psi(chatId) {
    bot.sendMessage(chatId, weather.getWeather());
}

function bus(chatId, busstop) {
    function callback(data) {
        bot.sendMessage(chatId, data);
    }
    traffic.busStopQuery(busstop || traffic.defaultBusStop, callback);
}

function default_msg(chatId) {
    bot.sendMessage(chatId, "Unknown Command.");
}