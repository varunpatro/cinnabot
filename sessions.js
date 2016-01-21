var NodeCache = require('node-cache');
var registerSessions = new NodeCache();

var MAX_CACHE_TIME = 30; // seconds

function RegisterSession(chatId) {
    this.chatId = chatId;
}

function createRegisterSession(chatId) {
    registerSessions.set(chatId, new RegisterSession(chatId), MAX_CACHE_TIME);
    return registerSessions.get(chatId);
}

function getRegisterSession(chatId) {
    return registerSessions.get(chatId);
}

function deleteRegisterSession(chatId) {
    return registerSessions.del(chatId);
}

function cancel(chatId, callback) {
    // diningSessions[chatId] = new DiningSession(chatId);
    // feedbackSessions[chatId] = new FeedbackSession(chatId);
    registerSessions[chatId] = new RegisterSession(chatId);
    // nusbusSessions[chatId] = new NusBusSession(chatId);
    // publicbusSessions[chatId] = new PublicBusSession(chatId);
    // faultSessions[chatId] = new FaultSession(chatId);

    callback("Your command has been *canceled*.");
}

module.exports = {
    "cancel": cancel,
    "createRegisterSession": createRegisterSession,
    "getRegisterSession": getRegisterSession,
    "deleteRegisterSession": deleteRegisterSession
};
