exports.init = function(collectionName){ return function(callback){
	var self = this;
	global.db.collection(collectionName, function(err, collection){
		if (err) {
			throw err;
		} else if (!collection) {
			throw "'"+collectionName+"' collection does not exist";
		} else {
			self.collection = collection;
			callback();
		}
	});
}; };