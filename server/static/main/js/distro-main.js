distro.SERVER = "http://localhost:3000/api/",
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
	var $userMenu = $('#user'),
	    $userName = $('#userName');
	distro.global.bind('change:user', function(model, user){
		if (user) {
			$userName.text(user);
			$userMenu.fadeIn();
		} else {
			$userMenu.fadeOut();
		}
	});
})();

function Lightbox(){
	this.$lightbox = $('#lightbox');
	this.$contentWrapper = $('#lightboxWrapper');
}
Lightbox.prototype.show = function(content){
	this.hideContent();
	var $content = $('<div>', { class: 'lightboxContent' });
	this.content = content;
	this.$contentWrapper.html($content);
	content.show($content, this);
	this.$lightbox.fadeIn(200);
	this.$contentWrapper.fadeIn(400);
}
Lightbox.prototype.hide = function(name){
	if (!name || (this.content && name === this.content.name)) {
		var self = this;
		this.$lightbox.fadeOut();
		this.$contentWrapper.fadeOut(function(){
			self.hideContent();
		});
	}
}
Lightbox.prototype.hideContent = function(){
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
		} else {
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
		tour.advance('startedPlayback');
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
	var $audio = $(this.audio = new Audio()), that = this;
	if (!this.audio) { return null };
	$audio.attr({autoplay:'', autobuffer:''})
	this.$transport = $('#transport');
	$audio.bind('play', function(){
		that.$transport.addClass('playing');
	});
	$audio.bind('pause', function(){
		that.$transport.removeClass('playing');
	});
	$audio.bind('emptied', function(){
		that.delegate.willStopPlayingTrack.call(this, that.userInfo);
		that.$transport.removeClass('playing enabled');
		that.canPlay = false;
	});
	$audio.bind('loadstart', function(){
		that.$transport.addClass('enabled');
		that.canPlay = true;
	});
	$audio.bind('ended', function(){
		that.playNext();
	});
	$('#pauseButton').click(function(){
		that.audio.pause();
	});
	$('#playButton').click(function(){
		if (that.canPlay) {
			that.audio.play();
		}
	});
	$('#skipBackButton').click(function(){
		if (that.canPlay) {
			if (that.audio.currentTime > 1 || !that.playPrevious()) {
				that.audio.currentTime = 0;
				that.audio.play();
			}
		}
	});
	$('#skipForwardButton').click(function(){
		if (that.canPlay) {
			that.playNext();
		}
	});
};
Player.prototype.start = function(files, delegate, userInfo){
	this.delegate && this.delegate.willStopPlayingTrack.call(this, this.userInfo);
	this.stop();
	if (files) {
		this.delegate = delegate;
		this.userInfo = userInfo;
		this.delegate && this.delegate.willStartPlayingTrack.call(this, this.userInfo);
		this.playFile(files);
	}
};
Player.prototype.playFile = function(variants){
	var sourceElement;
	this.stop();
	for (var i = 0, l = variants.length; i < l; i++){
		sourceElement = document.createElement('source');
		$(sourceElement).attr(variants[i]);
		this.audio.appendChild(sourceElement);
	}
	this.audio.play();
}
Player.prototype.playNext = function(){
	this.delegate && this.delegate.willStopPlayingTrack.call(this, this.userInfo);
	var next = this.delegate.relativeTrack.call(this, this.userInfo, 1);
	if (next) {
		this.playFile(next);
		this.delegate && this.delegate.willStartPlayingTrack.call(this, this.userInfo);
		return true;
	}
	this.stop();
	return false;
}
Player.prototype.playPrevious = function(){
	this.delegate && this.delegate.willStopPlayingTrack.call(this, this.userInfo);
	var prev = this.delegate.relativeTrack.call(this, this.userInfo, -1);
	if (prev) {
		this.playFile(prev);
		this.delegate && this.delegate.willStartPlayingTrack.call(this, this.userInfo);
		return true;
	}
	this.delegate && this.delegate.willStartPlayingTrack.call(this, this.userInfo);
	return false;
}
Player.prototype.stop = function(){
	while(this.audio.lastChild){ this.audio.removeChild(this.audio.lastChild); }
	this.audio.load();
};

distro.LandingPage = distro.Model.extend({
	initialize: function(opts){
		this.name = opts.name;
		this.url = 'bands/' + opts.name;
	},
});

distro.Router = Backbone.Controller.extend({
	routes: {
		":band": "band",
		"/find": "find"
	},
	band: function(band){
		distro.lightbox.hide();
		if (band) {
			(new distro.LandingPage({name: band})).fetch({
				success: function(model){
					distro.lightbox.show({
						name: 'landingpage',
						show: function($content){
							$content.attr('id', 'bandBox');
							$content.stencil(["%form", {},
								[".lightboxHeader",
									["%span.close.button", {}, "x"],
									["%h1","^", { key: 'name' }, "^"]
								],
								[".contentBox",
									[".content.leftContent",
										["%img.photo",{src:"http://farm5.static.flickr.com/4150/5042267992_242cfda7e2_d.jpg", width:"500", height:"335"}],
										["%span.caption",{style:"color: rgb(119, 119, 119);"},
											["%p", {style:"margin-top:0px; margin-right: 0.25em; margin-bottom: 0px; margin-left:0px; text-align: right; float:right;"}, "Photo by ",
												["%a",{href:"#", style:"text-decoration:none;"}, "papazuba"]
											],
											["%p",{style:"margin-top: 0.25em; margin-right: 0em; margin-bottom: 0em; margin-left: 0em;"}, "Montreal, Quebec"],
											["%p",{style:"margin-top:0px;"}, "Canada"]
										],
										["%span#artist",{style:"font-size:36px;"},
											["%p",{style:"margin-top: 0px; margin-right: 0px; margin-bottom: 0px; margin-left: 0px;"}, { key: "fullname"}]
										]
									],
									[".rightContent",
										{ key: 'presence', conditional: [".presence",
											["%ul.presence", { key: 'presence', children: [
												['%li', { class: { key: 'name' } }, ['%a', { href: { key: 'url' } }]]
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
					alert('failsauce');
				}
			})
		}
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
			},
			// hide: function(){
			// 	alert("BYE");
			// }
		});
	}
});

// Initialization
distro.init(function(){
	var tracks = window.tracks = new Backbone.Collection(),
		player = window.player = new Player(),
		musicListView = window.musicListView = new MusicListView({model: tracks, el:$('#musicTableBody tbody:first')[0]});
	
	distro.loc.replacePlaceholders();
	
	distro.request('ping', null, new Hollerback({}));

	$('#logOut').click(function(){
		distro.request('logout', {}, new Hollerback({}));
	});

	// Miscellaneous UI
	$('.button').live('mousedown', function(e){
		e.preventDefault();
	});
	
	distro.router = new distro.Router();
	Backbone.history.start();
});
