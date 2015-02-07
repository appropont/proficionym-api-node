require('./apikeys');
require('nodetime').profile({
    accountKey: apikeys.nodetime, 
    appName: 'Proficionym API'
  });

/*
 * Dependencies
 */
var express 	  = require('express'),
	Promise 	  = require('bluebird'),
	//failed to promisify xml2js
	parseXML 	  = require('xml2js').parseString,
	validator 	  = require('validator'),
	request 	  = require('request'),
	jsonStringify = require('json-stringify-safe')
	whois 		  = require('whoisclient');
/*
 * Environment Variables
 */
 
/*
 * init
 */
var app = express();

/*
 * Routes
 */
app.get('/', function(req, res) {
    res.send(jsonStringify({
    	name : 'Proficionym API',
    	version : '0.0.1'
    }));
});
 
app.get('/query/:word', function(req, res) {
	var word = req.params.word;
	//validate word
	if(!validator.isAlpha(word)) {
		var error = {
			error : 'Invalid Parameter',
			description : 'The word you look up must be a single word with no numbers or punctuation.'
		}
		res.send(jsonStringify(error));
		return;
	}

	//validate and assign url query params
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

	//begin request for synonyms
	_getSynonyms(word)
		.then(function(synonyms) {
			/*var result = jsonStringify(synonyms);
			res.writeHead(200, {
		    	'Content-Type': 'application/json',
			    'Content-Length': Buffer.byteLength(result, 'utf8')
			});
			res.write(result);
			res.end();*/
			var domains = _domainsFromSynonyms(synonyms , {
				tld : tld,
				prefix : prefix,
				suffix : suffix
			});
			return _availableDomains(domains, clientAddress);
		})
		.then(function(domains) {
			var result = jsonStringify(domains);
			res.writeHead(200, {
		    	'Content-Type': 'application/json',
			    'Content-Length': Buffer.byteLength(result, 'utf8'),
			    //Should change this to prevent abuse
				'Access-Control-Allow-Origin' : "*"
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
			  'Content-Length': Buffer.byteLength(err, 'utf8')
			});
			res.write(err);
			res.end()
		});
	

});
/*
 * Utility Methods
 */
function _getSynonyms(word) {
	var startTime = Date.now();
	return new Promise(function(resolve, reject) {
		var url = 
			'http://www.dictionaryapi.com/api/v1/references/thesaurus/xml/' +
			word +
			'?key=' +
			apikeys.thesaurus;

		request(url, function(error, response, body) {
		    if(error) {
		    	console.log('failed request')
		  		reject(error);
		  		return;
		    }
		    parseXML(body, function(error, result) {
		    	if(error) {
		    		console.log('xml parse failure');
		    		reject(error);
		    		return;
		    	} else {
			    	console.log('xml parse success');
			    	var mappedSynonyms = _mapRawSynonyms(result);
			    	if(mappedSynonyms.error) {
			    		reject(mappedSynonyms.error);
			    	}

					var elapsedTime = Date.now() - startTime;
					console.log("_getSynonyms elapsed time: " + elapsedTime);

		    		resolve(mappedSynonyms);
		    	}
	    	})
		});
	});
}

//this method returns an object of mapped data, or an object with an error property which should be checked for first when used
function _mapRawSynonyms(rawSynonyms) {
	var startTime = Date.now();
	//check for needed properties
	if(!rawSynonyms || !rawSynonyms.entry_list || !rawSynonyms.entry_list.entry || rawSynonyms.entry_list.entry.length == 0 ) {
		console.log('rawSynonyms fails validation');
		return {error: '_mapRawSynonyms: rawSynonyms fails validation'};
	}

	var entries = [];
	//an entry differentiates between words by type like noun or verb
	var entryCount = rawSynonyms.entry_list.entry.length;
	for(var i = 0; i < entryCount; i++) {
		var rawEntry = rawSynonyms.entry_list.entry[i];

		var entry = {};
		entry.wordType = rawEntry.fl[0];

		var senses = [];
		var senseCount  = rawEntry.sens.length;
		for(var j = 0; j < senseCount; j++) {
			var rawSense = rawEntry.sens[j];

			if(!rawSense) {
				console.log('rawSense is null. senseCount: ', senseCount, ' j: ', j, ' i: ', i);
				continue;
			}

			var sense = {};
			sense.meaning = rawSense.mc[0];

			//console.log('syn: ', rawSense.syn);
			//console.log('rel: ', rawSense.rel[0]);
			var rel = rawSense.rel[0];
			if(rel._) {
				rel = rel._;
			}
			var syn = rawSense.syn[0];
			if(syn._) {
				syn = syn._;
			}
			var relWords = _extractKeywords(rel);
			var synWords = _extractKeywords(syn);
			sense.words = synWords.concat(relWords);

			senses.push(sense);
		}
		entry.senses = senses;

		entries.push(entry);
	}

	var elapsedTime = Date.now() - startTime;
	console.log("_mapRawSynonyms elapsed time: " + elapsedTime);

	return entries;
}

function _extractKeywords(str) {
	return str
		//removes whitespace
		.replace(/(\s)/g, '')
		//removes parentheses and words in them
		.replace(/(\(.*\))/g, '')
		//replace semicolons with commas
		.replace(/([;])/g, ',')
		//remove square brackets
		.replace(/(\[\])/g, '')
		//use commas to split words into an array
		.split(',');
}

function _availableDomains(domains, clientAddress) {
	var startTime = Date.now();
	return new Promise(function(resolve, reject) {
		var domainsString = '';
		var count = 0
		for(var key in domains) {
			domainsString += key + ',';
			count++;
			if(count > 5){
				break;
			}
		}
		//removing dangling comma
		domainsString = domainsString.substr(0, domainsString.length - 1);

		var url = 
			'https://api.sandbox.namecheap.com/xml.response' +
			'?ApiUser='		+ apikeys.namecheap.apiUser + 
			'&ApiKey='   	+ apikeys.namecheap.sandboxKey + //apikeys.namecheap.apiKey + 
			'&UserName=' 	+ apikeys.namecheap.userName + 
			'&ClientIp=' 	+ clientAddress + 
			'&Command=namecheap.domains.check' + 
			'&DomainList='	+ domainsString;

		request(url, function(error, response, body) {
		    if(error) {
		    	console.log('failed request')
		  		reject(error);
		  		return;
		    }

			var requestTime = Date.now() - startTime;
			console.log("_availableDomains request time: " + requestTime);

		    parseXML(body, function(error, result) {
		    	if(error) {
		    		console.log('xml parse failure');
		    		reject(error);
		    		return;
		    	} else {
			    	console.log('xml parse success');

			    	var mappedDomains = _mapRawDomains(result);

					var elapsedTime = Date.now() - startTime;
					console.log("_availableDomains elapsed time: " + elapsedTime);

		    		resolve(mappedDomains);
		    	}
	    	})
		});
	});
}

function _mapRawDomains(rawDomains) {
	var startTime = Date.now();
	//console.log('ApiResponse: ', rawDomains.ApiResponse);
	//console.log('ApiResponse.Errors[0]: ', rawDomains.ApiResponse.Errors[0]);
	//console.log('CommandResponse: ', rawDomains.ApiResponse.CommandResponse);
	//console.log('DomainCheckResult: ', rawDomains.ApiResponse.CommandResponse[0].DomainCheckResult);
	//validate rawDomains
	if(!rawDomains.ApiResponse['$'] || rawDomains.ApiResponse['$'].Status === 'ERROR') {
		console.log('_mapRawDomains: rawDomains is error');
		return {error: 'error fetching domains'};
	}
	if(
		!rawDomains.ApiResponse['$'] || 
		 rawDomains.ApiResponse['$'].Status !== 'OK' || 
		!rawDomains.ApiResponse.CommandResponse ||
		 rawDomains.ApiResponse.CommandResponse.length === 0 ||
		!rawDomains.ApiResponse.CommandResponse[0].DomainCheckResult ||
		 rawDomains.ApiResponse.CommandResponse[0].DomainCheckResult.length === 0
		) {
		console.log('_mapRawDomains: rawDomains fails validation');
		return {error: 'rawDomains fails validation'};
	}

	var domainResults = rawDomains.ApiResponse.CommandResponse[0].DomainCheckResult;
	var resultCount = domainResults.length;

	var availableDomains = [],
		unavailableDomains = [],
		errorDomains = [];
	for(var i = 0; i < resultCount; i++) {
		var domainResult = domainResults[i].$;
		if(domainResult.Available === 'true') {
			availableDomains.push(domainResult.Domain);
		} else if(domainResult.ErrorNo !== '0') {
			errorDomains.push(domainResult.Domain);
		} else {
			unavailableDomains.push(domainResult.Domain);
		}
	}

	var elapsedTime = Date.now() - startTime;
	console.log("_mapRawDomains elapsed time: " + elapsedTime);

	return {available: availableDomains, errors: errorDomains, unavailable : unavailableDomains};

}

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
function _domainsFromSynonyms(synonyms, options) {
	var startTime = Date.now();
	//storing domains as a hash 
	var domains = {};

	//so many loops. caching lengths to squeeze performance a bit.
	var synonymsCount = synonyms.length;
	for(var i = 0; i < synonymsCount; i++) {
		var synonymSet = synonyms[i]
		var senseCount = synonymSet.senses.length;
		for(var j = 0; j < senseCount; j++) {
			var sense = synonymSet.senses[j];

			var wordCount = sense.words.length;
			for(var k = 0; k < wordCount; k++) {
				var domain = sense.words[k];
				var fullDomain = options.prefix + domain + options.suffix + '.' + options.tld;
				//console.log(fullDomain);
				domains[fullDomain] = true;
			}
		}
	}

	var elapsedTime = Date.now() - startTime;
	console.log("_domainsFromSynonyms elapsed time: " + elapsedTime);

	return domains;
}

function _profilerStub() {
	var res = { send : console.log, writeHead : console.log, write : console.log, end : console.log};
	var word = 'test';
	//validate word
	if(!validator.isAlpha(word)) {
		var error = {
			error : 'Invalid Parameter',
			description : 'The word you look up must be a single word with no numbers or punctuation.'
		}
		res.send(jsonStringify(error));
		return;
	}

	//validate and assign url query params
	var tld = 'com';
	var prefix = '';
	var suffix = '';

	var clientAddress = '73.181.224.108';

	//begin request for synonyms
	_getSynonyms(word)
		.then(function(synonyms) {
			/*var result = jsonStringify(synonyms);
			res.writeHead(200, {
		    	'Content-Type': 'application/json',
			    'Content-Length': Buffer.byteLength(result, 'utf8')
			});
			res.write(result);
			res.end();*/
			var domains = _domainsFromSynonyms(synonyms , {
				tld : tld,
				prefix : prefix,
				suffix : suffix
			});
			return _availableDomains(domains, clientAddress);
		})
		.then(function(domains) {
			var result = jsonStringify(domains);
			res.writeHead(200, {
		    	'Content-Type': 'application/json',
			    'Content-Length': Buffer.byteLength(result, 'utf8'),
			    //Should change this to prevent abuse
				'Access-Control-Allow-Origin' : "*"
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
			  'Content-Length': Buffer.byteLength(err, 'utf8')
			});
			res.write(err);
			res.end()
		});
}
 
/*
 * Start Server
 */
app.listen(3000);
console.log('Listening on port 3000...');

