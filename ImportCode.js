var mongoDB = require("mongodb"),
	util = require('util'),
	url = require('url'),
	_ = require('underscore');
	
importDB = new mongoDB.Db('Import', new mongoDB.Server(process.env['MONGO_NODE_DRIVER_HOST'] ||  'localhost', process.env['MONGO_NODE_DRIVER_PORT'] || mongoDB.Connection.DEFAULT_PORT, {}), {native_parser:true});
exportDB = new mongoDB.Db('Distro', new mongoDB.Server(process.env['MONGO_NODE_DRIVER_HOST'] ||  'localhost', process.env['MONGO_NODE_DRIVER_PORT'] || mongoDB.Connection.DEFAULT_PORT, {}), {native_parser:true});

importDB.open(function(err, db) {
	exportDB.open(function(err, exportDB){
		exportDB.collection('bands', function(err, exportColl){
			db.collection('i3', function(err, coll){
				coll.find(function(err, cursor){
					var counter = 1;
					(function nextRecord(){
						cursor.nextObject(function(err, doc){
							if(doc != null){
								var myspaceRegEx = new RegExp("/\/(\w+$)/", "g"),
									urlKeyList = ['Facebook URL', 'Myspace URL', 'Twitter URL', 'LastFM URL', 
									'Home Page URL', 'Pandora URL', 'SoundCloud URL', 'ExtensionFM URL', 
									'LinkedIn URL', 'Flickr URL', 'Youtube URL', 'iLike URL', 'iTunes URL', 
									'Vimeo URL', 'BandCamp URL', 'Blog URL', 'GigMaven', 
									'Flickr Link (Photostream)', 'Jambase Link', 'ArchiveDOTorg'];
								record = doc; //This could just be record = {}; but I'm leaving it like this for now
								record.presence = {};
								record.presence.email = {};
								record.location = {};
								record.Timestamp = new Date(doc.Timestamp);
								record.fullname = doc['Band Name'];
								function httpize(url){
									if(/^[hH][tT][tT][pP][sS]?:\/\/(.*)/.exec(url)){
										return url;
									} else {
										return ("http://" + url);
									}
								}
								function subdomainSnip(url, key){
									var subdomain = /^[hH][tT][tT][pP][sS]?:\/\/([^\.]*)/.exec(url);
									util.log("Key: " + key + " is now just " + subdomain[1]);
									doc[key] = subdomain[1];
								}
								function snipImportant(both, unimportant){
									if(!unimportant){
										unimportant = /^\/(.*)\/*/;
									}
									return unimportant.exec(both)[1];
								}
								for (var key in doc){
									//util.log(key + " " + doc[key]);
									if(doc[key]){
										if(_.include(urlKeyList, key)){
											//util.log("httpizing " + doc[key] + " \n \t \t - Result: " + httpize(doc[key]));
											doc[key] = httpize(doc[key]);
										}
										var killTrailingSlash = /(.*)\/$/.exec(doc[key]);
										if(killTrailingSlash){
											doc[key] = killTrailingSlash[1];
										}
									}
									
								}
								if(doc['Facebook URL']){
									record.presence.facebook = url.parse(doc['Facebook URL']).pathname;
									delete record['Facebook URL'];
									util.log("   Facebook "+util.inspect(record.presence.facebook));								
								} else{
									delete record['Facebook URL'];
								}
								if(doc['Myspace URL']){
									record.presence.myspace = url.parse(doc['Myspace URL']).pathname;
									delete record['Myspace URL'];
									util.log("    Myspace "+util.inspect(record.presence.myspace));																
								} else{
									delete record['Myspace URL'];
								}
								if(doc['Twitter URL']){
									record.presence.twitter = url.parse(doc['Twitter URL']);
									if(record.presence.twitter.pathname === "/") record.presence.twitter = "/"+record.presence.twitter.hash;
									else record.presence.twitter = record.presence.twitter.pathname;
									delete record['Twitter URL'];
									util.log("      Twitter "+util.inspect(record.presence.twitter));																
								} else{
									delete record['Twitter URL'];
								}
								if(doc['LastFM URL']){
									record.presence.lastfm = url.parse(doc['LastFM URL']).pathname;
									delete record['LastFM URL'];
									util.log("    LastFM "+util.inspect(record.presence.lastfm));
								} else{
									delete record['LastFM URL'];
								}
								if(doc['E-Mail Address (BAND)']){
									record.presence.email.band = doc['E-Mail Address (BAND)'];
									delete record['E-Mail Address (BAND)'];
									util.log("  Band Email "+util.inspect(record.presence.email.band));
								} else{
									delete record['E-Mail Address (BAND)'];
								}
								if(doc['Home Page URL']){
									record.presence.homepage = doc['Home Page URL'];
									delete record['Home Page URL'];
									util.log("Home Page "+util.inspect(record.presence.homepage));
								} else{
									delete record['Home Page URL'];
								}
								if(doc['Pandora URL']){
									record.presence.pandora = doc['Pandora URL'];
									delete record['Pandora URL'];
									util.log("  Pandora URL "+util.inspect(record.presence.pandora));
								} else{
									delete record['Pandora URL'];
								}
								if(doc['SoundCloud URL']){
									record.presence.soundcloud = url.parse(doc['SoundCloud URL']).pathname;
									delete record['SoundCloud URL'];
									util.log("    SoundCloud URL "+util.inspect(record.presence.soundcloud));
								} else{
									delete record['SoundCloud URL'];
								}
								if(doc['ExtensionFM URL']){
									record.presence.extensionfm = doc['ExtensionFM URL'];
									delete record['ExtensionFM URL'];
									util.log("    ExtensionFM URL "+util.inspect(record.presence.extensionfm));
								} else{
									delete record['ExtensionFM URL'];
								}
								if(doc['LinkedIn URL']){
									record.presence.linkedin = doc['LinkedIn URL'];
									delete record['LinkedIn URL'];
									util.log("    LinkedIn URL "+util.inspect(record.presence.linkedin));
								} else{
									delete record['LinkedIn URL'];
								}
								if(doc['Flickr URL']){
									record.presence.flickr = url.parse(doc['Flickr URL']).pathname;
									delete record['Flickr URL'];
									util.log("    Flickr URL "+util.inspect(record.presence.flickr));
								} else{
									delete record['Flickr URL'];
								}
								if(doc['Youtube URL']){
									record.presence.youtube = url.parse(doc['Youtube URL']).pathname;
									delete record['Youtube URL'];
									util.log("    Youtube URL "+util.inspect(record.presence.youtube));
								} else{
									delete record['Youtube URL'];
								}
								if(doc['iLike URL']){
									record.presence.ilike = url.parse(doc['iLike URL']).pathname;
									delete record['iLike URL'];
									util.log("    iLike URL "+util.inspect(record.presence.ilike));
								} else{
									delete record['iLike URL'];
								}
								if(doc['iTunes URL']){
									record.presence.itunes = url.parse(doc['iTunes URL']).pathname;
									//record.presence.itunes = snipImportant(url.parse(doc['iTunes URL']).pathname, new RegExp(/^\/us\/artist\/(.*)/));
									//^^This broke something, or slowed it down or something...
									delete record['iTunes URL'];
									util.log("    iTunes URL "+util.inspect(record.presence.itunes));
								} else{
									delete record['iTunes URL'];
								}
								if(doc['Vimeo URL']){
									record.presence.vimeo = url.parse(doc['Vimeo URL']).pathname;
									delete record['Vimeo URL'];
									util.log("    Vimeo URL "+util.inspect(record.presence.vimeo));
								} else{
									delete record['Vimeo URL'];
								}
								if(doc['BandCamp URL']){
									//right now we could snip out just the subdomain, but they support non *.bandcamp.com urls see bandcamp.com/faq_custom_domains
									record.presence.bandcamp = doc['BandCamp URL'];
									delete record['BandCamp URL'];
									util.log("    BandCamp URL "+util.inspect(record.presence.bandcamp));
								} else{
									delete record['BandCamp URL'];
								}
								if(doc['Blog URL']){
									record.presence.blog = doc['Blog URL'];
									delete record['Blog URL'];
									util.log("    Blog URL "+util.inspect(record.presence.blog));
								} else{
									delete record['Blog URL'];
								}
								if(doc['E-Mail (US Booking)']){
									record.presence.email.usbooking = doc['E-Mail (US Booking)'];
									delete record['E-Mail (US Booking)'];
									util.log("    E-Mail (US Booking) "+util.inspect(record.presence.email.usbooking));
								} else{
									delete record['E-Mail (US Booking)'];
								}
								if(doc['E-Mail (EUROPE BOOKING)']){
									record.presence.email.eubooking = doc['E-Mail (EUROPE BOOKING)'];
									delete record['E-Mail (EUROPE BOOKING)'];
									util.log("    E-Mail (EUROPE BOOKING) "+util.inspect(record.presence.email.eubooking));
								} else{
									delete record['E-Mail (EUROPE BOOKING)'];
								}
								if(doc['E-Mail (PRESS)']){
									record.presence.email.press = doc['E-Mail (PRESS)'];
									delete record['E-Mail (PRESS)'];
									util.log("    E-Mail (PRESS) "+util.inspect(record.presence.email.press));
								} else{
									delete record['E-Mail (PRESS)'];
								}
								if(doc['E-Mail (Manager)']){
									record.presence.email.manager = doc['E-Mail (Manager)'];
									delete record['E-Mail (Manager)'];
									util.log("    E-Mail (Manager) "+util.inspect(record.presence.email.manager));
								} else{
									delete record['E-Mail (Manager)'];
								}
								if(doc['GigMaven']){
									record.presence.gigmaven = url.parse(doc['GigMaven']).pathname;
									delete record['GigMaven'];
									util.log("    GigMaven "+util.inspect(record.presence.gigmaven));
								} else{
									delete record['GigMaven'];
								}
								if(doc['Flickr Credit']){
									record.flickrcred = doc['Flickr Credit'];
									delete record['Flickr Credit'];
									util.log("    Flickr Credit "+util.inspect(record.presence.flickrcred));
								} else{
									delete record['Flickr Credit'];
								}
								if(doc['Flickr Link (Photostream)']){
									record.flickrcredurl = url.parse(doc['Flickr Link (Photostream)']).pathname;
									delete record['Flickr Link (Photostream)'];
									util.log("    Flickr Link (Photostream) "+util.inspect(record.presence.flickrcredurl));
								} else{
									delete record['Flickr Link (Photostream)'];
								}
								if(doc['Location (City, State)']){
									record.citystate = doc['Location (City, State)'];
									delete record['Location (City, State)'];
									util.log("    Location (City, State) "+util.inspect(record.location.citystate));
								} else{
									delete record['Location (City, State)'];
								}
								if(doc['Location (Country)']){
									record.country = doc['Location (Country)'];
									delete record['Location (Country)'];
									util.log("    Location (Country) "+util.inspect(record.location.country));
								} else{
									delete record['Location (Country)'];
								}
								if(doc['Jambase Link']){
									record.presence.jambase = url.parse(doc['Jambase Link']).pathname;
									delete record['Jambase Link'];
									util.log("    Jambase Link "+util.inspect(record.presence.jambase));
								} else{
									delete record['Jambase Link'];
								}
								if(doc['ArchiveDOTorg']){
									record.presence.archivedotorg = url.parse(doc['ArchiveDOTorg']).pathname;
									delete record['ArchiveDOTorg'];
									util.log("    ArchiveDOTorg "+util.inspect(record.presence.archivedotorg));
								} else{
									delete record['ArchiveDOTorg'];
								}
								
								// record.myspace = myspaceRegEx.exec(doc['Myspace URL']);
								record.name = doc['^NETWORKname^'].replace(/\^/g, "");
								delete record['Band Name'];
								delete record['^NETWORKname^'];
								exportColl.insert(record, function(err){
									if(err) util.log(new Error(err));
									util.log('Wrote record for '+record.fullname+" #: "+counter++);
									process.nextTick(nextRecord);
								});
							}
							else{
								if(err) util.log(new Error(err));
								//util.log(util.inspect(exportColl.find()));
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