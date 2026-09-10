---
name: art
description: "SUBTARUNE 픽셀아트 그리기 — 델타룬 밀도(1논리px=1아트px, 타일 32px)로 타일/가구/소품 PNG 를 tools/art 페인터로 직접 그린다. '그려줘', '가구', '타일', '소품', '배경 만들어' 요청에 사용."
argument-hint: "[뭘 그릴지: 예 소파 64x40, 부엌 타일]"
user-invocable: true
allowed-tools: Read, Glob, Grep, Write, Edit, Bash
model: opus
---

# Art (픽셀아트)

`tools/art/painter.py`(Canvas: rect/outline/rrect/rrect_outlined/dither/blit/shadow) 위에 `tools/art/room_set.py`(방) / `tools/art/living_set.py`(복도·거실·부엌: 벽지2·마루·부엌타일, 티비·소파·밥상·에그타르트·방석·냉장고·싱크대·가스레인지·상부장·화분·시계·달력·러그·장식장·액자·측면 출입구) 처럼 `prop_<name>()` / `tile_<name>()` 함수를 추가하고 실행해 PNG 를 만든다. 실행은 **`/usr/bin/python3`** (PIL/numpy 있음). 델타룬 이미지를 복사하지 않는다 — **같은 스타일로 직접 그린다**.

## 스타일 규칙 (델타룬 느낌)
- 어두운 외곽선 1px(`OUT`), 면은 기본색 + 밝은 톤(윗면/좌상단) + 어두운 톤(아랫면/우하단) 2톤.
- 모서리는 `rrect` 로 2~3px 깎는다. 바닥에 닿는 가구는 `shadow()` 로 디더 그림자.
- 타일은 32×32, 소품은 32의 배수가 아니어도 됨(예 침대 64×96). 벽에 붙는 소품(창문/선반/문/포스터)은 `solid:false`.
- 팔레트는 `room_set.py` 상단 상수 재사용(벽지 WALL, 장판 FLOOR, 나무 WOOD, 시트/이불, 플라스틱, 유리).

## 절차
0. 청록숲은 `tools/art/teal_set.py`, 보라맵은 `void_set.py`/`void10_set.py`. 움직이는 소품은 프레임을 가로로 이어 붙인 띠(`Canvas.blit`)로 저장하고 맵 JSON 에 `anim:{cols,fps}`.
1. 함수 작성 → `main()` 의 `tiles`/`props` dict 에 등록 → `python3 tools/art/room_set.py /tmp/preview.png` 로 미리보기 PNG 를 만들어 **Read 로 확인**한다(반드시 눈으로 본다).
2. 새 타일이면 `src/world/tiles.js` 에 `registerTile('글자', { name, solid, draw: flat('#색') })` 추가(폴백 색). 이름 = PNG 파일명.
3. 맵에 배치는 `/map`.
