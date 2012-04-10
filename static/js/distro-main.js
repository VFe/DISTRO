Backbone.sync = function(method, model, options){
	if ( ! options) options = {};
	if (!(model && model.url)) { throw new Error("A 'url' property or function must be specified"); }
	var httpMethod = { 'create': 'POST', 'update': 'PUT', 'delete': 'DELETE', 'read'  : 'GET' }[method],
	    data = (method === 'create' || method === 'update') ? model.toJSON() : null;
	
	distro.request((_.isFunction(model.url) ? model.url() : model.url), httpMethod, data, new Hollerback({
		success: options.success,
		failure: options.error
	}));
};


distro.util = {
	pad: function(input, length, character){ var padding = length + 1 - input.length; return (padding > 0 ? Array(length + 1 - input.length).join(character || '0') + input : input); },
	formatTime: function(seconds){ return ((seconds - seconds % 60) / 60).toString() + ':' + distro.util.pad(Math.ceil(seconds % 60).toString(), 2); },
	parseDate: (function(){
		// Based on <http://stackoverflow.com/questions/141348/>
		var dateRegExp = /^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/i;
		return function(str){
			try {
				var match = str.match(dateRegExp);
				if (match[1] && match[2] && match[3]) {
					return {
						m: +match[1],
						d: +match[2],
						y: +match[3]
					}
				}
			} catch(e) {}
			return null;
		}
	})(),
	parseTime: (function(){
		// Based on <http://stackoverflow.com/questions/141348/>
		var timeRexExp = /^(\d+)(?::(\d\d))?\s*(?:(p)m?|am?)?$/i;
		return function(str){
			try {
				var match = str.match(timeRexExp);
				return {
					h: (+match[1] + (match[3] ? 12 : 0)),
					m: +match[2] || 0
				}
			} catch(e) {}
			return null;
		}
	})()
};
distro.SERVER = "/api/";
distro.TITLE = "DISTRO";
distro.global = new Backbone.Model({});
distro.pyramidHead = function(message, retryback, giveupback){
	var composedMessage = distro.loc.str('global.pyramidHead.pre') + '\n' + message;
	if (retryback) {
		if (confirm(composedMessage + '\n\n' + distro.loc.str('global.pyramidHead.tryAgain'))) {
			retryback();
		} else if (giveupback) {
			giveupback();
		}
	} else {
		alert(composedMessage);
	}
};
distro.request = function(path, method, data, hollerback, noRefresh){
	var responseData = null;
	$.ajax({
		url: (distro.SERVER + path),
		data: (data ? JSON.stringify(data) : null),
		type: method,
		contentType: (data ? 'application/json' : undefined),
		success: function(responseDataInternal, status, xhr){
			responseData = responseDataInternal;
			hollerback.succeed(responseData.data, status, xhr);
		},
		error: function(xhr, status, error){
			try{
				responseData = $.parseJSON(xhr.responseText);
			} catch(e) {
				distro.pyramidHead(distro.loc.str('global.serverError'), function(){
					distro.request(path, method, data, hollerback);
				}, function(){
					hollerback.fail(responseData, status, xhr);
				});
				return;
			}
			if (xhr.status === 500) {
				distro.pyramidHead(distro.loc.str('global.serverError'), function(){
					distro.request(path, method, data, hollerback);
				}, function(){
					hollerback.fail(responseData, status, xhr);
				});
			} else {
				hollerback.fail(responseData, status, xhr);
			}
		},
		complete: function(){
			if (responseData && 'userName' in responseData) {
				distro.global.set({user: responseData.userName}, { noRefresh: noRefresh });
			}
		}
	});
};
distro.tutorial = {
	shouldShow: function(stage){
		var tutorial;
		return ! (distro.global.get('user') || ((tutorial = store.get('tutorial')) && tutorial[stage]));
	},
	passed: function(stage){
		var tutorial, $element;
		if ( ! distro.global.get('user')) {
			tutorial = store.get('tutorial') || {};
			tutorial[stage] = true;
			store.set('tutorial', tutorial);
			this.hide(stage);
		}
	},
	show: function(stage){
		var args = Array.prototype.slice.call(arguments, 1);
		if (this.current) {
			this.next = { stage: stage, arguments: args };
		} else if (this.shouldShow(stage)) {
			this.current = stage;
			this.stages[stage].show.apply(this.stages[stage], args);
		}
	},
	hide: function(stage){
		var $element;
		if (($element = this.stages[stage].$element)) {
			delete this.stages[stage].$element;
			$element.fadeOut(function(){
				$(this).remove();
			});
		}
		if (this.current === stage) {
			delete this.current;
		}
		if (this.next) {
			this.show.apply(this, [this.next.stage].concat(this.next.arguments));
			delete this.next;
		}
	},
	stages: {
		findNetwork: {
			show: function(options){
				var after = options && options.after;
				$('#findNetwork').after(this.$element = $(haj(["#findNetworkTutDialog.tutorialDialog" + (after ? '.alternate' : ''), after ? distro.loc.str("tutorial.findNetworkAfter") : distro.loc.str("tutorial.findNetwork")])).hide().fadeIn());
			}
		},
		search: {
			show: function(){
				$('#networkSearch').haj(["#searchTutDialog.tutorialDialog", distro.loc.str("tutorial.search")]);
			}
		},
		subscribe: {
			show: function(network){
				if (network.attributes.name !== 'delicatesteve') {
					$('#landingBox .rightContent').stencil(["#subscribeTutDialog.tutorialDialog", {
						$test: { $handler: function(d){ return d.name === 'northside' } },
						$if: distro.loc.str('tutorial.subscribeNorthside'),
						$else: distro.loc.str('tutorial.subscribe')
					}], network.attributes);
				}
			}
		},
		newMusic: {
			show: function(network){
				this.$element = $(haj(stencil(distro.loc.str("tutorial.newMusic"), {name: network.get('name')})))
				.hide()
				.insertAfter('#subscriptions')
				.fadeIn()
				.delay(8000)
				.fadeOut(180, function(e){
					distro.tutorial.passed('newMusic');
				});
			}
		}
	}
};
distro.FlexiComparator = function(initialSort){
	var constructor = this.constructor;
	function comparator(modelA, modelB){
		return constructor.comparator.call(comparator, modelA, modelB);
	}
	comparator.sort = new Backbone.Model(initialSort);
	return comparator;
};
distro.FlexiComparator.comparator = function (modelA, modelB){
	var key = this.sort.attributes.key,
		ascending = this.sort.attributes.order,
		a = modelA.getForComparison ? modelA.getForComparison(key) : modelA.attributes[key],
		b = modelB.getForComparison ? modelB.getForComparison(key) : modelB.attributes[key];
	if (typeof a === 'string' || typeof b === 'string') {
		a = ('' + a).toLowerCase();
		b = ('' + b).toLowerCase();
	}
	if (a > b) {
		return ascending ? 1 : -1;
	} else if (a < b) {
		return ascending ? -1 : 1;
	} else {
		return 0;
	}
}
distro.Track = Backbone.Model.extend({
	validate: function(attributes){
		if (attributes.release && ! (attributes.release instanceof Date)) {
			attributes.release = new Date(attributes.release);
		}
		if (attributes.date && !(attributes.date instanceof Date)) {
			attributes.date = new Date(attributes.date);
		}
		if (attributes.performance && attributes.performance.date && !(attributes.performance.date instanceof Date)) {
			attributes.performance.date = new Date(attributes.performance.date);
		}
	},
	initialize: function(){
		this.validate(this.attributes);
	},
	getForComparison: function(key){
		var now;
		switch (key) {
		case 'artist':
			return this.attributes.artistNetwork ? this.attributes.artistNetwork.fullname : this.attributes.artist;
			break;
		case 'network':
			return this.attributes.network[0].fullname;
			break;
		case 'performance':
			now = new Date;
			return (this.attributes.performance && this.attributes.performance.date > now) ? now - this.attributes.performance.date : -Number.MAX_VALUE;
			break;
		default:
			return this.attributes[key];
		}
	}
});
distro.library = {
	subscriptions: new (Backbone.Collection.extend({
		url: 'library/subscriptions',
		model: Backbone.Model.extend({
			initialize: function(){
				var self = this;
				function rebuild(){
					distro.library.filteredTracks.rebuild();
				}
				this.bind('change:muted', rebuild);
				this.bind('change:soloed', rebuild);
			}
		}),
		comparator: function(model){
			return model.attributes.name;
		},
		isSubscribed: function(networkName){
			return this.any(function(subscription){ return subscription.attributes.name === networkName; });
		}
	})),
	tracks: new (Backbone.Collection.extend({
		url: 'library/tracks',
		model: distro.Track
	})),
	refresh: function(complete, silent){
		distro.request('library', 'GET', null, new Hollerback({
			success: function(data){
				this.subscriptions.reset(data.subscriptions || []);
				this.tracks.reset(data.tracks || []);
			},
			complete: complete
		}, this), silent);
	}
};
distro.DependentCollection = Backbone.Collection.extend({
	initialize: function(models, options){
		var self = this;
		this.parentCollection = options.parentCollection;
		this.parentCollection.bind('all', function(event, what, options){
			self.rebuild();
		});
	},
	rebuild: function(options){
		this.reset(this.parentCollection.models, options);
	}
});
distro.LibraryCollection = distro.DependentCollection.extend({
	initialize: function(models, options){
		var self = this;
		distro.DependentCollection.prototype.initialize.call(this, models, options);
		this.comparator = new distro.FlexiComparator({ key: 'date', order: 0 });
		this.comparator.sort.bind('change', function(){
			self.sort({ sort: true });
		});
	},
	// Replace sortedIndex and sortBy with ones which uses native-style comparators
	sortedIndex: function(candidate, comparator){
		var i = 0;
		while (i < this.models.length && comparator(this.models[i], candidate) <= 0) {
			i++;
		}
		return i;
	},
	sortBy: function(comparator){
		return this.models.sort(comparator);
	}
});
distro.library.filteredTracks = new (distro.DependentCollection.extend({
	_add: function(track, options){
		if (_.any(track.attributes.network, function(n){
			var subscription = distro.library.subscriptions.get(n.name);
			return ! subscription.get('muted')
				&& ( ! distro.library.subscriptions.any(function(subscription){ return subscription.get('soloed'); }) || subscription.get('soloed') );
		})) {
			Backbone.Collection.prototype._add.call(this, track, options);
		}
	}
}))([], { parentCollection: distro.library.tracks });
distro.library.sortedTracks = new distro.LibraryCollection([], { parentCollection: distro.library.filteredTracks });
distro.library.subscriptionListView = new (Backbone.View.extend({
	el: $('#subscriptionsTable>tbody')[0],
	initialize: function() {
		_.bindAll(this, 'add', 'render');
		this.$el = $(this.el);
		this.$foot = this.$el.children('.filler:first');
		this.collection.bind('add', this.add);
		this.collection.bind('reset', this.render);
	},
	add: function(subscription){
		this.$foot.before((new distro.library.SubscriptionView({ model: subscription })).el);
	},
	render: function(){
		this.$el.empty().append(this.$foot);
		this.collection.each(this.add);
	}
}))({ collection: distro.library.subscriptions });
distro.library.SubscriptionView = Backbone.View.extend({
	tagName: 'tr',
	template: ['%td',
		['.subscription', { 'class': { $join: [
			{ $test: { $key: 'admin' }, $if: 'admin' },
			{ $test: { $key: 'muted' }, $if: 'muted' },
			{ $test: { $key: 'soloed' }, $if: 'soloed' }
		], $separator: ' ' } },
			['.subscriptionControls',
				{ $test: { $key: 'admin' }, $if: ['%a.admin', {
					title: distro.loc.stencil('chrome.hover.admin'),
					href: { $join: [ '#/manage/', { $key: 'id', $handler: encodeURIComponent } ] }
				}, '\u266a'] },
				['.mute', {title: distro.loc.stencil('chrome.hover.mute')}, 'M'],
				['.solo', {title: distro.loc.stencil('chrome.hover.solo')},'S']
			],
			['%a', { href: { $join: ['#/', { $key: 'name' }] } }, { $key: 'fullname' }]
		]
	],
	events: {
		"click .subscriptionControls>.mute": "mute",
		"click .subscriptionControls>.solo": "solo",
	},
	initialize: function() {
		this.model.bind('change', this.render, this);
		this.model.view = this;
		this.render();
	},
	render: function(){
		$(this.el).empty().stencil(this.template, this.model.toJSON());
	},
	mute: function(){
		this.model.set({ muted: ! this.model.attributes.muted });
	},
	solo: function(){
		this.model.set({ soloed: ! this.model.attributes.soloed });
	}
});
distro.library.SubscriptionAdminView = Backbone.View.extend({
	tagName: 'tr',
	template: ['%td',
		['.subscription.admin.administrating',
			['.subscriptionControls',
				['%div.upload', {
					title: distro.loc.stencil('tml.uploadHover')
				}, 'U'],
				['%a.admin', {
					title: distro.loc.stencil('chrome.hover.admin'),
					href: '#'
				}, '\u266a']
			],
			['%a', { href: { $join: ['#/', { $key: 'name' }] } }, { $key: 'fullname' }]
		]
	],
	events: {
		"submit": "addTrack",
		"change #broadcastNow, #broadcastLater": "enableTimes"
	},
	initialize: function() {
		this.model.bind('change', this.render, this);
		this.render();
	},
	destroy: function(){
		this.model.unbind('change', this.render);
	},
	render: function(){
		$(this.el).empty().stencil(this.template, this.model.toJSON());
	},
	addTrack: function(e){
		var form = e.target, elements = form.elements, broadcast, broadcastDate, broadcastTime;
			newTrack = new distro.Track({
				name: elements.name.value,
				artist: elements.artist.value,
				network: { name: this.model.get('name') },
			});
		if (elements.broadcastLater.checked) {
			if ( ! (broadcastDate = distro.util.parseDate(elements.broadcastDate.value))) {
				alert('I don\'t understand that date.');
				elements.broadcastDate.focus();
				return false;
			}
			if ( ! (broadcastTime = distro.util.parseTime(elements.broadcastTime.value))) {
				alert('I don\'t understand that time.');
				elements.broadcastTime.focus();
				return false;
			}
			broadcast = new Date(broadcastDate.y, broadcastDate.m, broadcastDate.d, broadcastTime.h, broadcastTime.m);
		} else {
			broadcast = new Date;
		}
		newTrack.set({ release: broadcast });
		if (elements.onDeck.checked) {
			newTrack.set({ onDeck: [ { start: broadcast } ] });
		}
		distro.library.tracks.create(newTrack, {
			success: function(model){
				debugger;
				alert('success');
			},
			error: function(model, err){
				alert('error: ' + err.errorMessage);
			}
		})
		return false;
	},
	enableTimes: function(e){
		if ($('#broadcastLater')[0].checked) {
			$('#broadcastDate, #broadcastTime').removeAttr('disabled');
		} else {
			$('#broadcastDate, #broadcastTime').attr('disabled', 'disabled');
		}
	}
});
distro.library.trackListHeaderView = new (Backbone.View.extend({
	el: $('#musicTableHead>thead')[0],
	initialize: function() {
		_.bindAll(this, 'handle', 'render');
		this.$el = $(this.el);
		this.currentSort = {$el:this.$el.find('th[data-sort=date]')};
		this.lastSorts = {};
		this.model.bind('change', this.render);
		this.$el.bind('selectstart', function(e){
			e.preventDefault();
		});
		this.$el.delegate('th', 'click', this.handle);
	},
	handle: function(e){
		var key, $target = $(e.target).closest('th');
		if(this.currentSort.$el && $target[0] === this.currentSort.$el[0]){
			this.model.set({ order: (this.lastSorts[this.model.attributes.key] = this.model.attributes.order ? 0 : 1) });
		} else {
			key = $target.attr('data-sort');
			this.model.set({
				key: key,
				order: (key in this.lastSorts) ? this.lastSorts[key] : this.lastSorts[key] = ($target.attr('data-sort-direction') === 'descending' ? 0 : 1)
			});
		}
	},
	render: function(){
		if (this.currentSort.$el) {
			this.currentSort.$el.removeClass('ascending descending');
		}
		this.currentSort.$el = this.$el.find('[data-sort='+this.model.attributes.key+']')
		 .addClass(this.model.attributes.order ? 'ascending' : 'descending');
	}
}))({ model: distro.library.sortedTracks.comparator.sort });
distro.library.TrackView = Backbone.View.extend({
	tagName: 'tr',
	template: [
		['%td', { $key: 'name' }],
		['%td', { $key: 'time', $template: { $test: { $key: '' }, $if: { $handler: distro.util.formatTime }, $else: ''  } }],
		['%td', { $test: { $key: 'artistNetwork' }, $if: { $key: 'artistNetwork', $template: ['%a', { href: { $join: ['#/', { $key: 'name' }] } }, { $key: 'fullname' }] }, $else: { $key: 'artist' } }],
		{ $test: { $key: 'performance' }, $if: { $test: { $handler: function(track){ return track.performance.date > new Date; } }, $if:
		{ $key: 'performance', $template: ['%td', { 'class': 'event' }, ['%div', { 'class': { $join: ['event', { $key: 'date', $handler: function(date){
			var diff = date - (new Date);
			if (diff < 0) {
				return '';
			} else if (diff < 86400000) { // 24h
				return 'soonest';
			} else if (diff < 172800000) { // 48h
				return 'sooner';
			} else if (diff < 604800000) { // 1w
				return 'soon';
			} else {
				return 'someday';
			}
		} }], $separator: ' ' } },
			['.eventDetails',
				['.perfDate', {$key:'date', $handler:
					function(data){
						if(!data) { return null; }
						return (data.toLocaleDateString() + '\n' + data.toLocaleTimeString());
					}
				}], ['.perfVenue', {$key:'venue', $template:[
					['%a', {href: {$join:['#/', {$key:'name'}]}, title:{$key:'fullname'}}, '^', {$key:'name'}, '^ '],
					['%span.cityState', {$key:'citystate'}]
				]}]
			],
			{$test: {$key:'extLink'}, $if: ['%a.eventLink', {target:'_blank', href:{$key:'extLink'}}]}
		]] }, $else: ['%td'] }, $else: ['%td'] },
		['%td.fresh', { $test: { $key: 'date' }, $if: ['.fresh', { 'class': { $key: 'date', $handler: function(date){
			var diff = (new Date) - date;
			if (diff < 0) {
				return '';
			} else if (diff < 345600000) { // 4d
				return 'indigo ' + Math.floor(diff / 86400000).toString();
			} else if (diff < 691200000) { // 1w + 1d
				return 'violet ' + Math.floor(diff / 86400000).toString();
			} else {
				return '';
			}
		} } }] }],
		['%td', ['%ul.inlineList', { $key: 'network', $children: ['%li', ['%a', { href: { $join: ['#/', { $key: 'name' } ] } }, { $key: 'fullname' } ]]}]]
	],
	events: {
		"dblclick": "play",
		"mousedown": "select"
	},
	initialize: function(options) {
		_.bindAll(this, 'setPlaying', 'play');
		this.model.bind('change', function(){ this.render(); }, this);
		this.model.bind('reset', this.render);
		this.model.view = this;
		this.$el = $(this.el);
		this.parent = options.parent;
		this.render();
	},
	render: function(){
		this.$el.empty().stencil(this.template, this.model.toJSON());
	},
	setPlaying: function(playing){
		this.$el[playing ? 'addClass' : 'removeClass']('playing');
	},
	play: function(){
		distro.player.play(this.model);
	},
	setSelected: function(selected){
		this.$el[selected ? 'addClass' : 'removeClass']('selected');
	},
	select: function(e){
		if (e.target.tagName === 'A') { return; }
		this.parent.setSelected((e.metaKey && this.parent.selectedTrack === this.model) ? null : this.model);
		e.preventDefault();
	},
	show: function(highlight){
		$.scrollIntoView(this.el, document.getElementById('musicTableBodyContainer'));
		if (highlight) {
			$(this.el).css('backgroundColor', '#F6FF98').delay(200).queue(function(n){ $(this).css('backgroundColor', ''); n(); });
		}
	}
});
distro.TrackEditView = Backbone.View.extend({
	template: ["%form#editTrack",
		["%h1", "Edit Track"],
		["%ul",
			// ["%li",
			// 	["#uploadFile",
			// 		["%input", {"type": "file", "name": "trackFile"}],
			// 		["%div", "Browse"]
			// 	],
			// 	["%h2", "Locate Audio"]
			// ],
			["%li", ["%h2", "Enter Track Information"],
				["%input", {"type": "text", "name": "name", "placeholder": "Track Name", value: { $key: 'name' } }],
				["%input", {"type": "text", "name": "artist", "placeholder": "Artist Name", value: { $test: { $key: 'artistNetwork' }, $if: { $key: 'artistNetwork', $template: { $key: 'fullname' } }, $else: { $key: 'artist' } }, }]
			],
			// ["%li", ["%h2", "Select Broadcast Option"],
			// 	['%input#broadcastNow', { type: "radio", "name": "broadcastType", value: "now", checked: 'checked' }], ['%label', { for: "broadcastNow"}, "Broadcast now"],
			// 	['%input#onDeck', { type: "checkbox", "name": "onDeck" }], ['%label', { for: "onDeck"}, "On Deck"], ['%br'],
			// 	['%input#broadcastLater', { type: "radio", "name": "broadcastType", value: "later" }], ['%label', { for: "broadcastLater"}, "Broadcast later"], ['%br'],
			// 	["%input#broadcastDate", {"type": "text", "name": "broadcastDate", "placeholder": "MM/DD/YYYY", disabled: 'disabled' }], ' ',
			// 	["%input#broadcastTime", {"type": "text", "name": "broadcastTime", "placeholder": "HH:MM pm", disabled: 'disabled' }]
			// ],
			// ["%li", ["%h2", "Tag w/ Event"]]
		],
		["%button#editTrackSaveButton", {"type": "submit"}, "Save"]
	],
	initialize: function(){
		var self = this,
			el = this.el = haj(stencil(this.template, this.model.attributes)),
			formElements = el.elements;
			if ( ! this.model.id) {
				formElements.editTrackSaveButton.setAttribute('disabled');
			}
		$(el).submit(function(e){
			e.preventDefault();
			self.trigger('save', { name: formElements.name.value, artist: formElements.artist.value });
		});
		this.model.bind('change', function(model){
			if (model.hasChanged('name') && ! formElements.name.value) {
				formElements.name.value = model.get('name');
			}
			if ((model.hasChanged('artist') || model.hasChanged('artistNetwork')) && ! formElements.artist.value) {
				var artistNetwork = model.get('artistNetwork');
				formElements.artist.value = artistNetwork ? artistNetwork.fullname : model.get('artist');
			}
			if (model.hasChanged('id')) {
				formElements.editTrackSaveButton[model.id ? 'removeAttribute' : 'setAttribute']('disabled');
			}
		});
	},
	destroy: function(){
		$(this.el).remove();
	}
});
distro.LibraryView = Backbone.View.extend({
	TrackView: distro.library.TrackView,
	initialize: function() {
		var self = this;
		this.viewCache = {};
		_.bindAll(this, 'add', 'render');
		this.$el = $(this.el);
		this.$foot = this.$el.children('.filler:first');
		this.collection.bind('reset', function(){
			self.oldViewCache = self.viewCache;
			self.viewCache = {};
			self.render();
			delete self.oldViewCache;
			if (self.selectedTrack && ! self.collection.getByCid(self.selectedTrack.cid)) {
				self.setSelected(null);
			}
		});
		distro.library.subscriptions.bind('add', function(){
			distro.library.tracks.fetch();
		});
		this.$el.delegate('.filler', 'mousedown', function(){
			self.setSelected(null);
		});
	},
	add: function(track){
		var view;
		if (this.oldViewCache && (view = this.oldViewCache[track.cid])) {
			view.delegateEvents();
		} else {
			view = (new this.TrackView({ model: track, parent: this }));
		}
		this.viewCache[track.cid] = view;
		this.$foot.before(view.el);
	},
	render: function(){
		this.$el.empty().append(this.$foot);
		this.collection.each(this.add);
	},
	setPlaying: function(track){
		if (this.playingTrack) {
			this.playingTrack.view.setPlaying(false);
		}
		if (track) {
			track.view.setPlaying(true);
		}
		this.playingTrack = track;
	},
	setSelected: function(track){
		this.prevSelect = this.selectedTrack;
		if(this.selectedTrack){
			this.selectedTrack.view.setSelected(false);
		}
		if(track) {
			track.view.setSelected(true);
			track.view.show();
		}
		this.selectedTrack = track;
	},
	relativeTrack: function(shift){
		return this.playingTrack && this.collection.models[this.collection.indexOf(this.playingTrack) + shift];
	},
	relativeSelection: function(shift){
		return this.selectedTrack && this.collection.models[this.collection.indexOf(this.selectedTrack) + shift];
	}
});
distro.library.trackListView = new distro.LibraryView({
	el: $('#musicTableBody>tbody')[0],
	collection: distro.library.sortedTracks
});

distro.Slider = function (element, callback){
	var self = this,
	    $slider = $(element),
	    $channel = $slider.find('.channel'),
	    $backing = $slider.find('.backing'),
	    $handle = $slider.find('.handle');
	
	this.position = 0;
	
	this.setPosition = function(position, actuated){
		this.position = Math.min(Math.max(position, 0), 1);
		$backing[0].style.width = this.position * 100 + '%';
		if (actuated === true) {
			callback.call(this, this.position);
		}
	};
	this.enable = function(){
		$slider.addClass('enabled');
	};
	this.disable = function(){
		$slider.removeClass('enabled');
	};
	$slider.mousedown(function(e){
		if (!$slider.hasClass('enabled')) { return false; }
		var $document = $(document), left = $backing.offset().left, width = $channel.width();
		function move(e){
			self.setPosition(Math.min(Math.max(e.pageX - left - 6, 0), width) / width, true);
		}
		$document.mousemove(move);
		$document.mouseup(function(){
			$document.unbind('mousemove', move);
		});
		move(e);
		return false;
	});
};

// Simple success/failure callback abstraction layer
function Hollerback(callbacks, context){
	this.callbacks = callbacks;
	this.context = context;
}
Hollerback.prototype.succeed = function(){
	this.callbacks.success && this.callbacks.success.apply(this.context, arguments);
	this.callbacks.complete && this.callbacks.complete.apply(this.context, arguments);
};
Hollerback.prototype.fail = function(){
	this.callbacks.failure && this.callbacks.failure.apply(this.context, arguments);
	this.callbacks.complete && this.callbacks.complete.apply(this.context, arguments);
};

// Bind user menu
(function(){
	var $account = $('#account'),
	    $accountName = $('#accountName');
	distro.global.bind('change:user', function(model, user, options){
		if (user) {
			$accountName.text(user);
			$account.addClass('loggedIn');
		} else {
			$account.removeClass('loggedIn');
		}
		if ( ! (options && options.noRefresh)) {
			distro.library.refresh();
		}
	});
})();

distro.lightbox = new (function(){
	function Lightbox(){
		var self = this;
		this.content = [];
		this.$lightbox = $('#lightbox');
		this.$contentWrapper = $('#lightboxWrapper');
		this.$contentWrapper.delegate('.close.button', 'click', function(){
			self.hide();
		});
		this.$lightbox.click(function(e){
			self.hide();
			return false;
		});
		this.$contentWrapper.click(function(e){
			if (e.target == self.$contentWrapper[0]) {
				self.hide();
				return false;
			}
		});
		$(document).keyup(function(e){
			if(e.keyCode == 27){
				self.hide();
				return false;
			}
		});

		$(document).bind('keyup', function(e){
			if(e.keyCode == 107 || e.keyCode == 187){
				if(document.location.hash == ""){
					document.location.hash = "/find";
				}
			}
		});
	}
	Lightbox.prototype.push = function(content){
		this.content.push(content);
		this.show();
	};
	Lightbox.prototype.show = function(content){
		var self = this, old = this.content[this.content.length - 1];
		if (content) {
			this.content = [content];
		} else {
			if (old) {
				content = old;
			} else {
				return;
			}
		}
		this.$contentWrapper.fadeOut(200).queue(function(next){
			var $content;
			self.hideContent(old);
			$content = $('<div>', { 'class': 'lightboxContent' });
			self.$contentWrapper.html($content);
			content.show($content, self);
			Backbone.history.navigate('/' + content.name);
			document.title = content.longName ? (content.longName + ' - ' + distro.TITLE) : distro.TITLE;
			next();
		}).fadeIn(200);
		this.$lightbox.fadeIn(200);
		distro.tutorial.hide('findNetwork');
	};
	Lightbox.prototype.hide = function(name){
		this.content.splice(0, this.content.length - 1);
		this.pop(name);
	}
	Lightbox.prototype.pop = function(name){
		var self = this, old;
		if ((!name || (this.content.length && name === this.content[this.content.length - 1].name)) && (old = this.content.pop())) {
			if (this.content.length) {
				this.show();
			} else {
				this.$lightbox.fadeOut(200);
				this.$contentWrapper.fadeOut(200, function(){
					self.hideContent(old);
				});
				Backbone.history.navigate(distro.topPath || '');
				document.title = distro.TITLE;
				distro.tutorial.show('findNetwork', { after: true });
			}
			return old;
		}
	};
	Lightbox.prototype.hideContent = function(content){
		if (content) {
			content.hide && content.hide(this);
		}
		this.$contentWrapper.empty();
	};
	return Lightbox;
}())();

distro.tml = {
	TrackView: distro.library.TrackView.extend({
		template: [
			['%td', { $test: { $key: 'name' }, $if: { $key: 'name' }, $else: [ '%span.placeholder', distro.loc.stencil('library.untitled') ] } ],
			['%td', { $key: 'time', $template: { $test: { $key: '' }, $if: { $handler: distro.util.formatTime }, $else: ''  } }],
			['%td', { $test: { $key: 'artistNetwork' }, $if: { $key: 'artistNetwork', $template: ['%a', { href: { $join: ['#/', { $key: 'name' }] } }, { $key: 'fullname' }] }, $else: { $key: 'artist' } }],
			{ $test: { $key: 'performance' }, $if: { $test: { $handler: function(track){ return track.performance.date > new Date; } }, $if:
			{ $key: 'performance', $template: ['%td', { 'class': 'event' }, ['%div', { 'class': { $join: ['event', { $key: 'date', $handler: function(date){
				var diff = date - (new Date);
				if (diff < 0) {
					return '';
				} else if (diff < 86400000) { // 24h
					return 'soonest';
				} else if (diff < 172800000) { // 48h
					return 'sooner';
				} else if (diff < 604800000) { // 1w
					return 'soon';
				} else {
					return 'someday';
				}
			} }], $separator: ' ' } },
				['.eventDetails',
					['.perfDate', {$key:'date', $handler:
						function(data){
							if(!data) { return null; }
							return (data.toLocaleDateString() + '\n' + data.toLocaleTimeString());
						}
					}], ['.perfVenue', {$key:'venue', $template:[
						['%a', {href: {$join:['#/', {$key:'name'}]}, title:{$key:'fullname'}}, '^', {$key:'name'}, '^ '],
						['%span.cityState', {$key:'citystate'}]
					]}]
				],
				{$test: {$key:'extLink'}, $if: ['%a.eventLink', {target:'_blank', href:{$key:'extLink'}}]}
			]] }, $else: ['%td'] }, $else: ['%td'] },
			['%td', { $test: { $key: 'status' },
				$if: { $key: 'status' },
				$else: { $test: { $key: 'release' },
					$if: { $key: 'release', $handler: function(releaseDate){
						// More stencil abuse
						return stencil({ $join: distro.loc.str('tml.status.broadcast') }, {
							month: releaseDate.getMonth(),
							day: releaseDate.getDate(),
							year: releaseDate.getFullYear(),
							hour: releaseDate.getHours(),
							minute: distro.util.pad(releaseDate.getMinutes().toString(), 2)
						});
					} },
					$else: ['%a.broadcastNow', distro.loc.stencil('tml.status.broadcastNow')]
				}
			}]
		],
		events: _.extend({
			"click .broadcastNow": "broadcastNow"
		}, distro.library.TrackView.prototype.events),
		initialize: function(){
			distro.library.TrackView.prototype.initialize.apply(this, arguments);
			this.model.bind('uploadProgress', this.uploadProgress, this);
			this.model.bind('uploadError', this.uploadError, this);
		},
		uploadProgress: function(model, loaded, total){
			// STENCIL ABUSE
			this.render(model, loaded === total ? distro.loc.str('tml.status.processing') : stencil({ $join: distro.loc.str('tml.status.uploading') }, { percent: Math.floor(loaded / total * 100) }));
		},
		uploadError: function(model, loaded, total){
			this.render(model, distro.loc.str('tml.status.error'));
		},
		broadcastNow: function(){
			alert('broadcast now: ' + this.model.get('name'));
		},
		render: function(model, status){
			var data = this.model.toJSON();;
			if (status) {
				data = _.extend(data, { status: status });
			}
			this.$el.empty().stencil(this.template, data);
		}
	}),
	tracks: new (Backbone.Collection.extend({ model: distro.Track })),
	uploadingTracks: {},
	$subscriptionContainer: $('#tmlSubscriptionContainer'),
	show: function(network){
		var self = this;
		this.reset();
		this.tracks.url = 'networks/' + encodeURIComponent(network.get('name')) + '/tracks';
		this.tracks.fetch();
		network.set({ administrating: true });
		this.network = network;
		$(document.body).addClass('TML');
		this.$subscriptionContainer.append((this.subscriptionView = new distro.library.SubscriptionAdminView({ model: network })).el);
		new qq.FileUploaderBasic({
	        button: $(this.subscriptionView.el).find('.upload:first')[0],
	        action: distro.SERVER + this.tracks.url,
			onSubmit: function(id, fileName){
				var newTrack = new distro.Track;
				self.tracks.add(newTrack);
				if (self.libraryView.setSelected(newTrack)){
					self.uploadingTracks[id] = newTrack;
				} else {
					self.tracks.remove(newTrack);
					return false;
				};
			},
			onProgress: function(id, fileName, loaded, total){
				self.uploadingTracks[id].trigger('uploadProgress', self.uploadingTracks[id], loaded, total);
			},
			showMessage: function(error){},
			onComplete: function(id, fileName, responseJSON){
				var uploadingTrack = self.uploadingTracks[id];
				if (responseJSON.error) {
					uploadingTrack.set({ locked: true });
					if (self.libraryView.selectedTrack === uploadingTrack) {
						self.libraryView.setSelected(null);
					}
					uploadingTrack.trigger('uploadError', uploadingTrack);
				} else {
					uploadingTrack.set(responseJSON.data);
				}
				delete uploadingTrack;
			},
			onCancel: function(id, fileName){
				// TODO
				console.log('cancel', arguments);
				delete self.uploadingTracks[id];
			}
	    });
	},
	hide: function(){
		this.reset();
		$(document.body).removeClass('TML');
		if (this.network) {
			this.network.set({ administrating: false });
			delete this.network;
			this.subscriptionView.destroy();
			delete this.subscriptionView;
		}
	},
	reset: function(){
		this.$subscriptionContainer.empty();
		this.tracks.reset([]);
	}
};
distro.tml.libraryView = new (distro.LibraryView.extend({
	TrackView: distro.tml.TrackView,
	setSelected: function(track){
		var trackEditor;
		if (track && track.get('locked')) {
			return false;
		}
		distro.LibraryView.prototype.setSelected.call(this, track);
		if (distro.tml.trackEditor) {
			distro.tml.trackEditor.destroy();
			delete distro.tml.trackEditor;
		}
		if (track) {
			trackEditor = new distro.TrackEditView({ model: track });
			trackEditor.bind('save', function(attributes){
				track.save(attributes, {
					success: function(){
						var libraryTrack = distro.library.tracks.get(track.id);
						if (libraryTrack) {
							libraryTrack.set(track.toJSON());
						}
					},
					error: function(error){
						alert(distro.loc.str("tml.saveError"));
					}
				});
			});
			$('#infoBox').append(trackEditor.el);
			distro.tml.trackEditor = trackEditor;
			return true;
		}
	}
}))({
	el: $('#tmlBody>tbody')[0],
	collection: new distro.LibraryCollection([], { parentCollection: distro.tml.tracks })
});

// Login/registration lightbox
(function(){
	distro.global.bind('change:user', function(model, user){
		if (user) {
			distro.lightbox.pop('login');
		}
	});
})();

// Music player
distro.player = new (function(){
	function Player(){
		// SoundManager initialization
		soundManager.debugMode = false;
		soundManager.url = '/soundmanager/';
		soundManager.flashVersion = 9;
		soundManager.useFlashBlock = true;
		soundManager.useHTML5Audio = true;
		soundManager.onload = _.bind(function() {
			if (this.heldTrack) {
				this.play(this.heldTrack);
				delete this.heldTrack;
			}
		}, this);
	
		var player = this,
		    currentTime = document.getElementById('currentTime').firstChild,
		    totalTime   = document.getElementById('totalTime').firstChild,
			slider = new distro.Slider($('#scrubber'), function(position, actuated){
				if (player.current) {
					player.current.setPosition(position * (player.loaded ? player.current.duration : player.current.durationEstimate));
				}
			});
	
		function onplay(){
			player.$transport.addClass('enabled playing');
			slider.enable();
		}
		function onpause(){
			player.$transport.removeClass('playing');
		}
		function onresume(){
			player.$transport.addClass('playing');
		}
		function onstop(){
			player.$transport.removeClass('enabled playing');
			slider.setPosition(0);
			slider.disable();
			currentTime.data = totalTime.data = '0:00';
		}
		function onfinish(){
			onstop();
			player.next();
		}
		function onwhileplaying(){
			currentTime.data = distro.util.formatTime(this.position/1000);
			updateSlider();
		}
		function onwhileloading(){
			totalTime.data = distro.util.formatTime(this.durationEstimate/1000);
			updateSlider();
		}
		function updateSlider(){
			slider.setPosition(player.current.position/(player.loaded ? player.current.duration : player.current.durationEstimate));
		}
		this.play = function(track){
			var artistNetwork = track.get('artistNetwork'),
				artistNetworkName = artistNetwork && artistNetwork.name,
				networkWithFile = track.get('networkWithFile');
			mpq.push([
				"track",
				"trackPlay",
				{
					"user": distro.global.get('user'),
					"title": track.get('name'),
					"artist": track.get('artist'),
					"artistNetwork": artistNetworkName
				}
			]);
			if (!soundManager.ok()) {
				this.heldTrack = track;
				return;
			}
			if (this.current) {
				this.stop();
			}
			if (track && track.attributes.network && track.attributes.filename) {
				this.loaded = false;
				this.current = soundManager.createSound({
					id: "track",
					url: "//distro-music.s3.amazonaws.com/" + ( networkWithFile
							? encodeURIComponent(track.get('networkWithFile').name) + "/" + encodeURIComponent(track.get('filename')) + ".mp3"
							: track.get('filename')
						),
					onplay: onplay,
					onresume: onplay,
					onpause: onpause,
					onstop: onstop,
					onfinish: onfinish,
					whileplaying: _.throttle(onwhileplaying, 500),
					whileloading: _.throttle(onwhileloading, 500),
					onload: function(success){
						if (success) {
							this.loaded = true;
							totalTime.data = distro.util.formatTime(this.duration/1000);
							updateSlider();
						} else {
							alert(distro.loc.str('player.errors.loadFail'));
							player.stop();
						}
					}
				}).play();
				distro.library.trackListView.setPlaying(track);
			}
		};
	
		this.$transport = $('#transport');
		$('#pauseButton').click(function(){
			if (player.current) {
				player.current.pause();
			}
		});
		$('#playButton').click(function(){
			if (player.current) {
				player.current.play();
			} else {
				player.play(distro.library.sortedTracks.models[0]);
			}
		});
		$('#skipBackButton').click(function(){
			if (player.current) {
				if (player.current.position > 1000) {
					player.current.setPosition(0);
				} else {
					player.previous();
				}
			}
		});
		$('#skipForwardButton').click(function(){
			if (player.current) {
				player.next();
			}
		});
	}
	Player.prototype.next = function(){
		if (this.current) {
			this.play(distro.library.trackListView.relativeTrack(1));
		}
	};
	Player.prototype.previous = function(){
		if (this.current) {
			this.play(distro.library.trackListView.relativeTrack(-1));
		}
	};
	Player.prototype.stop = function(){
		if (this.current) {
			this.current.stop();
			this.current.destruct();
			this.current = null;
			distro.library.trackListView.setPlaying(null);
		}
	};
	return Player;
}())();

distro.LandingPage = Backbone.Model.extend({
	initialize: function(opts){
		this.url = 'networks/' + encodeURIComponent(opts.name);
	},
	set: function(attrs){
		if (Backbone.Model.prototype.set.apply(this, arguments)) {
			if (attrs && 'name' in attrs) this.name = this.attributes.name;
		}
		return this;
	}
});

distro.loadLandingPage = function(name, callback){
	(new distro.LandingPage({name: name})).fetch({
		success: function(model){
			distro.lightbox.show({
				name: model.name,
				longName: model.get('fullname'),
				show: function($content){
					var $subscribeButton,
					    subscribed = distro.library.subscriptions.isSubscribed(model.name);
					$content.attr('id', 'landingBox');
					$content.stencil(["%form", {},
						[".lightboxHeader",
							["%span.close.button", {}, "x"],
							["%h1","^", { $key: 'name' }, "^"]
						],
						[".contentBox",
							[".content.leftContent",
								["%img.photo",{src: {$join: ["http://distro-images.s3.amazonaws.com/",{$key:"name"},".jpg"]}, width:"500", height:"335"}],
								["%span.caption",{style:"color: rgb(119, 119, 119);"},
									{$test: {$key:"photoCred"}, $if:["%p", {style:"margin-top:0px; margin-right: 0.25em; margin-bottom: 0px; margin-left:0px; text-align: right; float:right;"}, "Photo by ",
										["%a", {$test:{$key:"photoCredURL"}, $if:{target:"_blank", href:{$key: "photoCredURL"}}, style:"text-decoration:none;"}, { $key: "photoCred"}]
									]},
									["#location", {$key: "location", $template:[
										["%p",{style:"margin-top: 0.25em; margin-right: 0em; margin-bottom: 0em; margin-left: 0em;"}, { $key: "streetAddress"}],
										["%p",{style:"margin-top: 0.25em; margin-right: 0em; margin-bottom: 0.25em; margin-left: 0em;"}, { $key: "citystate"}, " ", {$key:"zip"}],
										{$test: {$key:"country"}, $if:["%p",{style:"margin-top:0px;"}, { $key: "country"}]}
									]},
									{$test: {$key:"map"}, $if:["%a#mapLink", {target:"_blank", href:{$key:"map"}}, "MAP"]}]
								],
								["%span#artist",{style:"font-size:36px;"},
									["%p",{style:"margin-top: 0.17em; margin-right: 0px; margin-bottom: 0px; margin-left: 0px;"}, { $key: "fullname"}]
								]
							],
							[".rightContent",
								{$test: {$or: [{$key: 'presence'}, {$key:'email'}]}, $if: [".presence",
									["%ul.presence", {$test: {$key: "email"}, $if:["%li.email", ["%a", {target:"_blank"}],
										["%ul.emailList", {style:"display:none; position: absolute; padding: 0 .5em; background-color: white; list-style:none;"}, {$key: "email", $children:
											["%li", {'class': {$key:"."}, style:"margin: 0px 1em;"},
												["%a", {href: {$join: ["mailto:",{$key:""}]}, title:{$key:""}}, {$key:"."}]]}]]}, { $key: 'presence', $children: [
										['%li', { 'class': { $key: 'name' } }, ['%a', { target:"_blank", href: { $key: 'url' } }]]
									] }]
								]},
								["%div", {style:"height: 1em; background-color: #212121;"}],
								[".content", {$test: {$key: "calendarGoogle"}, $if:["%iframe#calFrame", {frameborder: "0", src: {$join: ["http://google.com/",{$key:"calendarGoogle"},"&showTitle=0&&showNav=0&&showDate=0&&showPrint=0&&showTabs=0&&showCalendars=0&&showTz=0&&mode=AGENDA&&height=300&&wkst=1&&bgcolor=%23ffffff&&color=%23000000"]}}]}],
								[".subscribeButton", { 'class': { $key:'', $handler: function(){ return subscribed ? 'disabled' : ''; } }, $:function(){ $subscribeButton = $(this) }}, [".icon"], [".label", distro.loc.str('networks.subscribe')]]
							]
						],
						{ $test: { $key: 'admin' }, $if: [".ownerbox",
							['%h1', 'You own this network! ', [ '%a', { href: "mailto:hello@distro.fm" }, 'Contact us' ], ' to make changes to its landing page.'],
						] }
					], model.attributes);
					if ( ! subscribed) {
						distro.tutorial.show('subscribe', model);
					}
					$subscribeButton.click(function(){
						if (!subscribed) {
							mpq.push(['track', 'subscribe', {'name': model.get('name'), 'fullname': model.get('fullname'), 'user': distro.global.get('user')}]);
							distro.tutorial.passed('subscribe');
							distro.library.subscriptions.create({ name:model.name, fullname: model.get('fullname') }, {
								success: function(){
									subscribed = true;
									$subscribeButton.addClass('disabled');
									distro.tutorial.show('newMusic', model);
									distro.lightbox.pop();
								}
							});
						}
					});
					$('.email').click(function(){$('.emailList').toggle()});
					if (this.willSubscribe) { // If we're returning from logging in
						if (distro.global.get('user')) {
							setTimeout(function(){
								$subscribeButton.click();
							}, 800);
						}
					}
					mpq.push(['track', 'visitNetwork', {'network': model.name, 'user': distro.global.get('user')}]);
				},
				hide: function(){
					distro.tutorial.hide('subscribe');
				}
			});
			callback(model);
		},
		error: function(){
			alert("There's no network by this name");
			callback(null);
		}
	});
};

distro.loadAboutPage =function(pageName, data){
	distro.lightbox.show({
		name: 'about/' + pageName,
		longName: data && data[pageName] && data[pageName].title,
		show: function($content){
			$content.attr('id', 'aboutBox');
			$content.stencil(["%form", {},
				[".lightboxHeader",
					["%span.close.button", {}, "x"],
					["%h1", {$key: pageName, $template: {$key: 'title'}}]
				],
				[".contentBox",
					[".content.leftContent",
						["%img.photo",{src: "http://distro-static.s3.amazonaws.com/TRDD/TRDD.png", width:"510", height:"450"}]
					],
					[".rightContent",
						["%ul.aboutIcons",
							{ $key: 'navBlocks', $children: [
								['%li', { 'class': { $key: 'name' }, 'title': {$key: 'name'}}, ['%a', { href: { $key: 'url' } }]]
							]}
						],
						[".content", {$test: {$key: pageName}, $if: {$key: pageName, $template: ['%div', ['%h1', {$key: 'title'}], {$key: 'content', $handler: function(data){ return $('<div>').html(data).contents().toArray(); }}]} }]
					]
				]
			], data);
		}
	});
	
};

distro.AboutPage = function(name, callback){
	if(typeof callback !== 'function') callback = function(){};
	if(typeof distro.aboutData !== 'object'){
		$.getJSON('/about.json', function(data){
			distro.aboutData = data;
			distro.loadAboutPage(name, distro.aboutData);
			callback(data);
		});
	} else {
		distro.loadAboutPage(name, distro.aboutData);
		callback(distro.aboutData);
	}
};

distro.Router = Backbone.Router.extend({
	routes: {
		"": "blank",
		"/find": "find",
		"/login": "login",
		"/about/:page": "about",
		"/action": "action",
		"/manage": "fourOhFour",
		"/manage/:network": "manage",
		"/:network": "network",
		"/*target": "fourOhFour",
		"*target": "bounce"
	},
	blank: function(){
		distro.lightbox.hide();
		distro.tml.hide();
		distro.topPath = '';
		distro.tutorial.show('findNetwork');
	},
	network: function(name){
		if (!name) {
			window.location.hash = '';
			return;
		}
		distro.loadLandingPage(name, function(model){
			if (!model) {
				window.location.hash = '';
			}
		});
	},
	about: function(page){
		if (!page) {
			window.location.hash = '/about/about';
			return;
		}
		distro.AboutPage(page, function(model){
			if(!model) {
				window.location.hash = '/about/about';
			}
		});
	},
	action: function(){
		distro.lightbox.show({
			name: "action",
			longName: "Get involved",
			show: function($content){
				// var $text, $spacer, $placeholder, liveNetworkJSON, liveNetworkHold;
				$content.attr('id', 'actionBox');
				$content.haj([
					[".lightboxHeader",
						["%span.close.button", {}, "x"],
						["%h1", "Get involved with DISTRO"]
					],
					[".contentBox",
						[ ".left",
							[ "%img", { "width": "210", "height": "52", "src": "//distro-static.s3.amazonaws.com/action/action_logo.png" } ],
							[ "%p",
								[ "%strong", "Get involved." ],
								" DISTRO.fm is just getting started and we would love your help.\n\t\t"
							]
						],
						[ ".right",
							[ "%ul.actionList",
								[ "%li", [ "%a", { "href": "mailto:hello@distro.fm" },
									[ "%span.label", "ASK A QUESTION." ], [ "%span.link", "HELLO@DISTRO.FM" ]
								] ],
								[ "%li", [ "%a", { "target": "_blank", "href": "http://faq.distro.fm" },
									[ "%span.label", "READ OUR ANSWERS." ], [ "%span.link", "FAQ.DISTRO.FM" ]
								] ],
								[ "%li", [ "%a", { "target": "_blank", "href": "http://donate.distro.fm" },
									[ "%span.label", "MAKE A PRIVATE DONATION." ], [ "%span.link", "DONATE.DISTRO.FM" ]
								] ],
								[ "%li", [ "%a", { "target": "_blank", "href": "http://code.distro.fm" },
									[ "%span.label", "JOIN OUR CODE TEAM." ], [ "%span.link", "CODE.DISTRO.FM" ]
								] ],
								[ "%li", [ "%a", { "target": "_blank", "href": "http://board.distro.fm" },
									[ "%span.label", "BE ON THE BOARD OF DIRECTORS." ], [ "%span.link", "BOARD.DISTRO.FM" ]
								] ],
								[ "%li", [ "%a", { "target": "_blank", "href": "http://help.distro.fm" },
									[ "%span.label", "WORK OR VOLUNTEER." ], [ "%span.link", "HELP.DISTRO.FM" ]
								] ],
								[ "%li", [ "%a", { "target": "_blank", "href": "http://facebook.distro.fm" },
									[ "%span.label", "FOLLOW US ON FACEBOOK." ], [ "%span.link", "FACEBOOK.DISTRO.FM" ]
								] ],
								[ "%li", [ "%a", { "target": "_blank", "href": "http://twitter.distro.fm" },
									[ "%span.label", "FOLLOW US ON TWITTER." ], [ "%span.link", "TWITTER.DISTRO.FM" ]
								] ],
								[ "%li", [ "%a", { "target": "_blank", "href": "http://kickstarter.distro.fm" },
									[ "%span.label", "SUPPORT OUR KICKSTARTER." ], [ "%span.link", "KICKSTARTER.DISTRO.FM" ]
								] ]
							]
						]
					]
				]);
			}
		});
	},
	find: function(){
		var keypressHandler;
		distro.tutorial.passed('findNetwork');
		distro.lightbox.show({
			name: "find",
			longName: "Find a network",
			show: function($content){
				var $text, $spacer, $placeholder, liveNetworkJSON, liveNetworkHold;
				$content.attr('id', 'networkSearch');
				$content.haj([
					['%span.close.button', 'x'],
					['.field',
						['.shadow', '^',
							['%span.spacer', {$:function(){ $spacer = $(this); }}],
							['%span.placeholder', {$:function(){ $placeholder = $(this); }}, distro.loc.str('findNetworks.placeholder')],
						'^'],
						['%input', { autocorrect: 'off', autocapitalize: 'off', $:function(){ $text = $(this); }}],
					],
					['#bottomBar', {$:function(){ $bottomBar = $(this); }}, ['%span.lightning', " "], "Live Networks"]
				]);
				$bottomBar.click(function(e){
					var $liveNetworkContainer = $('#liveNetworkContainer');

					function showLiveNetworks(liveJSON){
						$bottomBar.toggleClass('bright');
						if($liveNetworkContainer[0] !== undefined) {
							$liveNetworkContainer.toggle();
						} else {
							$content.stencil(
								['#liveNetworkContainer',
									['%ul#liveNetworkList', {$key: "", $children:[
										'%li',
											['%a', {href: { $join: ["#/", {$key: "name"}] }},
												{$key: "fullname"},
												['%span.liveNetworkName', {$join: ["^", {$key: "name"}, "^"]}]
											]
									]}]
								], liveJSON
							);
						}
					};
					
					if(!liveNetworkJSON && !liveNetworkHold){
						liveNetworkHold = true;
						distro.request('livenetworks', 'GET', null, new Hollerback({
							success: function(data){
								liveNetworkJSON = data;
								showLiveNetworks(liveNetworkJSON);
							},
							failure: function(){
								liveNetworkHold = false;
							}
						}));
					} else {
						showLiveNetworks(liveNetworkJSON);
					}
				}).bind('selectstart', function(e){e.preventDefault();});
				distro.tutorial.show('search');
				function handleInput(){
					$spacer.text($text[0].value);
					if ($bottomBar.hasClass('bright')) {
						$bottomBar.removeClass('bright');
						$('#liveNetworkContainer').hide();
					}
				}
				if ('oninput' in $text[0]) {
					$text.bind('input', handleInput);
				} else {
					$text.bind('keypress', function(){ setTimeout(function(){ handleInput(); }, 0); });
				}
				$text.bind('valuechange', handleInput);
				$text.focus(function(){
					$placeholder.hide();
				});
				$text.blur(function(){
					if(!$text[0].value){
						$placeholder.show();
					}
				});
				if ($text[0].value) {
					placeholder.style.display = 'none';
				}
				handleInput();
				$text.keypress(function(e){
					var search;
					if (e.keyCode === 13){
						if ((search = $text[0].value)) {
							distro.loadLandingPage(search, function(){});
							distro.tutorial.passed('search');
						}
						return false;
					}
				});
				$(window.document).keypress(keypressHandler = function(event){
					if(event.target !== $text[0]){
						$text.focus();
					}
					$('#searchTutDialog').fadeOut(function(){
						// distro.tutorial.passed('search');
						$(this).remove();
					})
				});
				$text.autocomplete({
					position:{
						my: "center top",
						at: "center bottom",
						collision: "none"
					}, source: function(request, response){
						distro.request('search/'+encodeURIComponent(request.term), 'GET', null, new Hollerback({
							success: function(data){response(data)}
						}));
					}
				});
			},
			hide: function(){
				$(window.document).unbind('keypress', keypressHandler);
				distro.tutorial.hide('search');
			}
		});
	},
	login: function(){
		if (distro.global.get('user')) {
			window.location.hash = '';
			return;
		}
		distro.lightbox.push({
			name: 'login',
			longName: 'Login',
			show: function($content){
				var $loginForm, $registerForm, submitStatus = new Backbone.Model({submitting:false}), $inputs;
				function bindToSubmit(){
					var $field = $(this);
					submitStatus.bind('change:submitting', function(m, submitting){
						$field.attr('disabled', submitting ? true : null);
					});
				}
				$content.attr('id', 'loginRegisterBox');
				$content.haj([["%span.close.button", {}, "x"], ["#container",
					[ "#logIn",
						[ "%h2", "Have an account?" ],
						[ "%h1", "Log In" ],
						[ "%form", { $:function(){ $loginForm = $(this); }},
							[ "%input", { $:bindToSubmit, "type": "email", "autocapitalize": "off", "name": "email", "placeholder": "Email Address" } ],
							[ "%input", { $:bindToSubmit, "type": "password", "name": "password", "placeholder": "Password" } ],
							[ "%p",
								[ "%button", { $:bindToSubmit }, "Log In" ],
								[ "%input#login_remember_me", { $:bindToSubmit, "type": "checkbox", "name": "remember_me" } ],
								[ "%label", { "for": "login_remember_me" }, "Remember me" ]
							]
						]
					],
					[ "#register",
						[ "%h2", "New to DISTRO?" ],
						[ "%h1", "Sign up" ],
						[ "%form", { $:function(){ $registerForm = $(this); }},
							[ "%input", { $:bindToSubmit, "type": "email", "autocapitalize": "off", "name": "email", "placeholder": "Email Address" } ],
							[ "%input", { $:bindToSubmit, "type": "password", "name": "password", "placeholder": "Password" } ],
							[ "%p",
								[ "%button", { $async:function(){
									var $button = $(this), terms = $registerForm[0].elements.accept_terms;
									submitStatus.bind('change:submitting', function(m, submitting){
										$button.attr('disabled', submitting || ! terms.checked ? true : null);
									});
									$(terms).change(function(){
										$button.attr('disabled', ! this.checked || submitStatus.get('submitting') ? true : null);
									})
								}, "disabled": "disabled" }, "Sign Up" ],
								[ "%input#register_remember_me", { $:bindToSubmit, "type": "checkbox", "name": "accept_terms" } ],
								[ "%label", { "for": "register_remember_me" }, "I agree with the ", [ "%a", { "href": "/terms.html", target: "_blank" }, "terms of use" ] ]
							]
						]
					]
				]]);
				$content.find('input[placeholder]').placeholder();
				$content.submit(function(e){
					var form = e.target,
					    registering = e.target === $registerForm[0],
					    elements = form.elements,
						data = { email: elements.email.value, password: elements.password.value };
					if ( ! (data.email && data.password)) {
						alert(distro.loc.str('registration.errors.noCredentials'));
						return false;
					}
					if (registering) {
						data.acceptTerms = elements.accept_terms.checked;
					} else {
						data.rememberMe = elements.remember_me.checked;
					}
					submitStatus.set({submitting: true});
					distro.request(registering ? 'register' : 'login', 'POST', data, new Hollerback({
						failure: function(data){
							if (data && data.errorMessage) {
								alert(distro.loc.str(data.errorMessage) || data.errorMessage);
							}
						},
						complete: function(){
							submitStatus.set({submitting: false});
						}
					}));
					return false;
				});
			}
		});
	},
	fourOhFour: function(target){
		alert("This page couldn't be found.");
	},
	bounce: function(target){
		if (target) {
			window.location.hash = '#/' + target;
		}
	},
	manage: function(target){
		var network = distro.library.subscriptions.get(target);
		if (network && network.attributes.admin) {
			distro.topPath = document.location.hash;
			distro.tml.show(network);
		} else {
			this.fourOhFour();
		}
	}
});

// Initialization
distro.init(function(){
	if($.browser.msie){return;}
	distro.loc.replacePlaceholders();
	// Pad the music library header with the music library's scrollbar width
	(function(){
		var bodyContainer = document.getElementById('musicTableBodyContainer'),
			headContainer = document.getElementById('musicTableHeadContainer');
		headContainer.style.paddingRight = bodyContainer.offsetWidth - bodyContainer.clientWidth + 'px';
		if (/WebKit\//.test(navigator.userAgent)) {
			// Work around https://bugs.webkit.org/show_bug.cgi?id=59483
			headContainer.style.display = 'none'; headContainer.clientLeft; headContainer.style.display = '';
		}
	})();
	// font-variant with @font-face is broken in the WebKit in Safari 5.0.5 ()
	Modernizr.addTest('brokenFontVariant', function() { return (navigator.userAgent.match(/WebKit\/([^.]+)/) || [] )[1] < 534; });
	// Show a notice to users of old browsers
	(function(){
		function showNotice(message){
			setTimeout(function(){
				var exports = {},
					$notice = $(haj(['#notice', ['.close', { $export: 'close' }], message], exports)),
					$wrapper = $('#wrapper');
				function resizeHandler(){
					$wrapper.css('top', $notice.outerHeight());
				}
				document.body.insertBefore($notice[0], $wrapper[0]);
				$wrapper.animate({'top': $notice.outerHeight()}, 300);
				$(window).resize(resizeHandler);
				$(exports.close).click(function(){
					$(window).unbind('resize', resizeHandler);
					$wrapper.animate({'top': 0}, 300, function(){
						$notice.remove();
					})
				})
			}, 500);
		}
		
		if (navigator.userAgent.indexOf('like Mac OS X') !== -1) {
			var deviceMatch = navigator.userAgent.match(/iPhone|iPad|iPod/),
				device = deviceMatch ? deviceMatch[0] : 'iOS';
			showNotice(stencil(distro.loc.str('browsers.iOS'), { device: device }));
		} else if ($.browser.name === 'firefox' && $.browser.versionNumber < 4) {
			showNotice(stencil(distro.loc.str('browsers.old'), { browser: 'Firefox', url: 'http://firefox.com/' }));
		} else if ($.browser.name === 'safari' && $.browser.versionNumber < 5) {
			showNotice(stencil(distro.loc.str('browsers.old'), { browser: 'Safari', url: 'http://www.apple.com/safari/download/' }));
		} else if ($.browser.name === 'chrome' && $.browser.versionNumber < 11) {
			showNotice(stencil(distro.loc.str('browsers.old'), { browser: 'Chrome', url: 'http://www.google.com/chrome/' }));
		} else if ( ! ($.browser.name in { chrome:1, firefox:1, safari:1 })) {
			showNotice(distro.loc.str('browsers.noClue'));
		}
	})();
	$('#logOut').click(function(){
		distro.request('logout', 'POST', null, new Hollerback({}));
	});

	// Miscellaneous UI
	$('.button').live('selectstart', function(e){
		e.preventDefault();
	});
	
	distro.router = new distro.Router();
	distro.library.refresh(function(){
		// Let the complete callbacks run (e.g. to update the user before starting Backbone.history)
		setTimeout(function(){
			Backbone.history.start();
		}, 0);
	}, true); // Don't refresh again if user is updated
	
	$('#musicTableBodyContainer')
	.mousedown(function(){
		this.focus();
	})
	.keydown(function(e){
		var emptySelection = !distro.library.trackListView.selectedTrack,
			firstTrack = distro.library.trackListView.collection.models[0],
			selected,
			newSelection;
		if(e.keyCode == 38 || e.keyCode == 40){
			if(e.keyCode == 38){ // up arrow
				newSelection = emptySelection
						? distro.library.trackListView.collection.models[(distro.library.trackListView.collection.length-1)]
						: distro.library.trackListView.relativeSelection(-1);
			} else if(e.keyCode == 40){ // down arrow
				newSelection = emptySelection
					? distro.library.trackListView.collection.models[0]
					: distro.library.trackListView.relativeSelection(1);
			}
			if(newSelection){
				distro.library.trackListView.setSelected(newSelection);
			}
			e.preventDefault();
		} else if(e.keyCode == 13){ // enter
			if ((selected = distro.library.trackListView.selectedTrack)){
				distro.player.play(selected);
			}
		}
	})
	.focus(); // Give initial focus to the music table
	$(document).keydown(function(e){
		// { up:38, down:40, left:37, right:39, space:32, enter:13 }
		var emptySelection = !distro.library.trackListView.selectedTrack,
			firstTrack = distro.library.trackListView.collection.models[0],
			selected;
		if ($(e.target).is('input, textarea, select')) { return; }

		if(e.keyCode == 32){
			if(distro.player.current){
				distro.player.current.paused ? distro.player.current.play() : distro.player.current.pause();
			} else {
				distro.player.play(firstTrack);
			}
			e.preventDefault();
		} else if(e.keyCode == 37){
			if (distro.player.current) {
				if (distro.player.current.position > 1000) {
					distro.player.current.setPosition(0);
				} else {
					distro.player.previous();
				}
			}
		} else if(e.keyCode == 39){
			if (distro.player.current) {
				distro.player.next();
			}
		}
	});
	(function ($) {
		var original = $.fn.val;
		$.fn.val = function(newValue) {
			var ret = original.apply(this, arguments);
			if (newValue) {
				this.trigger('valuechange');
			}
			return ret;
		};
	})(jQuery);
	
	//credit: Abhijit Rao (http://stackoverflow.com/questions/1805808)
	$.scrollIntoView = function(element, container) {
		var containerTop = $(container).scrollTop(),
			containerBottom = containerTop + $(container).height(),
			elemTop = element.offsetTop,
			elemBottom = elemTop + $(element).height();
		if (elemTop < containerTop) {
			$(container).scrollTop(elemTop);
		} else if (elemBottom > containerBottom) {
			$(container).scrollTop(elemBottom - $(container).height());
		}
	}
	var _gaq = _gaq || [];
	_gaq.push(['_setAccount', 'UA-21896928-1']);
	_gaq.push(['_trackPageview']);
	
	mpq.push(['track', 'visit', {'user': distro.global.get('user')}]);
	
	(function() {
		var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
		ga.src = ('https:' == document.location.protocol ? 'https://ssl' : 'http://www') + '.google-analytics.com/ga.js';
		var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
	})();
});
