var tracks = {
	kyle_marler: [
		{
			"name" : "Released before subscription (FAIL)",
			"release" : new Date("Mon Nov 30 2009 19:00:00 GMT-0500 (EST)"),
			"onDeck" : [ ],
		},
		{
			"name" : "Chez (On deck)",
			"filename" : "Chez",
			"release" : new Date("Mon Nov 30 2009 19:00:00 GMT-0500 (EST)"),
			"onDeck" : [
				{
					"start" : new Date("Mon Nov 30 2009 19:00:00 GMT-0500 (EST)")
				}
			],
		},
		{
			"name" : "On deck in the past (FAIL)",
			"release" : new Date("Mon Nov 30 2009 19:00:00 GMT-0500 (EST)"),
			"onDeck" : [
				{
					"start" : new Date("Mon Nov 30 2009 19:00:00 GMT-0500 (EST)"),
					"end" : new Date("Fri Dec 04 2009 19:00:00 GMT-0500 (EST)")
				}
			],
		},
		{
			"name" : "Released in the future (FAIL)",
			"release" : new Date("Sun Nov 30 3000 19:00:00 GMT-0500 (EST)"),
			"onDeck" : [ ],
		},
		{
			"name" : "Crafty (Released during first subscription)",
			"filename" : "Crafty",
			"release" : new Date("Sun Jan 31 2010 19:00:00 GMT-0500 (EST)"),
			"onDeck" : [ ],
		},
		{
			"name" : "Released between subscriptions (FAIL)",
			"release" : new Date("Wed Jun 30 2010 20:00:00 GMT-0400 (EDT)"),
			"onDeck" : [ ],
		},
		{
			"name" : "Jay-Z (Released during second subscription)",
			"filename" : "Jay-Z",
			"release" : new Date("Thu Sep 30 2010 20:00:00 GMT-0400 (EDT)"),
			"onDeck" : [ ],
		},
		{
			"name" : "Track 09",
			"filename" : "09 Track 09",
			"release" : new Date("Thu Sep 30 2010 20:00:00 GMT-0400 (EDT)"),
			"onDeck" : [
				{
					"start" : new Date("Thu Sep 30 2010 20:00:00 GMT-0400 (EDT)")
				}
			],
		},
		{
			"name" : "Track 12",
			"filename" : "12 Track 12",
			"release" : new Date("Thu Sep 30 2010 20:00:00 GMT-0400 (EDT)"),
			"onDeck" : [
				{
					"start" : new Date("Thu Sep 30 2010 20:00:00 GMT-0400 (EDT)")
				}
			],
		},
		{
			"name" : "Track 18",
			"filename" : "18 Track 18",
			"release" : new Date("Thu Sep 30 2010 20:00:00 GMT-0400 (EDT)"),
			"onDeck" : [
				{
					"start" : new Date("Thu Sep 30 2010 20:00:00 GMT-0400 (EDT)")
				}
			],
		}
	],
	DJJMMJAMC: [
		{
			"name" : "Mess",
			"filename" : "01 Mess",
			"release" : new Date("Thu Sep 30 2010 20:00:00 GMT-0400 (EDT)"),
			"onDeck" : [
				{
					"start" : new Date("Thu Sep 30 2010 20:00:00 GMT-0400 (EDT)")
				}
			],
		}
	],
	aidswolf: [
		{
			"name" : "Ch-ch-ch-chatter",
			"filename" : "04 Ch-ch-ch-chatter",
			"release" : new Date("Thu Sep 30 2010 20:00:00 GMT-0400 (EDT)"),
			"onDeck" : [
				{
					"start" : new Date("Thu Sep 30 2010 20:00:00 GMT-0400 (EDT)")
				}
			],
		}
	],
	anamanaguchi: [
		{
			"name" : "Mess",
			"filename" : "01 Mess",
			"release" : new Date("Thu Sep 30 2010 20:00:00 GMT-0400 (EDT)"),
			"onDeck" : [
				{
					"start" : new Date("Thu Sep 30 2010 20:00:00 GMT-0400 (EDT)")
				}
			],
		}
	],
	autreneveut: [
		{
			"name" : "OMG",
			"filename" : "02 - OMG",
			"release" : new Date("Thu Sep 30 2010 20:00:00 GMT-0400 (EDT)"),
			"onDeck" : [
				{
					"start" : new Date("Thu Sep 30 2010 20:00:00 GMT-0400 (EDT)")
				}
			],
		},
		{
			"name" : "Two Days Of Rain",
			"filename" : "04 - Two Days Of Rain",
			"release" : new Date("Thu Sep 30 2010 20:00:00 GMT-0400 (EDT)"),
			"onDeck" : [
				{
					"start" : new Date("Thu Sep 30 2010 20:00:00 GMT-0400 (EDT)")
				}
			],
		},
		{
			"name" : "Emotional",
			"filename" : "06 - Emotional",
			"release" : new Date("Thu Sep 30 2010 20:00:00 GMT-0400 (EDT)"),
			"onDeck" : [
				{
					"start" : new Date("Thu Sep 30 2010 20:00:00 GMT-0400 (EDT)")
				}
			],
		},
		{
			"name" : "Demoneyez",
			"filename" : "09 - Demoneyez",
			"release" : new Date("Thu Sep 30 2010 20:00:00 GMT-0400 (EDT)"),
			"onDeck" : [
				{
					"start" : new Date("Thu Sep 30 2010 20:00:00 GMT-0400 (EDT)")
				}
			],
		}
	],
	issueprojectroom: [
		{
			"name" : "My Body",
			"filename" : "03 My Body",
			"release" : new Date("Thu Sep 30 2010 20:00:00 GMT-0400 (EDT)"),
			"onDeck" : [
				{
					"start" : new Date("Thu Sep 30 2010 20:00:00 GMT-0400 (EDT)")
				}
			],
		},
		{
			"name" : "Can't See My Own Face",
			"filename" : "06 Can't See My Own Face",
			"release" : new Date("Thu Sep 30 2010 20:00:00 GMT-0400 (EDT)"),
			"onDeck" : [
				{
					"start" : new Date("Thu Sep 30 2010 20:00:00 GMT-0400 (EDT)")
				}
			],
		},
		{
			"name" : "Lover's Start",
			"filename" : "11 Lover's Start",
			"release" : new Date("Thu Sep 30 2010 20:00:00 GMT-0400 (EDT)"),
			"onDeck" : [
				{
					"start" : new Date("Thu Sep 30 2010 20:00:00 GMT-0400 (EDT)")
				}
			],
		},
	],
	nonhorse: [
		{
			"name" : "Side A",
			"filename" : "01 Side A",
			"release" : new Date("Thu Sep 30 2010 20:00:00 GMT-0400 (EDT)"),
			"onDeck" : [
				{
					"start" : new Date("Thu Sep 30 2010 20:00:00 GMT-0400 (EDT)")
				}
			],
		},
		{
			"name" : "Side B",
			"filename" : "02 Side B",
			"release" : new Date("Thu Sep 30 2010 20:00:00 GMT-0400 (EDT)"),
			"onDeck" : [
				{
					"start" : new Date("Thu Sep 30 2010 20:00:00 GMT-0400 (EDT)")
				}
			],
		}
	],
	silentbarn: [
		{
			"name" : "Long Flight",
			"filename" : "02 Long Flight",
			"release" : new Date("Thu Sep 30 2010 20:00:00 GMT-0400 (EDT)"),
			"onDeck" : [
				{
					"start" : new Date("Thu Sep 30 2010 20:00:00 GMT-0400 (EDT)")
				}
			],
		},
		{
			"name" : "Swept Inside",
			"filename" : "06 Swept Inside",
			"release" : new Date("Thu Sep 30 2010 20:00:00 GMT-0400 (EDT)"),
			"onDeck" : [
				{
					"start" : new Date("Thu Sep 30 2010 20:00:00 GMT-0400 (EDT)")
				}
			],
		},
		{
			"name" : "Inch Of Dust",
			"filename" : "07 Inch Of Dust",
			"release" : new Date("Thu Sep 30 2010 20:00:00 GMT-0400 (EDT)"),
			"onDeck" : [
				{
					"start" : new Date("Thu Sep 30 2010 20:00:00 GMT-0400 (EDT)")
				}
			],
		},
		{
			"name" : "As I Fall",
			"filename" : "09 As I Fall",
			"release" : new Date("Thu Sep 30 2010 20:00:00 GMT-0400 (EDT)"),
			"onDeck" : [
				{
					"start" : new Date("Thu Sep 30 2010 20:00:00 GMT-0400 (EDT)")
				}
			],
		}
	],
	toddp: [
		{
			"name" : "Pagan Dawn",
			"filename" : "02 Pagan Dawn",
			"release" : new Date("Thu Sep 30 2010 20:00:00 GMT-0400 (EDT)"),
			"onDeck" : [
				{
					"start" : new Date("Thu Sep 30 2010 20:00:00 GMT-0400 (EDT)")
				}
			],
		},
		{
			"name" : "Untitled",
			"filename" : "04 Untitled",
			"release" : new Date("Thu Sep 30 2010 20:00:00 GMT-0400 (EDT)"),
			"onDeck" : [
				{
					"start" : new Date("Thu Sep 30 2010 20:00:00 GMT-0400 (EDT)")
				}
			],
		},
		{
			"name" : "Ecstatic Rite",
			"filename" : "05 Ecstatic Rite",
			"release" : new Date("Thu Sep 30 2010 20:00:00 GMT-0400 (EDT)"),
			"onDeck" : [
				{
					"start" : new Date("Thu Sep 30 2010 20:00:00 GMT-0400 (EDT)")
				}
			],
		},
		{
			"name" : "Untitled",
			"filename" : "07 Untitled",
			"release" : new Date("Thu Sep 30 2010 20:00:00 GMT-0400 (EDT)"),
			"onDeck" : [
				{
					"start" : new Date("Thu Sep 30 2010 20:00:00 GMT-0400 (EDT)")
				}
			],
		},
		{
			"name" : "Behind The Void",
			"filename" : "10 Behind The Void",
			"release" : new Date("Thu Sep 30 2010 20:00:00 GMT-0400 (EDT)"),
			"onDeck" : [
				{
					"start" : new Date("Thu Sep 30 2010 20:00:00 GMT-0400 (EDT)")
				}
			],
		}
	],
	umphreys: [
		{
			"name" : "umpodcast43",
			"filename" : "umpodcast43",
			"release" : new Date("Thu Sep 30 2010 20:00:00 GMT-0400 (EDT)"),
			"onDeck" : [
				{
					"start" : new Date("Thu Sep 30 2010 20:00:00 GMT-0400 (EDT)")
				}
			],
		}
	]
};

var networkIDs = {}

db.tracks.drop();
print("Dropped tracks");
for (var networkName in tracks) {
	var networkTracks = tracks[networkName];
	networkID = db.networks.findOne({ name: networkName })._id;
	print(networkName + ' -> ' + networkID);
	networkIDs[networkName] = networkID;
	networkTracks.forEach(function(track){
		track.network = networkID;
		db.tracks.insert(track);
	});
}

var user = {
	"email" : "test@distro.fm",
	"hash" : "b379af0f1e4242ab55967a8d61a2c1c63eb61aab",
	"salt" : "197d0806",
	"subscriptions" : [
		{
			"network" : networkIDs.kyle_marler,
			"start" : new Date("Tue Dec 08 2009 19:00:00 GMT-0500 (EST)"),
			"end" : new Date("Tue Jun 08 2010 20:00:00 GMT-0400 (EDT)")
		},
		{
			"network" : networkIDs.kyle_marler,
			"start" : new Date("Thu Jul 08 2010 20:00:00 GMT-0400 (EDT)"),
			"end" : new Date("Fri Jul 08 2011 20:00:00 GMT-0400 (EDT)")
		}
	]
};

print('Updating user');
db.users.update({ email: user.email }, user, true);
