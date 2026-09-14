# Claude Code Game Studios -- Game Studio Agent Architecture

Indie game development managed through 49 coordinated Claude Code subagents.
Each agent owns a specific domain, enforcing separation of concerns and quality.

## Technology Stack

- **Engine**: 자체 제작 HTML5 Canvas 2D 엔진 (`src/core`, `src/world`, `src/ui`) — 외부 게임 엔진 없음
- **Language**: JavaScript (ES2022 모듈, 빌드 도구 없음, 브라우저에서 그대로 실행)
- **Version Control**: Git with trunk-based development
- **Build System**: 없음 — `python3 -m http.server` 로 정적 서빙
- **Asset Pipeline**: 타일·소품은 `tools/art/*_set.py`(painter Canvas)로 그려 `assets/tiles|props/*.png`, 맵은 `tools/maps/*.py` 생성기 → `assets/maps/<id>.json`(+`index.json`). 캐릭터는 실제 스프라이트 시트(`assets/sprites`)·초상화(`assets/portraits`). 문자 도트(`src/data/art.js`)는 폴백.
- **Audio**: `assets/audio/bgm|sfx|voices/*.mp3`(유튜브·언더테일/델타룬 공식 효과음, 출처는 `design/audio/references.md`) + WebAudio 블립. **사용자가 고른 사운드는 교체 금지.**

> **Note**: Godot/Unity/Unreal 전용 에이전트(`*-specialist`)는 이 프로젝트에서 사용하지 않는다.
> 웹 코드 리뷰는 `lead-programmer` / `ui-programmer` / `gameplay-programmer` 가 담당한다.

## 세션 시작 시 (필수)
0. 개발·기획·검수의 모델 공통 기준은 [quality-contract](docs/development/quality-contract.md)다. 이 원본의 작업별 라우팅을 적용하며, 아래의 범용 스튜디오 템플릿보다 최신 사용자 확정과 이 프로젝트 계약을 우선한다.
1. `docs/STATE.md` 를 읽는다 — 현재 상태, 파일 위치, 사용자가 확정한 규칙, 다음 할 일.
2. 맵은 `/map`, 컷신은 `/cutscene`, 적·전투는 `/enemy`; 아이디어는 `/subtarune-design`, 메뉴는 `/subtarune-ui`, 이미지 생성/모델 교체는 `/subtarune-sprite-production`, 담당 전달은 `/subtarune-sprite-handoff`, 회귀 검수는 `/subtarune-verify`를 적용한다. 호출 문법이 없는 Fable 등은 [공통 진입점](docs/development/fable-handoff.md)에서 같은 원본을 직접 읽는다. 실제 구현의 메인 반영은 `docs/STATE.md`의 “메인 반영·전투 확장 방향”을 따른다.

## 작업 규율 (2026-09-10 버그 회고에서 확정 — 어기면 사용자가 곧바로 겪는다)
- **맵 확장·분위기 변경**: 먼저 `.claude/skills/map/SKILL.md`의 “지역 자산 연속성”을 적용한다. 옛 지역 자산을 잘못 재사용하고 검증에서 놓친 [회고](docs/postmortems/2026-09-12-object-region-art.md)를 새 지역 작업·관련 리뷰 때 읽는다.
- **서버는 작업 트리를 그대로 서빙한다.** 사용자는 작업 중에도 플레이한다. JS 는 `tools/dev/patch.py <files> <<'PY' … PY` 로만 고친다(임시 사본 → `node --check` → 이동). 문법이 깨진 파일이 1초라도 저장되면 "목소리·브금이 사라졌다"로 보인다.
- **한 줄짜리 문장 끝에 `//` 주석 금지**(뒤 코드가 주석 처리됨 — 같은 날 세 번 반복). 주석은 윗줄에.
- **컷신 좌표는 기준물 상대**(`{move, rel:'id', at, by}`). 절대 `px` 는 맵 밖으로 걸어 나갈 때만. 맵을 바꾸면 컷신 좌표가 같이 깨진다 — `tests/unit/cutscenes.test.mjs` 가 맵 안쪽 허공으로 가는 이동을 잡는다.
- **커밋 전 `tools/dev/check.sh`**(문법·단위 테스트·맵 생성기 동기화). `.githooks/pre-commit` 이 `--quick` 을 강제한다. 플레이테스트는 `tests/playtest/run.sh <이름…>`.
- **검증은 눈으로**: 연출은 중간 프레임 스크린샷(Read)으로 본다. 헤드리스 통과 ≠ 완료. 테스트는 프록시가 아니라 보이는 값(`flyX`, y 단, 스프라이트 위치)을 잰다.
- **사용자가 고른 것은 바꾸지 않는다**(사운드·대사·레이아웃). "공식으로" 같은 지시는 아직 안 고른 것에만. 참고 이미지(델타룬)가 있으면 그 구성이 기본값.
- **표준 흐름을 컷신에서 복사하지 않는다**(튜토리얼 전용 `{bgm:null}` 이 조우 표준으로 새어 들어간 사례). 줄마다 "일반 맵에서도 맞나".
- 큰 패치는 앵커 교체(`rep(old,new)`)로, 슬라이스는 `assert a < b`. 끝나면 메서드 이름 중복 grep.
- **레이아웃은 예산 안에서 사각형으로**(2026-09-11 레이아웃 포스트모텀): 보이는 영역은 `src/core/layout.js`(대화 중 230px, 전투 패널 위 246px, 프로브 19px). 크기·자리를 정하면 `maps-layout.test`(프로브 도달·밑동은 길 밖·컷신 자리는 걷는 타일·정지 그림 ≤ 230) 와 `tests/playtest/lib/layout.mjs`(잘림·겹침) 로 재고, 스크린샷은 가장자리·가림·겹침·간격·떠 있음 5항목을 본다. "두 배" 같은 배수는 예산 안 최대치로 읽는다.

## Game Concept (요약)

델타룬 느낌의 탑다운 도트 **스토리 어드벤처**. 레벨업/노가다 없음. 스토리 → 중간중간 미니게임 + 선택지 상호작용.
쯔꾸르처럼 **정해진 길만** 이동. 주인공 = 형섭(hyungsub). 등장: 경섭, 빠맨(곰), 쥰희(돼지).
조작: 방향키 이동 / **C 확인** / **X 취소·달리기** / V 메뉴. 게임패드 지원.
자세한 내용은 `design/gdd/core-concept.md`.

## Project Structure

@.claude/docs/directory-structure.md

## Engine Version Reference

@docs/engine-reference/godot/VERSION.md

## Technical Preferences

@.claude/docs/technical-preferences.md

## Coordination Rules

@.claude/docs/coordination-rules.md

## Collaboration Protocol

스프라이트 생성/외형 편집은 `.claude/skills/subtarune-sprite-production/SKILL.md`의 모델 공통 결과 계약과 `subtarune-sprite-handoff`의 담당 전달 절차를 따른다. 코딩 담당은 명세·코드·게임 통합을 소유하며 연결된 Codex 또는 사용자가 선택한 이미지 API 경로로 제작한다. 실제 도구/참조 지원/비용 범위를 확인하기 전에는 호출 가능이나 제작 완료를 주장하지 않는다.

사용자가 맡긴 구현·수정·문서화는 검수와 이미 승인된 메인 반영까지 진행한다. 파일마다 쓰기 승인을 반복하지 않는다. 기획만 요청한 경우에는 제안 범위로 끝낸다. 판단/권한/복구의 원본은 [공통 판단 기준](docs/development/quality-contract.md)이다. `docs/COLLABORATIVE-DESIGN-PRINCIPLE.md`의 과거 템플릿 예시는 최신 프로젝트 실행 권한을 제한하지 않는다.

> **First session?** If the project has no engine configured and no game concept,
> run `/start` to begin the guided onboarding flow.

## Coding Standards

@.claude/docs/coding-standards.md

## Context Management

@.claude/docs/context-management.md
