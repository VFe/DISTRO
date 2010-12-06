require.paths.unshift(__dirname + "/vendor");

var util = require('util'),
	fs = require('fs'),
	Db = require('mongodb').Db,
	Connection = require('mongodb').Connection,
	Server = require('mongodb').Server,
	querystring = require('querystring'),
	staticServer = require('node-static'),
	url = require('url'),
	_ = require('underscore.js'),
	connect = require('connect'),
	auth = require('connect-auth');

global.db = new Db('Distro', new Server(process.env['MONGO_NODE_DRIVER_HOST'] ||  'localhost', process.env['MONGO_NODE_DRIVER_PORT'] || Connection.DEFAULT_PORT, {}), {native_parser:true});
global.users = new DISTROUsers();
global.sessions = new DISTROSessions();

function DISTROUsers(){}
DISTROUsers.prototype.init = function(callback){
	global.db.collection('users', function(err, collection){
		if (err) {
			throw err;
		} else if (!collection) {
			throw "Collection is not defined";
		} else {
			this.collection = collection;
			callback();
		}
	});
}


function DISTROSessions(){}
DISTROSessions.prototype.init = function(callback){
	global.db.collection('sessions', function(err, collection){
		if (err) {
			throw err;
		} else if (!collection) {
			throw "Collection is not defined";
		} else {
			this.collection = collection;
			callback();
		}
	});
}


function initMany(){
	var callees = Array.prototype.slice.call(arguments, 0, arguments.length - 1),
	    remaining = callees.length;
		callback = arguments[arguments.length - 1];
	if (callees.length === 0) {
		setTimeout(callback, 0);
	}
	function ownCallback(){
		if (--remaining === 0) {
			callback();
		}
	}
	callees.forEach(function(callee){
		callee.init(ownCallback);
	});
}

function handleDISTRORequest(callback){
	return function(req, res, params){
		var sessionID = req.cookies.session,
		    session,
		    responseContent = {status: "OK"};
		if (sessionID && (session = distroSessions.sessionIsValid(sessionID))) { // session = {userID: 12345, userName: "Steve"}
			connect.utils.merge(responseContent, callback(session, req, res, params));
			res.writeHead(200);
		} else {
			responseContent.status = "error";
			responseContent.error = "You are not logged in";
			res.writeHead(401);
		}
		res.end(JSON.stringify(responseContent));
	}
};

global.db.open(function(err, db){
	if (err){
		throw err;
	}
	initMany(global.users, global.sessions, function(){
		connect.createServer(
		connect.cookieDecoder(),
		connect.bodyDecoder(),
		connect.router(function(app) {
			app.get('/', handleDISTRORequest(function(){
				return {message: "Hello, World!"};
			}));
		})).listen(3000);
		util.log('Alive on port 3000');
	});
});