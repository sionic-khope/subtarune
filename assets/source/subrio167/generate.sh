#!/bin/bash
# 섭리오 167 스프라이트 재생성(사용자 피드백: 덜 디테일하게·질리언 하늘색 머리) + CS 미니언 적. OG edits, 참조 1장씩, 순차.
cd "$(dirname "$0")/../../.."
J=assets/source/subrio167
gen() { /usr/bin/python3 tools/sprites/imagegen.py generate --prompt-file "$J/$1/$1.prompt.txt" --ref "$J/refs/$2" --size "$3" --quality high --out "$J/$1/$1-raw.png" >> "$J/generate.log" 2>&1; echo "$1 exit $?" >> "$J/generate.log"; }
gen pantheon hyungsub-ref.png 1024x1536
gen zilean gyeongsub-ref.png 1024x1536
gen brand ppaman-ref.png 1024x1536
gen cs_red cs-red-ref.png 1024x1024
gen cs_blue cs-blue-ref.png 1024x1024
echo ALL_DONE >> "$J/generate.log"
