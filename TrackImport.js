var Do = require('do'),
    mongoDB = require('mongodb'),
	util = require('util'),
	url = require('url');

importDB = new mongoDB.Db('Import', new mongoDB.Server(process.env['MONGO_NODE_DRIVER_HOST'] ||  'localhost', process.env['MONGO_NODE_DRIVER_PORT'] || mongoDB.Connection.DEFAULT_PORT, {}), {native_parser:true}), ['open'];
exportDB = new mongoDB.Db('Distro', new mongoDB.Server(process.env['MONGO_NODE_DRIVER_HOST'] ||  'localhost', process.env['MONGO_NODE_DRIVER_PORT'] || mongoDB.Connection.DEFAULT_PORT, {}), {native_parser:true}), ['open'];
Do.chain(
	Do.parallel([
		function(callback, errback){
			importDB.open(function(err, db){ if (err) { errback(err); } else { callback(db); } });
		},
		function(callback, errback){
			exportDB.open(function(err, db){  if (err) { errback(err); } else { callback(db); } });
		}
	]),
	function(results){
		var importDB = results[0], exportDB = results[1];
		return Do.parallel([
			function(callback, errback){
				importDB.collection('tracks', function(err, collection){ if (err) { errback(err); } else { callback(collection); } });
			},
			function(callback, errback){
				exportDB.collection('tracks', function(err, collection){ if (err) { errback(err); } else { callback(collection); } });
			},
			function(callback, errback){
				exportDB.collection('networks', function(err, collection){ if (err) { errback(err); } else { callback(collection); } });
			}
		]);
	}
)(function(collections){
	var importColl = collections[0], exportColl = collections[1], networksColl = collections[2];
	
	function makeDate(datestring){ return function(cb){
		cb(new Date(datestring));
	}}
	function resolveNetwork(name){ return function(callback, errback) {
		networksColl.findOne({ name: name }, { fields: { _id : 1 } }, function(err, network){ if (err) { errback(err) } else {
			if (network) {
				callback(network._id);
			} else {
				errback(new Error("No network named \"" + name + "\" exists"));
			}
		} });
	}};

	var keys = {
			"Timestamp": {newName:"timestamp", handler: makeDate},
			"ARTIST NETWORK": {newName:"artistNetwork", handler: resolveNetwork},
			"ARTIST NAME": {newName:"artist"},
			"PERFORMANCE DATE": {newName:"date", object:"performance"},
			"SONG NAME": {newName:"name", required: true},
			"NETWORK BROADCASTING": {newName:"network", handler: resolveNetwork},
			"BROADCAST DATE": {newName: "release", handler: makeDate},
			"PERFORMANCE VENUE (NETWORK)": {newName:"venue", object: "performance", handler: resolveNetwork},
			"PERFORMANCE VENUE (CITY/STATE)": {newName: "venueCity", object: "performance"},
			"PERFORMANCE VENUE (ZIP)": {newName: "venueZip", object: "performance"},
			"IS THIS SONG ON DECK?": {newName: "onDeck", handler: function(onDeck){ return function(cb){ cb((onDeck == "YES") ? [{ start: new Date(0) }] : null) }}},
			"PERFORMANCE VENUE (VENUE NAME)": {newName: "venue", object: "performance"},
			"FILENAME": {newName: "filename", required: true},
			"TIME": {newName: "time", handler: function(timeString){return function(cb){
				var split = timeString.split(':');
				if (split.length = 2) {
					cb((parseInt(split[0], 10) * 60) + parseInt(split[1], 10));
				} else {
					cb(null);
				}
			}}} // ,
//			"NOTES": {newName: "notes", object: "performance"}
	    };

	
	importColl.find(function(err, cursor){
		var counter = 1;
		(function nextRecord(){
			cursor.nextObject(function(err, doc){
				if (!doc) {
					if(err) util.log(err);
					importDB.close();
					exportDB.close();
					return;
				}
				var out = {}, key, name = doc['SONG NAME'];
				
				delete doc._id;
				
				Do.filter(Object.keys(keys), function(key, callback, errback){
					var mapping = keys[key];
					if (key in doc) {
							if (mapping.handler) {
								mapping.handler(doc[key])(finish, errback);
							} else {
								finish(doc[key]);
							}
					} else {
						if (mapping.required) {
							errback(new Error("Missing " + key));
						} else {
							finish();
						}
					}
					function finish(val){
						if (val) {
							(mapping.object ? (out[mapping.object] || (out[mapping.object] = {})) : out)[mapping.newName] = val;
						}
						delete doc[key];
						callback();
					}
				})(function(){
					var extraKeys = Object.keys(doc);
					if (extraKeys.length) {
						util.error('['+name+'] Extra keys found in document: '+extraKeys.join(', '));
					}
					exportColl.update({"filename":out.filename, network:out.network}, {$set: out}, {upsert:true}, function(err){
						if(err) util.log(new Error(err));
						counter++;
						process.nextTick(nextRecord);
					});
				}, function(err){
					util.error('['+name+'] '+err.message+", not imported");
					process.nextTick(nextRecord);
				});
			});
		}());
	});
}, function(err){
	util.log('something terrible happened. Specifically, '+err);
});