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
   - 맵 옵션: `stage:'pc_checked'`(**필수** — 이 맵에 있으려면 최소 도달해야 하는 스토리 단계, `src/core/story.js`; `?map=` 바로가기가 이걸로 앞 단계를 채운다), `dim:0.22`(살짝 어두운 공간), `enter:{script,flag}`(도착 직후 1회 컷신 — 트리거 대신 이걸 쓴다. 스폰 위 트리거는 금지).
   - 잠긴 문: `{type:'door', to, spawn, requires:'pc_checked', lockedScript:'room_door'}` — 플래그 없으면 대사만(1회), 있으면 이동. 소리 없는 문(보라맵): `"sfx": false`. 전환 페이드는 엔진이 항상 검정.
   - **그림이 있는 문은 `interact:true`** — 밟아서는 아무 일 없고 앞에서 C. 이때 x/y/w/h 는 상호작용 히트박스: 문 그림보다 넓게(≈70px, 문 아래 길 윗줄에 닿게, 예 `void4` door_zone `x:2336,y:206,w:72,h:26`). 잠긴 문은 합류 전에도 C 로 "잠겨 있다" 가 떠야 한다.
   - 세로 통로(계단 등)는 **2타일 폭 이상**(캐릭터 24px 가 1타일 통로를 찾아 들어가기 어렵다 — 2026-09-10 계단 피드백).
   - 표지판: `{ "type":"prop","image":"assets/props/signpost.png","x","y","solid":true,"script":"…" }` (보라 세트). 방 세트용 표지판이 필요하면 `/art` 로 하나 더.
   - 조건 소품: `unless:'tart_eaten'`(플래그 서면 사라짐) / `requires:'x'`. 즉시 없애려면 스크립트에 `{remove:'id'}` + `id`.
   - 벽처럼 **항상 뒤에** 그려야 하는 큰 소품(거대한 문)은 `"sortY":0` 을 주고, 히트박스는 플레이어가 닿는 쪽(길 끝 세로 띠)에 둔다.
   - 바닥에 깔리는 장식(러그·방석)은 `"w":128,"h":2` 처럼 **윗변 2px 히트박스** + `solid:false` → y정렬에서 항상 뒤. script 없는 소품은 C 프로브에 안 잡힌다.
   - **벽에 거는 소품**(포스터·창문·시계·달력·액자)에 대사를 붙이려면 히트박스를 벽 밑단에: `"x":그림x,"y":86,"w":그림폭,"h":10,"ix":그림x,"iy":그림y,"solid":false,"script":...` (바닥이 y=96 에서 시작할 때. 복도처럼 바닥이 y=224 면 y:214). 그림 위치 그대로 두면 절대 안 닿는다.
   - 새 소품에 대사를 붙였으면 `tests/playtest/furniture.mjs` 의 CASES 에 (이름, 서는 x, y, 방향, 기대 키워드) 한 줄 추가.
   - 측면 출입구(복도 끝처럼 옆으로 나가는 곳): 벽 타일 위에 `doorway_left/right.png` 소품 + 그 앞 바닥 세로 띠에 `door` 영역(`w:16,h:104`). 도착 스폰은 띠에서 24px 이상 떨어뜨린다.
   - **보라맵(void) 계열**: 큰 아치문 `big_door.png` 은 보라맵1 출구에만. 이후 맵은 땅을 화면 가장자리까지 이어 붙이고 그 끝에 `door` 영역만(문 그림 없음) → 나가는 방향이 한눈에 보인다. 잠긴 문이 필요하면 작은 `door_small.png` + `padlock.png`. 뗏목 탄 플레이어는 엔진이 항상 위에 그린다.
   - **뗏목/탈것**: `{ "type":"raft","id":"raft1","image":"assets/props/raft.png","x":128,"y":108,"route":[[584,108]],"speed":114 }` — x,y·route 는 이미지 좌상단, 물 타일(`o/O`) 위. 타는 자리(착지)는 뗏목 옆 1타일 안(프로브 0.6타일). 위치는 `flags.raft_<id>` 로 유지.
   - 맵 가장자리 출입구: 문 영역은 **플레이어가 실제로 닿는 칸 안**에 둔다(가장자리 타일이 막힘이면 플레이어 x 최소 32, 최대 폭-56). 스폰은 그 영역과 24px 이상 떨어뜨린다.
   - **낙석 레인**: `{ "type":"rockfall","image":"assets/props/rock.png","x":레인중심,"ground":길 맨 아랫줄 y(250),"period":2.0,"offset":…,"warn":0.8,"fall":0.4,"rest":0.45 }` — 입구에서 8타일 뒤 첫 레인, **5타일 간격**, 리듬은 offset. 맵엔 `dim:0.3` 을 줘서 스포트라이트가 보이게. 바위는 화면 위에서 길 전체를 쓸고 내려오니 길은 3줄 그대로. 소리 없음. 예 `void5/6/7`.
   - 위험 구간 맵은 **화면 두세 배 이상** 길게(void5 30열·void6 48열·void7 60열). 짧으면 '들어가자마자' 느낌이 난다.
   - 동료가 될 NPC: `{ type:'npc', id:'<캐릭터id>', sprite:'<캐릭터id>', unless:'<id>_joined', script:'…' }` — id 가 캐릭터 id 와 같아야 `{join}` 이 NPC 를 치운다. 동료는 벽·소품과 충돌하지 않으니 통로 폭은 신경 안 써도 됨.
   - 새 맵/이벤트마다 `src/core/story.js QA_POINTS` 에 바로가기(직전 지점)를 추가하고 스폰에 `facing` 을 준다. 이벤트 뒤 상태로 바로 가야 하면 `flags:{…}`.
   - 맵 옵션 `backdrop`(원경), `tileSwaps`(플래그로 행 교체), `preload`(컷신 spawn 이미지) — `docs/STATE.md` '맵 연출 옵션'. **도트 밀도**: 요청 없는 소품은 델타룬식 최소 디테일(외곽선+한두 색).
4. `assets/maps/index.json` 의 `maps` 에 id 추가. 이어지는 맵의 `door` 에 `to/spawn` 연결.
5. 대사 키는 `src/data/scripts.js` 에 추가.
6. 검증: `node --test 'tests/unit/*.test.mjs'`(크기·벽·문 핑퐁·스폰·영역 겹침·스크립트 키·이미지 존재) → `tests/playtest/house.mjs` 에 새 구간을 이어 붙여 헤드리스로 동선·상호작용·재진입을 확인하고, 스크린샷 **네 모서리**를 본다.
7. `docs/STATE.md` 의 스토리 진행 상태 갱신.
