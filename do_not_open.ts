import fs = require('fs');
var catFile = 'catfacts.txt';
var chuckFile = 'cnjokes.txt';

function random_file_read(chatId, bot, file) {
    fs.readFile(file, 'utf8', function(err, data) {
        if (err) {
            bot.sendMessage(chatId, "Meow.");
        }
        var linesArray = data.split('\n');
        var randLine = Math.floor(Math.random() * linesArray.length - 1);
        bot.sendMessage(chatId, linesArray[randLine]);
    });
}

export function catfact(chatId, bot) {
    return random_file_read(chatId, bot, catFile);
}

export function cnjoke(chatId, bot) {
    return random_file_read(chatId, bot, chuckFile);
}