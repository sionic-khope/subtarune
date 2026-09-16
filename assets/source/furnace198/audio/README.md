# 용광로 색깔 게임 폭발음 “꾸와아앙” (BUILD198)

사용자 2026-09-16: “deltarune 효과음 중에 폭발음 말고 쿠와아앙 하는 효과음 — 막타 칠 때 나는 소리, 죽이는 소리 말고”, “snd_bigcut 은 아니긴 했는데 (저장은 해줘)”, “더 긴 효과음이었던 것 같아”.
게임은 역할 이름 `assets/audio/sfx/furnace_blast.mp3` 하나만 부르므로(씬 `colorgame.js` 폭발, 광장 철창 낙하 `boom` 노드) 이 파일만 바꾸면 전부 바뀐다.

- 출처: [Deltarune 디컴파일 자료 `sounds/`](https://github.com/TeamBlossomDevs/DeltaruneDecomp_beta/tree/154f9a97b8f18fa6974e917c4c4e774bde6b7eba/sounds) — 게임 음원 보관본이며 배급사 공식 배포처가 아니다. 원본 권리는 원 권리자에게 있고 출처 기록은 이용허락을 뜻하지 않는다.
- 현재 `furnace_blast.mp3` = `snd_punchheavythunder`(전체 1.772초, 44.1kHz mono, 잘라내기·피치·속도·음량 변경 없음, `ffmpeg -i <원본> -map_metadata -1 -c:a libmp3lame -q:a 2`). 보존 `snd_punchheavythunder.wav`, SHA256 `82c6f1b0…`(아래 명령으로 재확인). 프로젝트의 `captain_thunder.mp3`(BUILD125 천둥 충격)와 같은 원본이다.
  근거(청취가 아니라 파형 분석): “막타(타격)” 계열 중 꼬리가 가장 길고(−30dB 까지 1.50초) 저음 비중 0.24, 시작 즉시 충격. 이 환경은 오디오 청취를 지원하지 않는다.
- 보존만: `snd_bigcut.wav`(2.364535초, SHA256 `e1f3d77bf06da1643d470fe507c14d75e334fbbf7fe60f04cbed098710b9fbce`) → `assets/audio/sfx/bigcut.mp3`(전체, 무가공). 사용자 “아니긴 했는데 저장은 해줘”.
- 청취용 후보 57개: `~/Downloads/deltarune_impact_candidates/*.mp3`(같은 리비전, 무가공 변환). 긴 순서: snd_deep_noise 5.57s · snd_snowgrave 5.08s · snd_dtrans_lw 4.42s · snd_explosion 4.01s · snd_closet_impact 3.43s · snd_bigcut 2.36s · snd_weirdeffect 2.31s · snd_wobbler 2.13s · snd_ominous 2.11s · snd_punchmed 1.92s · snd_badexplosion 1.91s · snd_howl 1.89s · snd_quake_nes 1.88s · snd_queen_punched_lower_heavy 1.85s · snd_fall_cool_deep 1.85s · snd_petrify 1.84s · snd_punchheavythunder 1.77s · snd_rumble 1.44s · …
  꼬리(−30dB)·저음 비중으로 본 “꾸와아앙” 후보: snd_punchheavythunder(1.50s/0.24) · snd_closet_impact(1.44s/0.45) · snd_queen_punched_lower_heavy(1.02s/0.44) · snd_explosion(2.28s/0.23) · snd_quake_nes(1.32s/0.29).
- 바꾸는 법: `ffmpeg -i ~/Downloads/deltarune_impact_candidates/<이름>.mp3 -map_metadata -1 -c:a libmp3lame -q:a 2 assets/audio/sfx/furnace_blast.mp3` 뒤 이 README 의 “현재” 줄과 `design/audio/references.md` 를 갱신.
