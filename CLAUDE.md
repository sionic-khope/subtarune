# Claude Code Game Studios -- Game Studio Agent Architecture

Indie game development managed through 49 coordinated Claude Code subagents.
Each agent owns a specific domain, enforcing separation of concerns and quality.

## Technology Stack

- **Engine**: 자체 제작 HTML5 Canvas 2D 엔진 (`src/core`, `src/world`, `src/ui`) — 외부 게임 엔진 없음
- **Language**: JavaScript (ES2022 모듈, 빌드 도구 없음, 브라우저에서 그대로 실행)
- **Version Control**: Git with trunk-based development
- **Build System**: 없음 — `python3 -m http.server` 로 정적 서빙
- **Asset Pipeline**: 도트 아트는 `src/data/art.js` 문자열 그리드 → 런타임에 캔버스로 굽는다. `assets/sprites|tiles|portraits/*.png` 가 있으면 자동 오버라이드.
- **Audio**: 오디오 파일 없음 — WebAudio 합성 (`src/core/audio.js`). 대사 1글자 = 0.1초 블립.

> **Note**: Godot/Unity/Unreal 전용 에이전트(`*-specialist`)는 이 프로젝트에서 사용하지 않는다.
> 웹 코드 리뷰는 `lead-programmer` / `ui-programmer` / `gameplay-programmer` 가 담당한다.

## 세션 시작 시 (필수)
1. `docs/STATE.md` 를 읽는다 — 현재 상태, 파일 위치, 사용자가 확정한 규칙, 다음 할 일.
2. 맵은 `/map`, 그림은 `/art`, 컷신은 `/cutscene` 스킬로. 작업 끝나면 `docs/STATE.md` 갱신 + 커밋/푸시(`sionic-khope/subtarune`) + `./dev.sh` 재기동.

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
