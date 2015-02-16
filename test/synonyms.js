var should = require('chai').should(), //actually call the function
	synonyms = require('../service/synonyms');



//Example test
describe('Array', function(){
  describe('#indexOf()', function(){
    it('should return -1 when the value is not present', function(){
      (-1).should.equal(-2);
    })
  })
});

describe('Synonyms', function(){
    it('should be defined', function(){
        synonyms.should.not.equal(undefined);
    })
});