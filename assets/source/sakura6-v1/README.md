# 벚꽃 숲 6 자산 (BUILD277, 2026-09-20)

생성은 전부 `openai/gpt-image-2.5-sunburst`(`tools/sprites/imagegen.py generate --quality high --size 1024x1024`), 가공은 `export.py`(색키·연결 성분·축소·자르기만).

- `masked-walk-ref.png` / `masked-seup-ref.png` / `masked-face-ref.png`: 참조 합성(`compose_refs.py`, 게임 자산 아님) — 최미스 걷기 시트 미리보기 + 가면 정면(`assets/sprites/choimis-masked.png` 4배).
- `choimis-masked-walk-raw.png`(`choimis-masked-walk.prompt.txt`, 참조 = masked-walk-ref): 걷기 시트를 그대로 다시 그리되 모든 칸에 디스코드 가면(뒷모습 행은 끈만) → `assets/sprites/choimis-masked-walk.png`(512×512, 128 칸, 발 y=120, 정면 키 96 = 기존 최미스 시트와 같음). 첫 내보내기에서 왼쪽 행 발밑 잔점이 상자에 들어가 키가 120 으로 잡혀 위로 떠 보였다 → 연결 성분으로 몸통만 재고 발끝 아래 조각은 버린다.
- `choimis-masked-pick-raw.png`(`choimis-masked-pick.prompt.txt`, 참조 = 가면 정면): 허리 굽혀 꽃 따기 / 꽃 들어 보기 → `assets/sprites/choimis-masked-pick.png`(256×128 띠). 광장 꽃 무더기 옆 `pick` 자세(0.55+0.5초).
- `choimis-masked-seup-raw.png`(`choimis-masked-seup.prompt.txt`, 참조 = masked-seup-ref): 기존 스읍 미스 두 자세에 가면 → `assets/sprites/choimis-masked-seup.png`. `seup` 자세 1.4+1.3초(= `sfx/choimis_seup_miss.mp3` 2.7초).
- `flowers-raw.png`(`flowers.prompt.txt`, 참조 없음 — 벚꽃 소품 프롬프트 계열): 2×2 꽃 무더기 → `assets/props/sakura_flowers_1..4.png`(폭 40). 광장 가운데 옆 소품(히트박스 24×8).
- `bgm.meta.txt`: `assets/audio/bgm/loving_steps.mp3` 출처(28. Loving Steps, tLAxahP5scs, 134초, MP3 q2 전체).
- `runtime-contract.json`: export 결과(배율·칸 크기).
