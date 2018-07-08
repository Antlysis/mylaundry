var http = require('http');
var express = require('express');
var fs = require("fs");
var myParser = require("body-parser");
var app = express();
var fetch = require('node-fetch');
var request = require('request');

var mqtt = require('mqtt');
var mqttClient = mqtt.connect('mqtt://localhost:1883', {protocolId: 'MQIsdp', protocolVersion: 3});
app.use(myParser.urlencoded({extended : true}));
app.use(myParser.json());

app.use((req, res, next) => {
	        res.setHeader('Access-Control-Allow-Origin', '*');
	        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
	        res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
	        res.setHeader('Access-Control-Allow-Credentials', true);
	        next();
});

// mqtt setup
var myMachines = ["07038189344/connected", "07038189342/connected", "test"];
mqttClient.on('connect', function () {
	mqttClient.subscribe(myMachines)
})	
mqttClient.on('message', function (topic, message) {
	console.log(message.toString())
	console.log(topic.match(/connected/g))
	if (topic.match(/connected/g)) {
		console.log("hellow")
	}
	//mqttClient.end()
})

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
process.env.MERCHANT_ID = "";
process.env.TOKEN = '';
var authToken = {apiKey: "M9UAUUQQ4SNOWMMOVM68QJYGLF", apiSecret: "3818c390-b5da-41ec-8cc2-caec97ea0c51"};
fetch('https://stage-wallet.boostorium.com/authentication', {
	method: 'POST',
	body: JSON.stringify(authToken),
	headers: {'Content-Type': 'application/json'}
})
.then(res => res.json())
.catch(error => console.error('Error:', error))
.then(response => {
	console.log('Success:', response)
	console.log(response.apiToken)
	process.env.token = response.apiToken;
});

function ack_payment(merch_id, outlet_id, pos_id, amount, boost_ref, pos_ref) {
	var mybody = {'merchantId': merch_id, 'outletId': outlet_id, 'posId': pos_id, 'amount': amount, 'boostRefNumber': boost_ref, 'posRefNum': pos_ref};
	console.log(JSON.stringify(mybody))
	fetch('https://stage-wallet.boostorium.com/cloud/transaction/payment/ack', {
		method: 'POST',
		headers: {'Content-Type': 'application/json', 'Authorization': "Bearer " + process.env.TOKEN},
		body: JSON.stringify(mybody)
	})
	.then(res => res.json())
	.catch(error => console.error('Error:', error))
	.then(response => {
		console.log('Success:', response)
		return response.boostPaymentRefNum
	});
}
function void_trans(merch_id, pos_ref, boostPayment_ref, remark) {
	var mybody = {'merchantId': merch_id, 'posRefNum': pos_ref, 'boostPaymentRefNum': boostPayment_ref, 'remark': remark};
	fetch('https://stage-wallet.boostorium.com/cloud/transaction/void', {
		method: 'POST',
		headers: {'Content-Type': 'application/json', 'Authorization': "Bearer " + process.env.TOKEN},
		body: JSON.stringify(mybody)
	})
	.then(res => res.json())
	.catch(error => console.error('Error:', error))
	.then(response => {
		console.log('Success:', response)
	});
}

app.post('/transact/pay', function(req, res) {
	var data = req.body 
	var posid = data.posId
	console.log(process.env.token);
	console.log(req.body);
	console.log("machine " + data.posId +" received " + data.amount + "merchantId" + data.merchantId + "outletID"+ data.outletId + "boostRef" + data.boostRefNum)
	onMachine(data.posId, data.amount)
	//	res.render('index', {machine:req.posid, money: req.amount});	
	ack_payment(data.merchantId, data.outletId, data.posId, data.amount, data.boostRefNum, data.posRefNum);
	var rmk = "sorry, i just test";
	void_trans(data.merchantId, data.posRefNum, data.boostRefNum, rmk);
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
