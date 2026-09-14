# 비데 방 소품 · BUILD164 (2026-09-15)

OpenGateway `openai/gpt-image-2`(high)로 Claude가 `tools/sprites/imagegen.py`로 직접 생성한 첫 게임 자산 2종과 페인터 소품 2종.

| 자산 | 원본 | 처리 | runtime |
| --- | --- | --- | --- |
| 거대 게임 스크린 | `screen/screen-raw.png` 1024×1024 (프롬프트 `screen/screen.prompt.txt`, usage `screen-raw.meta.json`) — 사용자 참고 이미지(젤다풍 휴대용 게임 화면·나무 캐비닛)를 글로 옮김 | `process.py`: 저장소 processor strict-QC → clean 원본 0.2734× NEAREST → 256×256, 이진 알파, fringe 34px | `assets/props/bidet_screen.png` bounds (4,4)–(252,252) |
| 키오스크 컨트롤러 | `kiosk/kiosk-raw.png` 1024×1536 | 0.0787× NEAREST → 64×96 셀, 하단 중앙 피벗(32,94) | `assets/props/bidet_kiosk.png` bounds (12,4)–(53,94) |
| 마리오풍 토관 | 페인터 `tools/art/youngcle7_set.py` | 64×64 | `assets/props/mario_pipe.png` |
| 초록 버섯 | 기존 `editor-union-mushroom.png`의 빨간 128px만 색상 교환(기계적) | 24×24 | `assets/props/editor-union-mushroom-green.png` |
| 철창 | 페인터 `tools/art/youngcle7_set.py`(무대 위 통로용) | 128×96, 창살 사이 투명 | `assets/props/youngcle_grate.png` |
| 토관 소리 | `audio/smb_pipe.wav`(themushroomkingdom.net, mario_jump 와 같은 출처) | mp3 변환, 0.786초 | `assets/audio/sfx/mario_pipe.mp3` |

스크린 안의 글자 상자는 실제 문자가 아닌 블록 무늬(생성 시 지시). `preview-2x.png`에 두 생성 자산을 나란히 두었다. 참고 이미지 원본 파일은 대화에만 첨부되어 저장하지 못했다.
