require('../apikeys');

var Promise 	  = require('bluebird'),
	request 	  = require('request'),
	//failed to promisify xml2js (not sure if by own error or by bug in either lib)
	parseXML 	  = require('xml2js').parseString;

var synonyms = {
	getSynonyms : function(word) {
		var self = this;
		return new Promise(function(resolve, reject) {
			var url = 
				'http://www.dictionaryapi.com/api/v1/references/thesaurus/xml/' +
				word +
				'?key=' +
				apikeys.thesaurus;

			request(url, function(error, response, body) {
			    if(error) {
			  		reject(error);
			  		return;
			    }
			    parseXML(body, function(error, result) {
			    	if(error) {
			    		reject(error);
			    		return;
			    	} else {
			    		if(result.suggestion || result.entry_list.suggestion) {
			    			reject({error: 'Synonyms not found. Please check your spelling.'});
			    		}
				    	var parsedSynonyms = self._parseSynonymsXML(result);
				    	if(parsedSynonyms.error) {
				    		reject(parsedSynonyms);
				    	}

			    		resolve(self._synonymsList(parsedSynonyms));
			    	}
		    	})
			});
		});
	},

	/*
	 * Utility Methods
	 * These methods below are exposed for unit testing purposes only
	 */

	//this method returns an object of mapped data, or an object with an error property
	_parseSynonymsXML : function(rawSynonyms) {
		//check for needed properties
		if( !rawSynonyms || 
			!rawSynonyms.entry_list || 
			!rawSynonyms.entry_list.entry || 
			rawSynonyms.entry_list.entry.length == 0 ) {

				//console.log('rawSynonyms fails validation');
				return {error: '_mapRawSynonyms: rawSynonyms fails validation'};
		}

		//an entry differentiates between words by type like noun or verb
		var entries = [];
		var entryCount = rawSynonyms.entry_list.entry.length;
		for(var i = 0; i < entryCount; i++) {
			var rawEntry = rawSynonyms.entry_list.entry[i];

			var entry = {};
			entry.wordType = rawEntry.fl;

			var senses = [];
			var senseCount  = rawEntry.sens.length;
			for(var j = 0; j < senseCount; j++) {
				var rawSense = rawEntry.sens[j];

				//Checking for valid Sense.
				//  The API sometimes returns invalid Senses mixed with valid ones (investigate why)
				if( !rawSense || 
					!rawSense.mc || 
					!rawSense.mc.length || 
					!rawSense.rel || 
					!rawSense.rel.length || 
					!rawSense.syn || 
					!rawSense.syn.length) {
					//console.log('rawSense is null. senseCount: ', senseCount, ' j: ', j, ' i: ', i);
					continue;
				}

				var sense = {};
				sense.meaning = rawSense.mc[0];

				var rel = rawSense.rel[0];
				if(rel._) {
					rel = rel._;
				}
				var syn = rawSense.syn[0];
				if(syn._) {
					syn = syn._;
				}
				var relWords = this._extractKeywords(rel);
				var synWords = this._extractKeywords(syn);
				sense.words = synWords.concat(relWords);

				senses.push(sense);
			}
			entry.senses = senses;

			entries.push(entry);
		}

		return entries;
	},

	_extractKeywords : function(str) {
		return str
			//remove whitespace
			.replace(/(\s)/g, '')
			//remove parentheses and words in them
			.replace(/(\(.*\))/g, '')
			//replace semicolons with commas
			.replace(/([;])/g, ',')
			//remove square brackets (are they empty? I forget the format that caused this check to be necessary)
			.replace(/(\[\])/g, '')
			//remove hyphens
			.replace(/(-)/g, '')
			//use commas to split words into an array
			.split(',');
	},

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
	_synonymsList : function(synonyms) {
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
};

module.exports = synonyms;