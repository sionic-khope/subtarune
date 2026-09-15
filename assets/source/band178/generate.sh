#!/bin/bash
# 무대 밴드 스프라이트(사용자 2026-09-15: 경섭 드럼·형섭 일렉기타·빠맨 보컬, 사진 느낌). OG edits, 참조 1장씩(subrio167 정체성 참조 재사용), 순차.
cd "$(dirname "$0")/../../.."
J=assets/source/band178
gen() { /usr/bin/python3 tools/sprites/imagegen.py generate --prompt-file "$J/$1/$1.prompt.txt" --ref "$J/refs/$2" --size 1024x1024 --quality high --out "$J/$1/$1-raw.png" >> "$J/generate.log" 2>&1; echo "$1 exit $?" >> "$J/generate.log"; }
gen hyungsub hyungsub-ref.png
gen gyeongsub gyeongsub-ref.png
gen ppaman ppaman-ref.png
echo ALL_DONE >> "$J/generate.log"
