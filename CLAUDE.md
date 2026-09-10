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
1. `docs/STATE.md` 를 읽는다 — 현재 상태, 파일 위치, 사용자가 확정한 규칙, 다음 할 일.
2. 맵은 `/map`, 그림은 `/art`, 컷신은 `/cutscene` 스킬로. 작업 끝나면 `docs/STATE.md` 갱신 + 커밋/푸시(`sionic-khope/subtarune`) + `./dev.sh` 재기동.

## 작업 규율 (2026-09-10 버그 회고에서 확정 — 어기면 사용자가 곧바로 겪는다)
- **서버는 작업 트리를 그대로 서빙한다.** 사용자는 작업 중에도 플레이한다. JS 는 `tools/dev/patch.py <files> <<'PY' … PY` 로만 고친다(임시 사본 → `node --check` → 이동). 문법이 깨진 파일이 1초라도 저장되면 "목소리·브금이 사라졌다"로 보인다.
- **한 줄짜리 문장 끝에 `//` 주석 금지**(뒤 코드가 주석 처리됨 — 같은 날 세 번 반복). 주석은 윗줄에.
- **컷신 좌표는 기준물 상대**(`{move, rel:'id', at, by}`). 절대 `px` 는 맵 밖으로 걸어 나갈 때만. 맵을 바꾸면 컷신 좌표가 같이 깨진다 — `tests/unit/cutscenes.test.mjs` 가 맵 안쪽 허공으로 가는 이동을 잡는다.
- **커밋 전 `tools/dev/check.sh`**(문법·단위 테스트·맵 생성기 동기화). `.githooks/pre-commit` 이 `--quick` 을 강제한다. 플레이테스트는 `tests/playtest/run.sh <이름…>`.
- **검증은 눈으로**: 연출은 중간 프레임 스크린샷(Read)으로 본다. 헤드리스 통과 ≠ 완료. 테스트는 프록시가 아니라 보이는 값(`flyX`, y 단, 스프라이트 위치)을 잰다.
- **사용자가 고른 것은 바꾸지 않는다**(사운드·대사·레이아웃). "공식으로" 같은 지시는 아직 안 고른 것에만. 참고 이미지(델타룬)가 있으면 그 구성이 기본값.
- **표준 흐름을 컷신에서 복사하지 않는다**(튜토리얼 전용 `{bgm:null}` 이 조우 표준으로 새어 들어간 사례). 줄마다 "일반 맵에서도 맞나".
- 큰 패치는 앵커 교체(`rep(old,new)`)로, 슬라이스는 `assert a < b`. 끝나면 메서드 이름 중복 grep.

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

**User-driven collaboration, not autonomous execution.**
Every task follows: **Question -> Options -> Decision -> Draft -> Approval**

- Agents MUST ask "May I write this to [filepath]?" before using Write/Edit tools
- Agents MUST show drafts or summaries before requesting approval
- Multi-file changes require explicit approval for the full changeset
- No commits without user instruction

See `docs/COLLABORATIVE-DESIGN-PRINCIPLE.md` for full protocol and examples.

> **First session?** If the project has no engine configured and no game concept,
> run `/start` to begin the guided onboarding flow.

## Coding Standards

@.claude/docs/coding-standards.md

## Context Management

@.claude/docs/context-management.md
