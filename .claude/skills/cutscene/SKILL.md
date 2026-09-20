---
name: cutscene
description: "SUBTARUNE 컷신/이벤트 작성 — 언더테일·델타룬식 스크립트 이벤트(검은 화면 나레이션, 캐릭터 이동, 대사, 카메라, 흔들림, 선택지)를 프로젝트 DSL로 짜고, 스크립트 등록·트리거 배치·헤드리스 검증까지 한 번에 한다. '컷신', '이벤트', '인트로', '연출' 요청에 사용."
argument-hint: "[컷신 이름] [한 줄 설명: 누가 어디서 무엇을]"
user-invocable: true
allowed-tools: Read, Glob, Grep, Write, Edit, Bash, AskUserQuestion
model: opus
---

# Cutscene (컷신 작성)

[연출의 인과·연속성 판단](../../../docs/development/staging.md)을 먼저 적용한다. 이미 존재하는 대상을 카메라로 드러내는 장면과 실제 등장/소환을 구별하며, 조명·BGM·관중의 지속 상태와 최신 큐를 콘티에 남긴다.

이 프로젝트의 컷신은 **코드가 아니라 데이터**다. `src/data/cutscenes/<name>.js` 에 노드 배열을 쓰고,
`src/data/scripts.js` 에 등록하고, 맵에 트리거를 놓으면 끝. 엔진은 `src/ui/cutscene.js`(월드 명령) +
`src/ui/dialogue.js`(텍스트/분기) 가 처리한다. **엔진 코드를 고치지 말고 노드로 표현할 것** — 표현이 안 되면
그때만 `src/ui/cutscene.js` 에 명령을 추가하고 이 문서의 레퍼런스도 갱신한다.

## 절대 규칙 (2026-09-10 회고)
- 이동 좌표는 **기준물 상대** `{ move:id, rel:'소품id', at:'left|right|top|bottom', by:[dx,dy] }`. 절대 `px` 는 맵 밖으로 걸어 나갈 때만(맵이 바뀌면 px 가 하늘로 간다 — 억빠맨 수영 버그). `tests/unit/cutscenes.test.mjs` 가 검사한다.
- 뗏목 위 연출은 `{raft:id, hold:true}` 로 세워 두고 대사한다(문구 동안 앞으로 가서 벽에 부딪히지 않게). 노드: `swim|hold|holdAt:'apex'|x|awaitJump|until:'stop'|'land'`.
- 사용자 대사는 그대로. 괄호 지시문·'(웃음)' 은 대사가 아니라 연출. 의심 오타는 보고에 한 줄.
- 파일 수정은 `tools/dev/patch.py`, 한 줄 끝 `//` 금지, 끝나면 `tools/dev/check.sh`.

## 연출의 사전 조건

다인 등장·퇴장, 지속 조명, 배우 위 글자, 움직이는 관중이 포함된 연출은 [무대 연속성 회고의 확인 순서](../../../docs/postmortems/2026-09-14-stage-continuity.md)를 적용한다. 비트별 실행뿐 아니라 다음 비트와 조작 복귀까지 남아야 할 상태를 콘티에 기록하고 해당 화면을 확인한다.

웅장한 등장·일출·음악 하이라이트 연출은 [마이야르호 회고의 구도·크기·시간 기준](../../../docs/postmortems/2026-09-12-maillard-staging.md)을 먼저 적용한다. 준비·첫 변화·상승·이후 이동을 연속으로 확인하고 수치 검사와 미적 판단을 구분해 보고한다.

실제 등장·기습·화면 밖 진입을 만들 때는 **등장 전에는 안 보임 → 지정 방향으로 들어오는 중 → 다음 대사 전에 도착**을 카메라·줌이 적용된 화면에서 확인한다. 맵 좌표상 왼쪽이라는 것만으로 화면 밖이라고 판단하지 않는다. 이미 그 자리에 있는 관중/소품을 줌아웃으로 소개하는 경우에는 이 hidden/show 절차를 적용하지 않는다.

“팍·퐈앙” 같은 순간 충격은 준비 진동과 짧은 분출을 나누고 실제 재생으로 확인한다. 효과음도 행동 주체와 재질에 맞춰 선택한다. 바론의 무거운 타격에 주인공 검 공격음을 재사용하지 않는다. 확인은 해당 비트 전/중/후에 한정하며 전체 컷신 반복 검증으로 확대하지 않는다.

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
| `# 선택지` | `{ choice:{ options:[{label, goto}], cancel } }` — 완전 공개 후 확정 잠금은 [dialogue.js](../../../src/ui/dialogue.js)의 `CHOICE_LOCK`이 원본이다. 선택지 감지 후500ms 대기는 정상 조작 예시일 뿐이다. 공개 중/잠금 중 입력과 C를 누른 채 잠금이 풀리는 경계, 뗀 뒤 새 누름은 [입력 회귀 기준](../../../docs/development/regression-checks.md)에 따라 별도 검사한다. |
| `# 어둠의 힘·검은 연기·보라 화면 → 변신(흰 화면)` | 선장실 `captain_reveal.js` / 조종실 `ship_control.js AFTERMATH` 가 원본: `{sfx:'captain_thunder'}` `{bgm:'captain_reveal', fadeIn:1.2}` `{darkSmoke:{mode:'swell', veil:CAPTAIN_REVEAL_VEIL}}` → `gather`/`transfer`(+`aura`) → `{bgm:null}` `{sfx:'captain_transform'}` 떨림·진동 단계 → `{sfx:'furnace_blast'}` `{fade:'white'}` `setSprite` `{fade:'in'}` `{bgm:'captain_mankatsuki'}`. 음영·오라는 변신 뒤에도 남기고 재입장 `after` 라벨에서 `{darkSmoke:{mode:'veil', duration:0.01, veil, aura}}` 로 복원 |
| `# NPC 가 서서 계속 움직이는 동작(팔 돌리기 등)` | 시트 대신 `character-motions.js` 에 루프용 정의(예 `youngcle_tenna.idle`) → 맵 def `idleMotion:'이름'` 또는 컷신 `action` 에서 `loopCharacterMotion(actor, game.characterMotions[sprite][name])`. 단계별 자세는 `{...def, frames:[…]}` 로 프레임만 골라 다시 건다(예 `ship_control.js rise()`) |
| `# (전투시작)` | 현재 공통 진입은 [helpers.js](../../../src/data/cutscenes/helpers.js)의 `battleEntry(enemies, bgm)`를 재사용하고 `{ battle:{…} }`와 승리 뒤 노드는 호출 장면이 지정한다. [첫 CS 전투 튜토리얼](../../../src/data/cutscenes/teal3_toolbox.js)의 전투 뒤 `{ bgm:null }`·줌/카메라/페이드 복귀는 그 장면의 예시다. 다른 전투 뒤 음악 종료 기본값으로 복사하지 않으며, [장면별 음악 소유·시계 계약](../../../docs/development/staging.md)에 맞춰 유지/복귀/재큐를 선택한다. |
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
| 이동 옵션 `axis:'x'\|'y'` (rel 이동) | 한 축만 목표로 걷는다 — 기준물이 옆에 있어도 **대각선으로 걷지 않게** ㄱ자로 나눈다(`axis:'y'` 로 똑바로 들어온 뒤 `axis:'x'` 로 옆으로, 그 다음 위로). 사용자 “왜 대각선으로 갔다가 위로 가냐”(2026-09-16 용광로 입장) |
| 이동 옵션 `facing:'up'\|'down'\|'left'\|'right'` | 이동 중 시선을 고정한다. 상대를 보며 뒷걸음질할 때 사용하며 생략하면 기존대로 이동 방향을 본다. |
| `{ parallel:[ 노드 \| [노드…] ] }` | 동시에 실행. 가지가 배열이면 그 가지만 순차 — 셋이 각자 ㄱ자로 걸을 때 먼저 도착한 쪽이 남을 기다리지 않는다 |
| 이동 옵션 `carry:{id, offset:[dx,dy], facing?}, track:true, shake:3` | 대상의 좌표를 운반자와 매 틱 동기화한다. offset은 월드 픽셀, 운반 대상은 걷지 않는다. track은 이동 중 카메라를 운반자에 즉시 맞추고 shake는 이동 중 진동의 진폭이다. 다음 이동에서도 carry를 지정하며, 제거·맵 전환 후에는 참조가 남지 않는다. |
| 이동 속도 기준 | 걷기 기본 60(120px/s) · `run:true` 110(220px/s) · `dash:true` 190(380px/s). **브리핑에 '빨리·달려·급히·질주·숨어야'가 있으면 run 또는 dash 를 반드시 넣는다** — 기본 걷기로 맵 끝에서 오면 4.5초, 사용자가 "너무 느리다"고 했다(2026-09-11). 멀리서 등장 = run, 숨기·도망·달려들기 = dash |
| `{ face:id, dir:'up'\|'down'\|'left'\|'right'\|'toward:<id>' }` | 방향 |
| `{ camera:[tx,ty], duration? }` / `{ camera:'player' }` | 카메라 팬 / 복귀 |
| `{ fade:'in'\|'out', duration? }` | 검은 페이드. `duration:0` 즉시 |
| `{ shake: 초, amp? }` | 화면 흔들림 |
| `{ sfx:'chime'\|'confirm'\|'cancel'\|'door'\|'item'\|'open'\|'close' }` `{ sound:'thud' }` | 효과음 |
| `{ spawn:{type,id,sprite,x,y,facing,script} }` `{ remove:id }` `{ show:id }` `{ hide:id }` | 엔티티 |
| `{ map:'room', spawn:'bed' }` | 즉시 맵 교체 — 앞뒤에 `fade` 를 붙일 것 |
| `{ doorTransit:{actor:id,door:propId,inset:[x,y,w,h],duration?:0.85,openDuration?:0.18,closeAfter?:false} }` | 위쪽 닫힌 문 통과. 안전한 문 앞 좌표에서 걷는 그림만 위로 이동해 열린 문틀에 가리고 문턱에서 기존 철컥음을 낸다. inset은 문 원본의 안쪽 문짝 영역이다. 마지막 후행자에 closeAfter를 주고 완료 뒤 remove한다. 충돌 좌표는 벽 안으로 옮기지 않는다. |
| `{ shipHatch:{hatch:'ship_logo',actor?:id,duration?:1.2} }` | 조종실 맨홀 전용. actor 생략은 원래 얼굴 뚜껑을 위로 밀고 완료 시 소품의 shipHatch flag를 세운다. actor가 있으면 구멍 위에 접근한 배우를 기존 doorTransit 클립으로 아래로 가린다. 완료 뒤 remove한다. 발 위치는 안전한 바닥에 유지하고 새 맵에서는 임시 오프셋이 남지 않는다. |
| `{ zoom: 2.8, at:'tv'\|[x,y], offset?:[dx,dy], duration? }` / `{ zoom:1 }` | 2D 월드 줌인/아웃(UI 는 그대로). 3D 씬 진입 전환에 사용 |
| `{ musicCamera:{src,at,duration,volume,offset,beats,introZoom,peakZoom,lowZoom,beatRelease,bounce} }` | 미리 디코드한 WAV 전체를 한 번 틀며 같은 AudioContext 시계로 박자 줌/바운스. 대화창은 닫고 기존 브금 위치를 보존했다가 끝나면 복구한다. Esc/QA 중단은 WAV·줌을 정리하며 브금을 되살리지 않는다. 설정 예: `src/data/storage-dance.js` |
| `{ scene3d:'drawer', flag:'cord_found' }` | `src/scenes/<이름>.js` 의 WebGL 오버레이 씬. 끝나면 `{found}` → flag. 앞뒤에 `zoom` 을 붙인다 |
| `{ chat:'open'\|'late'\|'spam'\|'idle'\|'question'\|'silence'\|'panic'\|'close' }` | 방송 채팅창(오른쪽, 100명). 모드별 메시지 풀은 `src/ui/chat.js POOL` |
| `{ dialog:{title,text,button} }` `{ dialog:'press' }` `{ dialog:null }` | 윈도우식 오류창. press 는 0.35s 기다림 |
| `{ vortex:{ at:'pc'\|[x,y], size, grow } }` `{ vortex:{size,grow} }` `{ vortex:null }` | 소용돌이(월드). 기다리지 않으므로 대사와 겹쳐 키운다 |
| `{ join:'ppaman' }` `{ leave:'id' }` `{ regroup:true }` | 동료 가입/이탈/주인공 뒤 재정렬 (파티 시스템, STATE.md 참고) |
| `{ bubble:'player'\|id\|[id1,id2], dots?:3, gap?:0.4, hold?:0.5 }` | 기존 머리 위 `...` 말풍선(36×22, 4px 둥근 점이 하나씩). 여러 대상은 배열로 주어 같은 시계로 동시에 표시한다. 끝나면 다음 노드 |
| `{ raft:id, go:true \| jump:true \| until:'stop' }` | 뗏목 출발/점프/멈출 때까지 |
| `{ prompt:text }` | C 로만 닫히는 안내 창 |
| `{ emote:id, kind:'!'|'sweat', duration?, hold?, sfx? }` | 머리 위 느낌표/식은땀 |
| `{ hop:id, by, height?, duration? }` | 캐릭터 포물선 점프 |
| `{ emerge:id, depth:370, duration:2.2 }` | 발 위치를 지면으로 삼아 아래에서 솟는다. 지면 아래 그림은 클리핑하며 페이드하지 않는다 |
| `{ drumDevilThrow:true }` | 드럼통 악마의 현재 공격 손 기준점에서 드럼통 한 발을 포물선으로 던지고 착지·충격 여유까지 기다린다. `DRUM_DEVIL.hand`와 필드 모션 배율을 공유한다. |
| `{ shipCastleReveal:true }` | 가재맨 성 생성 비트의 실제 효과음 시계로 등장·착수·파도가 끝날 때까지 기다린다. `ShipCastle.revealComplete`가 완료 기준이며, 원음의 남은 꼬리는 다음 대사·비트에서도 자연히 끝나고 장면 중단 때 정리된다. |
| `{ youngcleCageDrop:{targets:[id,id],sfx,impactSfx,impactBodySfx,fallDuration,impactHold,carryDuration} }` | 영클 휴게실 전용: 화면 위 철창 두 개가 잔상을 남기며 동시에 낙하·충돌한 뒤 대상을 화면 아래로 운반한다. 맵·Q·타이틀 중단 시 TV 정리와 함께 제거한다 |
| `{ puff:id, offset:[0,18], duration:0.7 }` | 대상 소품 그림 위쪽 기준 작은 공기 구름 한 번. 소리는 별도 `{sfx:'cannon_puff'}` |
| `{ shakeOff:id, duration? }` | 물 털기(흔들림+파란 점) |
| `{ nod:id, duration:1.8, times:3, depth:4 }` | 충돌 좌표는 그대로 둔 채 작게 숙이고 끄덕인다. 완료 시 회전/수직 그림 오프셋을 원복한다. |
| `{ darkSmoke:{ mode:'swell'|'gather'|'cloak'|'transfer'|'veil'|'dissipate', from:id, to?:id, duration, veil?:0.4, aura?:{at:id,colors:[]} } }` / `{darkSmoke:null}` | duration 동안 연기 변화. veil과 선택형 배우 오라는 모드 사이에 유지되고 오라는 배우를 따라간다. `aura:null`은 오라만, `darkSmoke:null`은 모두 해제한다. `dissipate`는 `from` 배우 위치에서 구름을 퍼뜨리며 기존 오라를 점차 지운다. 방도 밝히려면 `veil:0`을 명시한다(예: `{darkSmoke:{mode:'dissipate',from:'captain_mankatsuki',duration:3,veil:0}}` 뒤 `{darkSmoke:null}`). 중간 프레임에서 음영·구름·오라가 함께 약해지고 종료 시 모두 사라지는지 확인한다. 그 외 장면에서 유지하기로 한 음영/오라는 불투명한 전환 뒤 정리하고 타이틀·맵 전환 시 잔재를 남기지 않는다. |
| `{ tiles:'bridge_down' }` | 맵 `tileSwaps` 적용(다리 내려옴). 뒤에 `{set:{bridge_down:true}}` 로 플래그도 세운다 |
| `{ parallel:[ ...노드 ] }` | 동시 실행 |
| `{ async: 노드 }` | 기다리지 않고 진행 (배경 동작) |

## 연출 규칙 (완성도)
- `...` 반응은 위 `bubble` 명령을 사용한다. 기존 장면(`obj1_cannon.js`)의 모습을 먼저 대조하고, 여러 대상이라는 이유로 `stamp` 글자나 새 말풍선을 대신 만들지 않는다. 기존 명령으로 표현할 수 없는 기능만 최소 확장한다. [BUILD139 실패 회고](../../../docs/postmortems/2026-09-13-open-entry-and-bubble.md)
- 맵 NPC의 `hidden:true`는 최초 비표시, `visualScale`은 해당 개체만 확대한다. `zoom:0.8` 같은 줌아웃은 월드만 축소하며 대화창은 유지한다. `{fling}`은 소품과 캐릭터 모두 수평 이동·높이·회전을 표시한다.
- **무음에서 처음 켜는 브금은 입장 직후에 두지 않는다**(2026-09-15 [포스트모텀](../../../docs/postmortems/2026-09-15-cue-lead-in.md)): 화면이 보인 뒤 1.5초 이상 준비시간(카메라·작은 동작으로 채움) + `fadeIn` 1.2초 이상. 곡을 바꾸는 자리(`fadeIn: 0.3`)의 값을 복사하지 않는다. 검증은 “나오는가”가 아니라 “몇 초에 어떻게 들어오는가”를 잰다.
- `{ scale: id, to: 0.12, duration: 0.55 }`: 캐릭터 그림 배율(visualScale)을 서서히 바꾼다(토관에 빨려 들어가며 줄어듦). `hide` 뒤 `{ scale: id, to: 1, duration: 0 }` 로 되돌린다. 숨긴 NPC 가 상호작용 자리에 남으면 C 프로브를 가로채므로 `remove` 까지 한다.
- **보이는 박자마다 소리**([포스트모텀](../../../docs/postmortems/2026-09-15-cutscene-sound-coverage.md)): 느낌표·식은땀 `emote` 는 `sfx:'chime'`, 착지 `thud`/`baron_slam`, 날아감은 델타룬 공식 `wing`(snd_wing). 짠 뒤 `emote`/`hop`/`fling`/`slide`/`spawn` 노드마다 소리가 있는지 훑는다.
- **fling 소리는 장면마다 다르게**(2026-09-15 사용자 피드백 2 “왤캐 재사용하노”): `sfx:'whoosh'`를 기본값으로 쓰지 않는다. 이미 쓴 것 — 파크가디언 박치기 `wing`, 비데→마리오 `cannon_puff`. **소리를 합성으로 새로 만들지 않는다**(휘슬 합성은 “이상한 소리”로 폐기) — 관례 → 저장소 공식 소리 → 델타룬/언더테일 공식 파일 순으로 찾고 `design/audio/references.md` 에 적는다. 날리는 타이밍은 원인 동작(박치기 등) 직후 **즉시**(쿵·흔들림과 같은 `parallel`), 사이에 `wait` 를 두지 않는다.
- 컷신에서 `spawn` 한 소품을 `slide`/`hop` 으로 움직일 때는 **`w/h` 를 주지 않는다**(w/h 지정 소품은 그림이 `def.ix/iy` 에 고정돼 히트박스만 움직이고 그림은 제자리 — 2026-09-15 철창이 안 보이던 원인). 히트박스는 그림 아래 40%가 된다.
- 큰 것이 내려오거나 열리는 연출은 **카메라를 그쪽으로 옮겨** 보여주고 끝나면 일행에게 돌린다(줌아웃으로 한 화면에 넣으려다 안 보이면 사용자가 곧바로 지적한다).
- 비트 사이 여유는 동작·대사·음악의 인과에 맞춘다. `wait 0.3~0.8`은 숨을 주는 예시이며 충돌 직후 반응이나 끊는 개그에 일괄 삽입하지 않는다.
- 나레이션은 한 노드에 2줄 이내. `{w}` 로 리듬. 마지막 줄 뒤 `{w=0.6}` 여운.
- 컷신 끝에는 반드시: 카메라 복귀(`camera:'player'`), 임시 엔티티 `remove`, 스토리 비트면 `{stage:'<id>'}`(아니면 `set:{<name>_seen:true}`).
- 컷신 중 플레이어 입력은 자동으로 막힌다. 스킵은 C(타이핑 즉시 표시)만 — 통째 스킵은 넣지 않는다.
- 새 캐릭터는 승인 시트를 `src/data/characters.js`와 필요한 motion/voice/preload에 연결한다. 팔레트 폴백은 완성 스프라이트가 아니며, 제작·연동은 [전달 스킬](../subtarune-sprite-handoff/SKILL.md)을 따른다.

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
- 대사 옵션 `{ cut: 3.6 }` — 찍히는 중이라도 그때 말이 끊기고 다음 노드로(C/X 로 못 넘김). 말하다 날아가는·끊기는 연출에.
- **말 걸어 시작하는 후속 이벤트의 함정 2가지**(2026-09-11 옵젝영역1): ① 연출이 `requires` 변형 엔티티를 쓰면 그 연출이 끝난 직후엔 아직 **원래 엔티티**가 서 있다 → 끝에서 id·script 를 바꿔 주거나 원래 엔티티에도 같은 script 를. ② NPC 는 **플레이어가 걸어 들어오는 줄(문 스폰 y)** 에 세운다 — 길이 세로로 넓으면 다른 줄에 선 NPC 는 프로브(19px)가 안 닿아 그냥 지나쳐 버린다(플레이테스트에 '입구 줄에서 오른쪽으로 걸으면 프로브에 잡힌다' 검사).

## 큰 이펙트 애니(폭발 등)는 영상에서 (2026-09-12)
직접 그리지 말고 사용자가 준 영상에서 누끼를 딴다.
1. `/usr/bin/python3 tools/art/video_to_strip.py <영상> --out assets/fx/<이름>.png --start 0.04 --dur 1.5 --fps 20 --height 128 [--key black|green|auto]` (예: 동상 벽 폭발 = 그린스크린 `--key green --thresh 70 --soft 55`)
   — 검은 배경 이펙트 영상은 기본값(`black`)이 밝기로 알파를 만들어 연기 가장자리가 반투명하게 남는다. 끝나면 붙여 넣을 `{ boom: … }` 한 줄을 찍어 준다.
2. 소리도 같은 영상에서: `ffmpeg -i <영상> -ss .. -t .. -c:a libmp3lame -q:a 3 assets/audio/sfx/<이름>.mp3` → `main.js loadSfxFiles` 목록 + `design/audio/references.md` 출처 한 줄.
3. **`src/data/fx.js` 의 `FX` 에 한 줄** 등록(sheet·cols·rows·count·fps·sfx) → 컷신에서는 `{ boom: { ...FX.<이름>, at:'<대상id>'|[x,y], scale, offset:[dx,dy], hold } }` 로 쓴다(숫자를 컷신에 복사하지 않는다 — 여러 발이면 `{async:[{wait}, {boom}]}`)
   — **모든 캐릭터 위**에 한 번만 재생하고 사라진다. 그림이 없으면 소리만 나고 조용히 통과하므로 반드시 `tests/unit/fx.test.mjs`(레지스트리·띠 존재·칸 수·소리 로드 목록) 를 돌린다.
4. FX 레지스트리에 등록한 시트는 부팅 때 미리 로드된다. 등록하지 않은 시트는 맵 `preload`에 넣는다. `boom`의 `duration`은 그 시간 동안 프레임을 반복하고, `endScale/grow`는 시작 `scale`에서 목표 배율까지 grow초 동안 부드럽게 변화시킨다. 생략하면 기존 한 번 재생이다. 중간 프레임에서 크기·타이밍·잘림을 확인하고 맵 전환 시 정리되는지 검사한다.

## 스크립트 안에서 맵을 바꾸고 그 맵의 도착 연출을 이어가기 (BUILD202b)
`{ map:'youngcle20', spawn:'gate', enter:true }` — 대사 중엔 `runMapEnter` 가 도착 스크립트를 건너뛰므로(문·QA 는 괜찮지만 선택지 → `{map}` 흐름은 안 나온다), `enter:true` 를 주면 이 스크립트가 끝난 뒤 그 맵의 `enter` 가 이어진다. 철문 “들어갈까? 예” → 조종실 입장 연출이 그 예. 검증은 실제 문 경로로(QA 바로가기는 `runMapEnter` 를 따로 불러 문제가 안 보인다).

## 페이싱·큰 사건·모자이크 규칙 (2026-09-16 포스트모텀 #19 — 사용자 “인간이 읽을 때 너무 빠른 것들 안 된다”)
- **동작 → 대사 사이 wait ≥0.5s, 큰 동작(착지·충돌·문 열림) 뒤 ≥0.8s, 카메라 이동 ≥1.2s.** 콘티를 초 단위 표로 먼저 적는다.
- **“천천히”는 연속 이동**(speed ≤100)이지 끊어 움직이기가 아니다. 의성어 모션(훙훙훙)은 착지·정지 지점에서 `hop by:[0,0] height 10/6/3` 처럼 제자리 반동으로.
- **큰 사건 패턴**(대포 등장 등): `fade out` → 카메라 컷 + `zoom`(초점은 화면 가운데에 오므로 초점 x ≥ 480/zoom/2, 아니면 맵 밖 검정) → `fade in` → 느린 등장(slide ≥2s + 느린 카메라) → 줌 아웃 → 사건. 투사체는 **≥0.5초 보이게** 날리고 `{camera: 투사체}` 로 따라간다. 맞는 순간 `hit`, 벽에서 `impact`+`shake`.
- **매달려 내려오는 물체**: 빠르게(60%) → 느리게(40%) 두 단계 `slide`, 흔들림(oscillate)은 단계마다 줄이고, 착지에 `hop 5px` 튀김.
- **모자이크/가림**: 대사 노드 `mosaic: { text: '노', block: 4 }`(`src/ui/text-mosaic.js`, 악질맨 말풍선과 같은 것). ▩ 같은 문자 대체 금지. 새 표현을 만들기 전에 기존 사례를 `grep` 한다.
- **`{ map, spawn, enter:true }`** 로 바꾼 맵의 도착 연출은 스크립트가 끝난 뒤 이어진다. 도착 연출은 **실제 문 경로**로 검증(QA 바로가기는 별도 경로).
- 크기 지시(“좀 크게”, “몸보다 커야”)는 비교 대상 스프라이트 실측으로 정하고 나란히 미리보기.
- **spawn 소품을 slide/hop 으로 움직이려면 `ix/iy` 필수**(그림 좌표; 없으면 히트박스만 움직이고 그림은 제자리 — 포탄 “공기포”). 검증은 `drawX/drawY` 로. 내려오거나 나타나는 물체는 시작부터 카메라 안에 두고, 탑승자는 `carry`(흔들리는 동안 같이 이동). 전투 효과음(hit/damage/heavyswing)은 필드 연출에 쓰지 않는다. 대화창 모자이크는 block 2, 기호·의성어 줄은 `{n}` 으로 잘라 둔다.
