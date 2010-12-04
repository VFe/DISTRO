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

// Initialization
var tracks = new Backbone.Collection(),
	player = new Player(),
	musicListView = new MusicListView({model: tracks, el:$('#musicTableBody tbody:first')[0]});

// Miscellaneous UI
$('.button').live('mousedown', function(e){
	e.preventDefault();
});
$('a').live('click', function(e){
	if (this.href.indexOf('#') !== -1) {
		e.preventDefault();
	};
});