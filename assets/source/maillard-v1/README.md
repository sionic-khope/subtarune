# 마이야르호·방송 플랫폼 섬 제작 기록

2026-09-12 사용자 요청으로 내장 이미지 생성(image_gen)으로 제작했다. CLI 이미지 API는 사용하지 않았다. 생성본 자체는 공식 플랫폼 제작물/승인을 뜻하지 않는다.

최종 전함은 `ship-mast/`, 최종 섬은 `island-logos/`의 원본/배경 키잉본이다. `ship/`, `island/`는 돛대·공식 로고 산 추가 전 이력이며 런타임에 쓰지 않는다. 최초 생성 프롬프트, 배경 정리, 돛대/색 포인트와 공식 로고 참고 편집 프롬프트를 각각 txt로 보관했다. 쥰희의 큰 돼지코·늘어진 귀를 목조 배 구조로 옮겼고, 살아 있는 쥰희의 분홍 피부 설정은 바꾸지 않았다.

| 런타임 | 규격 | 소스 |
| --- | --- | --- |
| `assets/props/maillard-ship.png` | 768×496 RGBA | `ship-mast/raw-sheet-clean.png`, alpha bbox (22,13,1515,977) |
| `assets/props/platform-island.png` | 384×202 RGBA | `island-logos/raw-sheet-clean.png`, alpha bbox (50,117,1480,871) |
| `assets/tiles/maillard_deck.png` | 32×32 | `deck-raw.png` 상단1/4의 반복 판자 |
| `assets/backdrops/maillard_sea.png` | 768×512 | `sea-raw.png` |

`generate2dsprite`의 `process --rows 1 --cols 1 --cell-size 1536 --scale-strategy preserve --component-mode all --trim-border 0 --edge-clean-depth 0`로 마젠타만 투명화한 소스를 보존한다. 원본 전체 색 양자화나 프레임별 재그림은 하지 않는다. 그 뒤 `uv run tools/sprites/import_maillard.py`로 alpha 영역 추출과 최근접 배율 조정만 재현한다. 전함의 큰 낙하/전체 줌아웃 배율은 코드 연출이며 PNG를 다시 늘려 저장하지 않는다.

공식 로고 참고 원본·출처·사용 조건은 [logos/README.md](logos/README.md). 게임 섬은 해당 로고를 참고해 생성한 산 그림으로, 원본 로고와 픽셀 단위 동일성을 보장하지 않는다. 상표·음원 사용 권리는 권리자에게 있으며 별도 이용 허가를 취득했다는 뜻이 아니다. 음원 출처는 `design/audio/references.md`와 배포용 `assets/audio/maillard-credits.json`에 보관한다.

컷신 계약은 `design/narrative/cutscenes/obj5_maillard.md`, 실행/저장 경계는 `docs/architecture/maillard-arrival.md`, 최신 적용 상태는 `docs/STATE.md` BUILD102가 기준이다.
