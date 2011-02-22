var CollectionManager = require('./lib/CollectionManager');

function Networks(){ require('./init').add(this); }
module.exports = Networks;
Networks.prototype = new CollectionManager();
Networks.prototype.constructor = Networks;
Networks.collectionName = 'networks';

Networks.prototype.batchNetworkFromId = function(ids, callback){
	this.collection.find({ _id: { $in: ids } }, function(err, cursor){
		var networks = {};
		cursor.each(function(err, network){
			if (err) {
				callback(err, null);
			} else if (network) {
				networks[network._id.toHexString()] = network;
			} else {
				callback(null, networks);
			}
		});
	});
};

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
				callback(null, cursorArray.map(function(data){
					return {value: data.name, label: data.fullname};
				}));
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

function resolve(path){
	var context = this;
	if (!path) { return this; }
	if (!(path instanceof Array)) { path = path.split('.'); }
	while ((context = context[path.shift()]) != null && path.length);
	return context;
}
Networks.Proxy = function(id, key){
	this.id = id;
	this.data = null;
	this.key = key || ['name', 'fullname'];
}

Networks.Proxy.prototype.toJSON = function(){
	return this.data;
}

Networks.Proxy.prototype.resolve = function(networkDetails){
	if (networkDetails) {
		var self = this;
		function set(key){
			if (key.constructor === Object) {
				self.data[key.name] = resolve.call(networkDetails, key.key);
			} else {
				self.data[key] = resolve.call(networkDetails, key);
			}
		}
		if (this.key instanceof Array) {
			this.data = {};
			this.key.forEach(function(key){
				if (key === 'location.citystate') {
					console.log(networkDetails);
				}
				set(key);
			});
		} else {
			set(this.key);
		}
	}
}

Networks.ProxySet = function(){
	this.proxies = [];
}

Networks.ProxySet.prototype.push = function(proxy){
	this.proxies.push(proxy);
}
Networks.ProxySet.prototype.create = function(id, key){
	var proxy = new Networks.Proxy(id, key);
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
	global.networks.batchNetworkFromId(networkIds, function(err, networkMap){
		if (err) {
			callback(err, null);
		} else {
			self.proxies.forEach(function(proxy){
				proxy.resolve(networkMap[proxy.id.toHexString()]);
			});
			callback(null, self);
		}
	});
}
