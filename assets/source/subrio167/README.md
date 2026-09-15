# 섭리오 167 자산 (2026-09-15) — 주인공 시트 재생성·CS 미니언·롤 효과음

사용자 피드백: “2D 캐릭터 도트가 너무 디테일하고 너무 작음(1.4배), 경섭이는 질리언인데 왜 하늘색 머리가 아닌지”, “1-1에는 CS 같은 애들(도트로 재구성)”.

| 자산 | 원본 | 정체성·변형 | runtime |
| --- | --- | --- | --- |
| 요플래 → 판테온 | `pantheon/pantheon-raw.png` (`pantheon.prompt.txt`) | 165 참조(`refs/hyungsub-ref.png`) 그대로, NES 풍 낮은 디테일(5색 이내, 굵은 픽셀) | `assets/sprites/subrio_pantheon.png` 128×256, 64×64 셀, 발 y60, idle 몸 48px |
| 경섭 → 질리언 | `zilean/zilean-raw.png` | **하늘색(#7fd7ff) 긴 머리**, 안경 유지, 떠 있는 시간 마법사(발 아래 틈), 시계 폭탄이 주변에 떠서 나감 | `assets/sprites/subrio_zilean.png` 64×64 셀, 발 y54(6px 떠 있음) |
| 억빠맨 → 브랜드 | `brand/brand-raw.png` | 파란 코알라 + 머리·팔 불꽃 | `assets/sprites/subrio_brand.png` 64×64 셀, 발 y60 |
| 레드 CS | `cs_red/cs_red-raw.png` (참조 `refs/cs-red-ref.png` = `assets/enemies/cs-red-{front,battle-left(좌우 반전)}.png` 4×) | 빨간 후드·둥근 방패·철퇴, 2×2: 걷기 A·B, 스턴(별), 쓰러짐 | `assets/sprites/subrio_cs_red.png` 96×96, 48×48 셀, 발 y44, 걷기 몸 34px |
| 블루 CS | `cs_blue/cs_blue-raw.png` | 파란 후드·방패·망치 | `assets/sprites/subrio_cs_blue.png` |

전부 OpenGateway `openai/gpt-image-2` `images/edits`(단일 `image` 참조), `generate.sh` 로 순차 5회(각 85~100초). `process.py`(`/usr/bin/python3 assets/source/subrio167/process.py`): 저장소 processor 크로마키 정리 → 시트 공통 배율 NEAREST → 원본 셀 안 몸 중심 유지. `preview-3x.png` 에 전부.

보스 시트는 `assets/source/subrio166/process.py` 상수만 112×96 셀·발 y90·idle 몸 64px 로 키워 다시 내보냈다(원본 그대로).

`audio/`: League of Legends 공식 위키 스킬 SFX 원본 ogg(질리언 달콤가득 Q 틱·공식 Q 스턴, 판테온 Q 탭/차징/투척/명중·E 올림/막기)와 합성 `fling_whistle.mp3`. 출처·변환은 `design/audio/references.md`.
