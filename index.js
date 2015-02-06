var express = require('express');
var app = express();
require('./apikeys');
 
app.get('/', function(req, res) {
    res.send(json.stringify({
    	name : 'Proficionym API',
    	version : "0.0.1"
    }));
});
 
app.get('/query/:word', function(req, res) {
    res.send(req.params.word + apikeys.namecheap.apiUser);
});
 
app.listen(3000);
console.log('Listening on port 3000...'); 