var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('cinnabot.db');

var LOGSCHEMA = "CREATE TABLE IF NOT EXISTS log (time INTEGER, msg TEXT, userid INTEGER, username TEXT, firstname TEXT, lastname TEXT)";
var FEEDBACKSCHEMA = "CREATE TABLE IF NOT EXISTS feedback (time INTEGER, msg TEXT, userid INTEGER, username TEXT, firstname TEXT, lastname TEXT)";
db.run(LOGSCHEMA);
db.run(FEEDBACKSCHEMA);

var logStmt = db.prepare("INSERT INTO log VALUES (?, ?, ?, ?, ?, ?)");
var feedbackStmt = db.prepare("INSERT INTO feedback VALUES (?, ?, ?, ?, ?, ?)");

function getAllUsers(callback) {
    var users = [];
    db.all("SELECT DISTINCT userid FROM log", callback);
}

function getLogStmt() {
    return logStmt;
}

function getFeebackStmt() {
    return feedbackStmt;
}

module.exports = {
    "getAllUsers": getAllUsers,
    "getLogStmt": getLogStmt,
    "getFeebackStmt": getFeebackStmt
};
