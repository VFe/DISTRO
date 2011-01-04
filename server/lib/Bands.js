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