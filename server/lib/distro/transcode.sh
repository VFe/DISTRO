#!/bin/bash

if [[$ISWAV && $INPUT_FILE && $OUTPUT_FILE]]
then
	lame -V3 "$INPUT_FILE" "$OUTPUT_FILE"
elif [[$INPUT_FILE && $OUTPUT_FILE]]
then
	lame -V3 "$INPUT_FILE" "$OUTPUT_FILE"
	id3cp -wn "$INPUT_FILE" "$OUTPUT_FILE"
else
	return 1
fi

echo "Input: $INPUT_FILE"
echo "Output: $OUTPUT_FILE"