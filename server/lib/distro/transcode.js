var execFile = require('child_process').execFile;

module.exports = function transcode(file, callback){
	try {
		var inputFile = file.match(/^(.*)\.(wav|mp3)$/),
			inputFilePath = inputFile[0],
			isWav = inputFile[2].toLowerCase() == 'wav' ? true : false,
			outputFilePath = inputFile[1] + 'out.mp3';
	} catch(e) {
		callback(new Error('File didn\'t match regex'), null);
		return;
	}
	execFile('lame', ['--silent', '-V3', inputFilePath, outputFilePath], function (error, stdout, stderr) {
		if (error) {
			callback(error, null);
		} else {
			if (isWav) {
				callback(null, outputFilePath);
			} else {
				execFile('python', [__dirname + 'id3cp.py', inputFilePath, outputFilePath], function(error, stdout, stderr){
					if (error) {
						console.error("id3cp error:", error);
					}
					callback(null, outputFilePath);
				});
			}
		}
	});
};