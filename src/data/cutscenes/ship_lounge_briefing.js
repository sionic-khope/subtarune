import { makeWaiter } from '../../ui/cutscene.js';

const V = text => ({ speaker: '영클', portrait: 'youngcle', voice: 'youngcle', text: `* ${text}` });
const J = text => ({ speaker: '쥰희', portrait: 'junhee', voice: 'junhee', text: `* ${text}` });
const P = text => ({ speaker: '억빠맨', portrait: 'ppaman', voice: 'ppaman', text: `* ${text}` });
const G = text => ({ speaker: '경섭', portrait: 'gyeongsub', voice: 'gyeongsub', text: `* ${text}` });
const YOUNGCLE = 'lounge_return_youngcle', JUNHEE = 'lounge_return_junhee', YONGJUN = 'lounge_return_yongjun';
const CARRIED = 'lounge_carried_choimis', SEALED = 'lounge_choimis_sealed';
const PARTY = ['player', 'gyeongsub', 'ppaman'];
const close = { action: game => game.textbox.close() };
const entity = (game, id) => id === 'player' ? game.player : game.entities.find(e => e.id === id && !e.dead);
const toward = (id, target) => ({ face: id, dir: `toward:${target}` });
const approach = (id, dx, dy, extra = {}) => ({ move: id, rel: 'ship_lounge_grand_door', at: 'bottom', by: [dx, dy], speed: 42, ...extra });

/** Establish the entry offscreen under an opaque fade; the walk itself remains ordinary DSL. */
export async function prepareLoungeBriefing(game) {
  const script = game.dialogue.script;
  game.sound.preloadBgm('storage_show');
  await game.sound.loadSfxFiles(['laugh_junhee', 'wing', 'thud', 'chime']);
  if (game.dialogue.script !== script || game.mapId !== 'ship_lounge') return;
  const door = entity(game, 'ship_lounge_grand_door'), ladder = entity(game, 'ship_lounge_ladder');
  const offsets = [[0, -172], [-62, -128], [66, -84], [124, -40]];
  [...PARTY, YONGJUN].forEach((id, index) => {
    const actor = entity(game, id);
    actor.x = door.x + door.w / 2 - actor.w / 2 + offsets[index][0];
    actor.y = ladder.y + offsets[index][1];
    actor.facing = 'up'; actor.visible = true; actor.moving = false;
  });
  const ppaman = entity(game, 'ppaman'), carried = entity(game, CARRIED), sealed = entity(game, SEALED);
  carried.x = ppaman.x + 12; carried.y = ppaman.y - 36;
  carried.pose = 'lying'; carried.visible = true;
  if (sealed) { sealed.visible = false; sealed.solid = false; }
  game.camera.target = game.player; game.camera.locked = false; game.camera.snap();
}

/** Resolve the approved sealed prop anchor, then reuse the existing spin-and-hop motion. */
export function tossLoungeChoimis(game) {
  const actor = entity(game, CARRIED), target = entity(game, SEALED);
  const script = game.dialogue.script;
  actor.pose = null; actor.facing = 'down';
  const hop = makeWaiter(game, { hop: CARRIED,
    by: [target.x + target.w / 2 - actor.w / 2 - actor.x, target.y + target.h - actor.h - actor.y],
    height: 42, duration: 0.85, spin: 1, keep: true, sfx: 'wing' });
  return new Promise(resolve => game.background.push({ update(dt, input) {
    if (game.dialogue.script !== script || game.mapId !== 'ship_lounge') { resolve(); return true; }
    if (!hop.update(dt, input)) return false;
    actor.visible = false; actor.dead = true;
    target.visible = true; target.solid = true;
    game.setFlag('choimis_lounge_sealed');
    game.sound.sfx('thud', { volume: 0.65 });
    game.shake = { time: 0.22, amp: 2 };
    resolve(); return true;
  } }));
}

/** Release only this scene's laugh on normal interruption, script replacement, map, or title. */
export function clearLoungeBriefing(game) {
  const owner = game.loungeBriefingLaughOwner;
  game.loungeBriefingLaugh?.pause(); game.loungeBriefingLaugh = null;
  if (owner?.actor) owner.actor.motion = null;
  game.loungeBriefingLaughOwner = null;
}

/** Bind the existing recorded laugh to its exact script instance, including muted playback. */
export function startLoungeBriefingLaugh(game) {
  clearLoungeBriefing(game);
  const owner = { actor: entity(game, JUNHEE), script: game.dialogue.script };
  game.loungeBriefingLaughOwner = owner;
  game.loungeBriefingLaugh = game.sound.sfx('laugh_junhee', { len: 0.65, volume: 0.8 });
  game.background.push({ update() {
    if (game.loungeBriefingLaughOwner !== owner) return true;
    if (game.dialogue.script === owner.script && game.mapId === 'ship_lounge') return false;
    clearLoungeBriefing(game); return true;
  } });
}

export const SHIP_LOUNGE_BRIEFING_NODES = [
  { if: flags => !flags.choimis_rescued || !!flags.ship_lounge_briefed, goto: 'briefing_end' },
  { label: 'entry' }, { fade: 'out', duration: 0 }, { bgm: null },
  { spawn: { type: 'npc', id: CARRIED, sprite: 'choimis', x: 0, y: 0, hidden: true, solid: false, wander: 0 } },
  { action: prepareLoungeBriefing },
  { fade: 'in', duration: 0.8 },
  { parallel: [
    approach('player', 0, 258),
    [{ wait: 0.55 }, approach('gyeongsub', -62, 258)],
    [{ wait: 1.1 }, approach('ppaman', 66, 228, { carry: { id: CARRIED, offset: [12, -36], facing: 'down' } })],
    [{ wait: 1.65 }, approach(YONGJUN, 124, 258)],
  ] },
  { parallel: [{ camera: [12, 11.75], duration: 1.25 }, { zoom: 0.9, duration: 1.25 }] },
  { wait: 0.5 }, P('진짜 뒤질뻔했네요 이얍!'), close,
  { label: 'throw' },
  { parallel: [{ camera: [12, 7.625], duration: 1.2 }, { zoom: 0.72, duration: 1.2 }] },
  { action: tossLoungeChoimis }, { wait: 0.8 },
  { parallel: [{ camera: [12, 11.75], duration: 1.2 }, { zoom: 0.9, duration: 1.2 }] },
  { bgm: 'storage_show', volume: 0.5, fadeIn: 0.25 }, V('ㅋㅋ'), close,
  { parallel: [approach('player', 0, 228), approach('gyeongsub', -62, 228), approach(YONGJUN, 124, 228)] },
  ...[...PARTY, YONGJUN].map(id => toward(id, YOUNGCLE)),
  toward(YOUNGCLE, 'player'), toward(JUNHEE, 'player'),
  { wait: 0.5 }, { label: 'briefing' },
  V('반갑노 게이들아'),
  V('저새끼 어떻게든 잘 잡아왔노 ㅅㄱㅅㄱ'),
  P('네 형 그래서 이제 어떻게 할거에요?'),
  V('뭘 어떻게하긴 뭘 어떻게함'),
  V('내일 당장 그 더러운 성을 침공할거임'), close,
  { parallel: PARTY.map(id => ({ emote: id, kind: '!', duration: 1.2, hold: 0.6 })) },
  G('내일..?'), V('ㅇㅇ'),
  V('지금 우리 전함에 약 8억 5700만 1293개 쯤 되는 무기들이 존재함'),
  V('살상 무기를 한번에 끝까지 쫒아가서 다 때려박은뒤에 우린 집가면됨 ㅇㅇ'),
  close,
  { label: 'laugh' },
  { action: startLoungeBriefingLaugh },
  { async: [{ motion: JUNHEE, name: 'laugh' }] },
  { ...J('내가 그중에서 가장 대단한 무기를 만들었는데'), cut: 1.05 },
  { action: clearLoungeBriefing },
  { label: 'interruption' },
  { action: game => game.bubble.start(entity(game, JUNHEE), { dots: 3, gap: 0.3, hold: 2 }) },
  V('그래서 니들은 일단 여기서 준비만 하면 될거고 뭐 상점이나 들리던가 애들하고 얘기나 좀 하던가 ㅇㅇ'),
  V('내가 생각해봤을때 가재맨을 제대로 처리할수있는건 요플래. 너밖에 없는거같음'),
  G('그리고 우리는 죽이는게 끝이 아니라 형섭이를 되찾아야하니까'),
  V('ㅇㅇ 굿'),
  V('난 저기 옆에 있을테니 좀 라운지 둘러보다가 준비되면 말거샘'),
  J('...'), P('일단 좀 둘러볼까요 상점이나 가볼까'), close,
  { label: 'shop_run' },
  { parallel: [[
    { move: YONGJUN, rel: 'ship_lounge_shop_door', at: 'bottom', by: [144, -88], run: true },
    { move: YONGJUN, rel: 'ship_lounge_shop_door', at: 'bottom', by: [0, 24], run: true },
    { move: YONGJUN, rel: 'ship_lounge_shop_door', at: 'top', by: [0, 4], run: true },
    { remove: YONGJUN },
  ], [{ camera: [7, 30], duration: 2.2 }, { wait: 0.8 }]] },
  { camera: [12, 11.75], duration: 1.5 },
  { zoom: 1, duration: 0.6 }, { camera: 'player' }, { regroup: true },
  { label: 'complete' }, { stage: 'ship_lounge_briefed' },
  { bgm: 'ship_lounge', volume: 0.6, fadeIn: 1.2 },
  { label: 'briefing_end' },
];

export const ship_lounge_briefing = Object.assign([...SHIP_LOUNGE_BRIEFING_NODES, { end: true }], { silent: true });
