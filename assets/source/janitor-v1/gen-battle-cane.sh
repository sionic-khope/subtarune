#!/bin/bash
cd "$(dirname "$0")/../../.."
D=assets/source/janitor-v1
python3 tools/sprites/imagegen.py generate --quality high --size 1024x1024 --prompt-file $D/battle-cane-idle.prompt.txt --ref $D/battle-cane-ref.png --out $D/battle-cane-idle-raw.png
python3 tools/sprites/imagegen.py generate --quality high --size 1536x1024 --prompt-file $D/battle-cane-run.prompt.txt --ref $D/battle-cane-ref.png --out $D/battle-cane-run-raw.png
python3 tools/sprites/imagegen.py generate --quality high --size 1024x1024 --prompt-file $D/battle-cane-attack.prompt.txt --ref $D/battle-cane-ref.png --out $D/battle-cane-attack-raw.png
echo ALLDONE
