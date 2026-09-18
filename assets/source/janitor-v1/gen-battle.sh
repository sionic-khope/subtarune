#!/bin/bash
cd "$(dirname "$0")/../../.."
D=assets/source/janitor-v1
python3 tools/sprites/imagegen.py generate --quality high --size 1024x1024 --prompt-file $D/battle-idle.prompt.txt --ref $D/battle-ref.png --out $D/battle-idle-raw.png
python3 tools/sprites/imagegen.py generate --quality high --size 1536x1024 --prompt-file $D/battle-run.prompt.txt --ref $D/battle-ref.png --out $D/battle-run-raw.png
python3 tools/sprites/imagegen.py generate --quality high --size 1024x1024 --prompt-file $D/battle-attack.prompt.txt --ref $D/battle-ref.png --out $D/battle-attack-raw.png
python3 tools/sprites/imagegen.py generate --quality high --size 1024x1024 --prompt-file $D/battle-down.prompt.txt --ref $D/battle-ref.png --out $D/battle-down-raw.png
echo ALLDONE
