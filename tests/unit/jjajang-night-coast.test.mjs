import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { TileMap } from '../../src/world/world.js';

const read = id => JSON.parse(fs.readFileSync(`assets/maps/${id}.json`, 'utf8'));

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
