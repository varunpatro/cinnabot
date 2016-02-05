var NodeCache = require('node-cache');
var registerSessions = new NodeCache();
var feedbackSessions = new NodeCache({
    useClones: false
});
var publicBusSessions = new NodeCache();
var nusBusSessions = new NodeCache();

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

function PublicBusSession(chatId) {
    this.chatId = chatId;
}

function createPublicBusSession(chatId) {
    publicBusSessions.set(chatId, new PublicBusSession(chatId));
    return publicBusSessions.get(chatId);
}

function getPublicBusSession(chatId) {
    return publicBusSessions.get(chatId);
}

function deletePublicBusSession(chatId) {
    return publicBusSessions.del(chatId);
}

function NusBusSession(chatId) {
    this.chatId = chatId;
}

function createNusBusSession(chatId) {
    nusBusSessions.set(chatId, new NusBusSession(chatId));
    return nusBusSessions.get(chatId);
}

function getNusBusSession(chatId) {
    return nusBusSessions.get(chatId);
}

function deleteNusBusSession(chatId) {
    return nusBusSessions.del(chatId);
}

function cancel(chatId, callback) {
    deleteFeedbackSession(chatId);
    deleteRegisterSession(chatId);
    deletePublicBusSession(chatId);
    deleteNusBusSession(chatId);
    // diningSessions[chatId] = new DiningSession(chatId);
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
    "deleteFeedbackSession": deleteFeedbackSession,
    "createPublicBusSession": createPublicBusSession,
    "getPublicBusSession": getPublicBusSession,
    "deletePublicBusSession": deletePublicBusSession,
    "createNusBusSession": createNusBusSession,
    "getNusBusSession": getNusBusSession,
    "deleteNusBusSession": deleteNusBusSession
};
