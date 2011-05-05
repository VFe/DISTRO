(function(){
	var distro = window.distro = window.distro || {};
	distro.init = function(callback){
		if (distro.init.ran) {
			throw new Error("distro.init already called");
		}
		var remaining = distro.init.callees.length;
		if (distro.init.callees.length === 0) {
			process.nextTick(callback);
			return;
		}
		function ownCallback(){
			if (--remaining === 0) {
				callback();
			}
		}
		distro.init.ran = true;
		distro.init.callees.forEach(function(callee){
			callee.init(ownCallback);
		});
	};
	distro.init.add = function(callee){
		if (distro.init.ran) {
			throw new Error("distro.init already called");
		}
		distro.init.callees.push(callee);
	};
	distro.init.callees = [];
	distro.init.ran = false;
	distro.loc = {
		init: function(callback){
			var self = this;
			// $.getJSON handles JSON parse errors silently! This should be replaced with a $.ajax call with appropriate error handling.
			$.getJSON('/localized/en-US.json', function(data){
				self.locale = data;
				callback();
			});
		},
		str: function(pathString){
			var path = pathString.split('.'), pathComponent, current = this.locale;
			
			try {
				while ((pathComponent = path.shift())){
					current = current[pathComponent];
				}
				if (current) {
					return current;
				}
			} catch (e) {}
			return '';
		},
		replacePlaceholders: function(){
			var self = this;
			$('[data-distro-localized-string]').each(function(){
				var $el = $(this), stringPath = $el.attr('data-distro-localized-string'), string = self.str($el.attr('data-distro-localized-string'));
				if (!string) {
					console && console.error && console.error("Couldn't find localized string '" + stringPath + "'");
				}
				$el.text(string);
			});
		}
	};
	distro.init.add({
		init: function(done){
			yepnope({
				test: 'JSON' in window,
				nope: 'http://ajax.cdnjs.com/ajax/libs/json2/20110223/json2.js',
				complete: done
			});
		}
	})
	distro.init.add(distro.loc);
})();