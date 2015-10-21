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

module.exports = {
    getPhoneNum: extractPhoneNumber,
    timeLeftMin: timeLeftMin
};
