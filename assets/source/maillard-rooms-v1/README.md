# 라운지 후속 문·방

철문은 내장 imagegen으로 새로 생성했다. `iron-door/raw-sheet.png`와 `prompt-used.txt`가 원본과 프롬프트다. `generate2dsprite.py process`로 마젠타 제거 후96px 셀/fit0.86/feet/componentall/trim0/edge-clean0, strictQC를 적용했다. 결과 `assets/props/maillard_storage_door.png`, 실제 그림50×82, 셀bbox[23,8,73,90]. 이미지 원본과 QC 메타데이터를 보존한다.

나무문은 기존 `assets/props/door.png`를 런타임1.5배로 표시한다. 목재 마루와 벽도 현행 마이야르호 내부 자산을 이어 쓰며 새 인물·장식·사건은 없다. 방 생성·배치 원본은 `tools/maps/maillard_rooms.py`, 방 배경 조립 원본은 `tools/sprites/prepare_maillard_rooms.py`다.

강퇴폐기창고:480×448, 철제 빈 방, wind. 안쪽 라운지:1440×448, 목재 빈 방, maillard_lounge. 철문 선택지와 검정 전환은 `src/data/cutscenes/maillard_rooms.js`. 두 방은 추후 NPC·이벤트를 추가할 공간이며 현재 콘텐츠를 미리 만들지 않았다.
