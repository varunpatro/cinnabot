var jf = require('jsonfile');
var TelegramBot = require('node-telegram-bot-api');
var chalk = require('chalk')
var credentialsFilePath = './private/telegram_credentials.json';
var logger = require('./logger')

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