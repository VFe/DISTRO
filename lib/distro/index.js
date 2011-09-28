var needInit = [], initRan = false;

require('fs').readdirSync(__dirname).forEach(function(file){
	if (file !== 'index.js' && file.substr(-3) === '.js') {
		var submodule = require(__dirname + '/' + file);
		if (submodule.init) {
			needInit.push(submodule);
		}
		exports[file.substring(0, file.length - 3)] = submodule;
	}
});

exports.init = function(callback){
	if (initRan) {
		throw new Error("distro.init already called");
	}
	var remaining = needInit.length;
	if (needInit.length === 0) {
		process.nextTick(callback);
		return;
	}
	function next(){
		if (--remaining === 0) {
			callback();
		}
	}
	initRan = true;
	needInit.forEach(function(callee){
		callee.init(next);
	});
}
// TEMPORARY
exports.init.add = function(callee){
	needInit.push(callee);
}