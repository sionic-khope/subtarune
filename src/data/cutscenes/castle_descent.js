// BUILD358 사용자 브리핑(2026-09-26): 꼭대기에서 뛰어내린 뒤 — 끝없는 길(섭 몬스터·편집노조·영클 레이저) → 뗏목 웅덩이(벽 타고 상승). 대사·표기 원문 그대로.
const P = text => ({ speaker: '억빠맨', portrait: 'ppaman', voice: 'ppaman', text: `* ${text}` });
const K = text => ({ speaker: '경섭', portrait: 'gyeongsub', voice: 'gyeongsub', text: `* ${text}` });
const YC = (text, face = 'smirk') => ({ speaker: '영클', portrait: `youngcle_tv_${face}`, voice: 'youngcle', text: `* ${text}` });
const close = { action: game => game.textbox.close() };
const scene = fn => ({ action: game => (game.castleDescent ? fn(game.castleDescent, game) : undefined) });
const at = (x, y) => [(x - 16) / 32, (y - 16) / 32];
const PARTY = ['player', 'gyeongsub', 'ppaman'];
const faceAll = dir => PARTY.map(id => ({ face: id, dir }));

/** 꼭대기 부서진 끝에서 일행이 차례로 뛰어내린다 → 페이드 → 끝없는 길(격파 연출 끝·다시 끝에 닿았을 때 공용). */
export const SUMMIT_LEAP = [
  close,
  ...faceAll('right'),
  { parallel: PARTY.map((id, i) => [{ wait: i * 0.35 }, { move: id, px: [1726, 380], run: true, facing: 'right' },
    { action: game => game.castleSummit?.leapOff(id) }]) },
  { fade: 'out', duration: 0.8 },
  { map: 'gajaeman_castle_skyroad', spawn: 'start', enter: true, bgm: false },
];
export const castle_summit_leap = Object.assign([...SUMMIT_LEAP, { end: true }], { silent: true });

// 끝없는 길: 착지 자리(발) — 맨 왼쪽 위
const LAND = { player: [104, 176], gyeongsub: [70, 204], ppaman: [42, 232] };
export const castle_road_intro = Object.assign([
  { if: flags => !!flags.castle_road_landed, goto: 'end' },
  close,
  ...PARTY.map(id => ({ hide: id })),
  scene(s => { for (const [id, [x, y]] of Object.entries(LAND)) { const e = s.ent(id); if (e) s.setFeet(e, x, y); } }),
  { camera: at(240, 200), duration: 0.01 },
  { fade: 'in', duration: 0.8 }, { wait: 0.3 },
  // 먼저 가재맨이 오오라와 함께 오른쪽으로 도망간다
  scene(s => s.gajaemanDash([-80, 250], [640, 200], 2.2)), scene(s => s.hideGajaeman()), { wait: 0.5 },
  // 이어서 주인공들이 맨 왼쪽 위에 착지
  { parallel: PARTY.map((id, i) => [{ wait: i * 0.22 }, { drop: id, height: 320, duration: 0.55, quake: 3 }]) },
  { wait: 0.4 }, ...faceAll('right'),
  { set: { castle_road_landed: true } },
  { camera: 'player' },
  { label: 'end' }, { end: true },
], { silent: true });

/** 구간 하나: 섭 몬스터가 위·아래에서 뛰어들고 → 일행 ! → 다가섬 → 편집노조가 들어와 날려 버린다. */
const zone = (n, flag, strike) => Object.assign([
  { if: flags => !!flags[flag], goto: 'end' }, { set: { [flag]: true } },
  close, ...faceAll('right'),
  scene(s => s.ambush(n)),
  { parallel: PARTY.map(id => ({ emote: id, kind: '!', duration: 0.8, hold: 0.4 })) },
  scene(s => s.creep(n)),
  scene(s => s.allyIn(n)), { wait: 0.15 },
  ...strike,
  { wait: 0.6 },
  { label: 'end' }, { end: true },
], { silent: true });
// 1: 오른쪽 위에서 비데(도끼) · 2: 왼쪽 아래에서 파크가디언(인사) · 3: 오른쪽 위에서 뚜울라와 도트마리오(밟기)
export const castle_road_z1 = zone(1, 'castle_road_z1', [{ parallel: [{ motion: 'road_bidet', name: 'axe_strike' }, [{ wait: 0.45 }, scene(s => s.knock(1))]] }]);
export const castle_road_z2 = zone(2, 'castle_road_z2', [scene(s => s.knock(2)), { motion: 'road_park', name: 'bow' }]);
export const castle_road_z3 = zone(3, 'castle_road_z3', [{ parallel: [{ hop: 'road_mario', by: [0, 0], height: 34, sfx: 'mario_jump' }, [{ wait: 0.3 }, scene(s => s.knock(3))]] }]);

/** 길 끝: 검 네 자루가 날아오고 영클이 세 번 쏴서 지켜 준다 → “빨리 가샘” → 뗏목 웅덩이로. */
export const castle_road_end = Object.assign([
  { if: flags => !!flags.castle_road_done, goto: 'leave' },
  close, ...faceAll('right'),
  scene(s => s.summonSwords()),
  { parallel: PARTY.map(id => ({ emote: id, kind: '!', duration: 0.8, hold: 0.4 })) },
  { parallel: [scene(s => s.youngcleIn()), [{ wait: 0.3 }, { sfx: 'laser_charge', volume: 0.6 }]] },
  scene(s => s.volley()),
  { wait: 0.7 },
  ...faceAll('left'), { wait: 0.3 },
  YC('빨리 가샘 가서 족치고오샘 ㅇㅇ'), close,
  { set: { castle_road_done: true } },
  { label: 'leave' },
  close, ...faceAll('right'),
  { parallel: PARTY.map((id, i) => [{ wait: i * 0.15 }, { move: id, px: game => [2520, (id === 'player' ? game.player : game.entities.find(e => e.id === id)).y], run: true, facing: 'right' }]) },
  { fade: 'out', duration: 0.8 },
  { map: 'gajaeman_castle_raft', spawn: 'start', enter: true, bgm: false },
  { end: true },
], { silent: true });

/** 뗏목 웅덩이: 가재맨이 벽 앞에서 위로 → 일행이 물 옆으로 → 대사 → 요플래 뗏목, 둘은 물 속에서 기를 모아 동시에 점프. */
export const castle_raft_intro = Object.assign([
  { if: flags => !!flags.castle_raft_launched, goto: 'end' },
  close,
  { camera: at(470, 1250), duration: 0.01 },
  { fade: 'in', duration: 0.8 }, { wait: 0.2 },
  // 가재맨이 쭉 앞으로 가다가 벽 앞에서 위로 상승
  scene(s => s.gajaemanDash([180, 1300], [480, 1250], 1.8)), { wait: 0.3 },
  { parallel: [scene(s => s.gajaemanRise(1000, 2.0)), [{ wait: 0.3 }, { camera: at(470, 900), duration: 1.6 }]] },
  { wait: 0.5 },
  { camera: at(430, 1290), duration: 1.4 },
  // 주인공들이 뗏목엔 타지 않고 물 바로 옆으로 뛰어온다
  { parallel: PARTY.map((id, i) => [{ wait: i * 0.12 }, { move: id, rel: `raft_stand_${id}`, at: 'bottom', by: [0, 0], run: true, facing: 'right' }]) },
  ...faceAll('up'), { wait: 0.5 },
  P('올라갔어요!'), K('윽.'),
  { face: 'ppaman', dir: 'up' }, P('경섭이형'),
  { face: 'gyeongsub', dir: 'down' }, K('응'),
  P('지금 저랑 같은생각 하고 계시죠'), K('그런것같다.'),
  { face: 'gyeongsub', dir: 'right' }, { face: 'ppaman', dir: 'right' },
  P('갈까요!!! 요플래형 부탁해요'), close,
  { wait: 0.4 },
  // 둘은 물에 들어가고 요플래는 점프해서 가운데 뗏목에
  { parallel: [scene(s => s.board()), [{ wait: 0.25 }, scene(s => s.dive('gyeongsub', -1))], [{ wait: 0.45 }, scene(s => s.dive('ppaman', 1))]] },
  { wait: 0.5 },
  // 물 아래에서 2초 동안 진동하며 가라앉아 기를 모은다 → 동시에 점프! 뗏목과 요플래가 벽을 따라 위로
  scene(s => s.gather()),
  scene(s => s.launch()),
  { wait: 0.4 },
  { set: { castle_raft_launched: true } },
  { camera: 'player' },
  { label: 'end' }, { end: true },
], { silent: true });
