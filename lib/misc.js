var auth = require('./auth');
var logger = require('./logger');
var sessions = require('./sessions');

const timeDelay = 30 * 1000;
const helpMessage =
        'Here\'s what you can ask Cinnabot!\n\n' +
        '/bus                      - check bus timings for UTown and Dover road\n' +
        '/bus <busstop>   - check bus timings for <busstop>\n' +
        '/dining                  - tell us how the food was\n' +
        '/events                 - view upcoming USP events\n' +
        '/fault                     - report building faults in Cinnamon\n' +
        '/feedback             - send suggestions and complaints\n' +
        '/links                     - view useful links\n' +
        '/nusbus                - check bus timings for NUS buses\n' +
        '/psi                       - get the psi and weather conditions\n' +
        '/register               - register your NUS account!\n' +
        '/spaces                - view upcoming activities in USP spaces\n' +
        '/stats                    - view key statistics';

const feedbackMsg = 'Thanks for using Cinnabot 😁\n' +
    'Feel free to tell us how cinnabot can be improved.\n' +
    'Type /done to end the feedback session.\n' +
    'Type /cancel to cancel feedback';

function start_feedback(chatId, args, msg, callback) {
    var remindDone = function() {
        if (sessions.getFeedbackSession(chatId)) {
            callback('Please remember to type /done when you are done.');
            setTimeout(remindDone, timeDelay);
        }
    };
    setTimeout(remindDone, timeDelay);
    var feedbackSession = sessions.createFeedbackSession(chatId);
    if (args) {
      return continue_feedback(chatId, args, msg, callback);
    }
    return callback(feedbackMsg);
}

function continue_feedback(chatId, body, msg, callback) {
    var feedbackSession = sessions.getFeedbackSession(chatId);
    feedbackSession.feedbackMsg += body + '\n';
    if (body.endsWith('/done')) {
        return done_feedback(chatId, msg, callback);
    }
    return;
}

function done_feedback(chatId, msg, callback) {
    var feedbackSession = sessions.getFeedbackSession(chatId);
    var feedbackMsg = feedbackSession.feedbackMsg;
    feedbackMsg = feedbackMsg.substring(0, feedbackMsg.length - 6);
    logger.feedback(feedbackMsg, msg, callback);
    sessions.deleteFeedbackSession(chatId);
    var doneMsg = 'Thanks for the feedback 😁';
    return callback(doneMsg);
}

function help(callback) {
   callback(helpMessage);
}

function getLinks(chatId, bot) {
    var linkText =
        'USEFUL LINKS:\n' +
        '==============\n\n';

    function authCallback(row) {
        if (!row) {
            return bot.sendMessage(chatId, 'Sorry you\'re not registered. Type /register to register.');
        } else {
            // if (!row.isCinnamonResident) {
            linkText +=
                'Check your NUS library account:\n' +
                'https://linc.nus.edu.sg/patroninfo/\n\n';
            // }
            // if (row.isCinnamonResident) {
            linkText +=
                'Check the USP reading room catalogue:\n' +
                'https://myaces.nus.edu.sg/libms_isis/login.jsp\n\n' +
                'Check your meal credits:\n' +
                'https://bit.ly/hungrycinnamon\n\n' +
                'Report faults in Cinnamon:\n' +
                'https://bit.ly/faultycinnamon\n\n' +
                'Check your air-con credits:\n' +
                'https://bit.ly/chillycinnamon';
            // }
        }
        bot.sendMessage(chatId, linkText, {
            disable_web_page_preview: true
        });
    }
    auth.isCinnamonResident(chatId, authCallback);
}

module.exports = {
    start_feedback, continue_feedback, done_feedback, help, getLinks
};
