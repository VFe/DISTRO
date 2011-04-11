var CollectionManager = require('./lib/CollectionManager'),
	Networks = require('./Networks'),
	mongodb = require('mongodb');

function Tracks(){ require('./init').add(this); }
module.exports = Tracks;
Tracks.prototype = new CollectionManager();
Tracks.prototype.constructor = Tracks;
Tracks.collectionName = 'tracks';
Tracks.publicKeys = [ 'name', 'release', 'network', 'filename', 'artist', 'artistNetwork', 'performance', 'time' ];

function mapSubscriptions(){
	var i, networksLength, networkSubscriptions, subscription, j, onDeckPeriod, k;
	for (i = 0, networksLength = this.network.length; i < networksLength; i++){
		networkSubscriptions = subscriptions[this.network[i].toString()];
		if ( ! networkSubscriptions) {
			continue;
		}
		for (j = networkSubscriptions.length - 1; (subscription = networkSubscriptions[j]), j >= 0; j--){
			if (this.release > subscription.start && (!subscription.end || (this.release < subscription.end))) {
				emit(this._id, this);
				return;
			} else if (this.onDeck) {
				for (k = this.onDeck.length - 1; (onDeckPeriod = this.onDeck[k]), k >= 0; k--){
					if (onDeckPeriod.start < subscription.start && (!onDeckPeriod.end || onDeckPeriod.end > subscription.end)) {
						emit(this._id, this);
						return;
					}
				}
			}
		}
	}
}

function reduceSubscriptions(k, vals){
	return vals[0];
}

Tracks.prototype.tracksForSubscriptions = function(subscriptions, callback){
	var subscriptionsByNetwork = {}, subscribedNetworkMap = {}, subscribedNetworks = [];
	subscriptions.forEach(function(subscription){
		var networkHex = subscription.network.toHexString();
		(subscriptionsByNetwork[networkHex] || (subscriptionsByNetwork[networkHex] = [])).push(subscription);
		if ( ! (networkHex in subscribedNetworks)) {
			subscribedNetworkMap[networkHex] = subscription.network;
		}
	});
	for (var key in subscribedNetworkMap){
		subscribedNetworks.push(subscribedNetworkMap[key]);
	}
	this.collection.db.executeCommand(mongodb.DbCommand.createDbCommand(this.collection.db, {
		mapreduce: this.collection.collectionName,
		map: mapSubscriptions.toString(),
		reduce: reduceSubscriptions.toString(),
		query: { network: { $in: subscribedNetworks } },
		out: { inline: 1 },
		scope: { subscriptions: subscriptionsByNetwork }
	}), function(err, out){
		var result = out.documents[0];
		if (err) {
			callback(err, null);
		} else if (result.errmsg) {
			callback(new Error('MapReduce failed: ' + result.errmsg), null);
		} else {
			var tracks = result.results.map(function(r){ return r.value; }).sort(function(docA, docB){ var a = docA.release, b = docB.release; return a > b ? 1 : a < b ? -1 : 0; }),
				networkProxies = new Networks.ProxySet;
			tracks = tracks.map(function(inTrack) {
				var track = {};
				Tracks.publicKeys.forEach(function(key){
					if (key in inTrack) {
						track[key] = inTrack[key];
					}
				});
				track.networkWithFile = networkProxies.create(track.network[0]);
				track.network = track.network.filter(function(network){ return subscribedNetworks.indexOf(network.id) != -1; }).map(function(network){ return networkProxies.create(network); });
				if (track.artistNetwork) {
					track.artistNetwork = networkProxies.create(track.artistNetwork);
				}
				if (track.performance && track.performance.venue) {
					track.performance.venue = networkProxies.create(track.performance.venue, ['name', 'fullname', {name: 'citystate', key: 'location.citystate'}]);
				}
				return track;
			});
			networkProxies.resolve(function(err){
				if (err) {
					callback(err, null);
				} else {
					callback(null, tracks);
				}
			});
		}
	});
};