/* jshint expr:true */
/* jshint loopfunc:true */
var chai = require('chai');
var rewire = require('rewire');

var cinnamon = rewire('../lib/cinnamon');

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

describe('cinnamon', function() {
    'use strict';
    this.slow(5000);
    this.timeout(10000);

    var spaceIds = {1: 'Theme Room 1', 2: 'Theme Room 2', 3: 'CTPH', 4: 'Amphitheatre', 6: 'Chatterbox'};
    for (let spaceId in spaceIds) {
        let id = parseInt(spaceId);
        let name = spaceIds[spaceId];
        it('should return spaces information for ' + name, function(done) {
            cinnamon.getSpaces(id, function(msg) {
                expect(msg.startsWith(name)).to.be.true;
                done();
            });
        });
    }
});
