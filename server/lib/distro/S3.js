var fs = require('fs'),
	knox = require('knox'),
	s3client = knox.createClient({
		key: 'AKIAJ6G25MAO2A5YO5ZQ',
		secret: fs.readFileSync("./s3secret", 'utf8'),
		bucket: 'distro-music-dev'
	});

exports.pushFile = function(file, name, callback){
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