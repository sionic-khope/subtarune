#!/bin/bash
# 2차: 관객 띠 + 억빠맨 보컬 시트 재생성(사용자: 입 벌린 게 별로). 1차(generate.sh)가 끝난 뒤 순차.
cd "$(dirname "$0")/../../.."
J=assets/source/stage180
until grep -q ALL_DONE "$J/generate.log" 2>/dev/null; do sleep 5; done
/usr/bin/python3 tools/sprites/imagegen.py generate --prompt-file "$J/audience/audience.prompt.txt" --size 1024x1024 --quality high --out "$J/audience/audience-raw.png" >> "$J/generate2.log" 2>&1; echo "audience exit $?" >> "$J/generate2.log"
/usr/bin/python3 tools/sprites/imagegen.py generate --prompt-file assets/source/band178/ppaman2/ppaman2.prompt.txt --ref assets/source/band178/refs/ppaman-ref.png --size 1024x1024 --quality high --out assets/source/band178/ppaman2/ppaman2-raw.png >> "$J/generate2.log" 2>&1; echo "ppaman2 exit $?" >> "$J/generate2.log"
echo ALL_DONE >> "$J/generate2.log"
