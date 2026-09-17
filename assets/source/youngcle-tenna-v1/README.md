# 영클 변신형(TV 머리·긴 팔다리) 대기 4프레임 — gpt-image-2.5-sunburst (BUILD211)

사용자 2026-09-17 “영클이 팔다리가 더 길어지고 얼굴에 티비가 하나 쓰여지는거임 그리고 약간 3d풍체여야해 [델타룬 테나 이미지] 이런느낌 … 델타룬의 테나 참고해서 팔을 돌리는 인게임 모션 … 얼굴화면에 영클이 잇는거임”.

- 참조 `ref.png` = 사용자 첨부 테나 스프라이트(`ref-tenna-user.png`, ×2) + 영클 정체성(`../youngcle-hover-battle-v3/ref.png` 옆·정면) 을 마젠타 위에 가로로 합성. 프롬프트 `idle.prompt.txt`(전송본 `idle-raw.prompt.txt`, usage `idle-raw.meta.json`, 로그 `gen.log`): Image1 의 몸(라벤더 CRT 머리·안테나·빨간 연미복·흰 장갑·줄무늬 다리·노란 신발·3D 풍 음영) + Image2 의 얼굴을 TV 화면에(외눈 소용돌이 눈동자·볼·곱슬 한 가닥) + 가슴에 초록 배지, 오른팔이 한 바퀴 도는 4프레임(아래앞 → 옆 → 위 → 뒤).
- export: `../youngcle-hover-battle-v1/export.py idle-raw.png 2 2 176 0.9 idle-2x2.png 170 largest`(배율 0.3253, `idle-2x2.export-meta.json`) → 4프레임을 4행에 같게 깔아 `assets/sprites/youngcle_tenna.png`(704×704, 176px 셀 = 필드 88px, 발 y170).
- 연결: `characters.js youngcle_tenna`, 대기 루프는 `character-motions.js youngcle_tenna.idle`(scale 0.5, 0.14s/프레임) — 컷신 `ship_control.js tennaForm()` 이 `setSprite` + `loopCharacterMotion`. 초상화는 기존 `youngcle_tv_*`(TV 속 얼굴) 그대로.
- 옷 색은 참조(빨간 연미복)를 따랐다 — 파란 티셔츠로 바꾸려면 재생성.

**반려(2026-09-17, BUILD212)**: 사용자 “테나랑 너무 똑같은데 내가 원한 건 테나는 그냥 3D 질감만 참고용이었음, 크기도 두 배는 거대해야, 팔 돌리기가 그게 아님(테나 전투 gif 참고)” → `../youngcle-tvform-v2/` 로 교체. `assets/sprites/youngcle_tenna.png` 삭제. 원본·프롬프트는 기록용으로 보존.
