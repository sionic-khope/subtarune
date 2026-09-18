#!/bin/bash
cd "$(dirname "$0")/../../.."
A=assets/source/ajimkiya-v1
for i in 1 2 3 4; do python3 tools/sprites/imagegen.py generate --quality high --size 1024x1024 --prompt-file $A/ajimkiya$i.prompt.txt --ref $A/dance-ref.png --out $A/ajimkiya$i-raw.png; done
echo ALLDONE
