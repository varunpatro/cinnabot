var _ = require('lodash');
var Promise = require('bluebird');
var db = require('./db');

function getAllSummary(callback) {
    var commands = [];
    var numUniqueUsers = 0;
    var numQueriesToday = 0;
    var numQueriesAll = 0;
    Promise.promisify(db.getLogTable)().then(function(rows) {
        numQueriesAll = rows.length;
        var users = [];
        var today = new Date(new Date().toDateString());
        rows.forEach(function(row) {
            var time = new Date(row.time);
            if (time > today) {
                numQueriesToday++;
            }
            var userid = row.userid;
            if (users.indexOf(userid) < 0) {
                numUniqueUsers++;
                users.push(userid);
            }
            var text = row.msg;
            if (text.startsWith('/')) {
                commands.push(text);
            }
        });
    }).then(function() {
        var header = 'STATISTICS SUMMARY\n';
        header += '=================\n\n';

        var data = "Number of users: " + numUniqueUsers + '\n';
        data += "Number of commands today: " + numQueriesToday + '\n';
        data += "Number of commands since the big bang: " + numQueriesAll + '\n';
        var mostFrequentCommands = _.chain(commands).countBy().pairs().sortBy(function(pair) {
            return pair[1];
        }).reverse().value();
        data += "Most popular command: " + mostFrequentCommands[0][0] + " (" + (Math.floor(mostFrequentCommands[0][1] / numQueriesAll * 100)) + '%)\n';
        var message = header + data;
        callback(message);
    });
}

module.exports = {
    "getAllSummary": getAllSummary
};
