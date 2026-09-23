# BUILD305 · 가재맨 성 내부 타일

기존 `assets/props/gajaeman_castle.png`의 어두운 보라색 석재 팔레트를 기준으로 생성한 타일4종이다. 내장 `image_gen` 1회 생성이며 실제 모델 ID·비용은 도구에서 공개되지 않아 unknown이다. 원본은 `raw-atlas.png`, 정확한 생성 지시는 `prompt-used.txt`에 보존한다.

보존 원본: `assets/source/ship-invasion305-tiles/raw-atlas.png` (생성 식별자 `exec-01c47602-bd14-41f3-b1d1-0736d00a07c6`).

| 원본 위치 | 원본 crop | 런타임 파일 |
| --- | --- | --- |
| 좌상 | 0,0,627,627 | `assets/tiles/gajaeman_castle_floor.png` |
| 우상 | 627,0,1254,627 | `assets/tiles/gajaeman_castle_cracked.png` |
| 좌하 | 0,627,627,1254 | `assets/tiles/gajaeman_castle_wall.png` |
| 우하 | 627,627,1254,1254 | `assets/tiles/gajaeman_castle_capstone.png` |

모두32×32 RGB 불투명 타일이다.1254×1254 RGB 원본을 정확한2열×2행 사분면으로 나눈 뒤 NEAREST 축소만 적용했다. 알파 생성·색키 제거·팔레트 양자화·수작업 픽셀 보정은 없다. 기존 `assets/source/choimis-flower291/tiles/export.py`의 전면 채움 타일 추출 방식을 재사용했다.

## 재현과 확인

```sh
uv run assets/source/ship-invasion305-tiles/export.py
```

각 타일의3×3 반복은 `*-repeat-1x.png`, 전체 비교는 `repeat-preview-1x.png`와 `repeat-preview-6x.png`다. 기본/균열 바닥 혼합은 `mixed-floor-preview-1x.png`와 확대본으로 확인한다.1x에서는 타일이 실제32px이며,6x도 최근접 확대만 사용한다.

기본/균열 바닥은 혼합 배치에서 보라색 석재 간격과 명암이 이어진다. 균열은32px에서 가는 어두운 선으로 읽힌다. 벽·덮개돌은 둘 다 위쪽에 밝은 덮개가 포함된 원본이며 가로 반복에 맞는다. 여러 행을 세로로 쌓으면 각 행마다 밝은 덮개가 반복된다. 화면 가장자리의 RGB값 완전 일치를 뜻하는 seamless 보장은 하지 않으며 `qc.json`에 좌우·상하 가장자리 차이를 수치로 기록했다.

검증: 출력4종 모두32×32 RGB·1024 불투명 픽셀·서로 다른 이미지이며, 별도 검사에서 각각 정확한 사분면의 NEAREST 결과와 픽셀 단위 일치를 확인했다. 추출 실행 성공, Python 규칙 검사 위반0. 타일 등록·맵 배치·실 게임 검수는 통합 담당이 수행한다.
