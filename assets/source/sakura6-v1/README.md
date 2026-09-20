# 벚꽃 숲 6 자산 (BUILD277, 2026-09-20)

생성은 전부 `openai/gpt-image-2.5-sunburst`(`tools/sprites/imagegen.py generate --quality high --size 1024x1024`), 가공은 `export.py`(색키·연결 성분·축소·자르기만).

- `masked-walk-ref.png` / `masked-seup-ref.png` / `masked-face-ref.png`: 참조 합성(`compose_refs.py`, 게임 자산 아님) — 최미스 걷기 시트 미리보기 + 가면 정면(`assets/sprites/choimis-masked.png` 4배).
- `assets/sprites/choimis-masked-walk.png`(BUILD279, `mask_overlay.py`): **기존 걷기 시트 `choimis.png`(GAP 원본) 16칸 위에 기존 가면 조각(`assets/props/discord_mask.png`, 빛 드는 공터 `choimis-masked.png` 와 같은 자리)을 그대로 얹었다** — 정면 행은 승인된 자리(머리 위 6px, 가로 중심), 옆 행은 가로 65% 로 줄여 얼굴 쪽, 뒷모습 행은 원본 그대로. gpt-image 로 다시 그린 `choimis-masked-walk-raw.png`(BUILD277)는 가슴 GAP 이 빠져 폐기(사용자 “최땡땡 가슴에 GAP 있는 스프라이트 있을텐데 왜 재사용 안 한 거지”). 원본 raw 는 기록용으로 남긴다.
- `choimis-masked-pick-raw.png`(`choimis-masked-pick.prompt.txt`, 참조 = 가면 정면): 허리 굽혀 꽃 따기 / 꽃 들어 보기 → `assets/sprites/choimis-masked-pick.png`(256×128 띠). 광장 꽃 무더기 옆 `pick` 자세(0.55+0.5초).
- `choimis-masked-seup-raw.png`(`choimis-masked-seup.prompt.txt`, 참조 = masked-seup-ref): 기존 스읍 미스 두 자세에 가면 → `assets/sprites/choimis-masked-seup.png`. `seup` 자세 1.4+1.3초(= `sfx/choimis_seup_miss.mp3` 2.7초).
- `flowers-raw.png`(`flowers.prompt.txt`, 참조 없음 — 벚꽃 소품 프롬프트 계열): 2×2 꽃 무더기 → `assets/props/sakura_flowers_1..4.png`(폭 40). 광장 가운데 옆 소품(히트박스 24×8).
- `bgm.meta.txt`: `assets/audio/bgm/loving_steps.mp3` 출처(28. Loving Steps, tLAxahP5scs, 134초, MP3 q2 전체).
- `runtime-contract.json`: export 결과(배율·칸 크기).
