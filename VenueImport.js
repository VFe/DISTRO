var mongoDB = require("mongodb"),
	util = require('util'),
	url = require('url'),
	_ = require('underscore');
	
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
								var myspaceRegEx = new RegExp("/\/(\w+$)/", "g"),
									  urlKeyList = ['FOURSQUARE', 'HOME_PAGE', 'FACEBOOK', 'MYSPACE', 'TWITTER', 'YELP', 'GOOGLE_MAP', 'FLICKR_STREAM', 'YOUTUBE', 'REVERB_NATION', 
													'CAL_GOOG', 'CAL_MAIN', 'PHOTO_LINK', 'LASTFM', 'PANDORA', 'SOUNDCLOUD', 'LINKEDIN', 'ILIKE', 'ITUNES', 'VIMEO', 'BANDCAMP', 'BLOG', 'GIGMAVEN', 'ARCHIVE', 'JAMBASE'], 

									basicRenameList = [{oldName:"TYPE", newName:"type"}, {oldName:"NETWORK_NAME", newName:"name"}, {oldName:"FULL_NAME", newName:"fullname"}, {oldName:"STREET_ADDRESS", newName:"streetAddress", object:"location"},
													{oldName:"CITY, STATE", newName:"citystate", object:"location"}, {oldName:"COUNTRY", newName:"country", object:"location"}, {oldName:"HOME_PAGE", newName:"homepage", object:"presence"},
													{oldName:"EMAIL_VENUE_BOOKING", newName:"booking", object:"email"}, {oldName:"EMAIL_GENERAL", newName:"general", object:"email"}, {oldName:"EMAIL_US", newName:"usbooking", object:"email"}, 
													{oldName:"EMAIL_EU", newName:"eubooking", object:"email"}, {oldName:"EMAIL_PRESS", newName:"press", object:"email"}, {oldName:"EMAIL_MANAGER", newName:"manager", object:"email"},
													{oldName:"PHONE", newName:"phone"}, {oldName:"ZIP", newName:"zip"}, {oldName:"PHOTO_BY", newName:"photoCred"}, {oldName:"CAL_MAIN", newName:"calendar"}, 
													{oldName:"CAL_GOOG", newName:"calendarGoogle"}],

									urlPathList = [{oldName:"FOURSQUARE", newName:"foursquare", object:"presence"}, {oldName:"FACEBOOK", newName:"facebook", object:"presence", hashable:true}, {oldName:"TWITTER", newName:"twitter", object:"presence", hashable:true}, 
												{oldName:"MYSPACE", newName:"myspace", object:"presence"}, {oldName:"LASTFM", newName:"lastfm", object:"presence"}, {oldName:"PANDORA", newName:"pandora", object:"presence"}, 
												{oldName:"SOUNDCLOUD", newName:"soundcloud", object:"presence"}, {oldName:"PHOTO_LINK", newName:"photoCredURL"}, {oldName:"ILIKE", newName:"ilike", object:"presence"},
												{oldName:"VIMEO", newName:"vimeo", object:"presence"}, {oldName:"GIGMAVEN", newName:"gigmaven", object:"presence"}, {oldName:"ARCHIVE", newName:"archive", object:"presence"}, 
												{oldName:"JAMBASE", newName:"jambase", object:"presence"}, {oldName:"REVERB_NATION", newName:"reverbnation", object:"presence"}, {oldName:"YELP", newName:"yelp", object:"presence"}];

								record = doc; //This could just be record = {}; but I'm leaving it like this for now
								record.presence = {};
								record.location = {};
								record.Timestamp = new Date(doc.Timestamp);
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
										//var killTrailingSlash = /(.*)\/$/.exec(doc[key]);
										/*if(killTrailingSlash){*/
											//doc[key] = killTrailingSlash[1];
										/*}*/
									}
								}
								function basicRename(acceptObj){
									var oldRecordName = acceptObj.oldName,
										newRecordName = acceptObj.newName,
										subObject = acceptObj.object;

									if(doc[oldRecordName]){
									  if(subObject){
										if(record[subObject] == undefined){ record[subObject] = {};}
										record[subObject][newRecordName] = record[oldRecordName];
									  } else {
										record[newRecordName] = record[oldRecordName];
									  }
									  delete record[oldRecordName];
									  util.log(newRecordName + " " + util.inspect(subObject ? record[subObject][newRecordName] : record[newRecordName]));
									} else{
									  delete record[oldRecordName];
									} 
								}
								function urlPathnameRename(acceptObj){
									var oldRecordName = acceptObj.oldName,
										newRecordName = acceptObj.newName,
										subObject = acceptObj.object, 
										hashPossible = acceptObj.hashable;
									if(hashPossible && doc[oldRecordName]){
										if(subObject){
											if(record[subObject] == undefined){ record[subObject] = {};}
											record[subObject][newRecordName] = url.parse(record[oldRecordName]);
											if(record[subObject][newRecordName].pathname === "/") record[subObject][newRecordName] = record[subObject][newRecordName].hash;
											else record[subObject][newRecordName] = record[subObject][newRecordName].pathname;
											delete record[subObject][oldRecordName];
											util.log(newRecordName + " " + util.inspect(subObject ? record[subObject][newRecordName] : record[newRecordName]));
										} else {
											record[newRecordName] = url.parse(record[oldRecordName]);
											if(record[newRecordName].pathname === "/") record[newRecordName] = record[newRecordName].hash;
											else record[newRecordName] = record[newRecordName].pathname;
											delete record[oldRecordName];
											util.log(newRecordName + " " + util.inspect(subObject ? record[subObject][newRecordName] : record[newRecordName]));
										}
									} else if(doc[oldRecordName]){
										if(subObject){
											if(record[subObject] == undefined){ record[subObject] = {};}
											record[subObject][newRecordName] = url.parse(record[oldRecordName]).pathname;
										} else{
										record[newRecordName] = url.parse(record[oldRecordName]).pathname;
										}
										delete record[oldRecordName];
										util.log(newRecordName + " " + util.inspect(subObject ? record[subObject][newRecordName] : record[newRecordName]));
									} else{
									delete record[oldRecordName];
									}
									//if((/^\//).exec(record[newRecordName] || record[subObject][newRecordName])){console.log("boom");}
								}
							_.each(basicRenameList, basicRename);
							_.each(urlPathList, urlPathnameRename);
								// record.myspace = myspaceRegEx.exec(doc['Myspace URL']);
								//record.name = doc['^NETWORKname^'].replace(/\^/g, "");
								//delete record['Band Name'];
								//delete record['^NETWORKname^'];
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
