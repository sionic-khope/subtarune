# 영클 변신형 v2 — 영클 옷 그대로 + TV 머리 + 긴 팔다리, 테나 전투 대기 자세 (gpt-image-2.5-sunburst, BUILD212)

사용자 2026-09-17: v1(youngcle-tenna-v1)은 “테나랑 너무 똑같다, 테나는 3D 질감만 참고용, 크기 두 배는 거대하게(바론까진 아니더라도), 팔 돌리기가 그게 아님 — 테나 전투 gif 참고, 생성도 다시”.

- 참조 `ref.png` = Image1 영클 전투 v3 참조(옆·정면) + Image2 걷기 시트 ×2(다리) + Image3 사용자 첨부 테나(질감만). 테나 전투 대기 GIF(knowyourmeme “Mr. Tenna's idle battle stance”, 114프레임)를 받아 프레임 띠 `ref-tenna-battle-idle-strip.png` 로 동작을 확인: 큰 풍차가 아니라 **무릎을 굽혀 앞으로 숙인 자세, 한 손은 앞 무릎, 앞으로 뻗은 팔의 손이 작은 원을 그리고 몸이 살짝 들썩임**.
- 프롬프트 `idle.prompt.txt`: 파란 티·초록 배지·남색 반바지·검은 신발은 그대로, 팔다리만 2배 길게, 회색 CRT(안테나 없음) 머리에 영클 얼굴, 3D 풍 음영은 Image3 에서 질감만(빨간 연미복·장갑·줄무늬·안테나·라벤더 금지), 4프레임 = 손 낮게·앞으로·높게·가슴 쪽 + 들썩임.
- v1(`../youngcle-tvform-v1/`, 풍차 팔)은 옷·정체성은 맞았으나 동작이 달라 폐기(원본 보존).
- export: `../youngcle-hover-battle-v1/export.py idle-raw.png 2 2 320 0.95 idle-2x2.png 312 largest` → 4행에 같게 깔아 `assets/sprites/youngcle_tvform.png`(1280×1280, 320px 셀 = 필드 160px, 발 y312, 그려지는 키 ≈229px = 대화 중 보이는 영역(230) 최대치).
- 연결: `characters.js youngcle_tvform`, 루프 `character-motions.js youngcle_tvform.idle`(0.16s×4), 컷신 `ship_control.js tennaForm()`. 카메라 `SCENE_CAM [14.5, 8.0]` 으로 TV 머리까지 화면 안.
