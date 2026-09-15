# 섭리오 168 자산 — 판테온 차징 프레임 · 롤 몬스터 8종

| 자산 | 원본 | 정체성·변형 | runtime |
| --- | --- | --- | --- |
| 판테온 차징 | `pantheon_charge/pantheon_charge-raw.png`(참조 = 167 판테온 시트의 idle+attack 프레임 0.75×) | 창을 뒤로 들고 몸을 젖힌 예비 자세, 같은 스타일 | `assets/sprites/subrio_pantheon.png` 5행 8번(128×320). 생성물이 참조보다 커서 공격 프레임 높이 48px 에 맞춤 |
| 칼날부리·늑대·두꺼비·크루그·바위게·대포 미니언·레드·블루 | `<name>/<name>-raw.png`(참조 `refs/<name>-ref.png` = `assets/enemies/jungle-*-front.png` + battle 측면(좌우 반전)) | 2×2: 걷기 A·B, 스턴(별), 쓰러짐. NES 풍 낮은 디테일 | `assets/sprites/subrio_<name>.png` 48×48(레드·블루 64×64), 발 y44/60, 종류별 몸 높이 24~48px |

전부 OpenGateway `openai/gpt-image-2` `images/edits`(단일 `image` 참조), `generate.sh` 로 순차. `process.py`(`/usr/bin/python3 assets/source/subrio168/process.py`): processor 크로마키 정리 → 종류별 몸 높이로 NEAREST 축소(셀을 넘으면 맞춰 줄임) → 원본 셀 안 몸 중심 유지. `preview-3x.png`.

훈련 토템(`assets/props/subrio_totem.png` 32×48 ×2)은 페인터 `tools/art/subrio_set.py`.
