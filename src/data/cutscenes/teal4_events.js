// ─────────────────────────────────────────────────────────────
// 청록숲 4(teal_east) 이벤트 3종 — 사용자 2026-09-10 "바나나·버튼·꽃 등을 새로운 초식으로 세 개, 음지스러운 것도". 대사·연출은 내가 씀.
//   1) 바나나 껍질(길 위, 밟으면): 형섭이 미끄러져 한 칸 튕겨 넘어짐 → 빠맨 "형!!" / 경섭 "허허 바나나 껍질은 조심해야지" → "..." → 나레이션. 이후엔 밟아도 "이번엔 피했다."
//   2) 수상한 버튼 2("좋은 일이 생기는 버튼"): 누르면 아무 일 없음 → 한 번 더 → 하늘에서 바나나가 떨어져 빠맨 머리에 콩 → 바나나 획득(힐템). 그 뒤엔 "더 이상 아무 일도 없다".
//   3) 검은 꽃(음지, 나무 그늘): "향기가 없다" → 꽃이 떨리는 글씨로 "...나가..." (정체불명 목소리) → 빠맨 "형 지금 꽃이 말했어요?" / 경섭 "허허 꽃이 무슨" → "* ... 확실히 말했다."
// ─────────────────────────────────────────────────────────────
const N = (text, extra = {}) => ({ text, voice: 'narrator', ...extra });
const P = (text, extra = {}) => ({ speaker: '억빠맨', portrait: 'ppaman', voice: 'ppaman', text, ...extra });
const G = (text, extra = {}) => ({ speaker: '경섭', portrait: 'gyeongsub', voice: 'gyeongsub', text, ...extra });
const withParty = (f) => f.void11_done;

export const teal4_peel = [
  { if: (f) => f.peel_slipped, goto: 'again' },
  { sfx: 'whoosh' },
  { hop: 'player', by: [44, 6], height: 22, duration: 0.35, sfx: false },      // 쭉 미끄러져
  { shake: 0.3, amp: 3 }, { sfx: 'thud' },
  { emote: 'player', kind: '!', duration: 1.0, hold: 0.5 },
  N('* 미끄러졌다.'),
  { if: (f) => !withParty(f), goto: 'set' },
  P('* 형!!'),
  G('* 허허{w=0.3} 바나나 껍질은 조심해야지'),
  N('* ...{w=0.5} 누가 여기다 버렸을까.'),
  { label: 'set' },
  { set: { peel_slipped: true } },
  { regroup: true },
  { end: true },
  { label: 'again' },
  N('* 이번엔 피했다.'),
];

export const teal4_button = [
  { if: (f) => f.button2_done, goto: 'done' },
  N('* 버튼이다.{w=0.4} "누르면 좋은 일이 생깁니다" 라고 적혀 있다.'),
  { if: (f) => f.button2_once, goto: 'second' },
  { sfx: 'click' }, { wait: 0.5 },
  N('* ...{w=0.6} 아무 일도 일어나지 않았다.'),
  { if: (f) => !withParty(f), goto: 'once' },
  P('* 뻥이네요'),
  { label: 'once' },
  { set: { button2_once: true } },
  { end: true },
  { label: 'second' },
  { sfx: 'click' }, { wait: 0.4 },
  { if: (f) => !withParty(f), goto: 'drop_alone' },
  { spawn: { type: 'rockfall', id: 'banana_drop', image: 'assets/props/banana.png', x: 460, ground: 300, period: 100, offset: 0, warn: 0.6, fall: 0.35, rest: 1.2, damage: 0 } },
  { wait: 0.95 }, { emote: 'ppaman', kind: '!', duration: 0.8, hold: 0.3 },
  P('* 아야'),
  { wait: 0.5 }, { remove: 'banana_drop' }, { sfx: 'item' },
  { action: (g) => { g.inventory.push('바나나'); } },
  N('* {c=yellow}바나나{/c}를 얻었다.'),
  P('* ...{w=0.4} 좋은 일 맞네요'),
  { set: { button2_done: true } },
  { end: true },
  { label: 'drop_alone' },
  { sfx: 'item' }, { action: (g) => { g.inventory.push('바나나'); } },
  N('* 하늘에서 {c=yellow}바나나{/c}가 떨어졌다.{w=0.3} 얻었다.'),
  { set: { button2_done: true } },
  { end: true },
  { label: 'done' },
  N('* 버튼이다.{w=0.4} 더 이상 아무 일도 없다.'),
];

export const teal4_flower = [
  N('* 검은 꽃이다.{w=0.5} 향기가 없다.'),
  { if: (f) => f.flower_spoke, goto: 'again' },
  { wait: 0.6 },
  { text: '* {shake}...나가...{/shake}', voice: 'mystery' },
  { if: (f) => !withParty(f), goto: 'alone' },
  { emote: 'ppaman', kind: '!', duration: 1.0, hold: 0.4 },
  P('* 형{w=0.3} 지금 꽃이 말했어요?'),
  G('* 허허{w=0.4} 꽃이 무슨'),
  N('* ...{w=0.6} 확실히 말했다.'),
  { set: { flower_spoke: true } },
  { end: true },
  { label: 'alone' },
  N('* ...{w=0.6} 확실히 말했다.'),
  { set: { flower_spoke: true } },
  { end: true },
  { label: 'again' },
  { wait: 0.4 },
  { text: '* {shake}...{/shake}', voice: 'mystery' },
];
