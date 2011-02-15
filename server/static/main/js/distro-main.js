Backbone.sync = function(method, model, success, error){
	if (!(model && model.url)) throw new Error("A 'url' property or function must be specified");
	var httpMethod = { 'create': 'POST', 'update': 'PUT', 'delete': 'DELETE', 'read'  : 'GET' }[method],
	    data = (method === 'create' || method === 'update') ? model.toJSON() : null;
	
	distro.request((_.isFunction(model.url) ? model.url() : model.url), httpMethod, data, new Hollerback({
		success: success,
		failure: error
	}));
}


distro.util = {
	pad: function(input, length, char){ var padding = length + 1 - input.length; return (padding > 0 ? Array(length + 1 - input.length).join(char || '0') + input : input); },
	formatTime: function(seconds){ return ((seconds - seconds%60)/60).toString() + ':' + distro.util.pad((seconds%60).toString(), 2); }
};
distro.SERVER = "/api/",
distro.TITLE = "DISTRO",
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
distro.request = function(path, method, data, hollerback){
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
				distro.global.set({user: responseData.userName});
			}
		}
	})
};
distro.library = {
	subscriptions: new (Backbone.Collection.extend({
		url: 'library/subscriptions',
		model: Backbone.Model,
		comparator: function(model){
			return model.attributes.name;
		},
		isSubscribed: function(networkName){
			return this.any(function(subscription){ return subscription.id === networkName });
		}
	})),
	tracks: new (Backbone.Collection.extend({
		url: 'library/tracks',
		model: Backbone.Model.extend({
			validate: function(attributes){
				if (!(attributes.release instanceof Date)) {
					attributes.release = new Date(attributes.release);
				}
			},
			initialize: function(){
				this.validate(this.attributes);
			}
		}),
		comparator: function(model){
			return +model.attributes.release;
		}
	})),
	refresh: function(complete){
		if (this.justUpdated) {
			return;
		} else {
			this.justUpdated = true;
			self = this;
			setTimeout(function(){
				self.justUpdated = false;
			}, 0);
		}
		distro.request('library', 'GET', null, new Hollerback({
			success: function(data){
				this.subscriptions.refresh(data.subscriptions || []);
				this.tracks.refresh(data.tracks || []);
			},
			complete: complete
		}, this));
	}
};
distro.library.subscriptionListView = new (Backbone.View.extend({
	el: $('#subscriptionsTable>tbody')[0],
	initialize: function() {
		_.bindAll(this, 'add', 'render');
		this.$el = $(this.el);
		this.$foot = this.$el.children('.filler:first');
		this.collection.bind('add', this.add);
		this.collection.bind('refresh', this.render);
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
		['.subscription', { $key: 'id' }, ['.subscriptionControls', ['.delete', 'X'], ['.mute', 'M'], ['.solo', 'S']]]
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
		distro.library.subscriptions.bind('add', function(){
			distro.library.tracks.fetch();
		});
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
	template: [['%td', { $key: 'name' }], ['%td'], ['%td'], ['%td', { $key: 'network' }]],
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
		distro.player.play(this.model);
	}
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
		$backing.width(this.position * 100 + '%');
		if (actuated === true) {
			callback.call(this, this.position);
		}
	}
	this.enable = function(){
		$slider.addClass('enabled');
	}
	this.disable = function(){
		$slider.removeClass('enabled');
	}
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
}

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

distro.lightbox = new (function(){
	function Lightbox(){
		var self = this;
		this.$lightbox = $('#lightbox');
		this.$contentWrapper = $('#lightboxWrapper');
		this.$contentWrapper.delegate('.close.button', 'click', function(){
			self.hide();
		});
		$(document).keyup(function(e){
			if(e.keyCode == 27){
				self.hide();
				return false;
			}
		});
		this.$lightbox.click(function(e){
			self.hide();
			return false;
		})

		$(document).bind('keyup', function(e){
			if(e.keyCode == 107 || e.keyCode == 187){
				if(document.location.hash == ""){
					document.location.hash = "/find";
				}
			}
		});
	}
	Lightbox.prototype.show = function(content){
		var self = this;
		this.$contentWrapper.fadeOut(200).queue(function(next){
			var $content;
			self.hideContent();
			$content = $('<div>', { 'class': 'lightboxContent' });
			self.content = content;
			self.$contentWrapper.html($content);
			content.show($content, self);
			Backbone.history.saveLocation('/' + content.name);
			document.title = content.longName ? (content.longName + ' - ' + distro.TITLE) : distro.TITLE;
			next();
		}).fadeIn(200);
		this.$lightbox.fadeIn(200);
	}
	Lightbox.prototype.hide = function(name){
		if (!name || (this.content && name === this.content.name)) {
			var self = this;
			this.$lightbox.fadeOut(200);
			this.$contentWrapper.fadeOut(200, function(){
				self.hideContent();
			});
			Backbone.history.saveLocation('');
			document.title = distro.TITLE;
		}
	}
	Lightbox.prototype.hideContent = function(){
		if (this.content) {
			this.content.hide && this.content.hide(this);
			this.content = null;
		}
		this.$contentWrapper.empty();
	}
	return Lightbox;
}())();

// Login/registration lightbox
(function(){
	distro.global.bind('change:user', function(model, user){
		if (user) {
			distro.lightbox.hide('login');
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
					player.current.setPosition(position * player.current.duration);
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
			currentTime.data = distro.util.formatTime(Math.floor(this.position/1000));
			totalTime.data = distro.util.formatTime(Math.floor(this.duration/1000));
			slider.setPosition(this.position/this.duration);
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
					onstop: onstop,
					onfinish: onfinish,
					whileplaying: onwhileplaying
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
		this.url = 'networks/' + opts.name;
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
										["%a",{$key:"photoCredURL", $test: {target:"_blank", href:{ $key: "photoCredURL"}, style:"text-decoration:none;"}}, { $key: "photoCred"}]
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
									["%ul.presence", {$test: {$key: "email"}, $if:["%li.email", ["%a", {target:"_blank"}]]}, { $key: 'presence', $children: [
										['%li', { 'class': { $key: 'name' } }, ['%a', { target:"_blank", href: { $key: 'url' } }]]
									] } ]
								] },
								["%div", {style:"height: 1em; background-color: #212121;"}],
								[".content", {$test: {$key: "calendarGoogle"}, $if:["%iframe#calFrame", {frameborder: "0", src: {$key:"calendarGoogle", $handler: function(){ return "http://google.com/"+this+"&showTitle=0&&showNav=0&&showDate=0&&showPrint=0&&showTabs=0&&showCalendars=0&&showTz=0&&mode=AGENDA&&height=300&&wkst=1&&bgcolor=%23ffffff&&color=%23000000";}}}]}],
								[".subscribeButton", { 'class': { $key:'', $handler: function(){ return subscribed ? 'disabled' : '' } }, type: "button", $:{$:function(){ $subscribeButton = this }}}, [".label"], "^", { $key: 'name' }, "^"]
							]
						]
					], model.attributes);
					$subscribeButton.click(function(){
						if (!subscribed) {
							distro.library.subscriptions.create({name:model.name}, {
								success: function(){
									subscribed = true;
									$subscribeButton.addClass('disabled');
								}
							});
						}
					});
				}
			});
			callback(model);
		},
		error: function(){
			alert("There's no network by this name");
			callback(null);
		}
	});
}

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
	find: function(){
		distro.lightbox.show({
			name: "find",
			longName: "Find a network",
			show: function($content){
				var $field, $text, $placeholder;
				$content.attr('id', 'networkSearch');
				$content.haml([
					['%span.close.button', 'x'],
					['.search',
						['%span.field', {$:{$:function(){ $field = this; }}}, '^',
							['%span.text', { contenteditable: 'plaintext-only', $:{$:function(){ $text = this; }}}],
							['%span.placeholder', {$:{$:function(){ $placeholder = this; }}}, distro.loc.str('findNetworks.placeholder')],
						'^' ]
					]
				]);
				$field.click(function(e){
					if (e.target != $text[0]) {
						$text.focus();
						return false;
					}
				});
				$text.focus(function(){
					$placeholder.hide();
					$field.addClass('focus');
				});
				$text.blur(function(){
					if(!$text.text()){
						$placeholder.show();
					}
					$field.removeClass('focus');
				});
				$text.keydown(function(e){
					var search;
					if (e.keyCode === 13){
						if ((search = $text.text())) {
							distro.loadLandingPage($text.text(), function(){});
						}
						return false;
					} else if (e.keyCode === 32) {
						document.execCommand('InsertHTML', false, '_');
						return false;
					}
				})
			}
		});
	},
	login: function(){
		if (distro.global.get('user')) {
			window.location.hash = '';
			return;
		}
		distro.lightbox.show({
			name: 'login',
			longName: 'Login',
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
						distro.request(register ? 'register' : 'login', 'POST', {email: email, password: password}, new Hollerback({
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

// Initialization
distro.init(function(){
	
	distro.loc.replacePlaceholders();
	
	$('#logOut').click(function(){
		distro.library.subscriptions.refresh([]);
		distro.library.tracks.refresh([]);
		distro.request('logout', 'POST', null, new Hollerback({}));
	});

	// Miscellaneous UI
	$('.button').live('mousedown', function(e){
		e.preventDefault();
	});
	
	distro.router = new distro.Router();
	distro.library.refresh(function(){
		Backbone.history.start();
	});
});
