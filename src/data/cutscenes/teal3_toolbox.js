// ─────────────────────────────────────────────────────────────
// 청록숲 3 공구상자 (사용자 브리핑 2026-09-10, 대사 그대로)
//   상자에 C → 브금 꺼짐 → 세 사람이 상자를 기준으로 흩어져 상자를 바라봄
//   빠맨 "뭔가 많이 들어있네요" / 경섭 "응 그렇네" / 빠맨 "응? 이게 무슨소리죠" / 경섭 "???"
//   → 오른쪽 풀숲에서 미니언(레드/블루 CS, PR #7 정면 정지 스프라이트) 두 마리가 튀어나옴
//   빠맨 "앗 ... ... 엥 CS?" / 경섭 "허허 저게 뭐냐 근데 뭔가 꼭... 우리를" → CS 점프 연출 → 세 사람 한 칸 뒤로 물러나 오른쪽(CS)을 바라봄
//   빠맨 "아 안되겠다 싸 싸워야할거같은데요? ㅈ ㅈ됐다. 빨리 이 상자에서 아무거나 꺼네봐요 !!!"
//   → 빠맨이 상자에서 꺼내(효과음) 형섭·경섭 앞으로 달려가 하나씩 건네는 시늉(효과음·바라보기)
//   빠맨 "오 온다!" → 전투 시작 연출(battle_start·줌·흔들림·흰 섬광). 인게임 전투는 다음 브리핑 — 지금은 섬광 뒤 자리표시(flag teal3_battle_pending).
// ─────────────────────────────────────────────────────────────
const N = (text, extra = {}) => ({ text, voice: 'narrator', ...extra });
const P = (text, extra = {}) => ({ speaker: '억빠맨', portrait: 'ppaman', voice: 'ppaman', text, ...extra });
const G = (text, extra = {}) => ({ speaker: '경섭', portrait: 'gyeongsub', voice: 'gyeongsub', text, ...extra });
const CS = (id, x, y, sprite) => ({ type: 'npc', id, sprite, x, y, facing: 'down', wander: 0, solid: true });   // 필드 미니언은 정면 정지 1장(PR #7) — facing 무관

export const teal3_toolbox = [
  { if: (f) => f.teal3_battle_pending, goto: 'again' },
  { if: (f) => !f.void11_done, goto: 'alone' },
  { bgm: null, fadeOut: 0.6 },
  { parallel: [                                                   // 상자를 기준으로 흩어진다
    { move: 'player', rel: 'toolbox', at: 'bottom', by: [0, 26] },
    { move: 'ppaman', rel: 'toolbox', at: 'left', by: [-30, 4], run: true },
    { move: 'gyeongsub', rel: 'toolbox', at: 'right', by: [40, 4], run: true },   // 한 칸 물러날 때 상자와 안 겹치게 조금 더 오른쪽
  ] },
  { face: 'player', dir: 'up' }, { face: 'ppaman', dir: 'right' }, { face: 'gyeongsub', dir: 'left' },
  { wait: 0.5 },
  P('* 뭔가 많이 들어있네요'),
  G('* 응 그렇네'),
  { sfx: 'rumble' },                                              // 풀숲 쪽에서 나는 소리
  P('* 응?{w=0.4} 이게 무슨소리죠'),
  G('* ???'),
  { camera: [21, 14], duration: 0.6 },                            // 상자와 오른쪽 풀숲이 한 화면에 — 튀어나오는 게 보여야 한다 (스크린샷으로 발견)
  { face: 'ppaman', dir: 'right' }, { face: 'gyeongsub', dir: 'right' }, { face: 'player', dir: 'right' },
  { spawn: CS('cs1', 850, 436, 'cs_red') }, { spawn: CS('cs2', 850, 500, 'cs_blue') },  // 오른쪽 풀숲 안에서 (레드·블루)
  { sfx: 'whoosh' },
  { parallel: [{ hop: 'cs1', by: [-70, 6], height: 34, duration: 0.5, sfx: false }, { hop: 'cs2', by: [-64, -4], height: 30, duration: 0.55, sfx: false }] },   // 갑자기 튀어나온다
  { emote: 'ppaman', kind: '!', duration: 1.0, hold: 0.5 },
  P('* 앗{w=0.4} ...{w=0.4} ...{w=0.4} 엥 CS?'),
  G('* 허허 저게 뭐냐{w=0.3} 근데 뭔가 꼭...{w=0.5} 우리를'),
  { parallel: [{ hop: 'cs1', by: [0, 0], height: 22, duration: 0.4 }, { hop: 'cs2', by: [0, 0], height: 22, duration: 0.4, sfx: false }] },   // CS 점프 연출
  { wait: 0.15 },
  { parallel: [{ hop: 'cs1', by: [0, 0], height: 22, duration: 0.4 }, { hop: 'cs2', by: [0, 0], height: 22, duration: 0.4, sfx: false }] },
  { parallel: [                                                   // 모두 한 칸 뒤로 물러나 CS(오른쪽)를 바라본다
    { move: 'player', by: [-16, 0] }, { move: 'ppaman', by: [-16, 0] }, { move: 'gyeongsub', by: [-16, 0] },
  ] },
  { face: 'player', dir: 'right' }, { face: 'ppaman', dir: 'right' }, { face: 'gyeongsub', dir: 'right' },
  { emote: 'ppaman', kind: 'sweat', duration: 2.0, hold: 0.2 },
  P('* 아 안되겠다{w=0.3} 싸 싸워야할거같은데요?{w=0.4} ㅈ ㅈ됐다.{w=0.4} 빨리 이 상자에서 아무거나 꺼네봐요 !!!'),
  { move: 'ppaman', rel: 'toolbox', at: 'bottom', by: [0, 6], run: true, speed: 170 },   // 빠르게 상자 앞에서
  { face: 'ppaman', dir: 'up' }, { sfx: 'item' }, { wait: 0.3 },
  { move: 'ppaman', rel: 'player', at: 'left', by: [-8, 0], run: true, speed: 170 },      // 형섭에게 (주는 시늉)
  { face: 'ppaman', dir: 'right' }, { sfx: 'item' }, { wait: 0.3 },
  { move: 'ppaman', rel: 'toolbox', at: 'bottom', by: [0, 6], run: true, speed: 170 },
  { face: 'ppaman', dir: 'up' }, { sfx: 'item' }, { wait: 0.25 },
  { move: 'ppaman', rel: 'gyeongsub', at: 'left', by: [-8, 0], run: true, speed: 170 },   // 경섭에게
  { face: 'ppaman', dir: 'right' }, { sfx: 'item' }, { wait: 0.3 },
  { move: 'ppaman', rel: 'player', at: 'left', by: [-40, 0], run: true, speed: 170 },     // 제자리로
  { face: 'ppaman', dir: 'right' },
  { parallel: [{ hop: 'cs1', by: [-24, 0], height: 18, duration: 0.35, sfx: false }, { hop: 'cs2', by: [-24, 0], height: 18, duration: 0.35, sfx: false }] },   // 다가온다
  P('* 오{w=0.3} 온다!'),
  // ── 전투 시작 연출: 화면 가운데로 클로즈업 + 델타룬 전투 시작 징글 → 흰 섬광 → 전투 화면 ──
  { sfx: 'battle_start' }, { shake: 0.45, amp: 3 },
  { zoom: 1.9, at: 'center', duration: 0.55 },
  { fade: 'white', duration: 0.3 },
  { wait: 0.35 },
  { battle: { enemies: ['cs_red', 'cs_blue'], bgm: 'rude_buster', flag: 'teal3_cs_won' } },   // 레드·블루 CS, 각 HP 6. 일반 전투 브금 Rude Buster
  { bgm: null, fadeOut: 0.6 },
  { set: { teal3_battle_pending: true } },
  { remove: 'cs1' }, { remove: 'cs2' },
  { zoom: 1 },
  { regroup: true },
  { camera: 'player' },
  { fade: 'in', duration: 0.5 },
  N('* CS 를 물리쳤다.'),
  { end: true },
  { label: 'again' },
  N('* 공구상자다.{w=0.4} 뭔가 많이 들어 있다.'),
  { end: true },
  { label: 'alone' },
  N('* 공구상자다.'),
];
