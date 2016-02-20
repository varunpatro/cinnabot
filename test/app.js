var chai = require('chai');
var app = require('../app');
var expect = chai.expect;


describe('app', function() {
    var msg = {
        chat: {
            id: 1,
            username: "cinnabot_is_cool",
            first_name: "Mr",
            last_name: "User"
        },
        from: {
            id: 1,
            username: "cinnabot_is_cool",
            first_name: "Mr",
            last_name: "User"
        },
        text: "/cancel"
    };

    it('should export a method for testing', function() {
        expect(app.testInput).to.be.a('function');
    });

    it('should cancel any command', function() {
        msg.text = '/cancel';
        app.testInput(msg, retObj => {
            expect(retObj.chatId).to.equal(msg.chat.id);
            expect(retObj.text).to.equal('Your command has been *canceled*.');
        });
    });
});
