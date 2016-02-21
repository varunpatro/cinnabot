var chai = require('chai');
var rewire = require('rewire');

var app = require('../app');
var db = require('../lib/db');
var misc = rewire('../lib/misc');

var expect = chai.expect;
var msg = {
    chat: {
        id: 1,
        username: 'cinnabot_is_cool',
        first_name: 'Mr',
        last_name: 'User'
    },
    from: {
        id: 1,
        username: 'cinnabot_is_cool',
        first_name: 'Mr',
        last_name: 'User'
    },
    text: '/cancel'
};


describe('app', function() {
    it('should export a method for testing', function() {
        expect(app.testInput).to.be.a('function');
    });

    it('should return a help message for /start', function(done) {
        msg.text = '/start';
        app.testInput(msg, retObj => {
            expect(retObj.chatId).to.equal(msg.chat.id);
            expect(retObj.text).to.equal(misc.__get__('helpMessage'));
            done();
        })
    });

    it('should cancel any command', function(done) {
        msg.text = '/cancel';
        app.testInput(msg, retObj => {
            expect(retObj.chatId).to.equal(msg.chat.id);
            expect(retObj.text).to.equal('Your command has been *canceled*.');
            done();
        });
    });


    it('should return a help message for /help', function(done) {
        msg.text = '/help';
        app.testInput(msg, retObj => {
            expect(retObj.text).to.equal(misc.__get__('helpMessage'));
            done();
        });
    });

    it('should return weather message for /psi', function(done) {
        msg.text = '/psi';
        app.testInput(msg, retObj => {
            expect(retObj.text.startsWith('*Cinnabot Weather Service*\n')).to.be.true;
            done();
        });
    });

    it('should return statistics summary for /stats', function(done) {
        msg.text = '/stats';
        app.testInput(msg, retObj => {
            expect(retObj.text.startsWith('*STATISTICS SUMMARY\n')).to.be.true;
            done();
        });
    });
});

describe('unregistered users', function() {
    it('should return useful links for /links', function(done) {
        msg.text = '/links';
        app.testInput(msg, retObj => {
            expect(retObj.text).to.equal('Sorry you\'re not registered. Type /register to register.');
            done();
        });
    });
});

describe('registered users', function() {
    before(function(done) {
        var userStmt = db.getUserStmt();
        userStmt.run(new Date(), 8080, 'A000X', 'test_user', 'test@cinnabot.com', 'Male', '1', 'QWERTY');
        done();
    });

    it('should return useful links for /links', function(done) {
        msg.chat.id = 8080;
        msg.text = '/links';
        app.testInput(msg, retObj => {
            expect(retObj.text.startsWith('USEFUL LINKS:\n')).to.be.true;
            done();
        });
    });

    after(function(done) {
        // TODO: Remove the user from the db 
        done();
    });
});
