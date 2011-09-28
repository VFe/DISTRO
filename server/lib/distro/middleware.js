var error = require('./error');

module.exports = exports = {
	prelude: function(req, res, next){
		var responseContent = {};

		res.setMetadata = function(data){
			for (var key in data) {
				responseContent[key] = data[key];
			}
		};
		res.send = function(body, params){
			params = params || {};
			var status = params.status || 200,
				headers = params.headers || {},
				bodyString;
			if (body) {
				responseContent.data = body;
			}
			bodyString = JSON.stringify(responseContent);
			headers['Content-Type'] = 'application/json; charset=utf-8';
			headers['Content-Length'] = Buffer.byteLength(bodyString, 'utf8');
			this.writeHead(status, headers);
			this.end(bodyString, 'utf8');
		}
		next();
	},
	errorHandler: function (err, req, res, next) {
		if (err) {
			var status;
			res.setMetadata({ status: "error" });
			if (err instanceof error.ClientError) {
				status = 403;
				res.setMetadata({ errorMessage: err.message });
			} else {
				status = 500;
				if (exports.logToConsole){
					console.error(err.stack);
				}
				if (exports.logToResponse){
					res.setMetadata({ rawError: err });
				}
			}
			res.send(null, { status: status });
		} else {
			next();
		}
	},
	getUser: function(req, res, next){
		global.sessions.getRequestSession(req, res, function(err, user, sessionID) {
			if (err) {
				next(err);
			} else {
				res.setMetadata({ userName: user && user.email });
				req.user = user;
				req.session = { user: user, id: sessionID };
				next();
			}
		});
	},
	ensureUser: function(options){
		if ( ! options) options = {};
		return function (req, res, next){
			if (req.user) {
				next();
			} else if (options.create) {
				// Register an "unclaimed" account
				global.users.registerUser(null, null, function(err, user){
					if (err) {
						next(err);
					} else {
						global.sessions.startSessionForUserID(user._id, true, req, res, function(err, sessionID){
							if(err){
								next(err);
							} else {
								req.user = user;
								req.session = {user: user, session: sessionID};
								next();
							}
						});
					}
				});
			} else {
				res.setMetadata({ status: "unauthorized" });
				res.send(null, { status: 403 });
			}
		};
	},
	logToConsole: true,
	logToResponse: true
};