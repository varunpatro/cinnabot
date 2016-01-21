var registerSessions = {};

function RegisterSession(chatId) {
    this.chatId = chatId;
    this.hasPrompt = false;    
}

function createRegisterSession(chatId) {
	registerSessions[chatId] = new RegisterSession(chatId);
	return registerSessions[chatId];
}

function getRegisterSession(chatId) {
	return registerSessions[chatId];
}

function deleteRegisterSession(chatId) {
	delete registerSessions[chatId];
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
}