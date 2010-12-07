require.paths.unshift(__dirname + "/vendor");

var util = require('util'),
	fs = require('fs'),
	mongoDB = require('mongodb'),
	querystring = require('querystring'),
	staticServer = require('node-static'),
	url = require('url'),
	_ = require('underscore.js'),
	connect = require('connect'),
	crypto = require('crypto');

global.db = new mongoDB.Db('Distro', new mongoDB.Server(process.env['MONGO_NODE_DRIVER_HOST'] ||  'localhost', process.env['MONGO_NODE_DRIVER_PORT'] || mongoDB.Connection.DEFAULT_PORT, {}), {native_parser:true});
global.users = new DISTROUsers();
global.sessions = new DISTROSessions();

function DISTROUsers(){}
DISTROUsers.prototype.init = function(callback){
	var self = this;
	global.db.collection('users', function(err, collection){
		if (err) {
			throw err;
		} else if (!collection) {
			throw "Collection is not defined";
		} else {
			self.collection = collection;
			callback();
		}
	});
}
DISTROUsers.hash = function(password, salt){
	return new crypto.Hash("sha1").update(password + salt).digest("hex");
}
DISTROUsers.passwordIsAcceptable = function(password){
	return (password.length > 2);
}
DISTROUsers.prototype.userExists = function(email, callback){
	this.collection.findOne({"email":email}, function(err, result){
		callback(err, !!result);
	});
}
DISTROUsers.prototype.validateUser = function(email, password, callback){
	if (!email || !password){
		callback(new Error("Missing credentials"), false);
		return;
	}
	this.collection.findOne({"email":email}, function(err, result){
		if(err){
			callback(err, null);
		}
		if (result && result.salt && result.hash && DISTROUsers.hash(password, result.salt) === result.hash){
			callback(null, result._id);
		} else {
			callback(null, null);
		}
	});
}
DISTROUsers.prototype.registerUser = function(email, password, callback){
	var self = this;
	var salt = Math.floor(Math.random() * 0x100000000).toString(16);
	self.userExists(email, function(err, exists){
		if (exists){
			callback("user already exists!", null);
		} else {
			self.collection.insert({"email":email, "password":password, "hash":DISTROUsers.hash(password, salt), "salt":salt}, function(err, doc){
				callback(err, doc[0]._id);
			});
		}
	});
}


function DISTROSessions(){}
DISTROSessions.prototype.init = function(callback){
	var self = this;
	global.db.collection('sessions', function(err, collection){
		if (err) {
			throw err;
		} else if (!collection) {
			throw "Collection is not defined";
		} else {
			self.collection = collection;
			callback();
		}
	});
};
DISTROSessions.SESSION_NAME = 'distro_session'; // Session cookie name
DISTROSessions.SESSION_LENGTH = 86400000; // Twenty four hours
DISTROSessions.EXTENDED_SESSION_LENGTH = 15778463000; // Six months
DISTROSessions.attachCookieToResponse = function (value, options, res){
	
	// Based on Connect's session middleware
	options.HttpOnly = true;
	var cookieString = connect.utils.serializeCookie(DISTROSessions.SESSION_NAME, value, options);
	writeHead = res.writeHead;
	res.writeHead = function(status, headers){
		// Multiple Set-Cookie headers
		headers = headers || {};
		if (headers['Set-Cookie']) {
			headers['Set-Cookie'] += '\r\nSet-Cookie: ' + cookieString;
		} else {
			headers['Set-Cookie'] = cookieString;
		}
		
		// Pass through the writeHead call
		res.writeHead = writeHead;
		return res.writeHead(status, headers);
	};
};
DISTROSessions.prototype.getRequestSession = function(req, res, callback){
	var sessionID = req.cookies && req.cookies.distro_session;
	if ((sessionID = mongoDB.ObjectID(sessionID))){
		this.collection.findOne({"_id":sessionID}, function(err, doc){
			if (err) { callback(err, null); return; }
			if (!doc || +doc.lastRenewal + (doc.extended ? DISTROSessions.EXTENDED_SESSION_LENGTH : DISTROSessions.SESSION_LENGTH) < new Date) {
				DISTROSessions.attachCookieToResponse("", {expires:new Date(0)}, res); //Destroy Cookie
				callback("No, no. Session expire.", null);
			} else {
				// Success!
				callback(null, doc.userID, sessionID);
			}
		});
	} else {
		callback(null, null, null);
	}
};
DISTROSessions.prototype.endSession = function(sessionID, res, callback){
	this.collection.remove(sessionID, function(err){
		callback(err);
	});
	DISTROSessions.attachCookieToResponse("", {expires:new Date(0)}, res); //Destroy Cookie
};
DISTROSessions.prototype.startSessionForUserID = function (userID, extendedSession, req, res, callback){
	this.collection.insert({"userID":userID, "lastRenewal":new Date, "extended":extendedSession}, function(err, doc){
		if (err){
			callback(err);
			return;
		}
		var sessionID = doc[0]._id.toHexString(),
		    cookieOpts = {};
		if (extendedSession) {
			cookieOpts.expires = new Date(+new Date + DISTROSessions.EXTENDED_SESSION_LENGTH);
		}
		DISTROSessions.attachCookieToResponse(sessionID, cookieOpts, res);
		callback(null);
	});
};

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
		responseContent = {status: "OK"};
		global.sessions.getRequestSession(req, res, function(err, userID, sessionID){
			if (err || !userID){
				res.writeHead(403);
				responseContent.status = "error";
				responseContent.errorMessage = "Can't let you do that dave!";
				if (err) {
					responseContent.errorDetails = err;
				}
			} else {
				connect.utils.merge(responseContent, callback({user: userID, session: sessionID}, req, res, params));
				res.writeHead(200);
			}
			res.end(JSON.stringify(responseContent));
		});
	};
};

function DISTROInternalServerError(error, res){
	if (DISTROInternalServerError.logToConsole){
		sys.error(err.stack);
	}
	
	if (DISTROInternalServerError.logToResponse){
		res.writeHead(500, { 'Content-Type': 'text/plain' });
		res.end(err.stack);
	} else {
		res.writeHead(500);
		res.end("BROKEN...");
	}
}
DISTROInternalServerError.logToConsole = true;
DISTROInternalServerError.logToResponse = true;

global.db.open(function(err, db){
	if (err){
		throw err;
	}
	initMany(global.users, global.sessions, function(){
		connect.createServer(
		connect.cookieDecoder(),
		connect.bodyDecoder(),
		connect.router(function(app) {
			function methodNotAllowed(req, res, params){
				res.writeHead(405);
				res.end("Method Not Allowed");
			}

			app.get('/', handleDISTRORequest(function(session, req, res, params){
				return {response: "You win!"};
			}));
			app.get('/login', methodNotAllowed);
			app.post('/login', function(req, res, params){
				var body = req.body;
				if(body && body.email && body.password){
					global.users.validateUser(body.email, body.password, function(err, userID){
						if(userID){
							global.sessions.startSessionForUserID(userID, body.extendedSession, req, res, function(err){
								if(err){
									DISTROInternalServerError(err, res);
								} else {
									res.writeHead(200);
									res.end("OK!");
								}
							});	
						} else {
							res.writeHead(403);
							res.end("Can't do that: Login invalid");
						}
					});
				} else {
					res.writeHead(403);
					res.end("Login invalid");
				}
			});
			app.get('/logout', methodNotAllowed);
			app.post('/logout', handleDISTRORequest(function(session, req, res, params){
				global.sessions.endSession(session.sessionID, res, function(err){
					// Need to handle error; there is a better way to do this than copypasting 500s all over the place
					// unfinished!
					
				})
			}));
			app.get('/register', methodNotAllowed);
			app.post('/register', function(req, res, params){
				var body = req.body;
				if(body && body.email && body.password){
					global.users.registerUser(body.email, body.password, function(err, userID){
						if(userID){
							res.writeHead(200);
							res.end("created: " + userID.toHexString());
						} else {
							res.writeHead(403);
							res.end("Can't do that: " + err);
						}
					});
				} else {
					res.writeHead(403);
					res.end("You didn't send me the codes");
				}
			});
			app.get('/badthings', function(){
				setTimeout(function(){ throw new Error("Foo") }, 0);
			});
		})).listen(3000);
		util.log('Alive on port 3000');
	});
});