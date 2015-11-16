var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('cinnabot.db');

var LOGSCHEMA = "CREATE TABLE IF NOT EXISTS log (time INTEGER, msg TEXT, userid INTEGER, username TEXT, firstname TEXT, lastname TEXT)";
var FEEDBACKSCHEMA = "CREATE TABLE IF NOT EXISTS feedback (time INTEGER, msg TEXT, userid INTEGER, username TEXT, firstname TEXT, lastname TEXT)";
var USERSCHEMA = "CREATE TABLE IF NOT EXISTS user (time INTEGER, userid INTEGER PRIMARY KEY, matric TEXT, name TEXT, email TEXT, gender TEXT, isCinnamonResident INTEGER, token TEXT)";
db.run(LOGSCHEMA);
db.run(FEEDBACKSCHEMA);
db.run(USERSCHEMA);

var logStmt = db.prepare("INSERT INTO log VALUES (?, ?, ?, ?, ?, ?)");
var feedbackStmt = db.prepare("INSERT INTO feedback VALUES (?, ?, ?, ?, ?, ?)");
var userStmt = db.prepare("INSERT OR IGNORE INTO user VALUES (?, ?, ?, ?, ?, ?, ?, ?)");

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

function getUserStmt() {
    return userStmt;
}

function getLogTable(callback) {
    return db.all("SELECT * FROM log", callback);
}

function getUser(userId, callback) {
    return db.get("SELECT * FROM user where userid=" + userId, callback);
}

module.exports = {
    "getAllUsers": getAllUsers,
    "getLogStmt": getLogStmt,
    "getFeebackStmt": getFeebackStmt,
    "getLogTable": getLogTable,
    "getUserStmt": getUserStmt,
    "getUser": getUser
};
