[
	'request',
	'error',
	'Users',
	'Sessions',
	'Bands'
].forEach(function(component){
	exports[component] = require('./' + component);
});