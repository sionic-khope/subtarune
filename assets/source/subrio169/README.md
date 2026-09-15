# 169 자산 — 파크가디언 날리기 소리(델타룬 공식 snd_wing)

`audio/snd_wing.wav`: [Deltarune snd_wing](https://github.com/TeamBlossomDevs/DeltaruneDecomp_beta/blob/154f9a97b8f18fa6974e917c4c4e774bde6b7eba/sounds/snd_wing/snd_wing)(디컴파일 자료, 공식 배포처 아님), SHA256 `33501074b8436b2ccdd827fe2b7027c6b2a3d2c874820b30f6ccf1ecae2c4725`, 0.469초. `ffmpeg -ar 44100 -ac 1 -q:a 2` 로 `assets/audio/sfx/wing.mp3`. 합성 휘슬 `fling_whistle` 은 사용자가 “이상한 소리”라 해서 삭제(`docs/postmortems/2026-09-15-cutscene-sound-coverage.md`). `snd_bombfall.wav` 도 받아 두었으나 미사용.

보스 시트는 `assets/source/subrio166/process.py` 를 224×192 셀·발 y180·idle 몸 128px 로 다시 내보냈다(사용자: 섭리오 안 비데 두 배). 몬스터 8종은 `assets/source/subrio168/process.py` 의 JOBS 를 키워 다시 내보냈다(바위게·두꺼비·크루그·대포·늑대 64셀, 레드·블루 96셀).

## 보스 스킬 시트 (BUILD170)

`bidet_skills/bidet_skills-raw.png`(참조 `refs/bidet-ref.png` = 166 본 시트 idle+swing 0.75×): 2×4 — dive(공중, 도끼 아래), slam(무릎 꿇고 도끼 박음), spinA(도끼 오른쪽)·spinB(왼쪽)·spinC(정면), vanish(보라 반투명+반짝), spinWind(웅크림), overhead(머리 위). `process.py` 가 본 시트와 같은 배율(0.4103)로 224×192 셀·발 y180 에 놓는다 → `assets/sprites/subrio_bidet_skills.png`. vanish 프레임은 보라색이라 크로마키 기준을 좁혀(R,B>200) 살렸다.

`audio/`: snd_bell·snd_spearappear·snd_impact·snd_heavyswing·snd_ultraswing·snd_power 원본(위 SHA). snd_ghostappear·snd_quake_nes 는 이 SHA 에 없음(14바이트).

샘물 `assets/props/subrio_spring.png`(32×24 ×2)은 페인터 `tools/art/subrio_set.py`.

