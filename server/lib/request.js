var util = require('util'),
    connect = require('connect'),
    error = require('./error');

function endResponse(res, status, headers, body){
	var bodyString = JSON.stringify(body);
	headers['Content-Type'] = 'application/json; charset=utf-8';
	headers['Content-Length'] = Buffer.byteLength(bodyString, 'utf8');
	res.writeHead(status, headers);
	res.end(bodyString, 'utf8');
}

exports.handleRequest = function(requireAuthentication, callback){
	return function(req, res) {
		var responseContent = {status: "OK"};
		function successback(response){
			connect.utils.merge(responseContent, response);
			endResponse(res, 200, {}, responseContent)
		}
		function errback(err){
			var status;
			responseContent.status = "error";
			if (err instanceof error.ClientError) {
				status = 403;
				responseContent.errorMessage = err.message;
			} else {
				status = 500;
				if (exports.logToConsole){
					util.error(err.stack);
				}
				if (exports.logToResponse){
					responseContent.rawError = error;
				}
			}
			endResponse(res, status, {}, responseContent)
		};
		if (requireAuthentication){
			global.sessions.getRequestSession(req, res, function(err, user, sessionID) {
				if (err){
					errback(err);
					return;
				} else if (user && user.email) {
					responseContent.userName = user.email;
					callback({user: user, session: sessionID}, req, res, successback, errback);
				} else {
					responseContent.userName = null;
					responseContent.status = "unauthorized";
					endResponse(res, 403, {}, responseContent)
				}
			});
		} else {
			callback(null, req, res, successback, errback);
		}
	};
};
exports.logToConsole = true;
exports.logToResponse = true;