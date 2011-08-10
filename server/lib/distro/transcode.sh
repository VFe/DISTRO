#!/bin/bash

if [[ $INPUT_FILE && $OUTPUT_FILE ]]
then
	lame --silent -V3 "$INPUT_FILE" "$OUTPUT_FILE" || exit $?
else
	exit 1
fi
# if [[ $IS_WAV ]]; then
# 	id3cp -wn "$INPUT_FILE" "$OUTPUT_FILE" || exit $?
# fi

echo "Input: $INPUT_FILE"
echo "Output: $OUTPUT_FILE"