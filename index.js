require('./apikeys');
require('nodetime').profile({
    accountKey: apikeys.nodetime, 
    appName: 'Proficionym API'
  });

/*
 * External Dependencies
 */
var express 	  = require('express'),
	Promise 	  = require('bluebird'),
	//failed to promisify xml2js (not sure if by own error or by bug in either lib)
	parseXML 	  = require('xml2js').parseString,
	validator 	  = require('validator'),
	request 	  = require('request'),
	jsonStringify = require('json-stringify-safe'),
	whois 		  = require('node-whois'),
	async		  = require('async');

/*
 * Internal Dependencies
 */
var synonyms = require('./service/synonyms'),
	domains  = require('./service/domains');

/*
 * Environment Variables
 */
var accessControlOrigin = '*';

/*
 * init
 */
var app = express();

/*
 * Routes
 */
app.get('/', function(req, res) {
	var response = jsonStringify({
    	name : 'Proficionym API',
    	version : '0.0.1'
    });
	res.writeHead(200, {
	    'Content-Type': 'application/json',
	    'Content-Length': Buffer.byteLength(response, 'utf8'),
		'Access-Control-Allow-Origin' : accessControlOrigin
	});
	res.write(response);
	res.end();
});

app.get('/synonyms/:word', function(req, res) {
	var word = req.params.word;
	if(!validator.isAlpha(word)) {
		var error = {
			error : 'Invalid Parameter',
			description : 'The word you look up must be a single word with no numbers or punctuation.'
		}
		res.send(jsonStringify(error));
		return;
	}

	var tld = 'com';
	if(req.query.tld && validator.isAlpha(req.query.tld)) {
		tld = req.query.tld;
	}
	var prefix = '';
	if(req.query.prefix && validator.isAlphanumeric(req.query.prefix)) {
		prefix = req.query.prefix;
	}
	var suffix = '';
	if(req.query.suffix && validator.isAlphanumeric(req.query.suffix)) {
		suffix = req.query.suffix;
	}


	var clientAddress = (req.headers['x-forwarded-for'] || '').split(',')[0] || req.connection.remoteAddress;

	synonyms.getSynonyms(word)
		.then(function(synonyms) {
			var result = jsonStringify(_synonymsList(synonyms));
			res.writeHead(200, {
		    	'Content-Type': 'application/json',
			    'Content-Length': Buffer.byteLength(result, 'utf8'),
				'Access-Control-Allow-Origin' : accessControlOrigin
			});
			res.write(result);
			res.end();
		})
		.error(function(error) {
			var err = jsonStringify({
				error : error
			});
			res.writeHead(400, {
			    'Content-Type': 'application/json',
			    'Content-Length': Buffer.byteLength(err, 'utf8'),
				'Access-Control-Allow-Origin' : accessControlOrigin
			});
			res.write(err);
			res.end();
		});
});


app.get('/whois/:domain', function(req, res) {
	var domain = req.params.domain;
	//validate domain
	//TODO

	domains.isDomainAvailable(domain)
		.then(function(domainResponse) {
			var result = jsonStringify(domainResponse);
			res.writeHead(200, {
		    	'Content-Type': 'application/json',
			    'Content-Length': Buffer.byteLength(result, 'utf8'),
				'Access-Control-Allow-Origin' : accessControlOrigin
			});
			res.write(result);
			res.end();
		})
		.error(function(error) {
			var err = jsonStringify({
				error : error
			});
			res.writeHead(400, {
			    'Content-Type': 'application/json',
			    'Content-Length': Buffer.byteLength(err, 'utf8'),
				'Access-Control-Allow-Origin' : accessControlOrigin
			});
			res.write(err);
			res.end();
		});

});

/*
 * Utility Methods
 */

//Takes in a synonyms array.
/*
	synonyms[] {
		wordType : ...
		senses[] : {
			meaning : ...
			words[] : ...
		}
	}
*/
function _synonymsList(synonyms) {
	//storing domains as a hash 
	var synonymsHash = {};

	//so many loops. caching lengths to squeeze performance a bit.
	var synonymsCount = synonyms.length;
	for(var i = 0; i < synonymsCount; i++) {
		var synonymSet = synonyms[i]
		var senseCount = synonymSet.senses.length;
		for(var j = 0; j < senseCount; j++) {
			var sense = synonymSet.senses[j];

			var wordCount = sense.words.length;
			for(var k = 0; k < wordCount; k++) {
				var synonym = sense.words[k];
				//console.log(fullDomain);
				synonymsHash[synonym] = true;
			}
		}
	}

	var result = [], prop, i;

    for (prop in synonymsHash) {
        if (hasOwnProperty.call(synonymsHash, prop)) {
            result.push(prop);
        }
    }

	return result;
}
 
/*
 * Start Server
 */
app.listen(3000);
console.log('Listening on port 3000...');

