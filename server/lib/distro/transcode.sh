#!/bin/bash

if [[ $IS_WAV && $INPUT_FILE && $OUTPUT_FILE ]]
then
	lame -V3 "$INPUT_FILE" "$OUTPUT_FILE" || exit $?
elif [[ $INPUT_FILE && $OUTPUT_FILE ]]
then
	lame -V3 "$INPUT_FILE" "$OUTPUT_FILE" || exit $?
#	id3cp -wn "$INPUT_FILE" "$OUTPUT_FILE" || exit $?
else
	exit 1
fi

echo "Input: $INPUT_FILE"
echo "Output: $OUTPUT_FILE"