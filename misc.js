var auth = require('./auth');

function getLinks(chatId, callback) {
    var linkText =
        "USEFUL LINKS:\n" +
        "==============\n\n";

    function authCallback(row) {
        if (!row) {
            return bot.sendMessage(chatId, "Sorry you're not registered. Type /register to register.");
        } else {
            // if (!row.isCinnamonResident) {
            linkText +=
                "Check your NUS library account:\n" +
                "https://linc.nus.edu.sg/patroninfo/\n\n";
            // }
            // if (row.isCinnamonResident) {
            linkText +=
                "Check the USP reading room catalogue:\n" +
                "https://myaces.nus.edu.sg/libms_isis/login.jsp\n\n" +
                "Check your meal credits:\n" +
                "https://bit.ly/hungrycinnamon\n\n" +
                "Report faults in Cinnamon:\n" +
                "https://bit.ly/faultycinnamon\n\n" +
                "Check your air-con credits:\n" +
                "https://bit.ly/chillycinnamon";
            // }
        }
        callback(linkText);
    }
    auth.isCinnamonResident(chatId, authCallback);
}

module.exports = {
    "getLinks": getLinks
}