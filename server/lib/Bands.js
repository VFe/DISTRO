function Bands(){}
module.exports = Bands;

Bands.prototype.init = function(callback){
	var self = this;
	global.db.collection('bands', function(err, collection){
		if(err) {
			throw err;
		} else if(!collection) {
			throw "bands collection is not defined";
		} else {
			self.collection = collection;
			callback();
		}
	});
};
Bands.prototype.findBandByID = function(bandID, callback){
	this.collection.findOne({"bandID":bandID}, function(err, bandDoc){ //this.collection seems to be undefined...
		if(err) {
			callback(err, null);
		} else if(!doc){
			callback("band not found", null);
		} else {
			callback(err, bandDoc);
		}
	});
};