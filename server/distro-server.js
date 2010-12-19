require.paths.unshift(__dirname + "/vendor");

var util = require('util'),
	fs = require('fs'),
	mongoDB = require('mongodb'),
	url = require('url'),
	_ = require('underscore.js'),
	connect = require('connect'),
	crypto = require('crypto'),
	distro = require('./lib'),
	uuid = require('uuid');

global.db = new mongoDB.Db('Distro', new mongoDB.Server(process.env['MONGO_NODE_DRIVER_HOST'] ||  'localhost', process.env['MONGO_NODE_DRIVER_PORT'] || mongoDB.Connection.DEFAULT_PORT, {}), {native_parser:true});
global.users = new DISTROUsers();
global.sessions = new DISTROSessions();
global.bands = new DISTROBands();

function DISTROUsers(){}
DISTROUsers.prototype.init = function(callback){
	var self = this;
	global.db.collection('users', function(err, collection){
		if (err) {
			throw err;
		} else if (!collection) {
			throw "users collection is not defined";
		} else {
			self.collection = collection;
			callback();
		}
	});
};
DISTROUsers.hash = function(password, salt){
	return new crypto.Hash("sha1").update(password + salt).digest("hex");
};
DISTROUsers.passwordIsAcceptable = function(password){
	return (password.length > 2);
};
DISTROUsers.prototype.userExists = function(email, callback){
	//This regex isn't _nearly_ complete, but it mostly works (The alternative is a page long PCRE that is completely compliant with RFC 822)
	//If we decide we want the _insanely_ long one, an example is here http://www.ex-parrot.com/pdw/Mail-RFC822-Address.html
	var re = /^[-a-z0-9~!$%^&*_=+}{\'?]+(\.[-a-z0-9~!$%^&*_=+}{\'?]+)*@([a-z0-9_][-a-z0-9_]*(\.[-a-z0-9_]+)*\.(aero|arpa|biz|com|coop|edu|gov|info|int|mil|museum|name|net|org|pro|travel|mobi|[a-z][a-z])|([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}))(:[0-9]{1,5})?$/i;
	if (re.test(email)){
		this.collection.findOne({"email":email}, function(err, result){
			callback(err, !!result);
		});
	} else {callback(new distro.error.ClientError("email invalid"), null);}
};
DISTROUsers.prototype.userWithCredentials = function(email, password, callback){
	if (!email || !password){
		callback(new Error("Missing credentials"), false);
		return;
	}
	this.collection.findOne({"email":email}, function(err, result){
		if(err){
			callback(err, null);
		}
		if (result && result.salt && result.hash && DISTROUsers.hash(password, result.salt) === result.hash){
			callback(null, result);
		} else {
			callback(null, null);
		}
	});
};
DISTROUsers.prototype.userWithUserID = function(userID, callback){
	if (!(userID instanceof mongoDB.ObjectID)){
		userID = new mongoDB.ObjectID(userID);
	}
	this.collection.findOne({"_id":userID}, callback);
};
DISTROUsers.prototype.registerUser = function(email, password, callback){
	var self = this;
	var salt = Math.floor(Math.random() * 0x100000000).toString(16);
	self.userExists(email, function(err, exists){
		if(err){
			callback(err, null);
		} else if (exists){
			callback("user already exists!", null);
		} else {
			self.collection.insert({"email":email, "hash":DISTROUsers.hash(password, salt), "salt":salt}, function(err, doc){
				callback(err, doc[0]._id);
			});
		}
	});
};

function DISTROSessions(){}
DISTROSessions.prototype.init = function(callback){
	var self = this;
	global.db.collection('sessions', function(err, collection){
		if (err) {
			throw err;
		} else if (!collection) {
			throw "sessions collection is not defined";
		} else {
			self.collection = collection;
			callback();
		}
	});
};
DISTROSessions.SESSION_NAME = 'distro_session'; // Session cookie name
DISTROSessions.SESSION_LENGTH = 86400000; // Twenty four hours
DISTROSessions.EXTENDED_SESSION_LENGTH = 15778463000; // Six months
DISTROSessions.TIME_TO_REFRESH = 600000; //Ten minutes
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
	if (sessionID){
		this.collection.findOne({"session":sessionID}, function(err, doc){
			if (err) { callback(err, null); return; }
			if (!doc || +doc.lastRenewal + (doc.extended ? DISTROSessions.EXTENDED_SESSION_LENGTH : DISTROSessions.SESSION_LENGTH) < new Date) {
				// TODO: Extend sessions when they get close to expiration
				DISTROSessions.attachCookieToResponse("", {expires:new Date(0)}, res); //Destroy Cookie
				callback(null, null, null);
			} else {
				// Success!
				global.users.userWithUserID(doc.userID, function(err, user){
					if(err) { callback(err, null, null); return; }
					if(user && user.email){
						callback(null, user, sessionID);
					} else {
						DISTROSessions.attachCookieToResponse("", {expires:new Date(0)}, res); //Destroy Cookie
						callback(null, null, null);
					}
				});
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
	var sessionID = uuid.generate('ascii');
	this.collection.insert({"userID":userID, "session":sessionID, "lastRenewal":new Date, "extended":extendedSession}, function(err, doc){
		if (err){
			callback(err);
			return;
		}
		var cookieOpts = {};
		if (extendedSession) {
			cookieOpts.expires = new Date(+new Date + DISTROSessions.EXTENDED_SESSION_LENGTH);
		}
		DISTROSessions.attachCookieToResponse(sessionID, cookieOpts, res);
		callback(null);
	});
};

function DISTROBands(){}
DISTROBands.prototype.init = function(callback){
	var self = this;
	global.db.collection('bands', function(err, collection){
		if(err) {
			throw err;
		} else if(!collection) {
			throw "bands collection is not defined";
		} else {
			self.collection = collection;
			callback();
		}
	});
};
DISTROBands.prototype.findBandByID = function(bandID, callback){
	this.collection.findOne({"bandID":bandID}, function(err, bandDoc){ //this.collection seems to be undefined...
		if(err) {
			callback(err, null);
		} else if(!doc){
			callback("band not found", null);
		} else {
			callback(err, bandDoc);
		}
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

global.db.open(function(err, db){
	if (err){
		throw err;
	}
	initMany(global.users, global.sessions, function(){
		connect.createServer(
			connect.logger(),
			connect.cookieDecoder(),
			connect.bodyDecoder(),
			connect.router(function(app) {
				function methodNotAllowed(req, res, params){
					res.writeHead(405);
					res.end("Method Not Allowed");
				}

				app.get('/', distro.request.handleRequest(true, function(session, req, res, successback, errback){
					successback({response: "Welcome, "+session.user.email+"!"});
				}));
				app.get('/login', methodNotAllowed);
				app.post('/login', distro.request.handleRequest(false, function(session, req, res, successback, errback){
					var login = req.body;
					if(login && login.email && login.password){
						global.users.userWithCredentials(login.email, login.password, function(err, user){
							if(user){
								global.sessions.startSessionForUserID(user._id, login.extendedSession, req, res, function(err){
									if(err){
										errback(err);
									} else {
										successback({userName:user.email});
									}
								});	
							} else {
								errback(new distro.error.ClientError("Invalid credentials"));
							}
						});
					} else {
						res.writeHead(403);
						res.end("Can't do that: Login invalid");
					}
				}));
				app.get('/logout', methodNotAllowed);
				app.post('/logout', distro.request.handleRequest(true, function(session, req, res, successback, errback){
					global.sessions.endSession(session.sessionID, res, function(err){
						if (err) {
							errback(err);
						} else {
							successback({userName:null});
						}
					});
				}));
				app.get('/register', methodNotAllowed);
				app.post('/register', distro.request.handleRequest(false, function(session, req, res, successback, errback){
					var body = req.body;
					if(body && body.email && body.password){
						global.users.registerUser(body.email, body.password, function(err, userID){
							if (err) {
								errback(new distro.error.ClientError(err));
							} else if(userID){
								global.sessions.startSessionForUserID(userID, null, req, res, function(err){
									if(err){
										errback(err);
									} else {
										successback();
									}
								});
								//successback();
							} else {
								res.writeHead(403);
								res.end("Can't do that: " + err);
							}
						});
					} else {
						res.writeHead(403);
						res.end("You didn't send me the codes");//This should be a little more descriptive
					}
				}));
				app.get('/badthings', function(){
					setTimeout(function(){ throw new Error("BAD THINGS GO BOOM"); }, 0); //TODO: FIND A SOLUTION FOR THIS (Maybe just set a global exception handler in node?)
				});
				app.get('/b/:bandID', distro.request.handleRequest(false, function(session, req, res, successback, errback){
					global.bands.findBandByID(req.bandID, function(err, bandDoc){
						if(err){
							errback(err);
						} else if(JSON.stringify(bandDoc)){
							successback(bandDoc);
						} else {
							errback(new distro.error.ClientError("something bad happened"));
						}
					});
				}));
			}),
			connect.staticProvider(__dirname + '/static')
		).listen(3000);
		util.log('Alive on port 3000');
	});
});