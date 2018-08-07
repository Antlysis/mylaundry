/////////////////////////////////////
///// Required Packages /////////////
/////////////////////////////////////

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
var json2csvParser = require('json2csv').Parser;


app.use(myParser.urlencoded({extended : true}));
app.use(myParser.json());

app.use((req, res, next) => {
	        res.setHeader('Access-Control-Allow-Origin', '*');
	        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
	        res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
	        res.setHeader('Access-Control-Allow-Credentials', true);
	        next();
});



app.use(express['static'](__dirname ));
// Express route for incoming requests for a customer name
//app.get('/:machine/:money', function(req, res, next) {
//	//res.sendfile('test.html', {output: req.params.id});
//	//res.status(200).send('received payment' + req.params.money);
//	console.log(req.params.id)
//	console.log(req.params.money)
//	res.render('index', { machine: req.params.machine, money: req.params.money});
//	onMachine(req.params.machine, req.params.money)
//});



/////////////////////////////////////
///// Variable initialization ///////
/////////////////////////////////////


var authToken = {apiKey: "M9UAUUQQ4SNOWMMOVM68QJYGLF", apiSecret: "3818c390-b5da-41ec-8cc2-caec97ea0c51"};
var clientID = "8559245238100648952"
var clientSecret = "nalDIAIZfMqMuKTvCksbplSNWhUUQIKl"
var credential_req = {"grantType": "client_credentials"} 
var credential_head = {"Authorization": "Basic " + base64.encode(clientID + ":" + clientSecret), "Content-Type":"application/json"}
console.log(base64.encode(clientID + ":" + clientSecret))
var myToken
var expired
var myRefreshToken
var mySign
var myOrder
var myItem
var myTransRecord = {}
var fields = ['mchCode','transId', 'title', 'amount', 'payeeId', 'createAt', 'updateAt', 'status']
var ePaymentCsv = "EpaymentReport.csv"
var mchStatusCsv = "mchStatus.csv"
var newLine = "\r\n";
const ePaymentAppend = new json2csvParser({fields, header: false});
const ePaymentCreate = new json2csvParser({fields});
const mchStatusAppend = new json2csvParser({fields, header: false});
const mchStatusCreate = new json2csvParser({fields});



/////////////////////////////////////
///// Functions declarations ////////
/////////////////////////////////////

function onMachine(machine_no, money) {
	money_str = money.toString()
	mqttClient.publish(machine_no, money_str)
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

function createEntry(mchCode, transId, title, amount, payeeId, createAt, updateAt, status){
	myTransRecord[transId] = {};
	myTransRecord[transId].transId = transId;
	myTransRecord[transId].mchCode = mchCode;
	myTransRecord[transId].title = title;
	myTransRecord[transId].amount = amount;
	myTransRecord[transId].payeeId = payeeId;
	myTransRecord[transId].createAt = createAt; 
	myTransRecord[transId].updateAt = updateAt;
	myTransRecord[transId].status = status;
}

function save2csv(type, data){
	if (type == "ePayment") {
		const typeAppend = ePaymentAppend;
		const typeCreate = ePaymentCreate;
		const csvPath = ePaymentCsv;
		if (fs.existsSync(csvPath)) {
			var csv = typeAppend.parse(data) + newLine;
			fs.appendFile(csvPath, csv, function (err) {
				if (err) throw err;
				console.log('The data was appended to the file');
			});
		} else {
			var csv = typeCreate.parse(data) + newLine;
			fs.writeFile(csvPath, csv, function(err) {
				if (err) throw err;
				console.log("The new csv file has been created");
			});
		}
	} else if (type == "mchStatus") {
		const typeAppend = mchStatusAppend;
		const typeCreate = mchStatusCreate;
		const csvPath = mchStatusCsv;
		if (fs.existsSync(csvPath)) {
			var csv = typeAppend.parse(data) + newLine;
			fs.appendFile(csvPath, csv, function (err) {
				if (err) throw err;
				console.log('The data was appended to the file');
			});
		} else {
			var csv = typeCreate.parse(data) + newLine;
			fs.writeFile(csvPath, csv, function(err) {
				if (err) throw err;
				console.log("The new csv file has been created");
			});
		}
	}
}

function requestToken() {
	var authToken = {apiKey: "M9UAUUQQ4SNOWMMOVM68QJYGLF", apiSecret: "3818c390-b5da-41ec-8cc2-caec97ea0c51"};
	var clientID = "8559245238100648952"
	var clientSecret = "nalDIAIZfMqMuKTvCksbplSNWhUUQIKl"
	var credential_req = {"grantType": "client_credentials"} 
	var credential_head = {"Authorization": "Basic " + base64.encode(clientID + ":" + clientSecret), "Content-Type":"application/json"}
 	return fetch('https://sb-oauth.revenuemonster.my/v1/token',
			{headers: credential_head,
			method:'POST',
			body:JSON.stringify(credential_req)
		}).then(res => res.json())
		.catch(error => console.error('Error:', error))
		.then(response => {
			console.log('Success:', response)
			myToken = response.accessToken
			myRefreshToken = response.refreshToken
			expired = response.expiresIn	
		})
}

function refreshToken() {
	var authToken = {apiKey: "M9UAUUQQ4SNOWMMOVM68QJYGLF", apiSecret: "3818c390-b5da-41ec-8cc2-caec97ea0c51"};
	var clientID = "8559245238100648952"
	var clientSecret = "nalDIAIZfMqMuKTvCksbplSNWhUUQIKl"
	var credential_req = {"grantType": "refresh_token", "refreshToken": myRefreshToken} 
	var credential_head = {"Authorization": "Basic " + base64.encode(clientID + ":" + clientSecret), "Content-Type":"application/json"}
	return 	fetch('https://sb-oauth.revenuemonster.my/v1/token',
			{headers: credential_head,
			method:'POST',
			body:JSON.stringify(credential_req)
		}).then(res => res.json())
		.catch(error => console.error('Error:', error))
		.then(response => {
			console.log('Success refresh token:', response)
			myToken = response.accessToken
			myRefreshToken = response.refreshToken
			expired = response.expiresIn	
		})
}

function makeid() {
	    var text = "";
	    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
	    for(var i = 0; i < 32; i++) {
		            text += possible.charAt(Math.floor(Math.random() * possible.length));
		        }
	    return text;
}

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
			mySign = response.signature
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
	if (myToken == undefined) {
		return  requestToken().then(function(){
			setInterval(refreshToken,expired*1000)
			console.log(myToken)
			return generateSign(data, method, otStr, priv_key, myurl, signtype, time_str).then(function(){
				var header = {"Authorization":"Bearer " + myToken, "Content-Type":"application/json", "X-Nonce-Str":otStr, "X-Signature":mySign, "X-Timestamp":time_str}
 				console.log(header)	
			return	fetch(myurl, {
					headers:header,
					method:'GET'
				}).then(res => res.json())
				.catch(error => console.error('Error:', error))
				.then(response => {
					//console.log('Success:', response.item)
					myItem = response.item
					//console.log(myItem)
				})
			})
		})
	} else {
		console.log("already have token")
		return 	generateSign(data, method, otStr, priv_key, myurl, signtype, time_str).then(function(){
			var header = {"Authorization":"Bearer " + myToken, "Content-Type":"application/json", "X-Nonce-Str":otStr, "X-Signature":mySign, "X-Timestamp":time_str}
 			console.log(header)	
			return	fetch(myurl, {
				headers:header,
				method:'GET'
			}).then(res => res.json())
			.catch(error => console.error('Error:', error))
			.then(response => {
				//console.log('Success:', response)
				myItem = response.item
			})
		})
	}
		
}

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
	if (myToken == undefined) {
		return requestToken().then(function(){
			return generateSign(data, method, otStr, priv_key, myurl, signtype, time_str).then(function(){
				var header = {"Authorization":"Bearer " + myToken, "Content-Type":"application/json", "X-Nonce-Str":otStr, "X-Signature":mySign, "X-Timestamp":time_str}
 				console.log(header)	
				return fetch('https://sb-open.revenuemonster.my/v3/user', {
					headers:header,
					method:'GET'
				}).then(res => res.json())
				.catch(error => console.error('Error:', error))
				.then(response => {
					console.log('Success:', response)
				})
				})
		})
	} else {
		return generateSign(data, method, otStr, priv_key, myurl, signtype, time_str).then(function(){
				var header = {"Authorization":"Bearer " + myToken, "Content-Type":"application/json", "X-Nonce-Str":otStr, "X-Signature":mySign, "X-Timestamp":time_str}
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
	}
}

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
	if (myToken == undefined) {
		return requestToken().then(function(){
			return generateSign(data, method, otStr, priv_key, myurl, signtype, time_str).then(function(){
				var header = {"Authorization":"Bearer " + myToken, "Content-Type":"application/json", "X-Nonce-Str":otStr, "X-Signature":mySign, "X-Timestamp":time_str}
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
	} else {
		return generateSign(data, method, otStr, priv_key, myurl, signtype, time_str).then(function(){
			var header = {"Authorization":"Bearer " + myToken, "Content-Type":"application/json", "X-Nonce-Str":otStr, "X-Signature":mySign, "X-Timestamp":time_str}
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
	}
}

function refundPayment(transId, refundAmount, reason, type) {
	var method = "post"
	var signtype = "sha256"
	var myurl = "https://sb-open.revenuemonster.my/v3/payment/refund"
	var time = Math.floor(Date.now()/1000)
	var time_str = time.toString()
	var otStr = makeid()
	var priv_key = getPrivateKeySomehow()
	var data1 = {}
	var data = {
		"transactionId": transId,
		"refund": {
			"type": type,
			"currencyType": "MYR",
			"amount": refundAmount
		},
		"reason": reason
	}
	var jsondata = JSON.stringify(data)
	if (myToken == undefined) {
		return requestToken().then(function(){
			return generateSign(data, method, otStr, priv_key, myurl, signtype, time_str).then(function(){
				var header = {"Authorization":"Bearer " + myToken, "Content-Type":"application/json", "X-Nonce-Str":otStr, "X-Signature":mySign, "X-Timestamp":time_str}
	 			console.log(header)	
				return 	fetch('https://sb-open.revenuemonster.my/v3/payment/refund', {
						headers:header,
						method:'POST',
						body:jsondata 
					}).then(res => res.json())
					.catch(error => console.error('Error:', error))
					.then(response => {
						//console.log('Success:', response)
						return response
					})
				})
		})
	} else {
		return generateSign(data, method, otStr, priv_key, myurl, signtype, time_str).then(function(){
			var header = {"Authorization":"Bearer " + myToken, "Content-Type":"application/json", "X-Nonce-Str":otStr, "X-Signature":mySign, "X-Timestamp":time_str}
	 		console.log(header)	
			return 	fetch('https://sb-open.revenuemonster.my/v3/payment/refund', {
					headers:header,
					method:'POST',
					body:jsondata 
				}).then(res => res.json())
				.catch(error => console.error('Error:', error))
				.then(response => {
					//console.log('Success:', response)
					return response
				})
			})
	}
}
queryTrans("180805103827020024546855").then(function(){
	console.log(myItem)
	createEntry("12345", "180805103827020024546855", myItem.order.title, myItem.order.amount, myItem.payee.userId, myItem.createdAt, myItem.updatedAt, myItem.status)
	console.log(myTransRecord["180805103827020024546855"])
	save2csv("ePayment",myTransRecord["180805103827020024546855"])
})
//setTimeout(function() {
//	console.log(myItem) }, 4000)
//refundPayment("180805045658020025384698", 200, "i just wanna refund", "FULL")
//queryStore()
app.get('/wechat/pay', function(req, res) {
	console.log("its been called")
	console.log(req.query)
	console.log(req.query.code + " and " + req.query.transactionId)
	var mchNo = req.query.code
	var transId = req.query.transactionId
	console.log(transId)
	queryTrans(transId).then(function(){
		console.log(myItem)
		if (myItem.status == "SUCCESS") {
			onMachine(transId, myItem.order.amount)
			createEntry(mchNo, transId, myItem.order.title, myItem.order.amount, myItem.payee.userId, myItem.createdAt, myItem.updatedAt, myItem.status)
			console.log(myTransRecord[transId])
		}
	})
		
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

