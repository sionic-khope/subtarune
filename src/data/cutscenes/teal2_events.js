// ─────────────────────────────────────────────────────────────
// 청록숲 2 광장 이벤트 (사용자 2026-09-10: "재밌는 이벤트 나무 — 스토리·연출은 알아서 웃기게", "바나나 2개 — 대사 그대로")
//   이벤트 나무(`teal2_tree`): 빠맨이 나무를 똑똑 두드리면 … 안에서 똑똑 되돌아온다. 경섭은 바람 소리라 하고 빠맨은 형섭 뒤로 숨는다. (내가 씀)
//   바나나(`teal2_banana1/2`): 빠맨 "형섭이형 바나나 드세요" [먹는다 → "포타슘" / 안먹는다 → "몸상하세요"]. 먹으면 그 바나나는 사라진다(플래그).
//   억빠맨 없이 오면 나레이션만.
// ─────────────────────────────────────────────────────────────
const N = (text, extra = {}) => ({ text, voice: 'narrator', ...extra });
const P = (text, extra = {}) => ({ speaker: '억빠맨', portrait: 'ppaman', voice: 'ppaman', text, ...extra });
const G = (text, extra = {}) => ({ speaker: '경섭', portrait: 'gyeongsub', voice: 'gyeongsub', text, ...extra });

export const teal2_tree = [
  { if: (f) => f.tree_knocked, goto: 'again' },
  N('* 나무다.{w=0.4} 다른 나무보다 유난히 크다.'),
  { if: (f) => !f.void11_done, goto: 'end' },
  P('* 형{w=0.3} 이 나무 뭔가 얼굴 같지 않아요?'),
  G('* 허허{w=0.3} 나무가 다 그렇지'),
  P('* 한번 두드려 볼게요'),
  { move: 'ppaman', rel: 'tree', at: 'bottom', by: [-44, 12], run: true },
  { face: 'ppaman', dir: 'up' }, { wait: 0.3 },
  { sfx: 'knock' }, { wait: 0.28 }, { sfx: 'knock' },
  N('* 똑똑'),
  { wait: 0.9 },
  { sfx: 'knock' }, { shake: 0.15, amp: 1 }, { wait: 0.32 }, { sfx: 'knock' }, { shake: 0.15, amp: 1 },
  N('* ...{w=0.7} 똑똑'),
  { emote: 'ppaman', kind: '!', duration: 1.0, hold: 0.6 },
  P('* 형{w=0.3} 지금 안에서 두드린 거 맞죠?'),
  G('* 허허{w=0.4} 바람 소리겠지'),
  { move: 'ppaman', rel: 'player', at: 'left', by: [-30, 0], run: true },   // 형섭 뒤로 숨는다
  { face: 'ppaman', dir: 'right' },
  P('* 저 여기 있을게요'),
  N('* ...{w=0.5} 확실히 두 번 두드렸다.'),
  { set: { tree_knocked: true } },
  { regroup: true },
  { end: true },
  { label: 'again' },
  N('* 나무다.'),
  { if: (f) => !f.void11_done, goto: 'end' },
  P('* 저건 다신 안 두드릴래요'),
  { label: 'end' },
];

const banana = (id) => [
  { if: (f) => !f.ppaman_joined, goto: 'alone' },
  P('* 형섭이형 바나나 드세요', { choice: { options: [{ label: '먹는다', goto: 'eat' }, { label: '안먹는다', goto: 'no' }], cancel: 1 } }),
  { label: 'eat' },
  { sfx: 'item' }, { remove: id }, { set: { [`${id}_eaten`]: true } },
  P('* 포타슘'),
  { end: true },
  { label: 'no' },
  P('* 몸상하세요'),
  { end: true },
  { label: 'alone' },
  N('* 바나나다.'),
];
export const teal2_banana1 = banana('banana1');   // 바나나는 하나만(사용자 2026-09-10)
