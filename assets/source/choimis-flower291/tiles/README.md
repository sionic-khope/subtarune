# 밤 해안 암반 타일

사용자 밤 해안 확장 요청용 이미지 모델 생성 원본을 좌우로 분할했다. 공급자는 Codex 내장 imagegen, 내부 모델/요금/seed는 도구에서 공개되지 않아 unknown이다. 원본은 `raw-atlas.png`(1774×887 RGB), 실제 프롬프트는 `prompt-used.txt`다. 원 생성 파일 `exec-72ffc1e8-8ba2-4c6a-93f9-c74494a9aa01.png`는 변경하지 않았다.

- `assets/tiles/night_coast_rock.png`: 왼쪽(0,0,887,887),32×32 RGB.
- `assets/tiles/night_coast_edge.png`: 오른쪽(887,0,1774,887),32×32 RGB.

정사각형 전체를 NEAREST로 축소했으며 색·그림·경계를 다시 그리지 않았다. 배경이 필요한 지형이라 완전 불투명이며 캐릭터용 색키를 적용하지 않았다. `repeat-preview-6x.png`는 각 타일3×3 반복 검사다. 암반에는 빈 테두리/마젠타/투명 구멍이 없고 절벽은 가로 반복용이다. 절벽의 윗턱은 세로 반복마다 다시 나타나므로 다층 벽으로 쌓지 않고 경계용으로 사용한다. 최종 맵에서의 충돌·다른 타일 접합은 통합 담당 검수 범위다.

재현: `uv run assets/source/choimis-flower291/tiles/export.py`. exact crop과 출력 규격은 `qc.json`.
