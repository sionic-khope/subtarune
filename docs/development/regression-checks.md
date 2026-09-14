# 변경 범위에 맞는 회귀 검수

게임 QA의 검사 선택과 증거 원본이다. 실행 절차는 [subtarune-verify](../../.claude/skills/subtarune-verify/SKILL.md), 요구와 권한은 [공통 계약](quality-contract.md)을 따른다. 아래 경로는 시작점이며 실제 diff의 호출자·공유 상태를 검색해 이번 영향 범위를 확정한다.

## 검사 선택

1. 사용자 요구와 diff에서 **변경 기능 → 상위 진입 → 하위 복귀 → 공통 소비자**를 한 줄로 연결한다. 예: 아이템 메뉴 → 필드 V → 대상 선택/사용/X 복귀 → 같은 인벤토리를 쓰는 상점·전투·이어하기.
2. 아래 표의 관련 행에 `적용` 또는 `제외: 경로/계약 근거`를 적는다. 공통 입력·저장·소비·턴·모드 계약을 바꾸면 그 계약의 다른 소비자 검사는 필수다. 직접 바꾼 화면 하나의 PASS로 대신하지 않는다. 동일 계약을 쓰는 소비자는 대표 경로로 묶되, 별도 상태 전이·종료 분기를 가진 소비자는 각각 남긴다.
3. 각 적용 행에 시작 fixture, 실제 입력 순서, 기대 상태 변화량, 복귀 조건, 사용할 테스트와 수동 관찰을 정한다. 기존 테스트가 해당 실패를 실행하는지 본문을 읽고, 빠진 경로는 검사로 보완한다. 테스트 파일이 존재한다는 것만으로 커버됐다고 적지 않는다.
4. 게임 구현의 커밋 전에는 `tools/dev/check.sh` 전체 검사(문법·단위·맵 동기화)를 실행한다. `--quick`은 전체 검사를 대신하지 않는다. 실제 표면은 대상 경로를 선택해 확인하며 변경과 무관한 모든 보스 완주를 기본값으로 요구하지 않는다. 새 수정/실패가 생기면 해당 증거를 갱신한다.

## 중요한 불변조건과 범위별 검사

‘필수’는 해당 계약에 영향이 있을 때의 완료 조건이다. 적용 행의 실패·미실행은 미해결로 남긴다. 긴 문자열·목록·뷰포트 조합의 수는 변경 위험에 비례해 고르되, 잘림이나 목록 회귀를 고칠 때는 실제 실패 경계 양쪽을 포함한다.

| 영향 영역 / 실제 소유자 | 필수 불변조건과 관찰 | 기존 검사 시작점 |
| --- | --- | --- |
| 메뉴바·하위 패널·입력: `src/main.js`의 `updateMenu`/`drawMenu`, `src/core/input.js`, `src/ui/shop.js`, `src/ui/dialogue.js` | 필드 진입→메뉴 항목→하위 목록→대상 선택→취소/확정→필드 복귀를 실행한다. 한 번 누름·유지·OS 반복·뗀 뒤 새 누름·빠른 연타를 구분한다. 진입 입력이 다음 선택까지 소비되지 않고, 취소 입력이 다음 화면을 닫거나 행동까지 실행하지 않아야 한다. 포커스 이탈/복귀와 게임패드 경로는 공통 입력 변경 시 포함한다. | [menu](../../tests/playtest/menu.mjs), [choice](../../tests/playtest/choice.mjs), [shop](../../tests/playtest/shop.mjs) |
| 돈·아이템·턴: `src/core/shop.js`, `src/main.js`의 `useItemOn`, `src/battle/battle.js` | 선택/상세/대상 취소에는 비용·아이템·턴 소비가 없다. 실행 확정 한 건은 계약상 비용/효과/턴을 정확히 한 번 적용한다. 전투는 계획 선택과 실행 시점을 구분한다. 마지막 한 개, 같은 이름 여러 개, 돈 부족/품절, 판매 후 목록 축소를 확인하고 전후 돈·수량·HP·플랜/턴을 비교한다. | [shop 단위](../../tests/unit/shop.test.mjs), [items](../../tests/unit/items.test.mjs), [battle](../../tests/playtest/battle.mjs) |
| 커서·HUD·공통 텍스트: `src/ui/menu-layout.js`, `src/main.js`, `src/battle/battle.js`, `src/ui/font.js` | 항목 감소·빈 목록·다음/이전 화면 후 커서가 유효한 항목을 가리킨다. 쓰러진 멤버의 선택 가능 여부는 해당 필드/전투 계약과 대조한다. 긴 한글·줄바꿈·목록 증가에서 마지막 항목과 설명·금액·HP가 읽히고, 전투 행동 선택 중 잡담·HP가 유지된다. 공통 글꼴/창 계산 변경이면 필드 메뉴·상점·전투 소비자를 모두 확인한다. | [menu-layout](../../tests/unit/menu-layout.test.mjs), [battle-party-layout](../../tests/unit/battle-party-layout.test.mjs), [layout 보조](../../tests/playtest/lib/layout.mjs) |
| 저장·상태 복구: `src/core/story.js`, `src/main.js`의 `autosave`/`continueGame`/`resetState`/`doEscape` | 정상 완료→저장→재입장/이어하기에서 아이템·돈·강화·HP·파티·완료 flag를 대조한다. 중단/재도전은 해당 계약의 초기 상태로 돌아가며 1회 보상·컷신이 중복되지 않는다. 비상탈출은 스토리 진행을 보존하고 되돌릴 맵 장치만 복구한다. QA 점프 후 이어하기도 직전 세션 상태가 섞이지 않아야 한다. | [story](../../tests/unit/story.test.mjs), [qa-state](../../tests/unit/qa-state.test.mjs), [continue](../../tests/playtest/continue.mjs), [menu](../../tests/playtest/menu.mjs) |
| 전투 모드·공통 종료: `src/battle/modes.js`, `src/battle/battle.js`, `src/battle/support/` | 진입→실제 대응→턴 복귀, 패배→재도전, 승리→필드 복귀에서 HP·쓰러짐·승패·보상과 입력이 유지된다. 공유 전투 계약 변경은 기본 rush/bullets 및 영향받는 별도 모드/지원의 대표 경로를 포함한다. 바론 대포·파크 모드처럼 다른 종료 경로를 생략할 때는 호출 관계상 영향 없음의 근거가 필요하다. | [battle-modes](../../tests/unit/battle-modes.test.mjs), [cannon-guard](../../tests/unit/cannon-guard.test.mjs), [park-witch-trial](../../tests/unit/park-witch-trial.test.mjs), [park-razma](../../tests/unit/park-razma.test.mjs), [battle_lose](../../tests/playtest/battle_lose.mjs), [baron-cannon](../../tests/playtest/baron-cannon.mjs) |
| 오디오·임시 자원: `src/core/audio.js`, 모드 `dispose`, `src/main.js`의 `resetState` | 음악 소유자/컨텍스트와 재생 시계가 전환 계약대로 유지/교체된다. 지연 로딩 완료가 종료된 장면의 곡을 다시 틀지 않는다. 종료·취소·재도전 후 listener/timer/음성/임시 모드가 정리되고 재진입 때 중복 반응이 없다. 실제 재생을 확인하며 프레임 가속 결과를 실시간 오디오 동기 증거로 쓰지 않는다. | [battle-bgm-delay](../../tests/unit/battle-bgm-delay.test.mjs), [pattern-audio](../../tests/unit/pattern-audio.test.mjs), [battle_bgm](../../tests/playtest/battle_bgm.mjs), [voice_race](../../tests/playtest/voice_race.mjs) |
| 배치·충돌·보이는 판정: `src/core/layout.js`, 변경된 맵/모드/렌더러 | 실제 뷰포트와 논리 좌표를 구분해 가장자리·가림·겹침·간격·떠 있음을 본다. 상호작용/피격 변경은 그림과 판정이 같은 기하를 쓰는지, 실제 접근 가능한 끝과 경계 바깥에서 검사한다. 값만 읽는 테스트와 중간 프레임 관찰을 함께 남긴다. | [layout](../../tests/unit/layout.test.mjs), [maps-layout](../../tests/unit/maps-layout.test.mjs), [layout 보조](../../tests/playtest/lib/layout.mjs) |
| 자산 등록·공유 로더: `src/data/characters.js`, `src/data/character-motions.js`, `src/data/battle-sprites.js`, `src/core/gfx.js`, `src/core/audio.js` | 등록 경로의 원본을 실제 디코드하고 PNG CRC·치수·프레임 순서/피벗·투명도를 확인한다. 로드 실패가 폴백으로 가려져도 지정 자산 성공으로 판정하지 않는다. 공통 등록/크롭/로더를 바꾸면 같은 자산을 쓰는 필드·초상화·전투 중 실제 소비자를 추적해 정지/이동/공격의 관련 프레임을 확인한다. 승인된 음성 샘플은 합성 폴백과 구분해 실제 재생을 확인한다. 자산 전달만 요청받았다면 파일/전달 계약 검수에서 끝내고 게임 등록·실행은 통합 담당의 후속 확인으로 명시한다. | [character-runtime-assets](../../tests/unit/character-runtime-assets.test.mjs), [sprite-order](../../tests/unit/sprite-order.test.mjs), [audio-assets](../../tests/unit/audio-assets.test.mjs), [sprites](../../tests/playtest/sprites.mjs) |

조작키는 매 실행에서 `src/core/input.js`와 소비자의 분기를 확인한다. 현재 C는 확인, X는 취소, V/Tab은 메뉴이며 Escape는 title 액션이다. Tab을 비상탈출로 가정하거나 Escape를 모든 하위 메뉴의 뒤로가기라고 가정하지 않는다. ‘탭’이 UI 항목인지 키보드 Tab인지 요청과 실제 화면으로 구분한다.

## 실제 입력과 증거의 경계

QA fixture/직접 상태 주입은 실패 경계에 도달하기 위한 준비다. 준비한 HP·인벤토리·좌표·flag와 사용 목적을 적고, 그 다음 진입/선택/취소/복귀는 실제 키 또는 패드 입력으로 검증한다. `game.state`를 바꾼 결과는 실제 전환 검증이 아니며, 직접 HP를 줄이거나 완료 flag를 세운 실행은 자연 공략/정상 진행 완주가 아니다. 기존 playtest도 주입을 쓰므로 파일명만 보고 완주로 판정하지 않는다.

수동 QA는 `docs/STATE.md`의 브라우저 선호를 따른다. [선택 플레이테스트 러너](../../tests/playtest/run.sh)를 쓸 때는 서버 URL/서빙 경로를 먼저 대조하고 테스트 이름과 새 증거 디렉터리를 지정한다. 러너의 헤드리스 성공과 사람이 화면/소리를 확인한 결과는 별도로 기록한다. 예전 screenshot, 다른 worktree, 수정 전 로그를 현재 결과에 연결하지 않는다.

## 증거 양식

작업 handoff 또는 QA 기록에 아래 내용을 채운다. 결과는 `PASS / FAIL / 미실행 / 제외`로 구분하고, 제외와 미실행을 섞지 않는다.

```text
요청 원문 / 검증할 기대 동작:
소스: cwd, branch, SHA, 미커밋 diff 범위(재현 가능한 patch 또는 식별값)
실행: 시각, 서버 URL/서빙 경로, BUILD, 브라우저/뷰포트
영향 연결: 변경 기능 → 진입 → 복귀 → 공유 소비자
검사 선택: 위 표 각 행의 적용/제외와 코드상 이유
시나리오: 사전 상태·fixture/주입 내역 → 실제 입력 순서 → 독립된 기대 결과
관찰: 전후 돈/수량/HP/커서/턴/flags 등 해당 값 + 화면/재생 관찰
자동검사: 실행 명령, 종료 코드, 결과 로그 경로(전체 check 포함)
수동 증거: 새 screenshot/영상/로그 원본 경로, 관찰 시점, 소리 확인 방식
판정: 요구별 PASS/FAIL/미실행/제외, 관련 테스트 경로, 남은 실패와 이유
전달 상태: 로컬/메인/원격/배포 각각 실제 확인한 범위
```

문서만 변경한 경우에는 위 실행 양식을 게임 QA처럼 채우지 않는다. 읽기 전용 평가자에게 실제 메뉴 회귀 요청이나 공통 입력 변경 사례를 주어 검사 선택·제외 사유·증거 계획을 받는다. 작성자의 기대 답안을 주지 않고 링크/현재 소유 경로와 대조한다. 이는 지침의 판단 검증이며 게임 실행 결과가 아니다.
