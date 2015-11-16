var express = require('express');
var register = require('../logic/register')
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

router.get('/ivle_register', function(req, res) {
    var userId = req.query.userId;
    var token = req.query.token;
    register.registerUser(userId, token);
    req.app.bot.sendMessage(userId, "Hey there, you have successfully registered with Cinnabot!");
    return res.render('pages/register_success', {
        title: 'Home'
    });
});

module.exports = router;