var ieWarn = ["#aboutBox.lightboxContent",
	["%form",
		[".lightboxHeader",
			["%span.close.button", "x"],
			["%h1", "Uh Oh!"]
		],
		[".contentBox",
			[".content.leftContent",
				["%img.photo",
					{
						"src":"http://distro-static.s3.amazonaws.com/TRDD/UH_OH.jpg",
						"width":"510",
						"height":"450"
					}
				]
			],
			[".rightContent",
				["%ul.aboutIcons",
					["%li.FAQ", {"title":"FAQ"},
						["%a", {"href":"#/about/faq"}]
					],
					["%li.About", {"title":"About"},
						["%a", {"href":"#/about/about"}]
					],
					["%li.Contact", {"title":"Contact"},
						["%a", {"href":"#/about/contact"}]
					],
					["%li.Invest", {"title":"Invest"},
						["%a", {"href":"#/about/invest"}]
					],
					["%li.Jobs", {"title":"Jobs"},
						["%a", {"href":"#/about/jobs"}]
					]
				],
				[".content",
					["%div",
						["%h1", "Uh Oh!"],
						["%p", "You appear to be using an old or unsupported browser. We're working on supporting as many browsers as possible, but for right now, please try the site on:"],
						["%ul",
							["%li", ["%a", {"href":"http://www.google.com/chrome/"}, "Chrome"], ["%em", " (preferred)"], " or "],
							["%li", ["%a", {"href":"http://www.apple.com/safari/"}, "Safari"]
						],
						["%span", {"style":"margin-left:-1.5em"}, "However, if you're dead set on using Internet Explorer,"],
						["%li", "check out ",
							["%a", {"href":"http://www.google.com/chromeframe"}, "Google Chrome Frame"], "."]
						]
					]
				]
			]
		]
	]
];
$('#lightboxWrapper').haml(ieWarn);
$('#lightboxWrapper').show();