import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { SCRIPTS } from '../../src/data/scripts.js';
import { QA_POINTS } from '../../src/core/story.js';

test('arrival cabin is enclosed timber with wind and no exterior backdrop', () => {
  const map = JSON.parse(fs.readFileSync('assets/maps/maillard_deck.json', 'utf8'));
  assert.equal(map.bgm, 'wind');
  assert.equal(map.backdrop, undefined);
  assert.ok(map.preload.every(path => !path.includes('maillard_sea')));
  assert.equal(map.enter.script, 'maillard_hold');
  assert.equal(map.enter.flag, 'maillard_hold_done');
  assert.ok(map.entities.some(entity => entity.id === 'hold_stairs' && entity.script));
});

test('hold arrival has a one-time completion gate and tracked rightward departure', () => {
  const nodes = SCRIPTS.maillard_hold;
  assert.ok(nodes);
  assert.equal(nodes[0].hide, 'player');
  const exit = nodes.findIndex(node => node.move === 'yongjun' && node.track);
  assert.ok(exit > 0);
  assert.equal(nodes[exit].run, true);
  assert.equal(nodes[exit].rel, 'hold_stairs');
  assert.ok(nodes.slice(exit + 1).some(node => node.remove === 'yongjun'));
  assert.ok(nodes.slice(exit + 1).some(node => node.camera === 'player'));
  assert.ok(nodes.some(node => node.set?.maillard_hold_done));
});

test('hold QA preserves rescue progress without skipping the new arrival', () => {
  const point = QA_POINTS.find(point => point.id === 'maillard_deck');
  assert.equal(point.flags.obj5_maillard_done, true);
  assert.ok(!point.flags.maillard_hold_done);
  assert.equal(point.map, 'maillard_deck');
});
