var http = require('http');
var express = require('express');
var fs = require("fs");
var app = express();
var mqtt = require('mqtt');
var mqttClient = mqtt.connect('mqtt://localhost:1883');
var inputs = [{ pin: '11', gpio: '17', value: 1 },
	              { pin: '12', gpio: '18', value: 0 }];

app.use(express['static'](__dirname ));

// Express route for incoming requests for a customer name
app.get('/machine/:id/:money', function(req, res, next) {
	 // res.sendfile('test.html', {output: req.params.id});
	  //res.status(200).send(inputs[req.params.id]);
	console.log(req.params.id)
	console.log(req.params.money)
	mqttClient.publish(req.params.id, req.params.money)
	mqttClient.publish('payment', req.params.money)
});

//app.get('/', function(req, res, next) {
	  //res.sendfile('test.html', {output: req.params.id});
	  //res.status(200).send(inputs[req.params.id]);
//});

// Express route for any other unrecognised incoming requests
//app.get('*', function(req, res) {
//	  res.status(404).send('Unrecognised API call');
//});

// Express route to handle error
//app.use(function(err, req, res, next) {
//	  if (req.xhr) {
//		      res.status(500).send('Oops, Something went wrong!');
//		    } else {
//			        next(err);
//			      }
//});

app.listen(80);
console.log('App Server running at port 80');

