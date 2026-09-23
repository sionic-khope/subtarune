import { prepareShipInvasion, setInvasionBeat, finishShipInvasion } from '../../scenes/ship-invasion.js';
import { prepareShipDeckPoses, setShipDeckFist, clearShipDeckPoses } from '../../scenes/ship-deck-poses.js';

const V = text => ({ speaker: '영클', portrait: 'youngcle', voice: 'youngcle', text: `* ${text}` });
const J = text => ({ speaker: '쥰희', portrait: 'junhee', voice: 'junhee', text: `* ${text}` });
const P = text => ({ speaker: '억빠맨', portrait: 'ppaman', voice: 'ppaman', text: `* ${text}` });
const G = text => ({ speaker: '경섭', portrait: 'gyeongsub', voice: 'gyeongsub', text: `* ${text}` });
const A = text => ({ speaker: '가재맨', voice: 'gajaeman_shadow', text: `* ${text}` });
const N = text => ({ voice: 'narrator', text: `* ${text}` });
const YOUNGCLE = 'lounge_return_youngcle', JUNHEE = 'lounge_return_junhee';
const YONGJUN = 'invasion_yongjun';
const PARTY = ['player', 'gyeongsub', 'ppaman'];
const EDITORS = ['lounge_warm_bidet', 'lounge_ttuulla', 'lounge_mini_mario', 'lounge_park_guardian'];
export const INVASION_EXTRA_GUESTS = ['expelled_viewer', 'eunbyeol', 'lucky_guy', 'dohyun', 'domijorim', 'chakgeom'];
const EXTRA_IDS = INVASION_EXTRA_GUESTS.map(sprite => `invasion_guest_${sprite}`);
const GUESTS = [...PARTY, JUNHEE, YONGJUN, 'lounge_naram', 'lounge_obangsun', ...EDITORS, ...EXTRA_IDS];
const PHOTO_CAMERA = 'invasion_photo_camera';
const rallyCamera = duration => ({ parallel: [{ camera: [12, 20.5], duration }, { zoom: 0.42, duration }] });
const close = { action: game => game.textbox.close() };
const entity = (game, id) => id === 'player' ? game.player : game.entities.find(actor => actor.id === id && !actor.dead);
const face = (ids, dir) => ids.map(id => ({ face: id, dir }));
const at = (id, anchor, by = [0, 0], extra = {}) => ({ move: id, rel: anchor, at: 'bottom', by,
  ...(!extra.run && !extra.dash ? { speed: 36 } : {}), ...extra });
const beat = name => ({ invasionBeat: name, action: game => setInvasionBeat(game, name) });
const spawnYongjun = { spawn: { type: 'npc', id: YONGJUN, sprite: 'yongjun', x: 0, y: 0,
  hidden: true, solid: false, wander: 0 } };
const spawnExtraGuests = INVASION_EXTRA_GUESTS.map((sprite, index) => ({ spawn: {
  type: 'npc', id: EXTRA_IDS[index], sprite, x: 0, y: 0, hidden: true, solid: false, wander: 0,
} }));

/** Arrange the already-present crowd under the fade, relative to the lounge's door. */
export function prepareInvasionRally(game) {
  const door = entity(game, 'ship_lounge_grand_door');
  const positions = [[-70, 238], [0, 238], [70, 238], [-140, 238], [140, 238],
    [-140, 348], [-47, 348], [47, 348], [140, 348], [-140, 458], [-47, 458], [47, 458], [140, 458],
    [-120, 568], [-40, 568], [40, 568], [120, 568]];
  const place = (id, dx, dy, facing) => {
    const actor = entity(game, id);
    actor.x = door.x + door.w / 2 - actor.w / 2 + dx;
    actor.y = door.y + door.h - actor.h + dy;
    actor.facing = facing; actor.visible = true; actor.moving = false; actor.pose = null;
  };
  place(YOUNGCLE, 0, 142, 'down');
  GUESTS.forEach((id, index) => place(id, ...positions[index], 'up'));
  game.player.trail = [];
}

/** Copy named map anchors before revealing the solitary deck shot or fallen party. */
export function placeInvasionActors(game, placements) {
  for (const [id, anchorId, facing = 'up', visible = true, pose = null] of placements) {
    const actor = entity(game, id), anchor = entity(game, anchorId);
    actor.x = anchor.x; actor.y = anchor.y; actor.facing = facing;
    actor.visible = visible; actor.pose = pose; actor.moving = false;
    actor.flyX = 0; actor.flyY = 0; actor.spin = 0; actor.motion = null;
  }
  game.player.trail = [];
}

/** Wait on the owned scene, not a duplicated cinematic timer; cancel with its script. */
export function waitInvasionBeat(game) {
  const scene = game.shipInvasion, script = game.dialogue.script;
  return new Promise(resolve => game.background.push({ update() {
    if (game.dialogue.script === script && game.shipInvasion === scene && !scene.disposed && !scene.done) return false;
    resolve(); return true;
  } }));
}

/** Interrupt on the actual visible glyph, while the normal cut lock rejects C/X skipping. */
export function armInvasionInterruption(game, text, suffix) {
  const script = game.dialogue.script;
  let entered = false;
  game.background.push({ update() {
    if (game.dialogue.script !== script) return true;
    const box = game.textbox;
    if (box.node?.text !== text) return entered;
    entered = true;
    const visible = box._pageTokens().slice(0, box.revealed).map(token => token.ch).join('');
    if (!visible.includes(suffix)) return false;
    box._done(null);
    return true;
  } });
}

const interrupted = (line, suffix) => [
  { action: game => armInvasionInterruption(game, line.text, suffix) },
  { ...line, cut: 999 },
];
const waitBeat = { action: waitInvasionBeat };
const deckPlacements = [
  ['player', 'deck_lookout', 'right'],
  ['ppaman', 'deck_ppaman_entry', 'right', false],
  ['gyeongsub', 'deck_gyeongsub_entry', 'right', false],
];
const fallenPlacements = [
  ['player', 'castle_player', 'right', true, 'lying'],
  ['ppaman', 'castle_ppaman', 'right', true, 'lying'],
  ['gyeongsub', 'castle_gyeongsub', 'right', true, 'lying'],
  ['invasion_youngcle', 'castle_youngcle', 'down', true, 'lying'],
  ['invasion_junhee', 'castle_junhee', 'left', true, 'lying'],
];

export const SHIP_INVASION_NODES = [
  { if: flags => !!flags.ship_invasion_arrived, goto: 'invasion_end' },
  { stage: 'ship_invasion_started' },
  close, { bgm: null, fadeOut: 0.7 }, { fade: 'out', duration: 0.8 },
  { action: game => game.sound.loadSfxFiles(['photo_shutter', 'soul_grab', 'explosion', 'wing', 'chime']) },
  { if: flags => !!flags.ship_deck_bond_done, goto: 'invasion_sailing' },
  { if: flags => !!flags.ship_rally_done, goto: 'invasion_deck' },
  { label: 'invasion_rally' },
  { map: 'ship_lounge', spawn: 'lounge_free', bgm: false },
  spawnYongjun, ...spawnExtraGuests, { action: prepareInvasionRally },
  rallyCamera(0.01),
  { fade: 'in', duration: 1 }, { wait: 0.7 },
  V('...'), V('이제 결전에 때가 왔다.'), V('내일 우리는 가재맨 성을 침공하는거임 ㅇㅇ'),
  V('그래서 다들 푹 쉬고 내일 보자 ㅇㅇ'), V('아 맞다'), close,
  { spawn: { type: 'prop', id: PHOTO_CAMERA, image: 'assets/props/ship-photo-camera.png',
    x: 0, y: 0, ix: 0, iy: 0, solid: false, hidden: true } },
  { action: game => {
    const camera = entity(game, PHOTO_CAMERA), door = entity(game, 'ship_lounge_grand_door');
    camera.x = door.x + door.w / 2 + 74;
    camera.y = door.y - 96 + camera.ih - camera.h;
    camera.def.ix = camera.x; camera.def.iy = camera.drawY;
    camera.visible = true;
  } },
  { face: YOUNGCLE, dir: 'up' },
  { slide: PHOTO_CAMERA, by: [0, 126], duration: 1.1 },
  { slide: PHOTO_CAMERA, by: [0, 84], duration: 1.1 }, { wait: 0.5 },
  V('기념샷'), close, { sfx: 'photo_shutter' },
  { fade: 'white', duration: 0.06 }, { wait: 0.13 }, { fade: 'in', duration: 0.75 },
  { slide: PHOTO_CAMERA, by: [0, -210], duration: 1.2 }, { remove: PHOTO_CAMERA },
  { face: YOUNGCLE, dir: 'down' }, V('ㅋㅋ'), P('뭔가 빠릿빠릿 진행되네요'), V('ㅇㅇ'),
  V('그리고 이 문을 열면'), close,
  { parallel: [{ camera: [12, 5.6], duration: 1.5 }, { zoom: 0.9, duration: 1.5 }] },
  V('우리는 돌아갈 수 있음.'), P('궁금한게 있는데 형섭이형을 구하면'),
  P('요플래..형은.. 어떻게하죠?'), V('ㅁㄹ'), V('어캐댐?'), close,
  { camera: [9.7, 12.8], duration: 1.5 },
  N('...'), N('나는 일단 앞에있는 문제에 집중하자고 말했다.'),
  V('맞는말임 ㅇㅇ'), P('그렇죠'), G('허허,,,'),
  J('흥.. 뭘 어떻게되긴, 우리랑 함께 세상 밖으로 나가면 되는거지'),
  J('어서 빨리 가재맨의 아구창에 한대 날리고싶구만 흥!'), close,
  { parallel: [at(JUNHEE, 'ship_lounge_ladder', [0, -38], { run: true }), { camera: [12, 24], duration: 1.5 }] },
  { hide: JUNHEE }, rallyCamera(1.3),
  V('ㅂㅅ'), V('어쨋든 게이들아 다들 푹 쉬도록 ㅇㅇ'), close,
  { stage: 'ship_rally_done' }, { fade: 'out', duration: 1.2 },

  { label: 'invasion_deck' },
  { map: 'ship_night_deck', spawn: 'alone', bgm: false },
  { zoom: 1, duration: 0.01 }, { action: game => placeInvasionActors(game, deckPlacements) },
  { action: prepareShipDeckPoses },
  { camera: [22, 11.6], duration: 0.01 }, { bgm: 'wind', volume: 0.45, fadeIn: 1.2 },
  { fade: 'in', duration: 1.4 }, { wait: 1 }, N('...'),
  P('뭐하고계세요?'), close,
  { emote: 'player', kind: '!', duration: 1, hold: 0.5, sfx: 'chime' },
  { face: 'player', dir: 'left' }, { show: 'ppaman' }, { show: 'gyeongsub' },
  { parallel: [at('ppaman', 'deck_ppaman_near', [0, 0], { speed: 50 }), [{ wait: 0.45 }, at('gyeongsub', 'deck_gyeongsub_near', [0, 0], { speed: 50 })],
    { camera: [22, 11.6], duration: 1.5 }] }, { wait: 0.5 },
  P('뭔가 걱정이 많아보이시네요'), N('...'), G('이 길던 여행도 끝이 다가오니까'),
  G('떨리기도하고'), P('솔직히 인정하는게 처음에 가재맨성 봤을때 너무 에바긴했어요'),
  G('그치 개무서웠지'), P('요플래형 표정 펴요.'), P('저희 빨리 돌아가서 편집해야해요'),
  N('나는 고맙다고 말했다.'), close,
  { parallel: [at('ppaman', 'deck_lookout', [-38, -42], { speed: 20 }), at('gyeongsub', 'deck_lookout', [-38, 42], { speed: 20 })] },
  ...face(['ppaman', 'gyeongsub'], 'right'),
  { sfx: 'soul_grab' },
  { action: game => { setShipDeckFist(game, 'ppaman'); setShipDeckFist(game, 'gyeongsub'); } },
  { bubble: 'player', dots: 3, gap: 0.4, hold: 0.7 },
  { action: game => setShipDeckFist(game, 'player') }, { wait: 1.6 },
  { fade: 'out', duration: 2.5 }, { action: clearShipDeckPoses },
  { stage: 'ship_deck_bond_done' },

  { label: 'invasion_sailing' },
  { bgm: null, fadeOut: 0.7 },
  { map: 'ship_lounge', spawn: 'lounge_free', bgm: false },
  spawnYongjun, ...spawnExtraGuests, { action: prepareInvasionRally },
  rallyCamera(0.01),
  { action: game => game.fadeTo(0, 0) },
  { text: '그리고, 결전의 날.', voice: 'none', style: 'narration', speed: 0.65, auto: 1.6 }, close,
  { action: game => game.fadeTo(1, 0, null, 'black') },
  { action: prepareShipInvasion }, beat('sail'), { bgm: 'jjajang_shore', volume: 0.48, fadeIn: 1.2 },
  { fade: 'in', duration: 1.2 }, waitBeat,
  V('오'), J('왜'), V('보임'), { ...J('보지임신?'), mosaic: { text: '보지', block: 2 } },
  V('니애미'), V('가재맨성이 보임.'), J('오'), close,
  beat('castle-look'), waitBeat,
  { fade: 'out', duration: 0.8 }, beat('hidden'), { bgm: null, fadeOut: 0.5 },
  { fade: 'in', duration: 0.8 }, { wait: 0.5 },
  V('자 슬슬 준비하자'), P('네네 대형대로 스면 될까요?'),
  { ...V('편집노조애들 위치로, 쥰희랑 용준이 그리고 나 위치로, 요플래 억빠맨 김경섭도 위치로'), mosaic: { text: '노', block: 2 } }, close,
  { parallel: [
    ...EDITORS.map((id, index) => at(id, 'ship_lounge_grand_door', [-138 + index * 92, 370], { run: true })),
    at(JUNHEE, 'ship_lounge_grand_door', [-90, 160], { run: true }),
    at(YONGJUN, 'ship_lounge_grand_door', [90, 160], { run: true }),
    ...PARTY.map((id, index) => at(id, 'ship_lounge_grand_door', [-76 + index * 76, 260], { run: true })),
    at('lounge_naram', 'ship_lounge_grand_door', [-145, 260], { run: true }),
    at('lounge_obangsun', 'ship_lounge_grand_door', [145, 260], { run: true }),
    ...EXTRA_IDS.map((id, index) => at(id, 'ship_lounge_grand_door',
      index < 2 ? [-46 + index * 92, 470] : [-120 + (index - 2) * 80, 570], { run: true })),
  ] }, ...face(GUESTS, 'up'),
  rallyCamera(1.2),
  { fade: 'out', duration: 0.6 }, { wait: 0.3 }, { fade: 'in', duration: 0.7 },
  ...interrupted(V('자 이제 준비하고 1시간뒤쯤 출발ㅎ..'), 'ㅎ'), close,
  { parallel: [beat('room-impact'), { shake: 1.1, amp: 14 },
    ...[YOUNGCLE, ...GUESTS].map(id => ({ hop: id, by: [0, 0], height: 18, duration: 0.5, sfx: false }))] },
  V('...?'), V('뭐노 시발'), J('오 이런..'),
  ...interrupted(J('미치...'), '치'), close,
  beat('room-shadow'), waitBeat,
  beat('castle-drop'), waitBeat,
  beat('aftermath'), { wait: 2 },
  A('ㅋㅋㅋㅋ'), A('니 지능을 부여해준게 난데, 니 수를 내가 모르겠음?'),
  A('오늘 그냥 날잡고 전부 몰살해주겠다.'), J('이런 씨발!!'), V('ㅋㅋ 괜찮음;;'),
  V('이건 내 플랜Z쯤 예상한 시나리오임 ㅇㅇ'), V('지금 8억 5699만개쯤의 무기가 파괴되었음'),
  V('일단 빠르게 진입하겠음 모두 괜찮나?'), P('저는 일단 괜찮아요'),
  G('나랑 요플래도 무사해'), V('일단 누르겠음!'), P('뭘요?'), V('꾸욱!'), close,
  beat('teleport'), waitBeat,
  A('ㅋㅋㅋ 그래 어디한번 발버둥쳐봐. 이 지옥에서.'), close,
  { fade: 'out', duration: 0.9 }, { action: game => finishShipInvasion(game) },
  { map: 'gajaeman_castle_entry', spawn: 'arrival', bgm: false },
  { action: game => placeInvasionActors(game, fallenPlacements) },
  { parallel: [{ camera: [10.9, 15], duration: 0.01 }, { zoom: 0.9, duration: 0.01 }] },
  { fade: 'in', duration: 1.2 }, { wait: 0.8 },
  V('으윽 님들 일어나샘'), close,
  { pose: 'invasion_youngcle', to: 'stand' }, { sfx: 'wing' },
  { action: game => {
    const actor = entity(game, 'invasion_youngcle');
    actor.setSprite('youngcle_hover'); actor.def.visualScale = 1;
  } }, { wait: 0.7 },
  J('큭..'), { pose: 'invasion_junhee', to: 'stand' },
  V('일단 편집노조애들도 살아있는거같음. 먼저 앞으로 가겠음 님들도빨리 따라오샘'),
  J('용준인 어딨지.'), V('...'), V('연락이 안됨. 죽은듯'),
  { async: [{ shake: 0.5, amp: 5 }, { hop: 'invasion_junhee', height: 14, duration: 0.35, sfx: false }] },
  J('이런씨발새끼 내가 족친다'), close,
  { parallel: [[at('invasion_youngcle', 'castle_exit_turn', [-28, 0], { run: true }), at('invasion_youngcle', 'castle_exit_up', [-28, 0], { dash: true }), { hide: 'invasion_youngcle' }],
    [{ wait: 0.3 }, at('invasion_junhee', 'castle_exit_turn', [28, 0], { run: true }), at('invasion_junhee', 'castle_exit_up', [28, 0], { dash: true }), { hide: 'invasion_junhee' }]] },
  { parallel: [{ camera: [7, 15.5], duration: 1.3 }, { zoom: 1, duration: 1.3 }] },
  { bgm: null, fadeOut: 0.8 },
  ...PARTY.map(id => ({ pose: id, to: 'stand' })),
  P('... 형들'), G('가자 애들아.'), close,
  { remove: 'invasion_youngcle' }, { remove: 'invasion_junhee' },
  { camera: 'player' }, { regroup: true }, { stage: 'ship_invasion_arrived' },
  { label: 'invasion_end' },
];

export const ship_invasion = Object.assign([...SHIP_INVASION_NODES, { end: true }], { silent: true });
