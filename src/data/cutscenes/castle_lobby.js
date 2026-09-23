import { CASTLE_LOBBY, prepareCastleLobby, finishCastleLobby } from '../../scenes/castle-lobby.js';
import { armInvasionInterruption } from './ship_invasion.js';

const V = text => ({ speaker: '영클', portrait: 'youngcle', voice: 'youngcle', text: `* ${text}` });
const J = text => ({ speaker: '쥰희', portrait: 'junhee', voice: 'junhee', text: `* ${text}` });
const P = text => ({ speaker: '억빠맨', portrait: 'ppaman', voice: 'ppaman', text: `* ${text}` });
const K = text => ({ speaker: '경섭', portrait: 'gyeongsub', voice: 'gyeongsub', text: `* ${text}` });
const A = text => ({ speaker: '가재맨', voice: 'gajaeman_shadow', text: `* ${text}` });
const Y = CASTLE_LOBBY.youngcle, G = CASTLE_LOBBY.gajaeman, JH = 'castle_lobby_junhee';
const PARTY = ['player', 'gyeongsub', 'ppaman'];
const close = { action: game => game.textbox.close() };
const at = (id, anchor, by = [0, 0], extra = {}) => ({ move: id, rel: anchor, at: 'bottom', by, ...extra });
const face = (ids, dir) => ids.map(id => ({ face: id, dir }));
const beat = name => ({ castleLobbyBeat: name, action: game => game.castleLobby.setBeat(name) });
const waitBeat = { action: game => {
  const scene = game.castleLobby;
  return new Promise(resolve => game.background.push({ update() {
    if (!scene.done && game.castleLobby === scene) return false;
    resolve(); return true;
  } }));
} };
const dialogueCamera = { camera: [19.5, 17], duration: 1.4 };

/** Place initial actors behind the reveal; all coordinates belong to named map anchors. */
export function prepareCastleLobbyActors(game) {
  const find = id => id === 'player' ? game.player : game.entities.find(entity => entity.id === id && !entity.dead);
  for (const [id, anchor] of [[Y, 'lobby_youngcle'], [JH, 'lobby_junhee'], [G, 'lobby_gajaeman'],
    ...PARTY.map(id => [id, `lobby_entry_${id}`])]) {
    const entity = find(id), point = find(anchor);
    entity.x = point.x; entity.y = point.y; entity.facing = id === G ? 'left' : 'up';
    entity.visible = id !== G; entity.moving = false; entity.flyX = 0; entity.flyY = 0; entity.spin = 0;
  }
  game.player.trail = [];
}

export const castle_lobby_intro = Object.assign([
  { if: flags => !!flags.castle_lobby_seen, goto: 'end' },
  close, { bgm: null, fadeOut: 0.4 }, { action: prepareCastleLobbyActors },
  { action: prepareCastleLobby },
  { camera: [19.5, 14], duration: 0.01 },
  beat('raid'), waitBeat, beat('idle'),
  { camera: [19.5, 6.5], duration: 1.3 }, { wait: 0.65 },
  { parallel: [dialogueCamera, at(JH, 'lobby_junhee', [0, 80]),
    ...PARTY.map(id => at(id, `lobby_${id}`, [0, 0], { speed: 64 }))] },
  ...face(PARTY, 'up'), { face: JH, dir: 'down' }, { face: Y, dir: 'right' }, { wait: 0.5 },
  V('흠.'), J('여기 뒤에 그새끼가 있는거같지만, 잠겨있다.'),
  V('아무래도 뭔가 열 방법이 필요할거같음.'), P('일단 왼쪽 오른쪽 흩어져볼까요'),
  A('ㅋㅋ'), close,
  { parallel: [...PARTY, Y, JH].map(id => ({ emote: id, kind: '!', duration: 1, hold: 0.5, sfx: 'chime' })) },
  ...face([...PARTY, Y, JH], `toward:${G}`),
  beat('descend'),
  { parallel: [
    { darkSmoke: { mode: 'cloak', from: G, duration: CASTLE_LOBBY.duration.descend,
      veil: 0, aura: { at: G, colors: ['#090711', '#3e245a'] } } },
    { bgm: 'castle_gajaeman', volume: 0.5, fadeIn: 1.2 },
  ] }, waitBeat, beat('idle'), { wait: 0.5 },
  { action: game => armInvasionInterruption(game, '* 다들 반갑..', '갑') },
  { ...A('다들 반갑..'), cut: 999 }, close,
  beat('dodge'), waitBeat, beat('idle'),
  A('어이코'), A('이런이런 그러지말게 ㅋㅋㅋ'), A('쓰레기같은 너희들에게 내 최종무기를 보여주지'),
  V('니애미'), A('아 물론 지금은 안보여줄거임 ㅋㅋ'),
  A('이 문을 뚫어서 나에게 도달해봐라 그전에 죽겠지만'), J('개같은새끼'),
  A('ㅋㅋㅋㅋ 너희들의 발버둥은 아무 의미없다 이거야'), V('니 뜻대로 안될거임,'),
  V('이미 엄청대박인배에 있던 생존자들을 내가 플랜Z로 준비해둔'),
  V('마이야르전함에 옮겨담기 박스가 작동해서 다 살았을거임 아마'),
  V('... 용준이빼고'), A('ㅋㅋㅋㅋ 어차피 곧 내가 다 죽일건데 무슨상관?'),
  A('나대지말고 니애미따라가라ㅋㅋㅋㅋ 난 간다~'), close,
  beat('depart'), waitBeat, { darkSmoke: null }, { remove: G }, beat('idle'), { wait: 0.5 },
  V('2런'), J('젠장 일단 어떻게 해야하지'),
  V('난 왼쪽문으로 가보겠음 아마 왼쪽 오른쪽 문에 각각 여기문을 열수있는 장치가 있는듯'),
  J('그걸 어떻게 알지?'), V('편집노조애들이 방금 브리핑 쳐줌'), J('ㅇㅎ'),
  V('타코 니는 따라오고 님들은 오른쪽을 부탁'), V('ㅂㅂ'), close,
  { parallel: [
    [at(Y, 'lobby_left_turn', [0, 0], { run: true, axis: 'y' }),
      at(Y, 'lobby_left_door', [0, 132], { dash: true, axis: 'x' }),
      at(Y, 'lobby_left_door', [0, 0], { run: true }),
      { doorTransit: { actor: Y, door: 'castle_lobby_left_door', inset: [34, 68, 188, 240], duration: 0.75 } }, { remove: Y }],
    [{ wait: 0.2 }, at(JH, 'lobby_left_turn', [0, 34], { run: true, axis: 'y' }),
      at(JH, 'lobby_left_door', [0, 166], { dash: true, axis: 'x' }),
      at(JH, 'lobby_left_door', [0, 0], { run: true }),
      { doorTransit: { actor: JH, door: 'castle_lobby_left_door', inset: [34, 68, 188, 240], duration: 0.75, closeAfter: true } }, { remove: JH }],
    { camera: [12.5, 17], duration: 1.5 },
  ] },
  dialogueCamera, ...face(PARTY, 'up'),
  P('...'), P('요플래형 경섭이형'), K('어'), P('가시죠.'), K('가자.'), close,
  { bgm: null, fadeOut: 0.7 }, { action: game => finishCastleLobby(game) },
  { camera: 'player' }, { regroup: true }, { stage: 'castle_lobby_seen' },
  { label: 'end' }, { end: true },
], { silent: true });

export const castle_lobby_left_block = Object.assign([
  { if: flags => !flags.castle_lobby_seen, goto: 'end' },
  { face: 'ppaman', dir: 'toward:player' }, P('형 여기가 아니에요.'), close,
  at('player', 'lobby_left_block_return', [0, 0], { speed: 60 }),
  { face: 'player', dir: 'right' }, { regroup: true }, { label: 'end' }, { end: true },
], { silent: true });

export const castle_lobby_sealed = [{ text: '* 문이 잠겨 있다.\n* 두 개의 검은 구체가 달려 있다.', voice: 'narrator' }, { end: true }];

export const castle_lobby_enter = Object.assign([
  close, { sfx: 'locker' }, { fade: 'out', duration: 0.55 },
  { map: 'gajaeman_castle_lobby', spawn: 'start', enter: true, bgm: false },
  { fade: 'in', duration: 0.6 }, { end: true },
], { silent: true });

export const castle_lobby_right_enter = Object.assign([
  close, { sfx: 'locker' }, { fade: 'out', duration: 0.55 },
  { map: 'gajaeman_castle_right1', spawn: 'start', enter: true },
  { bgm: 'castle_right', volume: 0.5, fadeIn: 1.2 },
  { fade: 'in', duration: 0.7 }, { end: true },
], { silent: true });
