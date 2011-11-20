var util = require('util'),
	fs = require('fs'),
	path = require('path'),
	mongodb = require('mongodb'),
	url = require('url'),
	connect = require('connect'),
	form = require('connect-form'),
	distro = require('./lib/distro'),
	async = require('async'),
	port = process.env.PRODUCTION ? 8085 : 3000;

global.db = new mongodb.Db('Distro', new mongodb.Server(process.env['MONGO_NODE_DRIVER_HOST'] ||  'localhost', process.env['MONGO_NODE_DRIVER_PORT'] || 27017, {}), {native_parser: 'BSONNative' in mongodb});
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
			connect['static'](__dirname + '/static')
		)
		.use('/api/', form({ keepExtensions: true }))
		.use('/api/', distro.FileUpload.middleware)
		.use('/api/', distro.middleware.prelude)
		.use('/api/', distro.middleware.getUser)
		.use('/api/', connect.router(function(app) {
			app.param('network', function(req, res, next, network){
				global.networks.findNetworkByName(network, function(err, doc){
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
				global.users.subscriptions(req.session || { user: user }, function(err, subscriptions){
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
				if (distro.Networks.isAdmin(req.session, network)) {
					network.admin = true;
				}
				delete network.owner;
				delete network._id;
				res.send(network);
			});
			app.get('/networks/:network/tracks', distro.middleware.ensureUser(), function(req, res, next){
				if (distro.Networks.isAdmin(req.session, req.params.network)) {
					global.tracks.tracksForNetwork(req.params.network._id, function(err, tracks){
						if (err) {
							next(err);
						} else {
							res.send(tracks);
						}
					});
				} else {
					next(new distro.error.ClientError("404"));
				}
			});
			app.post('/networks/:network/tracks', distro.middleware.ensureUser(), function(req, res, next){
				var network = req.params.network;
				if ( ! req.upload) {
					next(new distro.error.ClientError('Missing upload'));
					return;
				}
				if(distro.Networks.isAdmin(req.session, network)){
					var cleanup = {
							files: [],
							run: function(){
								this.files.forEach(function(file){
									fs.unlink(file, function(err){ if(err){ console.error("Error unlinking " + file + ": ", err); } });
								});
							}
						},
						newTrack = { network: [ network._id ], timestamp: new Date };
					async.waterfall([
						function(callback){
							req.upload.complete(function(err, file){
								console.log('UPLOAD COMPLETED!');
								if (file) {
									cleanup.files.push(file);
								}
								callback(err, file);
							});
						},
						function(file, callback){
							distro.mp3info(file, function(err, info){
								var tags = info.tags;
								[
									{ in: 'title', out: 'name' },
									{ in: 'album', out: 'album' },
									{ in: 'artist', out: 'artist'}
								].forEach(function(k){
									var tag = tags[k['in']], v;
									if (tag && (v = tag[0])) {
										newTrack[k.out] = v;
									}
								});
								newTrack.time = info.length;
								callback(err, file);
							});
						},
						function(file, callback){
							distro.md5(file, function(err, md5){
								newTrack.uploadMd5 = md5;
								callback(err, file);
							});
						},
						function(file, callback){
							distro.transcode(file, function(err, outputFile){
								if (outputFile) {
									cleanup.files.push(outputFile);
								}
								callback(err, outputFile);
							});
						},
						function(outputFile, callback){
							distro.md5(outputFile, function(err, md5){
								newTrack.md5 = md5;
								callback(err, outputFile);
							});
						},
						function(outputFile, callback){
							var filename = newTrack.md5[0] + newTrack.md5[1] + '/' + newTrack.md5 + '.mp3';
							newTrack.filename = filename;
							distro.S3.pushFile(outputFile, filename, function(err){
								callback(err);
							});
						},
						function(callback){
							// Fuck it.
							global.tracks.collection.save(newTrack, callback);
						},
						function(doc, callback){
							global.tracks.prepareForOutput([doc], { id: true }, callback);
						},
						function(tracks, callback){
							res.send(tracks[0], { success: true });
							callback();
						}
					], function(err){
						cleanup.run();
						if (err) {
							// File Upload Plugin throws away the content of non-2xx responses. Lovely.
							// next(err);
							console.error('Failed upload: ', err);
							res.send(null, { error: true });
						}
					});
				} else {
					// TODO: ABORT UPLOAD
					next(new distro.error.ClientError("404"));
				}
			});
			app.put('/networks/:network/tracks/:track', distro.middleware.ensureUser(), function(req, res, next){
				var network = req.params.network;
				if (distro.Networks.isAdmin(req.session, network)) {
					var requestedTrack;
					try{
						requestedTrack = global.db.bson_serializer.ObjectID.createFromHexString(req.params.track);
					}catch(e){
						next(new distro.error.ClientError("404"));
						return;
					}
					global.tracks.getTrack(global.db.bson_serializer.ObjectID.createFromHexString(req.params.track), function(err, track){
						if (track && track.network[0].equals(network._id)) {
							var changes = req.body, update = { $set: {}, $unset: {} };
							async.parallel([
								function(cb){
									if ('name' in changes) {
										update.$set.name = changes.name;
									}
									cb();
								},
								function(cb){
									if ('artist' in changes) {
										// Fuck it, access the collection directly. If you want to fix this, be my guest.
										var lowercase = changes.artist.toLowerCase();
										global.networks.collection.findOne({ $or: [ { lname: lowercase }, { lfullname: lowercase } ] }, function(err, network){
											if (network) {
												update.$unset.artist = 1;
												update.$set.artistNetwork = network._id;
											} else {
												update.$unset.artistNetwork = 1;
												update.$set.artist = changes.artist;
											}
											cb();
										});
									} else {
										cb();
									}
								}
							], function(){
								// Fuck it.
								global.tracks.collection.findAndModify({ _id: track._id }, [], update, { 'new': true }, function(err, doc){
									if (err) {
										next(err);
									} else {
										global.tracks.prepareForOutput([doc], { id: true }, function(err, tracks){
											if (err) {
												next(err);
											} else {
												res.send(tracks[0]);
											}
										});
									}
								})
							});
						} else {
							next(new distro.error.ClientError('bad shit'));
						}
					});
				} else {
					next(new distro.error.ClientError("404"));
				}
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
