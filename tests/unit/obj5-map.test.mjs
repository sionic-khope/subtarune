import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { QA_POINTS, stateFromFlags, storyBgm } from '../../src/core/story.js';
import { SCRIPTS } from '../../src/data/scripts.js';

const map = (id) => JSON.parse(fs.readFileSync(new URL(`../../assets/maps/${id}.json`, import.meta.url), 'utf8'));

test('obj2 cleared eastern path connects naturally to the new landing', () => {
  const previous = map('obj2'), next = map('obj5');
  const exit = previous.entities.find((e) => e.type === 'door' && e.to === 'obj5');
  assert.equal(exit.requires, 'obj2_statues_cleared');
  assert.ok(next.spawns[exit.spawn]);
  assert.equal(next.entities.find((e) => e.type === 'door').spawn, 'from_right');
});

test('obj5 approach lasts around three seconds and preserves the object region', () => {
  const m = map('obj5'), trigger = m.entities.find((e) => e.type === 'trigger');
  const travel = trigger.x - m.spawns.from_left.x;
  assert.ok(travel >= 580 && travel <= 700, `${travel}px approach`);
  assert.equal(m.backdrop, 'obj_forest');
  assert.ok(m.entities.some((e) => e.image === 'assets/props/tree_obj.png'));
  assert.ok(m.rows.every((row) => !/[xXy]/.test(row)));
  assert.ok(m.rows.every((row) => /^[oO]+$/.test(row.slice(m.meta.seaColumn))));
});

test('obj5 keeps the original cooperative raft and begins its script on proximity', () => {
  const m = map('obj5'), raft = m.entities.find((e) => e.type === 'raft');
  assert.equal(raft.image, 'assets/props/raft.png');
  assert.equal(raft.jump, true);
  assert.deepEqual(raft.swim, ['ppaman', 'gyeongsub']);
  assert.equal(raft.swimAt, 'below');
  assert.equal(m.entities.find((e) => e.type === 'trigger').script, 'obj5_chase');
});

test('sea QA checkpoints retain the gun exactly once and preserve prior progression', () => {
  const before = QA_POINTS.find((p) => p.id === 'obj5');
  assert.ok(before.flags.obj2_statues_cleared && before.flags.obj4_abduction_done);
  assert.equal(stateFromFlags(before.flags).inventory.includes('나무총'), false);
  for (const id of ['obj5_sea', 'obj5_after']) {
    const point = QA_POINTS.find((p) => p.id === id);
    assert.equal(stateFromFlags(point.flags).inventory.filter((i) => i === '나무총').length, 1);
    assert.equal(point.flags.obj5_chase_started, true);
    assert.equal(!!point.flags.obj5_chase_cleared, id === 'obj5_after');
  }
});

test('obj5 music follows boarding and the active or cleared sea phase', () => {
  assert.equal(storyBgm('obj5', { obj4_abduction_done: true }), 'baron_intro');
  assert.equal(storyBgm('obj5', { obj5_chase_started: true }), 'baron_intro');
  assert.equal(storyBgm('obj5', { obj5_chase_cleared: true }), 'baron_sea_battle');
});

test('chest grant is idempotent and hands control to sea mode without a turn battle', () => {
  const nodes = SCRIPTS.obj5_chase;
  assert.ok(nodes.some((n) => n.seaChase));
  assert.equal(nodes.some((n) => n.battle), false);
  const grant = nodes.find((n) => n.action && n.action.toString().includes('inventory.push'));
  const game = { inventory: [], flags: {}, has(flag) { return this.flags[flag]; }, setFlag(flag) { this.flags[flag] = true; } };
  grant.action(game); grant.action(game);
  assert.deepEqual(game.inventory, ['나무총']);
});
