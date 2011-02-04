var CollectionManager = require('./lib/CollectionManager');

function Networks(){ require('./init').add(this); }
module.exports = Networks;
Networks.prototype = new CollectionManager();
Networks.prototype.constructor = Networks;
Networks.collectionName = 'networks';

Networks.prototype.batchNetworkNameFromId = function(ids, callback){
	this.collection.find({ _id: { $in: ids } }, function(err, cursor){
		var networks = {};
		cursor.each(function(err, network){
			if (err) {
				callback(err, null);
			} else if (network) {
				networks[network._id.toHexString()] = network.name;
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
	this.collection.findOne({"lname":name}, { fields: { _id: (options._id === false ? 0 : 1), lname: 0, lfullname: 0 } }, function(err, doc){
		if(err) {
			callback(err, null);
		} else {
			callback(null, doc);
		}
	});
};

Networks.prototype.search = function(name, callback){
	var searchRegex = new RegExp('^' + name.toLowerCase(), 'i'),
		returnData = [];
	this.collection.find({$or:[{"lfullname":searchRegex},{"lname":searchRegex}]}, { name:1, fullname: 1}, function(err, cursor){
		if(err){
			callback(err, null);
		} else{
			cursor.toArray(callback);
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
