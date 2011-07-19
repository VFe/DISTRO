var fs = require('fs'),
	exec = require('child_process').execFile,
	knox = require('knox'),
	s3client = knox.createClient({
		key: 'AKIAJO6FMZRY6VHMCPBA',
		secret: fs.readFileSync(__dirname + "/auth/s3secret", encoding = 'utf8'),
		bucket: 'distro-music-dev'
	}),
	CollectionManager = require('./lib/CollectionManager');
	
function Uploads(){ require('./init').add(this); }
module.exports = Uploads;
Uploads.prototype = new CollectionManager();
Uploads.collectionName = 'uploads';
Uploads.prototype.constructor = Uploads;

Uploads.prototype.pushFile = function(files, callback){
	var stream = fs.createReadStream(files.path, {bufferSize: files.size});
	s3client.putStream(stream, files.name, function(err, res){
		if(err){
			callback(new distro.error.ClientError('S3 Error'), null);
		} else {
			console.log(res);
			callback(null, {"done":"done"});
		}
	});
};

Uploads.prototype.transcode = function(file, callback){
	try {
		var inputFile = file.path.match(/^(.*)\.(wav|mp3)$/),
			inputFilePath = inputFile[0],
			outputFilePath = inputFile[1] + '.mp3',
			isWav = inputFile[2].toLowerCase() == '.wav' ? true : false;
	} catch(e) {
		callback(new distro.error.ClientError('File didn\'t match regex'), null);
		return;
	}

	var child = exec('/bin/sh', ['./transcode.sh'], 
		{env: {INPUTFILE: inputFilePath, OUTPUTFILE: outputFilePath, ISWAV: isWav}},
		function (error, stdout, stderr) {
		console.log('stdout: ' + stdout);
		console.log('stderr: ' + stderr);
		if (error !== null) {
			console.log('exec error: ' + error);
		}
	});
};

Uploads.prototype.deferred = {
	args: null,
	cb: null,
	wait: function(cb){
		if (this.args) {
			cb.apply(undefined, this.args);
		} else {
			this.cb = cb;
		}
	}
};