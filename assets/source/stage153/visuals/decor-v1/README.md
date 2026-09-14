# 무대 장비 소품

내장 imagegen 원본 `exec-c7c1667a-5075-445f-ba09-5fb914949286.png`의 2열×2행 소품팩을 제공된 스킬 처리기로 먼저 분리한 뒤 네 소품 각각의 종횡비를 보존해 NEAREST 축소했다. 원본은 `processed/raw-sheet.png`, 최종 치수와 알파 처리는 `runtime-contract.json`이다. 생성 프롬프트는 부모 작업자가 별도로 기록한다.

| 런타임 파일 | PNG/기본 월드 크기 |
| --- | --- |
| editor-union-speaker.png | 64×88 |
| editor-union-truss.png | 218×112, 램프4개 전부 포함 |
| editor-union-curtain.png | 96×124 |
| editor-union-control.png | 96×52 |
| editor-union-wall-panel.png | 128×76 |

벽 패널만 기존 `youngcle6_walls.png`의 x32/y24/w128/h76을 픽셀 그대로 잘랐다. 그 원본은 `native-wall-source.png`에 보존한다. 바닥이나 관중은 포함하지 않고 기존 파란 벽·세로이음·가로레일만 사용한다. 새 그림을 코드로 그리지 않았다.

모든 PNG는 투명 여백을 최소화한 크기다. 월드에서 종횡비를 바꾸거나 높이만 확대하지 않는다. 스피커64×128/커튼96×176의 초기 캔버스 제안은 쓰지 않으며 tight dimensions가 최신 계약이다.

QC: 스킬 strict 검증4개 정상, empty0, source/output edge0, clamp0. 서로 다른 네 소품의 몸체CV는 크기 일관성 지표로 사용하지 않는다. 최종5개 그림을 열어 도트 밀도·잘림 없음·스피커 케이블·램프4개·커튼 술·콘솔케이블 보존을 확인했다. RGBA와 알파0..255를 사용하며 잔여 반투명 가장자리는64기준으로 정리했다. 실제 맵 배치/충돌/조명은 부모 통합 QA 범위다.

재현: 저장된 `processed/single-1.png`~`single-4.png`를 준비하고 `uv run export.py`. Python 의존성은 스크립트 PEP723에 있다. 전체 게임 검사·커밋은 이 자산처리 작업에서 실행하지 않는다.
