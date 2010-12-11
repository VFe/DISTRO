[
	'request'
].forEach(function(component){
	exports[component] = require('./' + component);
});