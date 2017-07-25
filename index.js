
var express = require('express');
var path = require('path');
var bodyParser = require('body-parser');
require('dotenv').config();

var api = require('./routes/api');


var port = 9000;


var app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

app.use('/api', api);

app.listen(port, function(){

    console.log('Server started on port ' + port);
})