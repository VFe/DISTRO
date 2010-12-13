var connect = require('connect');

function internalServerError(error, res){
	if (DISTROInternalServerError.logToConsole){
		sys.error(err.stack);
	}
	
	if (DISTROInternalServerError.logToResponse){
		res.writeHead(500, { 'Content-Type': 'text/plain' });
		res.end(err.stack);
	} else {
		res.writeHead(500);
		res.end("BROKEN...");
	}
}

exports.handleRequest = function(requireAuthentication, callback){
	return function(req, res) {
		var responseContent = {status: "OK"};
		function successback(response){
			connect.utils.merge(responseContent, response);
			res.writeHead(200);
			res.end(JSON.stringify(responseContent));
		}
		function errback(err){
			res.writeHead(500);
			responseContent.status = "error";
			responseContent.errorMessage = err || "BAD THINGS GO HAPPEN";
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