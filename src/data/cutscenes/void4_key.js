// ─────────────────────────────────────────────────────────────
// 보라맵4 잠긴 문 (사용자 브리핑 2026-09-10, 텍스트 그대로)
//   동료 가입 전: "자물쇠로 잠겨 있다."
//   가입 후 문에 닿으면: 억빠맨 "어라 문이 잠겨있네요" / "흠.. 아까 레버에 뭐 없으셨어요?" → 억빠맨이 선두로 계단을 올라 레버로, 주인공이 따라감
//     → "음음 이 레버를" → (나레이션) "억빠맨은 레버를 뽑아버렸다" → "이걸 열쇠로 쓰면 되지않을까요?" → "열쇠?를 얻었다."
//   열쇠 있으면: "철컥! 문이 열렸다." → 억빠맨 "ㅎㅎ" → 다음 맵(void5, 브금 Scarlet Forest 부터)
//   door 엔티티의 lockedScript 로 실행(문에 닿는 순간). 문이 열린 뒤(door_open)엔 door 가 그냥 이동시킨다.
// ─────────────────────────────────────────────────────────────
const P = (text, extra = {}) => ({ speaker: '억빠맨', portrait: 'ppaman', voice: 'ppaman', text, ...extra });

export const void4_door = [
  { if: (f) => f.lever_taken, goto: 'unlock' },
  { if: (f) => f.ppaman_joined, goto: 'ask' },
  { text: '* 자물쇠로 잠겨 있다.', voice: 'narrator' },
  { end: true },

  { label: 'ask' },
  P('* 어라{w=0.3} 문이 잠겨있네요'),
  P('* 흠..{w=0.5} 아까 레버에 뭐 없으셨어요?'),
  // 억빠맨이 앞장서 계단으로, 주인공이 뒤따른다
  { face: 'ppaman', dir: 'left' }, { wait: 0.3 },
  { move: 'ppaman', px: [2284, 244], run: true },
  { parallel: [{ move: 'ppaman', px: [2284, 72], run: true }, { move: 'player', px: [2284, 244], run: true }] },
  { parallel: [{ move: 'ppaman', px: [2226, 68], run: true }, { move: 'player', px: [2284, 72], run: true }] },
  { face: 'ppaman', dir: 'up' }, { face: 'player', dir: 'left' }, { wait: 0.5 },
  P('* 음음{w=0.4} 이 레버를'),
  { sfx: 'click' }, { hide: 'lever_on' }, { wait: 0.35 },
  { text: '* 억빠맨은 레버를 뽑아버렸다', voice: 'narrator' },
  { face: 'ppaman', dir: 'right' },
  P('* 이걸 열쇠로 쓰면 되지않을까요?'),
  { sfx: 'item' },
  { text: '* {c=yellow}열쇠?{/c}를 얻었다.', voice: 'narrator' },
  { action: (g) => { if (!g.inventory.includes('열쇠?')) g.inventory.push('열쇠?'); } },
  { set: { lever_taken: true } },
  { regroup: true },
  { end: true },

  { label: 'unlock' },
  { sfx: 'plug' },
  { text: '* 철컥!{w=0.4} 문이 열렸다.', voice: 'narrator' },
  { remove: 'padlock' },
  { set: { door_open: true } },
  P('* ㅎㅎ'),
  { fade: 'out', duration: 0.45 },
  { map: 'void5', spawn: 'from_void4' },
  { bgm: 'scarlet', volume: 0.45 },              // 여기서부터 Scarlet Forest (h2B5F8skpGE)
  { fade: 'in', duration: 0.45 },
];
