{
	networks: [
		{
			_id: new ObjectId("000000000000000000000000"),
			name: "network_1"
		}
	],
	tracks: [
		{
			name: "Released before subscription (FAIL)",
			release: new Date("Dec 01 2009 0:00:00 GMT"),
			onDeck: [ ],
			network: new ObjectId("000000000000000000000000")
		},
		{
			name: "On deck (PASS)",
			release: new Date("Dec 01 2009 0:00:00 GMT"),
			onDeck: [
				{
					start: new Date("Dec 01 2009 0:00:00 GMT")
				}
			],
			network: new ObjectId("000000000000000000000000")
		},
		{
			name: "On deck in the past (FAIL)",
			release: new Date("Dec 01 2009 0:00:00 GMT"),
			onDeck: [
				{
					start: new Date("Dec 01 2009 0:00:00 GMT"),
					end: new Date("Dec 05 2009 0:00:00 GMT")
				}
			],
			network: new ObjectId("000000000000000000000000")
		},
		{
			name: "Released in the future (FAIL)",
			release: new Date("Dec 01 3000 0:00:00 GMT"),
			onDeck: [ ],
			network: new ObjectId("000000000000000000000000")
		},
		{
			name: "Released during first subscription (PASS)",
			release: new Date("Feb 01 2010 0:00:00 GMT"),
			onDeck: [ ],
			network: new ObjectId("000000000000000000000000")
		},
		{
			name: "Released between subscriptions (FAIL)",
			release: new Date("Jul 01 2010 0:00:00 GMT"),
			onDeck: [ ],
			network: new ObjectId("000000000000000000000000")
		},
		{
			name: "Released during second subscription (PASS)",
			release: new Date("Oct 01 2010 0:00:00 GMT"),
			onDeck: [ ],
			network: new ObjectId("000000000000000000000000")
		}
	],
	subscriptions: [
		{
			network: new ObjectId("000000000000000000000000"),
			start:   new Date("Dec 09 2009 0:00:00 GMT"),
			end:     new Date("Jun 09 2010 0:00:00 GMT")
		},
		{
			network: new ObjectId("000000000000000000000000"),
			start:   new Date("Jul 09 2010 0:00:00 GMT"),
			end:     new Date("Jul 09 2011 0:00:00 GMT")
		}
	]
}