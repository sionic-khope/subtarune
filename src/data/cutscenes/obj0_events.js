// ─────────────────────────────────────────────────────────────
// 옵젝영역0 이벤트 (사용자 2026-09-11 "오브제숲0에 마나샘(회복) 추가"). 소품·회복 기믹은 청록숲6/8 의 마나샘 그대로, 연출 장치는 새로:
//   이 맵은 바닥이 얕은 물이라 억빠맨이 "이거랑 저거랑 뭐가 달라요" 하며 **발밑 물을 먼저 떠 마신다**(첨벙 → "퉤 흙맛") → 그제야 마나샘을 마심 → 전원 HP 회복.
//   다시 하면 "졸졸 흐른다" + 회복만(쉼터). 대사는 내가 씀(사용자 브리핑 없음).
// ─────────────────────────────────────────────────────────────
import { CHARACTERS } from '../characters.js';
const G = (text, extra = {}) => ({ speaker: '경섭', portrait: 'gyeongsub', voice: 'gyeongsub', text, ...extra });
const P = (text, extra = {}) => ({ speaker: '억빠맨', portrait: 'ppaman', voice: 'ppaman', text, ...extra });
const N = (text) => ({ text, voice: 'narrator' });
const healAll = (g) => { for (const id of ['hyungsub', ...g.party]) g.partyHp[id] = g.maxHpOf ? g.maxHpOf(id) : (CHARACTERS[id]?.hp ?? 100); g.autosave?.(); };

export const obj0_blue = [
  { if: (f) => f.obj0_blue_done, goto: 'again' },
  { face: 'gyeongsub', dir: 'toward:blue' }, { face: 'ppaman', dir: 'toward:blue' },
  G('* 마나샘이다{w=0.3} 여기도 있네'),
  P('* 형{w=0.3} 근데 우리 지금 물 위에 서 있잖아요'),
  P('* 이거랑 저거랑 뭐가 달라요'),
  G('* 저건 파란색이잖아'),
  P('* 아{w=0.3} 그렇네'),
  { face: 'ppaman', dir: 'down' }, { wait: 0.2 },
  { hop: 'ppaman', by: [0, 0], height: 6, duration: 0.25, sfx: false }, { sfx: 'splash' },
  N('* 억빠맨이 발밑의 물을 한 모금 떠 마셨다.'),
  P('* ...{w=0.6} 퉤{w=0.3} 흙맛'),
  G('* 그걸 왜 마셔'),
  P('* 비교해 보려고요'),
  { move: 'ppaman', rel: 'blue', at: 'bottom', by: [0, 6], run: true }, { face: 'ppaman', dir: 'up' }, { wait: 0.3 },
  { hop: 'ppaman', by: [0, 0], height: 10, duration: 0.3, sfx: false },
  N('* 억빠맨이 이번엔 마나샘 물을 마셨다.'),
  P('* 어{w=0.3} 이건 시원하네'),
  { move: 'gyeongsub', rel: 'blue', at: 'bottom', by: [-30, 8] }, { face: 'gyeongsub', dir: 'up' },
  { move: 'player', rel: 'blue', at: 'bottom', by: [30, 8] }, { face: 'player', dir: 'up' }, { wait: 0.2 },
  { parallel: [{ hop: 'gyeongsub', by: [0, 0], height: 10, duration: 0.3, sfx: false }, { hop: 'player', by: [0, 0], height: 10, duration: 0.3, sfx: false }] },
  N('* 경섭과 요플래도 한 모금씩 마셨다.'),
  { label: 'heal' },
  { sfx: 'heal' }, { shake: 0.25, amp: 2 }, { action: healAll },
  N('* {c=yellow}파란 기운이 온몸에 퍼졌다!{/c}{n}* HP가 모두 회복되었다!'),
  { if: (f) => f.obj0_blue_done, goto: 'end' },
  P('* 형{w=0.3} 발밑 물은 마시지 마세요'),
  G('* 너만 마셨어'),
  { set: { obj0_blue_done: true } },
  { label: 'end' },
  { end: true },
  { label: 'again' },
  N('* 마나샘이 졸졸 흐른다.{w=0.3} 발밑 물과는 다른 소리다.'),
  { goto: 'heal' },
];
