import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { TileMap } from '../../src/world/world.js';
import { NightCoastChatter, coastProgress } from '../../src/world/night-coast-chatter.js';
import { NIGHT_COAST_CHAT } from '../../src/data/cutscenes/jjajang_night_coast.js';

const read = id => JSON.parse(fs.readFileSync(`assets/maps/${id}.json`, 'utf8'));

test('coast chatter advances without confirm or movement ownership and never repeats saved lines', () => {
  const def = read('jjajang_night_coast1');
  const [x, y] = def.meta.coast.walkRoute[0].at(-1);
  const game = { mapId: def.id, map: { def }, player: { x, y }, flags: {}, state: 'field',
    dialogue: { running: false }, sound: { blip() {} }, portraits: {},
    ctx: { measureText: ch => ({ width: ch === ' ' ? 5 : 14 }) }, autosave() {} };
  const chatter = new NightCoastChatter(game), seen = [];
  for (let i = 0; i < 2000; i++) {
    chatter.update(0.05);
    const text = chatter.box.node?.text;
    if (text && seen.at(-1) !== text) seen.push(text);
  }
  assert.deepEqual(seen, NIGHT_COAST_CHAT[def.id].map(line => line.text));
  assert.equal(game.dialogue.running, false);
  assert.deepEqual(game.player, { x, y });
  const restored = new NightCoastChatter({ ...game, flags: JSON.parse(JSON.stringify(game.flags)) });
  restored.update(1);
  assert.equal(restored.box.isOpen, false);
  assert.equal(coastProgress(def.meta.coast.walkRoute, game.player), 1);
});

test('coast chatter waits at each natural route threshold and pauses for a modal or menu', () => {
  const def = read('jjajang_night_coast2');
  const game = { mapId: def.id, map: { def }, player: { ...def.spawns.start }, flags: {}, state: 'field',
    dialogue: { running: false }, sound: { blip() {} }, portraits: {},
    ctx: { measureText: () => ({ width: 14 }) }, autosave() {} };
  const chatter = new NightCoastChatter(game);
  chatter.update(1);
  assert.equal(chatter.box.isOpen, false);
  game.player.x = 400;
  game.ride = {};
  chatter.update(0.1);
  assert.equal(chatter.box.isOpen, false);
  assert.deepEqual(game.flags, {});
  game.ride = null;
  chatter.update(0.1);
  assert.equal(chatter.box.node.text, NIGHT_COAST_CHAT[def.id][0].text);
  const revealed = chatter.box.revealed;
  game.state = 'menu';
  chatter.update(20);
  assert.equal(chatter.box.revealed, revealed);
  game.state = 'field'; game.dialogue.running = true;
  chatter.update(20);
  assert.equal(chatter.box.revealed, revealed);
});

test('coast route geometry is about ten percent shorter than BUILD291', () => {
  const original = [343, 285, 341];
  for (let i = 1; i <= 3; i++) {
    const map = read(`jjajang_night_coast${i}`);
    const route = map.meta.coast.walkRoute;
    const tiles = route.reduce((sum, path) => sum + path.slice(1).reduce((n, p, j) => n + Math.hypot(p[0] - path[j][0], p[1] - path[j][1]) / 32, 0), 0);
    assert.ok(tiles / original[i - 1] >= 0.88 && tiles / original[i - 1] <= 0.92, `${i}: ${tiles}`);
  }
});

test('sakura8 coast conversation begins three tiles before the exit after transformation', () => {
  const map = read('jjajang_sakura8');
  const trigger = map.entities.find(e => e.script === 'night_coast_entry');
  assert.ok(trigger);
  assert.equal(map.rows[0].length * 32 - trigger.x, 96);
  assert.equal(trigger.requires, 'choimis_flower_done');
  assert.equal(trigger.once, true);
});

test('coast3 has the existing healing spring on the final bank', () => {
  const map = read('jjajang_night_coast3');
  const spring = map.entities.find(e => e.script === 'jjajang_spring');
  assert.ok(spring);
  assert.equal(spring.image, 'assets/props/blue_buff.png');
  assert.ok(spring.x > map.meta.coast.walkRoute.at(-1)[0][0]);
  assert.equal(new TileMap(map).solidRect(spring.x, spring.y + spring.h + 2, 24, 16), false);
});

test('night coast provides three reversible rooms between the unlocked fork and cliff', () => {
  const ids = ['jjajang_sakura8', 'jjajang_night_coast1', 'jjajang_night_coast2', 'jjajang_night_coast3', 'jjajang_night_cliff'];
  for (let i = 0; i < ids.length - 1; i++) {
    const a = read(ids[i]), b = read(ids[i + 1]);
    assert.ok(a.entities.some(e => e.type === 'door' && e.to === b.id));
    assert.ok(b.entities.some(e => e.type === 'door' && e.to === a.id));
  }
});

test('night coast switches persist genuine blocked crossings without combat or wind', () => {
  for (let i = 1; i <= 3; i++) {
    const def = read(`jjajang_night_coast${i}`);
    assert.equal(def.bgm, 'night_coast');
    assert.equal(def.backdrop, 'jjajang_night_sea');
    assert.equal(def.entities.some(e => e.type === 'enemy'), false);
    for (const gate of def.meta.coast.gates) {
      const before = new TileMap(def);
      const rows = def.rows.map((row, r) => def.tileSwaps[gate.flag].rows[r] ?? row);
      const after = new TileMap({ ...def, rows });
      assert.equal(before.solidRect(gate.x, gate.y, 24, 16), true);
      assert.equal(after.solidRect(gate.x, gate.y, 24, 16), false);
    }
    for (const spawn of Object.values(def.spawns)) {
      const map = new TileMap(def);
      for (const behind of [0, 48, 96]) {
        const x = spawn.x + (spawn.facing === 'left' ? behind : -behind);
        assert.equal(map.solidRect(x, spawn.y, 24, 16), false);
      }
    }
  }
});

test('night coast ferry legs use normal speed, safe landing banks and persistent route IDs', () => {
  const ferries = [1, 2, 3].flatMap(i => read(`jjajang_night_coast${i}`).entities.filter(e => e.type === 'raft'));
  assert.equal(ferries.length, 4);
  for (const raft of ferries) {
    assert.equal(raft.speed, 171);
    assert.equal(raft.walkOn, true);
    const [x, y] = raft.route.at(-1);
    const seconds = Math.hypot(x - raft.x, y - raft.y) / raft.speed;
    assert.ok(seconds >= 4 && seconds <= 6.5, `${raft.id}: ${seconds}s`);
  }
});

test('the post-flower branch does not leave a second Ppaman beside his party follower', () => {
  const map = read('jjajang_sakura8');
  const flags = { sakura8_split_done: true, sakura8_right_open: true, choimis_flower_done: true };
  const visiblePpaman = map.entities.filter(e => e.sprite === 'ppaman' && !e.hidden
    && (!e.requires || flags[e.requires]) && (!e.unless || !flags[e.unless]));
  assert.deepEqual(visiblePpaman, []);
  assert.equal(map.entities.find(e => e.to === 'jjajang_night_coast1').requires, 'choimis_flower_done');
});
