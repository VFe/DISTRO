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
						"src":"http://distro-static.s3.amazonaws.com/IE/UH_OH.jpg",
						"width":"510",
						"height":"450"
					}
				]
			],
			[".rightContent",
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
$(document.body).css({'background-image':'url(\'https://s3.amazonaws.com/distro-static/IE/IEBG.jpg\')', 'background-repeat':'no-repeat', 'background-attachment':'fixed', 'background-position':'top left'});
$('#top').hide();
$('#bottom').hide();
$('#content').hide();
$('#lightboxWrapper').haml(ieWarn);
$('#lightboxWrapper').show();
