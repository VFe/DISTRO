var helper = __dirname + '/helpers/mp3info.py',
	execFile = require('child_process').execFile;

module.exports = function mp3info(filename, callback){
	execFile('python', [helper, filename], function(error, stdout, stderr){
		if (error) {
			callback(error);
		} else {
			try {
				callback(null, JSON.parse(stdout));
			} catch (e) {
				callback(e);
			}
		}
	});
}