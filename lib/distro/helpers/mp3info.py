import sys
from mutagen.easyid3 import EasyID3
from mutagen.mp3 import MP3
import json

if len(sys.argv) != 2:
	print 'usage: not like that'
	sys.exit(1);

file = sys.argv[1]

audio = MP3(file, ID3=EasyID3)
out = dict()
out['tags'] = dict(audio)
out['length'] = audio.info.length

print json.dumps(out)