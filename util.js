var readline = require('readline');
var chalk = require('chalk');

function extractPhoneNumber(phoneString) {
    return phoneString.split('@')[0];
}

function timeLeftMin(time) {
    var timeLeft = Math.ceil((time - new Date()) / 1000 / 60);
    if (timeLeft < 0) {
        return "N.A.";
    } else {
        return timeLeft + ' min';
    }
}


function formatDate(date) {
    return date.toDateString().substr(0, 3) + ', ' + date.toDateString().substr(4, 6);
}

function formatTime(date) {
    return date.toTimeString().substr(0, 5);
}

module.exports = {
    getPhoneNum: extractPhoneNumber,
    timeLeftMin: timeLeftMin,
    formatTime: formatTime,
    formatDate: formatDate
};