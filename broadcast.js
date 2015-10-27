var util = require('./util');

function broadcast(chatIds, bot, message) {
    message = '[\tThis is a broadcast message\t]\n\n' + message;
    chatIds.forEach(function(chatId) {
        bot.sendMessage(chatId, message);
    });
}

function broadcast_input(chatIds, bot) {
    function callback(data) {
        return broadcast(chatIds, bot, data);
    }
    return util.readInput("Message to broadcast?", callback);
}

module.exports = {
    broadcast_input: broadcast_input
};