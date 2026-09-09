// ─────────────────────────────────────────────────────────────
// 보라맵4 (긴 뗏목 길). 사용자 브리핑 2026-09-10, 텍스트 그대로.
//  void4_arrive: 도착지 트리거(1회) → 카메라가 억빠맨(물 한가운데 기둥 위)으로 클로즈업 → 대사 → 레버 클로즈업 → 주인공으로 복귀 ("오케이" 는 사용자 요청으로 제거)
//  void4_lever : 위 발판의 레버 C → 다리가 드르르르륵 떨어지며 쿵! → 다리 타일 연결(tileSwaps bridge_down) → 억빠맨에게 걸어갈 수 있음
//  보라맵부터 형섭은 나레이션 스타일(이름·초상화 없음). 억빠맨 = 빠맨 초상화/목소리.
// ─────────────────────────────────────────────────────────────
const P = (text, extra = {}) => ({ speaker: '억빠맨', portrait: 'ppaman', voice: 'ppaman', text, ...extra });
const PILLAR_TX = 37, LEVER_TX = 69;

export const void4_arrive = Object.assign([
  { wait: 0.5 },
  { parallel: [{ camera: [PILLAR_TX, 7], duration: 1.4 }, { zoom: 2.0, at: 'ppaman', offset: [0, -14], duration: 1.4 }] },
  { wait: 0.3 },
  P('* 어 ㅅㅂ'),
  P('* 형 구해줘요 ㅅㅂ{w=0.3} 저 여기 갇혔어요.'),
  P('* 저기 저기{w=0.4} 뭔가 다리를 내리는 레버가 있는거같아요'),
  { zoom: 1, duration: 0.5 },
  { camera: [LEVER_TX, 1], duration: 1.2 },                      // 도착지 위 발판의 레버
  { zoom: 2.2, at: 'lever_off', duration: 0.7 },
  { wait: 1.1 },
  { zoom: 1, duration: 0.5 },
  { camera: 'player' },
], { silent: true });

export const void4_lever = [
  { if: (f) => f.bridge_down, goto: 'done' },
  { sfx: 'click' },
  { hide: 'lever_off' },
  { spawn: { type: 'prop', id: 'lever_on', image: 'assets/props/lever_on.png', x: 2212, y: 52, w: 24, h: 8, ix: 2212, iy: 28, solid: true, script: 'void4_lever' } },
  { wait: 0.5 },
  { camera: [64, 7], duration: 0.9 },                           // 다리가 떨어질 자리(도착지 쪽 끝)
  { spawn: { type: 'prop', id: 'bridge_fall', image: 'assets/props/bridge_span31.png', x: 1216, y: 24, solid: false, sortY: 0 } },
  { sfx: 'rumble' }, { async: [{ shake: 1.2, amp: 3 }] },
  { move: 'bridge_fall', px: [1216, 243], speed: 95 },          // 드르르르륵 (1초 남짓 내려옴, 200px)
  { sfx: 'thud' }, { shake: 0.6, amp: 7 },                       // 쿵!
  { tiles: 'bridge_down' }, { remove: 'bridge_fall' },
  { set: { bridge_down: true } },
  { wait: 0.7 },
  { camera: 'player' },
  { end: true },
  { label: 'done' },
  { text: '* 이미 내렸다.', voice: 'narrator' },
];
