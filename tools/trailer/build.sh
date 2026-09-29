#!/usr/bin/env bash
# 트레일러 합치기(BUILD408): 직접 그린 구간(0–31.41s, 50.9s–끝) + 게임 녹화 몽타주(31.41–50.9s) + 참고 음원.
# 사용: bash tools/trailer/build.sh  → assets/source/trailer408/subtarune_trailer.mp4
set -euo pipefail
cd "$(dirname "$0")/../.."
D=assets/source/trailer408
C=$D/clips
W=$D/work
mkdir -p "$W"
: "${CHROME_EXE:=$(ls -d ~/Library/Caches/ms-playwright/chromium-*/chrome-mac*/*.app/Contents/MacOS/* | head -1)}"
export CHROME_EXE

# 1) 직접 그리는 구간
node tools/trailer/render.mjs "$W/intro" 0 31.41
node tools/trailer/render.mjs "$W/outro" 50.9 61.13

# 2) 몽타주: 클립 이름 · 녹화 시작초 · 길이(초) — 박자 32.68/33.54/36.11/38.9/42.11 등(ref 음원 분석)에 맞춤
MONTAGE=(
  "park 6.30 1.27"
  "park 69.40 2.15"
  "tv 17.50 2.14"
  "subrio 2.80 1.99"
  "choimis 32.10 2.57"
  "rhythm 54.00 2.49"
  "torii 1.80 2.29"
  "boulder 25.60 2.36"
  "teenrise 95.60 2.23"
)
list=()
i=0
for row in "${MONTAGE[@]}"; do
  read -r name ss dur <<<"$row"
  [[ -f "$C/fix_$name.webm" ]] || ffmpeg -v error -y -i "$C/$name.webm" -c copy "$C/fix_$name.webm"
  seg="$W/m$(printf %02d $i).mp4"
  ffmpeg -v error -y -ss "$ss" -i "$C/fix_$name.webm" -t "$dur" \
    -vf "fps=30,scale=960:720:flags=neighbor,pad=1280:720:160:0:black,setsar=1" -an -c:v libx264 -crf 14 -pix_fmt yuv420p "$seg"
  list+=("$seg"); i=$((i + 1))
done

# 3) 직접 그린 구간 → mp4
ffmpeg -v error -y -framerate 30 -i "$W/intro/%05d.png" -c:v libx264 -crf 14 -pix_fmt yuv420p "$W/intro.mp4"
ffmpeg -v error -y -framerate 30 -i "$W/outro/%05d.png" -c:v libx264 -crf 14 -pix_fmt yuv420p "$W/outro.mp4"

# 4) 이어 붙이고 음원(참고 트레일러 음원 그대로 — 게임 소리 없음)
{
  echo "file '$(pwd)/$W/intro.mp4'"
  for s in "${list[@]}"; do echo "file '$(pwd)/$s'"; done
  echo "file '$(pwd)/$W/outro.mp4'"
} > "$W/concat.txt"
ffmpeg -v error -y -f concat -safe 0 -i "$W/concat.txt" -c copy "$W/video.mp4"
ffmpeg -v error -y -i "$W/video.mp4" -i "$D/ref_audio.wav" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -shortest "$D/subtarune_trailer.mp4"
ffprobe -v error -show_entries format=duration -of csv=p=0 "$D/subtarune_trailer.mp4"
echo "→ $D/subtarune_trailer.mp4"
