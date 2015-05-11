var jf = require('jsonfile');

var studentsInfoFilepath = './private/students_info.json';
var studentsInfo = jf.readFileSync(studentsInfoFilepath);

function isAllowed(phone) {
    return studentsInfo.hasOwnProperty(phone);
}

module.exports = {
    isAllowed: isAllowed
};
