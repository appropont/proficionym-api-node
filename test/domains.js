var should = require('chai').should(),
	domains = require('../service/domains');

describe('Domains', function() {

    it('should be defined', function() {
        should.exist(domains);
    });

});

describe('Domains.isDomainAvailable', function() {

	it('should be defined', function() {
		should.exist(domains.isDomainAvailable);
	});

	it('should resolve "google.com" with a status of registered', function(done) {
		domains.isDomainAvailable('google.com')
			.then(function(result) {
				should.exist(result);
				result.should.have.property('domain', 'google.com');
				result.should.have.property('status', 'registered');
				done();
			})
			.error(function(error) {
				should.not.exist(error);
				done();
			});
	});

	it('should resolve "google.google" with a status of error', function(done) {
		domains.isDomainAvailable('google.google')
			.then(function(result) {
				should.exist(result);
				result.should.have.property('domain', 'google.google');
				result.should.have.property('status', 'error');
				done();
			})
			.error(function(error) {
				should.not.exist(error);
				done();
			});
	});



	it('should resolve "test123test789.com" with a status of available', function(done) {
		domains.isDomainAvailable('test123test789.com')
			.then(function(result) {
				should.exist(result);
				result.should.have.property('domain', 'test123test789.com');
				result.should.have.property('status', 'available');
				done();
			})
			.error(function(error) {
				should.not.exist(error);
				done();
			});
	});

});