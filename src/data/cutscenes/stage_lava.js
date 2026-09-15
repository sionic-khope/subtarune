// 용암 뗏목 방(youngcle14) 뗏목 앞 컷신 — 2026-09-15 사용자 브리핑 원문(대사·지시문 그대로). 콘티: design/narrative/cutscenes/stage_lava.md
// 흐름: 입구에서 3초쯤 걸어 뗏목 앞 트리거 → 형섭이 먼저 뗏목에 탐 → 억빠맨·경섭 대사(요플래가 잠깐 뒤돌아봄) → 경섭 … 말풍선 → 억빠맨이 용암에 들어감(검은 연기 치이익)
//       → 경섭 … 말풍선 → 대사 → 경섭도 들어감 → 대사 → 2단 점프 켜고 출발.
const RAFT = 'raft14a';
const P = text => ({ speaker: '억빠맨', portrait: 'ppaman', voice: 'ppaman', text: '* ' + text });
const G = text => ({ speaker: '경섭', portrait: 'gyeongsub', voice: 'gyeongsub', text: '* ' + text });
const close = { action: game => game.textbox.close() };
// 용암에 들어갈 때: 치이익 + 얼굴 근처 검은 연기
const sizzle = id => [{ sfx: 'sizzle', volume: 0.8 }, { async: [{ puff: id, offset: [0, -4], duration: 1.0, color: '#2a2226', size: 10 }] }, { wait: 0.7 }];

export const lava_raft_intro = [
  // (형섭이 뗏목에 먼저 탐): 뗏목 왼쪽까지 걸어가 올라탄다(출발은 안 함)
  { move: 'player', rel: RAFT, at: 'left', by: [-2, 6], run: true },
  { action: game => { const r = game.entities.find(e => e.id === RAFT && !e.dead); if (r && !r.riding) r.board(game.player); } },
  { face: 'gyeongsub', dir: 'toward:player' },
  { face: 'ppaman', dir: 'toward:player' },
  P('...'),
  G('...'),
  close,
  // (요플래가 잠깐 뒤돌아봄)
  { face: 'player', dir: 'left' },
  { wait: 0.9 },
  { face: 'player', dir: 'right' },
  P('경섭이형 이거 저희 들어가야겠죠'),
  G('너가 먼저 들어가'),
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
  { raft: RAFT, swim: 'ppaman' },
  ...sizzle('ppaman_swim'),
  // 김경섭 ... 말풍선 한 번 더
  { bubble: 'gyeongsub' },
  P('생각보다 괜찮아요 경섭이형'),
  G('그래?'),
  close,
  // (경섭이 들어감)
  { raft: RAFT, swim: 'gyeongsub' },
  ...sizzle('gyeongsub_swim'),
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
