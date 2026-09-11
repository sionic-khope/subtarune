// ─────────────────────────────────────────────────────────────
// 청록숲8 정글 2 이벤트 (사용자 2026-09-11 "와드랑 마나샘 재사용, 대사는 바꿔야겠지"). 소품·기믹은 청록숲6 그대로, 연출 장치는 역할 바꾸기.
//   1) 와드: 이번엔 **경섭이 직접 박는다**("정글은 아닌데 시야는 필요하잖아") → 시야 확보 → 카메라가 캠프 셋(돌거북·바위게·대포미니언)을 훑음 → "대포미니언이 왜 정글에 있어요" / "길 잃었나 보지". 골드 대화 없음.
//   2) 마나샘: 이번엔 **억빠맨이 먼저** 마신다(청록숲6에서 말리던 애가) → 경섭 "마시는 거 아니라며" → "형이 먼저 마셨잖아요" → 경섭·요플래도 → 전원 HP 회복 → 빠맨 "우리가 다 마셔서 미안". 다시 하면 "졸졸 흐른다" + 회복만(쉼터).
// ─────────────────────────────────────────────────────────────
import { CHARACTERS } from '../characters.js';
const G = (text, extra = {}) => ({ speaker: '경섭', portrait: 'gyeongsub', voice: 'gyeongsub', text, ...extra });
const P = (text, extra = {}) => ({ speaker: '억빠맨', portrait: 'ppaman', voice: 'ppaman', text, ...extra });
const N = (text) => ({ text, voice: 'narrator' });
const healAll = (g) => { for (const id of ['hyungsub', ...g.party]) g.partyHp[id] = CHARACTERS[id]?.hp ?? 100; g.autosave?.(); };

export const teal8_ward = [
  { if: (f) => f.teal8_ward_done, goto: 'again' },
  { face: 'ppaman', dir: 'toward:ward' }, { face: 'gyeongsub', dir: 'toward:ward' },
  P('* 형{w=0.3} 여기도 와드 있어요'),
  G('* 이번엔 내가 박는다'),
  P('* 형 정글 아니라니까요'),
  G('* 정글은 아닌데{w=0.3} 시야는 필요하잖아'),
  P('* ...맞는 말이긴 한데'),
  { move: 'gyeongsub', rel: 'ward', at: 'bottom', by: [0, 6] }, { face: 'gyeongsub', dir: 'up' }, { wait: 0.2 },
  { sfx: 'knock' }, { shake: 0.2, amp: 2 }, { hop: 'gyeongsub', by: [0, 0], height: 8, duration: 0.25, sfx: false }, { wait: 0.35 },
  { sfx: 'chime' },
  N('* {c=yellow}시야가 확보되었다!{/c}'),
  // 정찰: 카메라가 캠프 세 곳을 훑는다 (tools/maps/teal8.py CAMPS)
  { camera: [6, 18], duration: 0.6 }, { wait: 0.7 },
  { camera: [33, 10], duration: 0.6 }, { wait: 0.7 },
  { camera: [53, 3], duration: 0.8 }, { wait: 0.8 },
  { camera: 'player', duration: 0.7 },
  G('* 돌거북{w=0.2} 바위게{w=0.2} 대포미니언?'),
  P('* 대포미니언이 왜 정글에 있어요'),
  G('* 길 잃었나 보지.{w=0.4} 조심해라{w=0.2} 저건 아프다'),
  { set: { teal8_ward_done: true } },
  { end: true },
  { label: 'again' },
  N('* 와드가 눈을 깜빡인다.{w=0.4} 여긴 이미 다 보인다.'),
];

export const teal8_blue = [
  { if: (f) => f.teal8_blue_done, goto: 'again' },
  { face: 'gyeongsub', dir: 'toward:blue' }, { face: 'ppaman', dir: 'toward:blue' },
  G('* 오{w=0.3} 마나샘 또 있네'),
  P('* 형{w=0.3} 이번엔 저 먼저요'),
  { move: 'ppaman', rel: 'blue', at: 'bottom', by: [0, 6], run: true }, { face: 'ppaman', dir: 'up' }, { wait: 0.3 },
  { hop: 'ppaman', by: [0, 0], height: 10, duration: 0.3, sfx: false },
  N('* 억빠맨이 마나샘 물을 벌컥벌컥 마셨다.'),
  P('* ...{w=0.6} 시원하다'),
  G('* 야{w=0.3} 그거 마시는 거 아니라며'),
  P('* 형이 먼저 마셨잖아요'),
  G('* 그건 그렇지'),
  { move: 'gyeongsub', rel: 'blue', at: 'bottom', by: [-30, 8] }, { face: 'gyeongsub', dir: 'up' }, { wait: 0.2 },
  { hop: 'gyeongsub', by: [0, 0], height: 10, duration: 0.3, sfx: false },
  N('* 경섭도 옆에서 한 모금 마셨다.'),
  { move: 'player', rel: 'blue', at: 'bottom', by: [30, 8] }, { face: 'player', dir: 'up' }, { wait: 0.2 },
  { hop: 'player', by: [0, 0], height: 10, duration: 0.3, sfx: false }, { wait: 0.25 }, { hop: 'player', by: [0, 0], height: 10, duration: 0.3, sfx: false },
  N('* 요플래는 말없이 두 모금 마셨다.'),
  { label: 'heal' },
  { sfx: 'heal' }, { shake: 0.25, amp: 2 }, { action: healAll },
  N('* {c=yellow}파란 기운이 온몸에 퍼졌다!{/c}{n}* HP가 모두 회복되었다!'),
  { if: (f) => f.teal8_blue_done, goto: 'end' },
  P('* 마나샘아{w=0.3} 우리가 다 마셔서 미안'),
  { set: { teal8_blue_done: true } },
  { label: 'end' },
  { end: true },
  { label: 'again' },
  N('* 마나샘이 졸졸 흐른다.'),
  { goto: 'heal' },
];
