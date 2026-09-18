# 대사 글자 소리 샘플

`<voice>.mp3` (0.1~0.3초 블립 하나) 를 넣으면 그 음색의 글자마다 재생됨. voice 이름: narrator, hyungsub, gyeongsub, ppaman, junhee, cat, low, robot, hero, default
톤다운: src/core/audio.js VOICES.<voice>.rate
- red.mp3 / blue.mp3: mystery.mp3(언더테일 snd_txt2 앞 0.32s) 복사본 — VOICES.red/blue 가 rate 0.62/0.52 로 깊게 재생(청록숲9 문지기, 2026-09-11)
- janitor.mp3(청소부, 2026-09-18, 임시): library/sfx/snd_dadtxt.mp3(델타룬 공식 저음 텍스트음)를 -2.6반음·lowpass 2300·tremolo 26Hz 로 거슨풍 변형(사용자 “형섭 느낌 빼고 델타룬 거슨에서 살짝 변형”). 거슨 원음 확보 시 교체. 명령은 assets/source/janitor-v1/README.md. VOICES.janitor rate 0.95
