var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('cinnabot.db');

var LOGSCHEMA = "CREATE TABLE IF NOT EXISTS log (time INTEGER, msg TEXT, userid INTEGER, username TEXT, firstname TEXT, lastname TEXT)";
db.run(LOGSCHEMA);
var logStmt = db.prepare("INSERT INTO log VALUES (?, ?, ?, ?, ?, ?)");

function getAllUsers(callback) {
    var users = [];
    db.all("SELECT DISTINCT userid FROM log", callback);
}

function getLogStmt() {
    return logStmt;
}

module.exports = {
    "getAllUsers": getAllUsers,
    "getLogStmt": getLogStmt
};
