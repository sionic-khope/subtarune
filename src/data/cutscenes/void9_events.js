// ─────────────────────────────────────────────────────────────
// 보라맵9 뱀길 체크포인트 이벤트 4종 (2026-09-10, 사용자: "체크포인트마다 색다른 이벤트, 웃기고 이상해도 됨, 유형은 제각각"). 대사는 내가 씀.
//   B 수상한 버튼(선택 + 물리 개그: 옆에 바위 떨어짐) / C 표지판 퀴즈(3지선다) / D 물웅덩이(억빠맨 점프 연출 {hop} → 첨벙) / E 작은 상자(아이템 개그)
//   억빠맨 없이 오면 나레이션만.
// ─────────────────────────────────────────────────────────────
const P = (text, extra = {}) => ({ speaker: '억빠맨', portrait: 'ppaman', voice: 'ppaman', text, ...extra });
const N = (text, extra = {}) => ({ text, voice: 'narrator', ...extra });
const withPpaman = (f) => f.ppaman_joined;

export const void9_button = [
  { if: (f) => f.button_pressed, goto: 'again' },
  N('* 수상한 버튼이다.{w=0.4} "누르지 마시오" 라고 적혀 있다.'),
  { if: (f) => !withPpaman(f), goto: 'alone' },
  P('* 형{w=0.3} 저거 누르면 어떻게 될까요', { choice: { options: [{ label: '누른다', goto: 'press' }, { label: '안 누른다', goto: 'no' }], cancel: 1 } }),
  { label: 'press' },
  { parallel: [{ move: 'ppaman', rel: 'button', at: 'bottom', by: [0, 26] }, { move: 'player', rel: 'button', at: 'bottom', by: [-44, 30] }] },   // 억빠맨은 버튼 아래, 형섭은 그 왼쪽
  { face: 'ppaman', dir: 'up' }, { face: 'player', dir: 'right' }, { wait: 0.3 },
  P('* 꾹'),
  { shake: 0.35, amp: 3 }, { wait: 0.6 },
  N('* ...{w=0.6} 아무 일도 일어나지 않았다.'),
  P('* 에이 뭐야'),
  { spawn: { type: 'rockfall', id: 'button_rock', image: 'assets/props/rock.png', x: 1470, ground: 205, period: 100, offset: 0, warn: 0.8, fall: 0.4, rest: 0.9 } },
  { wait: 1.3 },
  { face: 'ppaman', dir: 'right' }, { face: 'player', dir: 'right' },
  { wait: 1.0 },
  { remove: 'button_rock' },
  P('* ......'),
  P('* 다신 안 누를게요'),
  { set: { button_pressed: true } },
  { regroup: true },
  { end: true },
  { label: 'no' },
  N('* 누르지 않았다.{w=0.4} 현명하다.'),
  { end: true },
  { label: 'again' },
  N('* 수상한 버튼이다.'),
  P('* 저 이제 안 눌러요'),
  { end: true },
  { label: 'alone' },
  N('* 누르지 않았다.'),
];

export const void9_quiz = [
  N('* 표지판이다.{w=0.4} 퀴즈가 적혀 있다.'),
  { if: (f) => !withPpaman(f), goto: 'alone' },
  { text: '* "억빠맨의 특징은?"', voice: 'narrator', choice: { options: [{ label: '바보', goto: 'a' }, { label: '천재', goto: 'b' }, { label: '억빠', goto: 'c' }], cancel: 2 } },
  { label: 'a' },
  P('* 네?{w=0.4} 형 저 여기 있는데요'),
  N('* 정답이었다.'),
  { end: true },
  { label: 'b' },
  P('* 오{w=0.3} 형 보는 눈 있으시네요'),
  N('* 오답이었다.'),
  { end: true },
  { label: 'c' },
  P('* ...{w=0.5} 그건 제 이름이잖아요'),
  N('* 표지판이 조용히 정답 처리했다.'),
  { end: true },
  { label: 'alone' },
  N('* "억빠맨의 특징은?"{w=0.5} 답할 사람이 없다.'),
];

export const void9_puddle = [
  { if: (f) => f.puddle_jumped, goto: 'again' },
  N('* 물웅덩이다.'),
  { if: (f) => !withPpaman(f), goto: 'alone' },
  P('* 제가 건너뛰어 볼게요'),
  { parallel: [{ move: 'ppaman', rel: 'puddle', at: 'left', by: [-8, 18] }, { move: 'player', rel: 'puddle', at: 'left', by: [-52, -6] }] },   // 웅덩이 왼쪽에 억빠맨, 그 왼쪽에 형섭 (누른 위치 무관)
  { face: 'ppaman', dir: 'right' }, { face: 'player', dir: 'right' }, { wait: 0.4 },
  { hop: 'ppaman', by: [58, -18], height: 30, duration: 0.55 },
  { sfx: 'splash' },
  N('* 억빠맨은 웅덩이 한가운데 착지했다.'),
  { wait: 0.5 },
  P('* ...{w=0.5} 젖었어요'),
  N('* 갈길 가야겠다.'),
  { set: { puddle_jumped: true } },
  { regroup: true },
  { end: true },
  { label: 'again' },
  N('* 물웅덩이다.'),
  P('* 아직 발 젖어 있어요'),
  { end: true },
  { label: 'alone' },
  N('* 그냥 물웅덩이다.'),
];

export const void9_chest = [
  { if: (f) => f.chest9_opened, goto: 'again' },
  N('* 상자다.'),
  { sfx: 'item' },
  N('* 열어 보니{w=0.4} 텅 비어 있다.'),
  { if: (f) => !withPpaman(f), goto: 'set' },
  P('* 아{w=0.3} 그거 제가 아까 먼저 열어봤어요 헤헤'),
  N('* ......'),
  P('* 안에 먼지 있었어요'),
  N('* {c=yellow}먼지{/c}를 얻었다.'),
  { action: (g) => { if (!g.inventory.includes('먼지')) g.inventory.push('먼지'); } },
  { label: 'set' },
  { set: { chest9_opened: true } },
  { end: true },
  { label: 'again' },
  N('* 빈 상자다.'),
];
