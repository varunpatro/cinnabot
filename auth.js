var jf = require('jsonfile');

var studentsInfoFilepath = './private/students_info.json';
var studentsInfo = jf.readFileSync(studentsInfoFilepath);

function isAllowed(phone) {
    return studentsInfo.hasOwnProperty(num);        
}

module.exports = {
    isAllowed: isAllowed
}
