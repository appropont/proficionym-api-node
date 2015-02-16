var Promise 	  = require('bluebird'),
	//failed to promisify xml2js (not sure if by own error or by bug in either lib)
	parseXML 	  = require('xml2js').parseString;

var synonyms = {
	getSynonyms : function(word) {
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
				    	var parsedSynonyms = _parseSynonymsXML(result);
				    	if(parsedSynonyms.error) {
				    		reject(parsedSynonyms.error);
				    	}

			    		resolve(parsedSynonyms);
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

				console.log('rawSynonyms fails validation');
				return {error: '_mapRawSynonyms: rawSynonyms fails validation'};
		}

		//an entry differentiates between words by type like noun or verb
		var entries = [];
		var entryCount = rawSynonyms.entry_list.entry.length;
		for(var i = 0; i < entryCount; i++) {
			var rawEntry = rawSynonyms.entry_list.entry[i];

			var entry = {};
			entry.wordType = rawEntry.fl[0];

			var senses = [];
			var senseCount  = rawEntry.sens.length;
			for(var j = 0; j < senseCount; j++) {
				var rawSense = rawEntry.sens[j];

				//Checking for valid Sense. 
				//  The API sometimes returns invalid Senses mixed with valid ones (investigate why)
				if(!rawSense) {
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
				var relWords = _extractKeywords(rel);
				var synWords = _extractKeywords(syn);
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
			//remove square brackets
			.replace(/(\[\])/g, '')
			//remove hyphens
			.replace(/(-)/g, '')
			//use commas to split words into an array
			.split(',');
	}
};

exports = synonyms;