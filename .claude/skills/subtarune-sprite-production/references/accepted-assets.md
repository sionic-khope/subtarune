# 승인 결과에서 기준 패킷 찾기

이 표는 실제 파일을 찾는 색인이다. 변경된 게임에서는 현재 레지스트리와 source 계약을 먼저 대조한다. 경로는 저장소 루트 기준이며 과거 raw/standard 산출물을 최종 runtime으로 오해하지 않는다.

| 작업 | 실제 비교 파일 | 함께 읽을 근거 |
|---|---|---|
| 형섭 이동·입 없는 얼굴 | `assets/sprites/hyungsub.png` | `src/data/characters.js`의 sideWalk, `src/world/character-motion.js`; 현재 옆걷기 로더까지 추적 |
| 경섭/빠맨 이동 | `assets/sprites/gyeongsub.png`, `assets/sprites/ppaman.png` | 같은 캐릭터 레지스트리; 형섭의 입 규칙을 전파하지 않음 |
| 파크 공격의 헐렁임 변형 | `assets/source/park157/attack-tiers/idle-attack-comparison-2x.png` | 같은 폴더 README/prompts, 각 tier/runtime-contract.json; runtime은 `assets/enemies/park-guardian-attack-{loose,slipping,adjust}.png` |
| 파크 기본 춤/공격/본체 | `assets/enemies/park-guardian-dance.png`, `assets/enemies/park-guardian-attack.png`, `assets/enemies/park-guardian-idle.png` | `assets/source/park155/`, `src/data/enemies.js`의 action/form; 본체와 인형탈은 별개 NPC가 아니라 상태 |
| 청소 도구 | `assets/source/park157/cleaning/preview.png` | 같은 폴더 README/process, `src/data/park-cleaning.js`의 실제 source 크기와 그림 내부 contact polygon |
| 만카츠키 규모/개성 | `assets/source/captain125/mankatsuki_idle/sheet-transparent.png` | 같은 폴더 README/scale-profile.json, 최신 `src/data/enemies.js`; 초기 피부색보다 후속129의 적용 상태를 우선 |
| 고정 TV 배경 + 표정 | `assets/source/youngcle142/fixed-background-preview.png` | 같은 폴더 export.py/qc-meta.json; `assets/illustrations/youngcle-tv-*.png`와 후속 표정 파일 |
| 관중·건축 분리 | `assets/props/editor-union-crowd.png`, `assets/props/editor_union_audience.png` | `assets/source/stage153/visuals/crowd-v2/README.md`의 최종 파일/셀 계약, `docs/postmortems/2026-09-14-stage-continuity.md`; 관중만 움직이고 난간/벽은 고정 |

표 전체를 매번 프롬프트에 넣지 않는다. 해당 캐릭터의 승인 프레임, 해당 장면의 실제 크기, 필요한 상태 비교만 첨부한다. 코드에 등록된 모델/파일 이름이 그 그림을 직접 확인한 증거는 아니다.

스튜디오에 사용자 원본/최신 설정이 따로 있다면 해당 README와 참조를 찾아 요청 패킷에 포함한다. 별도 저장소의 절대 경로가 없는 환경에서는 게임에 포함된 source와 승인 runtime을 기준으로 시작하고, 빠진 사용자 원본이 결과에 중요한 경우 그 자료를 요청한다. 과거 README의 ‘미머지/준비 중’을 최신 게임 상태로 복사하지 않는다.
