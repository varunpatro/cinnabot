var whatsapi = require('whatsapi');
var logger = require('./logger');
var jf = require('jsonfile');
var api = require('./api');

var credentialsFilePath = './private/wa_credentials.json';
var CREDENTIALS = jf.readFileSync(credentialsFilePath);

/** CREATE WHATSAPP OBJECT */

var wa = whatsapi.createAdapter({
    msisdn: CREDENTIALS.phone,
    username: 'cinnabot',
    password: CREDENTIALS.password,
    ccode: CREDENTIALS.cc
});

/** START CONNECTION */

wa.connect(function connected(err) {
    if (err) {
        console.log(err);
        return;
    }
    console.log('Connected');
    // Now login
    wa.login(logged);
});

/** EVENT HANDLERS */

wa.on('receivedMessage', function(messageObj) {
    var responseObj = api.request(messageObj, sendMsg);
    var responsePhone = responseObj.phone;
    var responseMessage = responseObj.message;

    if (responseObj.type === 'function') {
        // do something for async apis
    } else if (responseObj.type === 'image') {
        var responseImgURL = responseObj.message;
        wa.sendImage(responsePhone, responseImgURL, function(err, id) {
            if (err) {
                console.log(responseImgURL);
                console.log(err.message);
                return;
            }
        });
    } else {
        sendMsg(responsePhone, responseMessage);
    }

    logger.logMessage(messageObj, responseObj);
    logger.storeLogs();

    console.log(messageObj.body);
});

/** CALL BACKS */

function logged(err) {
    if (err) {
        console.log(err);
        return;
    }
    console.log('Logged in to WA server');
    wa.sendIsOnline();
}

/** HELPER FUNCTIONS */

function sendMsg(responsePhone, responseMessage) {
    wa.sendMessage(responsePhone, responseMessage, function(err, id) {
        if (err) {
            console.log(err.message);
            return;
        }
    });
}
