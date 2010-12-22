require.paths.unshift(__dirname + "/vendor");

var util = require('util'),
	fs = require('fs'),
	mongoDB = require('mongodb'),
	url = require('url'),
	_ = require('underscore.js'),
	connect = require('connect'),
	distro = require('./lib');

global.db = new mongoDB.Db('Distro', new mongoDB.Server(process.env['MONGO_NODE_DRIVER_HOST'] ||  'localhost', process.env['MONGO_NODE_DRIVER_PORT'] || mongoDB.Connection.DEFAULT_PORT, {}), {native_parser:true});
global.users = new distro.Users();
global.sessions = new distro.Sessions();
global.bands = new distro.Bands();

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
	initMany(global.users, global.sessions, global.bands, function(){
		connect.createServer(
			connect.logger(),
			connect.cookieDecoder(),
			connect.bodyDecoder(),
			connect.router(function(app) {
				function methodNotAllowed(req, res, params){
					res.writeHead(405);
					res.end("Method Not Allowed");
				}

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
								errback(new distro.error.ClientError("registration.errors.invalidCredentials"));
							}
						});
					} else {
						errback(new distro.error.ClientError("registration.errors.noCredentials"));
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
								errback(err);
							} else {
								global.sessions.startSessionForUserID(userID, null, req, res, function(err){
									if(err){
										errback(err);
									} else {
										successback({userName: body.email});
									}
								});
							}
						});
					} else {
						errback(new distro.error.ClientError("registration.errors.noCredentials"));
					}
				}));
				app.get('/ping', distro.request.handleRequest(true, function(session, req, res, successback, errback){
					successback();
				}));
				app.get('/:bandID', distro.request.handleRequest(false, function(session, req, res, successback, errback){
					global.bands.findBandByID(req.params.bandID, function(err, bandDoc){
						if(err){
							errback(err);
						} else if(JSON.stringify(bandDoc)){
							successback(bandDoc);
						} else {
							errback(new distro.error.ClientError("bands.errors.noBand"));
						}
					});
				}));
			}),
			connect.staticProvider(__dirname + '/static')
		).listen(3000);
		util.log('Alive on port 3000');
	});
});