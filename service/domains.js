/*
 * External Dependencies
 */
var Promise 	  = require('bluebird'),
	//failed to promisify xml2js (not sure if by own error or by bug in either lib)
	parseXML 	  = require('xml2js').parseString,
	validator 	  = require('validator'),
	request 	  = require('request'),
	whois 		  = require('whois'),
	async		  = require('async');

var domains = {
    isDomainAvailable : function(domain) {
    return new Promise(function(resolve, reject) {
        whois.lookup(domain, {follow: 0/*, verbose: true*/}, function(err, data) {
            if(err) {
                console.log(err);
                reject({domain: domain, error: err, response: data});
            } else {
                var availableRegex = /No match for domain "(.*)"/g,
                    unavailableRegex = /Domain Name: (.*)\n/g,
                    unavailableRegexAlt = /Domain Name: (.*)\r\n/g,
                    unavailableRegexAlt2 = /Domain Name:(.*)\r\n/g;

                var domainResponse = {
                    domain : domain
                };
                if(data.search(availableRegex) > -1) {
                    domainResponse.status = "available";
                } else if(
                        data.search(unavailableRegex) > -1 ||
                        data.search(unavailableRegexAlt) > -1 ||
                        data.search(unavailableRegexAlt2) > -1
                    ) {
                    domainResponse.status = "registered";
                } else {
                    domainResponse.status = "error";
                }

                resolve(domainResponse);
            }
        });
    });
}
};

module.exports = domains;