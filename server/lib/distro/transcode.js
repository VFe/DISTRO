var path = require('path'),
	exec = require('child_process').execFile;

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
	var child = exec('/bin/sh', [path.join(__dirname, './transcode.sh')],
		{env: {INPUT_FILE: inputFilePath, OUTPUT_FILE: outputFilePath, IS_WAV: isWav}},
		function (error, stdout, stderr) {
		console.log('stdout: ' + stdout);
		console.log('stderr: ' + stderr);
		if (error !== null) {
			console.log('exec error: ' + error);
			callback(error, null);
		} else {
			callback(null, outputFilePath);
		}
	});
};