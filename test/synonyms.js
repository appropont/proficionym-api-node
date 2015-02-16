var should = require('chai').should(),
	synonyms = require('../service/synonyms');

describe('Synonyms', function() {

    it('should be defined', function() {
        synonyms.should.not.equal(undefined);
    });

    it('should have the core method (getSynonyms)', function() {
    	synonyms.getSynonyms.should.not.equal(undefined);
    });

});


describe('Synonyms._extractKeywords', function() {

    it('should be defined', function() {
    	synonyms._extractKeywords.should.not.equal(undefined);
    });

    it('should remove whitespace', function() {
    	var keywords = synonyms._extractKeywords('a test string\n');
    	keywords.length.should.equal(1);
    	keywords[0].should.equal('ateststring');
    });

    it('should remove parentheses and words in them', function() {
    	var keywords = synonyms._extractKeywords('ateststring(testing)');
    	keywords.length.should.equal(1);
    	keywords[0].should.equal('ateststring');
    });

    it('should remove empty square brackets', function() {
    	var keywords = synonyms._extractKeywords('ateststring[]');
    	keywords.length.should.equal(1);
    	keywords[0].should.equal('ateststring');
    });

    it('should remove hyphens', function() {
    	var keywords = synonyms._extractKeywords('a-test-string');
    	keywords.length.should.equal(1);
    	keywords[0].should.equal('ateststring');
    });

    it('should split words on commas', function() {
    	var keywords = synonyms._extractKeywords('a,test,string');
    	keywords.length.should.equal(3);
    	keywords[0].should.equal('a');
    	keywords[1].should.equal('test');
    	keywords[2].should.equal('string');
    });

    it('should replace semicolons with commas', function() {
    	var keywords = synonyms._extractKeywords('a;test;string');
    	keywords.length.should.equal(3);
    	keywords[0].should.equal('a');
    	keywords[1].should.equal('test');
    	keywords[2].should.equal('string');
    });

});

describe('Synonyms._parseSynonymsXML', function() {

    it('should be defined', function() {
    	synonyms._parseSynonymsXML.should.not.equal(undefined);
    });

    it('should error on bad xml', function() {
    	var result = synonyms._parseSynonymsXML('not xml');
    	result.should.have.property('error');
    });

});