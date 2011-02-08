#!/bin/bash

IMPORT_CSV=`mktemp -t distro-import`

if [[ -z $AUTH_TOKEN ]]; then
	echo "I require additional AUTH_TOKEN"
	exit 1
fi

curl -o $IMPORT_CSV -H "Authorization: GoogleLogin auth=$AUTH_TOKEN" "https://spreadsheets.google.com/feeds/download/spreadsheets/Export?key=0AmyNHOrLqvkjdC1fQ29RZnNVbXNDYlMzRFcxbnhqamc&exportFormat=csv&gid=0" &&
mongoimport -d Import -c import --type csv --headerline --drop --ignoreBlanks --file $IMPORT_CSV &&
node NetworkImport.js

rm $IMPORT_CSV