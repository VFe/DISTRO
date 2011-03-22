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
		var responseContent = {};
		function successback(data, topData){
			if (data) {
				responseContent.data = data;
			}
			connect.utils.merge(responseContent, topData);
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
		global.sessions.getRequestSession(req, res, function(err, user, sessionID) {
			if (err){
				errback(err);
				return;
			} else {
				if (requireAuthentication && ! (user && user.email)) {
					responseContent.userName = null;
					responseContent.status = "unauthorized";
					endResponse(res, 403, {}, responseContent);
				} else {
					responseContent.userName = user && user.email;
					callback(user ? {user: user, session: sessionID} : null, req, res, successback, errback);
				}
			}
		});
	};
};
exports.logToConsole = true;
exports.logToResponse = true;