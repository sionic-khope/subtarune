# 169 자산 — 파크가디언 날리기 소리(델타룬 공식 snd_wing)

`audio/snd_wing.wav`: [Deltarune snd_wing](https://github.com/TeamBlossomDevs/DeltaruneDecomp_beta/blob/154f9a97b8f18fa6974e917c4c4e774bde6b7eba/sounds/snd_wing/snd_wing)(디컴파일 자료, 공식 배포처 아님), SHA256 `33501074b8436b2ccdd827fe2b7027c6b2a3d2c874820b30f6ccf1ecae2c4725`, 0.469초. `ffmpeg -ar 44100 -ac 1 -q:a 2` 로 `assets/audio/sfx/wing.mp3`. 합성 휘슬 `fling_whistle` 은 사용자가 “이상한 소리”라 해서 삭제(`docs/postmortems/2026-09-15-cutscene-sound-coverage.md`). `snd_bombfall.wav` 도 받아 두었으나 미사용.

보스 시트는 `assets/source/subrio166/process.py` 를 224×192 셀·발 y180·idle 몸 128px 로 다시 내보냈다(사용자: 섭리오 안 비데 두 배). 몬스터 8종은 `assets/source/subrio168/process.py` 의 JOBS 를 키워 다시 내보냈다(바위게·두꺼비·크루그·대포·늑대 64셀, 레드·블루 96셀).
