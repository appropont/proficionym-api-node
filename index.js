require('./apikeys');
require('nodetime').profile({
    accountKey: apikeys.nodetime, 
    appName: 'Proficionym API'
  });

/*
 * External Dependencies
 */
var express 	  = require('express'),
	validator 	  = require('validator'),
	jsonStringify = require('json-stringify-safe');

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
		var error = jsonStringify({
			error : 'Invalid Parameter',
			description : 'The word you look up must be a single word with no numbers or punctuation.'
		});
		res.writeHead(400, {
		    'Content-Type': 'application/json',
		    'Content-Length': Buffer.byteLength(error, 'utf8'),
			'Access-Control-Allow-Origin' : accessControlOrigin
		});
		res.write(error);
		res.end();
		//is return really necesary here?
		return;
	}

	synonyms.getSynonyms(word)
		.then(function(synonyms) {
			var result = jsonStringify({
				synonyms : synonyms
			});
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
				error : 'No Synonyms',
				description : error.error
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
 * Start Server
 */
app.listen(3000);
console.log('Listening on port 3000...');

