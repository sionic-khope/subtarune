import test from 'node:test';
import assert from 'node:assert/strict';
import { MaillardArrival } from '../../src/scenes/maillard-arrival.js';
import { MAILLARD_ARRIVAL as C, obj5_maillard } from '../../src/data/cutscenes/obj5_maillard.js';

test('maillard full ship fits above dialogue after zooming out from beyond screen', () => {
  const scene = Object.assign(Object.create(MaillardArrival.prototype), { ship: { width: 768, height: 512 }, beat: 'reveal', beatTime: 0 });
  assert.ok(scene.shipRect().width > 480);
  scene.beatTime = C.zoomDuration;
  const silent = scene.shipRect();
  assert.ok(silent.y >= 0 && silent.y + silent.height <= 360);
  scene.beat = 'compose'; scene.beatTime = C.composeDuration;
  const rect = scene.shipRect();
  assert.ok(rect.x >= 0 && rect.x + rect.width <= 480);
  assert.ok(rect.y >= 0 && rect.y + rect.height <= 230);
});

test('maillard keeps ocean moving without advancing shooter combat', () => {
  const model = { time: 10, scroll: 20, hits: 400, config: { scrollSpeed: 70 } };
  const scene = Object.assign(Object.create(MaillardArrival.prototype), { sea: { model }, time: 0, beatTime: 0 });
  scene.update(0.5);
  assert.equal(model.scroll, 55);
  assert.equal(model.time, 10.5);
  assert.equal(model.hits, 400);
});

test('maillard preserves supplied dialogue and voice-only Junhee entrance', () => {
  const lines = obj5_maillard.filter(node => node.text);
  assert.equal(lines.length, 14);
  assert.equal(lines[0].text, '* 해 해치운건가?');
  assert.equal(lines[3].text, '* 이몸 등장 !!!!!!');
  assert.equal(lines[3].voice, 'junhee');
  assert.equal(lines[3].portrait, undefined);
  assert.ok(lines.some(line => line.text.includes('{c=yellow}그것{/c}')));
  assert.ok(lines.some(line => line.text === '* {shake}닥치고 우리나 좀 올려 애미씨발창년아{/shake}'));
  assert.equal(lines.at(-1).text, '* ... 어');
});

test('maillard completion happens inside white transition before returning control', () => {
  const actions = obj5_maillard.map(node => node.action?.toString() || '');
  const index = actions.findIndex(source => source.includes('finishMaillardArrival'));
  assert.equal(obj5_maillard[index - 2].fade, 'white');
  assert.equal(obj5_maillard[index - 1].wait, C.boardingHold);
  assert.ok(C.boardingHold >= 1.5);
  assert.equal(obj5_maillard[index - 3].sfx, 'maillard_water_lift');
  assert.equal(obj5_maillard.at(-1).end, true);
});

test('revealed and boarding ship never redraw the defeated Baron', () => {
  let bossDraws = 0;
  const ctx = new Proxy({}, { get: () => () => {} });
  const scene = Object.assign(Object.create(MaillardArrival.prototype), {
    sea: { model: { config: { raft: { x: 96 } }, raftY: 200 }, drawOcean() {}, drawRaft() {}, drawBoss() { bossDraws++; } },
    game: {}, ship: null, island: null, time: 0, sailTime: 0, beatTime: 3,
    drawWake() {}, drawWaterline() {}, drawJunhee() {},
  });
  for (const beat of ['reveal', 'hops', 'compose', 'spotlight', 'laugh', 'island', 'boarding']) {
    scene.beat = beat;
    scene.draw(ctx);
  }
  assert.equal(bossDraws, 0);
});

test('ship cruises bow-first left with water moving right and stays inside dialogue frame', () => {
  const model = { time: 0, scroll: 0, hits: 400, config: { scrollSpeed: 70 } };
  const scene = Object.assign(Object.create(MaillardArrival.prototype), { sea: { model }, ship: { width: 768, height: 512 }, time: 0, sailTime: 0, beat: 'spotlight', beatTime: 0 });
  const start = scene.shipRect();
  scene.update(3);
  assert.ok(scene.shipRect().x < start.x);
  assert.ok(model.scroll < 0);
  for (let i = 0; i < 50; i++) {
    scene.update(0.1);
    const rect = scene.shipRect();
    assert.ok(rect.x >= 0 && rect.y >= 0 && rect.x + rect.width <= 480 && rect.y + rect.height <= 230);
  }
  assert.equal(model.hits, 400);
});
