var helper = __dirname + '/helpers/md5.py',
	execFile = require('child_process').execFile;

module.exports = function md5(filename, callback){
	execFile('python', [helper, filename], function(error, stdout, stderr){
		if (error) {
			callback(error);
		} else {
			try {
				callback(null, stdout.trim());
			} catch (e) {
				callback(e);
			}
		}
	});
}