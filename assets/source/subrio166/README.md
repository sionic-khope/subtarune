# 섭리오 보스 따듯한비데 · BUILD166 (2026-09-15)

OpenGateway `openai/gpt-image-2` `images/edits`(단일 `image` 참조)로 `tools/sprites/imagegen.py`가 직접 생성. 85.5초, 입력 image 672 토큰·출력 5,488 토큰.

| 자산 | 원본 | 정체성·변형 | runtime |
| --- | --- | --- | --- |
| 따듯한비데 → 플랫포머 보스 | `bidet/bidet-raw.png` (프롬프트 `bidet.prompt.txt`) | 참조 `bidet/refs/bidet-ref.png` = 기존 `warm_bidet.png` 정면(0행 0열)+오른쪽(3행 0열) 프레임을 2× NEAREST 로 마젠타 위에 나란히. 뾰족한 검은 머리·빨간 테 회색 갑옷·가시 견갑·거대한 양날 도끼 유지 | `assets/sprites/subrio_bidet.png` 160×256, 80×64 셀 |

`process.py`(`/usr/bin/python3 assets/source/subrio166/process.py`): 저장소 processor 는 크로마키 정리·빈 프레임 검사(`--allow-source-edge-touch`). runtime 픽셀은 `bidet/standard/raw-sheet-clean.png` 에서 시트 공통 배율(idle 몸 46px, 0.1474)로 NEAREST 축소해 80×64 셀 발 y60 에 놓았다. 가로는 원본 셀 안의 몸 중심을 유지(휘두르기·물줄기 프레임이 앞으로 뻗으므로 중앙 정렬하면 몸이 뒤로 밀린다). 원본에서 5번(윈드업) 프레임의 치켜든 도끼 끝이 셀 경계 y768 을 4px 넘어 3번(걷기B) 셀 바닥에 걸쳐 그려져(걷기B 몸은 y711 에서 끝남) 두 프레임 경계만 y740 으로 옮겨 잘랐다. 이진 알파, 마젠타 fringe 제거. `preview-3x.png` 에 8프레임.

프레임 순서(row-major): idle(도끼 어깨에), walkA, walkB, jump, windup(도끼 머리 위), swing(앞으로 내려찍음), spray(손바닥 물줄기 — 물줄기 그림은 프레임 안에 포함, 실제 투사체는 `assets/props/subrio_water.png`), hurt(뒤로 젖혀짐). 오른쪽 향함.

타일 3팔레트·깃발·물줄기·하트는 페인터 `tools/art/subrio_set.py`. 새 음원 없음(기존 `thud/whoosh/splash/hit/hurt/cannon_guard_block/explosion/vaporized/won/fanfare/confirm/mario_jump`).
