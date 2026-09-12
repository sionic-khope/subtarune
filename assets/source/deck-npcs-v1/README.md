# 갑판 NPC 원본과 가져오기

- 착검하고검사로살기: 사용자의 흰 긴 목·둥근 안경·큰 코·웃는 입을 유지한 내장 imagegen 4방향×4프레임. 전신의 흰 옷·검은 신발은 원본에 없던 제작 보완이다.
- 위믹스: 사용자의 분홍·보라·흰색·파랑 블록 캐릭터를 내장 imagegen으로 재구성한4방향×4프레임. 얼굴을 추가하지 않았다.
- 파랑이·노랑이: 후속 지시대로 `references/`의 첨부 원본 그대로 사용한다. 알파 여백 제거와 최근접48px 높이 축소만 했다. 먼저 시작됐던 생성 초안은 채택하지 않았으며 저장소에 포함하지 않는다.

생성 입력·원본은 `references/`, 채택 생성 원본/프롬프트/처리 메타데이터는 `chakgeom/`, `wemix/`. 시트 행은 down/up/left/right, 열은 중립/발A/중립/발B. 런타임 셀96×96. 원본을 직접 그리거나 색 양자화하지 않았다.

위믹스 생성본의 실제 행 간격은 일정하지 않아서 원본 빈 공간 경계0/374/727/1080/1484로 분할하고 동일416셀에 복사한 `raw-grid.png`를 처리한다. 이는 그림 수정이 아니라 프레임 분리이며, 원본의 완전한 머리/신발을 보존한다. 분홍색이 사라지지 않도록 배경 거리35/가장자리55, 테두리 제거0으로 처리한다.

재현:

```sh
uv run tools/sprites/import_deck_npcs.py --prepare
uv run --with numpy --with pillow <generate2dsprite>/scripts/generate2dsprite.py process --input assets/source/deck-npcs-v1/wemix/raw-grid.png --target npc --mode walk --rows 4 --cols 4 --output-dir assets/source/deck-npcs-v1/wemix --cell-size 96 --fit-scale 0.88 --shared-scale --align feet --component-mode all --threshold 35 --edge-threshold 55 --edge-clean-depth 0 --trim-border 0 --strict-qc
uv run tools/sprites/import_deck_npcs.py
```

착검은 `raw-sheet.png`를 같은4×4·96셀·0.88공유배율·feet 설정으로 처리한 결과다. 음원은 `audio-provenance.md` 참조. 전체 원본 영상은 저장소에 넣지 않는다.
