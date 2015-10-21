var readline = require('readline');
var chalk = require('chalk');

function readInput(question, callback) {
    // TODO: input string is printed to output. fix this.
    var rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.question(chalk.red(question + '\n'), function(answer) {
        callback(answer);
        rl.close();
    });
}

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
    timeLeftMin: timeLeftMin,
    readInput: readInput
};
