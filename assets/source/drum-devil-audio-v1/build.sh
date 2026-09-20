#!/bin/sh
set -eu
cd "$(dirname "$0")/../../.."
sh assets/source/drum-throw-v2/build.sh
ffmpeg -v error -y -i assets/audio/sfx/metalhit.mp3 -i assets/audio/sfx/baron_slam.mp3 -filter_complex '[0:a]asetrate=28665,aresample=44100,atrim=duration=0.40,highpass=f=80,lowpass=f=1300,volume=0.9[m];[1:a]atrim=duration=0.40,lowpass=f=650,volume=0.45[b];[m][b]amix=inputs=2:normalize=0,afade=t=in:d=0.003,afade=t=out:st=0.17:d=0.23,alimiter=limit=0.5:level=false[out]' -map '[out]' -ar 44100 -ac 1 -c:a libmp3lame -q:a 2 assets/audio/sfx/drum_impact.mp3
ffmpeg -v error -y -i assets/audio/sfx/furnace_blast.mp3 -af 'atrim=duration=0.95,highpass=f=40,lowpass=f=2200,bass=g=3:f=100,volume=0.8,afade=t=out:st=0.45:d=0.50,alimiter=limit=0.5:level=false' -ar 44100 -ac 1 -c:a libmp3lame -q:a 2 assets/audio/sfx/drum_burst.mp3
ffmpeg -v error -y -i assets/audio/sfx/drum_throw.mp3 -i assets/audio/sfx/drum_impact.mp3 -i assets/audio/sfx/drum_burst.mp3 -i assets/audio/sfx/wallclaw.mp3 -filter_complex '[0:a]volume=0.75,apad=whole_dur=1.2[a];[1:a]volume=0.50,apad=whole_dur=1.2[b];[2:a]volume=0.95,apad=whole_dur=1.8[c];[3:a]volume=0.5,apad=whole_dur=1.8[d];[a][b][c][d]concat=n=4:v=0:a=1[out]' -map '[out]' -ar 44100 -ac 1 -c:a libmp3lame -q:a 2 assets/source/drum-devil-audio-v1/preview.mp3
