var fs = require('fs'),
	knox = require('knox'),
	s3client = knox.createClient({
		key: 'AKIAJ6G25MAO2A5YO5ZQ',
		secret: fs.readFileSync("./s3secret", 'utf8'),
		bucket: 'distro-music'
	});

exports.pushFile = function(file, name, callback){
	fs.stat(file, function(err, stat){
		if(err){
			callback(err);
		} else {
			var stream = fs.createReadStream(file, {bufferSize: stat.size}); //TODO FIGURE OUT WHAT THIS SHIT DOES
			s3client.putStream(stream, name, function(err, res){
				var body, error;
				if(err){
					callback(err);
				} else if (res.statusCode < 200 || res.statusCode > 299) {
					body = '';
					res.setEncoding('utf8');
					res.on('data', function (d) {
						body += d;
					});
					res.on('end', function(){
						callback(new Error(body));
					})
				} else {
					callback(null);
				}
			});
		}
	});
};