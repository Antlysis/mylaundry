/////////////////////////////////////
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
const Gpio = require('onoff').Gpio;
const jamming = new Gpio(4, 'in', 'rising');

app.use(myParser.urlencoded({extended : true}));
app.use(myParser.json())

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
var myRunRecord = {}
var fields = ['mchCode','transId', 'title', 'amount', 'payeeId', 'createAt', 'updateAt', 'status']
var fields2 = ['no', 'machine', 'side', 'runTime', 'Wechat_received', 'Coin_received', 'status']
var ePaymentCsv = "EpaymentReport.csv"
var chkMachineRun = "chkMachineRunStatus.csv"
var newLine = "\r\n";
var transporter = nodemailer.createTransport({
	service: 'gmail',
	auth:{
		user: 'ptutm.jameslsk@gmail.com',
		pass: 'james009'
	}
});
var allTrue = true;
const ePaymentAppend = new json2csvParser({fields, header: false});
const ePaymentCreate = new json2csvParser({fields});
const mchStatusAppend = new json2csvParser({fields2, header: false});
const mchStatusCreate = new json2csvParser({fields2});

////////////////////////////////////
///// MQTT connection setup ////////
////////////////////////////////////
var active = {}
var sent = {}
var locked = {}
var amountPaid = {}
var lockCounter = {}
var startTime = {}
var doneTime = {}
var period
var wechatPaid = {}
var coinPaid = {}
var noOfRun = {}
var typeOfMachine = {}

//active["cf9c0ca46b8825532677abe4261bbc30"]  = false
active["6786f3831d7a750bac397d8967b81044"]  = false
active["6786f3831d7a750bac397d8967b81044_2"]  = false
active["6786f3831d7a750bac397d8967b81044_3"]  = false
active["6786f3831d7a750bac397d8967b81044_4"]  = false
active["6786f3831d7a750bac397d8967b81044_5"]  = false
active["6786f3831d7a750bac397d8967b81044_6"]  = false
active["6786f3831d7a750bac397d8967b81044_7"]  = false
active["6786f3831d7a750bac397d8967b81044_8"]  = false
active["6786f3831d7a750bac397d8967b81044_9"]  = false
active["6786f3831d7a750bac397d8967b81044_10"]  = false
active["6786f3831d7a750bac397d8967b81044_11"]  = false
active["6786f3831d7a750bac397d8967b81044_12"]  = false
active["6786f3831d7a750bac397d8967b81044_13"]  = false
active["6786f3831d7a750bac397d8967b81044_14"]  = false
active["6786f3831d7a750bac397d8967b81044_15"]  = false



//active["b697edf35473d4824127003363cad73d"] = {}


//sent["cf9c0ca46b8825532677abe4261bbc30"] = false
sent["6786f3831d7a750bac397d8967b81044"] = false
sent["6786f3831d7a750bac397d8967b81044_1"]  = false
sent["6786f3831d7a750bac397d8967b81044_2"]  = false
sent["6786f3831d7a750bac397d8967b81044_3"]  = false
sent["6786f3831d7a750bac397d8967b81044_4"]  = false
sent["6786f3831d7a750bac397d8967b81044_5"]  = false
sent["6786f3831d7a750bac397d8967b81044_6"]  = false
sent["6786f3831d7a750bac397d8967b81044_7"]  = false
sent["6786f3831d7a750bac397d8967b81044_8"]  = false
sent["6786f3831d7a750bac397d8967b81044_9"]  = false
sent["6786f3831d7a750bac397d8967b81044_10"]  = false
sent["6786f3831d7a750bac397d8967b81044_11"]  = false
sent["6786f3831d7a750bac397d8967b81044_12"]  = false
sent["6786f3831d7a750bac397d8967b81044_13"]  = false
sent["6786f3831d7a750bac397d8967b81044_14"]  = false
sent["6786f3831d7a750bac397d8967b81044_15"]  = false





//sent["b697edf35473d4824127003363cad73d"] = {}


locked["cf9c0ca46b8825532677abe4261bbc30"] = false
locked["6786f3831d7a750bac397d8967b81044"] = false
locked["b697edf35473d4824127003363cad73d"] = {}
locked["6786f3831d7a750bac397d8967b81044_1"]  = false
locked["6786f3831d7a750bac397d8967b81044_2"]  = false
locked["6786f3831d7a750bac397d8967b81044_3"]  = false
locked["6786f3831d7a750bac397d8967b81044_4"]  = false
locked["6786f3831d7a750bac397d8967b81044_5"]  = false
locked["6786f3831d7a750bac397d8967b81044_6"]  = false
locked["6786f3831d7a750bac397d8967b81044_7"]  = false
locked["6786f3831d7a750bac397d8967b81044_8"]  = false
locked["6786f3831d7a750bac397d8967b81044_9"]  = false
locked["6786f3831d7a750bac397d8967b81044_10"]  = false
locked["6786f3831d7a750bac397d8967b81044_11"]  = false
locked["6786f3831d7a750bac397d8967b81044_12"]  = false
locked["6786f3831d7a750bac397d8967b81044_13"]  = false
locked["6786f3831d7a750bac397d8967b81044_14"]  = false
locked["6786f3831d7a750bac397d8967b81044_15"]  = false



amountPaid["cf9c0ca46b8825532677abe4261bbc30"] = 0
amountPaid["6786f3831d7a750bac397d8967b81044"] = 0
amountPaid["b697edf35473d4824127003363cad73d"] = {}
amountPaid["6786f3831d7a750bac397d8967b81044_1"] = 0
amountPaid["6786f3831d7a750bac397d8967b81044_2"] = 0
amountPaid["6786f3831d7a750bac397d8967b81044_3"] = 0
amountPaid["6786f3831d7a750bac397d8967b81044_4"] = 0
amountPaid["6786f3831d7a750bac397d8967b81044_5"] = 0
amountPaid["6786f3831d7a750bac397d8967b81044_6"] = 0
amountPaid["6786f3831d7a750bac397d8967b81044_7"] = 0
amountPaid["6786f3831d7a750bac397d8967b81044_8"] = 0
amountPaid["6786f3831d7a750bac397d8967b81044_9"] = 0
amountPaid["6786f3831d7a750bac397d8967b81044_10"] = 0
amountPaid["6786f3831d7a750bac397d8967b81044_11"] = 0
amountPaid["6786f3831d7a750bac397d8967b81044_12"] = 0
amountPaid["6786f3831d7a750bac397d8967b81044_13"] = 0
amountPaid["6786f3831d7a750bac397d8967b81044_14"] = 0
amountPaid["6786f3831d7a750bac397d8967b81044_15"] = 0

wechatPaid["cf9c0ca46b8825532677abe4261bbc30"] = 0
wechatPaid["6786f3831d7a750bac397d8967b81044"] = 0
wechatPaid["b697edf35473d4824127003363cad73d"] = 0
wechatPaid["6786f3831d7a750bac397d8967b81044_1"] = 0
wechatPaid["6786f3831d7a750bac397d8967b81044_2"] = 0
wechatPaid["6786f3831d7a750bac397d8967b81044_3"] = 0
wechatPaid["6786f3831d7a750bac397d8967b81044_4"] = 0
wechatPaid["6786f3831d7a750bac397d8967b81044_5"] = 0
wechatPaid["6786f3831d7a750bac397d8967b81044_6"] = 0
wechatPaid["6786f3831d7a750bac397d8967b81044_7"] = 0
wechatPaid["6786f3831d7a750bac397d8967b81044_8"] = 0
wechatPaid["6786f3831d7a750bac397d8967b81044_9"] = 0
wechatPaid["6786f3831d7a750bac397d8967b81044_10"] = 0
wechatPaid["6786f3831d7a750bac397d8967b81044_11"] = 0
wechatPaid["6786f3831d7a750bac397d8967b81044_12"] = 0
wechatPaid["6786f3831d7a750bac397d8967b81044_13"] = 0
wechatPaid["6786f3831d7a750bac397d8967b81044_14"] = 0
wechatPaid["6786f3831d7a750bac397d8967b81044_15"] = 0


coinPaid["cf9c0ca46b8825532677abe4261bbc30"] = 0
coinPaid["6786f3831d7a750bac397d8967b81044"] = 0
coinPaid["b697edf35473d4824127003363cad73d"] = 0
coinPaid["6786f3831d7a750bac397d8967b81044_1"] = 0
coinPaid["6786f3831d7a750bac397d8967b81044_2"] = 0
coinPaid["6786f3831d7a750bac397d8967b81044_3"] = 0
coinPaid["6786f3831d7a750bac397d8967b81044_4"] = 0
coinPaid["6786f3831d7a750bac397d8967b81044_5"] = 0
coinPaid["6786f3831d7a750bac397d8967b81044_6"] = 0
coinPaid["6786f3831d7a750bac397d8967b81044_7"] = 0
coinPaid["6786f3831d7a750bac397d8967b81044_8"] = 0
coinPaid["6786f3831d7a750bac397d8967b81044_9"] = 0
coinPaid["6786f3831d7a750bac397d8967b81044_10"] = 0
coinPaid["6786f3831d7a750bac397d8967b81044_11"] = 0
coinPaid["6786f3831d7a750bac397d8967b81044_12"] = 0
coinPaid["6786f3831d7a750bac397d8967b81044_13"] = 0
coinPaid["6786f3831d7a750bac397d8967b81044_14"] = 0
coinPaid["6786f3831d7a750bac397d8967b81044_15"] = 0


noOfRun["cf9c0ca46b8825532677abe4261bbc30"] = 0
noOfRun["6786f3831d7a750bac397d8967b81044"] = 0
noOfRun["b697edf35473d4824127003363cad73d"] = {}
noOfRun["6786f3831d7a750bac397d8967b81044_1"] = 0
noOfRun["6786f3831d7a750bac397d8967b81044_2"] = 0
noOfRun["6786f3831d7a750bac397d8967b81044_3"] = 0
noOfRun["6786f3831d7a750bac397d8967b81044_4"] = 0
noOfRun["6786f3831d7a750bac397d8967b81044_5"] = 0
noOfRun["6786f3831d7a750bac397d8967b81044_6"] = 0
noOfRun["6786f3831d7a750bac397d8967b81044_7"] = 0
noOfRun["6786f3831d7a750bac397d8967b81044_8"] = 0
noOfRun["6786f3831d7a750bac397d8967b81044_9"] = 0
noOfRun["6786f3831d7a750bac397d8967b81044_10"] = 0
noOfRun["6786f3831d7a750bac397d8967b81044_11"] = 0
noOfRun["6786f3831d7a750bac397d8967b81044_12"] = 0
noOfRun["6786f3831d7a750bac397d8967b81044_13"] = 0
noOfRun["6786f3831d7a750bac397d8967b81044_14"] = 0
noOfRun["6786f3831d7a750bac397d8967b81044_15"] = 0


doneTime["cf9c0ca46b8825532677abe4261bbc30"] = 0
doneTime["6786f3831d7a750bac397d8967b81044"] = 0
doneTime["b697edf35473d4824127003363cad73d"] = {}
doneTime["6786f3831d7a750bac397d8967b81044_1"] = 0
doneTime["6786f3831d7a750bac397d8967b81044_2"] = 0
doneTime["6786f3831d7a750bac397d8967b81044_3"] = 0
doneTime["6786f3831d7a750bac397d8967b81044_4"] = 0
doneTime["6786f3831d7a750bac397d8967b81044_5"] = 0
doneTime["6786f3831d7a750bac397d8967b81044_6"] = 0
doneTime["6786f3831d7a750bac397d8967b81044_7"] = 0
doneTime["6786f3831d7a750bac397d8967b81044_8"] = 0
doneTime["6786f3831d7a750bac397d8967b81044_9"] = 0
doneTime["6786f3831d7a750bac397d8967b81044_10"] = 0
doneTime["6786f3831d7a750bac397d8967b81044_11"] = 0
doneTime["6786f3831d7a750bac397d8967b81044_12"] = 0
doneTime["6786f3831d7a750bac397d8967b81044_13"] = 0
doneTime["6786f3831d7a750bac397d8967b81044_14"] = 0
doneTime["6786f3831d7a750bac397d8967b81044_15"] = 0


startTime["cf9c0ca46b8825532677abe4261bbc30"] = 0
startTime["6786f3831d7a750bac397d8967b81044"] = 0
startTime["b697edf35473d4824127003363cad73d"] = {}
startTime["6786f3831d7a750bac397d8967b81044_1"] = 0
startTime["6786f3831d7a750bac397d8967b81044_2"] = 0
startTime["6786f3831d7a750bac397d8967b81044_3"] = 0
startTime["6786f3831d7a750bac397d8967b81044_4"] = 0
startTime["6786f3831d7a750bac397d8967b81044_5"] = 0
startTime["6786f3831d7a750bac397d8967b81044_6"] = 0
startTime["6786f3831d7a750bac397d8967b81044_7"] = 0
startTime["6786f3831d7a750bac397d8967b81044_8"] = 0
startTime["6786f3831d7a750bac397d8967b81044_9"] = 0
startTime["6786f3831d7a750bac397d8967b81044_10"] = 0
startTime["6786f3831d7a750bac397d8967b81044_11"] = 0
startTime["6786f3831d7a750bac397d8967b81044_12"] = 0
startTime["6786f3831d7a750bac397d8967b81044_13"] = 0
startTime["6786f3831d7a750bac397d8967b81044_14"] = 0
startTime["6786f3831d7a750bac397d8967b81044_15"] = 0


typeOfMachine["cf9c0ca46b8825532677abe4261bbc30"] = "bill_acceptor"
typeOfMachine["6786f3831d7a750bac397d8967b81044"] = ""
typeOfMachine["b697edf35473d4824127003363cad73d"] = "dex_dryer_double"
typeOfMachine["6786f3831d7a750bac397d8967b81044_1"] = ""
typeOfMachine["6786f3831d7a750bac397d8967b81044_2"] = ""
typeOfMachine["6786f3831d7a750bac397d8967b81044_3"] = ""
typeOfMachine["6786f3831d7a750bac397d8967b81044_4"] = ""
typeOfMachine["6786f3831d7a750bac397d8967b81044_5"] = ""
typeOfMachine["6786f3831d7a750bac397d8967b81044_6"] = ""
typeOfMachine["6786f3831d7a750bac397d8967b81044_7"] = ""
typeOfMachine["6786f3831d7a750bac397d8967b81044_8"] = ""
typeOfMachine["6786f3831d7a750bac397d8967b81044_9"] = ""
typeOfMachine["6786f3831d7a750bac397d8967b81044_10"] = ""
typeOfMachine["6786f3831d7a750bac397d8967b81044_11"] = ""
typeOfMachine["6786f3831d7a750bac397d8967b81044_12"] = ""
typeOfMachine["6786f3831d7a750bac397d8967b81044_13"] = ""
typeOfMachine["6786f3831d7a750bac397d8967b81044_14"] = ""
typeOfMachine["6786f3831d7a750bac397d8967b81044_15"] = ""


lockCounter["6786f3831d7a750bac397d8967b81044_1"] = 0
lockCounter["6786f3831d7a750bac397d8967b81044_2"] = 0
lockCounter["6786f3831d7a750bac397d8967b81044_3"] = 0
lockCounter["6786f3831d7a750bac397d8967b81044_4"] = 0
lockCounter["6786f3831d7a750bac397d8967b81044_5"] = 0
lockCounter["6786f3831d7a750bac397d8967b81044_6"] = 0
lockCounter["6786f3831d7a750bac397d8967b81044_7"] = 0
lockCounter["6786f3831d7a750bac397d8967b81044_8"] = 0
lockCounter["6786f3831d7a750bac397d8967b81044_9"] = 0
lockCounter["6786f3831d7a750bac397d8967b81044_10"] = 0
lockCounter["6786f3831d7a750bac397d8967b81044_11"] = 0
lockCounter["6786f3831d7a750bac397d8967b81044_12"] = 0
lockCounter["6786f3831d7a750bac397d8967b81044_13"] = 0
lockCounter["6786f3831d7a750bac397d8967b81044_14"] = 0
lockCounter["6786f3831d7a750bac397d8967b81044_15"] = 0


mqttClient.on('connect', function () {
	mqttClient.subscribe('connectivity/+')
	mqttClient.subscribe('Lock/+')
	mqttClient.subscribe('coinIn/+')
})

mqttClient.on('message', function (topic, message) {
	if (topic.match(/connectivity/g)) {
		var pattern = /connectivity\/([0-9a-zA-Z_]+)/i
		var mchNo = topic.replace(pattern, "$1")
		if (message.toString() == "ON") {
			active[mchNo] = true
			console.log("Bee~")
		} else if (message.toString() == "OFF") {
			active[mchNo] = false
		}
	} else if (topic.match(/Lock/g)) {
		var pattern = /Lock\/([0-9a-zA-Z_]+)/i
		var mchNo = topic.replace(pattern, "$1")
		if (typeOfMachine[mchNo] == "dex_dryer_double") {
			if (message.toString() == "Locked1") {
				lockCounter[mchNo]++
				if (lockCounter[mchNo] == 5 ) {
					locked[mchNo].upper = true
					noOfRun[mchNo].upper++
					coinPaid[mchNo] = 0
					wechatPaid[mchNo] = 0
					startTime[mchNo].upper = moment().format("DD/MM/YYYY HH:mm:ss")
					console.log("startTime = " + startTime[mchNo])
				} else if (lockCounter <= 4) {
					locked[mchNo].upper= false
				}
			} else if (message.toString() == "Locked2") {
				lockCounter[mchNo]++
				if (lockCounter[mchNo] == 5 ) {
					locked[mchNo].lower = true
					noOfRun[mchNo].lower++
					coinPaid[mchNo] = 0
					wechatPaid[mchNo] = 0
					startTime[mchNo].lower = moment().format("DD/MM/YYYY HH:mm:ss")
					console.log("startTime = " + startTime[mchNo])
				} else if (lockCounter <= 4) {
					locked[mchNo].upper= false
				}
			} else if (message.toString() == "Unlocked2") {
				lockCounter[mchNo] = 0
				if (locked[mchNo].upper) {
					doneTime[mchNo].upper = moment().format("DD/MM/YYYY HH:mm:ss")
					var diff = moment(doneTime[mchNo].upper, "DD/MM/YYYY HH:mm:ss").diff(moment(startTime[mchNo].upper, "DD/MM/YYYY HH:mm:ss"));
					var d = moment.duration(diff);
					var timeTaken = [d.hours(), d.minutes(), d.seconds()].join(':')
					mchRunRecord(mchNo, "upper" , noOfRun[mchNo].upper, timeTaken, coinPaid[mchNo], wechatPaid[mchNo], "SUCCESS")
					console.log(myRunRecord[mchNo])
					console.log(myRunRecord[mchNo][noOfRun[mchNo]])
					save2csv("chkMachineRun", myRunRecord[mchNo][noOfRun[mchNo]])
					coinPaid[mchNo] = 0
					wechatPaid[mchNo] = 0
					console.log("doneTime = " + doneTime[mchNo].upper)
					console.log(timeTaken)
					locked[mchNo] = false
				} else {
					locked[mchNo] = false
				}
			} else if (message.toString() == "Unlocked2") {
				lockCounter[mchNo] = 0
				if (locked[mchNo]) {
					doneTime[mchNo].lower = moment().format("DD/MM/YYYY HH:mm:ss")
					var diff = moment(doneTime[mchNo].lower, "DD/MM/YYYY HH:mm:ss").diff(moment(startTime[mchNo].lower, "DD/MM/YYYY HH:mm:ss"));
					var d = moment.duration(diff);
					var timeTaken = [d.hours(), d.minutes(), d.seconds()].join(':')
					mchRunRecord(mchNo, "lower", noOfRun[mchNo].lower, timeTaken, coinPaid[mchNo], wechatPaid[mchNo], "SUCCESS")
					console.log(myRunRecord[mchNo])
					console.log(myRunRecord[mchNo][noOfRun[mchNo]])
					save2csv("chkMachineRun", myRunRecord[mchNo][noOfRun[mchNo]])
					coinPaid[mchNo] = 0
					wechatPaid[mchNo] = 0
					console.log("doneTime = " + doneTime[mchNo].lower)
					console.log(timeTaken)
					locked[mchNo] = false
				} else {
					locked[mchNo] = false
				}
			}
		} else if (typeOfMachine[mchNo] == ""){
			if (message.toString() == "Locked") {
				lockCounter[mchNo]++
				if (lockCounter[mchNo] == 5 ) {
					locked[mchNo] = true
					noOfRun[mchNo]++
					startTime[mchNo] = moment().format("DD/MM/YYYY HH:mm:ss")
					console.log("startTime = " + startTime[mchNo])

				} else if (lockCounter[mchNo] <= 4) {
					locked[mchNo] = false
				}
			} else if (message.toString() == "Unlocked") {
				lockCounter[mchNo] = 0
				if (locked[mchNo]) {
					doneTime[mchNo] = moment().format("DD/MM/YYYY HH:mm:ss")
					var diff = moment(doneTime[mchNo], "DD/MM/YYYY HH:mm:ss").diff(moment(startTime[mchNo], "DD/MM/YYYY HH:mm:ss"));
					var d = moment.duration(diff);
					var timeTaken = [d.hours(), d.minutes(), d.seconds()].join(':')
					mchRunRecord(mchNo, "NA", noOfRun[mchNo], timeTaken, coinPaid[mchNo], wechatPaid[mchNo], "SUCCESS")
					console.log(myRunRecord[mchNo])
					console.log(myRunRecord[mchNo][noOfRun[mchNo]])
					save2csv("chkMachineRun", myRunRecord[mchNo][noOfRun[mchNo]])
					coinPaid[mchNo] = 0
					wechatPaid[mchNo] = 0
					console.log("doneTime = " + doneTime[mchNo])
					console.log(timeTaken)
					locked[mchNo] = false
				} else {
					locked[mchNo] = false
				}
			}	
			console.log(message.toString() + "  " + mchNo)
		}
	} else if (topic.match(/coinIn/g)) {
		var pattern = /coinIn\/([0-9a-zA-Z_]+)/i
		var mchNo = topic.replace(pattern, "$1")
		if (typeOfMachine[mchNo] == "detergent") {
			if (message.toString() == "COIN1") {
				coinPaid[mchNo].ca1 = coinPaid[mchNo].ca1 + 1
				amountPaid[mchNo] = amountPaid[mchNo] + 1
			} else if (message.toString() == "COIN2") {
				coinPaid[mchNo].ca2 = coinPaid[mchNo].ca2 + 1
				amountPaid[mchNo] = amountPaid[mchNo] + 1
			}
		} else {
			coinPaid[mchNo] = coinPaid[mchNo] + 1
			amountPaid[mchNo] = amountPaid[mchNo] + 1
		}
		console.log(message.toString() + "  " + mchNo)
	}
})


function checkHeartbeat () {
	Object.keys(active).forEach(function(key) {
		var activity = active[key];
		var doneSent = sent[key];
		if (activity) {
			console.log("the device " + key + " is connected")
			if (doneSent) {
				var mailOptions = {
					from: 'ptutm.jameslsk@gmail.com',
					to: 'jamesleesukey@gmail.com',
					subject: 'Sending Email to notify that the falty machine is back to normal condition',
					text: key + " is working normally now."
				};
				//transporter.sendMail(mailOptions, function(error, info){
				//	if (error) {
				//		console.log(error);
				//	} else {
				//		console.log('Email sent: ' + info.response);
				//	}
				//});
				sent[key] = false
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
				//transporter.sendMail(mailOptions, function(error, info){
				//	if (error) {
				//		console.log(error);
				//	} else {
				//		console.log('Email sent: ' + info.response);
				//	}
				//});
				sent[key] = true
			}
		}
	});
}
setInterval(checkHeartbeat, 60000);
	

/////////////////////////////////////
///// Functions declarations ////////
/////////////////////////////////////

function onMachine(machine_no, money) {
	money_str = money.toString()
	mqttClient.publish(machine_no, money_str)
}
var end = false;
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

function mchRunRecord(mchCode, side, noOfRun, runTime, coinPaid, wechatPaid, status){
	myRunRecord[mchCode] = {};
	myRunRecord[mchCode][noOfRun] = {};
	myRunRecord[mchCode][noOfRun].no = noOfRun;
	myRunRecord[mchCode][noOfRun].machine = mchCode;
	myRunRecord[mchCode][noOfRun].side = side;
	myRunRecord[mchCode][noOfRun].runTime = runTime;
	myRunRecord[mchCode][noOfRun].Wechat_received = wechatPaid;
	myRunRecord[mchCode][noOfRun].Coin_received = coinPaid;
	myRunRecord[mchCode][noOfRun].status = status;
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
			createEntry(mchNo, transId, myItem.order.title, myItem.order.amount, myItem.payee.userId, myItem.createdAt, myItem.updatedAt, myItem.status)
			setTimeout(checkMachineStatus, 10000, transId, mchNo)
			//}console.log(myTransRecord[transId])
			var amountToPay = myItem.order.amount/100
			if (amountToPay <= 25) {
				if (active[mchNo]) {
					onMachine(mchNo,amountToPay)
					//setTimeout(checkMachineStatus, 20000, transId, mchNo)
					wechatPaid[mchNo] = wechatPaid[mchNo] + amountToPay 
					amountPaid[mchNo] = amountPaid[mchNo] + amountToPay
					res.status(200).send ("Payment has been paid, Thanks for using our service.")
				} else {
					refundPayment(transId, myItem.order.amount, "The machine is not ready for Epayment right now.", "FULL")
					res.status(200).send("Sorry, This machine is not ready for Epayment right now. Please try again later. ")
				}
			} else {
				refundPayment(transId, myItem.order.amount, "The payment is too much", "FULL")
				res.status(200).send("The payment is too much");			
			}
		}
	})
	//res.status(200).send(req.body);
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
