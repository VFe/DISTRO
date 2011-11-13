import sys
from mutagen.easyid3 import EasyID3
from mutagen.mp3 import MP3
from hashlib import md5
import json

if len(sys.argv) != 2:
	print 'usage: not like that'
	sys.exit(1);

file = sys.argv[1]

audio = MP3(file, ID3=EasyID3)
out = dict()
out['tags'] = dict(audio)
out['length'] = audio.info.length

md5sum = md5()
chunk_size = 128 * md5sum.block_size
with open(file,'rb') as f:
    for chunk in iter(lambda: f.read(chunk_size), ''):
         md5sum.update(chunk)
out['md5'] = md5sum.hexdigest()

print json.dumps(out)