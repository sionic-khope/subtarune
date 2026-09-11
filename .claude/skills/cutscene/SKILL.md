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

## 절대 규칙 (2026-09-10 회고)
- 이동 좌표는 **기준물 상대** `{ move:id, rel:'소품id', at:'left|right|top|bottom', by:[dx,dy] }`. 절대 `px` 는 맵 밖으로 걸어 나갈 때만(맵이 바뀌면 px 가 하늘로 간다 — 억빠맨 수영 버그). `tests/unit/cutscenes.test.mjs` 가 검사한다.
- 뗏목 위 연출은 `{raft:id, hold:true}` 로 세워 두고 대사한다(문구 동안 앞으로 가서 벽에 부딪히지 않게). 노드: `swim|hold|holdAt:'apex'|x|awaitJump|until:'stop'|'land'`.
- 사용자 대사는 그대로. 괄호 지시문·'(웃음)' 은 대사가 아니라 연출. 의심 오타는 보고에 한 줄.
- 파일 수정은 `tools/dev/patch.py`, 한 줄 끝 `//` 금지, 끝나면 `tools/dev/check.sh`.

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
| `# 빨리 / 달려가서 / 급히 / 숨어야` | 이동에 `run:true`(220px/s) 또는 `dash:true`(380px/s). 등장은 run, 숨기·도망은 dash (예 `teal7_hide.js`) |
| `# 사이렌·경보·비상` | `{bgm:'alarm'}` + `{sfx:'siren'}` + `{async:[{hop:id, sfx:'thud'}, {shake}…]}` + `{async:[{pulse:'red', times, every}]}` — 대사와 동시에 돌린다 (예 `teal9_boss.js`) |
| `# 갈수록 빨라지는 응수(A/B 번갈아)` | 두 화자 라인을 `auto` 0.55→0.07, `speed` 2→9 로 선형 보간해 번갈아 넣는다 (`teal9_boss.js chase()`); 한 화자면 `rapid()` |
| `# 검증(프레이밍)` | `tests/playtest/lib/layout.mjs` 의 `rectsOf(page, ids)` 로 카메라 뷰(480×230)·캐릭터 사각형을 받아 `inside/overlap` 검사 한 줄(예 `teal9.mjs`). 잘림·겹침·가림은 스크린샷 전에 숫자로 |
| `# 큰 NPC(보스)가 서 있는 장면` | 보이는 영역 = 카메라 480×230(대화창 위). 큰 그림은 전신이 그 안에 들어오는 크기까지만(`stillScale`), 서로·파티와 사각형이 안 겹치게 자리를 재고 `{camera:[tx,ty]}` 로 잡는다. 테스트에 사각형 검사(예 `teal9.mjs` framing). 2026-09-11 포스트모텀 |
| `# 놀라서 살짝 점프(공식 점프 소리 ✗)` | `{hop:id, height:12, duration:0.3, sfx:false}` + `{emote:id, kind:'!', sfx:'chime'}` 를 parallel 로 |
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
| `# (전투시작)` | `{ sfx:'battle_start' }, { shake:0.45, amp:3 }, { vortex:{ at:'center', size:40, grow:0.9 } }, { zoom:1.9, at:'center', duration:0.55 }, { vortex:{ size:900, grow:0.5 } }, { fade:'out', duration:0.25 }, { wait:0.15 }, { vortex:null }, { battle:{ enemies:['cs_red','cs_blue'], bgm:'rude_buster', flag:'..._won' } }` 뒤에 `{ bgm:null }`·`{ zoom:1 }`·`{ camera:'player' }`·`{ fade:'in' }` (검게 빨려 들어가는 전환) |
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
| 이동 속도 기준 | 걷기 기본 60(120px/s) · `run:true` 110(220px/s) · `dash:true` 190(380px/s). **브리핑에 '빨리·달려·급히·질주·숨어야'가 있으면 run 또는 dash 를 반드시 넣는다** — 기본 걷기로 맵 끝에서 오면 4.5초, 사용자가 "너무 느리다"고 했다(2026-09-11). 멀리서 등장 = run, 숨기·도망·달려들기 = dash |
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

## 2026-09-11 추가 노드·함정 (옵젝영역1 대포 밀기)
- `{ slide: id, by:[dx,dy], duration, sfx }` 소품을 히트박스·그림 같이 미끄러뜨린다(걷기 애니 없음). **`slide.by` 는 픽셀, `move.by` 는 16px 아트 단위(16 = 한 칸 32px)** — 섞어 쓰면 한쪽만 4px 움직인다(첫 시도에서 남).
- 밀기 = `{ parallel: [{slide 소품}, {move 캐릭터 by:[16,0], speed:27}] }` — 캐릭터는 같은 거리를 같은 시간(0.6s)에 걷는다(speed 27 ≈ 54px/s).
- `{ bgmPause: 0.3 }` / `{ bgmResume: 0.3 }` — 정적 개그("그 소리 내면 안되는거 아니에요?" → . . . → 이어서) 는 stop/play 가 아니라 이 둘로(재생 위치 유지).
- 말 끊기: 끊기는 쪽 대사에 `{ auto: 0.1 }`. 소리치기: 글자 `{shake}…{/shake}` + `{ async:[{ shake:0.7, amp:4 }] }`.
- NPC 가 달려 나가는 쪽 맵 가장자리는 걷는 타일이 아니라 **막힌 같은 무늬 타일**(`Z` 보라 땅 / `Y` 얕은 물) 로 끝까지 — 공중부양 금지 + 사방 막힘 규칙.
- 만남 프레이밍은 파티 셋 + 상대 + 소품 그림 사각형을 전부 재서 카메라 타일을 정한다(`obj1.mjs` framing 검사 참고). 같은 x 에 위아래로 둔 두 NPC 는 겹친다 — 뒤쪽을 60px 옆으로.
- 아이템 획득(`inventory.push`)·컷신 전투(`battle.flag`)·버프를 넣으면 `src/core/story.js STATE_FROM_FLAGS` 에 플래그 규칙 한 줄 — QA 점프 상태가 실제 플레이와 같아진다(`qa-state.test`).
- 미니게임·연출 노드(2026-09-11 대포 발사): `{ mash:{ target:100, push:[ids], tremble:id } }` C 연타(가운데 창·불씨 게이지, `ember` 소리) / `{ fire:{ at:id, dx, dy, spread, rate, grow } }` 불이 붙어 커진다(기다리지 않음, `{fire:null}` 끔) / `{ rocket:{ ids, speed, camera, amp } }` 불꼬리 달고 오른쪽 맵 밖으로(카메라 추적·흔들림·제거). 브금은 브리핑 타이밍대로 `{bgm:null}`·`{bgm:'rude_buster'}` 를 직접 — 연타 구간엔 전투 브금, 날아가는 연출엔 무음, 끝에 맵 브금.
- 말 걸어 시작하는 후속 이벤트의 NPC/소품은 `requires:'앞 플래그', unless:'끝 플래그'` 쌍으로 두고, QA 지점을 그 앞에 하나 더(`obj1_push`).
