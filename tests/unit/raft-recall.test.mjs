import test from 'node:test';
import assert from 'node:assert/strict';
import { createEntity, Entity, Raft } from '../../src/world/world.js';

function setup(overrides = {}) {
  const effects = [], sounds = [], scripts = [], saves = [];
  const game = {
    state: 'field', flags: { raft_boat: 2 }, dialogue: { running: false }, entities: [], party: [],
    propImages: { off: { width: 32, height: 48 }, on: { width: 32, height: 48 } },
    sound: { sfx: (...args) => sounds.push(args) },
    emitDropletsAt: (...args) => effects.push(args),
    setFlag(key, value = true) { this.flags[key] = value; }, has(key) { return !!this.flags[key]; },
    runScript: name => scripts.push(name), autosave() { saves.push({ ...this.flags }); },
    map: { solidRect: () => false },
  };
  game.player = new Entity({ type: 'player', x: 40, y: 75, w: 24, h: 16 }, game);
  const raft = new Raft({ type: 'raft', id: 'boat', x: 100, y: 80, route: [[300, 80], [300, 280]], ...overrides }, game);
  const lever = createEntity({ type: 'raft_recall', id: 'call', raft: 'boat', endpoint: 'start', image: 'off', imageOn: 'on', x: 40, y: 50, w: 12, h: 16, ix: 30, iy: 18 }, game);
  assert.ok(lever, 'raft recall pillars must register with the real entity factory');
  game.entities = [game.player, raft, lever];
  return { game, raft, lever, sounds, effects, scripts, saves };
}

test('bank lever recalls an empty raft, persists endpoint and leaves party and story untouched', () => {
  const { game, raft, lever, sounds, saves, scripts } = setup();
  const player = { ...game.player.rect }, party = game.party;
  assert.equal(lever.canInteract(), true);
  assert.equal(lever.interact(game.player), true);
  assert.deepEqual([raft.x, raft.y, raft.def.ix, raft.def.iy, raft.at], [100, 80, 100, 80, 0]);
  assert.equal(game.flags.raft_boat, 0);
  assert.equal(saves.length, 1);
  assert.deepEqual(game.player.rect, player); assert.equal(game.party, party);
  assert.equal(game.ride, undefined); assert.deepEqual(scripts, []);
  assert.ok(sounds.some(([name]) => name === 'click'));
  assert.equal(lever.image, game.propImages.on);
  lever.update(1);
  assert.equal(lever.image, game.propImages.off);
  lever.interact(game.player);
  assert.equal(saves.length, 1, 'repeated C at the same endpoint must not save or trigger effects again');
});

test('far-bank lever resolves the last route point and reloads from its saved flag', () => {
  const { game, raft, lever } = setup();
  lever.interact(game.player); lever.update(1); lever.def.endpoint = 'end'; lever.interact(game.player);
  assert.deepEqual([raft.x, raft.y, raft.at], [300, 280, 2]);
  const restored = new Raft({ type: 'raft', id: 'boat', x: 100, y: 80, route: [[300, 80], [300, 280]] }, game);
  assert.deepEqual([restored.x, restored.y, restored.at], [300, 280, 2]);
});

test('rapid repeated pulls cannot move the raft again until the lever releases', () => {
  const { game, raft, lever, saves, sounds } = setup();
  lever.interact(game.player);
  lever.def.endpoint = 'end';
  lever.interact(game.player);
  assert.equal(raft.at, 0); assert.equal(saves.length, 1); assert.equal(sounds.length, 2);
  lever.update(1); lever.interact(game.player);
  assert.equal(raft.at, 2); assert.equal(saves.length, 2);
});

test('recall refuses occupied landing geometry without moving the blocker or party', () => {
  for (const type of ['player', 'follower', 'prop']) {
    const { game, raft, lever, saves } = setup();
    const blocker = type === 'player' ? game.player : new Entity({ type, x: 110, y: 85 }, game);
    blocker.x = 110; blocker.y = 85;
    if (type !== 'player') game.entities.push(blocker);
    lever.interact(game.player);
    assert.equal(raft.at, 2, type); assert.equal(saves.length, 0, type);
    assert.deepEqual([blocker.x, blocker.y], [110, 85], type);
  }
});

test('lava recalls keep their existing splash color and custom save key', () => {
  const { game, raft, lever, sounds, effects } = setup({ lava: true, flag: 'special_raft' });
  raft.at = 2; raft.setPos(raft.route[2]); lever.interact(game.player);
  assert.equal(game.flags.special_raft, 0); assert.equal(game.flags.raft_boat, 2);
  assert.ok(sounds.some(([name]) => name === 'sizzle'));
  assert.equal(effects[0].at(-1), '#ff8a3c');
});

test('occupied, moving, airborne, swept, held and non-field rafts cannot be recalled', () => {
  for (const blocked of ['riding', 'moving', 'jumping', 'sweeping', 'hold', 'otherRide', 'dialogue', 'transitioning', 'menu']) {
    const { game, raft, lever, sounds, saves } = setup();
    if (blocked === 'otherRide') game.ride = {};
    else if (blocked === 'dialogue') game.dialogue.running = true;
    else if (blocked === 'transitioning') game.transitioning = true;
    else if (blocked === 'menu') game.state = 'menu';
    else raft[blocked] = true;
    lever.interact(game.player);
    assert.deepEqual([raft.x, raft.y, raft.at], [300, 280, 2], blocked);
    assert.equal(saves.length, 0, blocked); assert.equal(sounds.length, 0, blocked);
  }
});

test('missing, hidden, dead, wrong-type target and invalid endpoint are harmless', () => {
  for (const blocked of ['missing', 'hidden', 'dead', 'wrongType', 'endpoint']) {
    const { game, raft, lever, saves } = setup();
    if (blocked === 'missing') lever.def.raft = 'absent';
    else if (blocked === 'hidden') raft.visible = false;
    else if (blocked === 'dead') raft.dead = true;
    else if (blocked === 'wrongType') raft.def.type = 'prop';
    else lever.def.endpoint = 'middle';
    lever.interact(game.player);
    assert.equal(raft.at, 2, blocked); assert.equal(saves.length, 0, blocked);
  }
});

test('recall does not consume first-board or arrival events, real travel still triggers both', () => {
  const { game, raft, lever, scripts } = setup({ onBoard: 'intro', onArrive: 'arrive' });
  lever.interact(game.player);
  assert.equal(game.flags.boat_boarded, undefined); assert.equal(game.flags.boat_arrived, undefined);
  raft.interact(game.player);
  assert.deepEqual(scripts, ['intro']); assert.equal(raft.moving, false);
  raft.depart(); raft.update(2); raft.update(2);
  assert.deepEqual(scripts, ['intro', 'arrive']);
  assert.equal(game.flags.boat_boarded, true); assert.equal(game.flags.boat_arrived, true);
  assert.equal(game.ride, null);
});
