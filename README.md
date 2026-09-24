# SUBTARUNE

### 오른쪽 봉인 구체 방 (BUILD311)

말자하섭 도착 맵 북쪽 문은 검은 단일 화면 방으로 이어진다. 중앙 구체는128×128·중심64,64의 별도 생성 소품이며 보라 오라·바닥 광원·요플래 실루엣 그림자를 런타임에서 더한다. [원본/최종 자산 계약](assets/source/orb311/visual/README.md)을 따르고 중간 처리물을 최종 PNG 대신 쓰지 않는다. 접촉 후 대문 오른쪽 봉인만 켜지는 연출과 완료 저장 계약은 [구체 방 기획](design/gdd/castle-orb.md)을 따른다. 왼쪽 봉인과 대문은 아직 닫혀 있다.

### 말자하섭·토리이 추격 (BUILD310)

말자하섭은 [사용자 원본](assets/source/malzahar310/visuals/identity-reference.png)의 뾰족한 자주색 후드·청록 보석 세 개·검은 안경·청록 눈 두 개·넓은 볼·큰 코·입을 가린 목도리·짙은 조끼와 허리천을 유지한다. 가재맨 원본 시트를 대신 쓰지 않는다. 검은 오라는 본체 뒤에 두며 얼굴을 가리지 않는다. 공중 대기/시전/돌진/피격은 각각128px셀 2×2 시트·중심 피벗64,64이고, 공허충은64px셀·중심32,32다. [원본·정확한 생성 프롬프트·최종 시트 계약](assets/source/malzahar310/visuals/README.md)의 루트 PNG만 사용하며 중간 `sheet-transparent.png`로 덮어쓰지 않는다.

먼 배경 전투의 적은 가재맨의 넓은 볼·큰 코·안경·두 눈과 워윅의 늑대/발톱, 이즈리얼의 금발/마법 장갑, 야스오의 묶은 머리/검, 아칼리의 닌자복/낫을 섞은 별도 네 캐릭터다. 얼굴은 읽히게 두고 회청색·먹색 계열에 작은 챔피언 구분색을 남긴다.96px셀 2×2의 순서는 대기→준비→공격→피격이며 마지막 셀은 회복/대기 포즈가 아니다. 새 배경 시트와 근접 보스 시트의 표시 크기를 서로 복사하지 않는다. [제작 원본과 발 정렬](assets/source/malzahar310/background/README.md), 실제 연결은 `src/battle/modes/malzahar-background.js`가 소유한다.

보라 토리이는 기존 파란 토리이의 모양·분리 레이어·색키를 유지한 색상 변형이다. [팔레트 생성과 기계적 재색상 기록](assets/source/malzahar310/torii/README.md), [연속 달리기 전투 계약](design/gdd/malzahar-runner.md), 검증·배포 여부는 [STATE](docs/STATE.md)를 따른다. 이 구간의 기본 이동/점프/베기는 기존 runner를 재사용한다.

### 기억의 방 어둠 색감 (BUILD309)

섭루토·지뢰섭·우디르섭은 가재맨 `gajaeman_shadow.png`처럼 전신에 어둠의 힘을 받은 회청색 피부·먹색/남색 의상으로 표시한다. 아래308의 밝은 원색은 초기 정체성 기록이며 최신 팔레트는309가 우선한다. 얼굴 형태·눈 개수·안경 유무·코·의상 실루엣·공격 포즈는 유지하고 기존 구분색은 낮은 채도의 작은 표식으로 남긴다. 필드 중립과 전투 시전, 지뢰섭 거미줄 뒷모습도 같은 색 계열이다. 원본 편집·프롬프트·비교·규격은 `assets/source/memory309/<id>/README.md`를 따른다.

### 기억의 방 캐릭터 기준 (BUILD308)

세 적의 외형을 수정할 때 `assets/references/memory308-<id>.png`와 아래 자산 계약을 함께 확인한다. 필드와 전투는 같은 얼굴·의상·왼쪽 아래3/4 시점을 유지하며, 작은 어두운 기운은 얼굴 뒤에 둔다.

| 캐릭터 | 고정 외형 | 원본·런타임 계약 |
| --- | --- | --- |
| 섭루토 (`seobruto`) | 노란 머리, 나뭇잎 머리띠, 둥근 안경과 두 눈, 넓은 볼·큰 U자 코, 별도 입 없음, 주황/남색 닌자옷 | [섭루토](assets/source/memory308/seobruto/README.md) |
| 지뢰섭 (`jiroesub`) | 검정/분홍 쌍갈래와 리본, 안경 없는 두 눈·큰 U자 코·별도 입 없음, 분홍 프릴, 검정 치마/부츠, 캔과 쿠로미 가방 | [지뢰섭](assets/source/memory308/jiroesub/README.md) |
| 우디르섭 (`udyrsub`) | 긴 갈색 머리와 수염, 파란 머리 가닥, 안경과 두 눈·큰 U자 코, 문신한 상체, 주황 구슬·흰 붕대·가죽 치마 | [우디르섭](assets/source/memory308/udyrsub/README.md) |

세 몸체는128px셀·피벗64,120의4포즈 전투 시트와 중립 셀의 필드 정지 그림을 사용한다. 기억의 방 문·검정 석재·기둥 원경을 수정할 때는 [BUILD308 환경 계약](assets/source/memory308/environment/README.md)을 적용한다. 현재 자산은 기존 `castle307_*` 런타임 파일을 갱신하므로 과거307 생성기로 덮어쓰지 않는다. 조우·대사·진행 범위는 [기억의 방 콘티](design/narrative/cutscenes/castle_memory.md), 통합 검증·메인·배포 상태는 [STATE](docs/STATE.md)를 따른다.

뗏목 회수 기둥은 [회수 레버 원본·규격](assets/source/raft-call306/README.md)을 따른다.32×48 대기/당김2포즈, 공통 바닥 피벗16,48이며 기존 캐릭터나 뗏목 그림은 바꾸지 않는다.

BUILD306 성 북쪽 길은 외부가 아니라 검은 석벽·기둥·아치와 보라 이끼가 있는 **성 내부 진입 홀**이다. 32px 바닥4종·거대 성문·실내 배경은 [성 내부 자산 계약](assets/source/castle306/README.md), 기념사진의 하강 카메라 소품은 [카메라 계약](assets/source/ship-camera306/README.md)을 따른다. 기존 캐릭터 외형은 바꾸지 않는다. 초기 외부 성 전경은 미채택 초안으로 보존하며 런타임에 다시 연결하지 않는다.

BUILD305 출정 연출의 주먹 응답은 기존 요플래·경섭·빠맨의 얼굴과 의상을 유지한 무기 없는4프레임이다. `assets/sprites/*-deck-fist.png`는512×128, 셀128×128·발 피벗64,120·배율0.5이며 원래 걷기 높이에 맞춘다. 생성 원본/정확한 프롬프트/NEAREST·알파 보존 처리 기록은 [갑판 모션](assets/source/ship-deck305-poses/README.md), 성 입구의32px 보라 석재4종은 [타일 기록](assets/source/ship-invasion305-tiles/README.md)에 있다. 내장 이미지 생성 도구를 사용했고 기존 걷기·전투·초상화는 변경하지 않았다.

델타룬 스타일 탑다운 도트 스토리 어드벤처. **웹에서 바로 실행**, 빌드 없음(ES 모듈), 맵·아트는 파이썬 생성기로 뽑고 오디오는 mp3(출처 `design/audio/references.md`).

```bash
./dev.sh                          # 캐시 끈 개발 서버 재기동 → http://localhost:8000  (작업 트리를 그대로 서빙 — 아래 '작업 규율')
tools/dev/check.sh                # 문법 + 단위 테스트 + 맵 생성기 동기화 (커밋 전, pre-commit 이 --quick 을 강제)
tests/playtest/run.sh battle teal5 # 헤드리스 플레이테스트(Playwright, 스크린샷 tests/playtest/shots/)
```
**QA 바로가기**: 타이틀에서 **Q** 또는 `?qa=<id>` (목록 `src/core/story.js QA_POINTS`). 상태는 `docs/STATE.md`, 규칙은 `CLAUDE.md`.

### 최미스 외형 기준 (BUILD303)

최미스는 기본 모습의 흰 삐친 머리·검은 눈썹·사각 안경·긴 코·별도 치아 입·볼 점을 유지한다. 눈은 두 개로 읽혀야 하며 안경 반사나 눈썹을 세 번째 눈처럼 그리지 않는다. 전투폼은 이전 화면 키의 약1.4배인 길고 가는 체형이며, 얼굴을 세로로 늘여 키를 맞추지 않는다. 변신 후 필드폼도 같은 긴 체형·얼굴 정체성으로 이어지며 망토는 전투 진입에서 펼친다. 변신 전 뚱뚱한 기본 최미스는 그대로다. [필드4방향 원본·규격](assets/source/choimis-field303/README.md).

망토 대기·손 올림·쵸소 공격의 최신 생성 원본, 실제 프롬프트, 프레임 시간, 공통 피벗과 크기 비교는 [cape301 자산 계약](assets/source/choimis-cape301/README.md)을 따른다. 현재160px셀·피벗72,152·균등 배율0.714로 대기 키99.96px다. 파이널의 추가6프레임 망토 휘두르기는 [finale304 계약](assets/source/choimis-finale304/README.md)을 따른다. 몸 크기는 유지하며 넓은 망토만 수용하도록224×192셀·피벗136,180을 쓴다. 장면별 연결과 최신 플레이 규칙은 [DESIGN](DESIGN.md), 최종 검수·메인·배포 여부는 [STATE](docs/STATE.md)에서 구분한다.

### 작업 규율 (개발자·에이전트 공통)
- JS 수정은 `tools/dev/patch.py src/a.js <<'PY' … PY` — 임시 사본에 적용해 `node --check` 를 통과한 것만 원본으로 옮긴다(서버가 작업 트리를 서빙하므로 깨진 중간 상태 금지).
- 한 줄 문장 끝 `//` 주석 금지. 컷신 좌표는 `rel:` 기준. 커밋 전 `tools/dev/check.sh`.

| 조작 | 키 |
|---|---|
| 이동 | 방향키 / WASD (게임패드 D-pad/스틱) |
| 확인 · 말 걸기 · 대사 넘기기 | **C** (Enter/Z, 패드 A) |
| 취소 · 대사 즉시 표시 · **달리기(홀드)** | **X** (Esc/Shift, 패드 B) |
| 메뉴 | V (Tab) |
| 디버그(히트박스/플래그) | F1 |

## 구조

```
index.html            캔버스 (오디오는 첫 키 입력에서 언락)
src/ui/title.js       타이틀 화면: 블록 로고 "subtArune"(GLYPHS), C로 시작
src/main.js           Game: 상태(field/dialogue/menu), 맵 전환 페이드, 메뉴, 루프
src/core/input.js     키보드+게임패드 → 액션(up/down/left/right/confirm/cancel/menu)
src/core/audio.js     mp3 브금/효과음/목소리 로더(preloadBgm·playBgm·sfx·blip) + WebAudio 합성 폴백
src/core/gfx.js       문자열 도트아트 → 캔버스, 박스/하트, PNG 오버라이드 로더
src/ui/cutscene.js    컷신 명령(move/face/camera/fade/shake/spawn/map/parallel) → /cutscene 스킬 참고
src/data/cutscenes/   컷신 데이터 (opening.js … teal5_river.js, _template.js)
src/battle/           턴제 전투(battle.js 상태 기계, bullets.js 탄막), 적 데이터 src/data/enemies.js, 아이템 src/data/items.js
src/core/story.js     스토리 단계·QA 지점 / src/core/party.js 파티 정규화(걷는 순서 형섭→경섭→빠맨)
tools/maps/*.py       맵 생성기 → assets/maps/*.json (--check 로 동기화 검사)  ·  tools/art/*_set.py 타일·소품 페인터
tools/dev/            patch.py(안전 패치) · check.sh(한 번에 검사)
src/ui/dialogue.js    TextBox(타자기·태그·페이지·초상화·선택지) + ScriptRunner(라벨/분기/플래그)
src/world/tiles.js    타일 레지스트리 (registerTile)
src/world/world.js    TileMap / Camera / Entity 종류 (registerEntity)
src/data/art.js       도트 아트 원본 + 팔레트 (여길 고치면 그림이 바뀜)
src/data/maps.js      코드 맵(방·거실 이미지 맵). 진입할 맵의 assets/maps/*.json 과 필요한 그림을 준비한 뒤 교체한다
src/data/scripts.js   대사 스크립트 (한글)
src/data/locale/ko.js 시스템 UI 문자열
assets/               PNG를 넣으면 자동 교체 (아래 규격)
design/gdd/           기획 문서   ·  .claude/  게임 스튜디오 에이전트(49) + 스킬
tests/unit            node:test — 맵 감사·소품 키·컷신↔맵 정합·아이템·적 문구·파티·QA 지점 …
tests/playtest        Playwright 시나리오(run.sh 로 실행) — 맵마다 하나, 스크린샷을 눈으로 확인
```

## 콘텐츠 추가하는 법

**NPC 하나 추가** — `src/data/maps.js` 의 `entities` 에 한 줄:
```js
{ type: 'npc', id: 'baker', sprite: 'merchant', ...at(5, 5), facing: 'down', wander: 16, script: 'baker' },
```
`src/data/scripts.js` 에 대사:
```js
baker: [
  { speaker: '빵집 주인', portrait: 'merchant', voice: 'low', text: '* 갓 구운 빵이야.{w=0.4} {c=yellow}먹을래?{/c}',
    choice: { options: [{ label: '응', goto: 'eat' }, { label: '아니', goto: 'no' }], cancel: 1 } },
  { label: 'eat' }, { text: '* 맛있다.', voice: 'narrator' }, { set: { ate_bread: true } }, { end: true },
  { label: 'no' },  { text: '* 다음에 먹자.', voice: 'narrator' },
],
```

**대사 태그**: `{s=2}` 빠르게 · `{s=0.5}` 느리게 · `{/s}` 복귀 · `{w=0.5}` 0.5초 멈춤 · `{c=red}…{/c}` 색 · `{shake}…{/shake}` · `{wave}…{/wave}` · `{n}` 줄바꿈
**스크립트 노드**: `text` / `choice` / `label` / `goto` / `if:(flags)=>bool, goto` / `set:{}` / `action:(game)=>{}` / `end`
**화자 음색**: `src/core/audio.js` `VOICES` 에 프리셋 추가 (freq/wave/dur/jitter)

**새 맵**: 이미지 맵 `MAPS.xxx = { image:'assets/maps/xxx.png', walkable:[[x,y,w,h]], solids:[[...]], spawns:{}, entities:[] }` 또는 타일 맵 `{ rows:[...] }`
**새 타일**: `registerTile('X', { name, solid, art | draw })`   **새 엔티티 종류**: `class Foo extends Entity` + `registerEntity('foo', Foo)`

## 그림 교체 (그대로 덮어쓰기)

| 파일 | 규격 |
|---|---|
| `assets/sprites/<id>.png` (주인공 `hyungsub`, NPC는 `sprite:` 이름) | 4열 걷기 프레임 × 4행 [down, up, left, right]. 셀 크기는 PNG 폭/4 × 높이/4, 게임용 2x 해상도이며 캐릭터마다 다름 |
| `assets/tiles/<타일 name>.png` | 16×16 (`grass`, `wall`, `tree`, `door`…) |
| `assets/portraits/<이름>.png` | 생성 파일 96×96, 게임 대화창에서 48×48로 표시 |

파일이 없으면 `src/data/art.js` 의 문자 도트아트를 씀 (콘솔의 404는 이 탐색 때문 — 정상).

## 컷신 만들기

`/cutscene <이름> <한 줄 설명>` 스킬을 쓰거나, `src/data/cutscenes/_template.js` 복사 → `scripts.js` 등록 → 맵에 트리거.
검은 화면 나레이션은 `{ style:'narration', voice:'none', speed:0.6, text:'...' }`. 노드 전체 목록은 `.claude/skills/cutscene/SKILL.md`.
재생 확인: `node tests/playtest/cutscene.mjs <이름>`

## 테스트룸

`http://localhost:8000/?map=test` (또는 타이틀에서 **T**). 안내/텍스트 효과/선택지/플레이어 스프라이트 교체/전투 모션 팻말, 상자, 형섭·경섭·빠맨 NPC, 러그 밟으면 컷신 데모.
`?map=<맵>&spawn=<스폰>&sprite=<캐릭터>` 로 타이틀·오프닝 건너뛰고 바로 진입.

### 청록숲 목조 동상

청록숲2(`?qa=teal2`)는 쥰희를 닮은 목조 동상 6종을 사용한다. 기존 동상 13개의 위치·충돌·대사는 유지하고 포즈만 나눠 배치했다. 동상 아트는 `assets/props/statue_junhee_<pose>.png`이며, 맵 배치는 `tools/maps/teal.py --check`로 확인할 수 있다.

### 전투 모션 미리보기

전투 시스템에 레드/블루 미니언이나 열린 무기 상자 이미지를 연결할 때는 [전투 에셋 전달 가이드](docs/handoffs/combat-assets.md)를 먼저 확인한다. 단일 프레임 PNG·방향·pivot과 기존 4×4 필드 시트의 차이를 정리했다. 이미지 전달용이며 런타임 자동 적용은 아니다.

`http://localhost:8000/?map=test&battle=1` 또는 테스트룸의 전투 모션 팻말에서 연다. 좌우로 캐릭터 선택, C로 무기를 들고 공격 지점까지 달리기 → 공격 → 원위치 복귀, X로 원래 필드 복귀, Esc로 타이틀 이동. 동작 중에는 캐릭터 선택과 추가 공격을 잠그며, 취소하면 모두 원위치로 초기화한다. 게임패드도 기존 선택/확인/취소 액션을 사용한다.

형섭은 칼(모든 프레임 입 없음), 경섭은 양손도끼, 빠맨은 파란 구슬이 달린 한손 마법봉을 사용한다. 캐릭터마다 대기 4장과 공격 4장이 있으며, 공격 중 재입력은 무시하고 한 번 재생한 뒤 대기로 돌아간다.

원본과 생성 프롬프트는 `assets/battle/`, 프레임 영역·발 기준점·속도는 `src/data/battle-sprites.js`, 지연 로딩과 재생은 `src/ui/battle-preview.js`에 있다. 마젠타 RGB 원본은 보존하고, 기본 세 캐릭터는 동일 픽셀의 투명 런타임 아틀라스를 사용한다(`assets/battle/RUNTIME.md`). 전체 시트를 균등 분할하면 무기가 잘리므로 메타데이터를 함께 사용한다.

**현재는 엔진 안의 모션 미리보기이며 실제 전투 시스템은 아니다.** 적·HP·턴·피해 판정·스토리 전투 진입은 구현하지 않았다. 기존 이동 스프라이트와 세이브는 변경하지 않는다. 생성은 사용자 승인에 따른 내장 이미지 도구이며 특정 GPT Image 2.5 모델로 고정한 결과는 아니다.

검증: `node --test tests/unit/battle-preview.test.mjs`, `BASE_URL=http://localhost:8000 node tests/playtest/battle-preview.mjs` (기존 Playwright 실행 환경 필요).

## 캐릭터 시트 변환

AI 생성 시트(보라 배경, 캐릭터당 4열 × 4행[정면/왼쪽/오른쪽/뒷모습]) → 게임 시트 + 초상화:
```bash
pip install pillow numpy
python3 tools/sprites/slice_sheet.py sheet.png hyungsub gyeongsub ppaman   # → assets/sprites/*.png, assets/portraits/*.png
```
새 캐릭터는 `src/data/characters.js` 에 한 줄 추가. 폰트는 `src/ui/font.js` `FONT_PRESET` 한 줄 (기본 네오둥근모). 기존 폰트 파일은 `assets/fonts/`에서 자체 제공하며 외부 CDN을 기다리지 않는다. 출처·배포 라이선스는 `assets/source/fonts253/`에 있다.
사운드 파일은 `assets/audio/sfx/<이름>.mp3` 를 넣으면 합성음 대신 재생 (`design/audio/references.md`).

## 테스트

```bash
node --test 'tests/unit/*.test.mjs'                                 # 대사 파서/레이아웃/충돌
node tests/playtest/smoke.mjs                            # 헤드리스 자동 플레이 + 스크린샷 (서버 8765 필요)
```

## 스튜디오 워크플로우 (.claude)

[claude-code-game-studios](https://github.com/donchitos/claude-code-game-studios) 템플릿이 설치되어 있다.
엔진은 "자체 Canvas 2D / JS" 로 설정됨 (`CLAUDE.md`, `.claude/docs/technical-preferences.md`).
`/brainstorm` → `/design-system` → `/create-stories` → `/dev-story` → `/code-review` 순으로 쓰면 된다.

## 코드 관리 규칙

- **브랜치**: `main` 은 항상 실행 가능. 기능은 `feat/<이름>`, 컷신은 `scene/<이름>` 브랜치 → 스모크 통과 후 main.
- **커밋**: `type(scope): 요약` — `feat(dialogue)`, `fix(world)`, `art(sprites)`, `scene(opening)`, `docs`, `test`. 한 커밋 = 한 의도.
- **어디에 뭘 쓰나**: 엔진 로직 `src/core|world|ui` · 콘텐츠(맵/대사/컷신/캐릭터) `src/data` · 그림/소리 `assets` · 기획 `design` · 스킬 `.claude/skills`
- **콘텐츠 추가는 코드 수정 없이**: 캐릭터=시트 변환+`characters.js` 한 줄, 컷신=`cutscenes/*.js`, 사운드=`assets/audio/sfx/<name>.mp3`
- **커밋 전 체크**: `node --test 'tests/unit/*.test.mjs'` + `node tests/playtest/smoke.mjs` 통과, 콘솔 warn 0
- 생성물(`assets/sprites`, `assets/portraits`)은 커밋한다. 원본 AI 시트는 `assets/source/` 에 두고 도구로 재생성.

### 캐릭터 시트 재추출

현재 형섭·경섭·빠맨의 걷기 이미지는 **2026-09-10 재생성한 walk-v3**다. 각 4방향×4열 원본과 프롬프트, 프레임 크기 및 연결 높이는 `assets/source/walk-v3/manifest.json`을 따른다. 현재 버전을 재추출하려면 아래 명령을 사용한다. `--sprites-only`는 기존 대화창 초상화를 덮어쓰지 않는다.

경섭은 기본 이동 정면 4프레임의 눈매를 편안하게 완화했다. 생성 수정안의 눈 주변만 기존 원본에 반영했으며, 옆·뒷모습과 걷는 자세·초상화·전투 이미지는 유지한다.

```bash
uv run --with pillow --with numpy -- python tools/sprites/slice_sheet.py --sprites-only assets/source/walk-v3/hyungsub.png hyungsub
uv run --with pillow --with numpy -- python tools/sprites/slice_sheet.py --sprites-only assets/source/walk-v3/gyeongsub.png gyeongsub
uv run --with pillow --with numpy -- python tools/sprites/slice_sheet.py --sprites-only assets/source/walk-v3/ppaman.png ppaman
```

세 캐릭터 모두 새 중립 상체에 새 원본 하체 A/B를 붙여 **기본→발 A→기본→발 B**로 걷는다. `characters.js sideWalk`의 연결 높이는 형섭/경섭 76px, 빠맨 82px다. 쥰희의 기존 발 위치 이동 방식은 유지한다. 이전 원본과 초상화는 보존했으며, 아래의 3인 통합 시트 명령·픽셀 수정 기록은 **과거 버전 복원용**이다. 그 명령으로 현재 v3를 덮어쓰지 않는다.

원본 3인 시트의 왼쪽→오른쪽은 **형섭(`hyungsub`) · 경섭(`gyeongsub`) · 빠맨(`ppaman`)**이다. 분홍 돼지는 게임에서 **쥰희(`junhee`)**를 사용한다. 원본 행 순서(정면/왼쪽/오른쪽/뒤)는 변환기가 엔진 순서(정면/뒤/왼쪽/오른쪽)로 재배열한다. 완성 PNG를 다시 변환기에 넣지 않는다.

```bash
python3 tools/sprites/slice_sheet.py assets/source/sheet_hyungsub_gyeongsub_ppaman.png hyungsub gyeongsub ppaman
python3 tools/sprites/slice_sheet.py assets/source/sheet_junhee.png junhee
uv run --with pillow --with numpy --with pytest pytest tests/sprites -q
node tests/playtest/sprites.mjs  # 서버 8765, playwright-core 필요. SHOT_DIR로 캡처 위치 지정
```

배경은 셀 가장자리에 연결된 배경색만 투명화한다. 외곽선 침식·색 평균·팔레트 양자화를 하지 않는다. 원본 파일은 보존하고, 기존 엔진용 크기 변환에는 최근접 픽셀만 사용한다. 초상화도 같은 정면 프레임에서 추출한다. 형섭의 인트로 대사는 `HS()`로 이름·초상화·목소리를 사용하고, 보라맵 이후에는 나레이션으로 처리한다(`docs/STATE.md` 참조).

걷기 프레임은 **같은 방향의 4장을 공통 영역으로 자르고 같은 축소 격자에 정렬**한다. 한 장씩 몸에 딱 맞춰 자른 뒤 발을 바닥에 붙이면, 들린 발 때문에 머리까지 위아래로 흔들린다. 셀 테두리를 일괄 삭제하는 처리도 신발을 자르므로 금지한다.

옆걷기는 **기본 자세·한쪽 발 앞으로·반대쪽 발 앞으로, 총 3포즈**만 사용한다. `기본 → 발 A → 기본 → 발 B`의 4박자로 반복하며 멈추면 기본 자세로 돌아간다. 형섭은 더 자연스러운 보행을 위해 중립 상체에 원본 하체 A/B를 연결한다. 다른 PNG 캐릭터는 각 옆방향 첫 프레임의 상체를 고정하고 발 영역만 정수 픽셀로 이동한다. `src/data/characters.js`의 `sideWalk`가 원본 하체 프레임·연결 높이 또는 발 영역·보폭을 지정한다. 최초 로드 시 Canvas에 구워 두며, 대체 문자 도트 캐릭터도 기존 `TORSO` + 3종 `LEGS` 조합으로 같은 순서를 따른다.

이 규칙은 형섭·경섭·빠맨·쥰희와 대체 캐릭터 모두에 적용한다. 원본 및 게임용 PNG 자체는 바꾸지 않으며 정면/뒷면의 기존 4프레임도 그대로다. PNG만 다른 도구에 넘기면 이 런타임 조합은 포함되지 않으므로 `sideWalk` 설정과 게임 로더를 함께 참고한다. 이전 형섭 전용 `walkFrameOrder` 설정은 이 3포즈 방식으로 대체했다.

형섭은 **모든 방향에서 입 없이 코만** 남긴다. 원본의 남은 옆모습 입선은 직접 픽셀 편집으로 제거했으며 `assets/source/hyungsub-mouth-retouch.json`에 범위를 기록했다. 경섭의 입은 제거 대상이 아니다.

화면 표시는 모니터 DPR을 반영하여 캔버스 픽셀의 정수배로 맞춘다. 일부 창 크기에서는 여백이 늘어나며, 캔버스가 들어가지 않는 작은 화면에서는 전체 화면 맞춤 축소를 사용한다. 원본 PNG와 사용자 지정 캐릭터 크기 1.43배는 유지한다. 원본 도트 자체를 다시 생성한 것은 아니며, 내부 1.43배 비율의 비균등 픽셀까지 제거했다는 의미는 아니다. 자세한 범위는 `DESIGN.md` 참조.

## 후회의 방 캐릭터 기준 (BUILD315)

마스터이섭·신드라섭·탈리야섭·아우솔섭은 기존 기억의 방 가재맨 계열의 넓은 볼, 큰 코, 검은 안경, 두 눈과 어두운 회청색 얼굴을 유지한다. 마스터 이의 다중 렌즈/검, 신드라의 왕관/은빛 머리, 탈리야의 바위 직조 의상/스카프, 아우솔의 뿔/감긴 별빛 용 몸으로 구분한다. 별도 입선은 없다.

각 전투 시트는256×256,128px셀2×2이며 중립→준비→공격/시전→피격 순서, 피벗64,120이다. 필드는 정확한 중립 셀128px다. 마스터이/신드라 중립 키98px, 탈리야97px, 감긴 용인 아우솔90px다. 생성 원본·정확한 프롬프트·기계적 투명화/최근접 크기/공통축 재현은 `assets/source/regret315/<id>/`에 보존한다. 기존 이미지의 단순 이름 바꾸기나 코드로 그린 몸체가 아니다.

필드에는 마스터이섭, 신드라섭, 탈리야섭만 배치한다. 탈리야섭은 아우솔섭과 함께 등장하는 대표 조우이며 총3전투, 각각HP45다. 외형 제작 완료와 사용자의 최종 미적 확정은 구별한다. [구간 계약](design/gdd/castle-regret.md).

## 맵 에디터 (델타룬 에셋으로 맵 그리기)

```bash
./dev.sh            # http://localhost:8000/editor.html
```
- **라이브러리**: `assets/library/deltarune/sprites/` 델타룬 캐릭터·오브젝트 스프라이트 1963장(ch1~4, UTDRSpriteWeb), `assets/library/deltarune/maps/` 실제 지역 맵/스크린샷 34장(Hometown 전체 지도, 학교, 토리엘 집 1·2층, 홀리데이 저택, 교회, 노엘 방 …).
- **새 맵**: "+ 새 맵" → 라이브러리 지역 이미지에서 드래그로 잘라 배경으로 (1440×1080 스크린샷은 배율 2.25로 자동 축소 → 게임 원본 크기).
- **도구**: 걷는 영역(W) / 막힘(S) / 트리거(T, `to`+`spawn` 넣으면 문) / 상호작용(I, 스크립트 이름) / 스폰(P) / NPC(N) / 소품(B, 라이브러리에서 고른 스프라이트 배치, y-정렬·막힘·상호작용).
- **저장(⌘S)** → `assets/maps/<id>.json` (+`index.json`). 게임이 시작할 때 JSON 맵을 코드 맵보다 우선 로드. **▶ 플레이** 로 바로 확인.
- 대사는 여전히 `src/data/scripts.js` — 상호작용/트리거의 `script` 에 그 키를 적는다.
