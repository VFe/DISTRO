function init(callback){
	if (init.ran) {
		throw new Error("distro.init already called");
	}
	var remaining = init.callees.length;
	if (init.callees.length === 0) {
		process.nextTick(callback);
		return;
	}
	function ownCallback(){
		if (--remaining === 0) {
			callback();
		}
	}
	init.ran = true;
	init.callees.forEach(function(callee){
		callee.init(ownCallback);
	});
}
init.add = function(callee){
	if (init.ran) {
		throw new Error("distro.init already called");
	}
	init.callees.push(callee);
}
init.callees = [];
init.ran = false;

module.exports = init;