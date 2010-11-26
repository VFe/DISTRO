var map = new google.maps.Map(document.getElementById('mapView'), {
	center:new google.maps.LatLng(40.75077484633399, -73.97370076113282),
	zoom: 11,
	mapTypeId: google.maps.MapTypeId.ROADMAP,
	disableDefaultUI:true,
	navigationControl:true});
function createMapMarker(position, color){
	return new google.maps.Marker({position: position, icon:"http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=|"+color+"|000000", shadow: new google.maps.MarkerImage("http://chart.apis.google.com/chart?chst=d_map_pin_shadow", null, null, new google.maps.Point(12, 36))});
}

// Info box
var infoBox = {
	$infoBox: $('#infoBox'),
	content: {
		startup: $('<div class="infoBoxContent" id="howItWorksPoster"><div id="howItWorksClickie" class="button">HOW IT WORKS<span>&#x25BA;</span></div></div>'),
		welcomeVideo: $('<iframe class="infoBoxContent" src="http://player.vimeo.com/video/16314259?title=0&amp;byline=0&amp;portrait=0&amp;autoplay=1" frameborder="0"></iframe>')
	},
	current: null,
	show: function(key){
		if (this.current != key) {
			this.$infoBox.contents().detach();
			this.$infoBox.html(this.content[key]);
			this.current = key;
		}
	}
};
infoBox.show('startup');

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
		infoBox.content.trackDetails = this.el;
		this.model.bind('change:selection', this.update);
	},
	update: function(){
		if (this.model.attributes.selection) {
			this.placeholder.update(this.model.attributes.selection.toJSON());
			infoBox.show('trackDetails');
		} else {
			infoBox.show('startup');
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

// Initialization
var tracks = new Backbone.Collection(),
	player = new Player(),
	musicListView = new MusicListView({model: tracks, el:$('#musicTableBody tbody:first')[0]});

var kyleTracks = [
	{
		name: "Chez",
		artist: "iheyouweyouthey",
		album: "i | he | you | we | you | they",
		source: "kylemarler",
		freshness: "new",
		time: "4:11",
	},
	{
		name: "Crafty",
		artist: "iheyouweyouthey",
		album: "i | he | you | we | you | they",
		source: "kylemarler",
		freshness: "new",
		time: "2:32"
	},
	{
		name: "Jay-Z",
		artist: "iheyouweyouthey",
		album: "i | he | you | we | you | they",
		source: "kylemarler",
		freshness: "new",
		time: "1:29"
	},
	{
		name: "Nina",
		artist: "iheyouweyouthey",
		album: "i | he | you | we | you | they",
		source: "kylemarler",
		freshness: "new",
		time: "0:44"
	},
	{
		name: "Push It",
		artist: "iheyouweyouthey",
		album: "i | he | you | we | you | they",
		source: "kylemarler",
		freshness: "new",
		time: "2:38"
	},
	{
		name: "Swifty",
		artist: "iheyouweyouthey",
		album: "i | he | you | we | you | they",
		source: "kylemarler",
		freshness: "new",
		time: "2:21"
	}
];
var kyleShow = {
	pin: createMapMarker(new google.maps.LatLng(40.746485, -73.996001), 'E54C46'),
	venue: "DTHQ",
	network: "kylemarler",
	when: "Tonight, 7:00 P.M.",
	price: "$5"
};

// var MapView = Backbone.View.extend({
// 	initialize: function() {
// 		_.bindAll(this, 'add', 'remove', 'refresh', 'play', 'select');
// 		this.model.bind('add', this.add);
// 		this.model.bind('remove', this.remove);
// 		this.model.bind('refresh', this.refresh);
// 		this.pins = [];
// 		this.refresh();
// 	},
// 	add: function(newObject){
// 		var color, pin;
// 		switch(newObject.newness)
// 		var pin = createMapMarker
// 		var $container = $('<div>'), newItem;
// 		$container.stencil(this.template, newObject.toJSON());
// 		newItem = $container.children(':first')[0];
// 	
// 		newObject.element = newItem;
// 		$(newItem).data('model', newObject);
// 		this.map.push({element: newItem, model: newObject});
// 		this.$foot.before(newItem);
// 	},
// 	remove: function(removed){
// 		_.each(this.map, function(item){
// 			if (item.model == removed) {
// 				item.element.remove();
// 				this.map.splice(index, 1);
// 				_.breakLoop();
// 			};
// 		});
// 	},
// 	refresh: function(){
// 		var item;
// 		while((item = this.map.pop())){
// 			item.element.remove();
// 		}
// 		this.model.each(this.add);
// 	},
// 	play: function(e){
// 		var $target = $(e.target).closest('tr:not(.filler)'), trackModel;
// 		if ($target.length) {
// 			if ((trackModel = $target.data('model'))) {
// 				player.start(this.fileNamesForModel(trackModel), this.callbacks, {model: trackModel});
// 			}
// 		}
// 	},
// 	select: function(e){
// 		var $target = $(e.target).closest('tr');
// 		this.selection.set({selection: ($target.is(':not(.filler)') ? $target.data('model') : null)});
// 	},
// });

var displayShowInfo = (function(){
	var $showInfoContainer = $('<div/>', {id:'showInfo', 'class':'infoBoxContent'});
	var showInfoPlaceholder = $.haml.placeholder(stencil.placeholder([
		['.networkName', '^', {key:'network'}, '^'], ['%dl',
			['%dt', 'Where?'], ['%dd', {key:'venue'}],
			['%dt', 'When?'], ['%dd', {key:'when'}],
			['%dt', 'How much?'], ['%dd', {key:'price'}]
	]]));
	
	$showInfoContainer.append(showInfoPlaceholder.inject());
	infoBox.content.showInfo = $showInfoContainer;
	
	return function(show){
		showInfoPlaceholder.update(show);
		infoBox.show('showInfo');
	}
})()

// Tour
function TourController(){
	this.$tour = $('#tour');
	this.$tourContent = $('#tourContent');
	this.$tour.find('button:first').click(_.bind(function(){
		this.go(this.stage+1);
	}, this));
	this.go(0);
	
};
TourController.prototype.go = function(stage){
	var scene = TourController.stages[stage];
	if(scene){
		this.$tour.fadeOut(_.bind(function(){
			this.$tourContent.empty().haml(stencil(scene.template));
			this.$tour.attr('class', (scene.className || '') + (scene.advance === "manual" ? '' : ' wait'))
				.attr('style', '');
			if (scene.style) {
				this.$tour.css(scene.style);
			}
			this.stage = stage;
			if (scene.callback) {
				scene.callback();
			}
			this.$tour.hide().fadeIn();
		}, this));
	} else {
		this.$tour.fadeOut();
	}
};
TourController.prototype.advance = function(key){
	if (TourController.stages[this.stage] && key === TourController.stages[this.stage].advance) {
		this.go(this.stage + 1);
	}
}
TourController.stages = [
	{
		template: [
			['%h1', 'Welcome to DISTRO!'],
			['%p', 'This ', ['%b', 'preview'], " shows off some of DISTRO's core functionality, but it's not finished. Many features aren't in place."],
			['%p', "It works in up-to-date versions of some web browsers (the final product will work in more), so please make sure you're testing using one of these:"],
			['%table', {border: "0", cellspacing: "0", cellpadding: "5", style: "width: 100%"},
				['%tr', {align: "center"},
					['%td', ['%a', {href:"http://www.google.com/chrome"}, ['%img', {width: '100', height: '100', src: 'images/browsers/chrome.png'}]]],
					['%td', ['%a', {href:"http://www.apple.com/safari/"}, ['%img', {width: '100', height: '100', src: 'images/browsers/safari.png'}]]],
					['%td', ['%a', {href:"http://www.mozilla.com/firefox/"}, ['%img', {width: '100', height: '100', src: 'images/browsers/firefox.png'}]]]
				],
				['%tr', {align: "center"},
					['%td', 'Chrome (best)'],
					['%td', 'Safari'],
					['%td', 'Firefox']
				]
			],
			['%p', ['%b', "Click the \u201cnext\u201d button to get started:"]]
		],
		style: {top: '8em',  left: '7em'},
		advance: 'manual'
	},
	{
		template: [
			['%p', "You connect with artists on DISTRO by subscribing to their networks. Try searching for ", ['%b', '^kylemarler^'], "'s network."]
		],
		style: {right: '25em', top: '4em'},
		advance: 'selectNetwork',
		className: 'upRight'
	},
	{
		template: [
			['%p', 'This network has two subscription tiers. The paid tier features exclusive recordings, a starter set of songs, and a concert ticket, but even the free tier keeps you up to speed with the band\'s latest work and upcoming shows.'],
			['%p', 'Try subscribing to the free tier.']
		],
		advance: 'subscribeNetwork',
		style: {width: "15em", top: "5em", left: "0em"}
	},
	{
		template: [
			['%p', 'Great! You just joined ^kylemarler^\'s network, and already have music in your library.'],
			['%p', 'You can start listening right now. Double-click a track to play it.']
		],
		advance: 'startedPlayback',
		style: {width: "20em", top: "9em", right: "25em"}
	},
	{
		template: [
			['%p', 'While you\'re a subscriber, new music published by the network creator will show up automatically in your library as it\'s published.'],
			['%p', 'DISTRO music is downloadable, DRM-free, and yours to keep forever.']
		],
		advance: 'manual',
		callback: function(){
			function pushSongs(){
				tracks.add(kyleTracks.shift());
				if (kyleTracks.length) {
					setTimeout(pushSongs, 5000);
				}
			}
			setTimeout(pushSongs, 700);
		},
		style: {width: "20em", top: "11em", right: "25em"}
	},
	{
		template: [
			['%p', 'The red marker on the map means that ^kylemarler^ has an event at this venue within the next 24 hours. You can click on the marker to see the details.'],
		],
		advance: 'mapDetails',
		style: {width: "20em", top: "32em", right: "28em"}
	},
	{
		template: [
			['%p', 'You can also subscribe to networks created by blogs, magazines, venues, and concert promoters. The new music they select for you will be automatically delivered to your library.']
		],
		advance: 'manual',
		style: {width: "25em", top: "15em", left: "20em"}
	},
	{
		template: [
			['%p', "Now is your chance to create a network of your own! Click \u201cnew network\u201d to get started."]
		],
		style: {width: "20em", right: '30em', top: '11em'},
		advance: 'startCreatingNetwork',
		className: 'upRight'
	},
	{
		template: [
			['%p', "Name your network and decide how many subscription tiers to offer. You can set payment amounts and describe what each includes."]
		],
		style: {width: "15em", top: "5em", left: "0em"},
		advance: 'finishCreatingNetwork'
	},
	{
		template: [
			['%p', "In the full release of DISTRO, artists can upload new music simply by dragging it to their library, and broadcast it to their networks with the click of a button."],
		],
		style: {width: "25em", top: "15em", left: "20em"},
		advance: 'manual'
	},
	{
		template: [
			['%p', "Finally, let's try announcing a new show to your subscribers."],
			['%p', "Search for an address or venue on the map."],
		],
		style: {width: "25em", top: "25em", left: "20em"},
		advance: 'foundVenue'
	},
	{
		template: [
			['%p', "Now, click \u201cnew show\u201d to add an event there to your network."],
		],
		style: {width: "25em", top: "25em", left: "20em"},
		advance: 'enteredEvent'
	},
	{
		template: [
			['%p', "Now, all of your best fans know where to show up."],
			['%p', "That concludes our brief tour. Enjoy the music, as always."]
		],
		style: {width: "25em", top: "25em", left: "20em"},
		advance: 'manual'
	}
];
var tour = new TourController();

// Miscellaneous UI
$('.button').live('mousedown', function(e){
	e.preventDefault();
});
$('a').live('click', function(e){
	if (this.href.indexOf('#') !== -1) {
		e.preventDefault();
	};
});
$('#howItWorksClickie').click(function(){
	infoBox.show('welcomeVideo');
});
$('#networkSearch').bind('keyup', function(){
	$el = $(this);
	if(tour.stage === 1 && $el.val().length){
		$('#networkSearchResults').show();
	} else {
		$('#networkSearchResults').hide();
	}
});
$('#networkSearchResults').click(function(){
	$('#networkSearch').val('');
	$(this).hide();
	tour.advance('selectNetwork');
	$('#lightbox').addClass('kmNetwork');
});
$('#kmNetworkSubscribe').click(function(){
	$('#lightbox').removeClass('kmNetwork');
	tour.advance('subscribeNetwork');
	tracks.add(kyleTracks.shift());
	tracks.add(kyleTracks.shift());
	kyleShow.pin.setMap(map);
	google.maps.event.addListener(kyleShow.pin, 'click', function(){
		displayShowInfo(kyleShow);
		tour.advance('mapDetails');
	})
});
$('#newNetworkButton').click(function(){
	if (tour.stage === 7) {
		tour.advance('startCreatingNetwork');
		$('#lightbox').addClass('newNetwork');
	}
});
var revealSubscriptions = (function(){
	var $newNetwork = $('#newNetworkBox:first'), $subscriptionTier = $newNetwork.children('.subscriptionTier:first'), i = 4;
	while(i--){
		$subscriptionTier.after($subscriptionTier.clone());
	}
	return function(count){
		var $children = $newNetwork.children('.subscriptionTier').hide();
		while(count--){
			$children.eq(count).show();
		}
	}
})();
revealSubscriptions(2);
$('#tierSelection').delegate('li', 'click', function(){
	var $this = $(this), val = parseInt($this.text(), 10);
	if (!isNaN(val)) {
		revealSubscriptions(val)
	};
	$this.parent().children('.selected').removeClass('selected');
	$this.addClass('selected');
});
$('#newNetworkBox').delegate('input.payWhatYouLike', 'change', function(){
	var $moneyField = $(this).closest('.subscriptionTier').find('.price');
	if (this.checked) {
		$moneyField.attr("disabled", "disabled");
	} else {
		$moneyField.removeAttr("disabled");
	}
});
$('#createNetwork').click(function(){
	if ($('#newNetworkName').val() && $('#newNetworkLocation').val()) {
		tour.advance('finishCreatingNetwork');
		$('#lightbox').removeClass('newNetwork');
	} else {
		alert('Please enter a network name and location.');
	}
});
var lastPin = null
$('#mapSearch').keyup((function(){
	var geocoder = new google.maps.Geocoder();
	
	return function(e){
		if (!this.value){
			lastPin && lastPin.setMap(null);
		} else if (e.keyCode === 13) {
			lastPin && lastPin.setMap(null);
			geocoder.geocode({address:$(this).val()}, function(results, status){
				if (status === "OK" && results.length) {
					var position = results[0].geometry.location;
					lastPin = new google.maps.Marker({position: position});
					lastPin.setMap(map);
					map.panTo(position);
					tour.advance('foundVenue');
				}
			})
		}
	}
})());
$('#newShowButton').click(function(){
	if(tour.stage === 11){
		$('#addEventHead').text("New ^"+$('#newNetworkName').val()+"^ event");
		$('#venueEventField').val($('#mapSearch').val());
		$('#newEventForm').fadeIn();
	}
});
$('#addEvent').click(function(){
	$('#newEventForm').fadeOut();
	lastPin.setMap(null);
	var pin = createMapMarker(lastPin.getPosition(), 'E54C46');
	pin.setMap(map);
	tour.advance('enteredEvent');
	google.maps.event.addListener(pin, 'click', function(){
		displayShowInfo({
			venue: $('#venueEventField').val(),
			network: $('#newNetworkName').val(),
			when: $('#dateEventField').val() + ', ' + $('#timeEventField').val(),
			price: $('#costEventField').val()
		});
		tour.advance('mapDetails');
	})
	
})