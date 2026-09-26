#!/bin/bash
# HQ candidates: photoNN-a / -b for 10 scenes (06 removed). Retries a blocked request up to 3 times.
cd "$(dirname "$0")/../../../.."
C=assets/source/credits371
one() { n=$1; v=$2
  for try in 1 2 3; do
    python3 tools/sprites/imagegen.py generate --model openai/gpt-image-2.5-sunburst --quality high \
      --prompt-file $C/candidates/prompts/photo$n.txt --ref $C/refs/ref$n.png --size 1024x1536 \
      --out $C/candidates/photo$n-$v.png > $C/candidates/photo$n-$v.log 2>&1 && { echo "ok $n-$v"; return; }
  done; echo "FAIL $n-$v"; }
for group in "01 02" "03 04" "05 07" "08 09" "10 11"; do
  for n in $group; do one $n a & one $n b & done; wait
done
echo ALLDONE
