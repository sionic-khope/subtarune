// ─────────────────────────────────────────────────────────────
// 낙석 맵(void5/6/7) 꼬리 길의 작은 이벤트 3개 (2026-09-10). 낙석만 있으면 심심해서 넣은 상호작용 — 소품에 C.
//   void5 꽃: 사용자 브리핑 텍스트 그대로 (나레이션 "꽃들이다" → 억빠맨 "네 왜요?" → [냄새를 맡게 시킨다 / 그냥 간다] → 킁킁 / .... / "냄새 존나 구려요 씨발 아" → "ㅋㅋ 갈길 가야겠다.")
//   void6 표지판 / void7 떨어진 바위: 같은 결의 짧은 개그(내가 씀). 억빠맨 없이(동료 아님) 오면 나레이션만.
// ─────────────────────────────────────────────────────────────
const P = (text, extra = {}) => ({ speaker: '억빠맨', portrait: 'ppaman', voice: 'ppaman', text, ...extra });
const N = (text, extra = {}) => ({ text, voice: 'narrator', ...extra });
const withPpaman = (f) => f.ppaman_joined;

export const rock_flowers = [
  { if: (f) => !withPpaman(f), goto: 'alone' },
  { if: (f) => f.flowers_sniffed, goto: 'again' },
  N('* 꽃들이다'),
  P('* 네{w=0.3} 왜요?', { choice: { options: [{ label: '냄새를 맡게 시킨다', goto: 'sniff' }, { label: '그냥 간다', goto: 'go' }], cancel: 1 } }),
  { label: 'sniff' },
  P('* 아 넵.'),
  { move: 'ppaman', px: [842, 178] },          // 꽃들로 들어간다
  { face: 'ppaman', dir: 'up' }, { wait: 0.5 },
  P('* 킁킁'),
  { wait: 0.4 },
  P('* ....'),
  P('* 냄새 존나 구려요 씨발 아'),
  N('* ㅋㅋ{w=0.4} 갈길 가야겠다.'),
  { set: { flowers_sniffed: true } },
  { regroup: true },
  { end: true },
  { label: 'go' },
  N('* 갈길 가야겠다.'),
  { end: true },
  { label: 'again' },
  N('* 꽃들이다'),
  P('* 저 이제 안 맡을 거예요'),
  { end: true },
  { label: 'alone' },
  N('* 꽃들이다.{w=0.4} 보라색이다.'),
];

export const rock_sign = [
  N('* 표지판이다.'),
  N('* "낙석 주의"'),
  { if: (f) => !withPpaman(f), goto: 'end' },
  P('* ...{w=0.5} 지금 알려주면 어떡해요'),
  N('* 맞는 말이다.'),
  { label: 'end' },
];

export const rock_boulder = [
  N('* 떨어진 바위다.'),
  { if: (f) => !withPpaman(f), goto: 'alone' },
  { if: (f) => f.boulder_kicked, goto: 'again' },
  P('* 제가 한번 차볼게요', { choice: { options: [{ label: '말린다', goto: 'stop' }, { label: '내버려 둔다', goto: 'kick' }], cancel: 0 } }),
  { label: 'stop' },
  P('* 아 넵.'),
  N('* 현명했다.'),
  { end: true },
  { label: 'kick' },
  { move: 'ppaman', px: [1856, 214] },         // 바위 옆으로
  { face: 'ppaman', dir: 'right' }, { wait: 0.3 },
  P('* 얍!'),
  { shake: 0.2, amp: 2 },
  P('* 아 ㅅㅂ{w=0.3} 발'),
  N('* ㅂㅅ같다.'),
  P('* ...'),
  N('* 갈길 가야겠다.'),
  { set: { boulder_kicked: true } },
  { regroup: true },
  { end: true },
  { label: 'again' },
  P('* 다신 안 차요'),
  { end: true },
  { label: 'alone' },
  N('* 크다.'),
];
