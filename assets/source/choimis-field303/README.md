# 최미스 꽃 필드 이동폼 · field303

이미 생성된 4×4 원본을 기계적으로 내보낸 필드 이동 시트다. 흰 삐친 머리, 검은 눈썹, 사각 안경 안의 두 눈, 긴 코, 치아 입, 볼 점, 분홍 GAP 상하의의 최미스 정체성과 길고 가는 체형을 보존했다. 망토는 넣지 않았다. 새 그림, 체형 늘이기, 색키, 팔레트 보정은 하지 않았다.

- [최종 런타임 시트](../../../sprites/choimis_flower.png): 512×512 RGBA, 4열×4행, 128×128 셀.
- [동일한 source 최종 시트](sheet-transparent.png)와 런타임 PNG는 바이트가 같다.
- 행은 `down`, `up`, `left`, `right`; 각 행은 열 `0→1→2→3`의 160ms loop다. 공통 발 pivot은 `(64,120)`이다.
- front/down 행은 생성 원본의 가벼운 왼쪽 3/4 각도를 그대로 유지한다. 전체 방향·발 이동은 down으로 읽히며, left/right와 up 행은 각각 좌/우/후면으로 구분된다.
- 공통 배율 `0.3771043771043771`, NEAREST. 최종 가시 높이는 106~112px이며 최대112px로 128px 셀에 남김 없이 들어간다.
- [최종 4×4 contact sheet](preview-contact-4x.png), [기존/신규 contact 비교](previous-vs-field303-contact-4x.png), 방향별 GIF([down](down.gif), [up](up.gif), [left](left.gif), [right](right.gif))를 검수용으로 보관했다.

## 원본과 재현

`raw-sheet.png`은 내장 이미지 생성 결과 원본(1254×1254 RGBA)이며 그대로 보존한다. 처리 전 `raw-sheet-clean.png`은 생성 캔버스 끝의 투명 2px만 제거해 1252×1252, 정확한 313px 4×4 셀로 정규화한다. 이후 본체 최대 연결 component보다 아래에 분리된 left 행의 검은 점/대시만 alpha로 제거하고, 각 셀의 기존 픽셀을 균일 NEAREST로 축소해 발을 공통 pivot으로 평행 이동한다. 프레임별 개별 scale이나 그림 수정은 하지 않는다.

```sh
cd assets/source/choimis-field303
uv run export.py /private/tmp/subtarune-choimis294
```

`prompt-used.txt`는 실제 생성 프롬프트, `choimis-flower-runtime-before303.png`는 교체 전 field sheet, `choimis-flower-battle-idle-reference.png`는 비교 전용 전투 대기 원본이다. `qc-meta.json`과 `processor/pipeline-meta.json`은 alpha·frame·pivot·crop 수치를 기록한다. 도구가 공개하지 않은 모델 ID, 비용, 내부 품질 설정은 unknown이다.

이 작업은 PNG 교체까지만 포함한다. 캐릭터 레지스트리·애니메이터·장면 검증·커밋은 포함하지 않는다.
