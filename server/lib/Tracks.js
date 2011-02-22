var CollectionManager = require('./lib/CollectionManager');

function Tracks(){ require('./init').add(this); }
module.exports = Tracks;
Tracks.prototype = new CollectionManager();
Tracks.prototype.constructor = Tracks;
Tracks.collectionName = 'tracks';

Tracks.prototype.tracksForSubscriptions = function(subscriptions, callback){
	var trackSearches = [];
	subscriptions.forEach(function(subscription){
		if (subscription.network && subscription.start) {
			trackSearches.push({
				network: subscription.network,
				// !@*# MongoDB doesn't support nested $or
				// $or: [
				// 	{ onDeck: { $elemMatch: {
				// 		start: { $lt: subscription.start },
				// 		end:   { $or: [
				// 			{ $exists: false },
				// 			{ $gt: subscription.start }
				// 		] }
				// 	} } },
				// 	{ release: (subscription.end ? {
				// 		$gt: subscription.start,
				// 		$lt: subscription.end
				// 	} : {
				// 		$gt: subscription.start
				// 	}) }
				// ]
				//
				// WARNING: Nastiness ahead. Should be equivalent to:
				// if (this.release > subscription.start && (!subscription.end || (this.release < subscription.end))) {
				// 	return true;
				// }
				// if (this.onDeck) {
				// 	var onDeckPeriod, i;
				// 	for (i = this.onDeck.length - 1; i >= 0; i--){
				// 		onDeckPeriod = this.onDeck[i];
				// 		if (onDeckPeriod.start < subscription.start && (!onDeckPeriod.end || onDeckPeriod.end > subscription.end)) {
				// 			return true;
				// 		}
				// 	}
				// }
				// return false;
				$where: 'if (this.release > new Date('+(+subscription.start)+')'+(subscription.end ? ' && this.release < new Date('+(+subscription.end)+')' : '')+') { return true; } if (this.onDeck) { var onDeckPeriod, i; for (i = this.onDeck.length - 1; i >= 0; i--) { onDeckPeriod = this.onDeck[i]; if (onDeckPeriod.start < new Date('+(+subscription.start)+') && (!onDeckPeriod.end || onDeckPeriod.end > new Date('+(+subscription.end)+'))) { return true; }}}; return false;'
			});
		} else {
			// TODO: Invalid subscription, log an error
		}
	});
	this.collection.find({ $or: trackSearches }, { fields: { _id: 0, name: 1, release: 1, network: 1, filename: 1, artist: 1, artistNetwork: 1, performance: 1, time: 1 } }, function(err, cursor){
		if (err) {
			callback(err, null);
		} else {
			cursor.toArray(callback);
		}
	});
};