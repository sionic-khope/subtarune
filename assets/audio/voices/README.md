# 대사 글자 소리 샘플

`<voice>.mp3` (0.1~0.3초 블립 하나) 를 넣으면 그 음색의 글자마다 재생됨. voice 이름: narrator, hyungsub, gyeongsub, ppaman, junhee, cat, low, robot, hero, default
톤다운: src/core/audio.js VOICES.<voice>.rate
- red.mp3 / blue.mp3: mystery.mp3(언더테일 snd_txt2 앞 0.32s) 복사본 — VOICES.red/blue 가 rate 0.62/0.52 로 깊게 재생(청록숲9 문지기, 2026-09-11)
- janitor.mp3(청소부, 2026-09-18): hyungsub.mp3 를 ffmpeg 로 -5반음(asetrate 48000*0.75)·highpass 110·lowpass 2400·tremolo 34Hz d0.4·bass +4dB@180 처리한 0.35s 변형(사용자 “형섭 목소리에서 할아버지 느낌으로, 거슨 목소리 델타룬 참고”). 재현 명령은 assets/source/janitor-v1/README.md. VOICES.janitor rate 0.9
