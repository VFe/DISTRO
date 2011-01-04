var CollectionManager = require('./lib/CollectionManager');

function Networks(){}
module.exports = Networks;
Networks.prototype = new CollectionManager();
Networks.prototype.constructor = Networks;
Networks.collectionName = 'networks';

Networks.prototype.batchNetworkNameFromId = function(ids, callback){
	this.collection.find({ _id: { $in: ids } }, function(err, cursor){
		var networks = {};
		cursor.each(function(err, network){
			console.log('HIT INSIDE EACH');
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