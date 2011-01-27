var CollectionManager = require('./lib/CollectionManager');

function Bands(){ require('./init').add(this); }
module.exports = Bands;
Bands.prototype = new CollectionManager();
Bands.prototype.constructor = Bands;
Bands.collectionName = 'bands';

Bands.prototype.findBandByName = function(name, options, callback){
	this.collection.findOne({"name":name}, { fields: { _id: (options._id === false ? 0 : 1) } }, function(err, bandDoc){
		if(err) {
			callback(err, null);
		} else {
			callback(null, bandDoc);
		}
	});
};

Bands.prototype.search = function(name, callback){
	var searchRegex = new RegExp('^' + name, 'i'),
		returnData = [];
	this.collection.find({$or:[{"fullname":searchRegex},{"name":searchRegex}]}, function(err, cursor){
		// util.log('Searching for: ' + name);
		// 	_.forEach(cursor, function(value, key){
		// 		try {
		// 			value = JSON.stringify(value);
		// 		} catch(x){
		// 			value = value;
		// 		}
		// 		util.log(key + ": " + value + "\n`");
		// 	});
		// 	util.log("---------------------");
		if(err){
			callback(err, null);
		} else{
			(function nextRecord(){
				cursor.nextObject(function(err, doc){
					if(doc != null) {
						var jsonData = {};
						jsonData.name = doc.name;
						jsonData.fullname = doc.fullname;
						jsonData.id = JSON.stringify(doc.id);
						returnData.push(jsonData);
						process.nextTick(nextRecord);
					} else{
						callback(null, returnData);
					}
				});
			})();
		}
	});
};

Bands.PRESENCE = [
	{ name: "email", prefix: "mailto:" },
	{ name: "website" },
	{ name: "twitter", prefix: "http://twitter.com/" },
	{ name: "myspace", prefix: "http://www.myspace.com/" },
	{ name: "lastfm", prefix: "http://www.last.fm/music/" },
	{ name: "soundcloud", prefix: "http://soundcloud.com/" },
	{ name: "flickr", prefix: "http://www.flickr.com/photos/" },
	{ name: "youtube", prefix: "http://www.youtube.com/user/" },
	{ name: "itunes", prefix: "http://itunes.apple.com/us/artist/" },
	{ name: "vimeo", prefix: "http://vimeo.com/" },
	{ name: "facebook", prefix: "http://www.facebook.com/" },
	{ name: "bandcamp", prefix: "http://", suffix:".bandcamp.com/" }
];