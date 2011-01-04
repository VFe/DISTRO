var CollectionManager = require('./lib/CollectionManager');

function Bands(){}
module.exports = Bands;
Bands.prototype = new CollectionManager();
Bands.prototype.constructor = Bands;
Bands.collectionName = 'bands';

Bands.prototype.findBandByName = function(name, callback){
	this.collection.findOne({"name":name}, function(err, bandDoc){
		if(err) {
			callback(err, null);
		} else {
			callback(null, bandDoc);
		}
	});
};