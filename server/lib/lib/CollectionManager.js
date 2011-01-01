function CollectionManager(){};
module.exports = CollectionManager;

CollectionManager.prototype.init = function(callback){
	var collectionName, self = this;
	if (!(collectionName = this.constructor.collectionName)) {
		throw new Error("subtype doesn't have a collection name");
	};
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
};
