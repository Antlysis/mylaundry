var http = require('http');
var express = require('express');
var fs = require("fs");
var myParser = require("body-parser");
var app = express();
var fetch = require('node-fetch');
var base64 =  require('base-64');

var mqtt = require('mqtt');
var mqttClient = mqtt.connect('mqtt://localhost:1883');
app.use(myParser.urlencoded({extended : true}));
app.use(myParser.json());

app.use((req, res, next) => {
	        res.setHeader('Access-Control-Allow-Origin', '*');
	        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
	        res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
	        res.setHeader('Access-Control-Allow-Credentials', true);
	        next();
});

function onMachine(machine_no, money) {
	mqttClient.publish(machine_no, money)
}

app.use(express['static'](__dirname ));
app.set('view engine', 'pug');
// Express route for incoming requests for a customer name
//app.get('/:machine/:money', function(req, res, next) {
//	//res.sendfile('test.html', {output: req.params.id});
//	//res.status(200).send('received payment' + req.params.money);
//	console.log(req.params.id)
//	console.log(req.params.money)
//	res.render('index', { machine: req.params.machine, money: req.params.money});
//	onMachine(req.params.machine, req.params.money)
//});

var authToken = {apiKey: "M9UAUUQQ4SNOWMMOVM68QJYGLF", apiSecret: "3818c390-b5da-41ec-8cc2-caec97ea0c51"};
var clientID = "8559245238100648952"
var clientSecret = "nalDIAIZfMqMuKTvCksbplSNWhUUQIKI"
console.log(base64.encode(clientID + ":" + clientSecret))
function requestToken() {
	return 	fetch('https://sb-oauth.revenuemonster.my/v1/token', {
	  		method: 'POST',
	  		body: {'grantType': 'auth_code'},
	  		headers: {'Content-Type': 'application/json', 'Authorization': 'Basic ' + base64.encode(clientID + ":" + clientSecret)}
      		}).then(res => res.json())
		.catch(error => console.error('Error:', error))
		.then(response => console.log('Success:', response))
}
requestToken()

app.post('/transact/pay', function(req, res) {
	//var data = req.body 
	//var posid = data.posid
	console.log("its been called")
	console.log(req.body)
	//var tk = requestToken();
	//console.log(tk)
	//console.log(token);
//	var myToken = requestToken().then(function(res) {
//		return res.json()
//	)}
	//console.log("machine " + data.posid +" received " + data.amount)
	//	res.render('index', {machine:req.posid, money: req.amount});	
	res.status(200).send(req.body);
});
//app.get('/', function(req, res, next) {
	  //res.sendfile('test.html', {output: req.params.id});
	  //res.status(200).send(inputs[req.params.id]);
//});

// Express route for any other unrecognised incoming requests
app.get('*', function(req, res) {
	  res.status(404).send('Unrecognised API call');
});

app.listen(80);
console.log('App Server running at port 80');

