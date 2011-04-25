#!/bin/bash

IMPORT_CSV=`mktemp -t distro_network_import.XXXXXXXXXX`
TRACK_CSV=`mktemp -t distro_track_import.XXXXXXXXXX`

if [[ -z $AUTH_TOKEN ]]; then
	echo "I require additional AUTH_TOKEN"
	exit 1
fi

if [[ -z $DISTRO_AUTH_TOKEN ]]; then
	echo "I require DISTRO_AUTH_TOKEN"
	exit 1
fi

#Networks Download & Import
curl -sSfo $IMPORT_CSV -H "Authorization: GoogleLogin auth=$AUTH_TOKEN" "https://spreadsheets.google.com/feeds/download/spreadsheets/Export?key=t-_CoQfsUmsCbS3DW1nxjjg&exportFormat=csv&gid=0" &&
mongoimport -d Import -c import --type csv --headerline --drop --ignoreBlanks --file $IMPORT_CSV &&
node NetworkImport.js

#Tracks Download & Import
curl -sSfo $TRACK_CSV -H "Authorization: GoogleLogin auth=$DISTRO_AUTH_TOKEN" "https://spreadsheets.google.com/feeds/download/spreadsheets/Export?key=tkPwAQgtbF6wfxaZWPx1RZQ&exportFormat=csv&gid=0" &&
mongoimport -d Import -c tracks --type csv --headerline --drop --ignoreBlanks --file $TRACK_CSV &&
node TrackImport.js

rm $TRACK_CSV
rm $IMPORT_CSV
