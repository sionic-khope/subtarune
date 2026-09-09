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

## 표현 규칙 (반드시)
- 맵 크기 ≥ 480×360. 타일맵은 사방을 벽 타일(`p/q/e/#`)로 닫는다 → 검은 띠/뚫림 금지. `node --test 'tests/unit/*.test.mjs'` 가 검사한다.
- 소품 위에 서는 연출(침대 등)은 엔진이 자동으로 앞에 그리지만, 스크린샷으로 전환 순간을 확인한다.

## 상호작용 무결성 체크리스트 (RPG 맵에서 항상 터지는 것들 — 전부 엔진/테스트가 막지만, 설계 때도 지킨다)
| 문제 | 규칙 | 어디서 막나 |
|---|---|---|
| 트리거 위에 서 있으면 대사 무한 반복 | 트리거는 **들어가는 순간** 한 번, 나갔다 와야 재발동. 끝난 뒤 0.35s 쿨다운 | `Trigger` (world.js) |
| 대사 중/맵 전환 중 트리거·문 발동 | `dialogue.running`/`transitioning` 이면 무시 | `Trigger`, `Door` |
| 문 ↔ 문 무한 왕복 | 도착 스폰은 목적지 맵의 어떤 문 영역과도 겹치면 안 됨 + 도착 후 0.6s 쿨다운 | `tests/unit/maps.test.mjs`, `Door.cooldown` |
| 스폰이 벽/가구 안 → 끼임 | 스폰은 막힘·소품 히트박스 밖 (침대 눕기 `bed` 만 예외) | maps.test |
| 트리거끼리 겹침 → 동시에 두 대사 | 영역은 서로 겹치지 않게 | maps.test |
| 1회 이벤트 재발 | `once:true` + `flag` | `Trigger` |
| C 연타로 대사 두 번 열림 | 상호작용은 `just('confirm')` + `dialogue.running` 가드 | main.js |
| 상호작용 대상 못 잡음 | 히트박스는 소품 **아래쪽**(발이 닿는 면), 프로브 거리 0.6타일 | Prop, Player.probe |
| 컷신 끝나자마자 트리거 재발 | 컷신 스크립트 끝에 플레이어를 트리거 밖으로 이동시키거나 `once` | 컷신 작성 시 |
| 배회 NPC 가 문/통로 막음 | `wander` 반경은 문·통로에서 2타일 이상 떨어뜨림 | 배치 시 |

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
   - 타일 1칸 = 32 논리px. 벽 2줄(`p`/`P`) + 걸레받이 1줄(`q`/`Q`) + 바닥(방 `f/g`, 거실 마루 `h/i`, 부엌 `k/l`). 측면·하단 벽 `e`. 벽 바깥은 공백(검정) — ㄱ자 맵처럼 벽 너머가 보이면 검정이 정상.
   - 맵 옵션: `dim:0.22`(살짝 어두운 공간), `enter:{script,flag}`(도착 직후 1회 컷신 — 트리거 대신 이걸 쓴다. 스폰 위 트리거는 금지).
   - 잠긴 문: `{type:'door', to, spawn, requires:'pc_checked', lockedScript:'room_door'}` — 플래그 없으면 대사만(1회), 있으면 이동.
   - 조건 소품: `unless:'tart_eaten'`(플래그 서면 사라짐) / `requires:'x'`. 즉시 없애려면 스크립트에 `{remove:'id'}` + `id`.
   - 바닥에 깔리는 장식(러그·방석)은 `"w":128,"h":2` 처럼 **윗변 2px 히트박스** + `solid:false` → y정렬에서 항상 뒤. script 없는 소품은 C 프로브에 안 잡힌다.
   - 측면 출입구(복도 끝처럼 옆으로 나가는 곳): 벽 타일 위에 `doorway_left/right.png` 소품 + 그 앞 바닥 세로 띠에 `door` 영역(`w:16,h:104`). 도착 스폰은 띠에서 24px 이상 떨어뜨린다.
4. `assets/maps/index.json` 의 `maps` 에 id 추가. 이어지는 맵의 `door` 에 `to/spawn` 연결.
5. 대사 키는 `src/data/scripts.js` 에 추가.
6. 검증: `node --test 'tests/unit/*.test.mjs'`(크기·벽·문 핑퐁·스폰·영역 겹침·스크립트 키·이미지 존재) → `tests/playtest/house.mjs` 에 새 구간을 이어 붙여 헤드리스로 동선·상호작용·재진입을 확인하고, 스크린샷 **네 모서리**를 본다.
7. `docs/STATE.md` 의 스토리 진행 상태 갱신.
