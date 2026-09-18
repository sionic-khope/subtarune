# SUBTARUNE · Codex entrypoint

## 시작할 때

1. `CLAUDE.md`와 `docs/STATE.md`의 해당 작업 최신 항목을 읽는다. 개발·기획·검수는 [공통 판단 기준](docs/development/quality-contract.md)을 적용한다. `CLAUDE.md`의 `@경로`는 실제 파일 참조이므로 필요한 참조도 직접 연다.
2. `git status --short --branch`와 최근 커밋을 확인한다. STATE의 날짜·“다음 할 일”에는 제작 이력이 섞여 있으므로, 이번 요청과 관련된 코드·맵·테스트와 대조한 뒤 현재 상태를 판단한다.
3. 수정 경로의 상위 폴더에 있는 `CLAUDE.md`와 `.claude/rules/**/*.md` 중 frontmatter `paths`가 일치하는 규칙을 읽는다. 플러그인의 자동 주입 여부에 의존하지 않고 적용할 원본 경로를 확인한다.
4. 아래 작업별 스킬을 읽고 시작한다. 표에 없는 작업은 `.claude/skills/*/SKILL.md`의 name/description으로 찾고, 선택한 본문과 필수 참조를 모두 읽는다.

| 작업 | 공통 절차 원본 |
| --- | --- |
| 맵·동선·소품 배치 | `.claude/skills/map/SKILL.md` |
| 컷신·대사·카메라·이벤트 | `.claude/skills/cutscene/SKILL.md` |
| 타일·기존 절차형 소품·영상 이펙트 | `.claude/skills/art/SKILL.md` |
| 적 등록·전투·탄막 | `.claude/skills/enemy/SKILL.md` |
| 아이디어·게임성·신규 기믹 기획 | `.claude/skills/subtarune-design/SKILL.md` |
| 메뉴·아이템·선택지·전투 UI | `.claude/skills/subtarune-ui/SKILL.md` |
| 스프라이트 제작 담당과 코드 통합 담당의 전달 | `.claude/skills/subtarune-sprite-handoff/SKILL.md` |
| 이미지 생성·모델 교체·승인 외형 유지 | `.claude/skills/subtarune-sprite-production/SKILL.md` |
| OpenGateway API로 직접 생성·후처리(실행기) | `.claude/skills/subtarune-imagegen/SKILL.md`, `tools/sprites/imagegen.py` |
| 요구 일치·실제 플레이·문서/스킬 검수 | `.claude/skills/subtarune-verify/SKILL.md` |

Fable 등 다른 코딩 담당자의 첫 인계는 [공통 진입점](docs/development/fable-handoff.md)을 읽는다. 스킬 자동 탐색이나 Codex 전용 도구 없이도 저장소 원본을 직접 읽고, 실제 사용할 수 있는 도구/API만 선택한다.

전투·메뉴·회귀 QA를 실행하거나 추가할 때는 [재사용 QA 가이드](docs/development/reusable-qa.md)에서 기존 러너/시나리오부터 찾는다. 브라우저 실행·캡처·결과 수집을 매번 새로 만들지 않는다.

## Codex에서 해석하는 방법

- `/map` 같은 표기는 해당 `SKILL.md`의 절차를 실행하라는 뜻이다. Claude 명령 실행기나 모든 스킬의 자동 설치를 전제로 하지 않는다. 원본을 복제하지 않아 Claude 쪽 개선을 다음 작업에서도 그대로 읽는다.
- `Read/Glob/Grep/Bash`는 현재 환경의 읽기·검색·터미널 도구로, `Write/Edit`는 허용된 편집 도구로 대응한다. `model: opus/sonnet/haiku`, `allowed-tools`, Claude의 Task·hooks·팀 설정은 해당 하네스 메타데이터이며 현재 도구에 없는 기능이 실행됐다고 보고하지 않는다. 위임이 필요하면 사용 가능한 Codex 역할에 작업 범위와 원본 지침을 전달한다.
- 실제 엔진은 루트 `CLAUDE.md`의 Canvas/JavaScript 구성이다. Godot/Unity 전용 템플릿은 그 엔진 파일을 다룰 때만 적용한다. 오래된 수치·미구현 설명은 현재 코드와 사용자 확정 기록을 대조한다. 불일치는 보고하고 미요청 게임 동작을 고쳐 맞추지 않는다.
- 권한·작업 범위는 현재 시스템/개발자 지침과 최신 사용자 요청을 따른다. “작업 후 무조건 push/서버 재기동” 같은 템플릿을 자산 전달·상태 조사에 확장하지 않는다. 다른 세션이 서빙하는 작업 트리와 미커밋 파일을 보존하고, 소스 변경은 별도 worktree에서 허용된 편집 도구로 작성·문법 확인한 뒤 전달한다. 이는 `tools/dev/patch.py`가 지키려는 라이브 서버의 문법 안전성을 유지하기 위함이다.
- 생성 스프라이트는 `subtarune-sprite-production`의 승인 결과 계약과 선택한 공급자 경로를 따른다. Codex 내장 경로일 때는 사용 가능한 `pixel-character-sprites`/`imagegen`/`generate2dsprite`를 적용한다. OpenGateway 경로는 `subtarune-imagegen`의 `tools/sprites/imagegen.py`로 호출하며(키 `OPENGATEWAY_API_KEY`) 산출물 계약은 동일하다. `.claude/skills/art`의 페인터 절차가 사용자 요청의 이미지 생성을 대신하지 않는다. 기존 런타임 규격·정체성은 `assets/source/`와 `docs/handoffs/`를 확인한다.
- “이 이미지 쓰세요” 자산 전달은 PNG·규격·짧은 사용 지침까지다. 실제 등록·컷신·전투 구현은 명시적으로 요청받은 경우에만 한다. 확인 범위도 자산과 연동 계약에 맞추고, 전체 게임을 검증했다고 표현하지 않는다.

## 작업을 마칠 때

실제 게임 상태를 바꿨다면 `docs/STATE.md`의 해당 항목만 갱신한다. 자산 전달, 코드 구현, 로컬 실행, 원격 push, 배포 여부를 구분해 기록한다. Codex 전용 STATE 복사본은 만들지 않는다.

게임 구현 완료 후 메인 반영 범위와 전투 기믹 확장 방향은 `docs/STATE.md`의 “메인 반영·전투 확장 방향”을 따른다(2026-09-12 사용자 확정).
