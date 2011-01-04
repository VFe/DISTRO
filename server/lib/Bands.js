var CollectionManager = require('./lib/CollectionManager');

function Bands(){}
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