// ─────────────────────────────────────────────────────────────
// 청록숲6 정글 이벤트 2 (사용자 2026-09-11 "롤과 연관된 상호작용 이벤트 두 개, 반복 개그 말고 색다른 연출")
//   경섭은 롤을 아는 사람(사용자 2026-09-11: "정글몹 모르는 애는 아님 — 티키타카") → 둘이 주고받는 잔소리 톤.
//   1) 와드: 길가에 박힌 토템 와드. "오 그렇네 정글와드 지렸구" / "형 정글 아니잖아요" / "박기나 해" → 박으면 "시야가 확보되었다!" → 카메라가 캠프 세 곳을 훑음 → "칼날부리 늑대 두꺼비. 풀캠이네" (골드 대화 없음 — 사용자).
//   2) 마나샘(PR #11 생명의 마나샘, 소품 id 는 blue 유지): 늑대 캠프 구석. 경섭 "오 이게 뭐지" → 벌컥벌컥 마심 → 빠맨 "마시는 거 아니에요" → "시원하다" → 요플래도 한 모금 → "아니 왜 다들" → 파란 기운 HP 전원 회복 → 빠맨 "저도 한 모금만" (유머 = 다들 마셔 버림, 사용자 2026-09-11). 다시 하면 "졸졸 흐른다" + 회복만(쉼터).
// ─────────────────────────────────────────────────────────────
import { CHARACTERS } from '../characters.js';
const G = (text, extra = {}) => ({ speaker: '경섭', portrait: 'gyeongsub', voice: 'gyeongsub', text, ...extra });
const P = (text, extra = {}) => ({ speaker: '억빠맨', portrait: 'ppaman', voice: 'ppaman', text, ...extra });
const N = (text) => ({ text, voice: 'narrator' });
const healAll = (g) => { for (const id of ['hyungsub', ...g.party]) g.partyHp[id] = g.maxHpOf ? g.maxHpOf(id) : (CHARACTERS[id]?.hp ?? 100); g.autosave?.(); };

export const teal6_ward = [
  { if: (f) => f.teal6_ward_done, goto: 'again' },
  { face: 'ppaman', dir: 'toward:ward' }, { face: 'gyeongsub', dir: 'toward:ward' },
  P('* 어{w=0.3} 이거 와드네요.'),
  G('* 오 그렇네{w=0.3} 정글와드 지렸구'),
  P('* 형 정글 아니잖아요'),
  G('* 야 박기나 해'),
  P('* 넵'),
  { move: 'ppaman', rel: 'ward', at: 'bottom', by: [0, 6] }, { face: 'ppaman', dir: 'up' }, { wait: 0.2 },
  { sfx: 'knock' }, { shake: 0.2, amp: 2 }, { hop: 'ppaman', by: [0, 0], height: 8, duration: 0.25, sfx: false }, { wait: 0.35 },
  { sfx: 'chime' },
  N('* {c=yellow}시야가 확보되었다!{/c}'),
  // 정찰: 카메라가 캠프 세 곳을 훑는다 (몹이 보인다)
  { camera: [6, 10], duration: 0.6 }, { wait: 0.7 },
  { camera: [13, 12], duration: 0.5 }, { wait: 0.7 },
  { camera: [33, 21], duration: 0.8 }, { wait: 0.8 },
  { camera: 'player', duration: 0.7 },
  G('* 칼날부리{w=0.2} 늑대{w=0.2} 두꺼비.{w=0.4} 풀캠이네'),
  { set: { teal6_ward_done: true } },
  { end: true },
  { label: 'again' },
  N('* 와드가 눈을 깜빡인다.{w=0.4} 시야는 이미 확보돼 있다.'),
];

export const teal6_blue = [
  { if: (f) => f.teal6_blue_done, goto: 'again' },
  { face: 'gyeongsub', dir: 'toward:blue' }, { face: 'ppaman', dir: 'toward:blue' },
  G('* 오{w=0.3} 이게 뭐지'),
  { move: 'gyeongsub', rel: 'blue', at: 'bottom', by: [0, 6] }, { face: 'gyeongsub', dir: 'up' }, { wait: 0.3 },
  { hop: 'gyeongsub', by: [0, 0], height: 10, duration: 0.3, sfx: false },
  N('* 경섭이 마나샘 물을 벌컥벌컥 마셨다.'),
  P('* 형!!{w=0.3} 그거 마시는 거 아니에요'),
  G('* ...{w=0.6} 시원하다'),
  P('* ...'),
  { move: 'player', rel: 'blue', at: 'bottom', by: [-30, 8] }, { face: 'player', dir: 'up' }, { wait: 0.2 },
  { hop: 'player', by: [0, 0], height: 10, duration: 0.3, sfx: false },
  N('* 요플래도 슬쩍 한 모금 마셨다.'),
  P('* 아니{w=0.3} 왜 다들'),
  { label: 'heal' },
  { sfx: 'heal' }, { shake: 0.25, amp: 2 }, { action: healAll },
  N('* {c=yellow}파란 기운이 온몸에 퍼졌다!{/c}{n}* HP가 모두 회복되었다!'),
  { if: (f) => f.teal6_blue_done, goto: 'end' },
  { move: 'ppaman', rel: 'blue', at: 'bottom', by: [30, 8] }, { face: 'ppaman', dir: 'up' }, { wait: 0.2 },
  { hop: 'ppaman', by: [0, 0], height: 10, duration: 0.3, sfx: false },
  P('* ...{w=0.4} 저도 한 모금만'),
  { set: { teal6_blue_done: true } },
  { label: 'end' },
  { end: true },
  { label: 'again' },
  N('* 마나샘이 졸졸 흐른다.'),
  { goto: 'heal' },
];
