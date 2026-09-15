#!/bin/bash
# 섭리오 168 몬스터 8종(2×2 플랫포머 시트). 판테온 차징 프레임 생성이 끝난 뒤 순차 실행.
cd "$(dirname "$0")/../../.."
J=assets/source/subrio168
while pgrep -f "pantheon_charge.prompt.txt" > /dev/null; do sleep 5; done
gen() { /usr/bin/python3 tools/sprites/imagegen.py generate --prompt-file "$J/$1/$1.prompt.txt" --ref "$J/refs/$1-ref.png" --size 1024x1024 --quality high --out "$J/$1/$1-raw.png" >> "$J/generate.log" 2>&1; echo "$1 exit $?" >> "$J/generate.log"; }
for n in raptor wolf gromp krug scuttle cannon red blue; do gen $n; done
echo ALL_DONE >> "$J/generate.log"
