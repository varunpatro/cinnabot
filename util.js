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

function currentTimeGreeting() {
    var hours = new Date().getHours();
    if (hours < 12) {
        return "morning";
    } else if (hours >= 12 && hours < 18) {
        return "afternoon";
    } else if (hours >= 18) {
        return "evening";
    } else {
        return "";
    }
}

function formatDate(date) {
    return date.toDateString().substr(0, 3) + ', ' + date.toDateString().substr(4, 6);
}

function formatTime(date) {
    var median = (date.getHours() < 12) ? "AM" : "PM";
}

function formatDigit(n) {
    return n > 9 ? "" + n : n;
}

module.exports = {
    getPhoneNum: extractPhoneNumber,
    timeLeftMin: timeLeftMin,
    formatTime: formatTime,
    formatDate: formatDate,
    currentTimeGreeting: currentTimeGreeting
};
