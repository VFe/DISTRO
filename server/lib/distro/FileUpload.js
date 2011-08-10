var path = require('path'),
	fs = require('fs'),
	ClientError = require('./error').ClientError;

function Deferred(){}
Deferred.prototype.resolve = function(){
	if (this.cb) {
		this.cb.apply(undefined, arguments);
	} else {
		this.args = arguments;
	}
};
Deferred.prototype.wait = function(callback){
	if (this.args) {
		callback.apply(undefined, this.args);
	} else {
		this.cb = callback;
	}
};

function makeUploadPath(filename) {
	var name = '';
	for (var i = 0; i < 32; i++) {
		name += Math.floor(Math.random() * 16).toString(16);
	}
	name += path.extname(filename);
	return path.join('/tmp', name);
}

function FileUpload(req){
	var self = this;
	this.deferred = new Deferred;
	
	if (req.form) {
		req.form.complete(function(err, fields, files){
			self.deferred.resolve(err, files && files.upload && files.upload.path);
		});
	} else if(req.headers['content-type'] == "application/octet-stream" ){
		function pause(){
			try{
				req.pause();
			}catch(err){
				//TODO need error handling
				throw err;
			}
		}
		function resume(){
			try {
				req.resume();
			} catch (err) {
				//TODO need error handling
				throw err;
			}
		}
		var uploadPath = makeUploadPath(req.headers['x-file-name']),
			writeStream = new fs.WriteStream(uploadPath);
		req
			.on('error', function(err) {
				//TODO need error handling
				throw err;
			})
			.on('aborted', function() {
				//TODO need abort handling
				throw new Error("upload aborted");
			})
			.on('data', function(buffer) {
				pause();
				writeStream.write(buffer, function(){
					resume();
				});
			})
			.on('end', function() {
				writeStream.end(function(){
					self.deferred.resolve(null, uploadPath);
				});
			});
		
	} else {
		this.deferred.resolve(new ClientError("Missing upload"));
	}
}
FileUpload.prototype.complete = function(callback){
	return this.deferred.wait(callback);
};

module.exports = FileUpload;