var mongoDB = require('mongodb'),
    crypto = require('crypto'),
    error = require('./error');

function Users(){}
module.exports = Users;

function hash(password, salt){
	return new crypto.Hash("sha1").update(password + salt).digest("hex");
};
function passwordIsAcceptable(password){
	return (password.length > 2);
};

Users.prototype.init = function(callback){
	var self = this;
	global.db.collection('users', function(err, collection){
		if (err) {
			throw err;
		} else if (!collection) {
			throw "users collection is not defined";
		} else {
			self.collection = collection;
			callback();
		}
	});
};
Users.prototype.userExists = function(email, callback){
	//This regex isn't _nearly_ complete, but it mostly works (The alternative is a page long PCRE that is completely compliant with RFC 822)
	//If we decide we want the _insanely_ long one, an example is here http://www.ex-parrot.com/pdw/Mail-RFC822-Address.html
	var re = /^[-a-z0-9~!$%^&*_=+}{\'?]+(\.[-a-z0-9~!$%^&*_=+}{\'?]+)*@([a-z0-9_][-a-z0-9_]*(\.[-a-z0-9_]+)*\.(aero|arpa|biz|com|coop|edu|gov|info|int|mil|museum|name|net|org|pro|travel|mobi|[a-z][a-z])|([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}))(:[0-9]{1,5})?$/i;
	if (re.test(email)){
		this.collection.findOne({"email":email}, function(err, result){
			callback(err, !!result);
		});
	} else {callback(new error.ClientError("email invalid"), null);}
};
Users.prototype.userWithCredentials = function(email, password, callback){
	if (!email || !password){
		callback(new Error("Missing credentials"), false);
		return;
	}
	this.collection.findOne({"email":email}, function(err, result){
		if(err){
			callback(err, null);
		}
		if (result && result.salt && result.hash && hash(password, result.salt) === result.hash){
			callback(null, result);
		} else {
			callback(null, null);
		}
	});
};
Users.prototype.userWithUserID = function(userID, callback){
	if (!(userID instanceof mongoDB.ObjectID)){
		userID = new mongoDB.ObjectID(userID);
	}
	this.collection.findOne({"_id":userID}, callback);
};
Users.prototype.registerUser = function(email, password, callback){
	var self = this;
	var salt = Math.floor(Math.random() * 0x100000000).toString(16);
	self.userExists(email, function(err, exists){
		if(err){
			callback(err, null);
		} else if (exists){
			callback(new error.ClientError("user already exists!"), null);
		} else {
			self.collection.insert({"email":email, "hash":hash(password, salt), "salt":salt}, function(err, doc){
				callback(err, doc[0]._id);
			});
		}
	});
};