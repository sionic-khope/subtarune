// 용암 수로(youngcle14) 뗏목 탑승 컷신 — 2026-09-15 사용자 브리핑 원문(대사·지시문 그대로) + 2026-09-16 정정(C 로 타면 시작, 걸어서 올라탐·동료도 걸어가 뛰어듦, 왼쪽 시선 유지). 콘티: design/narrative/cutscenes/stage_lava.md
// 흐름: 뗏목 옆에서 C(walkOn) → 형섭이 걸어서 뗏목에 올라탐 → 억빠맨·경섭 대사 → 요플래가 뒤(왼쪽)를 돌아본 채 ‘경섭이형 이거 저희 들어가야겠죠’ ~ ‘너가 먼저 들어가’ → 다시 앞
//       → 경섭 … 말풍선 → 억빠맨이 용암 가장자리까지 걸어가 뛰어듦(치이익·검은 연기) → 경섭 … 말풍선 → 대사 → 경섭도 걸어가 뛰어듦 → 대사 → 2단 점프 켜고 출발.
const RAFT = 'raft14a';
const P = text => ({ speaker: '억빠맨', portrait: 'ppaman', voice: 'ppaman', text: '* ' + text });
const G = text => ({ speaker: '경섭', portrait: 'gyeongsub', voice: 'gyeongsub', text: '* ' + text });
const close = { action: game => game.textbox.close() };
const raftOf = game => game.entities.find(e => e.id === RAFT && !e.dead);
// 뗏목 위 승객 자리(Raft._carry 와 같은 계산) — 여기까지 걸어간 뒤 태운다. exact: 용암 위라 빈 칸 보정을 끄고 그대로 걷는다(안 그러면 부두 끝까지만 걷고 순간이동)
const seatPx = game => { const r = raftOf(game), p = game.player; return [r.x + r.w / 2 - p.w / 2, r.y + r.h * 0.68 - p.h]; };
// 부두 가장자리(뗏목 왼쪽 아래): 동료가 여기까지 걸어와 용암으로 뛰어든다. slot 0 = 빠맨, 1 = 경섭(뗏목 아래 나란히)
const edgePx = slot => game => { const r = raftOf(game); return [r.x - 30 - slot * 4, r.y + r.h - 6]; };
// 용암에 들어가기: 가장자리까지 걷고 → 짧게 뛰어들며 치이익 + 얼굴 근처 검은 연기 → 헤엄(뗏목 아래 자리)
const enterLava = (id, slot) => [
  { move: id, px: edgePx(slot) },
  { face: id, dir: 'right' },
  { wait: 0.3 },
  { hop: id, by: [16 + slot * 15, 8], sfx: 'sizzle', keep: true },
  { raft: RAFT, swim: id },
  { async: [{ puff: `${id}_swim`, offset: [0, -6], duration: 1.0, color: '#2a2226', size: 10 }] },
  { wait: 0.8 },
];


export const lava_raft_intro = [
  // (형섭이 뗏목에 먼저 탐): 걸어서 올라탄다 — 순간이동 금지(사용자)
  { move: 'player', px: seatPx, exact: true },
  { raft: RAFT, board: true },
  { face: 'gyeongsub', dir: 'toward:player' },
  { face: 'ppaman', dir: 'toward:player' },
  P('...'),
  G('...'),
  close,
  // (요플래가 뒤돌아봄) — ‘너가 먼저 들어가’까지 계속 왼쪽을 본다(사용자)
  { face: 'player', dir: 'left' },
  { wait: 0.6 },
  P('경섭이형 이거 저희 들어가야겠죠'),
  G('너가 먼저 들어가'),
  close,
  { face: 'player', dir: 'right' },
  P('싫어요'),
  G('너가 먼저 들어가라니까'),
  P('싫어요'),
  close,
  // (경섭 ... 말풍선)
  { bubble: 'gyeongsub' },
  P('네'),
  G('그래 고맙다.'),
  close,
  // (억빠맨이 들어감 + 검은 연기 치이익)
  ...enterLava('ppaman', 0),
  // 김경섭 ... 말풍선 한 번 더
  { bubble: 'gyeongsub' },
  P('생각보다 괜찮아요 경섭이형'),
  G('그래?'),
  close,
  // (경섭이 들어감)
  ...enterLava('gyeongsub', 1),
  G('...'),
  P('어떠세요?'),
  G('좆같은데씨발아존나뜨겁다'),
  P('ㅋㅋㅋㅋ'),
  close,
  // 출발 — 이단점프 되게(사용자)
  { set: { double_jump: true } },
  { raft: RAFT, go: true },
  { end: true },
];
