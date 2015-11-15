var express = require('express');
var rest = require('restler');
var IVLE_CREDENTIALS = require('../../private/ivle_credentials.json');
var broadcast = require('../../broadcast');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
    res.render('pages/index', {
        title: 'Home'
    });
});

router.get('/broadcast', function(req, res) {
    console.log(req.query);
    broadcast.broadcastMessage(req.app.bot, req.query.bcastmsg);
    res.send("ok");
});

function hasUrcModule(modules) {
    for (var i = 0; i < modules.length; i++) {
        var module = modules[i];
        if (module.CourseCode === "URC") {
            return true;

        }
    }
    return false;
}

router.get('/ivle_register', function(req, res) {
    var userId = req.query.userId;
    var token = req.query.token;
    var modulesLink = 'https://ivle.nus.edu.sg/api/Lapi.svc/Modules?APIKey=' + IVLE_CREDENTIALS.APIKey + '&AuthToken=' + token;
    rest.get(modulesLink).on('complete', function(data) {
        var modules = data.Results;
        if (hasUrcModule(modules)) {
            req.app.bot.sendMessage(userId, "Hey there, you have successfully registered with Cinnabot!");
            return res.render('pages/register_success', {
                title: 'Home'
            });
        }
        req.app.bot.sendMessage(userId, "Hey there, you are not a resident at Cinnamon College 😔");
        return res.status(400).render('pages/register_fail', {
            title: 'Home'
        });
    });
});

module.exports = router;