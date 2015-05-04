var jf = require('jsonfile');
var util = require('util');

var file = './log.json';

var filecontents = jf.readFileSync(file);

function readLogs() {
    return filecontents;
}

function logMessage(request, response) {
    filecontents[request.date] = {
        "request": request,
        "response" : response
    };	
}

function storeLogs() {
    jf.writeFile(file, filecontents, function(err) {
        console.log(err);
    });
}

module.exports = {
    readLogs: readLogs,
    logMessage: logMessage,
    storeLogs: storeLogs
};
