import test from 'node:test';
import assert from 'node:assert/strict';
import { SCRIPTS } from '../../src/data/scripts.js';
import { CHOIMIS_RESCUE_NODES } from '../../src/data/cutscenes/choimis_rescue.js';
import { SHIP_LOUNGE_BRIEFING_NODES as nodes, ship_lounge_briefing, prepareLoungeBriefing, tossLoungeChoimis, clearLoungeBriefing, startLoungeBriefingLaugh } from '../../src/data/cutscenes/ship_lounge_briefing.js';

test('briefing is shared inline after rescue and registered for legacy saved arrival', () => {
  assert.equal(SCRIPTS.ship_lounge_briefing, ship_lounge_briefing);
  const map = CHOIMIS_RESCUE_NODES.findIndex(n => n.map);
  assert.equal(CHOIMIS_RESCUE_NODES[map + 1], nodes[0]);
  assert.equal(nodes[0].if({ choimis_rescued: true }), false);
  assert.equal(nodes[0].if({ choimis_rescued: true, ship_lounge_briefed: true }), true);
  assert.equal(nodes[0].if({}), true);
});

test('briefing preserves the nineteen supplied dialogue lines', () => {
  assert.deepEqual(nodes.filter(n => n.text).map(n => n.text.slice(2)), [
    '진짜 뒤질뻔했네요 이얍!', 'ㅋㅋ', '반갑노 게이들아', '저새끼 어떻게든 잘 잡아왔노 ㅅㄱㅅㄱ',
    '네 형 그래서 이제 어떻게 할거에요?', '뭘 어떻게하긴 뭘 어떻게함', '내일 당장 그 더러운 성을 침공할거임',
    '내일..?', 'ㅇㅇ', '지금 우리 전함에 약 8억 5700만 1293개 쯤 되는 무기들이 존재함',
    '살상 무기를 한번에 끝까지 쫒아가서 다 때려박은뒤에 우린 집가면됨 ㅇㅇ',
    '내가 그중에서 가장 대단한 무기를 만들었는데',
    '그래서 니들은 일단 여기서 준비만 하면 될거고 뭐 상점이나 들리던가 애들하고 얘기나 좀 하던가 ㅇㅇ',
    '내가 생각해봤을때 가재맨을 제대로 처리할수있는건 요플래. 너밖에 없는거같음',
    '그리고 우리는 죽이는게 끝이 아니라 형섭이를 되찾아야하니까', 'ㅇㅇ 굿',
    '난 저기 옆에 있을테니 좀 라운지 둘러보다가 준비되면 말거샘', '...', '일단 좀 둘러볼까요 상점이나 가볼까',
  ]);
});

test('slow staggered entry uses approved carried NPC and throws before Youngcle music', () => {
  const walk = nodes.find(n => n.parallel?.some(branch => branch.move === 'player'));
  assert.equal(walk.parallel[0].speed, 42);
  assert.deepEqual(walk.parallel.slice(1).map(branch => branch[0].wait), [0.55, 1.1, 1.65]);
  const carry = walk.parallel[2][1].carry;
  assert.deepEqual(carry, { id: 'lounge_carried_choimis', offset: [12, -36], facing: 'down' });
  const toss = nodes.findIndex(n => n.action === tossLoungeChoimis);
  const music = nodes.findIndex(n => n.bgm === 'storage_show');
  assert.ok(toss < music);
  assert.equal(nodes[music + 1].text, '* ㅋㅋ');
});

test('Junhee laugh precedes the timed interruption and bubble does not close Youngcle textbox', () => {
  const line = nodes.findIndex(n => n.text?.includes('내가 그중에서'));
  assert.equal(nodes[line].cut, 1.05);
  assert.equal(nodes[line - 1].async[0].motion, 'lounge_return_junhee');
  const next = nodes.findIndex(n => n.text?.includes('그래서 니들은'));
  let bubble;
  const actor = { id: 'lounge_return_junhee' };
  nodes[next - 1].action({ entities: [actor], bubble: { start(target, options) { bubble = { target, options }; } } });
  assert.equal(bubble.target, actor); assert.equal(bubble.options.dots, 3);
  assert.ok(next > line);
});

test('shop camera waits actual entry and removal before completion stage', () => {
  const index = nodes.findIndex(n => n.label === 'shop_run');
  const run = nodes[index + 1];
  assert.ok(run.parallel);
  assert.ok(run.parallel[0].slice(0, 3).every(n => n.run && n.rel === 'ship_lounge_shop_door'));
  assert.deepEqual(run.parallel[0].at(-1), { remove: 'lounge_return_yongjun' });
  assert.ok(nodes.findIndex(n => n.stage === 'ship_lounge_briefed') > index + 1);
  const complete = nodes.findIndex(n => n.label === 'complete');
  assert.equal(nodes[complete + 1].stage, 'ship_lounge_briefed');
  assert.equal(nodes[complete + 2].bgm, 'ship_lounge');
});

test('flight uses actor coordinates until real landing then reveals immovable sealed prop once', async () => {
  const actor = { id: 'lounge_carried_choimis', x: 450, y: 384, w: 24, h: 16, def: {}, visible: true, pose: 'lying' };
  const prop = { id: 'lounge_choimis_sealed', x: 524, y: 277, w: 46, h: 18, visible: false, solid: false };
  const sounds = [], flags = [], game = { entities: [actor, prop], mapId: 'ship_lounge',
    dialogue: { script: nodes }, background: [], sound: { sfx: n => sounds.push(n) }, setFlag: n => flags.push(n) };
  const pending = tossLoungeChoimis(game);
  assert.equal(actor.pose, null); assert.equal(prop.visible, false);
  assert.equal(game.background[0].update(0.425), false);
  assert.ok(actor.x > 450 && actor.x < 535); assert.ok(actor.hopY > 40); assert.equal(prop.visible, false);
  assert.equal(game.background[0].update(0.425), true); await pending;
  assert.equal(actor.visible, false); assert.equal(actor.dead, true); assert.equal(prop.visible, true);
  assert.deepEqual([actor.x, actor.y], [535, 279]);
  assert.deepEqual(flags, ['choimis_lounge_sealed']); assert.deepEqual(sounds, ['wing', 'thud']);
  assert.deepEqual([prop.x, prop.y], [524, 277]);
});

test('cancelled async entry preparation cannot move actors in a fresh map', async () => {
  let release;
  const game = { mapId: 'ship_lounge', dialogue: { script: nodes }, sound: { preloadBgm() {},
    loadSfxFiles: () => new Promise(resolve => { release = resolve; }) } };
  const pending = prepareLoungeBriefing(game);
  game.mapId = 'room'; game.dialogue.script = null;
  release(); await pending;
  assert.equal(game.mapId, 'room');
});

test('laugh ownership is cleared on script abort and explicit map/title cleanup without future advancement', () => {
  const actor = { id: 'lounge_return_junhee', motion: null };
  const unrelated = { id: 'unrelated', motion: { keep: true } };
  let pauses = 0;
  const game = { entities: [actor, unrelated], dialogue: { script: nodes }, mapId: 'ship_lounge',
    background: [], flags: {}, sound: { sfx: () => ({ pause() { pauses++; } }) } };
  startLoungeBriefingLaugh(game); actor.motion = { laugh: true };
  assert.equal(game.background[0].update(), false);
  game.dialogue.script = null;
  assert.equal(game.background[0].update(), true);
  assert.equal(game.loungeBriefingLaugh, null); assert.equal(game.loungeBriefingLaughOwner, null);
  assert.equal(actor.motion, null); assert.deepEqual(unrelated.motion, { keep: true });
  assert.equal(pauses, 1); assert.deepEqual(game.flags, {});
  clearLoungeBriefing(game); assert.equal(pauses, 1);
  game.dialogue.script = nodes;
  startLoungeBriefingLaugh(game); actor.motion = { laugh: true };
  clearLoungeBriefing(game); clearLoungeBriefing(game);
  assert.equal(pauses, 2); assert.equal(actor.motion, null);
  assert.equal(game.background.at(-1).update(), true);
});

test('muted laugh still owns and clears its actor motion', () => {
  const actor = { id: 'lounge_return_junhee' };
  const game = { entities: [actor], dialogue: { script: nodes }, mapId: 'ship_lounge', background: [],
    sound: { sfx: () => undefined } };
  startLoungeBriefingLaugh(game); actor.motion = { laugh: true };
  clearLoungeBriefing(game);
  assert.equal(actor.motion, null); assert.equal(game.loungeBriefingLaughOwner, null);
});
