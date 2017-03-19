var apikeys = {
    "thesaurus": process.env.THESAURUS_API_KEY,
    "wordnik": process.env.WORDNIK_API_KEY
};
var Promise 	  = require('bluebird'),
	request 	  = require('request'),
	//failed to promisify xml2js (not sure if by own error or by bug in either lib)
	parseXML 	  = require('xml2js').parseString;

var redis         = require("redis"),
    redisClient   = redis.createClient(process.env.REDIS_URL);

redisClient.on("error", function (err) {
    console.log("Redis Error: ", err);
});

var synonyms = {
    getSynonyms : function(word) {
        var self = this;
        return new Promise(function(resolve, reject) {

            var synonymsList = [];

            //check if synonym exists in cache
            var getCachedSynonymsPromise = self._getCachedSynonyms(word);

            //Handle cache repsonse
            var apiPromise = getCachedSynonymsPromise.then(function(result) {
                    if(!result) {
                        //No cached synonyms found so make api request
                        return Promise.all([
                            self._makeApiRequest(word), 
                            self._makeWordnikApiRequest(word)
                        ]);
                    }
                    //Cached synonyms found
                    resolve(result);
                })
                .error(function(err) {
                    reject(err);
                })
                //handle the all or continue passing along the empty result
                .then(function(result) {
                    if(result) {
                        //console.log('wordnik api request', result);
                        var joinedSynonyms = result[0]
                            .concat(result[1])
                            .sort()
                            .filter(function(item, pos, arr) {
                                return !pos || item !== arr[pos - 1];
                            });
                        return joinedSynonyms;
                    }
                }, function(err) {
                    reject(err);
                });

            //Handle Api Response
            var setCachedSynonymsPromise = apiPromise.then(function(result) {
                    //check for result to see if apiRequest was even made. this fix works, but seems hacky
                    if(result) {
                        synonymsList = result;
                        return self._setCachedSynonyms(word, result);
                    }
                })
                .error(function(err) {
                    reject(err);
                });

            //Handle setting cache response
            setCachedSynonymsPromise.then(function(result) {
                    if(result) {
                        //console.log('success setting cached synonyms: ', result);
                    } else {
                        //console.log('results already cached');
                    }
                })
                .error(function(err) {
                    //console.log('error setting cached synonyms: ', err);
                })
                .finally(function() {
                    resolve(synonymsList);
                });

            
        });
    },

    /*
     * Utility Methods
     * These methods below are exposed for unit testing purposes only
     */

    _makeApiRequest : function(word) {

        var self = this;

        return new Promise(function(resolve, reject) {
            //word was not in cache
            var url = 
                'http://www.dictionaryapi.com/api/v1/references/thesaurus/xml/' +
                word +
                '?key=' +
                apikeys.thesaurus;

            request(url, function(error, response, body) {
                if(error) {
                    resolve([]);
                    return;
                }
                parseXML(body, function(error, result) {
                    if(error) {
                        resolve([]);
                        return;
                    } else {
                        if(result.suggestion || result.entry_list.suggestion) {
                            resolve([]);
                            return;
                        }
                        var parsedSynonyms = self._parseSynonymsXML(result);
                        if(parsedSynonyms.error) {
                            resolve([]);
                            return;
                        }

                        var synonymsList = self._synonymsList(parsedSynonyms);
                        resolve(synonymsList);
                    }
                })
            });
        });
    },

    _makeWordnikApiRequest : function(word) {

        var self = this;

        return new Promise(function(resolve, reject) {
            //word was not in cache
            var url =
                'http://api.wordnik.com:80/v4/word.json/' +
                word +
                '/relatedWords?useCanonical=false&limitPerRelationshipType=100&api_key=' +
                apikeys.wordnik;

            request(url, function(error, response, body) {
                if(error) {
                    //console.log('Wordnik api error: ', error);
                    resolve([]);
                    return;
                }
                //parsing the json from wordnik is so much easier
                //console.log('Wordnik Response: ', body);
                const rawWords = self._parseWordnikResults(self._parseRawWordnikBody(body));
                resolve(rawWords.map((word) => {
                    var keywords = self._extractKeywords(word);
                    if(Array.isArray(keywords) && keywords.length === 1) {
                        keywords = keywords[0];
                    }
                    return keywords;
                }));
            });
        });
    },

    _parseRawWordnikBody : function(body) {
        try {
            return JSON.parse(body);
        } catch(e) {
            //console.log('Error parsing raw wordnik body');
            return [];
        }
    },

    _parseWordnikResults : function(results) {
        // hash table for fast lookups
        var wantedRelationshipTypes = {
            "verb-form": true,
            "hypernym": true,
            "etymologically-related-term": true,
            "variant": true,
            "same-context": true,
            "synonym": true
        };
        var words = [];
        for(var i = 0; i < results.length; i++) {
            if(wantedRelationshipTypes[results[i].relationshipType] === true) {
                words = words.concat(results[i].words);
            }
        }
        return words;
    },

    _getCachedSynonyms : function(word) {
        return new Promise(function(resolve, reject) {
            redisClient.get('synonyms:' + word, function(err, result) {
                if(err) {
                    reject(err);
                } else if(result) {
                    //results are stored in redis as a string. Need to blow it up into array
                    var resultArray = result.split(',');
                    resolve(resultArray);
                } else {
                    resolve(false);
                }
            });
        });
    },

    _setCachedSynonyms : function(word, synonyms) {
        return new Promise(function(resolve, reject) {  
            //cache synonyms results
            redisClient.set('synonyms:' + word, synonyms.join(), function(err, result) {
                if(err) {
                    reject(err);
                } else if(result) {
                    var secondsPerDay = 60 * 60 * 24;
                    var ttlDays = 180;
                    var ttl = ttlDays * secondsPerDay;
                    redisClient.expire('synonyms:' + word, ttl, function(err, res) {
                        //console.log('expire err:', err);
                        //console.log('expire result: ', res);
                    });
                    resolve(result);
                } else {
                    reject('Redis: Unkown error caching synonymsList');
                }
            });
        });
    },

    //this method returns an object of mapped data, or an object with an error property
    _parseSynonymsXML : function(rawSynonyms) {
        //check for needed properties
        if( !rawSynonyms || 
            !rawSynonyms.entry_list || 
            !rawSynonyms.entry_list.entry || 
            rawSynonyms.entry_list.entry.length == 0 ) {

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
        return str.toLowerCase()
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
            //remove apostrophes
            .replace(/(')/g, '')
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