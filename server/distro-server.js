require.paths.unshift(__dirname + "/vendor");

var util = require('util'),
	fs = require('fs'),
	mongoDB = require('mongodb'),
	url = require('url'),
	_ = require('underscore.js'),
	connect = require('connect'),
	distro = require('./lib'),
	port = process.env.PRODUCTION ? 8085 : 3000;

global.db = new mongoDB.Db('Distro', new mongoDB.Server(process.env['MONGO_NODE_DRIVER_HOST'] ||  'localhost', process.env['MONGO_NODE_DRIVER_PORT'] || mongoDB.Connection.DEFAULT_PORT, {}), {native_parser:true});
global.users = new distro.Users();
global.sessions = new distro.Sessions();
global.tracks = new distro.Tracks();
global.networks = new distro.Networks();

global.db.open(function(err, db){
	if (err){
		throw err;
	}
	distro.init(function(){
		connect.createServer(
			connect.logger(),
			connect.cookieDecoder(),
			connect.bodyDecoder(),
			connect.staticProvider(__dirname + '/static/main'),
			connect.staticProvider(__dirname + '/static/common')
		)
		.use('/api/', connect.router(function(app) {
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
							global.sessions.startSessionForUserID(user._id, login.rememberMe, req, res, function(err){
								if(err){
									errback(err);
								} else {
									successback(null, {userName:user.email});
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
						successback(null, {userName:null});
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
									successback(null, {userName: body.email});
								}
							});
						}
					});
				} else {
					errback(new distro.error.ClientError("registration.errors.noCredentials"));
				}
			}));
			app.get('/library', distro.request.handleRequest(false, function(session, req, res, successback, errback){
				var user = distro.Users.userOrGeneric(session && session.user);
				global.users.subscriptions(user, function(err, subscriptions){
					if (err) {
						errback(err);
					} else {
						global.tracks.tracksForSubscriptions(user.subscriptions, function(err, tracks){
							if (err) {
								errback(err);
							} else {
								successback({tracks: tracks, subscriptions: subscriptions});
							}
						});
					}
				});
			}));
			app.get('/library/tracks', distro.request.handleRequest(false, function(session, req, res, successback, errback){
				var user = distro.Users.userOrGeneric(session && session.user);
				global.tracks.tracksForSubscriptions(user.subscriptions, function(err, tracks){
					if (err) {
						errback(err);
					} else {
						successback(tracks);
					}
				});
			}));
			app.post('/library/subscriptions', distro.request.handleRequest(true, function(session, req, res, successback, errback){
				if (!req.body || !req.body.name) {
					errback(new distro.error.ClientError("networks.errors.noNetwork"));
					return;
				}
				global.networks.findNetworkByName(req.body.name, {}, function(err, doc){
					if (err) {
						errback(err);
					} else if (doc) {
						global.users.subscribeToNetwork(session.user, doc._id, function(err){
							if (err) {
								errback(err);
							}
							successback({ id: doc.name, name: doc.name, fullname: doc.fullname });
						});
					} else {
						errback(new distro.error.ClientError("networks.errors.noNetwork"));
					}
				});
			}));
			app.get('/search/:search', distro.request.handleRequest(false, function(session, req, res, successback, errback){
				global.networks.search(req.params.search, function(err, returnData){
					successback(returnData);
				});
			}));
			app.get('/networks/:name', distro.request.handleRequest(false, function(session, req, res, successback, errback){
				global.networks.findNetworkByName(req.params.name, { _id: false }, function(err, doc){
					if(err){
						errback(err);
					} else if(doc){
						if ('presence' in doc) {
							var presenceMap = doc.presence, presenceArray = [], presenceItem;
							distro.Networks.PRESENCE.forEach(function(presenceSpec){
								if ((presenceItem = presenceMap[presenceSpec.name])) {
									presenceArray.push({
										name: presenceSpec.name,
										url: (presenceSpec.prefix || '') + presenceItem + (presenceSpec.suffix || '')
									});
								}
								if (presenceArray.length) {
									doc.presence = presenceArray;
								} else {
									delete doc.presence;
								}
							});
						}
						successback(doc);
					} else {
						errback(new distro.error.ClientError("networks.errors.noNetwork"));
					}
				});
			}));
		}))
		.use('/', connect.router(function(app){
			app.get('/:network', function(req, res){
				var target = req.params && req.params.network || '';
				res.writeHead(302, { Location: ("/#/" + encodeURIComponent(target)) });
				res.end();
			});
			app.get('/about/:page', function(req, res){
				var target = req.params && req.params.page || '';
				res.writeHead('302', { Location: ('/#/about/' + encodeURIComponent(target)) });
				res.end();
			});
		}))
		/*.use('/', connect.router())*/
		.listen(port);
		util.log('Alive on port '+port);
	});
});
