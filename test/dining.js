/* jshint expr:true */
/* jshint loopfunc:true */
var chai = require('chai');
var rewire = require('rewire');
var app = require('../app');
var util = require('../lib/util');
var db = require('../lib/db');
var BPromise = require('bluebird');

var dining = rewire('../lib/dining');

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

function notInvalid(retObj) {
    expect(retObj.text.startsWith('Hey we didn\'t understand you!')).to.be.false;
}

describe('dining', function() {
    'use strict';
    this.slow(5000);

    describe("unregistered users", function() {
            it('check case for not registered', function(done) {
            msg.text = '/dining';
            app.testInput(msg, retObj => {
                expect(retObj.text).to.equal('Sorry you\'re not registered. Type /register to register.');
                done();
            });
        });
    });

    describe("registered users", function() {

            before(function(done) {
                var userStmt = db.getUserStmt();
                userStmt.run(new Date(), 8080, 'A000X', 'test_user', 'test@cinnabot.com', 'Male', '1', 'QWERTY');
                done();
            });

            it('check case for registered', function(done) {
                msg.chat.id = 8080;
                msg.text = '/dining';
                app.testInput(msg, retObj => {
                    expect(retObj.text.startsWith('*Cinnabot Dining Service')).to.be.true;
                    done();
                });
            });
            describe("give ratings thread", function(){
                it('check case for give ratings:ask_when', function(done) {
                    msg.chat.id = 8080;
                    msg.text = 'Rate Food';    
                    app.testInput(msg, retObj => {
                        expect(retObj.text.startsWith('When did you eat?')).to.be.true;
                        done();
                    });
                });
                it('check case for give ratings:ask_where', function(done) {
                    msg.chat.id = 8080;
                    msg.text = 'Breakfast';
                    app.testInput(msg, retObj => {
                        expect(retObj.text.startsWith('Which stall?')).to.be.true;
                        done();
                    });
                });
                it('check case for give ratings:ask_how', function(done) {
                    msg.chat.id = 8080;
                    msg.text = 'Asian';
                    app.testInput(msg, retObj => {
                        expect(retObj.text.startsWith('How was it?')).to.be.true;
                        done();
                    });
                });
                it('check case for give ratings:ask_feedback', function(done) {
                    msg.chat.id = 8080;
                    msg.text = '👍👍';
                    app.testInput(msg, retObj => {
                        expect(retObj.text.startsWith('Any additional comments?')).to.be.true;
                        done();
                    });
                });
                it('check case for give ratings:end', function(done) {
                    msg.chat.id = 8080;
                    msg.text = 'The food is awesome/done';
                    app.testInput(msg, retObj => {
                        expect(retObj.text.startsWith('Thanks!')).to.be.true;
                        done();
                    });
                });
            });

            describe("check ratings thread", function(){

                it('start thread', function(done) {
                    msg.chat.id = 8080;
                    msg.text = '/dining';
                    app.testInput(msg, retObj => {
                        expect(retObj.text.startsWith('*Cinnabot Dining Service')).to.be.true;
                        done();
                    });
                });
                it('check for rating', function(done) {
                    msg.chat.id = 8080;
                    msg.text = 'View Ratings';
                    app.testInput(msg, retObj => {
                        console.log(retObj);
                        expect(retObj.text.startsWith('*Food Rating for')).to.be.true;
                        done();
                    });
                });
            });

            
            

    });
});
