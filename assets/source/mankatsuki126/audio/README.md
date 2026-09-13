# BUILD126 audio and reference provenance

Retrieved2026-09-13. User-selected battle BGM: [THE WORLD REVOLVING](https://www.youtube.com/watch?v=Z01Tsgwe2dQ), exact ID `Z01Tsgwe2dQ`, uploader Toby Fox, upload2018-11-17, metadata duration101s, format251.

Runtime BGM `assets/audio/bgm/mankatsuki_battle.mp3`:101.052646s,48000Hz stereo,2,520,140bytes. Full source preserved; MP3 encoding only, no trimming/rate/pitch/fade/gain changes.

Runtime clone sound `assets/audio/sfx/mankatsuki_clone.mp3`:0.360000s,44100Hz mono,5,078bytes. Short combination of existing `pop.mp3` (DELTARUNE snd_bomb per project provenance) and the project's synthesized `cannon_puff.mp3` (pink noise, seed23,220–2600Hz, existing baron encounter asset). The style intent is a quick smoke puff; no Naruto recording was downloaded or used. Original files are preserved.

```sh
yt-dlp --no-playlist -f '251/bestaudio' --write-info-json -o '/tmp/mankatsuki126-bgm.%(ext)s' 'https://www.youtube.com/watch?v=Z01Tsgwe2dQ'
ffmpeg -i /tmp/mankatsuki126-bgm.webm -map_metadata -1 -c:a libmp3lame -q:a 2 assets/audio/bgm/mankatsuki_battle.mp3
ffmpeg -i assets/audio/sfx/pop.mp3 -i assets/audio/sfx/cannon_puff.mp3 -filter_complex '[0:a]atrim=duration=0.36,asetpts=PTS-STARTPTS,volume=0.5,afade=t=out:st=0.16:d=0.2[a];[1:a]atrim=duration=0.28,asetpts=PTS-STARTPTS,volume=1.2[b];[a][b]amix=inputs=2:normalize=0,alimiter=limit=0.8:level=false,apad,atrim=duration=0.36[out]' -map '[out]' -ar 44100 -ac 1 -c:a libmp3lame -q:a 2 assets/audio/sfx/mankatsuki_clone.mp3
```

| File | SHA256 |
|---|---|
| mankatsuki_battle.mp3 |6a14bed74dabe05cccbd0f61191a71fd0908044315221298a9178ecbc4141f9d|
| mankatsuki_clone.mp3 |a28acdd775c784213a44b937dff2a46803c342a394806a13e8caf25d5ccd9876|
| source pop.mp3 |4116257a7d6000a2854d39d6c3f421704fdad4404f7958999e23a5f1357019b3|
| source cannon_puff.mp3 |7fe19c5cdf559954210f41621904e87f950cf795d8469ce45490c29089d1b172|

ffprobe metadata and ffmpeg full decode passed. BGM mean/peak−13.3/0.0dBFS; clone mean/peak−18.9/−4.1dBFS. Actual browser integration and subjective listening are separate checks. Only new SFX registration needed: `mankatsuki_clone`. Existing `whoosh` (1.6s) and `rocket` (1.5s) are available for shuriken volleys and flame bursts respectively.

User-selected visual benchmark: [델타룬 제빌 클리어 (몰살)](https://www.youtube.com/watch?v=UXrlb4fGqsE), uploader 공휴, upload2018-11-23, metadata duration348s. The source50–65s segment was retrieved using formats398+251 and decoded to a15s960×72060fps temporary reference MP4. Frames at source55/57/59s were extracted for inspection. The clip and frames are research references in `/tmp`, not runtime game assets and not copied into the repository.

```sh
yt-dlp --no-playlist -f 'bv*[height<=720]+ba/b[height<=720]' --download-sections '*50-65' --force-keyframes-at-cuts --merge-output-format mp4 --write-info-json -o '/tmp/mankatsuki126-reference.%(ext)s' 'https://www.youtube.com/watch?v=UXrlb4fGqsE'
ffmpeg -ss 5 -i /tmp/mankatsuki126-reference.mp4 -frames:v 1 /tmp/mankatsuki126-reference-55.png
ffmpeg -ss 7 -i /tmp/mankatsuki126-reference.mp4 -frames:v 1 /tmp/mankatsuki126-reference-57.png
ffmpeg -ss 9 -i /tmp/mankatsuki126-reference.mp4 -frames:v 1 /tmp/mankatsuki126-reference-59.png
```
