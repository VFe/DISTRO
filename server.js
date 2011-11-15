var util = require('util'),
	fs = require('fs'),
	mongoDB = require('mongodb'),
	url = require('url'),
	connect = require('connect'),
	distro = require('./lib/distro'),
	port = process.env.PRODUCTION ? 8085 : 3000;

global.db = new mongoDB.Db('Distro', new mongoDB.Server(process.env['MONGO_NODE_DRIVER_HOST'] ||  'localhost', process.env['MONGO_NODE_DRIVER_PORT'] || mongoDB.Connection.DEFAULT_PORT, {}), {native_parser: 'BSONNative' in mongoDB});
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
			connect.cookieParser(),
			connect.bodyParser(),
			connect.static(__dirname + '/static')
		)
		.use('/api/', distro.middleware.prelude)
		.use('/api/', distro.middleware.getUser)
		.use('/api/', connect.router(function(app) {
			app.param('network', function(req, res, next, network){
				global.networks.findNetworkByName(network, { _id: false }, function(err, doc){
					if (err) {
						next(err);
					} else if (doc) {
						req.params.network = doc;
						next();
					} else {
						next(new distro.error.ClientError("networks.errors.noNetwork"));
					}
				});
			});
			
			app.post('/login', function(req, res, next){
				var login = req.body;
				if(login && login.email && login.password){
					global.users.userWithCredentials(login.email, login.password, function(err, user){
						if (req.session) {
							// The cookie is cleared synchronously, so it's safe to not wait to call startSessionForUserID
							global.sessions.endSession(req.session.id, res, function(){});
						}
						if(user){
							global.sessions.startSessionForUserID(user._id, login.rememberMe, req, res, function(err){
								if(err){
									next(err);
								} else {
									res.setMetadata({ userName:user.email });
									res.send();
								}
							});	
						} else {
							next(new distro.error.ClientError("registration.errors.invalidCredentials"));
						}
					});
				} else {
					next(new distro.error.ClientError("registration.errors.noCredentials"));
				}
			});
			app.post('/logout', distro.middleware.ensureUser(), function(req, res, next){
				global.sessions.endSession(req.session.id, res, function(err){
					if (err) {
						next(err);
					} else {
						res.setMetadata({ userName: null });
						res.send();
					}
				});
			});
			app.post('/register', function(req, res, next){
				var body = req.body;
				if(body && body.email && body.password){
					global.users.registerUser(body.email, body.password, function(err, user){
						if (err) {
							next(err);
						} else {
							global.sessions.startSessionForUserID(user._id, null, req, res, function(err){
								if(err){
									next(err);
								} else {
									res.setMetadata({ userName: body.email });
									res.send();
								}
							});
						}
					});
				} else {
					next(new distro.error.ClientError("registration.errors.noCredentials"));
				}
			});
			app.get('/library', function(req, res, next){
				var user = global.users.userOrGeneric(req.session && req.session.user);
				global.users.subscriptions(user, function(err, subscriptions){
					if (err) {
						next(err);
					} else {
						global.tracks.tracksForSubscriptions(user.subscriptions, function(err, tracks){
							if (err) {
								next(err);
							} else {
								res.send({tracks: tracks, subscriptions: subscriptions});
							}
						});
					}
				});
			});
			app.get('/library/tracks', function(req, res, next){
				var user = global.users.userOrGeneric(req.user);
				global.tracks.tracksForSubscriptions(user.subscriptions, function(err, tracks){
					if (err) {
						next(err);
					} else {
						res.send(tracks);
					}
				});
			});
			app.post('/library/subscriptions', distro.middleware.ensureUser({ create: true }), function(req, res, next){
				if (!req.body || !req.body.name) {
					next(new distro.error.ClientError("networks.errors.noNetwork"));
					return;
				}
				global.networks.findNetworkByName(req.body.name, {}, function(err, doc){
					if (err) {
						next(err);
					} else if (doc) {
						global.users.subscribeToNetwork(req.user, doc._id, function(err){
							if (err) {
								next(err);
							}
							res.send({ id: doc.name, name: doc.name, fullname: doc.fullname });
						});
					} else {
						next(new distro.error.ClientError("networks.errors.noNetwork"));
					}
				});
			});
			app.get('/search/:search', function(req, res, next){
				global.networks.search(req.params.search, function(err, returnData){
					res.send(returnData);
				});
			});
			app.get('/livenetworks', function(req, res, next){
				global.networks.liveNetworks(function(err, results){
					if (err) {
						next(err);
					} else {
						res.send(results);
					}
				});
			});
			app.get('/networks/:network', function(req, res, next){
				var network = req.params.network;
				if ('presence' in network) {
					var presenceMap = network.presence, presenceArray = [], presenceItem;
					distro.Networks.PRESENCE.forEach(function(presenceSpec){
						if ((presenceItem = presenceMap[presenceSpec.name])) {
							presenceArray.push({
								name: presenceSpec.name,
								url: (presenceSpec.prefix || '') + presenceItem + (presenceSpec.suffix || '')
							});
						}
						if (presenceArray.length) {
							network.presence = presenceArray;
						} else {
							delete network.presence;
						}
					});
				}
				res.send(network);
			});
		}))
		.use('/api/', distro.middleware.errorHandler)
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
