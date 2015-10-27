var emojiStrip = require('emoji-strip');
var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('cinnabot.db');

var LOGSCHEMA = "CREATE TABLE IF NOT EXISTS log (time INTEGER, msg TEXT, userid INTEGER, username TEXT, firstname TEXT, lastname TEXT)";
var logStmt;

db.serialize(function() {
    db.run(LOGSCHEMA);
    logStmt = db.prepare("INSERT INTO log VALUES (?, ?, ?, ?, ?, ?)");
});

function log(msg) {
    if (logStmt) {
        logStmt.run(new Date(), emojiStrip(msg.text), msg.from.id, msg.from.username, msg.from.first_name, msg.from.last_name);
    }
}

module.exports = {
    "log": log
};
