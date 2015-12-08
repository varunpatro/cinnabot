var express = require('express');
var register = require('../logic/register')
var broadcast = require('../../broadcast');
var auth = require('../../auth');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
    res.render('pages/index', {
        title: 'Home'
    });
});

router.get('/broadcast', function(req, res) {
    broadcast.broadcastMessage(req.app.bot, req.query.bcastmsg);
    res.send("ok");
});

router.get('/ivle_register/:userId', function(req, res) {
    var userId = req.params.userId;
    var token = req.query.token;
    var OTP = req.query.OTP;
    if (!auth.validateOTP(userId, OTP)) {
        return res.status(400).render('pages/register_fail', {
            title: 'Home',
            error: 'Invalid OTP'
        });
    }
    register.registerUser(userId, token);
    req.app.bot.sendMessage(userId, "Hey there, you have *successfully* registered with Cinnabot!",{
        parse_mode : "Markdown"
    });
    return res.render('pages/register_success', {
        title: 'Home'
    });
});

module.exports = router;