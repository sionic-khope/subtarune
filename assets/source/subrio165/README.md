# 섭리오 자산 · BUILD165 (2026-09-15)

OpenGateway `openai/gpt-image-2`로 `tools/sprites/imagegen.py`가 직접 생성. 캐릭터 세 장은 **`images/edits` 단일 `image` 참조**(이 저장소 실행기로 첫 실제 edits 호출, 각 ~80초, 입력 image 704 토큰) — 참조는 `refs/<id>-ref.png`(기존 이동 시트의 정면+오른쪽 프레임을 4× NEAREST로 나란히, 마젠타 배경). 아이콘 세 장은 `images/generations`(medium).

| 자산 | 원본 | 정체성·변형 | runtime |
| --- | --- | --- | --- |
| 요플래 → 판테온 | `pantheon/pantheon-raw.png` (프롬프트 `pantheon.prompt.txt`) | 안경·입 없음 유지, 청동 투구·붉은 깃·둥근 방패·창 | `assets/sprites/subrio_pantheon.png` |
| 경섭 → 질리언 | `zilean/zilean-raw.png` | 긴 검은 머리·안경 유지, 남색 금테 로브·등의 큰 시계·회중시계 | `assets/sprites/subrio_zilean.png` |
| 억빠맨 → 브랜드 | `brand/brand-raw.png` | 파란 코알라 유지, 머리·팔의 불꽃, 갈라진 주황 선 | `assets/sprites/subrio_brand.png` |
| 직업 아이콘 | `icons/{spear,fire,clock}-raw.png` | 창·불·시계 단일 오브젝트 | `assets/props/subrio_icon_*.png` 32×32 |

`process.py`: 저장소 processor는 크로마키 정리·빈 프레임 검사용(`--allow-source-edge-touch`: 창/불꽃을 뻗은 공격 프레임이 셀 가장자리 판정에 걸리지만 눈으로 셀 안에 들어 있음을 확인). runtime 픽셀은 `standard/raw-sheet-clean.png`에서 시트당 하나의 배율(idle 몸 높이 34px)로 NEAREST 축소해 48×48 셀 발 y44에 놓았다. 프레임별 fit 없음, 이진 알파, 마젠타 fringe 제거. `preview-3x.png`에 세 시트 24프레임과 아이콘.

관찰: 세 시트 모두 8프레임 순서(idle·걷기 3·점프·앉기·공격·방어) 일치, 오른쪽 향함, 얼굴 정체성 유지. 질리언 방어 프레임의 시계 결계는 몸에서 떨어진 그림이라 셀 안에서만 보인다. 음원 `audio/`는 Toby Fox Deltarune Ch.3+4 OST 원본 webm(`design/audio/references.md`).
