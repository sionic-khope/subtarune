import { CASTLE_PIPE as PIPE, CASTLE_MARIO as MARIO, animateCastlePipe, jumpIntoCastlePipe, submergeCastlePassengers } from '../../scenes/castle-pipe.js';

const BIDET = 'castle_return_bidet';
const P = text => ({ speaker: '억빠맨', portrait: 'ppaman', voice: 'ppaman', text: `* ${text}` });
const K = text => ({ speaker: '경섭', portrait: 'gyeongsub', voice: 'gyeongsub', text: `* ${text}` });
const B = text => ({ speaker: '따뜻한비데', portrait: 'warm_bidet', voice: 'warm_bidet', text: `* ${text}` });
const close = { action: game => game.textbox.close() };
const at = (id, rel, by = [0, 0], extra = {}) => ({ move: id, rel, at: 'bottom', by, exact: true, ...extra });
const talkCamera = { camera: [20, 19], duration: 1.3 };
const ready = { action: game => {
  const pipe = game.entities.find(entity => entity.id === PIPE);
  const mario = game.entities.find(entity => entity.id === MARIO);
  pipe.visible = true; pipe.solid = true; mario.visible = true; mario.solid = true;
} };

/** Runs after the orb-room exit fade, or restores the same waiting pipe on Continue. */
export const castle_pipe_emerge = Object.assign([
  { if: flags => !flags.castle_right_seal_active || flags.castle_pipe_returned, goto: 'end' },
  { if: flags => !!flags.castle_pipe_ready, goto: 'ready' },
  close, { parallel: [{ wait: 1.5 }, { camera: [22, 9], duration: 1.5 }] },
  { action: game => animateCastlePipe(game) },
  at(MARIO, 'castle_pipe_mouth', [0, 0], { speed: 4000 }),
  { sfx: 'mario_pipe' }, { emerge: MARIO, depth: 48, duration: 0.55 },
  { hop: MARIO, by: [52, 42], height: 36, duration: 0.6, keep: true, sfx: 'mario_jump' },
  { face: MARIO, dir: 'toward:player' }, { wait: 0.8 }, ready,
  { text: '* 토관을 타라는 것 같다.', voice: 'narrator' },
  { set: { castle_pipe_ready: true } },
  { camera: 'player' }, { end: true },
  { label: 'ready' }, ready,
  { label: 'end' }, { end: true },
], { silent: true });

/** C on the waiting pipe is the sole boarding input; arrival dialogue rejoins the party. */
export const castle_pipe_board = Object.assign([
  { if: flags => !flags.castle_pipe_ready || flags.castle_pipe_returned, goto: 'end' },
  close,
  { face: 'player', dir: 'up' }, { face: MARIO, dir: 'up' },
  { action: jumpIntoCastlePipe },
  { action: submergeCastlePassengers }, { wait: 0.2 },
  { fade: 'out', duration: 0.65 },
  { map: 'gajaeman_castle_lobby', spawn: 'from_pipe', bgm: false },
  { bgm: null, fadeOut: 0.3 }, { hide: 'player' },
  { camera: [20, 19], duration: 0 },
  { fade: 'in', duration: 0.75 },
  { action: game => animateCastlePipe(game) },
  at('player', 'lobby_pipe_mouth', [-12, 0], { speed: 4000 }),
  at(MARIO, 'lobby_pipe_mouth', [12, 0], { speed: 4000 }),
  { sfx: 'mario_pipe' },
  { parallel: [{ emerge: 'player', depth: 76, duration: 0.65 }, { emerge: MARIO, depth: 48, duration: 0.65 }] },
  { parallel: [
    { hop: 'player', by: [0, 104], height: 36, duration: 0.7, keep: true, sfx: 'jump' },
    { hop: MARIO, by: [72, 88], height: 40, duration: 0.7, keep: true, sfx: 'mario_jump' },
  ] },
  { action: game => animateCastlePipe(game, true) }, { remove: PIPE },
  { face: 'player', dir: 'up' }, { face: MARIO, dir: 'left' }, { wait: 0.8 },
  { emote: 'ppaman', kind: '!', duration: 1, hold: 0.55, sfx: 'chime' },
  P('형 성공하셨네요'), K('어 성공한거같다. 저기 불이 들어와있어.'), close,
  { camera: [21, 8], duration: 1.4 }, { wait: 1 }, talkCamera, { wait: 0.5 },
  B('저는 일단 왼쪽으로 가보려구요 영클형이랑 연락이 안됩니다.'),
  K('그렇군..'), P('네 아직 왼쪽에 불이 안들어와있어요.'), K('만약.'),
  K('요플래만 이 불을 킬 수 있는거라면?'), close,
  { emote: 'ppaman', kind: '!', duration: 1, hold: 0.55, sfx: 'chime' },
  P('아'), K('우리도 가야되지않을까.'), B('저희도 도울만큼 도우겠습니다.'),
  K('가자.'), P('그렇네요 갑시다'), B('먼저 가서 기다리겠습니다.'), close,
  { hop: MARIO, by: [0, 0], height: 24, duration: 0.5, sfx: 'mario_jump' },
  { parallel: [
    [at(BIDET, 'lobby_left_turn', [0, 0], { run: true, axis: 'y' }),
      at(BIDET, 'lobby_left_door', [0, 132], { dash: true, axis: 'x' }),
      at(BIDET, 'lobby_left_door', [0, 0], { run: true }),
      { doorTransit: { actor: BIDET, door: 'castle_lobby_left_door', inset: [34, 68, 188, 240], duration: 0.75 } }, { remove: BIDET }],
    [{ wait: 0.2 }, at(MARIO, 'lobby_left_turn', [0, 34], { run: true, axis: 'y' }),
      at(MARIO, 'lobby_left_door', [0, 166], { dash: true, axis: 'x' }),
      at(MARIO, 'lobby_left_door', [0, 0], { run: true }),
      { doorTransit: { actor: MARIO, door: 'castle_lobby_left_door', inset: [34, 68, 188, 240], duration: 0.75, closeAfter: true } }, { remove: MARIO }],
    { camera: [12.5, 17], duration: 1.5 },
  ] },
  talkCamera, { stage: 'castle_pipe_returned' },
  { join: 'gyeongsub' }, { join: 'ppaman' },
  { camera: 'player' }, { regroup: true },
  { label: 'end' }, { end: true },
], { silent: true });
