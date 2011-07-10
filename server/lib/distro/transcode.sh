#!/bin/bash

INPUT_FILE="$1"
OUTPUT_FILE="$2"

lame -V3 "$INPUT_FILE" "$OUTPUT_FILE"
id3cp -wn "$INPUT_FILE" "$OUTPUT_FILE"

echo "Input: $INPUT_FILE"
echo "Output: $OUTPUT_FILE"