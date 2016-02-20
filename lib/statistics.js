var _ = require('lodash');
var BPromise = require('bluebird');

var db = require('./db');

function getAllSummary(callback) {
    var commandsLastWeek = [];
    var numUniqueUsers = 0;
    var numRegisteredUsers = 0;
    var numQueriesLastWeek = 0;
    var numQueriesAll = 0;
    BPromise.promisify(db.getLogTable)().then(function(rows) {
        numQueriesAll = rows.length;
        var users = [];
        var today = new Date();
        var oneWeekAgo = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);
        rows.forEach(row => {
            var time = new Date(row.time);
            if (time > oneWeekAgo) {
                numQueriesLastWeek++;
                var text = row.msg;
                if (text.startsWith('/')) {
                    commandsLastWeek.push(text);
                }
            }
            var userid = row.userid;
            if (users.indexOf(userid) < 0) {
                numUniqueUsers++;
                users.push(userid);
            }
        });
    }).then(function() {
        BPromise.promisify(db.getUserTable)().then(rows => numRegisteredUsers = rows.length)
            .then(function() {
                var header = '*STATISTICS SUMMARY\n';
                header += '=================*\n\n';

                var data = 'Number of users: ' + numUniqueUsers + '\n';
                data += 'Number of registered users: ' + numRegisteredUsers + '\n';
                data += 'Number of commands since the big bang: ' + numQueriesAll + '\n';
                data += 'Number of commands last week: ' + numQueriesLastWeek + '\n';
                var mostFrequentCommands = _.chain(commandsLastWeek).countBy().toPairs().sortBy(function(pair) {
                    return pair[1];
                }).reverse().value();
                data += 'Most popular command last week: ' + mostFrequentCommands[0][0] + ' (' + (Math.floor(mostFrequentCommands[0][1] / numQueriesLastWeek * 100)) + '%)\n';
                var message = header + data;
                callback(message);
            });

    });
}

module.exports = {
    getAllSummary
};
