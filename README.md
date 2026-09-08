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
src/data/maps.js      맵(문자열 그리드) + 엔티티 배치
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

**새 맵**: `MAPS.xxx = { rows:[...], spawns:{}, entities:[ { type:'door', to:'village', spawn:'start' } ] }`
**새 타일**: `registerTile('X', { name, solid, art | draw })`   **새 엔티티 종류**: `class Foo extends Entity` + `registerEntity('foo', Foo)`

## 그림 교체 (그대로 덮어쓰기)

| 파일 | 규격 |
|---|---|
| `assets/sprites/hero.png` (npc는 `sprite:` 이름) | 64×64: 4열 [idle, stepA, idle, stepB] × 4행 [down, up, left, right], 셀 16×16 |
| `assets/tiles/<타일 name>.png` | 16×16 (`grass`, `wall`, `tree`, `door`…) |
| `assets/portraits/<이름>.png` | 48×48 |

파일이 없으면 `src/data/art.js` 의 문자 도트아트를 씀 (콘솔의 404는 이 탐색 때문 — 정상).

## 컷신 만들기

`/cutscene <이름> <한 줄 설명>` 스킬을 쓰거나, `src/data/cutscenes/_template.js` 복사 → `scripts.js` 등록 → 맵에 트리거.
검은 화면 나레이션은 `{ style:'narration', voice:'none', speed:0.6, text:'...' }`. 노드 전체 목록은 `.claude/skills/cutscene/SKILL.md`.
재생 확인: `node tests/playtest/cutscene.mjs <이름>`

## 테스트룸

`http://localhost:8000/?map=test` (또는 마을 오른쪽 위 문). 팻말 4개(안내/텍스트 효과/선택지/**플레이어 스프라이트 교체**), 상자, 형섭·경섭·빠맨 NPC, 러그 밟으면 컷신 데모.
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
