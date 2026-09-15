#!/bin/bash
# 무대·대기실 생성 자산(사용자: “보기 예쁜 것, GPT 에 요청”): 리듬 무대 배경, 대기실 소품 시트, 무대 바닥·카펫 텍스처. 순차.
cd "$(dirname "$0")/../../.."
J=assets/source/stage180
gen() { /usr/bin/python3 tools/sprites/imagegen.py generate --prompt-file "$J/$1/$1.prompt.txt" --size "$2" --quality high --out "$J/$1/$1-raw.png" >> "$J/generate.log" 2>&1; echo "$1 exit $?" >> "$J/generate.log"; }
gen backdrop 1536x1024
gen props 1024x1536
gen floor 1024x1024
echo ALL_DONE >> "$J/generate.log"
