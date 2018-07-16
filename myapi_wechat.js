var http = require('http');
var express = require('express');
var fs = require("fs");
var myParser = require("body-parser");
var app = express();
var fetch = require('node-fetch');
var base64 =  require('base-64');
var mqtt = require('mqtt');
var mqttClient = mqtt.connect('mqtt://localhost:1883');
var querystring = require('querystring');
var fs = require('fs');
var crypto = require('crypto');

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

function getPrivateKeySomehow() {
	var privKey = fs.readFileSync('private_key.pem', 'utf8');
	console.log(">>> Private key: \n\n" + privKey);
	return privKey;
}
function getSignature(data) {
	var privateKey = getPrivateKeySomehow();
	var sign = crypto.createSign("sha256");
	sign.update(data);
	var signature = sign.sign(privateKey);
	const signature_hex = signature.toString('base64')

	console.log(">>> Signature:\n\n" + signature_hex);
	return signature;
}


app.use(express['static'](__dirname ));
process.env.AC_TOKEN = '';
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
var clientSecret = "nalDIAIZfMqMuKTvCksbplSNWhUUQIKl"
var credential_req = {"grantType": "client_credentials"} 
var credential_head = {"Authorization": "Basic " + base64.encode(clientID + ":" + clientSecret), "Content-Type":"application/json"}
console.log(base64.encode(clientID + ":" + clientSecret))

function requestToken() {
	return 	fetch('https://sb-oauth.revenuemonster.my/v1/token',
			{headers: credential_head,
			method:'POST',
			body:JSON.stringify(credential_req)
		}).then(res => res.json())
		.catch(error => console.error('Error:', error))
		.then(response => {
			console.log('Success:', response)
			process.env.AC_TOKEN = response.accessToken
			process.env.RE_TOKEN = response.refreshToken
		})
}
//requestToken()
function makeid() {
	    var text = "";
	    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
	    for(var i = 0; i < 32; i++) {
		            text += possible.charAt(Math.floor(Math.random() * possible.length));
		        }
	    return text;
}
console.log(makeid())
console.log(Math.floor(Date.now()/1000))

function generateSign(data, method, noncestr, privateKey, requestUrl, signtype, time) {
	var otStr = makeid()
	var mydata = {data, "method": method, "nonceStr":noncestr,
		   "privateKey": privateKey,"requestUrl": requestUrl,
		    "signType": signtype, "timestamp":time}
	console.log(mydata)
	return 	fetch('https://sb-open.revenuemonster.my/tool/signature/generate',
			{headers: {"Content-Type":"application/json"},
			method:'POST',
			body:JSON.stringify(mydata)
		}).then(res => res.json())
		.catch(error => console.error('Error:', error))
		.then(response => {
			console.log('Success:', response)
			process.env.SIG = response.signature
			//process.env.DATA = response.data
			//console.log(process.env.SIG + process.env.DATA)
		})	
}

function queryTrans(transId) {
	var method = "get"
	var signtype = "sha256"
	var myurl = "https://sb-open.revenuemonster.my/v3/payment/transaction/" + transId
	var time = Math.floor(Date.now()/1000)
	var time_str = time.toString()
	var otStr = makeid()
	var priv_key = getPrivateKeySomehow()
	var data = {
	//	"transactionId":transId
	}
	requestToken().then(function(){
		generateSign(data, method, otStr, priv_key, myurl, signtype, time_str).then(function(){
			var header = {"Authorization":"Bearer " + process.env.AC_TOKEN, "Content-Type":"application/json", "X-Nonce-Str":otStr, "X-Signature":process.env.SIG, "X-Timestamp":time_str}
 			console.log(header)	
			return 	fetch('https://sb-open.revenuemonster.my/v3/payment/transaction/1807140528250021088386', {
					headers:header,
					method:'GET',
				}).then(res => res.json())
				.catch(error => console.error('Error:', error))
				.then(response => {
					console.log('Success:', response)
				})
			})
	})
}

queryTrans("1807140528250021088386")
function queryProfile() {
	var method = "get"
	var signtype = "sha256"
	var myurl = "https://sb-open.revenuemonster.my/v3/user"
	var time = Math.floor(Date.now()/1000)
	var time_str = time.toString()
	var otStr = makeid()
	var priv_key = getPrivateKeySomehow()
	var data = {}
	var jsondata = JSON.stringify(data)
	requestToken().then(function(){
		generateSign(data, method, otStr, priv_key, myurl, signtype, time_str).then(function(){
			var header = {"Authorization":"Bearer " + process.env.AC_TOKEN, "Content-Type":"application/json", "X-Nonce-Str":otStr, "X-Signature":process.env.SIG, "X-Timestamp":time_str}
 			console.log(header)	
			return 	fetch('https://sb-open.revenuemonster.my/v3/user', {
					headers:header,
					method:'GET'
				}).then(res => res.json())
				.catch(error => console.error('Error:', error))
				.then(response => {
					console.log('Success:', response)
				})
			})
	})
}
//queryProfile()
function queryStore() {
	var method = "get"
	var signtype = "sha256"
	var myurl = "https://sb-open.revenuemonster.my/v3/stores"
	var time = Math.floor(Date.now()/1000)
	var time_str = time.toString()
	var otStr = makeid()
	var priv_key = getPrivateKeySomehow()
	var data = {}
	var jsondata = JSON.stringify(data)
	requestToken().then(function(){
		generateSign(data, method, otStr, priv_key, myurl, signtype, time_str).then(function(){
			var header = {"Authorization":"Bearer " + process.env.AC_TOKEN, "Content-Type":"application/json", "X-Nonce-Str":otStr, "X-Signature":process.env.SIG, "X-Timestamp":time_str}
 			console.log(header)	
			return 	fetch('https://sb-open.revenuemonster.my/v3/stores', {
					headers:header,
					method:'GET'
				}).then(res => res.json())
				.catch(error => console.error('Error:', error))
				.then(response => {
					console.log('Success:', response)
				})
			})
	})
}
//queryStore()
app.get('/wechat/pay', function(req, res) {
	console.log("its been called")
	console.log(req.query.code + " and " + req.query.transactionId)
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

