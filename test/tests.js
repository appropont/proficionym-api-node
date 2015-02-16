var should = require('chai').should(); //actually call the function

//Example test
describe('Array', function(){
  describe('#indexOf()', function(){
    it('should return -1 when the value is not present', function(){
      ([1,2,3].indexOf(5)).should.equal(-1);
    })
  })
})