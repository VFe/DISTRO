import sys
from hashlib import md5

if len(sys.argv) != 2:
	print 'usage: not like that'
	sys.exit(1);

file = sys.argv[1]

md5sum = md5()
chunk_size = 128 * md5sum.block_size
with open(file,'rb') as f:
    for chunk in iter(lambda: f.read(chunk_size), ''):
         md5sum.update(chunk)
print md5sum.hexdigest()
