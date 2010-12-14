[
	'request',
	'error'
].forEach(function(component){
	exports[component] = require('./' + component);
});