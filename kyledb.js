var http = require('http'),
	exec = require('child_process').exec,
	fs = require('fs'),
	auth = fs.readFileSync("./auth.txt", encoding = 'utf8'),
	distroAuth = fs.readFileSync("./DistroAuth.txt", encoding = 'utf8'),
	util = require('util');

http.createServer(function (req, res) {
	res.writeHead(200, {'Content-Type': 'text/plain'});
	exec("bash loadNetworks.sh", {cwd:__dirname, env:{AUTH_TOKEN:auth, DISTRO_AUTH_TOKEN:distroAuth, NODE_PATH:process.env.NODE_PATH}},
	function(error, stdout, stderr){
		res.write("STDOUT: "+stdout);
		res.write('STDERR: '+stderr);
		if(error){
			res.write("Error: "+error);
			console.log('Error: '+error);
		}
		res.end("done");
		console.log('STDOUT: '+stdout);
		console.log('STDERR: '+stderr);
		console.log("Wrote some shit I hope");
	});
//	script.stdout.on('data', function(data){
//		res.write(data, encoding='utf8');
//	});
//	script.on('exit', function(code){
//		console.log("Done");
//		res.end("Exited with code: "+code, encoding='utf8');
//	});
}).listen(8118);
console.log("Running on port 8118");
