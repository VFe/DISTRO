var util = require('util'),
    connect = require('connect'),
    error = require('./error');

exports.handleRequest = function(requireAuthentication, callback){
	return function(req, res) {
		var responseContent = {status: "OK"};
		function successback(response){
			connect.utils.merge(responseContent, response);
			res.writeHead(200, {'Content-Type': 'application/json'});
			res.end(JSON.stringify(responseContent));
		}
		function errback(err){
			if (err instanceof error.ClientError) {
				responseContent.errorMessage = err.message;
				responseContent.status = "error";
				res.writeHead(403, {'Content-Type': 'application/json'});
				res.end(JSON.stringify(responseContent));
			} else {
				if (exports.logToConsole){
					util.error(err.stack);
				}
				if (exports.logToResponse){
					responseContent.rawError = error;
				}
				responseContent.status = "error";
				res.writeHead(500, {'Content-Type': 'application/json'});
				res.end(JSON.stringify(responseContent));
			}
			res.end(JSON.stringify(responseContent));
		};
		if (requireAuthentication){
			global.sessions.getRequestSession(req, res, function(err, user, sessionID) {
				if (err){
					errback(err);
					return;
				} else if (!user) {
					res.writeHead(403);
					responseContent.status = "unauthorized";
					responseContent.errorMessage = "Can't let you do that, Dave!";
					res.end(JSON.stringify(responseContent));
				} else {
					responseContent.userName = user.email;
					callback({user: user, session: sessionID}, req, res, successback, errback);
				}
			});
		} else {
			callback(null, req, res, successback, errback);
		}
	};
};
exports.logToConsole = true;
exports.logToResponse = true;