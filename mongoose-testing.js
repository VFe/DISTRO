var mongoose = require('mongoose'),
  Schema = mongoose.Schema,
  ObjectID = Schema.ObjectID;

var NetworkSchema = new Schema({
	"timestamp" : Date,
	type: String,
	fullname: { type: String, set: function(fullname){
		this.lfullname = fullname.toLowerCase();
		return fullname;
	}},
	location : {
		citystate: String,
		country: String
	},
	presence : {
		homepage: String,
		facebook: String,
		twitter: String,
		flickr: String,
		linkedin: String,
		vimeo: String,
		bandcamp: String,
		blog: String
	},
	email : {
		general: String
	},
	phone: String,
	name: { type: String, set: function(name){
		this.lname = name.toLowerCase();
		return name;
	}},
	photoCred: String,
	lname: String,
	lfullname: String
});

NetworkSchema.publicKeys = ['id', 'type', 'fullname', 'location', 'presence', 'email', 'phone', 'name', 'photoCred'];
NetworkSchema.method('toJSON', function(){
	var out = {};
	console.log('enter');
	this.schema.publicKeys.forEach(function(key){
		if (key in this) {
			out[key] = this[key];
		}
	}, this);
	console.log('exit');
	return out;
});

var Network = mongoose.model('Network', NetworkSchema);

mongoose.connect(process.env['MONGO_NODE_DRIVER_HOST'] ||  'localhost', 'Distro', process.env['MONGO_NODE_DRIVER_PORT'], function(err, db){
	console.log('Alive and well!');
	Network.findOne({}, function(err, res){
//		console.log(JSON.stringify(res.map(function(m){ return m.phone; })));
		console.log('res: ', JSON.stringify(res, null, '\t'));
		console.log('err: ', err);
		mongoose.disconnect();
	});
});