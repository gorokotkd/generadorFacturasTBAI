var express = require('express');

var bodyParser = require('body-parser');

var app = express();

var routes = require('./routes/routes');
/*
app.use(bodyParser.urlencoded({extended:false}));
app.use(bodyParser.json());*/


app.use('/', routes);


module.exports = app;