// 무대 홀(youngcle11) 입장 연출 — 2026-09-15 사용자 브리핑 원문 그대로. 콘티: design/narrative/cutscenes/stage_hall.md
// 맵 `enter`(early) 로 한 번 실행되고 `stage_hall_intro_done` 으로 재입장 반복 없음. 끝나면 무대 불은 켜진 채(`stage_hall_lit`, 어둠 막은 unless) 뚜울라가 무대 가운데에서 기다린다(`ttuulla_wait`).
// 좌표는 전부 기준물 상대: 아래 문(youngcle11_down)·무대 가운데(stage11_center)·오른쪽 계단(stage11_stairs_1).
import { beginEditorUnionStage } from '../../scenes/editor-union-effects.js';
import { MAPS } from '../maps.js';
const MOUSE = 'ttuulla', CENTER = 'stage11_center', DARK = 'stage11_dark', DOOR = 'youngcle11_down', STAIRS_R = 'stage11_stairs_1';
const PARTY = ['player', 'gyeongsub', 'ppaman'];
// 관객(사용자 아이디어, BUILD179): 맵 meta.crowd(자리표·시트)를 읽어 아래 문 앞에 숨겨 만든 뒤 0.2초 간격으로 차례로 걸어 들어와 자리를 채운다.
// 자리는 tools/maps/youngcle11.py 가 원본(재입장용 requires NPC 와 같은 id·자리). 다 들어오면 막힘으로 바꾸고 줄(stage11_rope_l/r)을 친다
const CROWD_N = 28, CROWD_GAP = 0.2;
const crowdIds = Array.from({ length: CROWD_N }, (_, i) => `crowd_${i}`);
const spawnCrowd = { action: game => {
  const door = game.entities.find(e => e.id === DOOR);
  for (const c of MAPS.youngcle11?.meta?.crowd || []) {
    if (game.entities.some(e => e.id === c.id && !e.dead)) continue;
    game.spawn({ type: 'npc', id: c.id, sprite: c.sprite, x: door ? door.x + door.w / 2 - 12 : 404, y: door ? door.y - 24 : 728, facing: 'up', wander: 0, solid: false, hidden: true, visualScale: c.scale });
  }
} };
const crowdSpot = (id) => () => { const c = (MAPS.youngcle11?.meta?.crowd || []).find(x => x.id === id); return c ? [c.x, c.y] : [404, 600]; };
const crowdSettle = { action: game => { for (const e of game.entities) if (e.id?.startsWith('crowd_')) { e.solid = true; e.facing = 'up'; } } };
const P = text => ({ speaker: '억빠맨', portrait: 'ppaman', voice: 'ppaman', text: '* ' + text });
const G = text => ({ speaker: '경섭', portrait: 'gyeongsub', voice: 'gyeongsub', text: '* ' + text });
const T = text => ({ speaker: '뚜울라알라', portrait: MOUSE, voice: MOUSE, text: '* ' + text });
const close = { action: game => game.textbox.close() };
// 뒷걸음질: 돌아서지 않고(hop 은 방향을 안 바꾼다) 살짝 뒤로
const backstep = PARTY.map(id => ({ hop: id, by: [0, 28], height: 3, duration: 0.25, sfx: false }));
// 브금(사용자 지정 유튜브 YsZoTTl59hg “MIKE, the BOARD, please!” 37초 중 음악은 32.8초까지 → 거기서 되감기)
const HALL_BGM = { bgm: 'mike_board', volume: 0.5, fadeIn: 0.2, loopEnd: 32.8, loopFade: 0.12 };

export const stage_hall_intro = [
  { if: flags => flags.stage_hall_intro_done, goto: 'end' },
  { bgm: null },
  // 페이드인과 함께 일행이 아래 문에서 걸어 들어온다
  { parallel: [
    { move: 'player', rel: DOOR, at: 'top', by: [0, -200] },
    { move: 'gyeongsub', rel: DOOR, at: 'top', by: [-44, -160] },
    { move: 'ppaman', rel: DOOR, at: 'top', by: [44, -160] },
  ] },
  { wait: 0.2 },
  // 어두운 무대 쪽으로 카메라 — 무대와 일행이 한 화면에(줌 0.75 = 640×480, 위로 맵 밖이 안 보이게 중심 y320)
  { parallel: [{ camera: [13, 9.5], duration: 1.3 }, { zoom: 0.75, duration: 1.3 }] },
  { wait: 0.4 },
  P('무 무대..?뭐지'),
  close,
  // 무대 아래 앞으로
  { parallel: [
    { move: 'player', rel: CENTER, at: 'bottom', by: [0, 176] },
    { move: 'gyeongsub', rel: CENTER, at: 'bottom', by: [-52, 192] },
    { move: 'ppaman', rel: CENTER, at: 'bottom', by: [52, 192] },
  ] },
  ...PARTY.map(id => ({ face: id, dir: 'up' })),
  { wait: 0.5 },
  // 철컥!(델타룬 snd_locker) → 무대에 불이 켜진다(어둠 막 제거 + 흰 번쩍 + 스포트라이트) → 거기 뚜울라가 서 있다
  { sfx: 'locker' },
  { wait: 0.4 },
  { action: game => beginEditorUnionStage(game) },
  { remove: DARK },
  { show: MOUSE },
  { parallel: [{ editorUnion: { kind: 'light', spotlight: 1, dim: 0.22, duration: 0.5 } }, { fade: 'white', duration: 0.06 }] },
  { fade: 'in', duration: 0.35 },
  T('안녕하십니까 악덕사장형님들'),
  close,
  // 점프하면서 무대 가운데에서 밑(홀 바닥, 일행 바로 앞)으로 — 일행은 뒷걸음질. 착지에 브금
  { parallel: [{ hop: MOUSE, by: [0, 176], height: 72, duration: 0.7, sfx: 'jump' }, ...backstep, { camera: [13, 9], duration: 0.7 }] },
  { sfx: 'thud' },
  { face: MOUSE, dir: 'down' },
  HALL_BGM,
  T('반가워용'),
  P('머하냐 너 ㅅㅂ새끼야'),
  T('ㅋㅋ 너무 그러진 마시구요 파크가디언이랑 비데를 이긴건 칭찬드리겠습니다.'),
  P('무대를 보니까 너도 뭘 준비한거같은데?'),
  T('네네 정확하십니다. 사실 인면견 씨 ㅡ 발새끼가 내가 준비한거 뺏어서 제발 저거 써달라고 지랄해서 이걸로함'),
  P('저게 뭔데?'),
  T('헤헤 저는 여러분들을 쓰러트릴거지만 정정당당한 승부를 좋아합니다.'),
  P('그렇군 발병신'),
  T('... 그렇지만 치고받고 싸우는건 제가 잘 못해서용'),
  P('그럼?'),
  T('무대 위에서 정정당당히 노래로 승부봅시다!!!!!!!'),
  close,
  // 브금이 꺼지고 일행 ...
  { bgm: null, fadeOut: 0.6 },
  { bubble: PARTY, dots: 3, gap: 0.35, hold: 0.7 },
  { ...P('뭐라는거야 개발병신새끼 야차까 지금 걍 씨발년아 들어ㅇ..'), cut: 1.45 },
  T('워워워 먼저 올라가서 기다리고 있겠습니다 행님덜~'),
  T('아 맞다. 그리고 이걸 구경하러온 관객들도 여기 많이 모여있습니다'),
  T('들어와주세요 ~~!'),
  close,
  // 관객 입장: 카메라가 아래 입구 쪽으로 → 파크가디언·비데·도트마리오·엑스트라들이 문에서 차례로 걸어 들어와 아래쪽을 채운다(박수) → 줄을 친다
  ...PARTY.map(id => ({ face: id, dir: 'down' })),
  { parallel: [{ camera: [13, 17], duration: 0.8 }, { zoom: 0.7, duration: 0.8 }] },
  spawnCrowd,
  { sfx: 'door' },
  { async: [{ sfx: 'crowd', volume: 0.7 }, { sfx: 'rumble', volume: 0.6 }, { wait: 1.6 }, { sfx: 'rumble', volume: 0.6 }, { wait: 1.8 }, { sfx: 'rumble', volume: 0.5 }] },
  ...crowdIds.map((id, i) => ({ async: [{ wait: i * CROWD_GAP }, { show: id }, { move: id, px: crowdSpot(id), run: true }] })),
  { wait: CROWD_N * CROWD_GAP + 2.6 },
  crowdSettle,
  { spawn: { type: 'prop', id: 'stage11_rope_l', image: 'assets/props/stage_rope_l.png', x: 32, y: 500, w: 352, h: 12, ix: 32, iy: 494, solid: true, sortY: 520 } },
  { spawn: { type: 'prop', id: 'stage11_rope_r', image: 'assets/props/stage_rope_r.png', x: 416, y: 500, w: 384, h: 12, ix: 416, iy: 494, solid: true, sortY: 520 } },
  { sfx: 'crowd_cheer', volume: 0.7 },
  { wait: 0.6 },
  ...PARTY.map(id => ({ face: id, dir: 'up' })),
  { parallel: [{ camera: [13, 9], duration: 0.9 }, { zoom: 0.75, duration: 0.9 }] },
  // 빠르게 오른쪽 계단으로 올라가 무대 가운데로 도망간다
  { move: MOUSE, rel: STAIRS_R, at: 'bottom', by: [0, 6], dash: true },
  { move: MOUSE, rel: STAIRS_R, at: 'top', by: [0, -12], dash: true },
  { move: MOUSE, rel: CENTER, at: 'bottom', by: [0, -40], dash: true },
  { face: MOUSE, dir: 'down' },
  // 카메라 주인공 쪽으로
  { parallel: [{ camera: 'player', duration: 0.8 }, { zoom: 1, duration: 0.8 }] },
  P('에휴 일단 가보죠'),
  G('뭐랄까 난 좀 기대되네 허허..'),
  close,
  { regroup: true },
  { set: { stage_hall_intro_done: true, stage_hall_lit: true } },
  { label: 'end' },
  // 연출 뒤 아래 문으로 다시 들어오면(관객·줄 뒤) 무대 앞으로 옮긴다 — 관객 사이를 지나온 셈
  { action: game => { if (game.flags.stage_hall_intro_done && game.player.y > 470) { game.player.x = 404; game.player.y = 330; game.player.facing = 'up'; for (const e of game.entities) if (e.def?.type === 'follower') e.snapBehind(); game.camera.snap?.(); } } },
];
