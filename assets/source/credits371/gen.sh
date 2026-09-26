#!/bin/bash
# usage: gen.sh NN [suffix]  -> photoNN-raw<suffix>.png
cd "$(dirname "$0")/../../.."
D=assets/source/credits371
python3 tools/sprites/imagegen.py generate --model openai/gpt-image-2.5-sunburst --quality high \
  --prompt-file $D/prompts/photo$1.txt --ref $D/refs/ref$1.png --size 1024x1536 \
  --out $D/photo$1-raw$2.png > $D/logs/photo$1$2.log 2>&1 || echo "FAIL $1$2"
