var CollectionManager = require('./lib/CollectionManager'),
    uuid = require('uuid'),
    connect = require('connect');

function Sessions(){ require('./init').add(this); }
module.exports = Sessions;
Sessions.prototype = new CollectionManager();
Sessions.prototype.constructor = Sessions;
Sessions.collectionName = 'sessions';

Sessions.SESSION_NAME = 'distro_session'; // Session cookie name
Sessions.SESSION_LENGTH = 86400000; // Twenty four hours
Sessions.EXTENDED_SESSION_LENGTH = 15778463000; // Six months
Sessions.TIME_TO_REFRESH = 600000; //Ten minutes

function attachCookieToResponse(value, options, res){
	// Based on Connect's session middleware
	options.HttpOnly = true;
	var cookieString = connect.utils.serializeCookie(Sessions.SESSION_NAME, value, options);
	writeHead = res.writeHead;
	res.writeHead = function(status, headers){
		// Multiple Set-Cookie headers
		headers = headers || {};
		if (headers['Set-Cookie']) {
			headers['Set-Cookie'] += '\r\nSet-Cookie: ' + cookieString;
		} else {
			headers['Set-Cookie'] = cookieString;
		}
		
		// Pass through the writeHead call
		res.writeHead = writeHead;
		return res.writeHead(status, headers);
	};
};

Sessions.prototype.getRequestSession = function(req, res, callback){
	var sessionID = req.cookies && req.cookies.distro_session;
	if (sessionID){
		this.collection.findOne({"session":sessionID}, function(err, doc){
			if (err) { callback(err, null); return; }
			if (!doc || +doc.lastRenewal + (doc.extended ? Sessions.EXTENDED_SESSION_LENGTH : Sessions.SESSION_LENGTH) < new Date) {
				// TODO: Extend sessions when they get close to expiration
				attachCookieToResponse("", {expires:new Date(0)}, res); //Destroy Cookie
				callback(null, null, null);
			} else {
				// Success!
				global.users.userWithUserID(doc.userID, function(err, user){
					if(err) { callback(err, null, null); return; }
					if(user && user.email){
						callback(null, user, sessionID);
					} else {
						attachCookieToResponse("", {expires:new Date(0)}, res); //Destroy Cookie
						callback(null, null, null);
					}
				});
			}
		});
	} else {
		callback(null, null, null);
	}
};
Sessions.prototype.endSession = function(sessionID, res, callback){
	this.collection.remove(sessionID, function(err){
		callback(err);
	});
	attachCookieToResponse("", {expires:new Date(0)}, res); //Destroy Cookie
};
Sessions.prototype.startSessionForUserID = function (userID, extendedSession, req, res, callback){
	if (!userID) { callback(new Error("startSessionForUserID: null userID")); };
	var sessionID = uuid.generate('ascii');
	this.collection.insert({"userID":userID, "session":sessionID, "lastRenewal":new Date, "extended":extendedSession}, function(err, doc){
		if (err){
			callback(err);
			return;
		}
		var cookieOpts = {};
		if (extendedSession) {
			cookieOpts.expires = new Date(+new Date + Sessions.EXTENDED_SESSION_LENGTH);
		}
		attachCookieToResponse(sessionID, cookieOpts, res);
		callback(null);
	});
};
