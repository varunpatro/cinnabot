import fs = require('fs');
import BPromise = require('bluebird');
import util = require('./util');
import db = require('./db');
var bcastfile = 'bcast.txt';

function file_read(callback) {
    fs.readFile(bcastfile, 'utf8', function(err, data) {
        if (err) {
            return callback('Meow.');
        }
        callback(data);
        var today = new Date();
        var newFileName = 'broadcast_logs/bcast ' + today.toLocaleTimeString() + ' ' + today.toDateString() + '.txt';
        fs.rename(bcastfile, newFileName);
    });
}

export function broadcast(bot) {
    var header = 'BROADCAST MESSAGE\n';
    header += '=================\n\n';

    function callback(data) {
        if (data !== 'Meow.') {
            var message = header + data;
            BPromise.promisify(db.getAllUsers)().then(function(rows) {
                var users = [];
                rows.forEach(function(row) {
                    users.push(row.userid);
                });
                return BPromise.resolve(users);
            }).then(function(userIds) {
                userIds.forEach(function(userId) {
                    bot.sendMessage(userId, message);
                });
            });
        }
    }
    return file_read(callback);
}

export function broadcastMessage(bot, data) {
    var header = 'BROADCAST MESSAGE\n';
    header += '=================\n\n';

    var message = header + data;
    BPromise.promisify(db.getAllUsers)().then(function(rows) {
        var users = [];
        rows.forEach(function(row) {
            users.push(row.userid);
        });
        return BPromise.resolve(users);
    }).then(function(userIds) {
        userIds.forEach(function(userId) {
            bot.sendMessage(userId, message);
        });
    });

    return;
}