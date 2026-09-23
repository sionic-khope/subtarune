const B = text => ({ speaker: '따듯한비데', portrait: 'warm_bidet', voice: 'warm_bidet', text: `* ${text}` });
const K = text => ({ speaker: '경섭', portrait: 'gyeongsub', voice: 'gyeongsub', text: `* ${text}` });
const P = text => ({ speaker: '억빠맨', portrait: 'ppaman', voice: 'ppaman', text: `* ${text}` });
const N = text => ({ voice: 'narrator', text: `* ${text}` });
const BIDET = 'castle_warm_bidet', MARIO = 'castle_dot_mario';
const PARTY = ['player', 'gyeongsub', 'ppaman'];
const GUARDS = [[BIDET, 'bidet'], [MARIO, 'mario'], ['castle_guard_gyeongsub', 'gyeongsub'], ['castle_guard_ppaman', 'ppaman']];
const close = { action: game => game.textbox.close() };
const at = (id, rel, extra = {}) => ({ move: id, rel, at: 'bottom', exact: true, ...extra });
const meetingCamera = { camera: [13, 21], duration: 1.3 };
const openAperture = { action: game => {
  game.entities.find(entity => entity.id === 'castle_monster_aperture').doorOpening = {
    inset: [34, 68, 188, 240], progress: 1,
  };
} };

/** Restore the stationary defenders when revisiting after the party split. */
export function restoreCastleDefenders(game) {
  for (const [id, anchor] of GUARDS) {
    const actor = game.entities.find(entity => entity.id === id);
    const point = game.entities.find(entity => entity.id === `fork_${anchor}_guard`);
    actor.x = point.x; actor.y = point.y; actor.facing = 'up'; actor.visible = true; actor.moving = false;
  }
}

/** Preserve the two actors' exact positions before standard party removal respawns followers. */
export function separateCastleParty(game) {
  for (const id of ['gyeongsub', 'ppaman']) {
    const follower = game.entities.find(entity => entity.id === id);
    const actor = game.entities.find(entity => entity.id === `castle_guard_${id}`);
    actor.x = follower.x; actor.y = follower.y; actor.facing = follower.facing; actor.visible = true;
  }
}

export const castle_malzahar_intro = Object.assign([
  openAperture,
  { if: flags => !!flags.castle_malzahar_split, goto: 'after' },
  close,
  { parallel: PARTY.map(id => ({ emote: id, kind: '!', duration: 0.9, hold: 0.45, sfx: 'chime' })) },
  { camera: [13.5, 20.5], duration: 1.4 }, { wait: 0.6 },
  { parallel: [meetingCamera, ...PARTY.map(id => at(id, `fork_${id}`, { speed: 72 }))] },
  { face: BIDET, dir: 'down' }, { face: MARIO, dir: 'down' }, { wait: 0.5 },
  P('오 ㅎㅇ'), B('오.'), close,
  { hop: MARIO, by: [0, 0], height: 22, duration: 0.45, sfx: 'jump' }, { wait: 0.5 },
  B('하이'), K('어 비데야 여기서 뭐하고있어?'),
  B('보다싶이, 여기를 조사하고 있는데요'), B('문제가 있어요.'), K('응 어떤문제?'),
  B('저기 오른쪽에'), close,
  { face: BIDET, dir: 'right' }, { camera: [34, 19], duration: 1.6 }, { wait: 0.6 },
  B('이상한 결계같은게 있는데 제가 들어가도 다시 튕겨져 나오더라구요'), K('그렇구나'),
  B('어떻게든 비집고 들어갈순있는데 그동안 문제가 저기 윗구멍에서'), close,
  { camera: [22, 6.5], duration: 1.6 }, { wait: 0.6 },
  B('몬스터들이 나와요.'),
  B('그래서 제가 뚫는동안 도트마리오가 막고있었는데 무리가있어서.'),
  B('제가 뚫어보려다가 다시 돌아와서 몬스터들을 잡았어요.'), close,
  meetingCamera, { face: BIDET, dir: 'down' }, { wait: 0.5 },
  P('흐음..'), P('어떻게할까요?'), N('내가 저 길을 뚫을 수 있다고 말했다.'),
  P('그게 정말인가요?'), K('흠 그러면 하나뿐인가'), B('어떻게 하시게요?'),
  K('요플래를 믿고 우리들끼리 위에 몬스터들을 막고있자'), B('그렇군요'),
  P('아마 저기 끝에 뭔가가 있으니까 막아둔거겠죠?'), K('아마 그럴거같아 요플래 부탁한다.'), close,
  { action: separateCastleParty }, { leave: 'gyeongsub' }, { leave: 'ppaman' },
  { parallel: [
    [at(BIDET, 'fork_right_turn', { axis: 'x', speed: 72 }), at(BIDET, 'fork_bidet_guard', { axis: 'y', speed: 72 }), at(BIDET, 'fork_bidet_guard')],
    [{ wait: 0.2 }, at(MARIO, 'fork_right_turn', { axis: 'x', by: [64, 0], speed: 72 }), at(MARIO, 'fork_mario_guard', { speed: 72 })],
    [{ wait: 0.4 }, at('castle_guard_gyeongsub', 'fork_right_turn', { axis: 'x', speed: 72 }), at('castle_guard_gyeongsub', 'fork_gyeongsub_guard', { axis: 'y', speed: 72 }), at('castle_guard_gyeongsub', 'fork_gyeongsub_guard')],
    [{ wait: 0.6 }, at('castle_guard_ppaman', 'fork_right_turn', { axis: 'y', by: [0, 84], speed: 72 }),
      at('castle_guard_ppaman', 'fork_right_turn', { axis: 'x', by: [-44, 0], speed: 72 }),
      at('castle_guard_ppaman', 'fork_ppaman_farewell', { axis: 'y', speed: 72 })],
    [{ wait: 0.95 }, at('player', 'fork_right_turn', { axis: 'x', speed: 72 }), at('player', 'fork_player_wait', { axis: 'y', speed: 72 })],
    [{ camera: [20, 22], duration: 2.6 }, { camera: [21, 15], duration: 2.8 }],
  ] },
  ...GUARDS.map(([id]) => ({ face: id, dir: 'up' })),
  { face: 'castle_guard_ppaman', dir: 'toward:player' }, { face: 'player', dir: 'toward:castle_guard_ppaman' },
  { wait: 0.5 }, P('몸조심하세요 형.'), close,
  at('castle_guard_ppaman', 'fork_ppaman_guard', { speed: 62 }),
  { face: 'castle_guard_ppaman', dir: 'up' }, { face: 'player', dir: 'right' },
  { stage: 'castle_malzahar_split' }, { camera: 'player' }, { end: true },
  { label: 'after' }, { action: restoreCastleDefenders }, { camera: 'player' }, { end: true },
], { silent: true });

export const castle_malzahar_run = Object.assign([
  { action: game => {
    if (game.runner || game.player.facing !== 'right') return;
    game.startRunner({ ...game.map.def.meta.runs.a, id: 'a' });
  } }, { end: true },
], { silent: true });

export const castle_malzahar_end_door = Object.assign([
  close, { sfx: 'locker' }, { fade: 'out', duration: 0.55 },
  { map: 'gajaeman_castle_orb', spawn: 'start' },
  { bgm: 'castle_orb', volume: 0.5, fadeIn: 0.7 },
  { fade: 'in', duration: 0.7 }, { end: true },
], { silent: true });
