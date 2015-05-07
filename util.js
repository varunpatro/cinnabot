function extractPhoneNumber(phoneString) {
    return phoneString.split('@')[0];
}

module.exports = {
    getPhoneNum: extractPhoneNumber
}
