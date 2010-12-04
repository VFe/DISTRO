var util = require('util'),
    fs = require('fs'),
    Db = require('mongodb').Db,
    Connection = require('mongodb').Connection,
    Server = require('mongodb').Server,
    querystring = require('querystring'),
    static = require('node-static');

global.db = new Db('Siftr', new Server(process.env['MONGO_NODE_DRIVER_HOST'] ||  'localhost', process.env['MONGO_NODE_DRIVER_PORT'] || Connection.DEFAULT_PORT, {}), {native_parser:true});

function UserStore(callback){
	
}

function callMany(){
	var callees = arguments.slice(0, arguments.length - 1),
	    callback = arguments[arguments.length - 1];
	if (callees.length === 0) {
		setTimeout(callback, 0);
	}
	function ownCallback(){
		callees.pop();
		if (callees.length === 0) {
			callback();
		}
	}
	callees.forEach(function(callee){
		callee(ownCallback);
	})
}

