const G = (text) => ({ speaker: '경섭', portrait: 'gyeongsub', voice: 'gyeongsub', text });
const P = (text) => ({ speaker: '억빠맨', portrait: 'ppaman', voice: 'ppaman', text });

export const obj5_chase = [
  { if: (f) => f.obj5_chase_started || f.obj5_chase_cleared, goto: 'sea' },
  { camera: [23, 11], duration: 0.45 },
  { parallel: [
    { move: 'player', rel: 'gun_chest', at: 'bottom', by: [-44, 38], run: true },
    { move: 'ppaman', rel: 'gun_chest', at: 'bottom', by: [20, 66], run: true },
    { move: 'gyeongsub', rel: 'gun_chest', at: 'bottom', by: [-108, 66], run: true },
  ] },
  { face: 'ppaman', dir: 'up' },
  { face: 'gyeongsub', dir: 'right' },
  P('* 어 형 여기 총이 있어요.'),
  G('* 어서 이거 타고 쫒아가자. 그거 챙겨'),
  { action: (game) => {
    if (game.has('obj5_gun_taken')) return;
    game.inventory.push('나무총');
    game.setFlag('obj5_gun_taken');
  } },
  { sfx: 'item' },
  { move: 'player', rel: 'obj5_raft', at: 'left', by: [-4, 0], run: true },
  { action: (game) => game.entities.find((e) => e.id === 'obj5_raft').board(game.player) },
  { move: 'ppaman', rel: 'obj5_raft', at: 'left', by: [-4, 6], run: true },
  { sfx: 'splash' }, { raft: 'obj5_raft', swim: 'ppaman' },
  { move: 'gyeongsub', rel: 'obj5_raft', at: 'left', by: [-4, 40], run: true },
  { sfx: 'splash' }, { raft: 'obj5_raft', swim: 'gyeongsub' },
  { wait: 0.3 },
  G('* 근데 우리 아직도 수영을 해야하니 저기 좀 넓어보이는데'),
  P('* 네'),
  { camera: 'player' },
  { raft: 'obj5_raft', go: true },
  { raft: 'obj5_raft', holdAt: 1200 },
  { set: { obj5_chase_started: true } },
  { label: 'sea' },
  { seaChase: true },
  { end: true },
];

export const obj5_resume = [
  { if: (f) => !f.obj5_chase_started && !f.obj5_chase_cleared, goto: 'end' },
  { seaChase: true },
  { label: 'end' },
  { end: true },
];
