import sqlite3 = require('sqlite3');
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

export function getAllUsers(callback) {
    var users = [];
    db.all('SELECT DISTINCT userid FROM log', callback);
}

export function getLogStmt() {
    return logStmt;
}

export function getFeebackStmt() {
    return feedbackStmt;
}

export function getUserStmt() {
    return userStmt;
}

export function getDiningStmt() {
    return diningStmt;
}

export function getLogTable(callback) {
    return db.all('SELECT * FROM log', callback);
}

export function getUserTable(callback) {
    return db.all('SELECT * FROM user', callback);
}

export function getUser(userId, callback) {
    return db.get('SELECT * FROM user where userid=' + userId, callback);
}

export function getFeedbackMsg(time, callback) {
    return db.get('SELECT msg FROM feedback where time=' + time, callback);
}