var CollectionManager = require('./lib/CollectionManager');

function Bands(){}
module.exports = Bands;
Bands.prototype = new CollectionManager();
Bands.prototype.constructor = Bands;
Bands.collectionName = 'bands';

Bands.prototype.findBandByID = function(bandID, callback){
	this.collection.findOne({"bandID":bandID}, function(err, bandDoc){ //this.collection seems to be undefined...
		if(err) {
			callback(err, null);
		} else if(!bandDoc){
			callback("band not found", null);
		} else {
			callback(err, bandDoc);
		}
	});
};