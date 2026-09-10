// ─────────────────────────────────────────────────────────────
// 청록숲6 정글 이벤트 2 (사용자 2026-09-11 "롤과 연관된 상호작용 이벤트 두 개, 반복 개그 말고 색다른 연출")
//   1) 와드: 길가에 박힌 토템 와드. 억빠맨이 박으면 눈이 뜨이고 "시야가 확보되었다!" → 카메라가 캠프 세 곳(칼날부리·늑대·두꺼비)을 차례로 훑고 돌아온다 → 경섭 "저게 다 뭐냐" / "잡으면 돈 줘요" / 경섭 눈 반짝.
//   2) 파란 돌(블루 버프): 늑대 캠프 구석. 억빠맨 "블루 버프" 설명 → 경섭 "마나가 뭔데" → 경섭이 핥는다 → "달다" → 파란 기운 → HP 전원 회복. 다시 하면 짧게 회복만(쉼터).
// ─────────────────────────────────────────────────────────────
import { CHARACTERS } from '../characters.js';
const G = (text, extra = {}) => ({ speaker: '경섭', portrait: 'gyeongsub', voice: 'gyeongsub', text, ...extra });
const P = (text, extra = {}) => ({ speaker: '억빠맨', portrait: 'ppaman', voice: 'ppaman', text, ...extra });
const N = (text) => ({ text, voice: 'narrator' });
const healAll = (g) => { for (const id of ['hyungsub', ...g.party]) g.partyHp[id] = CHARACTERS[id]?.hp ?? 100; g.autosave?.(); };

export const teal6_ward = [
  { if: (f) => f.teal6_ward_done, goto: 'again' },
  { face: 'ppaman', dir: 'toward:ward' }, { face: 'gyeongsub', dir: 'toward:ward' },
  P('* 어{w=0.3} 이거 와드네요.'),
  G('* 와드가 뭔데'),
  P('* 박으면 시야가 보여요.{w=0.4} 잠깐만요'),
  { move: 'ppaman', rel: 'ward', at: 'bottom', by: [0, 6] }, { face: 'ppaman', dir: 'up' }, { wait: 0.2 },
  { sfx: 'knock' }, { shake: 0.2, amp: 2 }, { hop: 'ppaman', by: [0, 0], height: 8, duration: 0.25, sfx: false }, { wait: 0.35 },
  { sfx: 'chime' },
  N('* {c=yellow}시야가 확보되었다!{/c}'),
  // 정찰: 카메라가 캠프 세 곳을 훑는다 (몹이 보인다)
  { camera: [6, 10], duration: 0.6 }, { wait: 0.7 },
  { camera: [13, 12], duration: 0.5 }, { wait: 0.7 },
  { camera: [33, 21], duration: 0.8 }, { wait: 0.8 },
  { camera: 'player', duration: 0.7 },
  G('* ...{w=0.4} 저게 다 뭐냐'),
  P('* 정글 몹이요.{w=0.3} 잡으면 돈 줘요'),
  { emote: 'gyeongsub', kind: '!', duration: 1.2, hold: 0.5, sfx: 'chime' },
  G('* 돈?'),
  P('* 형{w=0.3} 눈이 왜 그래요'),
  { set: { teal6_ward_done: true } },
  { end: true },
  { label: 'again' },
  N('* 와드가 눈을 깜빡인다.{w=0.4} 시야는 이미 확보돼 있다.'),
];

export const teal6_blue = [
  { if: (f) => f.teal6_blue_done, goto: 'again' },
  { face: 'ppaman', dir: 'toward:blue' }, { face: 'gyeongsub', dir: 'toward:blue' },
  P('* 오{w=0.3} 블루 버프다'),
  G('* 그게 뭔데'),
  P('* 마나 회복이요'),
  G('* 마나가 뭔데'),
  P('* ...'),
  { move: 'gyeongsub', rel: 'blue', at: 'bottom', by: [0, 6] }, { face: 'gyeongsub', dir: 'up' }, { wait: 0.4 },
  { hop: 'gyeongsub', by: [0, 0], height: 10, duration: 0.3, sfx: false },
  N('* 경섭이 파란 돌을 핥았다.'),
  P('* 형!!{w=0.3} 그거 먹는 거 아니에요'),
  G('* ...{w=0.6} 달다.'),
  { label: 'heal' },
  { sfx: 'heal' }, { shake: 0.25, amp: 2 }, { action: healAll },
  N('* {c=yellow}파란 기운이 온몸에 퍼졌다!{/c}{n}* HP가 모두 회복되었다!'),
  { set: { teal6_blue_done: true } },
  { end: true },
  { label: 'again' },
  N('* 파란 돌이 아직 빛나고 있다.'),
  { goto: 'heal' },
];
