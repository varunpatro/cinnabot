function extractPhoneNumber(phoneString) {
    return phoneString.split('@')[0];
}

function timeLeftMin(time) {
    return Math.ceil((time - new Date()) / 1000 / 60) + " min";
}

module.exports = {
    getPhoneNum: extractPhoneNumber,
    timeLeftMin: timeLeftMin
}
