////////////////////////////////////
///// Required Packages /////////////
/////////////////////////////////////

var express = require('express');
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
var nodemailer = require('nodemailer'); 
var moment = require('moment');
var paperboy = require('./lib/paperboy');
var varItem = require('./variables.js');
var path = require('path');
var myWebroot = path.join(path.dirname(__filename), 'webroot');
var parseurl = require('parseurl');
var session = require('express-session');
var mustacheExpress = require('mustache-express');
var math = require('math');
var schedule = require('node-schedule');

const data = require('./userData.js');
const data2 = require('./data.js');

const Gpio = require('onoff').Gpio;
const jamming = new Gpio(4, 'in', 'rising');

app.engine('mustache', mustacheExpress());
app.set('views', './views');
app.set('view engine', 'mustache');
app.use(myParser.urlencoded({extended : false}));
app.use(myParser.json());
app.use(session({
	secret: 'keyboard cat',
	resave: false,
	saveUninitialized: true
}));

app.use(function (req, res, next) {
	var views = req.session.views;

	if (!views) {
		views = req.session.views = {};
	}

	//get the url pathname
	var pathname = parseurl(req).pathname;

	// count the views
	views[pathname] = (views[pathname] || 0) + 1
	next();
})


function authenticate_admin(req, username, password) {
	var authenticatedUser = data2.users.find(function (user) {
		if (username == user.username && password == user.password) {
			req.session.authenticated = true;
			console.log('User & Password Authenticated');
		} else {
			return false
		}
	});
	console.log(req.session);
	return req.session;
}


function authenticate_user(req, username, password) {
	var authenticatedUser = data.users.find(function (user) {
		if (username == user.username && password == user.password) {
			req.session.authenticated = true;
			console.log('User & Password Authenticated');
		} else {
			return false
		}
	});
	console.log(req.session);
	return req.session;
}



app.use(function (req, res, next){
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
	res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
	res.setHeader('Access-Control-Allow-Credentials', true);
	next();
});

app.use(express['static']('public'));


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
var myRunRecord = {}
var sumRunRecord = {}
var fields = ['mchCode','transId', 'title', 'amount', 'payeeId', 'createAt', 'updateAt', 'status']
var fields2 = ['no', 'machine', 'side', 'runTime', 'Coin_received', 'Wechat_received', 'status','date', 'startTime', 'endTime']
var fields3 = ['MachineCode', 'Title', 'TotalRun', 'TotalRunTop', 'TotalRunBot', 'TotalReceived','TotalWechat', 'TotalCoin', 'NoColdRun', 'NoWarmRun', 'NoHotRun', 'ActualTotalRunTime','ActualTotalRunTimeTop', 'ActualTotalRunTimeBot', 'ExpectedTotalRunTime']
var ePaymentCsv = "EpaymentReport.csv"
var chkMachineRun = "chkMachineRunStatus.csv"
var sumMachineRun = "sumMachineRunStatus.csv"
var newLine = "\r\n";
var transporter = nodemailer.createTransport({
	service: 'gmail',
	auth:{
		user: 'ptutm.jameslsk@gmail.com',
		pass: 'james009'
	}
});
var allTrue = true;
var coldRun = 7;
var warmRun = 8;
var hotRun = 9;
var totalRun4doubleDryer = 0;
const ePaymentAppend = new json2csvParser({fields, header: false});
const ePaymentCreate = new json2csvParser({fields});
const mchStatusAppend = new json2csvParser({fields2, header: false});
const mchStatusCreate = new json2csvParser({fields2});
const sumStatusAppend = new json2csvParser({fields3, header: false});
const sumStatusCreate = new json2csvParser({fields3});


mqttClient.on('connect', function () {
	mqttClient.subscribe('connectivity/+')
	mqttClient.subscribe('Lock/+')
	mqttClient.subscribe('coinIn/+')
	mqttClient.subscribe('versionFeed/+')
})

mqttClient.on('message', function (topic, message) {
	if (topic.match(/connectivity/g)) {
		var pattern = /connectivity\/([0-9a-zA-Z_]+)/i
		var mchNo = topic.replace(pattern, "$1")
		if (message.toString() == "ON") {
			varItem[mchNo].active = true
			console.log("Bee~")
		} else if (message.toString() == "OFF") {
			varItem[mchNo].active = false
		}
	} else if (topic.match(/Lock/g)) {
		var pattern = /Lock\/([0-9a-zA-Z_]+)/i
		var mchNo = topic.replace(pattern, "$1")
		if (varItem[mchNo].typeOfMachine == "dex_dryer_double") {
			if (message.toString() == "Locked1") {
				varItem[mchNo].lockCounter.upper++
				if (varItem[mchNo].lockCounter.upper == 5 ) {
					varItem[mchNo].locked.upper = true	
					varItem[mchNo].startTime.upper = moment().format("DD/MM/YYYY HH:mm:ss")
					console.log("startTime = " + varItem[mchNo].startTime.upper)
				} else if (varItem[mchNo].lockCounter.upper <= 4) {
					varItem[mchNo].locked.upper= false
				}
			} else if (message.toString() == "Locked2") {
				varItem[mchNo].lockCounter.lower++
				if (varItem[mchNo].lockCounter.lower == 5 ) {
					varItem[mchNo].locked.lower = true
					varItem[mchNo].startTime.lower = moment().format("DD/MM/YYYY HH:mm:ss")
					console.log("startTime = " + varItem[mchNo].startTime.lower)
				} else if (varItem[mchNo].lockCounter.lower <= 4) {
					varItem[mchNo].locked.lower= false
				}
			} else if (message.toString() == "Unlocked1") {
				varItem[mchNo].lockCounter.upper = 0
				if (varItem[mchNo].locked.upper) {
					totalRun4doubleDryer++
					varItem[mchNo].noOfRun.upper++
					varItem[mchNo].doneTime.upper = moment().format("DD/MM/YYYY HH:mm:ss")
					var date = moment().format("DD/MM/YYYY")
					var diff_upper = moment(varItem[mchNo].doneTime.upper, "DD/MM/YYYY HH:mm:ss").diff(moment(varItem[mchNo].startTime.upper, "DD/MM/YYYY HH:mm:ss"));
					var d_upper = moment.duration(diff_upper);
					var timeTaken_upper = [d_upper.hours(), d_upper.minutes(), d_upper.seconds()].join(':')
					mchRunRecord(mchNo, "upper" ,totalRun4doubleDryer, timeTaken_upper, varItem[mchNo].coinPaid, varItem[mchNo].wechatPaid, "SUCCESS", date, varItem[mchNo].startTime.upper, varItem[mchNo].doneTime.upper)
					console.log(myRunRecord[mchNo])
					console.log(myRunRecord[mchNo][totalRun4doubleDryer])
					varItem[mchNo].totalPaid = varItem[mchNo].totalPaid + varItem[mchNo].amountPaid
					varItem[mchNo].totalWechat = varItem[mchNo].totalWechat + varItem[mchNo].wechatPaid
					varItem[mchNo].totalCoin = varItem[mchNo].totalCoin + varItem[mchNo].coinPaid
					varItem[mchNo].totalTime.upper = varItem[mchNo].totalTime.upper + math.floor(d_upper.as('minutes'))
					save2csv("chkMachineRun", myRunRecord[mchNo][totalRun4doubleDryer])	
					varItem[mchNo].wechatPaid = 0
					varItem[mchNo].coinPaid = 0
					varItem[mchNo].amountPaid = 0
					console.log("doneTime = " + varItem[mchNo].doneTime.upper)
					console.log(timeTaken_upper)
					varItem[mchNo].locked.upper = false
				} else {
					varItem[mchNo].locked.upper = false
				}
			} else if (message.toString() == "Unlocked2") {
				varItem[mchNo].lockCounter.lower = 0
				if (varItem[mchNo].locked.lower) {
					totalRun4doubleDryer++
					varItem[mchNo].noOfRun.lower++
					varItem[mchNo].doneTime.lower = moment().format("DD/MM/YYYY HH:mm:ss")
					var date = moment().format("DD/MM/YYYY")
					var diff_lower = moment(varItem[mchNo].doneTime.lower, "DD/MM/YYYY HH:mm:ss").diff(moment(varItem[mchNo].startTime.lower, "DD/MM/YYYY HH:mm:ss"));
					var d_lower = moment.duration(diff_lower);
					var timeTaken_lower = [d_lower.hours(), d_lower.minutes(), d_lower.seconds()].join(':')
					mchRunRecord(mchNo, "lower", totalRun4doubleDryer, timeTaken_lower, varItem[mchNo].coinPaid, varItem[mchNo].wechatPaid, "SUCCESS", date, varItem[mchNo].startTime.lower, varItem[mchNo].doneTime.lower)
					console.log(myRunRecord[mchNo])
					console.log(myRunRecord[mchNo][totalRun4doubleDryer])
					varItem[mchNo].totalPaid = varItem[mchNo].totalPaid + varItem[mchNo].amountPaid
					varItem[mchNo].totalWechat = varItem[mchNo].totalWechat + varItem[mchNo].wechatPaid
					varItem[mchNo].totalCoin = varItem[mchNo].totalCoin + varItem[mchNo].coinPaid
					varItem[mchNo].totalTime.lower = varItem[mchNo].totalTime.lower + math.floor(d_lower.as('minutes'))
					save2csv("chkMachineRun", myRunRecord[mchNo][totalRun4doubleDryer])
					varItem[mchNo].coinPaid = 0
					varItem[mchNo].wechatPaid = 0
					varItem[mchNo].amountPaid = 0
					console.log("doneTime = " + varItem[mchNo].doneTime.lower)
					console.log(timeTaken_lower)
					varItem[mchNo].locked.lower = false
				} else {
					varItem[mchNo].locked.lower = false
				}
			}
		} else {
			if (message.toString() == "Locked") {
				varItem[mchNo].lockCounter++
				if (varItem[mchNo].lockCounter == 5 ) {
					varItem[mchNo].locked = true
					varItem[mchNo].startTime = moment().format("DD/MM/YYYY HH:mm:ss")
					console.log("startTime = " + varItem[mchNo].startTime)

				} else if (varItem[mchNo].lockCounter <= 4) {
					varItem[mchNo].locked = false
				}
			} else if (message.toString() == "Unlocked") {
				varItem[mchNo].lockCounter = 0
				if (varItem[mchNo].locked) {
					varItem[mchNo].noOfRun++
					varItem[mchNo].doneTime = moment().format("DD/MM/YYYY HH:mm:ss")
					var date = moment().format("DD/MM/YYYY")
					var diff = moment(varItem[mchNo].doneTime, "DD/MM/YYYY HH:mm:ss").diff(moment(varItem[mchNo].startTime, "DD/MM/YYYY HH:mm:ss"));
					var d = moment.duration(diff);
					var timeTaken = [d.hours(), d.minutes(), d.seconds()].join(':')
					mchRunRecord(mchNo, "NA", varItem[mchNo].noOfRun, timeTaken, varItem[mchNo].coinPaid, varItem[mchNo].wechatPaid, "SUCCESS", date, varItem[mchNo].startTime, varItem[mchNo].doneTime)
					console.log(myRunRecord[mchNo])
					console.log(myRunRecord[mchNo][varItem[mchNo].noOfRun])
					varItem[mchNo].totalPaid = varItem[mchNo].totalPaid + varItem[mchNo].amountPaid
					varItem[mchNo].totalWechat = varItem[mchNo].totalWechat + varItem[mchNo].wechatPaid
					varItem[mchNo].totalCoin = varItem[mchNo].totalCoin + varItem[mchNo].coinPaid
					varItem[mchNo].totalTime = varItem[mchNo].totalTime + math.floor(d.as('minutes')) 
					save2csv("chkMachineRun", myRunRecord[mchNo][varItem[mchNo].noOfRun])
					if (varItem[mchNo].typeOfMachine != "dex_dryer" || varItem[mchNo].typeOfMachine != "ipso_dryer") {
						if (varItem[mchNo].amountPaid == coldRun) {
							varItem[mchNo].coldRun = varItem[mchNo].coldRun + 1;
						} else if (varItem[mchNo].amountPaid == warmRun) {
							varItem[mchNo].warmRun = varItem[mchNo].warmRun + 1;
						} else if (varItem[mchNo].amountPaid == hotRun) {
							varItem[mchNo].hotRun = varItem[mchNo].hotRun + 1;
						}
					}
					varItem[mchNo].coinPaid = 0
					varItem[mchNo].wechatPaid = 0
					varItem[mchNo].amountPaid = 0
					console.log("doneTime = " + varItem[mchNo].doneTime)
					console.log(timeTaken)
					varItem[mchNo].locked = false
				} else {
					varItem[mchNo].locked = false
				}
			}	
		}
		console.log(message.toString() + "  " + mchNo)
	} else if (topic.match(/coinIn/g)) {
		var pattern = /coinIn\/([0-9a-zA-Z_]+)/i
		var mchNo = topic.replace(pattern, "$1")
		if (varItem[mchNo].typeOfMachine == "detergent") {
			if (message.toString() == "COIN1") {
				varItem[mchNo].coinPaid.ca1 = varItem[mchNo].coinPaid.ca1 + 1
				varItem[mchNo].amountPaid = varItem[mchNo].amountPaid + 1
			} else if (message.toString() == "COIN2") {
				varItem[mchNo].coinPaid.ca2 = varItem[mchNo].coinPaid.ca2 + 1
				varItem[mchNo].amountPaid = varItem[mchNo].amountPaid + 1
			}
		} else {
			varItem[mchNo].coinPaid = varItem[mchNo].coinPaid + 1
			varItem[mchNo].amountPaid = varItem[mchNo].amountPaid + 1
		}
		console.log(message.toString() + "  " + mchNo)
	} else if (topic.match(/versionFeed/g)) {
		var pattern = /versionFeed\/([0-9a-zA-Z_]+)/i
		var mchNo = topic.replace(pattern, "$1")
		console.log("Current version of the firmware of " + mchNo + " is " + message.toString())
		varItem[mchNo].version = message.toString()
	}
})


function checkHeartbeat () {
	Object.keys(varItem).forEach(function(key) {
		var activity = varItem[key].active;
		var doneSent = varItem[key].sent;
		if (activity) {
			console.log("the device " + key + " is connected")
			if (doneSent) {
				var mailOptions = {
					from: 'ptutm.jameslsk@gmail.com',
					to: 'jamesleesukey@gmail.com',
					subject: 'Sending Email to notify that the falty machine is back to normal condition',
					text: key + " is working normally now."
				};
				transporter.sendMail(mailOptions, function(error, info){
					if (error) {
						console.log(error);
					} else {
						console.log('Email sent: ' + info.response);
					}
				});
				varItem[key].sent = false
			}				
		} else {
			if (doneSent) {
			} else {
				var mailOptions = {
					from: 'ptutm.jameslsk@gmail.com',
					to: 'jamesleesukey@gmail.com',
					subject: 'Sending Email to notify that one of the machine is not functioning',
					text: key + " is not functioning, please check it out. Epayment to this machine is disabled."
				};
				transporter.sendMail(mailOptions, function(error, info){
					if (error) {
						console.log(error);
					} else {
						console.log('Email sent: ' + info.response);
					}
				});
				varItem[key].sent = true
			}
		}
	});
}
setInterval(checkHeartbeat, 60000);

var j = schedule.scheduleJob('00 13 * * *', function(){
	console.log('The answer to life, the universe, and everything!');
	Object.keys(varItem).forEach(function(key) {
		if (varItem[key].typeOfMachine == "dex_dryer_double") {
			var expectedRunTime =  varItem[key].totalPaid * varItem[key].oneRunTime
			sumExecuteRecord(key, varItem[key].typeOfMachine, "NA", varItem[key].noOfRun.upper, varItem[key].noOfRun.lower , varItem[key].totalPaid, varItem[key].totalWechat, varItem[key].totalCoin, "NA" , "NA" , "NA" , "NA", varItem[key].totalTime.upper, varItem[key].totalTime.lower, expectedRunTime)
			console.log(sumRunRecord[key])
			save2csv("machineRunStatus", sumRunRecord[key])
		} else if (varItem[key].typeOfMachine == "ipso_dryer" || varItem[key].typeOfMachine == "dex_dryer") {
			var expectedRunTime =  varItem[key].totalPaid * varItem[key].oneRunTime
			sumExecuteRecord(key, varItem[key].typeOfMachine, varItem[key].noOfRun, "NA", "NA", varItem[key].totalPaid, varItem[key].totalWechat, varItem[key].totalCoin, "NA" , "NA" , "NA" , varItem[key].totalTime,"NA", "NA", expectedRunTime)
			console.log(sumRunRecord[key])
			save2csv("machineRunStatus", sumRunRecord[key])
		} else {
			var expectedRunTime = varItem[key].noOfRun * varItem[key].oneRunTime
			sumExecuteRecord(key,varItem[key].typeOfMachine, varItem[key].noOfRun, "NA", "NA", varItem[key].totalPaid, varItem[key].totalWechat , varItem[key].totalCoin , varItem[key].coldRun , varItem[key].warmRun , varItem[key].hotRun , varItem[key].totalTime,"NA", "NA",  expectedRunTime)
			console.log(sumRunRecord[key])
			save2csv("machineRunStatus", sumRunRecord[key])
		}
	});
});

/////////////////////////////////////
///// Functions declarations ////////
/////////////////////////////////////

function onMachine(machine_no, money) {
	money_str = money.toString()
	mqttClient.publish(machine_no, money_str)
}
//onMachine("6786f3831d7a750bac397d8967b81044",20)
//var end = false;
//for (var i = 0; i <= 500; i++){
//	setTimeout(onMachine, 30000, "6786f3831d7a750bac397d8967b81044", 5)
//}


function checkMachineStatus (transId, machine_no) {
	if (locked[machine_no]) {
		myTransRecord[transId].Run_Status = "Run"
		console.log("machine is running")
	} else if (locked[machine_no]) {
		myTransRecord[transId].Run_Status = "Not Run"
		console.log("machine is not running")
	}
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

function mchRunRecord(mchCode, side, noOfRun, runTime, coinPaid, wechatPaid, status, date, startTime, endTime){
	myRunRecord[mchCode] = {};
	myRunRecord[mchCode][noOfRun] = {};
	myRunRecord[mchCode][noOfRun].no = noOfRun;
	myRunRecord[mchCode][noOfRun].machine = mchCode;
	myRunRecord[mchCode][noOfRun].side = side;
	myRunRecord[mchCode][noOfRun].runTime = runTime;
	myRunRecord[mchCode][noOfRun].Wechat_received = wechatPaid;
	myRunRecord[mchCode][noOfRun].Coin_received = coinPaid;
	myRunRecord[mchCode][noOfRun].status = status;
	myRunRecord[mchCode][noOfRun].date = date;
	myRunRecord[mchCode][noOfRun].startTime = startTime;
	myRunRecord[mchCode][noOfRun].endTime = endTime;
}
//MachineCode', 'Title', 'TotalRun', 'TotalWechat', 'TotalCoin', 'NoColdRun', 'NoWarmRun', 'NoHotRun', 'ActualTotalRunTime', 'ExpectedTotalRunTime']
function sumExecuteRecord(mchCode,title, totalRun, totalRunTop, totalRunBot, totalPaid, totalWechat, totalCoin, noColdRun, noWarmRun, noHotRun, actualTotalRunTime, actualTotalRunTimeTop, actualTotalRunTimeBot, expectedTotalRunTime) {
	sumRunRecord[mchCode] = {};
	sumRunRecord[mchCode].MachineCode = mchCode;
	sumRunRecord[mchCode].Title = title;
	sumRunRecord[mchCode].TotalRun = totalRun;
	sumRunRecord[mchCode].TotalRunTop = totalRunTop;
	sumRunRecord[mchCode].TotalRunBot = totalRunBot;
	sumRunRecord[mchCode].TotalReceived = totalPaid;
	sumRunRecord[mchCode].TotalWechat = totalWechat;
	sumRunRecord[mchCode].TotalCoin = totalCoin;
	sumRunRecord[mchCode].NoColdRun = noColdRun;
	sumRunRecord[mchCode].NoWarmRun = noWarmRun;
	sumRunRecord[mchCode].NoHotRun = noHotRun;
	sumRunRecord[mchCode].ActualTotalRunTime = actualTotalRunTime;
	sumRunRecord[mchCode].ActualTotalRunTimeTop = actualTotalRunTimeTop;
	sumRunRecord[mchCode].ActualTotalRunTimeBot = actualTotalRunTimeBot;
	sumRunRecord[mchCode].ExpectedTotalRunTime = expectedTotalRunTime;
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
	} else if (type == "chkMachineRun") {
		const typeAppend = mchStatusAppend;
		const typeCreate = mchStatusCreate;
		const csvPath = chkMachineRun;
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
	} else if (type == "machineRunStatus") {
		const typeAppend = sumStatusAppend;
		const typeCreate = sumStatusCreate;
		const csvPath = sumMachineRun;
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

jamming.watch((err, value) => {
	if (err) {
		throw err;
	}

	console.log("it is jamming now")
})


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
////queryTrans("180912150940020027044581").then(function(){
////	console.log(myItem)
////	createEntry("12345", "180912150940020027044581", myItem.order.title, myItem.order.amount, myItem.payee.userId, myItem.createdAt, myItem.updatedAt, myItem.status)
////	console.log(myTransRecord["180912150940020027044581"])
////	save2csv("ePayment",myTransRecord["180912150940020027044581"])
////})
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
			var amountToPay = myItem.order.amount/100
			if (amountToPay <= 25){
				if (varItem[mchNo].active) {
					onMachine(mchNo, amountToPay)
					varItem[mchNo].wechatPaid = varItem[mchNo].wechatPaid + amountToPay
					varItem[mchNo].amountPaid = varItem[mchNo].amountPaid + amountToPay
					res.status(200).send ("Payment has been paid, Thanks for using our service.")
				} else {
					refundPayment(transId, myItem.order.amount, "The machine is not ready for Epayment rightnow.", "FULL")
					res.status(200).send("Sorry, This machine is not ready for Epayment right now, Please try again later.")
				}
			} else {
				res.sttus(200).send("The payment is too much");
			}
		}
	})
	//res.status(200).send(req.body);
});

app.get('/fw/*', function(req, res) {
	//res.status(404).send('Unrecognised API call');
	var ip = req.connection.remoteAddress;
	  paperboy
	    .deliver(myWebroot, req, res)
	    .addHeader('Expires', 300)
	    .addHeader('X-PaperRoute', 'Node')
	    .before(function() {
		          console.log('Received Request');
	    })
	    .after(function(statCode) {
		          log(statCode, req.url, ip);
	    })
	    .error(function(statCode, msg) {
		          res.writeHead(statCode, {'Content-Type': 'text/plain'});
		          res.end("Error " + statCode);
		          log(statCode, req.url, ip, msg);
	    })
	    .otherwise(function(err) {
		          res.writeHead(404, {'Content-Type': 'text/plain'});
		          res.end("Error 404: File not found");
		          log(404, req.url, ip, err);
	    })
});


app.get('/',function(req,res) {
	res.render('index');
})

app.get('/login',function(req,res) {
	res.render('login_admin');
});


app.post('/login_admin',function(req, res) {
	var username = req.body.username;
	var password = req.body.password;
	authenticate_admin(req, username, password);
	if (req.session && req.session.authenticated){
		res.render('updateFw', { users: data2.users });
	} else {
		res.redirect('/');
	}
});

app.post('/login_user',function(req, res) {
	var username = req.body.username;
	var password = req.body.password;
	authenticate_user(req, username, password);
	if (req.session && req.session.authenticated){
		res.render('thresholdChg', { users: data2.users });
	} else {
		res.redirect('/');
	}
});

app.post('/update_pricing', function(req, res) {
	if (req.session && req.session.authenticated){
		coldRun = req.body.coldRun;
		warmRun = req.body.warmRun;
		hotRun = req.body.hotRun;
		console.log("The pricing has been changed to cold " + coldRun + " warm " + warmRun + " hot " + hotRun);
		res.status(200).send("The pricing has been changed to cold " + coldRun + " warm " + warmRun + " hot " + hotRun);
	} else {
		res.redirect('/');
	}
});

app.get('/admin', (req,res) => {
	res.redirect('/login');
});

app.get('/user_login', function(req, res) {
	res.render('login_user');
});

app.get('/logout', function(req, res, next) {
	  if (req.session) {
		req.session.destroy(function(err) {
			if(err) {
				return next(err);
			} else {
			        return res.redirect('/');
			}
	  	});
	  }
});
		                                         

app.get('/update_firmware', function(req, res) {
	if (req.session && req.session.authenticated){
		console.log("firmware update triggered")
		mqttClient.publish("firmwareUpdate", "update")
		res.status(200).send("the firmware is updating");
	} else {
		res.redirect('/');
	}
});

function log(statCode, url, ip, err) {
	var logStr = statCode + ' - ' + url + ' - ' + ip;
	if (err)
		logStr += ' - ' + err;
		console.log(logStr);
}


app.listen(80, '127.0.0.1');
console.log('App Server running at port 80');
