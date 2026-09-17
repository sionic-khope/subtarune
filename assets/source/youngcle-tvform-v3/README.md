# 영클 변신형 v3 — 굵고 둥근 팔다리(테나 비율) + 영클 옷 + TV 머리 (gpt-image-2.5-sunburst, BUILD214)

사용자 2026-09-17: v2(youngcle-tvform-v2)는 “저 몸체가 아니라고, 너무 얇아 팔다리가, 징그러워 — [tenor 테나 전투 GIF] 이런 느낌”.
- 테나 전투 GIF(tenor 16613958761995764077, 64프레임)를 받아 `ref-tenna-fight-gif-strip.png` 로 확인: 팔다리는 길지만 **굵고 둥근 고무 튜브**, 큰 손·큰 신발·단단한 몸통.
- 프롬프트 `idle.prompt.txt`: Image3(테나)에서 **비율과 질감만** — 팔다리는 튜브처럼 굵게(막대기 금지), 큰 둥근 손·큰 신발·통통한 가슴, 옷은 영클 그대로(파란 티·초록 배지·남색 반바지·검은 신발), 회색 CRT 머리(안테나 없음)에 영클 얼굴, 자세·4프레임(앞으로 뻗은 주먹이 작은 원)은 v2 와 같음. “친근하게 위협적, 징그럽지 않게”.
- export: 맵 `export.py idle-raw.png 2 2 320 0.95 idle-2x2.png 312 largest` → 4행 `assets/sprites/youngcle_tvform.png`(1280×1280), 전투 `export.py … 2 2 256 0.92 assets/enemies/youngcle-tvform-battle-idle.png 246 largest`(512×512). v2 시트는 덮어씀(원본 폴더 보존).
