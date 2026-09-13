# 영클 138 이동 시트

내장 이미지 생성기의 최종 원본은 `raw-sheet.png`, 앞선 초안은 `first-draft.png`로 보존했다. 최종 입력은 `exec-8b3e9d65-016c-45b8-8aea-191a92428f0a.png`다. 큰 흰 눈·검은 눈동자, 갈색 곱슬 한 가닥, 분홍 머리, 파란 셔츠·녹색 표시·남색 반바지·검정 신발을 유지하며, 약 3등신으로 조정한 생성 원본이다.

런타임 `assets/sprites/youngcle.png`는 투명 256×256, 64×64 셀 16개다. 행 순서는 down/up/left/right이며 각 방향 원본 4프레임을 사용한다. `four-direction-preview.png`는 각 행 첫 프레임을 같은 순서로 놓은 최근접 4배 확대본이다. 방향별 PNG 16장과 150ms GIF 4개도 보관했다.

처리기는 `generate2dsprite` 스킬을 사용했다. 원본의 마지막 행 곱슬머리가 균등 분할 경계에 걸리므로 빈 여백 y=[0,315,622,921,1254]에서 행을 나누고, 폭313의 열을 배율 변경 없이 384×384 셀에 중앙 배치해 `raw-grid.png`를 만들었다.

```sh
uv run --with pillow python -c 'from PIL import Image; from pathlib import Path; p=Path("assets/source/youngcle138"); src=Image.open(p/"raw-sheet.png"); cuts=(0,315,622,921,1254); atlas=Image.new("RGB",(1536,1536),(255,0,255)); [(atlas.paste(src.crop((c*313,cuts[r],(c+1)*313,cuts[r+1])),(c*384+35,r*384+(384-(cuts[r+1]-cuts[r]))//2))) for r in range(4) for c in range(4)]; atlas.save(p/"raw-grid.png")'
SPRITE_PROCESSOR=/Users/khope@sionic.ai/.codex/skills/generate2dsprite/scripts/generate2dsprite.py
uv run --with pillow --with numpy "$SPRITE_PROCESSOR" process --input assets/source/youngcle138/raw-grid.png --target npc --mode walk --rows 4 --cols 4 --cell-size 64 --fit-scale 0.83 --align feet --shared-scale --scale-strategy fit --component-mode all --trim-border 0 --edge-clean-depth 0 --strict-qc --duration 150 --output-dir assets/source/youngcle138/processed
uv run assets/source/youngcle138/export.py
```

마지막 명령은 같은 변경 묶음의 속옷 투사체도 내보내므로 `../mankatsuki138/README.md`의 처리 명령을 먼저 실행한다. 처리기 위치는 설치 환경에 맞게 지정한다.

`processed/pipeline-meta.json`은 처리기 QC다. 기본 중간물의 LANCZOS 축소는 런타임에 사용하지 않는다. `export.py`는 정리된 원본에서 방향별 4장 공통영역을 잡고 전체 16장에 공통 배율 0.19557195571955718을 적용한다. 각 행의 같은 축소 격자와 발 기준선 y=59를 유지한다. 프레임마다 몸에 맞춰 배율을 늘리지 않으며, 원본 픽셀 재그림·팔레트 양자화·외곽선 침식은 없다.

최종 16프레임 모두 유효하며 실제 알파 밑변이 y=59다. 원본/출력 경계 접촉·잘림·빈 프레임이 없다. 공통영역, 출력 범위, 배율은 `export-meta.json`에 기록했다.
