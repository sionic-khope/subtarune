// ─────────────────────────────────────────────────────────────
// 억빠맨에게 말 건 이후 (사용자 브리핑 2026-09-10, 텍스트 그대로·띄어쓰기만)
//   인사 → 선택지(여긴 어디 / 왜 여기 / 물어볼건 없다) → 1·2 는 답한 뒤 "더 물어보실거 있으세요?" 로 반복 → 3 이면 동행 → [억빠맨이 동료가 되었다]
//   1번 답 중간에 "퍼엉 퍼엉 팍 우르르 쾅쾅" 식 의성어 20개가 아주 빠르게 넘어가는 개그 연출(auto 0.16s, 목소리 그대로).
//   가입 후 다시 말 걸면 짧은 한마디.
// ─────────────────────────────────────────────────────────────
const P = (text, extra = {}) => ({ speaker: '억빠맨', portrait: 'ppaman', voice: 'ppaman', text, ...extra });
const FAST = (text) => P(`* ${text}`, { auto: 0.16, speed: 3 });   // 개그 연출: 순식간에 지나가는 한 상자

const BOOM = [
  '펑', '퍼엉', '팍', '우르르', '쾅쾅', '퍼버벙', '펑펑', '콰광', '두두두', '펑!', '퍼엉 퍼엉', '팍팍', '우르르 쾅', '뻥', '펑펑펑',
  '콰과광', '쾅', '퍼벙', '펑 퍼벙 펑', '팡!',
];

export const void4_ppaman_talk = [
  { if: (f) => f.ppaman_joined, goto: 'joined' },
  { if: (f) => f.ppaman_greeted, goto: 'ask' },
  P('* 안녕하세요 형.{w=0.4} 구해주셔서 감사해요'),
  { set: { ppaman_greeted: true } },
  { label: 'ask' },
  {
    speaker: '억빠맨', portrait: 'ppaman', voice: 'ppaman', text: '* ...',
    choice: { options: [{ label: '여긴 어디', goto: 'where' }, { label: '왜 여기', goto: 'why' }, { label: '물어볼건 없다', goto: 'none' }], cancel: 2 },
  },

  // ── 1. 여긴 어디 ──
  { label: 'where' },
  P('* 저도 잘 모르겠어요'),
  P('* 음..{w=0.5} 뭔가 형 방송을 보고있었는데'),
  P('* 그 뒤로..{w=0.4} 갑자기 뭐가 막 막 퍼엉 퍼엉 팍 우르르 쾅쾅'),
  P('* 그런뒤에 제가 꺄아아아아아악 해보니까 흐음 우르르 펑펑'),
  P('* 펑 하고 다시 돌아와서'),
  ...BOOM.map(FAST),
  { bubble: 'player', dots: 3, gap: 0.4, hold: 0.5 },   // 형섭 머리 위에 . . . (대화창 없이)
  P('* 했어요.'),
  { text: '* ...{w=0.6} ㅂㅅ새끼같다', voice: 'narrator' },
  P('* 어쨋든 그래요 형.'),
  { goto: 'more' },

  // ── 2. 왜 여기 ──
  { label: 'why' },
  P('* 정신을 차려보니 이 보라색 땅이였고 뭔가 방황을 했어요'),
  P('* 아 근데 오기전에 다른 사람들도 여기 있던거 같더라구요{w=0.3} 몇명 본거같아요'),
  P('* 뭔가 이상한 현상이 있었나...{w=0.5} 일단 빨리 저도 나가고싶어요'),
  { goto: 'more' },

  // ── 반복: 더 물어보실거 있으세요? ──
  { label: 'more' },
  {
    speaker: '억빠맨', portrait: 'ppaman', voice: 'ppaman', text: '* 더 물어보실거 있으세요?',
    choice: { options: [{ label: '여긴 어디', goto: 'where' }, { label: '왜 여기', goto: 'why' }, { label: '물어볼건 없다', goto: 'none' }], cancel: 2 },
  },

  // ── 3. 물어볼건 없다 → 동행 ──
  { label: 'none' },
  P('* 형 저도 동행해도 괜찮을까요?'),
  P('* 여기서 빨리 나가는걸 목표로 하죠'),
  { sfx: 'item' },
  { text: '* {c=yellow}억빠맨이 동료가 되었다{/c}', voice: 'narrator' },
  { join: 'ppaman' },
  { set: { ppaman_joined: true } },
  { end: true },

  // ── 가입 후 ──
  { label: 'joined' },
  P('* 형{w=0.3} 빨리 나가요'),
];
