// 벚꽃 숲 8 갈림길(jjajang_sakura8) + 벚꽃 숲 9 파란 토리이 달리기 시작(BUILD282 사용자 브리핑 2026-09-21, 원문·구현표 design/narrative/cutscenes/jjajang_sakura8.md)
//   갈림목 연출(sakura8_split): 원문 대사 → “요플래형은 뭐 한번 저기라도 가보실래요?” 뒤 카메라가 윗길을 천천히 가리켰다 돌아옴 → “갔다오마.” → 경섭이 동료에서 빠져 오른쪽으로 쭉 걸어 나감(사본 NPC)
//   → 억빠맨도 동료에서 빠져 오른쪽 길 앞을 막고 선다 → 요플래 혼자(플래그 sakura8_split_done). 오른쪽 길로 가려 하면(sakura8_no_right) 억빠맨 “윗길로 가보시는게 어때요?” + 한 칸 되돌림.
//   벚꽃 숲 9(sakura9_start): 파란 토리이를 왼쪽으로 지나면 러너 시작(맵 meta.runs.a — 토리이 굽이 길과 같은 시작 방식).
//   규칙: 대사는 전부 원문(괄호 지시문은 대사 아님). 카메라는 먼저 천천히 움직이고 대사는 그 뒤.

const PLAYER = 'player', GYEONGSUB = 'gyeongsub', PPAMAN = 'ppaman';
const GYEONGSUB_NPC = 'gyeongsub_npc', PPAMAN_NPC = 'ppaman_npc';
export const ROAD_Y = 486;                             // 벚꽃 숲 8 길 위 발 자리(맵 spawns 의 y)
export const UP_VIEW = [23.5, 7];                      // 윗길을 가리키는 카메라(갈림목 위쪽, cam.y 60 → 윗길 2~13행; 일행 머리가 아래 가장자리에 걸리지 않게)
export const CAM = { up: 1.4, hold: 0.9, back: 1.2 };
export const GUARD_SPOT = [900, ROAD_Y];               // 억빠맨 가드 자리(28열, 오른쪽 길 바로 앞) = 맵 meta.sakura8.guard
export const FRONT_ROW = 12;                           // 사본이 일행 앞줄(24px 아래)로 한 걸음 내려와 지나간다(겹쳐 통과하지 않게, by 는 16px 단위 = 2px)
export const FOLLOW_DELAY = 0.3;                       // 억빠맨은 경섭보다 이만큼 늦게 출발(“거의 같이”)
export const EXIT_SPOT = [40 * 32 + 48, ROAD_Y + FRONT_ROW * 2];   // 경섭: 앞줄로 동쪽 끝 밖까지 쭉 걸어 나간다
export const SAKURA8_SPLIT_FLAG = 'sakura8_split_done';
export const NO_RIGHT_LINE = '윗길로 가보시는게 어때요?';

const K = text => ({ speaker: '경섭', portrait: 'gyeongsub', voice: 'gyeongsub', text: `* ${text}` });
const P = text => ({ speaker: '억빠맨', portrait: 'ppaman', voice: 'ppaman', text: `* ${text}` });
const close = { action: game => game.textbox.close() };
/** 동료 사본 NPC 를 그 동료 자리에 세워 보이게 한다(동료가 빠지기 직전에) */
const standIn = (npcId, followerId) => ({ action: game => {
  const f = game.entities.find(e => e.id === followerId), n = game.entities.find(e => e.id === npcId);
  if (!n) return;
  if (f) { n.x = f.x; n.y = f.y; n.facing = f.facing; }
  n.visible = true;
} });

export const jjajang_sakura8_split = [
  { face: GYEONGSUB, dir: 'toward:ppaman' }, { face: PPAMAN, dir: 'toward:gyeongsub' },
  K('빠맨아,'),
  P('네?'),
  K('아마 저 다음에 미스가 있는거같은데,'),
  K('내가 혼자 갔다오마'),
  P('아 네'),
  // 브리핑 “어둠의짜장면?(보라색)” — 괄호는 지시: 그 낱말을 보라색 글자로(사용자 2026-09-21 “보라색 텍스트로 쓰라고”). 드럼통 둥지 뒤 TV 연출과 같은 {c=purple}
  K('그동안 그 {c=purple}어둠의짜장면{/c}?을 얻을 방법을 좀 궁리해보는게 좋을듯 싶다.'),
  P('흠.. 저 고민좀 해볼게요'),
  P('요플래형은 뭐 한번 저기라도 가보실래요?'),
  close,
  // (윗길로 카메라를 가리킨다)
  { face: PPAMAN, dir: 'up' },
  { camera: UP_VIEW, duration: CAM.up }, { wait: CAM.hold },
  // 카메라가 주인공들에게 돌아오는 동안(따라가기 완화) 기다렸다가 대사 — 카메라 먼저, 대사는 그 뒤
  { camera: 'player', duration: CAM.back }, { wait: CAM.back },
  { face: PPAMAN, dir: 'toward:gyeongsub' },
  K('갔다오마.'),
  close,
  // (경섭이 오른쪽으로 쭉 걸어감) — 둘 다 사본이 그 자리에 서고(동료가 빠지면 남은 동료는 주인공 자리에 다시 생기므로 먼저) 동료에서 빠진 뒤 거의 같이 오른쪽으로:
  //   경섭은 앞줄로 동쪽 끝 밖까지 걸어가 사라지고, 억빠맨은 0.3초 뒤 출발해 오른쪽 길 바로 앞(가드 자리)에 멈춰 왼쪽을 보고 막아선다 — 잠시 요플래 혼자
  //   (사용자 2026-09-21 “억빠맨이랑 김경섭 오른쪽 거의 같이 가게”, “중간에 억빠맨이 왼쪽 보게”)
  standIn(GYEONGSUB_NPC, GYEONGSUB), standIn(PPAMAN_NPC, PPAMAN),
  { leave: GYEONGSUB }, { leave: PPAMAN },
  { parallel: [
    [{ move: GYEONGSUB_NPC, by: [0, FRONT_ROW] }, { face: GYEONGSUB_NPC, dir: 'right' }, { move: GYEONGSUB_NPC, px: EXIT_SPOT, exact: true }, { remove: GYEONGSUB_NPC }],
    [{ wait: FOLLOW_DELAY }, { move: PPAMAN_NPC, by: [0, FRONT_ROW] }, { move: PPAMAN_NPC, px: [GUARD_SPOT[0] - 32, GUARD_SPOT[1] + FRONT_ROW * 2] }, { move: PPAMAN_NPC, px: GUARD_SPOT, exact: true }, { face: PPAMAN_NPC, dir: 'left' }],
  ] },
  { action: game => { const n = game.entities.find(e => e.id === PPAMAN_NPC); if (n) n.solid = true; } },
  { set: { [SAKURA8_SPLIT_FLAG]: true } },
];

/** 오른쪽 길 막기(트리거 unless sakura8_right_open): 억빠맨 한마디 + 한 칸 되돌림(벚꽃 숲 5 와 같은 방식) */
export const jjajang_sakura8_no_right = [
  { face: PLAYER, dir: 'right' },
  P(NO_RIGHT_LINE),
  close,
  { move: PLAYER, by: [-32, 0], speed: 60 },
  { face: PLAYER, dir: 'up' },
];

/** 벚꽃 숲 9: 파란 토리이를 지나면 러너 시작(맵 meta.runs.a: dir −1, 분홍 장애물, 물 없음) */
const startRun = id => ({ action: game => {
  const cfg = game.map?.def?.meta?.runs?.[id];
  if (!cfg || game.runner) return;
  game.startRunner({ ...cfg, id });
} });
export const jjajang_sakura9_start = [startRun('a'), { end: true }];
