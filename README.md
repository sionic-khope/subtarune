# SUBTARUNE

델타룬 스타일 탑다운 도트 RPG 프로토타입. **웹에서 바로 실행**, 빌드 없음, 외부 에셋 0개.

```bash
python3 serve.py 8000            # 캐시 끈 개발 서버 (아무 정적 서버든 됨)
# → http://localhost:8000
```

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
src/core/audio.js     WebAudio 합성. VOICES(화자 음색), 글자당 0.1초 블립, SFX
src/core/gfx.js       문자열 도트아트 → 캔버스, 박스/하트, PNG 오버라이드 로더
src/ui/cutscene.js    컷신 명령(move/face/camera/fade/shake/spawn/map/parallel) → /cutscene 스킬 참고
src/data/cutscenes/   컷신 데이터 (opening.js, _template.js)
src/ui/dialogue.js    TextBox(타자기·태그·페이지·초상화·선택지) + ScriptRunner(라벨/분기/플래그)
src/world/tiles.js    타일 레지스트리 (registerTile)
src/world/world.js    TileMap / Camera / Entity 종류 (registerEntity)
src/data/art.js       도트 아트 원본 + 팔레트 (여길 고치면 그림이 바뀜)
src/data/maps.js      맵: 이미지 맵(실제 배경 PNG + 사각형 충돌) / 타일 맵(문자열 그리드)
src/data/scripts.js   대사 스크립트 (한글)
src/data/locale/ko.js 시스템 UI 문자열
assets/               PNG를 넣으면 자동 교체 (아래 규격)
design/gdd/           기획 문서   ·  .claude/  게임 스튜디오 에이전트(49) + 스킬
tests/                node:test 단위 테스트 + Playwright 스모크
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

`http://localhost:8000/?map=test` (또는 타이틀에서 **T**). 팻말 4개(안내/텍스트 효과/선택지/**플레이어 스프라이트 교체**), 상자, 형섭·경섭·빠맨 NPC, 러그 밟으면 컷신 데모.
`?map=<맵>&spawn=<스폰>&sprite=<캐릭터>` 로 타이틀·오프닝 건너뛰고 바로 진입.

## 캐릭터 시트 변환

AI 생성 시트(보라 배경, 캐릭터당 4열 × 4행[정면/왼쪽/오른쪽/뒷모습]) → 게임 시트 + 초상화:
```bash
pip install pillow numpy
python3 tools/sprites/slice_sheet.py sheet.png hyungsub gyeongsub ppaman   # → assets/sprites/*.png, assets/portraits/*.png
```
새 캐릭터는 `src/data/characters.js` 에 한 줄 추가. 폰트는 `src/ui/font.js` `FONT_PRESET` 한 줄 (기본 네오둥근모).
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

## 맵 에디터 (델타룬 에셋으로 맵 그리기)

```bash
./dev.sh            # http://localhost:8000/editor.html
```
- **라이브러리**: `assets/library/deltarune/sprites/` 델타룬 캐릭터·오브젝트 스프라이트 1963장(ch1~4, UTDRSpriteWeb), `assets/library/deltarune/maps/` 실제 지역 맵/스크린샷 34장(Hometown 전체 지도, 학교, 토리엘 집 1·2층, 홀리데이 저택, 교회, 노엘 방 …).
- **새 맵**: "+ 새 맵" → 라이브러리 지역 이미지에서 드래그로 잘라 배경으로 (1440×1080 스크린샷은 배율 2.25로 자동 축소 → 게임 원본 크기).
- **도구**: 걷는 영역(W) / 막힘(S) / 트리거(T, `to`+`spawn` 넣으면 문) / 상호작용(I, 스크립트 이름) / 스폰(P) / NPC(N) / 소품(B, 라이브러리에서 고른 스프라이트 배치, y-정렬·막힘·상호작용).
- **저장(⌘S)** → `assets/maps/<id>.json` (+`index.json`). 게임이 시작할 때 JSON 맵을 코드 맵보다 우선 로드. **▶ 플레이** 로 바로 확인.
- 대사는 여전히 `src/data/scripts.js` — 상호작용/트리거의 `script` 에 그 키를 적는다.
