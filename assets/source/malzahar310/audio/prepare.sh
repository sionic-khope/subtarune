#!/bin/sh
set -eu

source_dir=assets/source/malzahar310/audio
output_dir=assets/audio/sfx

ffmpeg -y -v error -ss 0.55 -i "$source_dir/ability_0090_Q1.mp4" -t 1.30 -vn \
  -af 'volume=4dB,afade=t=in:d=0.008,afade=t=out:st=1.22:d=0.08' \
  -map_metadata -1 -ar 48000 -ac 2 -c:a libmp3lame -q:a 2 "$output_dir/malzahar_q.mp3"
ffmpeg -y -v error -ss 0.27 -i "$source_dir/ability_0090_W1.mp4" -t 1.28 -vn \
  -af 'volume=6dB,afade=t=in:d=0.008,afade=t=out:st=1.20:d=0.08' \
  -map_metadata -1 -ar 48000 -ac 2 -c:a libmp3lame -q:a 2 "$output_dir/malzahar_w.mp3"
ffmpeg -y -v error -ss 1.13 -i "$source_dir/ability_0090_Q1.mp4" -t 0.52 -vn \
  -af 'volume=5.5dB,afade=t=in:d=0.008,afade=t=out:st=0.44:d=0.08' \
  -map_metadata -1 -ar 48000 -ac 2 -c:a libmp3lame -q:a 2 "$output_dir/malzahar_dash.mp3"
