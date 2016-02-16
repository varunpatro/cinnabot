var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('cinnabot.db');

var LOGSCHEMA = 'CREATE TABLE IF NOT EXISTS log (time INTEGER, msg TEXT, userid INTEGER, username TEXT, firstname TEXT, lastname TEXT, latitude REAL, longitude REAL)';
var FEEDBACKSCHEMA = 'CREATE TABLE IF NOT EXISTS feedback (time INTEGER, msg TEXT, userid INTEGER, username TEXT, firstname TEXT, lastname TEXT)';
var USERSCHEMA = 'CREATE TABLE IF NOT EXISTS user (time INTEGER, userid INTEGER PRIMARY KEY, matric TEXT, name TEXT, email TEXT, gender TEXT, isCinnamonResident INTEGER, token TEXT)';
var DININGSCHEMA = 'CREATE TABLE IF NOT EXISTS dining (time INTEGER, userid INTEGER, mealperiod TEXT, stall TEXT, rating INTEGER, feedback TEXT)';

db.run(LOGSCHEMA);
db.run(FEEDBACKSCHEMA);
db.run(USERSCHEMA);
db.run(DININGSCHEMA);

var logStmt = db.prepare('INSERT INTO log VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
var feedbackStmt = db.prepare('INSERT INTO feedback VALUES (?, ?, ?, ?, ?, ?)');
var userStmt = db.prepare('INSERT OR IGNORE INTO user VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
var diningStmt = db.prepare('INSERT OR IGNORE INTO dining VALUES (?, ?, ?, ?, ?, ?)');

function getAllUsers(callback) {
    var users = [];
    db.all('SELECT DISTINCT userid FROM log', callback);
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

function getDiningStmt() {
    return diningStmt;
}

function getLogTable(callback) {
    return db.all('SELECT * FROM log', callback);
}

function getUserTable(callback) {
    return db.all('SELECT * FROM user', callback);
}

function getBreakfastRatings(callback) {
    return db.all("SELECT count(stall) AS stallCount ,stall,AVG(rating) AS average FROM dining WHERE date(time/1000,'unixepoch','localtime')=date('now','localtime') AND mealperiod = 'Breakfast' GROUP BY stall ORDER BY average DESC", callback);
}

function getRatings(stallName, mealperiod, callback) {
    return db.get("SELECT count(stall) AS numRatings ,stall,mealperiod, AVG(rating) AS average FROM dining WHERE stall = '" + stallName + "' AND mealperiod = '" + mealperiod + "' AND date(time/1000,'unixepoch','localtime')=date('now','localtime') GROUP BY stall ORDER BY mealperiod,stall,average DESC ", callback);
}

function getDinnerRatings(callback) {
    return db.all("SELECT count(stall) AS stallCount ,stall,AVG(rating) AS average FROM dining WHERE date(time/1000,'unixepoch','localtime')=date('now','localtime') AND mealperiod = 'Dinner' GROUP BY stall ORDER BY average DESC", callback);
}

function getUser(userId, callback) {
    return db.get('SELECT * FROM user where userid=' + userId, callback);
}

function getFeedbackMsg(time, callback) {
    return db.get('SELECT msg FROM feedback where time=' + time, callback);
}

module.exports = {
    getAllUsers,
    getLogStmt,
    getFeebackStmt,
    getLogTable,
    getUserTable,
    getBreakfastRatings,
    getDinnerRatings,
    getRatings,
    getUserStmt,
    getDiningStmt,
    getUser,
    getFeedbackMsg,
};
