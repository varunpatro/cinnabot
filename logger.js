var emojiStrip = require('emoji-strip');
var db = require('./db');
var logStmt = db.getLogStmt();

function log(msg) {
    if (logStmt) {
        logStmt.run(new Date(), emojiStrip(msg.text), msg.from.id, msg.from.username, msg.from.first_name, msg.from.last_name);
    }
}

module.exports = {
    "log": log
};
