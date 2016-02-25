var chai = require('chai');
var config = require('../private/config.json');

var expect = chai.expect;

describe('config', function() {
    it('should have mode set to TEST', function() {
        expect(config.MODE).to.equal('TEST');
    });

    it('should have at least one admin id', function() {
        expect(config.ADMINS).to.be.a('array');
        expect(config.ADMINS.length).to.be.above(0);
    });

    it('should have a URL', function() {
        expect(config.URL).to.exist;
    });

    it('should have a IVLE Api Key', function() {
        expect(config.IVLE.APIKey).to.exist;
    });

    it('should have a LTA key', function() {
        expect(config.LTA.AccountKey).to.exist;
        expect(config.LTA.UniqueUserID).to.exist;
    });

    it('should have a NEA Key', function() {
        expect(config.NEA.key).to.exist;
    });

    it('should have a Telegram Token', function() {
        expect(config.TELEGRAM.token).to.exist;
    });
});