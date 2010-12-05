require.paths.unshift(__dirname + "/vendor");

var util = require('util'),
	fs = require('fs'),
	Db = require('mongodb').Db,
	Connection = require('mongodb').Connection,
	Server = require('mongodb').Server,
	querystring = require('querystring'),
	staticServer = require('node-static'),
	url = require('url'),
	_ = require('underscore.js'),
	connect = require('connect'),
	auth = require('connect-auth');

global.db = new Db('Distro', new Server(process.env['MONGO_NODE_DRIVER_HOST'] ||  'localhost', process.env['MONGO_NODE_DRIVER_PORT'] || Connection.DEFAULT_PORT, {}), {native_parser:true});
//global.users = new UserController();

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
	});
}

// db.open(function(err, db){
// 	callMany(_.bind(global.users.init, global.users), function (){
// 		var server = http.createServer(function(req, res){
// 			if(url.parse(req.url) !== '/' || req.method !== 'POST'){
// 				var body = 'Not Found';
// 				response.writeHead(404, {
// 				  'Content-Length': body.length,
// 				  'Content-Type': 'text/plain'
// 				});
// 				response.end(body);
// 			}
// 			else{
// 				
// 			}
// 		})
// 	})
// })


var server = connect.createServer(
	connect.cookieDecoder(),
	connect.session(),
	connect.bodyDecoder(),
	auth(function(options) {
	  options= options || {};
	  var that= {};
	  var my= {}; 
	  that.name     = options.name || "someName";
	  that.authenticate= function(request, response, callback) {
	   if( !(request.body && request.body.user && request.body.password && request.body.user == "Waffler") ) { 
	     response.writeHead(303, { 'Location': "/auth/form_callback?redirect_url=" + escape(request.url) });
	     response.end('');
	   }
	  };
	that.setupRoutes = function(server){
		server.use('/', connect.router(function routes(app){
			app.post('/', function(request, response){
			        request.authenticate( [that.name], function(error, authenticated) {
			          var redirectUrl= "/",
			          	  parsedUrl= url.parse(request.url, true);
			          if( parsedUrl.query && parsedUrl.query.redirect_url ) {
			            redirectUrl= parsedUrl.query.redirect_url;
			          }
			          response.writeHead(303, { 'Location':  redirectUrl });
			          response.end('');
			        })
			      });
		}))
	}
	  return that;
	}()),
	connect.router(function(app) {
	    app.get('/',
	    function(req, res, params) {
	        req.authenticate(['someName'],
	        function(error, authenticated) {
	            res.writeHead(200, {
	                'Content-Type': 'text/plain'
	            });
	            res.end('Hello World');
	        });
	    });
	})
);
server.listen(3000);