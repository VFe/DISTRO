var CollectionManager = require('./lib/CollectionManager'),
	ClientError = require('./error').ClientError,
	Networks = require('./Networks'),
	mongodb = require('mongodb');

function Tracks(){ require('./init').add(this); }
module.exports = Tracks;
Tracks.prototype = new CollectionManager();
Tracks.prototype.constructor = Tracks;
Tracks.collectionName = 'tracks';
Tracks.publicKeys = [ 'name', 'release', 'date', 'network', 'filename', 'artist', 'artistNetwork', 'performance', 'time' ];

Tracks.prototype.prepareForOutput = function(tracks, options, callback){
	var networkProxies = new Networks.ProxySet;
	if ( ! options) { options = {}; }
	tracks = tracks.map(function(inTrack) {
		var track = {};
		Tracks.publicKeys.forEach(function(key){
			track[key] = (key in inTrack) ? inTrack[key] : null;
		});
		if (options.id) {
			track.id = inTrack._id;
		}
		if ( ! ('md5' in inTrack)) {
			track.networkWithFile = networkProxies.create(track.network[0]);
		}
		if (options.subscribedNetworkIds) {
			track.network = track.network.filter(function(network){ return options.subscribedNetworkIds.indexOf(network.id) != -1; });
		}
		track.network = track.network.map(function(network){ return networkProxies.create(network); });
		track.artistNetwork = track.artistNetwork ? networkProxies.create(track.artistNetwork) : null;
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

function mapSubscriptions(){
	var i, networksLength, networkSubscriptions, subscription, j, onDeckPeriod, k;
	for (i = 0, networksLength = this.network.length; i < networksLength; i++){
		networkSubscriptions = subscriptions[this.network[i].toString()];
		if ( ! networkSubscriptions) {
			continue;
		}
		for (j = networkSubscriptions.length - 1; (subscription = networkSubscriptions[j]), j >= 0; j--){
			if (this.release > subscription.start && (!subscription.end || (this.release < subscription.end)) && this.release < now) {
				this.date = this.release;
				emit(this._id, this);
				return;
			} else if (this.onDeck) {
				for (k = this.onDeck.length - 1; (onDeckPeriod = this.onDeck[k]), k >= 0; k--){
					if (onDeckPeriod.start < subscription.start && (!onDeckPeriod.end || onDeckPeriod.end > subscription.start) && onDeckPeriod.start < now) {
						this.date = subscription.start;
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
	var self = this, subscriptionsByNetwork = {}, subscribedNetworkMap = {}, subscribedNetworks = [], subscribedNetworkIds = [];
	subscriptions.forEach(function(subscription){
		var networkHex = subscription.network.toHexString();
		(subscriptionsByNetwork[networkHex] || (subscriptionsByNetwork[networkHex] = [])).push(subscription);
		if ( ! (networkHex in subscribedNetworks)) {
			subscribedNetworkMap[networkHex] = subscription.network;
		}
	});
	for (var key in subscribedNetworkMap){
		subscribedNetworks.push(subscribedNetworkMap[key]);
		subscribedNetworkIds.push(subscribedNetworkMap[key].id);
	}
	this.collection.mapReduce(mapSubscriptions, reduceSubscriptions, {
		query: { network: { $in: subscribedNetworks } },
		out: { inline: 1 },
		scope: { subscriptions: subscriptionsByNetwork, now: new Date }
	}, function(err, results){
		if (err) {
			callback(new Error(err.errmsg + ': ' + err.assertion), null);
		} else {
			var tracks = results.map(function(r){ return r.value; }).sort(function(docA, docB){ var a = docA.date, b = docB.date; return a > b ? 1 : a < b ? -1 : 0; });
			self.prepareForOutput(tracks, { id: true, subscribedNetworkIds: subscribedNetworkIds }, callback);
		}
	});
};
Tracks.prototype.tracksForNetwork = function(network, callback){
	var self = this;
	this.collection.find({ network: network }, function(err, cursor){
		if (err) {
			callback(err);
		} else {
			cursor.toArray(function(err, tracks){
				if (err) {
					callback(err);
				} else {
					self.prepareForOutput(tracks, { id: true }, callback);
				}
			});
		}
	});
};
Tracks.prototype.getTrack = function(id, callback){
	this.collection.findOne({ _id: id }, callback);
};
// TODO: this is dead code, probably temporarily
Tracks.prototype.createTrack = function(inTrack, user, callback){
	var self = this, track = {};
	if (inTrack && inTrack.network && inTrack.network.name) {
		global.networks.findNetworkByName(inTrack.network.name, function(err, result){
			if (err) {
				callback(err);
			} else if ( ! result) {
				callback(new ClientError('noNetwork'));
			} else {
				track.network = [ result._id ];
				track.name = inTrack.name;
				track.artist = inTrack.artist;
				if (inTrack.release) {
					track.release = new Date(inTrack.release);
				}
				if (inTrack.onDeck && inTrack.onDeck.length) {
					track.onDeck = inTrack.onDeck.map(function(inOnDeck){
						var onDeck = {};
						if (inOnDeck.start) {
							onDeck.start = new Date(inOnDeck.start);
						}
						if (inOnDeck.end) {
							onDeck.end = new Date(inOnDeck.end);
						}
						return onDeck;
					});
				}
				console.log(track);
				self.collection.insert(track, function(err, docs){
					if (err) {
						callback(err);
					} else {
						var subscribedNetworkIds = user.subscriptions && user.subscriptions.map(function(s){ return s.network.id; }) || [];
						self.prepareForOutput(docs, { subscribedNetworkIds: subscribedNetworkIds }, function(err, networks){
							callback(err, networks && networks[0]);
						});
					}
				});
			}
		});
	} else {
		callback(new ClientError);
	}
}