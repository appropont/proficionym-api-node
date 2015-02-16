var should = require('chai').should(),
	domains = require('../service/domains');

describe('Domains', function() {

    it('should be defined', function() {
        should.exist(domains);
    });

    it('should have the core method (isDomainAvailable)', function() {
    	should.exist(domains.isDomainAvailable);
    });

});