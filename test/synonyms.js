var should = require('chai').should(),
    synonyms = require('../service/synonyms');

describe('Synonyms', function() {

    it('should be defined', function() {
        should.exist(synonyms);
    });

});


describe('Synonyms._extractKeywords', function() {

    it('should be defined', function() {
        should.exist(synonyms._extractKeywords);
    });

    it('should remove whitespace', function() {
        var keywords = synonyms._extractKeywords('a test string\n');
        keywords.should.have.length(1);
        keywords[0].should.equal('ateststring');
    });

    it('should remove parentheses and words in them', function() {
        var keywords = synonyms._extractKeywords('ateststring(testing)');
        keywords.should.have.length(1);
        keywords[0].should.equal('ateststring');
    });

    it('should remove empty square brackets', function() {
        var keywords = synonyms._extractKeywords('ateststring[]');
        keywords.should.have.length(1);
        keywords[0].should.equal('ateststring');
    });

    it('should remove hyphens', function() {
        var keywords = synonyms._extractKeywords('a-test-string');
        keywords.should.have.length(1);
        keywords[0].should.equal('ateststring');
    });

    it('should split words on commas', function() {
        var keywords = synonyms._extractKeywords('a,test,string');
        keywords.should.have.length(3);
        keywords[0].should.equal('a');
        keywords[1].should.equal('test');
        keywords[2].should.equal('string');
    });

    it('should replace semicolons with commas', function() {
        var keywords = synonyms._extractKeywords('a;test;string');
        keywords.should.have.length(3);
        keywords[0].should.equal('a');
        keywords[1].should.equal('test');
        keywords[2].should.equal('string');
    });

});

describe('Synonyms._parseSynonymsXML', function() {

    it('should be defined', function() {
        should.exist(synonyms._parseSynonymsXML);
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

        result.should.have.length(1);
        result[0].should.have.property('wordType', 'noun');
        result[0].should.have.property('senses');
        result[0].senses.should.have.length(1);
        result[0].senses[0].should.have.property('meaning', 'test meaning');
        result[0].senses[0].should.have.property('words');
        result[0].senses[0].words.should.have.length(8);

    });

});

describe('Synonyms._synonymsList', function() {

    it('should be defined', function() {
        should.exist(synonyms._synonymsList);
    });

    it('should parse a properly formatted object and dedupe words', function() {
        var testSynonyms = [
            {
                wordType : 'noun',
                senses : [
                    {
                        meaning : 'A test meaning',
                        words : [
                            'test',
                            'guard',
                            'sentinel'
                        ]
                    }
                ]
            },
            {
                wordType : 'verb',
                senses : [
                    {
                        meaning : 'Another meaning',
                        words : [
                            'test',
                            'annoy',
                            'try'
                        ]
                    }
                ]
            }
        ];
        var result = synonyms._synonymsList(testSynonyms);
        result.should.have.length(5);
    })
});

describe('Synonyms.getSynonyms', function() {

    it('should be defined', function() {
        should.exist(synonyms.getSynonyms);
    });

    it('should resolve empty when given a non-existent word', function(done) {

        synonyms.getSynonyms('testtest')
            .then(function(result) {
                result.should.be.an('array').with.length(1);
                done();
            })
            .error(function(error) {
                should.not.exist(error);
                done();
            });

    });

    it('should resolve when given a legitimate word', function(done) {

        synonyms.getSynonyms('test')
            .then(function(result) {
                should.exist(result);
                //Kind of a brittle test. It will break when they add a new word. How often does that happen?
                result.should.be.an('array').with.length(72);
                done();
            })
            .error(function(error) {
                should.not.exist(error);
                done();
            });

    });
});