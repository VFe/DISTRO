var CollectionManager = require('./lib/CollectionManager'),
    crypto = require('crypto'),
    error = require('./error');

function Users(){ require('./init').add(this); }
module.exports = Users;
Users.prototype = new CollectionManager();
Users.prototype.constructor = Users;
Users.collectionName = 'users';

function hash(password, salt){
	return new crypto.Hash("sha1").update(password + salt).digest("hex");
};
function passwordIsAcceptable(password){
	return (password.length > 2);
};

Users.prototype.userExists = function(email, callback){
	//This regex isn't _nearly_ complete, but it mostly works (The alternative is a page long PCRE that is completely compliant with RFC 822)
	//If we decide we want the _insanely_ long one, an example is here http://www.ex-parrot.com/pdw/Mail-RFC822-Address.html
	var re = /^[-a-z0-9~!$%^&*_=+}{\'?]+(\.[-a-z0-9~!$%^&*_=+}{\'?]+)*@([a-z0-9_][-a-z0-9_]*(\.[-a-z0-9_]+)*\.(aero|arpa|biz|com|coop|edu|gov|info|int|mil|museum|name|net|org|pro|travel|mobi|[a-z][a-z])|([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}))(:[0-9]{1,5})?$/i;
	if (re.test(email)){
		this.collection.findOne({"email":email}, function(err, result){
			callback(err, !!result);
		});
	} else {callback(new error.ClientError("registration.errors.badEmail"), null);}
};
Users.prototype.userWithCredentials = function(email, password, callback){
	if (!email || !password){
		callback(new error.ClientError("registration.errors.noCredentials"), false);
		return;
	}
	this.collection.findOne({"email":email}, function(err, result){
		if(err){
			callback(err, null);
		}
		if (result && result.salt && result.hash && hash(password, result.salt) === result.hash){
			callback(null, result);
		} else {
			callback(null, null);
		}
	});
};
Users.prototype.userWithUserID = function(userID, callback){
	this.collection.findOne({"_id":userID}, callback);
};
Users.prototype.registerUser = function(email, password, callback){
	var self = this;
	var salt = Math.floor(Math.random() * 0x100000000).toString(16);
	self.userExists(email, function(err, exists){
		if(err){
			callback(err, null);
		} else if (exists){
			callback(new error.ClientError("registration.errors.existingUser"), null);
		} else {
			self.collection.insert({"email":email, "hash":hash(password, salt), "salt":salt}, function(err, doc){
				if (doc && doc[0] && doc[0]._id) {
					callback(err, doc[0]._id);
				} else {
					callback(err || new Error("registerUser: user could not be created"), null);
				}
			});
		}
	});
};
Users.prototype.subscribeToNetwork = function(user, networkID, callback){
	var now = new Date;
	if (user.subscriptions) {
		var i, subscription;
		for (i = user.subscriptions.length - 1; i >= 0; i--){
			subscription = user.subscriptions[i];
			if (networkID.toString() === subscription.network.toString() && (!subscription.end || subscription.end > now)) {
				callback(null);
				return;
			}
		}
	}
	this.collection.update({ _id: user._id }, { $push: { subscriptions: { network: networkID, start: now } } }, function(err, doc){
		callback(err);
	});
};
Users.prototype.subscriptions = function(user, callback){
	var subscribedNetworkIdMap = {};
	user.subscriptions.forEach(function(subscription) {
		subscribedNetworkIdMap[subscription.network.toHexString()] = subscription.network;
	});
	subscribedNetworkIds = [];
	for (var id in subscribedNetworkIdMap) {
		subscribedNetworkIds.push(subscribedNetworkIdMap[id]);
	}
	global.networks.batchNetworkNameFromId(subscribedNetworkIds, function(err, networkMap){
		if (err) {
			callback(err, null);
		} else {
			var subscriptions = [];
			for (var id in networkMap){
				subscriptions.push({id: networkMap[id]});
			}
			callback(null, subscriptions);
		}
	});
}
Users.prototype.tracks = function(user, callback){
	global.tracks.tracksForSubscriptions(user.subscriptions, function(err, tracks){
		if (err) {
			callback(err, null);
		} else {
			var trackNetworkIdMap = {};
			tracks.forEach(function(track) {
				trackNetworkIdMap[track.network.toHexString()] = track.network;
				if (track.artistNetwork) {
					trackNetworkIdMap[track.artistNetwork.toHexString()] = track.artistNetwork;
				}
				if (track.performance && track.performance.venue) {
					trackNetworkIdMap[track.performance.venue.toHexString()] = track.performance.venue;
				}
			});
			trackNetworkIds = [];
			for (var id in trackNetworkIdMap) {
				trackNetworkIds.push(trackNetworkIdMap[id]);
			}
			global.networks.batchNetworkNameFromId(trackNetworkIds, function(err, networkMap){
				if (err) {
					callback(err, null);
				} else {
					tracks.forEach(function(track){
						track.network = networkMap[track.network.toHexString()] || '';
						if (track.artistNetwork) {
							track.artistNetwork = networkMap[track.artistNetwork.toHexString()] || '';
						}
						if (track.performance && track.performance.venue) {
							track.performance.venue = networkMap[track.performance.venue.toHexString()] || '';
						}
					});
					callback(null, tracks);
				}
			});
		}
	});
}