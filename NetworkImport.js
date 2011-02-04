var mongoDB = require("mongodb"),
	util = require('util'),
	url = require('url'),
	_ = require('underscore');

var httpRegExp = /^https?:\/\/(.*)$/i,
	leadingSlashRegExp = /^\/(.*)$/,
	keys = {
		"TYPE": {newName:"type"},
		"NETWORK_NAME": {newName:"name"},
		"FULL_NAME": {newName:"fullname"},
		"STREET_ADDRESS": {newName:"streetAddress", object:"location"},
		"CITY, STATE": {newName:"citystate", object:"location"},
		"COUNTRY": {newName:"country", object:"location"},
		"HOME_PAGE": {newName:"homepage", object:"presence"},
		"EMAIL_VENUE_BOOKING": {newName:"booking", object:"email"},
		"EMAIL_GENERAL": {newName:"general", object:"email"},
		"EMAIL_US": {newName:"usbooking", object:"email"},
		"EMAIL_EU": {newName:"eubooking", object:"email"},
		"EMAIL_PRESS": {newName:"press", object:"email"},
		"EMAIL_MANAGER": {newName:"manager", object:"email"},
		"PHONE": {newName:"phone"},
		"ZIP": {newName:"zip"},
		"PHOTO_BY": {newName:"photoCred"},
		"CAL_MAIN": {newName:"calendar"},
		"CAL_GOOG": {newName:"calendarGoogle"},
		"GOOGLE_MAP": {newName:"map"},
		// begin urlPathList
		"LINKEDIN": {newName:'linkedin', object:'presence', host:"www.linkedin.com"},
		"ITUNES": {newName: 'itunes', object:'presence', host: "itunes.apple.com"},
		"BANDCAMP": {newName: 'bandcamp', object:'presence', regexp: /http:\/\/([^.]+).bandcamp.com\//i},
		"FLICKR_STREAM": {newName: 'flickr', object:'presence', host:"www.flickr.com"},
		"BLOG": {newName: 'blog', object:"presence"},
		"YOUTUBE": {newName:'youtube', object:"presence", host:"www.youtube.com"},
		"FOURSQUARE": {newName:"foursquare", object:"presence", host: "foursquare.com", qs: false},
		"FACEBOOK": {newName:"facebook", object:"presence", hashable:true, host: "www.facebook.com", qs: true},
		"TWITTER": {newName:"twitter", object:"presence", hashable:true, host: "twitter.com"},
		"MYSPACE": {newName:"myspace", object:"presence", host: "www.myspace.com"},
		"LASTFM": {newName:"lastfm", object:"presence", host: "www.last.fm"},
		"PANDORA": {newName:"pandora", object:"presence", host: "www.pandora.com"},
		"SOUNDCLOUD": {newName:"soundcloud", object:"presence", host: "www.soundcloud.com"},
		"PHOTO_LINK": {newName:"photoCredURL"},
		"ILIKE": {newName:"ilike", object:"presence", host: "www.ilike.com"},
		"VIMEO": {newName:"vimeo", object:"presence", host: "www.vimeo.com"},
		"GIGMAVEN": {newName:"gigmaven", object:"presence", host: "www.gigmaven.com"},
		"ARCHIVE": {newName:"archive", object:"presence", host: "www.archive.org"},
		"JAMBASE": {newName:"jambase", object:"presence", host: "www.jambase.com"},
		"REVERB_NATION": {newName:"reverbnation", object:"presence", host: "www.reverbnation.com"},
		"YELP": {newName:"yelp", object:"presence", host: "www.yelp.com"}
	};
	
importDB = new mongoDB.Db('Import', new mongoDB.Server(process.env['MONGO_NODE_DRIVER_HOST'] ||  'localhost', process.env['MONGO_NODE_DRIVER_PORT'] || mongoDB.Connection.DEFAULT_PORT, {}), {native_parser:true});
exportDB = new mongoDB.Db('Distro', new mongoDB.Server(process.env['MONGO_NODE_DRIVER_HOST'] ||  'localhost', process.env['MONGO_NODE_DRIVER_PORT'] || mongoDB.Connection.DEFAULT_PORT, {}), {native_parser:true});

importDB.open(function(err, db) {
	exportDB.open(function(err, exportDB){
		exportDB.collection('networks', function(err, exportColl){
			db.collection('import', function(err, coll){
				coll.find(function(err, cursor){
					var counter = 1;
					(function nextRecord(){
						cursor.nextObject(function(err, doc){
							if(doc != null){
								var record = { presence: {}, email: {}, location: {}, timestamp: new Date(doc.Timestamp) },
								    key, mapping;
								delete doc.Timestamp;
								delete doc._id;
								
								for (key in doc){
									var mapping = keys[key], property = doc[key], out = '';
									try{
										//util.debug(key + " " + doc[key]);
										if (!(mapping = keys[key])) {
											throw new Error('Unknown key: '+key+' : '+property);
										}
										if (mapping.host) { // If this key a URL
											var httpworthy = 'http://' + property.replace(httpRegExp, "$1"),
												parsed = url.parse(httpworthy), path;
											if (!parsed || !parsed.host || !parsed.pathname) {
												throw new Error('Failed to parse '+key+' : '+property+' / '+httpworthy+' as a URL');
											}
											if (parsed.host !== mapping.host) {
												throw new Error('Unexpected hostname on '+key+' : '+util.inspect(property));
											}
											if (mapping.hashable && parsed.pathname === '/' && parsed.hash) {
												path = parsed.hash.substring((parsed.hash.indexOf('#!') === 0) ? 2 : 1);
											} else {
												path = parsed.pathname;
											}
											out += path.replace(leadingSlashRegExp, '$1');
											if (mapping.qs && parsed.search) {
												out += parsed.search;
											}
										} else {
											out = property.toString();
										}
										if (mapping.regexp) {
											var match = out.match(mapping.regexp);
											if (match && match.length === 2) {
												out = match[1];
											} else {
												throw new Error('Didn\'t match regexp '+key+' : '+util.inspect(property));
											}
										}
										(mapping.object ? record[mapping.object] : record)[mapping.newName] = out;
									}catch(e){
										console.error(e.message);
									}
								}
								record.lname = record.name.toLowerCase();
								record.lfullname = record.fullname.toLowerCase();
								exportColl.insert(record, function(err){
									if(err) util.log(new Error(err));
									process.nextTick(nextRecord);
								});
							}
							else{
								if(err) util.log(new Error(err));
								//util.debug(util.inspect(exportColl.find()));
								db.close();
								exportDB.close();
							}
						});
					}());
				});
			});
		});
	});
});
