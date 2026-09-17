# 영클 힘 받는 자세 4단계 — gpt-image-2.5-sunburst (BUILD211)

사용자 2026-09-17 “천천히 마이야르 변신하듯 엄청난 연출 몇초동안 힘을받는듯한 스프라이트 쿠와아앙”. 얼굴 박힌 소품(youngcle-faceplant-v1) 다음, 변신(youngcle-tenna-v1) 전에 쓴다.

- 참조 `ref.png` = 걷기 시트 `assets/sprites/youngcle.png` ×3(다리가 보이는 원본). 프롬프트 `powerup.prompt.txt`(전송본 `powerup-raw.prompt.txt`, usage `powerup-raw.meta.json`, 로그 `gen.log`): 포드 없이 바닥에서 힘을 모으는 4프레임 — 웅크림(손 짚음) → 한쪽 무릎·주먹 → 노려봄(보라 눈동자·이 악묾) → 낮게 서서 포효(갈퀴 손), 어깨에서 검보라 연기.
- export: `../youngcle-hover-battle-v1/export.py powerup-raw.png 2 2 128 0.85 rise-2x2.png 122 all`(배율 0.2434, `rise-2x2.export-meta.json`) → 4행에 같게 깔아 `assets/sprites/youngcle_powerup.png`(512×512, 128px 셀 = 필드 64px, 발 y122).
- 연결: `characters.js youngcle_powerup`, 단계는 `character-motions.js youngcle_powerup.rise` 4프레임을 컷신 `ship_control.js rise([[프레임, 초]…])` 가 골라 루프로 건다(떨림 = 두 프레임을 0.12s 로 번갈아).
