#!/bin/sh
set -eu
cd "$(dirname "$0")/../../.."
ffmpeg -v error -y -i assets/audio/sfx/wing.mp3 -i assets/audio/sfx/baron_slam.mp3 -filter_complex '[0:a]asetrate=39690,aresample=44100,atrim=duration=0.32,highpass=f=90,lowpass=f=3200,volume=2.0[w];[1:a]atrim=duration=0.24,highpass=f=45,lowpass=f=420,volume=0.35,afade=t=out:st=0.08:d=0.16[b];[w][b]amix=inputs=2:normalize=0,afade=t=in:d=0.003,afade=t=out:st=0.14:d=0.18,alimiter=limit=0.56:level=false[out]' -map '[out]' -ar 44100 -ac 1 -c:a libmp3lame -q:a 2 assets/audio/sfx/drum_throw.mp3
ffmpeg -v error -y -i assets/source/drum-throw-v2/drum_throw_v1.mp3 -i assets/audio/sfx/drum_throw.mp3 -filter_complex '[0:a]volume=0.75,apad=whole_dur=1.2[a];[1:a]volume=0.75,apad=whole_dur=1.2[b];[a][b]concat=n=2:v=0:a=1[out]' -map '[out]' -ar 44100 -ac 1 -c:a libmp3lame -q:a 2 assets/source/drum-throw-v2/preview-before-after.mp3
