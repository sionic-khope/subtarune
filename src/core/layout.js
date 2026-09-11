// ─────────────────────────────────────────────────────────────
// 레이아웃 예산 (2026-09-11 레이아웃 포스트모텀 docs/postmortems/2026-09-11-layout-issues.md)
//   "보이는 영역" 을 숫자로 한곳에: 맵·컷신·전투에서 크기·자리를 정할 때 이 값을 기준으로 계산하고, 감사 테스트가 같은 값으로 잰다.
//   코드의 리터럴(대화창 y, 전투 패널 y, 프로브 거리)과 어긋나면 tests/unit/layout.test.mjs 가 잡는다.
// ─────────────────────────────────────────────────────────────
export const SCREEN_W = 480, SCREEN_H = 360;
export const TILE = 32;
/** 대화창 상자 윗변(y). 이름표는 그 위 18px 에 뜬다 */
export const TEXTBOX_TOP = SCREEN_H - 112;
/** 대화 중 실제로 보이는 높이 — 이름표까지 뺀 값. 컷신에서 캐릭터 전신은 이 안에 들어와야 한다 */
export const DIALOGUE_VISIBLE_H = TEXTBOX_TOP - 18;
/** 전투 행동 패널 윗변(y). 적 그림은 이 위에 다 들어와야 한다(HP 띠는 322~) */
export const BATTLE_PANEL_TOP = 246;
/** C 프로브 거리(px): 서 있는 칸에서 이만큼 앞의 히트박스까지 닿는다 */
export const PROBE_RANGE = TILE * 0.6;
/** 캐릭터 히트박스(발 밑) */
export const CHAR_BOX = { w: TILE * 0.75, h: TILE * 0.5 };
/** 대화 중 서 있는 캐릭터끼리의 최소 가로 간격(px) — 32 는 "너무 붙어 있다"(2026-09-11) */
export const TALK_GAP = 64;
/** 세로 정렬 간격 — 3명이면 마지막 히트박스가 길 마지막 줄 안에 들어와야 freeSpot 이 밀지 않는다 */
export const COLUMN_GAP = 36;
