var fs = require('fs');
var Promise = require('bluebird');
var util = require('./util');
var db = require('./db');
var bcastfile = "bcast.txt";

function file_read(callback) {
    fs.readFile(bcastfile, 'utf8', function(err, data) {
        if (err) {
            return callback("Meow.");
        }
        callback(data);
        var today = new Date();
        var newFileName = "broadcast_logs/bcast " + today.toLocaleTimeString() + ' ' + today.toDateString() + ".txt";
        fs.rename(bcastfile, newFileName);
    });
}

function broadcast(bot) {
    var header = 'BROADCAST MESSAGE\n';
    header += '=================\n\n';

    function callback(data) {
        if (data !== "Meow.") {
            var message = header + data;
            Promise.promisify(db.getAllUsers)().then(function(rows) {
                var users = [];
                rows.forEach(function(row) {
                    users.push(row.userid);
                });
                return Promise.resolve(users);
            }).then(function(userIds) {
                userIds.forEach(function(userId) {
                    bot.sendMessage(userId, message);
                });
            });
        }
    }
    return file_read(callback);
}

module.exports = {
    broadcast: broadcast
};
