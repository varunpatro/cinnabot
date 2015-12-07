var rest = require('restler');
var Promise = require('bluebird');
var IVLE_CREDENTIALS = require('../../private/ivle_credentials.json');
var db = require('../../db');

function hasUrcModule(modules) {
    for (var i = 0; i < modules.length; i++) {
        var module = modules[i];
        if (module.CourseCode === "URC") {
            return true;
        }
    }
    return false;
}

function storeUserProfile(userId, matric, name, email, gender, isCinnamonResident, token) {
    var userStmt = db.getUserStmt();
    return userStmt.run(new Date(), userId, matric, name, email, gender, isCinnamonResident, token);
}

function registerUser(userId, token) {
    var profile;
    var profileLink = 'https://ivle.nus.edu.sg/api/Lapi.svc/Profile_view?APIKey=' + IVLE_CREDENTIALS.APIKey + '&AuthToken=' + token;
    rest.get(profileLink).on('complete', function(data) {
        profile = data.Results[0];
        var modulesLink = 'https://ivle.nus.edu.sg/api/Lapi.svc/Modules?APIKey=' + IVLE_CREDENTIALS.APIKey + '&AuthToken=' + token;
        rest.get(modulesLink).on('complete', function(data) {
            var modules = data.Results;
            var isCinnamonResident = hasUrcModule(modules);
            storeUserProfile(userId, profile.UserID, profile.Name, profile.Email, profile.Gender, isCinnamonResident, token);
        });
    });
}

module.exports = {
    "registerUser": registerUser
}