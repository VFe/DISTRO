var util = require('util'),
	fs = require('fs'),
	path = require('path'),
	mongoDB = require('mongodb'),
	url = require('url'),
	connect = require('connect'),
	form = require('connect-form'),
	distro = require('./lib/distro'),
	async = require('async'),
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
			connect['static'](__dirname + '/static/main'),
			connect['static'](__dirname + '/static/common'),
			form({ keepExtensions: true })
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
						if (session) {
							// The cookie is cleared synchronously, so it's safe to not wait to call startSessionForUserID
							global.sessions.endSession(session.id, res, function(){});
						}
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
				global.sessions.endSession(session.id, res, function(err){
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
					global.users.registerUser(body.email, body.password, function(err, user){
						if (err) {
							errback(err);
						} else {
							global.sessions.startSessionForUserID(user._id, null, req, res, function(err){
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
				var user = global.users.userOrGeneric(session && session.user);
				global.users.subscriptions(session || { user: user }, function(err, subscriptions){
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
				var user = global.users.userOrGeneric(session && session.user);
				global.tracks.tracksForSubscriptions(user.subscriptions, function(err, tracks){
					if (err) {
						errback(err);
					} else {
						successback(tracks);
					}
				});
			}));
			app.post('/library/subscriptions', distro.request.handleRequest('ondemand', function(session, req, res, successback, errback){
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
			app.get('/livenetworks', distro.request.handleRequest(false, function(session, req, res, successback, errback){
				global.networks.liveNetworks(function(err, results){
					if (err) {
						errback(err);
					} else {
						successback(results);
					}
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
						if (distro.Networks.isAdmin(session, doc)) {
							doc.admin = true;
						}
						delete doc.owner;
						successback(doc);
					} else {
						errback(new distro.error.ClientError("networks.errors.noNetwork"));
					}
				});
			}));
			app.get('/networks/:name/tracks', distro.request.handleRequest(false, function(session, req, res, successback, errback){
				global.networks.findNetworkByName(req.params.name, function(err, doc){
					if(err){
						errback(err);
					} else if(doc){
						if (distro.Networks.isAdmin(session, doc)) {
							global.tracks.tracksForNetwork(doc._id, function(err, tracks){
								if (err) {
									errback(err);
								} else {
									successback(tracks);
								}
							});
						} else {
							errback(new distro.error.ClientError("404"));
						}
					} else {
						errback(new distro.error.ClientError("404"));
					}
				});
			}));
			app.post('/networks/:name/tracks', function(req, res, next){
				var upload = new distro.FileUpload(req);

				distro.request.handleRequest(false, function(session, req, res, successback, errback){
					global.networks.findNetworkByName(req.params.name, function(err, doc){
						if(err){
							// TODO: ABORT UPLOAD
							errback(err);
						} else if(doc && distro.Networks.isAdmin(session, doc)){
							var cleanup = {
									files: [],
									run: function(){
										this.files.forEach(function(file){
											fs.unlink(file, function(err){ if(err){ console.error("Error unlinking " + file + ": ", err); } });
										});
									}
								},
								newTrack = { network: [ doc._id ], timestamp: new Date };
							async.waterfall([
								function(callback){
									upload.complete(function(err, file){
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
									distro.transcode(file, function(err, outputFile){
										if (outputFile) {
											// cleanup.files.push(outputFile);
											newTrack.dev_filename = path.basename(outputFile);
										}
										callback(err/*, outputFile*/);
									});
								},
								// function(outputFile, callback){
								// 	console.log("starting to push to S3");
								// 	distro.S3.pushFile(outputFile, path.basename(outputFile), function(err){
								// 		callback(err);
								// 	});
								// },
								function(callback){
									// Fuck it.
									global.tracks.collection.save(newTrack, callback);
								},
								function(doc, callback){
									global.tracks.prepareForOutput([doc], { id: true }, callback);
								},
								function(tracks, callback){
									successback(tracks[0], { success: true });
									callback();
								}
							], function(err){
								cleanup.run();
								if (err) {
									errback(err);
								}
							});
						} else {
							// TODO: ABORT UPLOAD
							errback(new distro.error.ClientError("404"));
						}
					});
				})(req, res);
			});
			app.put('/networks/:name/tracks/:track', distro.request.handleRequest(true, function(session, req, res, successback, errback){
				global.networks.findNetworkByName(req.params.name, function(err, doc){
					if(err){
						errback(err);
					} else if(doc){
						if (distro.Networks.isAdmin(session, doc)) {
							var requestedTrack;
							try{
								requestedTrack = global.db.bson_serializer.ObjectID.createFromHexString(req.params.track);
							}catch(e){
								errback(new distro.error.ClientError("404"));
								return;
							}
							global.tracks.getTrack(global.db.bson_serializer.ObjectID.createFromHexString(req.params.track), function(err, track){
								if (track && track.network[0].equals(doc._id)) {
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
												errback(err);
											} else {
												global.tracks.prepareForOutput([doc], { id: true }, function(err, tracks){
													if (err) {
														errback(err);
													} else {
														successback(tracks[0]);
													}
												});
											}
										})
									});
								} else {
									errback(new distro.error.ClientError('bad shit'));
								}
							});
						} else {
							errback(new distro.error.ClientError("404"));
						}
					} else {
						errback(new distro.error.ClientError("404"));
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
