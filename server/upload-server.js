require.paths.unshift(__dirname + "/vendor");

var util = require('util'),
	fs = require('fs'),
	mongoDB = require('mongodb'),
	url = require('url'),
	_ = require('underscore.js'),
	connect = require('connect'),
	distro = require('./lib');

global.db = new mongoDB.Db('Distro', new mongoDB.Server(process.env['MONGO_NODE_DRIVER_HOST'] ||  'localhost', process.env['MONGO_NODE_DRIVER_PORT'] || mongoDB.Connection.DEFAULT_PORT, {}), {native_parser:true});
global.networks = new distro.Networks();

global.db.open(function(err, db){
	if (err){
		throw err;
	}
	distro.init(function(){
		connect.createServer(
			connect.logger(),
			connect.cookieDecoder(),
			connect.bodyDecoder(),
			connect.staticProvider(__dirname + '/static/upload'),
			connect.staticProvider(__dirname + '/static/common')
		)
		.use('/api/', connect.router(function(app) {
			
		}))
		.listen(3000);
		util.log('Alive on port 3000');
	});
});