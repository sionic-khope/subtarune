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

1. **연출 콘티** — 사용자 브리핑(아래 형식)에서 트리거·등장인물·비트·끝난 뒤 상태를 뽑는다. **되묻지 않는다** — 애매한 연출은 가장 가까운 언더테일식으로 하고 보고에 해석을 한 줄 적는다.
2. `src/data/cutscenes/_template.js` 를 복사해 `src/data/cutscenes/<name>.js` 작성. `Object.assign([...], { silent: true })` 유지.
3. `src/data/scripts.js` 에 `import` + `SCRIPTS.<name>` 등록.
4. 트리거 배치 (`assets/maps/<id>.json`): `{ type:'trigger', x,y,w,h, once:true, flag:'<name>_seen', script:'<name>' }`
   또는 NPC `script:'<name>'` / 오프닝은 `game.startGame()` 이 `SCRIPTS.opening` 을 자동 재생.
   **맵에 들어가자마자** 시작하는 컷신은 맵 JSON `enter:{ script:'<name>', flag:'<name>_seen' }` (예: `living.json`) — 스폰 위에 트리거를 놓지 않는다.
5. **검증** — `node --input-type=module -e "import('./src/data/scripts.js')"` 로 문법 확인 →
   `tests/playtest/cutscene.mjs <name>` 로 헤드리스 재생(스크린샷 + 콘솔 warn 0개 확인). 스크린샷을 보고 연출 타이밍을 조정한다.
6. `design/narrative/cutscenes/<name>.md` 에 콘티(비트 목록 + 플래그) 1페이지 기록.

## 사용자 브리핑 형식 → 노드 변환 (2026-09-09 부터 이 형식으로 온다)
```
[발생 트리거]
캐릭터이름: 대사 (인터랙션 # 연출 부가 설명)
```
| 브리핑 | 노드 |
|---|---|
| `[맵 X 들어가면]` | 맵 JSON `enter:{script,flag}` |
| `[소품/NPC 와 상호작용]` | 소품 `script` / NPC `script` |
| `[특정 위치 지나가면]` | `trigger` (once+flag) |
| `[플래그/단계 이후에만]` | 스크립트 첫 줄 `{ if:(f)=>!f.x, goto:'skip' }` (단계 id 도 플래그로 본다) |
| `형섭: …` | **인트로 맵(void_fallen 전)**: `HS('* …')`(scripts.js export — 이름·초상화·가재맨 톤). 단, 사물 설명·괄호 생각·의성어는 `{ text:'* …', voice:'narrator' }`. **보라맵부터**: 전부 narrator(자아 바뀜, HS 금지) |
| `경섭/빠맨/쥰희: …` | `{ speaker, portrait, voice, text:'* …' }` |
| `나레이션: …` | `{ text:'* …', voice:'narrator' }` — 형섭과 같은 표시. 검은 화면이면 `style:'narration'` |
| `(선택지 예/아니오)` | `choice:{ options:[…], cancel:1 }` |
| `# 선택지 3개가 천천히 하나씩` | `choice:{ delay:0.6, stagger:0.6 }` |
| `# 선택지만 뜨고 고를 수 없음, 대사가 끊고 넘어감 "아니야! …"` | `choice:{ stagger:0.5, locked:true, auto:1.2 }` → 바로 다음 노드에 그 대사 |
| `# …라고 말하다 끊김` | `{ text:'* 그러니까 이건{w=0.4}', auto:0.1 }` 뒤에 끊는 대사 |
| `# 화면 흔들림 / 효과음 / 흰색·검은 화면` | `{shake}` `{sfx}` `{fade:'white'}` `{curtain}` |
| `# 천천히` | `speed:0.5` 또는 `{s=0.4}…{/s}` |
| `# 이동/바라보기` | `{move}` `{face}` |
| `# 채팅창이 뜨고 시청자들이 …` | `{chat:'open'}` + 모드. 새 분위기면 `POOL` 에 모드 추가 |
| `# 오류창/시스템 메시지 (버튼)` | `{dialog:{…}}` → 대사 → `{dialog:'press'}` → `{dialog:null}` |
| `# 화면에 소용돌이/이펙트가 커짐` | `{vortex:{at,size,grow}}` 를 대사 사이에 단계적으로 |
| `# . (딜레이) . (딜레이) . 말풍선` | `{ bubble:'player' }` (dots/gap/hold 로 조절) |
| `# 같은 대사 여러 개가 ㅈㄴ 빠르게 넘어감` | `import { rapid } from './helpers.js'` → `...rapid(['펑','쾅',…], P)` — **갈수록 빨라짐**(auto 0.34→0.05, speed 3→9, 옵션으로 조절). 컷신 안에서 직접 auto 를 손으로 박지 않는다 (예 `void4_ppaman.js` BOOM) |
| `# 질문 골라서 답 듣고 '더 물어볼거?' 반복` | 선택지 → 각 답 끝에 `{goto:'more'}` → `more` 라벨의 선택지(같은 옵션) → 종료 옵션만 빠져나감 (예 `void4_ppaman.js`) |
| `# X가 동료가 되었다` | 나레이션 줄 + `{ join:'id' }` + `{ set:{id_joined:true} }`, 맵 NPC 에 `unless:'id_joined'` |
| `# X가 앞장서고 주인공이 따라감` | `{move:'<동료id>', px, run}` 먼저, 이어서 `{parallel:[{move:'<동료id>'…},{move:'player', px:<동료의 이전 지점>}]}` 를 구간마다 반복, 끝에 `{regroup:true}` (예 `void4_key.js`) |
| `# 문에 상호작용하면(잠김/열림 분기)` | `door` 엔티티 `requires:'door_open', lockedScript:'…'` — 스크립트가 분기(잠김 대사 / 열쇠 얻기 / 열림 → `{fade}{map}{bgm}{fade}`) |
| `# 뗏목에 타면 출발 안 하고 연출 시작` | 뗏목 `onBoard:'스크립트'` → 컷신 안에서 `{raft:id, go:true}` 로 출발, `{raft:id, until:'stop'}` 로 벽/도착까지 대기, `{raft:id, jump:true}` 로 점프 (예 `void8.js`) |
| `# c를 눌러보자 (가이드 창)` | `{ prompt:'C를 눌러보자' }` — C 로만 닫힘 |
| `# 몸 털면서 물 털리는 이펙트` | `{ shakeOff:'ppaman', duration:0.9 }` — 타다다닥 + 파란 점, 스프라이트 안 만듦 |
| `# X가 소품 앞/안으로 가고 주인공은 살짝 물러남` | `{ parallel:[ {move:'X', rel:'소품', at:'bottom', by:[0,8]}, {move:'player', rel:'소품', at:'bottom', by:[0,56]} ] }` — **소품 기준**으로(누른 위치 무관), 절대 `by` 로 주인공을 밀지 않는다 |
| `# (식은땀연출)` / `# X 느낌표!` | `{ emote:'X', kind:'sweat', duration:2.2, hold:0.4 }` / `{ emote:'X', kind:'!', duration:1, hold:0.7, sfx:'chime' }` |
| `# (웃음)` (쥰희) | `{ motion:'junhee', name:'laugh', sfx:'laugh_junhee' }` |
| `# 도착하자마자 다른 곳에서 연출 (플레이어 안 보이게)` | 맵 `enter:{script, flag, early:true}` + 첫 노드 `{ camera:[tx,ty], duration:0.01 }` |
| `# 브금 꺼졌다가 X 대사에 브금` | 맵 `bgm:'x', bgmFlag:'<enter flag>'` + 대사 직전 `{ bgm:'x' }` |
| `# 선택지` | `{ choice:{ options:[{label, goto}], cancel } }` — 엔진이 다 뜬 뒤 0.4초 확정 잠금을 건다(연타 방지, 따로 delay 불필요). 테스트는 선택지 감지 후 500ms 기다렸다 조작 |
| `# X가 건너뛴다 / 점프한다` | `{ hop:'id', by:[dx,dy], height:30, duration:0.55 }` (jump.mp3 자동, 포물선) |
| `# 점프 (사운드)` | `{ sfx:'jump' }` (델타룬 점프음, 공용) |
| `# 카메라가 X 로 클로즈업` | `{ parallel:[{camera:[tx,ty],duration}, {zoom:2, at:'id', offset:[0,-14]}] }` → 대사 → `{zoom:1}` `{camera:'player'}` (예 `void4_arrive`) |
| `# 다리/문이 내려오며 쿵` | `{spawn: 떨어질 소품(preload 필요)}` `{sfx:'rumble'}` `{move:id, px, speed}` `{sfx:'thud'}` `{shake}` `{tiles}` `{remove}` (예 `void4_lever`) |
| `# 3D 로 전환해서 마우스로 …` | `{zoom:2.8, at:'<소품 id>'}` → `{scene3d:'<씬>', flag}` → `{zoom:1}` (씬은 `src/scenes/drawer.js` 골격 복사) |
텍스트는 그대로 쓰고 띄어쓰기만 손본다. 없는 대사를 지어내지 않는다. 애매한 연출은 가장 가까운 언더테일 연출로 하고 결과 보고에 "이렇게 해석했다" 한 줄을 적는다(되묻지 않음).
검증은 항상: 문법 import → 헤드리스 재생(스크린샷) → `tests/playtest/` 에 케이스 추가.

## 노드 레퍼런스

텍스트/분기 (`src/ui/dialogue.js`)
| 노드 | 설명 |
|---|---|
| `{ text, speaker?, portrait?, voice? }` | 대화창. `voice:'none'` 무음. `speed:0.6` 느리게. `auto:1.5` 1.5초 뒤 자동 진행 |
| `{ style:'narration', text }` | **검은 화면 중앙 텍스트** (언더테일 오프닝). 보통 `voice:'none', speed:0.6` |
| `{ text, choice:{ options:[{label, goto, set?}], cancel?, delay?, stagger?, locked?, auto?, cursor? } }` | 선택지. `cancel`=X 눌렀을 때 인덱스. `delay:1.6` 뜨기까지 지연. `stagger:0.6` 항목이 하나씩 천천히 드러남(다 뜰 때까지 입력 무시). `locked:true` 커서는 움직여도 고를 수 없음. `auto:1.2` 다 뜬 뒤 1.2초 후 **고르지 않고** 다음 노드로(대사가 끊고 들어오는 연출). `cursor:false` 하트 없음 |
| `{ label }` `{ goto }` `{ if:(flags, story)=>bool, goto }` `{ set:{} }` `{ stage:'id' }` `{ action:(game)=>{} }` `{ end:true }` | 흐름 제어. **스토리 비트 도달은 `{stage:'id'}`**(`src/core/story.js STAGES` 에 먼저 추가) — 앞 단계 플래그가 자동으로 채워진다. `set` 은 순서와 무관한 side flag 에만 |

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
| `{ zoom: 2.8, at:'tv'\|[x,y], offset?:[dx,dy], duration? }` / `{ zoom:1 }` | 2D 월드 줌인/아웃(UI 는 그대로). 3D 씬 진입 전환에 사용 |
| `{ scene3d:'drawer', flag:'cord_found' }` | `src/scenes/<이름>.js` 의 WebGL 오버레이 씬. 끝나면 `{found}` → flag. 앞뒤에 `zoom` 을 붙인다 |
| `{ chat:'open'\|'late'\|'spam'\|'idle'\|'question'\|'silence'\|'panic'\|'close' }` | 방송 채팅창(오른쪽, 100명). 모드별 메시지 풀은 `src/ui/chat.js POOL` |
| `{ dialog:{title,text,button} }` `{ dialog:'press' }` `{ dialog:null }` | 윈도우식 오류창. press 는 0.35s 기다림 |
| `{ vortex:{ at:'pc'\|[x,y], size, grow } }` `{ vortex:{size,grow} }` `{ vortex:null }` | 소용돌이(월드). 기다리지 않으므로 대사와 겹쳐 키운다 |
| `{ join:'ppaman' }` `{ leave:'id' }` `{ regroup:true }` | 동료 가입/이탈/주인공 뒤 재정렬 (파티 시스템, STATE.md 참고) |
| `{ bubble:'player'\|id, dots?:3, gap?:0.4, hold?:0.5 }` | 머리 위 `...` 말풍선(36×22, 4px 둥근 점이 하나씩). 끝나면 다음 노드 |
| `{ raft:id, go:true \| jump:true \| until:'stop' }` | 뗏목 출발/점프/멈출 때까지 |
| `{ prompt:text }` | C 로만 닫히는 안내 창 |
| `{ emote:id, kind:'!'|'sweat', duration?, hold?, sfx? }` | 머리 위 느낌표/식은땀 |
| `{ hop:id, by, height?, duration? }` | 캐릭터 포물선 점프 |
| `{ shakeOff:id, duration? }` | 물 털기(흔들림+파란 점) |
| `{ tiles:'bridge_down' }` | 맵 `tileSwaps` 적용(다리 내려옴). 뒤에 `{set:{bridge_down:true}}` 로 플래그도 세운다 |
| `{ parallel:[ ...노드 ] }` | 동시 실행 |
| `{ async: 노드 }` | 기다리지 않고 진행 (배경 동작) |

## 연출 규칙 (완성도)
- 비트 사이에 `wait 0.3~0.8` 을 넣어 숨을 쉬게 한다. 대사 직후 바로 이동시키지 않는다.
- 나레이션은 한 노드에 2줄 이내. `{w}` 로 리듬. 마지막 줄 뒤 `{w=0.6}` 여운.
- 컷신 끝에는 반드시: 카메라 복귀(`camera:'player'`), 임시 엔티티 `remove`, 스토리 비트면 `{stage:'<id>'}`(아니면 `set:{<name>_seen:true}`).
- 컷신 중 플레이어 입력은 자동으로 막힌다. 스킵은 C(타이핑 즉시 표시)만 — 통째 스킵은 넣지 않는다.
- 새 캐릭터는 `src/data/art.js` `PALETTES` 에 팔레트만 추가하면 스프라이트·초상화가 생긴다. 음색은 `src/core/audio.js` `VOICES`.
