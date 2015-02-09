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
	jsonStringify = require('json-stringify-safe'),
	exec 		  = require('child_process').exec,
	whois 		  = require('node-whois'),
	async		  = require('async');
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

	_isDomainAvailable(domain)
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
		.error(function(err) {
			var err = jsonStringify({
				error : err
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

function _isDomainAvailable(domain) {
	return new Promise(function(resolve, reject) {
		whois.lookup(domain, {follow: 0/*, verbose: true*/}, function(err, data) {
			if(err) {
				console.log(err);
				console.log(data);
				reject({domain: domain, error: err, response: data});
			} else {
		        console.log(data);
		        var availableRegex = /No match for domain "(.*)".\n/g,
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
		        	//console.log('------------------- Unmatched Response --------------------');
		        	//console.log(data);
		        	domainResponse.status = "error";
		        }
		        domainResponse.data = data;
		        resolve(domainResponse);
		    }
	    });
	});
}
/*
function _isDomainAvailableShell(domain) {
	return new Promise(function(resolve, reject) {
		exec('whois ' + domain, function(err, stdout, stderr) {
			if(err) {
				console.log(err);
				reject({domain: domain, error: err, response: stdout});
			} else {
		        console.log(stdout);
		        var availableRegex = /No match for domain "(.*)".\n/g;
		        var unavailableRegex = /Domain Name: (.*)\r\n/g;

		        var domainResponse = {
		        	domain : domain
		        };
		        if(stdout.search(availableRegex) > -1) {
		        	domainResponse.status = "available";
		        } else if(stdout.search(unavailableRegex) !== -1) {
		        	domainResponse.status = "registered";
		        } else {
		        	//console.log('------------------- Unmatched Response --------------------');
		        	//console.log(data);
		        	domainResponse.status = "error";
		        }
		        //domainResponse.data = data;
		        resolve(domainResponse);
		    }
	    });
	});
}*/


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
	var startTime = Date.now();
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

	var elapsedTime = Date.now() - startTime;
	console.log("_synonymsList elapsed time: " + elapsedTime);

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

