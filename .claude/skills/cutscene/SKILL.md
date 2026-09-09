---
name: cutscene
description: "SUBTARUNE 컷신/이벤트 작성 — 언더테일·델타룬식 스크립트 이벤트(검은 화면 나레이션, 캐릭터 이동, 대사, 카메라, 흔들림, 선택지)를 프로젝트 DSL로 짜고, 스크립트 등록·트리거 배치·헤드리스 검증까지 한 번에 한다. '컷신', '이벤트', '인트로', '연출' 요청에 사용."
argument-hint: "[컷신 이름] [한 줄 설명: 누가 어디서 무엇을]"
user-invocable: true
allowed-tools: Read, Glob, Grep, Write, Edit, Bash, AskUserQuestion
model: opus
---

# Cutscene (컷신 작성)

이 프로젝트의 컷신은 **코드가 아니라 데이터**다. `src/data/cutscenes/<name>.js` 에 노드 배열을 쓰고,
`src/data/scripts.js` 에 등록하고, 맵에 트리거를 놓으면 끝. 엔진은 `src/ui/cutscene.js`(월드 명령) +
`src/ui/dialogue.js`(텍스트/분기) 가 처리한다. **엔진 코드를 고치지 말고 노드로 표현할 것** — 표현이 안 되면
그때만 `src/ui/cutscene.js` 에 명령을 추가하고 이 문서의 레퍼런스도 갱신한다.

## 절차

1. **연출 콘티** — 사용자와 5줄 이내로 확정: 트리거(어디서/언제), 등장인물, 비트 3~6개, 끝난 뒤 상태(플래그·위치).
   애매하면 AskUserQuestion 으로 한 번만 묻는다.
2. `src/data/cutscenes/_template.js` 를 복사해 `src/data/cutscenes/<name>.js` 작성. `Object.assign([...], { silent: true })` 유지.
3. `src/data/scripts.js` 에 `import` + `SCRIPTS.<name>` 등록.
4. 트리거 배치 (`assets/maps/<id>.json`): `{ type:'trigger', x,y,w,h, once:true, flag:'<name>_seen', script:'<name>' }`
   또는 NPC `script:'<name>'` / 오프닝은 `game.startGame()` 이 `SCRIPTS.opening` 을 자동 재생.
   **맵에 들어가자마자** 시작하는 컷신은 맵 JSON `enter:{ script:'<name>', flag:'<name>_seen' }` (예: `living.json`) — 스폰 위에 트리거를 놓지 않는다.
5. **검증** — `node --input-type=module -e "import('./src/data/scripts.js')"` 로 문법 확인 →
   `tests/playtest/cutscene.mjs <name>` 로 헤드리스 재생(스크린샷 + 콘솔 warn 0개 확인). 스크린샷을 보고 연출 타이밍을 조정한다.
6. `design/narrative/cutscenes/<name>.md` 에 콘티(비트 목록 + 플래그) 1페이지 기록.

## 노드 레퍼런스

텍스트/분기 (`src/ui/dialogue.js`)
| 노드 | 설명 |
|---|---|
| `{ text, speaker?, portrait?, voice? }` | 대화창. `voice:'none'` 무음. `speed:0.6` 느리게. `auto:1.5` 1.5초 뒤 자동 진행 |
| `{ style:'narration', text }` | **검은 화면 중앙 텍스트** (언더테일 오프닝). 보통 `voice:'none', speed:0.6` |
| `{ text, choice:{ options:[{label, goto, set?}], cancel? } }` | 선택지. `cancel`=X 눌렀을 때 인덱스 |
| `{ label }` `{ goto }` `{ if:(flags)=>bool, goto }` `{ set:{} }` `{ action:(game)=>{} }` `{ end:true }` | 흐름 제어 |

텍스트 태그: `{s=2}` 속도 `{/s}` `{w=0.5}` 멈춤 `{c=red}…{/c}` `{shake}…{/shake}` `{wave}…{/wave}` `{n}` 줄바꿈

월드 명령 (`src/ui/cutscene.js`) — 끝날 때까지 다음 노드로 안 넘어감
| 노드 | 설명 |
|---|---|
| `{ wait: 초 }` | 대기 |
| `{ move:'player'\|id, to:[tx,ty] \| px:[x,y] \| by:[dx,dy], speed?, run? }` | 걸어서 이동(충돌 무시, 걷기 애니 자동) |
| `{ face:id, dir:'up'\|'down'\|'left'\|'right'\|'toward:<id>' }` | 방향 |
| `{ camera:[tx,ty], duration? }` / `{ camera:'player' }` | 카메라 팬 / 복귀 |
| `{ fade:'in'\|'out', duration? }` | 검은 페이드. `duration:0` 즉시 |
| `{ shake: 초, amp? }` | 화면 흔들림 |
| `{ sfx:'chime'\|'confirm'\|'cancel'\|'door'\|'item'\|'open'\|'close' }` `{ sound:'thud' }` | 효과음 |
| `{ spawn:{type,id,sprite,x,y,facing,script} }` `{ remove:id }` `{ show:id }` `{ hide:id }` | 엔티티 |
| `{ map:'room', spawn:'bed' }` | 즉시 맵 교체 — 앞뒤에 `fade` 를 붙일 것 |
| `{ parallel:[ ...노드 ] }` | 동시 실행 |
| `{ async: 노드 }` | 기다리지 않고 진행 (배경 동작) |

## 연출 규칙 (완성도)
- 비트 사이에 `wait 0.3~0.8` 을 넣어 숨을 쉬게 한다. 대사 직후 바로 이동시키지 않는다.
- 나레이션은 한 노드에 2줄 이내. `{w}` 로 리듬. 마지막 줄 뒤 `{w=0.6}` 여운.
- 컷신 끝에는 반드시: 카메라 복귀(`camera:'player'`), 임시 엔티티 `remove`, `set:{<name>_seen:true}`.
- 컷신 중 플레이어 입력은 자동으로 막힌다. 스킵은 C(타이핑 즉시 표시)만 — 통째 스킵은 넣지 않는다.
- 새 캐릭터는 `src/data/art.js` `PALETTES` 에 팔레트만 추가하면 스프라이트·초상화가 생긴다. 음색은 `src/core/audio.js` `VOICES`.
