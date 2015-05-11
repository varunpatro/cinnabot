var fs = require('fs');
var jf = require('jsonfile');


if (!fs.existsSync('./logs')) {
    fs.mkdirSync('./logs');
}
var file = './logs/log - ' + new Date().getTime() + '.json';

if (!fs.existsSync(file)) {
    jf.writeFileSync(file, {});
}

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
        // console.log(err);
    });
}

module.exports = {
    readLogs: readLogs,
    logMessage: logMessage,
    storeLogs: storeLogs
};
