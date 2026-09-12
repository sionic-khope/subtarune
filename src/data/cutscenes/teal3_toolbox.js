// ─────────────────────────────────────────────────────────────
// 청록숲 3 공구상자 (사용자 브리핑 2026-09-10, 대사 그대로)
//   상자에 C → 브금 꺼짐 → 세 사람이 상자를 기준으로 흩어져 상자를 바라봄
//   빠맨 "뭔가 많이 들어있네요" / 경섭 "응 그렇네" / 빠맨 "응? 이게 무슨소리죠" / 경섭 "???"
//   → 오른쪽 풀숲에서 미니언(레드/블루 CS, PR #7 정면 정지 스프라이트) 두 마리가 튀어나옴
//   빠맨 "앗 ... ... 엥 CS?" / 경섭 "허허 저게 뭐냐 근데 뭔가 꼭... 우리를" → CS 점프 연출 → 세 사람 한 칸 뒤로 물러나 오른쪽(CS)을 바라봄
//   빠맨 "아 안되겠다 싸 싸워야할거같은데요? ㅈ ㅈ됐다. 빨리 이 상자에서 아무거나 꺼내봐요 !!!"
//   → 빠맨이 상자에서 꺼내(효과음) 형섭·경섭 앞으로 달려가 하나씩 건네는 시늉(효과음·바라보기)
//   빠맨 "오 온다!" → 전투 시작 연출(공식 징글·줌·검은 소용돌이) → 전투 → 미니언 파들파들 → "응 ? 뭐 뭐지" → 점프 → 길 따라 내려가 청록숲2 동상 벽을 펑펑(폭발 애니·소리는 사용자 지정 영상에서 딴 것) → 주인공 화면 → "... 어찌저찌 된거같다." / "전투를 할 수 있게 되었다!"
// ─────────────────────────────────────────────────────────────
import { FX } from '../fx.js';

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
  P('* 아 안되겠다{w=0.3} 싸 싸워야할거같은데요?{w=0.4} ㅈ ㅈ됐다.{w=0.4} 빨리 이 상자에서 아무거나 꺼내봐요 !!!'),
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
  // ── 전투 시작 연출: 델타룬 공식 전투 시작음 + 화면 가운데로 클로즈업 + 검은 소용돌이에 빨려 들어감 → 전투 화면 (사용자: 흰 섬광 대신 검게) ──
  { action: (g) => g.sound.preloadBgm('rude_buster') },   // 전투 브금 미리 로드(진입 공백 없음)
  { sfx: 'battle_start' }, { shake: 0.45, amp: 3 },
  { vortex: { at: 'center', size: 40, grow: 0.9 } },
  { zoom: 1.9, at: 'center', duration: 0.55 },
  { vortex: { size: 900, grow: 0.5 } },
  { fade: 'out', duration: 0.25 },
  { wait: 0.15 },
  { vortex: null },
  { battle: { enemies: ['cs_red', 'cs_blue'], bgm: 'rude_buster', flag: 'teal3_cs_won', bg: 'teal', intro: [   // 첫 전투 튜토리얼(사용자 2026-09-10, 대사 그대로): 상황 문구 → 억빠맨 4줄 (전투 안 대사)
    '* CS 랑 전투가 시작되었다!\n* CS 한마리가 떨고 있는 것 같다.',
    { speaker: '억빠맨', portrait: 'ppaman', voice: 'ppaman', text: '* 아 형 전투는 처음이시죠' },
    { speaker: '억빠맨', portrait: 'ppaman', voice: 'ppaman', text: '* 근데 저능아 아니고서야 공격하기랑 아이템 밖에없는데 솔직히' },
    { speaker: '억빠맨', portrait: 'ppaman', voice: 'ppaman', text: '* 굳이 설명안해도 알거라고 생각합니다.' },
    { speaker: '억빠맨', portrait: 'ppaman', voice: 'ppaman', text: '* 조져 시발새끼들' },
  ] } },   // 레드·블루 CS, 각 HP 6. 일반 전투 브금 Rude Buster, 배경 청록 잎 구름. 적 턴 직전 "억빠맨이 CS 막타를 노리고 있는 듯 하다" 는 enemies.js idle 줄(순서: 상황 문구가 먼저)
  // ── 전투 뒤 (사용자 브리핑 2026-09-10): 미니언 둘이 파들파들 떨다가 → 빠맨 "응 ? 뭐 뭐지" → 점프 → 길 따라 아래로 → 청록숲2 오른쪽 길의 나무 동상들을 펑펑 날려버림 → 주인공 화면 → 나레이션 ──
  { bgm: null, fadeOut: 0.6 },
  { set: { teal3_battle_pending: true } },
  { zoom: 1 }, { camera: [21, 14], duration: 0.01 },
  { regroup: true },
  { fade: 'in', duration: 0.5 },
  { tremble: ['cs1', 'cs2'], duration: 2.6, amp: 1 },
  { wait: 0.9 },
  P('* 응 ?{w=0.4} 뭐 뭐지'),
  { parallel: [{ hop: 'cs1', by: [0, 0], height: 26, duration: 0.4 }, { hop: 'cs2', by: [0, 0], height: 26, duration: 0.4, sfx: false }] },
  { wait: 0.1 },
  { parallel: [{ move: 'cs1', px: [17 * 32 - 20, 21 * 32 + 8], run: true, speed: 200 }, { move: 'cs2', px: [17 * 32 + 12, 21 * 32 + 12], run: true, speed: 200 }] },   // 길 어귀로
  { camera: 'cs1' },
  { parallel: [{ move: 'cs1', px: [17 * 32 - 20, 29 * 32 + 20], run: true, speed: 220 }, { move: 'cs2', px: [17 * 32 + 12, 29 * 32 + 24], run: true, speed: 220 }] },   // 길 따라 아래로(맵 밖으로)
  { remove: 'cs1' }, { remove: 'cs2' },
  { fade: 'out', duration: 0.3 },
  // 청록숲2 로 (주인공은 숨긴 채 위 길 꼭대기에) — 미니언이 위 길 꼭대기부터 달려 내려와 오른쪽으로 쓱 지나가는 순간 동상 다섯이 한꺼번에 펑 (사용자 2026-09-10)
  { map: 'teal2', spawn: 'from_top' },
  { hide: 'player' }, { hide: 'ppaman' }, { hide: 'gyeongsub' },
  { spawn: { type: 'npc', id: 'cs1', sprite: 'cs_red', x: 20 * 32 + 8, y: 1 * 32 + 8, facing: 'down', wander: 0, solid: false } },
  { spawn: { type: 'npc', id: 'cs2', sprite: 'cs_blue', x: 21 * 32 + 20, y: 1 * 32 + 20, facing: 'down', wander: 0, solid: false } },
  { camera: 'cs1' },
  { fade: 'in', duration: 0.35 },
  { wait: 0.2 },
  { parallel: [{ move: 'cs1', px: [20 * 32 + 8, 20 * 32 + 8], run: true, speed: 260 }, { move: 'cs2', px: [21 * 32 + 20, 21 * 32 + 8], run: true, speed: 260 }] },   // 위 길을 따라 아래로
  { parallel: [{ move: 'cs1', px: [37 * 32 + 8, 20 * 32 + 8], run: true, speed: 300 }, { move: 'cs2', px: [37 * 32 + 20, 21 * 32 + 8], run: true, speed: 300 }] },   // 오른쪽 길로 달려 동상 벽 바로 앞까지
  { async: [{ parallel: [{ move: 'cs1', px: [45 * 32, 20 * 32 + 8], run: true, speed: 320 }, { move: 'cs2', px: [45 * 32, 21 * 32 + 8], run: true, speed: 320 }] }, { remove: 'cs1' }, { remove: 'cs2' }] },   // 멈추지 않고 쓱 지나간다(맵 밖으로)
  { wait: 0.26 },                                     // 미니언이 동상 열(x 1248~1280)을 통과하는 순간(320px/s) — 지나가자마자 펑 (사용자 2026-09-10)
  // 펑! 다섯이 한꺼번에 사방으로 튀어나가 빙글빙글 돌며 화면 밖으로 (fling: 속도+중력, 이전 hop 은 히트박스 소품의 가로 이동이 그림에 안 보였음)
  // 폭발 애니·소리는 사용자가 준 영상에서 누끼·오디오를 딴 것 — 설정은 src/data/fx.js 의 FX.explosion 한 곳에서
  { sfx: FX.explosion.sfx }, { shake: 0.5, amp: 9 },
  { async: [{ boom: { ...FX.explosion, at: 'statue_w3', scale: 2 } }] },
  { async: [{ wait: 0.07 }, { boom: { ...FX.explosion, at: 'statue_w1', scale: 1.25, offset: [-6, -10] } }] },
  { async: [{ wait: 0.14 }, { boom: { ...FX.explosion, at: 'statue_w5', scale: 1.25, offset: [8, 12] } }] },
  { async: [{ fling: 'statue_w1', vx: 150, vup: 860, spin: 13 }] },
  { async: [{ wait: 0.03 }, { fling: 'statue_w2', vx: 360, vup: 680, spin: -15 }] },
  { async: [{ wait: 0.01 }, { fling: 'statue_w3', vx: -90, vup: 940, spin: 16 }] },
  { async: [{ wait: 0.05 }, { fling: 'statue_w4', vx: 440, vup: 520, spin: -11 }] },
  { async: [{ wait: 0.02 }, { fling: 'statue_w5', vx: 240, vup: 760, spin: 14 }] },
  { set: { statues_cleared: true } },
  { wait: 1.1 },
  { wait: 0.6 },
  { fade: 'out', duration: 0.35 },
  // 주인공 화면으로
  { map: 'teal3', spawn: 'box' },
  { camera: 'player' },
  { fade: 'in', duration: 0.5 },
  N('* ...{w=0.7} 어찌저찌 된거같다.'),
  N('* {c=yellow}전투를 할 수 있게 되었다!{/c}'),
  { sfx: 'item' }, { action: (g) => { g.inventory.push('바나나', '바나나'); } },
  N('* 상자 안에 있던 {c=yellow}바나나{/c} 2개를 챙겼다.'),   // 첫 힐템 (내가 넣음 — 위치는 바꿔도 됨)
  { end: true },
  { label: 'again' },
  N('* 공구상자다.{w=0.4} 뭔가 많이 들어 있다.'),
  { end: true },
  { label: 'alone' },
  N('* 공구상자다.'),
];
