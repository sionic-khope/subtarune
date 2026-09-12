# 라운지 NPC 원본과 내보내기

모든 캐릭터 그림은 내장 이미지 생성기의 원본이다. 이 폴더의 후처리는 배경 투명화, 잘라내기, 공통 배율 조정, 위치 정렬과 행 재배열만 한다. 새 포즈를 코드로 그리거나 합성하지 않는다.

## 엔진 계약

| 파일 | 규격 | 배율·기준점 |
| --- | --- | --- |
| `assets/sprites/yakulbeol.png` | 256×256, 64×64 셀 16개 | down/up/left/right, 방향마다 원본 4프레임 |
| `assets/sprites/mabaem.png` | 256×256, 64×64 셀 16개 | 원본 down/up/right/left를 down/up/left/right로 재배열 |
| `assets/sprites/parkwonsung.png` | 256×256, 64×64 셀 16개 | down/up/left/right, 방향마다 원본 4프레임 |
| `assets/sprites/yerim.png` | 320×320, 정지 1장 | `stillScale: 0.29`, `stillPivot: [160, 300]` |
| `assets/sprites/yerim-kick.png` | 320×320, 발차기 1장 | 정지와 같은 배율·기준점 |

예림의 실제 그림 높이는 245~246px이며 게임의 1.43배 표시를 포함하면 약 102px다. 지지하는 발을 기준으로 x를 맞추고, 전체 프레임을 평행 이동하여 실제 밑변을 y=300에 고정했다. 발차기의 늘어난 가로 폭 때문에 몸을 축소하지 않는다. 중립·준비·발차기·복귀 PNG와 GIF를 `yerim/`에 보관했다.

도트 NPC 셋은 팔레트 양자화 없이 원본 색을 최근접 샘플링했다. `processed/`의 기본 처리기는 LANCZOS를 사용하므로 최종 PNG는 `export.py`가 같은 측정 영역·공통 배율·위치를 사용해 최근접으로 다시 내보낸다. GIF는 형식상 색상표를 사용하지만 런타임 PNG에는 적용하지 않는다. 예림은 요청한 부드러운 일러스트 표현을 위해 LANCZOS 결과를 유지한다.

## 재현

처리기 위치는 설치된 `generate2dsprite` 스킬의 `scripts/generate2dsprite.py`다. 아래 `SPRITE_PROCESSOR`를 해당 경로로 지정한다.

```sh
SPRITE_PROCESSOR=/Users/khope@sionic.ai/.codex/skills/generate2dsprite/scripts/generate2dsprite.py
```

세 도트 NPC는 아래 명령을 각각 `NAME=yakulbeol`, `NAME=mabaem`, `NAME=parkwonsung`으로 실행한다. 박원숭만 입력을 `raw-grid.png`로 바꾼다. 프롬프트 및 원본은 각 폴더에 보관한다.

```sh
NAME=yakulbeol
uv run --with pillow --with numpy "$SPRITE_PROCESSOR" process \
  --input "assets/source/lounge-npcs-v1/$NAME/raw-sheet.png" \
  --target npc --mode walk --rows 4 --cols 4 --cell-size 64 \
  --fit-scale 0.92 --align feet --shared-scale --scale-strategy fit \
  --component-mode all --trim-border 0 --edge-clean-depth 0 \
  --strict-qc --duration 150 \
  --output-dir "assets/source/lounge-npcs-v1/$NAME/processed"
uv run assets/source/lounge-npcs-v1/export.py "assets/source/lounge-npcs-v1/$NAME"
# 마뱀 내보내기는 --row-order 0,1,3,2를 추가한다.
```

박원숭 원본 1244×1265는 행 간격이 균등하지 않다. 빈 가로 여백의 y=[0,320,620,916,1265], 열 폭311로 먼저 잘라 각 조각을 배율 변경 없이 384×384 셀 중앙에 놓아 `raw-grid.png` 1536×1536을 만든다. 이 보정은 뒤쪽 행의 머리 잘림을 방지한다. 원본 `raw-sheet.png`는 보존한다.

```sh
uv run --with pillow python -c 'from PIL import Image; from pathlib import Path; p=Path("assets/source/lounge-npcs-v1/parkwonsung"); src=Image.open(p/"raw-sheet.png"); cuts=(0,320,620,916,1265); atlas=Image.new("RGB",(1536,1536),(255,0,255)); [(atlas.paste(src.crop((c*311,cuts[r],(c+1)*311,cuts[r+1])),(c*384+(384-311)//2,r*384+(384-(cuts[r+1]-cuts[r]))//2))) for r in range(4) for c in range(4)]; atlas.save(p/"raw-grid.png")'
```

예림은 아래 공통 배율로 2×2를 처리한다.

```sh
uv run --with pillow --with numpy "$SPRITE_PROCESSOR" process \
  --input assets/source/lounge-npcs-v1/yerim/raw-sheet.png \
  --target npc --mode kick --rows 2 --cols 2 --cell-size 320 \
  --fit-scale 0.80 --align feet --shared-scale --scale-strategy preserve \
  --component-mode largest --trim-border 0 --edge-clean-depth 0 \
  --strict-qc --duration 150 \
  --output-dir assets/source/lounge-npcs-v1/yerim/processed
```

`processed/kick-1.png`부터 순서대로 중립·준비·발차기·복귀다. 각 PNG를 동일한 320×320 투명 캔버스에 `(0, 300 - alpha_bbox.bottom)`만큼 평행 이동한다. 중립과 발차기를 위 엔진 파일 경로에 복사한다. 지원 발 x=160과 공통 원본 배율0.4082934609250399는 유지된다.

## 검증

최종 3개 걷기 시트는 각각 16/16 유효 프레임, 예림은 4/4 유효 프레임이다. 최종 처리에 빈 프레임·원본 경계 접촉·출력 경계 접촉·강제 위치 제한은 없다. `processed/pipeline-meta.json`은 처리기 QC, `export-manifest.json`은 도트 PNG 최종 위치와 행 순서를 기록한다. `export.py --help`, 잘못된 행 순서 거부, 정상 내보내기를 실행했고 Ruff·Python 규칙 검사·BasedPyright를 통과했다.
