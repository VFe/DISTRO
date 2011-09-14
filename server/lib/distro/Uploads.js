var fs = require('fs'),
	knox = require('knox'),
	s3client = knox.createClient({
		key: 'AKIAJO6FMZRY6VHMCPBA',
		secret: fs.readFileSync("./s3secret", encoding = 'utf8'),
		bucket: 'distro-music-dev'
	}),
	CollectionManager = require('./lib/CollectionManager');
	
function Uploads(){ require('./init').add(this); }
module.exports = Uploads;
Uploads.prototype = new CollectionManager();
Uploads.collectionName = 'uploads';
Uploads.prototype.constructor = Uploads;

Uploads.prototype.pushFile = function(file, name, callback){
	fs.stat(file, function(err, stat){
		if(err){
			callback(err);
		} else {
			var stream = fs.createReadStream(file, {bufferSize: stat.size}); //TODO FIGURE OUT WHAT THIS SHIT DOES
			s3client.putStream(stream, name, function(err, res){
				if(err){
					callback(err);
				} else {
					console.log(res);
					callback(null);
				}
			});
		}
	});
};