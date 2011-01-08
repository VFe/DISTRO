var mongoDB = require("mongodb"),
	util = require('util'),
	url = require('url');
	
importDB = new mongoDB.Db('Import', new mongoDB.Server(process.env['MONGO_NODE_DRIVER_HOST'] ||  'localhost', process.env['MONGO_NODE_DRIVER_PORT'] || mongoDB.Connection.DEFAULT_PORT, {}), {native_parser:true});
exportDB = new mongoDB.Db('Distro', new mongoDB.Server(process.env['MONGO_NODE_DRIVER_HOST'] ||  'localhost', process.env['MONGO_NODE_DRIVER_PORT'] || mongoDB.Connection.DEFAULT_PORT, {}), {native_parser:true});

importDB.open(function(err, db) {
	exportDB.open(function(err, exportDB){
		exportDB.collection('bands', function(err, exportColl){
			db.collection('i3', function(err, coll){
				coll.find(function(err, cursor){
					var counter = 1;
					cursor.each(function(err, doc){
						if(doc != null){
							var myspaceRegEx = new RegExp("/\/(\w+$)/", "g");
							record = doc;
							record.presence = {};
							record.Timestamp = new Date(doc.Timestamp);
							record.fullname = doc['Band Name'];
							if(doc['Facebook URL']){
								record.facebook = url.parse(doc['Facebook URL']).pathname;
								delete record['Facebook URL'];
								util.log("   Facebook "+util.inspect(record.facebook));								
							}
							if(doc['Myspace URL']){
								record.myspace = url.parse(doc['Myspace URL']).pathname;
								delete record['Myspace URL'];
								util.log("    Myspace "+util.inspect(record.myspace));																
							}
							if(doc['Twitter URL']){
								record.presence.twitter = url.parse(doc['Twitter URL']);
								if(record.presence.twitter.pathname === "/") record.presence.twitter = "/"+record.presence.twitter.hash;
								else record.presence.twitter = record.presence.twitter.pathname;
								delete record['Twitter URL'];
								util.log("       Twitter "+util.inspect(record.presence.twitter));																
							}
							// record.myspace = myspaceRegEx.exec(doc['Myspace URL']);
							record.name = doc['^NETWORKname^'].replace(/\^/g, "");
							delete record['Band Name'];
							delete record['^NETWORKname^'];
							exportColl.insert(record);
							util.log('Wrote record for '+record.fullname+" #: "+counter++);
						}
						else{
							if(err) util.log(new Error(err));
							//util.log(util.inspect(exportColl.find()));
							db.close();
							exportDB.close();
						}
					});
				});
			});
		});
	});
});