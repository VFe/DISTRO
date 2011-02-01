distro.SERVER = "/api/",
distro.global = new Backbone.Model({}),
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
distro.request = function(path, data, hollerback){
	var responseData = null;
	$.ajax({
		url: (distro.SERVER + path),
		data: (data ? JSON.stringify(data) : null),
		type: (data ? 'POST' : 'GET'),
		contentType: (data ? 'application/json' : undefined),
		success: function(responseDataInternal, status, xhr){
			responseData = responseDataInternal;
			hollerback.succeed(responseData, status, xhr);
		},
		error: function(xhr, status, error){
			try{
				responseData = $.parseJSON(xhr.responseText);
			} catch(e) {
				distro.pyramidHead(distro.loc.str('global.serverError'), function(){
					distro.request(path, data, hollerback);
				}, function(){
					hollerback.fail(responseData, status, xhr);
				});
				return;
			}
			if (xhr.status === 500) {
				distro.pyramidHead(distro.loc.str('global.serverError'), function(){
					distro.request(path, data, hollerback);
				}, function(){
					hollerback.fail(responseData, status, xhr);
				});
			} else {
				hollerback.fail(responseData, status, xhr);
			}
		},
		complete: function(){
			if (responseData && 'userName' in responseData) {
				distro.global.set({user: responseData.userName});
			}
		}
	})
};
distro.Model = Backbone.Model.extend({
	sync: function(method, model, success, error){
		if (!(model && model.url)) throw new Error("A 'url' property or function must be specified");
		if (method !== 'read') {
			throw new Error("distro.Model can only read");
		}
		distro.request((_.isFunction(model.url) ? model.url() : model.url), null, new Hollerback({
			success: success,
			failure: error
		}));
	}
});
distro.library = {
	networks: new Backbone.Collection,
	tracks: new Backbone.Collection,
	refresh: function(){
		distro.request('library', null, new Hollerback({
			success: function(data){
				this.networks.refresh(data.networks || []);
				this.tracks.refresh(data.tracks || []);
			}
		}, this));
	}
};
distro.library.networkListView = new (Backbone.View.extend({
	el: $('#networksTable>tbody')[0],
	initialize: function() {
		_.bindAll(this, 'add', 'render');
		this.$el = $(this.el);
		this.$foot = this.$el.children('.filler:first');
		this.collection.bind('refresh', this.render);
	},
	add: function(network){
		this.$foot.before((new distro.library.NetworkView({ model: network })).el);
	},
	render: function(){
		this.$el.empty().append(this.$foot);
		this.collection.each(this.add);
	}
}))({ collection: distro.library.networks });

distro.library.NetworkView = Backbone.View.extend({
	tagName: 'tr',
	template: ['%td',
		['.network', { key: 'id' }, ['.networkControls', ['.delete', 'X'], ['.mute', 'M'], ['.solo', 'S']]]
	],
	events: {
		"click .delete": "delete",
		"click .mute": "mute",
		"click .solo": "solo"
	},
	initialize: function() {
		_.bindAll(this, 'render');
		this.model.bind('change', this.render);
		this.model.view = this;
		this.render();
	},
	render: function(){
		$(this.el).stencil(this.template, this.model.toJSON());
	},
	'delete': function(){
		alert('remove '+this.model.id);
	},
	mute: function(){
		alert('mute '+this.model.id);
	},
	solo: function(){
		alert('solo '+this.model.id);
	}
});
distro.library.trackListView = new (Backbone.View.extend({
	el: $('#musicTableBody>tbody')[0],
	initialize: function() {
		_.bindAll(this, 'add', 'render');
		this.$el = $(this.el);
		this.$foot = this.$el.children('.filler:first');
		this.collection.bind('refresh', this.render);
	},
	add: function(network){
		this.$foot.before((new distro.library.TrackView({ model: network, parent: this })).el);
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
	relativeTrack: function(shift){
		return this.playingTrack && this.collection.models[this.collection.indexOf(this.playingTrack) + shift];
	}
}))({ collection: distro.library.tracks });

distro.library.TrackView = Backbone.View.extend({
	tagName: 'tr',
	template: [['%td', { key: 'name' }], ['%td'], ['%td'], ['%td', { key: 'network' }]],
	events: {
		"dblclick": "play"
	},
	initialize: function() {
		_.bindAll(this, 'render', 'setPlaying', 'play');
		this.model.bind('change', this.render);
		this.model.view = this;
		this.$el = $(this.el);
		this.render();
	},
	render: function(){
		this.$el.stencil(this.template, this.model.toJSON());
	},
	setPlaying: function(playing){
		this.$el[playing ? 'addClass' : 'removeClass']('playing');
	},
	play: function(){
		player.play(this.model);
	}
});

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
	distro.global.bind('change:user', function(model, user){
		if (user) {
			$accountName.text(user);
			$account.addClass('loggedIn');
			distro.library.refresh();
		} else {
			$account.removeClass('loggedIn');
		}
	});
})();

function Lightbox(){
	this.$lightbox = $('#lightbox');
	this.$contentWrapper = $('#lightboxWrapper');
}
Lightbox.prototype.show = function(content){
	this.hideContent();
	this.hiding = false;
	var $content = $('<div>', { 'class': 'lightboxContent' });
	this.content = content;
	this.$contentWrapper.html($content);
	content.show($content, this);
	this.$lightbox.fadeIn(200);
	this.$contentWrapper.fadeIn(200);
}
Lightbox.prototype.hide = function(name){
	if (!name || (this.content && name === this.content.name)) {
		var self = this;
		this.$lightbox.fadeOut(200);
		this.hiding = true;
		this.$contentWrapper.fadeOut(200, function(){
			self.hideContent();
		});
	}
}
Lightbox.prototype.hideContent = function(){
	if (!this.hiding){
		return;
	}
	if (this.content) {
		this.content.hide && this.content.hide(this);
		this.content = null;
	}
	this.$contentWrapper.empty();
}
distro.lightbox = new Lightbox;

// Login/registration lightbox
(function(){
	distro.global.bind('change:user', function(model, user){
		if (user) {
			distro.lightbox.hide('login');
			if (window.location.hash === '#/login') {
				Backbone.history.saveLocation('');
			}
		}
	});
})();

// Music list view
var TrackDetailView = Backbone.View.extend({
	el: $('<div/>', {'class':'infoBoxContent'})[0],
	template: [
		['%p', 'Track from: ^', {key:'source'}, '^'],
		['%p', 'Name: ', {key:'name'}],
		['%p', 'Artist: ', {key:'artist'}],
		['%p', 'Album: ', {key:'album'}],
	],
	initialize: function(){
		_.bindAll(this, 'update');
		this.placeholder = $.haml.placeholder(stencil.placeholder(this.template));
		$(this.el).append(this.placeholder.inject());
		this.model.bind('change:selection', this.update);
	},
	update: function(){
		if (this.model.attributes.selection) {
			this.placeholder.update(this.model.attributes.selection.toJSON());
		}
	}
});
var LibrarySelection = Backbone.Model.extend({
	set: function(attributes, options){
		this.attributes.selection && $(this.attributes.selection.element).removeClass('selected');
		Backbone.Model.prototype.set.call(this, attributes, options);
		this.attributes.selection && $(this.attributes.selection.element).addClass('selected');
	}
});
var MusicListView = Backbone.View.extend({
		template: ['%tr',
		['%td', {'class':{key:'freshness'}}],
		['%td', {'class':{key:'upcoming'}}],
		['%td', {key:'name'}],
		['%td', {key:'source', conditional:['^', {key:'source'}, '^']}],
		['%td', {key:'time'}],
		['%td', {key:'artist'}]
	],
	callbacks: {
		relativeTrack: function(userInfo, shift){
			var next = this.model.models[this.model.indexOf(userInfo.model) + shift];
			if (next) {
				userInfo.model = next;
				return this.fileNamesForModel(next);
			}
		},
		willStopPlayingTrack: function(userInfo){
			userInfo.model.element && $(userInfo.model.element).removeClass('playing');
		},
		willStartPlayingTrack: function(userInfo){
			userInfo.model.element && $(userInfo.model.element).addClass('playing');
		}
	},
	map: [],
	selection: [],
	events: {
		"dblclick tr:not(.filler)": "play",
		"click": "select"
	},
	initialize: function() {
		_.bindAll(this, 'add', 'remove', 'refresh', 'play', 'select');
		// _.bindAll doesn't support binding to a different object
		for (var key in this.callbacks){
			this.callbacks[key] = _.bind(this.callbacks[key], this);
		}
		this.$el = $(this.el);
		this.$foot = this.$el.children(':first');
		this.model.bind('add', this.add);
		this.model.bind('remove', this.remove);
		this.model.bind('refresh', this.refresh);
		this.selection = new LibrarySelection();
		new TrackDetailView({model: this.selection});
		this.map = [];
		this.refresh();
	},
	add: function(newObject){
		var $container = $('<div>'), newItem;
		$container.stencil(this.template, newObject.toJSON());
		newItem = $container.children(':first')[0];
	
		newObject.element = newItem;
		$(newItem).data('model', newObject);
		this.map.push({element: newItem, model: newObject});
		this.$foot.before(newItem);
	},
	remove: function(removed){
		_.each(this.map, function(item){
			if (item.model == removed) {
				item.element.remove();
				this.map.splice(index, 1);
				_.breakLoop();
			};
		});
	},
	refresh: function(){
		var item;
		while((item = this.map.pop())){
			item.element.remove();
		}
		this.model.each(this.add);
	},
	play: function(e){
		var $target = $(e.target).closest('tr:not(.filler)'), trackModel;
		if ($target.length) {
			if ((trackModel = $target.data('model'))) {
				player.start(this.fileNamesForModel(trackModel), this.callbacks, {model: trackModel});
			}
		}
	},
	select: function(e){
		var $target = $(e.target).closest('tr');
		this.selection.set({selection: ($target.is(':not(.filler)') ? $target.data('model') : null)});
	},
	fileNamesForModel: function(model){
		var baseName = 'music/' + model.get('name');
		return [{src: baseName+'.mp3', type:'audio/mpeg'}, {src: baseName+'.ogg', type:'audio/ogg'}];
	}
});

// Music player
function Player(){
	// SoundManager initialization
	soundManager.debugMode = false;
	soundManager.url = '/soundmanager/';
	soundManager.useFlashBlock = true;
	soundManager.useHTML5Audio = true;
	soundManager.onload = _.bind(function() {
		if (this.heldTrack) {
			this.play(this.heldTrack);
			delete this.heldTrack;
		}
	}, this);
	
	function onplay(){
		player.$transport.addClass('enabled playing');
	}
	function onpause(){
		player.$transport.removeClass('playing');
	}
	function onresume(){
		player.$transport.addClass('playing');
	}
	function onstop(){
		player.$transport.removeClass('enabled playing');
	}
	this.play = function(track){
		if (!soundManager.ok()) {
			this.heldTrack = track;
			return;
		}
		if (this.current) {
			this.stop();
		}
		if (track && track.attributes.network && track.attributes.filename) {
			this.current = soundManager.createSound({
				id: "track",
				url: "//distro-music.s3.amazonaws.com/" + track.get('network') + "/" + track.get('filename') + ".mp3",
				onplay: onplay,
				onresume: onplay,
				onpause: onpause,
				onstop: onstop
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
			player.play(distro.library.tracks.models[0]);
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
};
Player.prototype.next = function(){
	if (player.current) {
		this.play(distro.library.trackListView.relativeTrack(1));
	}
};
Player.prototype.previous = function(){
	if (player.current) {
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

distro.LandingPage = distro.Model.extend({
	initialize: function(opts){
		this.name = opts.name;
		this.url = 'networks/' + opts.name;
	},
});

distro.Router = Backbone.Controller.extend({
	routes: {
		"": "blank",
		"/find": "find",
		"/login": "login",
		"/:network": "network",
		":target": "bounce"
	},
	blank: function(){
		distro.lightbox.hide();
	},
	network: function(name){
		distro.lightbox.hide();
		if (!name) {
			window.location.hash = '';
			return;
		}
		(new distro.LandingPage({name: name})).fetch({
			success: function(model){
				distro.lightbox.show({
					name: 'landingpage',
					show: function($content){
						$content.attr('id', 'landingBox');
						$content.stencil(["%form", {},
							[".lightboxHeader",
								["%span.close.button", {}, "x"],
								["%h1","^", { key: 'name' }, "^"]
							],
							[".contentBox",
								[".content.leftContent",
									["%img.photo",{src: {key: 'name', handler: function(){ return "http://distro-images.s3.amazonaws.com/"+this+".jpg" }}, width:"500", height:"335"}],
									["%span.caption",{style:"color: rgb(119, 119, 119);"},
										["%p", {style:"margin-top:0px; margin-right: 0.25em; margin-bottom: 0px; margin-left:0px; text-align: right; float:right;"}, "Photo by ",
											["%a",{href:{ key: "flickrcredurl"}, style:"text-decoration:none;"}, { key: "flickrcred"}]
										],
										["#location",
											["%p",{style:"margin-top: 0.25em; margin-right: 0em; margin-bottom: 0em; margin-left: 0em;"}, { key: "citystate"}],
											["%p",{style:"margin-top:0px;"}, { key: "country"}]
										]
									],
									["%span#artist",{style:"font-size:36px;"},
										["%p",{style:"margin-top: 0px; margin-right: 0px; margin-bottom: 0px; margin-left: 0px;"}, { key: "fullname"}]
									]
								],
								[".rightContent",
									{ key: 'presence', conditional: [".presence",
										["%ul.presence", { key: 'presence', children: [
											['%li', { 'class': { key: 'name' } }, ['%a', { href: { key: 'url' } }]]
										] } ]
									] },
									[".content"],
									[".subscribeButton", { type: "button" }, [".label"], "^", { key: 'name' }, "^"]
								]
							]
						], model.attributes);
					}
				});
				$('.close').bind('click', function(){
					window.location.hash = '';
				});
			},
			error: function(){
				alert("There's no network by this name");
				window.location.hash = '';
			}
		})
	},
	find: function(){
		distro.lightbox.show({
			name: "findNetworks",
			show: function($content){
				var $close, $search, $text, $placeholder;
				$content.attr('id', 'networkSearch');
				$content.haml([
					['%span.close.button', {$:{$:function(){ $close = this; }}}, 'x'],
					['.search', {$:{$:function(){ $search = this; }}},
						['%span.field', '^',
							['%span.text', { contenteditable: 'plaintext-only', $:{$:function(){ $text = this; }}}],
							['%span.placeholder', {$:{$:function(){ $placeholder = this; }}}, distro.loc.str('findNetworks.placeholder')],
						'^' ]
					]
				]);
				$close.click(function(){
					window.location.hash = '';
				});
				$search.click(function(e){
					if (e.target != $text[0]) {
						$text.focus();
						return false;
					}
				});
				$text.focus(function(){
					$placeholder.hide();
				});
				$text.blur(function(){
					if(!$text.text()){
						$placeholder.show();
					}
				});
			}//,
			// hide: function(){
			// 	alert("BYE");
			// }
		});
	},
	login: function(){
		if (distro.global.get('user')) {
			window.location.hash = '';
			return;
		}
		distro.lightbox.show({
			name: 'login',
			show: function($content){
				var $form, $emailField, $passwordField, $registerCheckbox, $submitButton, submitStatus = new Backbone.Model({submitting:false});
				$content.attr('id', 'loginRegisterBox');
				$content.haml(['%form', {$:{$:function(){ $form = this; }}},
					['%dl',
						['%dt', ['%label', {'for':'emailAddress'}, distro.loc.str('registration.emailAddressQuery')]],
						['%dd', ['%input#emailAddress', {$:{$:function(){
							$emailField = this;
							submitStatus.bind('change:submitting', function(m, submitting){ $emailField.attr('disabled', submitting ? true : null) });
						}}, size:'35', placeholder:'s@distro.fm'}]],
						['%dt', ['%label', {'for':'password'}, distro.loc.str('registration.passwordQuery')]],
						['%dd', ['%input#password', {$:{$:function(){
							$passwordField = this;
							submitStatus.bind('change:submitting', function(m, submitting){ $passwordField.attr('disabled', submitting ? true : null) });
						}}, size:'35', type:'password', placeholder:'\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'}]],
						['%dt', ['%label', {'for':'registrationType'}, distro.loc.str('registration.registerQuery')]],
						['%dd', ['%input#registrationType', {$:{$:function(){
							$registerCheckbox = this;
							submitStatus.bind('change:submitting', function(m, submitting){ $registerCheckbox.attr('disabled', submitting ? true : null) });
						}}, type:'checkbox'}]]
					],
					['%div', {style:"text-align: right"},
						['%button#submitButton', {$:{$:function(){
							$submitButton = this;
							submitStatus.bind('change:submitting', function(m, submitting){ $submitButton.attr('disabled', submitting ? true : null) });
						}}, 'class': "button lightboxButton"}, distro.loc.str('registration.logInLabel')],
					]
				]);
				$registerCheckbox.change(function(){
					$submitButton.text($registerCheckbox[0].checked ? distro.loc.str('registration.registerLabel') : distro.loc.str('registration.logInLabel'));
				});
				$form.submit(function(e){
					e.preventDefault();
					var email = $emailField.val(), password = $passwordField.val(), register = $registerCheckbox[0].checked;
					if (!email || !password) {
						alert(distro.loc.str('registration.errors.noCredentials'));
					} else {
						submitStatus.set({submitting: true});
						distro.request(register ? 'register' : 'login', {email: email, password: password}, new Hollerback({
							failure: function(data){
								if (data && data.errorMessage) {
									alert(distro.loc.str(data.errorMessage) || data.errorMessage);
								}
							},
							complete: function(){
								submitStatus.set({submitting: false});
							}
						}));
					}
					return false;
				});
			}
		});
	},
	bounce: function(target){
		if (target) {
			window.location.hash = '#/' + target;
		}
	}
});

var tracks = window.tracks = new Backbone.Collection(),
	player = window.player = new Player(),
	musicListView = window.musicListView = new MusicListView({model: tracks, el:$('#musicTableBody tbody:first')[0]});

// Initialization
distro.init(function(){
	
	distro.loc.replacePlaceholders();
	
	distro.request('ping', null, new Hollerback({}));

	$('#logOut').click(function(){
		distro.library.networks.refresh([]);
		distro.library.tracks.refresh([]);
		distro.request('logout', {}, new Hollerback({}));
	});

	// Miscellaneous UI
	$('.button').live('mousedown', function(e){
		e.preventDefault();
	});
	
	distro.router = new distro.Router();
	Backbone.history.start();
});
