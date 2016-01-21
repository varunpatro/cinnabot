var NodeCache = require('node-cache');
var registerSessions = new NodeCache();
var feedbackSessions = new NodeCache({
    useClones: false
});

function RegisterSession(chatId) {
    this.chatId = chatId;
}

function createRegisterSession(chatId) {
    registerSessions.set(chatId, new RegisterSession(chatId), 30);
    return registerSessions.get(chatId);
}

function getRegisterSession(chatId) {
    return registerSessions.get(chatId);
}

function deleteRegisterSession(chatId) {
    return registerSessions.del(chatId);
}

function FeedbackSession(chatId) {
    this.chatId = chatId;
    this.feedbackMsg = "";
    feedbackSessions[chatId] = this;
}

function createFeedbackSession(chatId) {
    feedbackSessions.set(chatId, new FeedbackSession(chatId), 120);
    return feedbackSessions.get(chatId);
}

function getFeedbackSession(chatId) {
    return feedbackSessions.get(chatId);
}

function deleteFeedbackSession(chatId) {
    return feedbackSessions.del(chatId);
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
    "deleteRegisterSession": deleteRegisterSession,
    "createFeedbackSession": createFeedbackSession,
    "getFeedbackSession": getFeedbackSession,
    "deleteFeedbackSession": deleteFeedbackSession
};