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

    it('should error on non-object', function() {
    	var result = synonyms._parseSynonymsXML('not xml');
    	result.should.have.property('error');
    });

    it('should error on an invalid object', function() {
    	var result = synonyms._parseSynonymsXML({test: 'test'});
    	result.should.have.property('error');
    });

    it('should return a properly formatted array of objects from a mock valid input', function() {
    	var validInput = {
    		entry_list : {
    			entry : [
    				{	
    					fl : 'noun',
    					sens : [
    						{
	    						mc : ['test meaning'],
	    						rel : ['words,separated,by,commas'],
	    						syn : ['more,commas,separated,values']
	    					}
    					]
    				}
    			]
    		}
    	};

    	var result = synonyms._parseSynonymsXML(validInput);


    	console.log('result', result);

    	result.length.should.equal(1);
    	result[0].should.have.property('wordType', 'noun');
    	result[0].should.have.property('senses');
    	result[0].senses.length.should.equal(1);
    	result[0].senses[0].should.have.property('meaning', 'test meaning');
    	result[0].senses[0].should.have.property('words');
    	result[0].senses[0].words.length.should.equal(8);

    });

});

describe('Synonyms.getSynonyms', function() {

	it('should be defined', function() {
		synonyms.getSynonyms.should.not.equal(undefined);
	});

	it('should reject when given a non-existent word', function() {

		synonyms.getSynonyms('testtest')
			.then(function(result) {
				should.not.exist(result);
				done();
			})
			.error(function(error) {
				should.exist(error);
				done();
			});

	});

	it('should resolve when given a legitimate word', function() {

		synonyms.getSynonyms('test')
			.then(function(result) {
				should.exist(result);
				result.should.be.an('array').with.length(2);
				done();
			})
			.error(function(error) {
				should.not.exist(error);
				done();
			});
			
	});
});