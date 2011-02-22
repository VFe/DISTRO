var CollectionManager = require('./lib/CollectionManager');

function Networks(){ require('./init').add(this); }
module.exports = Networks;
Networks.prototype = new CollectionManager();
Networks.prototype.constructor = Networks;
Networks.collectionName = 'networks';

Networks.prototype.batchNetworkNameFromId = function(ids, callback){
	this.collection.find({ _id: { $in: ids } }, { fields: { name: 1, fullname: 1 } }, function(err, cursor){
		var networks = {};
		cursor.each(function(err, network){
			if (err) {
				callback(err, null);
			} else if (network) {
				networks[network._id.toHexString()] = { name: network.name, fullname: network.fullname };
			} else {
				callback(null, networks);
			}
		});
	});
};

// Networks.prototype.networkNameFromId = function(id, callback){
// 	this.batchNetworkNameFromId([id], function(err, networks){
// 		callback(err, (networks ? networks[0] : networks));
// 	});
// }

Networks.prototype.findNetworkByName = function(name, options, callback){
	name = name.toLowerCase();
	var exclusions = { lname: 0, lfullname: 0 };
	if (options._id === false) {
		exclusions._id = 0;
	}
	this.collection.findOne({"lname":name}, { fields: exclusions }, function(err, doc){
		if(err) {
			callback(err, null);
		} else {
			callback(null, doc);
		}
	});
};

Networks.prototype.search = function(name, callback){
	var searchRegex = new RegExp('^' + name.toLowerCase() + '|\\b' + name.toLowerCase(), 'i'),
		returnData = [];
	this.collection.find({$or:[{"lfullname":searchRegex},{"lname":searchRegex}]}, { name:1, fullname: 1}, function(err, cursor){
		if(err){
			callback(err, null);
		} else{
			cursor.toArray(function(err, cursorArray){
				cursorArray.forEach(function(data){
					data.value = data.name; 
					data.label = data.fullname;
					delete data.name;
					delete data.fullname;
				});
				callback(null, cursorArray);
			});
		}
	});
};

Networks.PRESENCE = [
	{ name: "email", prefix: "mailto:" },
	{ name: "homepage" },
	{ name: "twitter", prefix: "http://twitter.com/" },
	{ name: "myspace", prefix: "http://www.myspace.com/" },
	{ name: "lastfm", prefix: "http://www.last.fm/" },
	{ name: "soundcloud", prefix: "http://soundcloud.com/" },
	{ name: "flickr", prefix: "http://www.flickr.com/" },
	{ name: "foursquare", prefix:"http://foursquare.com/"},
	{ name: "youtube", prefix: "http://www.youtube.com/" },
	{ name: "itunes", prefix: "http://itunes.apple.com/" },
	{ name: "vimeo", prefix: "http://vimeo.com/" },
	{ name: "facebook", prefix: "http://www.facebook.com/" },
	{ name: "bandcamp", prefix: "http://", suffix:".bandcamp.com/" }
];

// Abstract away resolving network names and full names for output
Networks.Proxy = function(id){
	this.id = id;
}

Networks.Proxy.prototype.toJSON = function(){
	var obj = {};
	if (this.name) { obj.name = this.name; }
	if (this.fullname) { obj.fullname = this.fullname; }
	return obj;
}

Networks.ProxySet = function(){
	this.proxies = [];
}

Networks.ProxySet.prototype.push = function(proxy){
	this.proxies.push(proxy);
}
Networks.ProxySet.prototype.create = function(id){
	var proxy = new Networks.Proxy(id);
	this.push(proxy);
	return proxy;
}
Networks.ProxySet.prototype.resolve = function(callback){
	var self = this, networkIdMap = {}, networkIds = [];
	this.proxies.forEach(function(proxy) {
		networkIdMap[proxy.id.toHexString()] = proxy.id;
	});
	for (var id in networkIdMap) {
		networkIds.push(networkIdMap[id]);
	}
	global.networks.batchNetworkNameFromId(networkIds, function(err, networkMap){
		if (err) {
			callback(err, null);
		} else {
			self.proxies.forEach(function(proxy){
				var networkDeets = networkMap[proxy.id.toHexString()];
				if (networkDeets) {
					proxy.name = networkDeets.name;
					proxy.fullname = networkDeets.fullname;
				}
			});
			callback(null, self);
		}
	});
}
