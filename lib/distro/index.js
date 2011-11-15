require('fs').readdirSync(__dirname).forEach(function(file){
	if (file !== 'index.js' && file.substr(-3) === '.js') {
		exports[file.substring(0, file.length - 3)] = require(__dirname + '/' + file);
	}
});