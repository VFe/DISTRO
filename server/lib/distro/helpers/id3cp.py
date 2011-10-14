import sys
from mutagen.mp3 import MP3

if len(sys.argv) != 3:
	print 'usage: not like that'
	sys.exit(1);

inAudio = MP3(sys.argv[1])
outAudio = MP3(sys.argv[2])

outAudio.tags = inAudio.tags

outAudio.save()