var auth = require('./auth');

function help(callback) {
    var helpMessage =
        "Here's what you can ask Cinnabot!\n\n" +
        "/bus                      - check bus timings for UTown and Dover road\n" +
        "/bus <busstop>   - check bus timings for <busstop>\n" +
        "/dining                  - tell us how the food was\n" +
        "/events                 - view upcoming USP events\n" +
        "/fault                     - report building faults in Cinnamon\n" +
        "/feedback             - send suggestions and complaints\n" +
        "/links                     - view useful links\n" +
        "/nusbus                - check bus timings for NUS buses\n" +
        "/psi                       - get the psi and weather conditions\n" +
        "/register               - register your NUS account!\n" +
        "/spaces                - view upcoming activities in USP spaces\n" +
        "/stats                    - view key statistics";
    callback(helpMessage);
}

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
    "getLinks": getLinks,
    "help": help
}