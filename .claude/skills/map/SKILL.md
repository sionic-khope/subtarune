---
name: map
description: "SUBTARUNE 맵 만들기/고치기 — 직접 그린 32px 타일·소품(tools/art)으로 assets/maps/<id>.json 을 작성·연결하고 헤드리스로 확인. '맵', '방', '거실', '구역 추가', '문 연결' 요청에 사용."
argument-hint: "[맵 id] [설명: 어떤 공간, 뭐가 있고 어디로 이어지는지]"
user-invocable: true
allowed-tools: Read, Glob, Grep, Write, Edit, Bash, AskUserQuestion
model: opus
---

# Map (맵 작성)

먼저 `docs/STATE.md` 를 읽는다. 맵은 데이터(`assets/maps/<id>.json`)다. 에디터(`editor.html`)는 같은 JSON 을 GUI 로 만드는 도구일 뿐이므로, 에이전트는 JSON 을 직접 쓴다.

## 절차
1. 공간 콘티 확정(3줄): 크기(타일 수), 가구/소품, 출입구(어느 맵의 어느 스폰으로), 상호작용 대사 키.
2. 필요한 그림이 없으면 **`/art`** 로 먼저 그린다 (`tools/art/room_set.py` 에 `prop_*`/`tile_*` 추가 → PNG 생성).
3. JSON 작성:
   ```json
   { "id":"living", "name":"거실", "bgm":"room",
     "rows":["pppppppppppppp","qqqqqqqqqqqqqq","ffgffgffgffgff", ...],   // 타일 글자: src/world/tiles.js
     "spawns": { "from_room": {"x":100,"y":120} },
     "entities": [
       { "type":"prop","image":"assets/props/sofa.png","x":..,"y":..,"solid":true,"w":..,"h":..,"ix":..,"iy":..,"script":"living_sofa" },
       { "type":"door","x":..,"y":..,"w":32,"h":10,"to":"room","spawn":"door" },
       { "type":"trigger","x":..,"y":..,"w":..,"h":..,"once":true,"flag":"x_seen","script":"x_scene" },
       { "type":"npc","id":"mom","sprite":"mom","x":..,"y":..,"facing":"down","wander":0,"script":"mom_talk" }
     ] }
   ```
   - 소품 `w/h` 를 주면 그게 히트박스이고 그림 위치는 `ix/iy`. 안 주면 그림 아래 40% 가 히트박스.
   - 타일 1칸 = 32 논리px. 벽 2줄(`p`) + 걸레받이 1줄(`q`) + 바닥(`f`/`g` 교차).
4. `assets/maps/index.json` 의 `maps` 에 id 추가. 이어지는 맵의 `door` 에 `to/spawn` 연결.
5. 대사 키는 `src/data/scripts.js` 에 추가.
6. 검증: `?map=<id>&spawn=<스폰>` 으로 헤드리스 스크린샷(`tests/playtest/` 스크립트 참고) → 소품 겹침·y정렬·막힘 확인. 문 통과 테스트.
7. `docs/STATE.md` 의 스토리 진행 상태 갱신.
