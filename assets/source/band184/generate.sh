#!/bin/bash
# 밴드 둥가둥가(idle groove) 4프레임 시트(사용자 2026-09-15: “가만히 있을 때도 리듬 타듯 둥가둥가”). 참조 = 기존 raw 시트(같은 스타일·크기). 셋을 병렬로.
cd "$(dirname "$0")/../../.."
J=assets/source/band184; B=assets/source/band178
gen() { /usr/bin/python3 tools/sprites/imagegen.py generate --prompt-file "$J/$1/$1.prompt.txt" --ref "$B/$2" --size 1024x1024 --quality high --out "$J/$1/$1-raw.png" > "$J/$1/generate.log" 2>&1; echo "$1 exit $?" >> "$J/generate.log"; }
gen hyungsub hyungsub/hyungsub-raw.png &
gen gyeongsub gyeongsub/gyeongsub-raw.png &
gen ppaman ppaman2/ppaman2-raw.png &
wait
echo ALL_DONE >> "$J/generate.log"
