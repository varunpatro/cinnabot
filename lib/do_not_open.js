var fs = require('fs');

var catFile = 'catfacts.txt';
var chuckFile = 'cnjokes.txt';

function random_file_read(file, callback) {
    fs.readFile(file, 'utf8', function(err, data) {
        if (err) {
            callback("Meow.");
        }
        var linesArray = data.split('\n');
        var randLine = Math.floor(Math.random() * linesArray.length - 1);
        callback(linesArray[randLine]);
    });
}

function catfact(callback) {
    return random_file_read(catFile, callback);
}

function cnjoke(callback) {
    return random_file_read(chuckFile, callback);
}

module.exports = {
    catfact, cnjoke
};
