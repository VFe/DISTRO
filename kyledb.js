var http = require('http'),
	exec = require('child_process').exec,
	fs = require('fs'),
	auth = fs.readFileSync("/auth.txt", encoding = 'utf8');

http.createServer(function (req, res) {
	res.writeHead(200, {'Content-Type': 'text/plain'});
	exec("bash /loadNetworks.sh", [], {cwd:"/", env:auth}, 
	 function(error, stdout, stdin){
		res.write("STDOUT: "+stdout);
		if(error){
			res.write("Error: "+error);
		}
		res.end("done");
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
