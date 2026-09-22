import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { drawCoastWater, drawCoastWake } from '../../src/world/coast-water.js';

const read = n => JSON.parse(fs.readFileSync(`assets/maps/jjajang_night_coast${n}.json`, 'utf8'));
const inside = (polygon, x, y) => {
  let hit = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [ax, ay] = polygon[i], [bx, by] = polygon[j];
    if ((ay > y) !== (by > y) && x < (bx - ax) * (y - ay) / (by - ay) + ax) hit = !hit;
  }
  return hit;
};

test('near water covers the raft and both swimmer waterlines throughout every ferry crossing', () => {
  for (const n of [2, 3]) {
    const map = read(n);
    for (const raft of map.entities.filter(e => e.type === 'raft')) {
      const inlet = map.meta.coast.nearWater?.find(w => w.raft === raft.id);
      assert.ok(inlet, `${raft.id} needs a local water surface, not backdrop void`);
      const [endX, endY] = raft.route.at(-1);
      for (let step = 0; step <= 100; step++) {
        const x = raft.x + (endX - raft.x) * step / 100;
        const y = raft.y + (endY - raft.y) * step / 100;
        for (const [dx, dy] of [[0, 0], [56, 40], [2, 58], [56, 58], [28, 76]]) {
          assert.ok(inside(inlet.polygon, x + dx, y + dy), `${raft.id} ${step}% lacks water at ${x + dx},${y + dy}`);
        }
      }
    }
  }
});

test('near water remains visual-only and leaves the ferry-free room untouched', () => {
  assert.equal(read(1).meta.coast.nearWater, undefined);
  for (const n of [2, 3]) {
    const map = read(n);
    for (const raft of map.entities.filter(e => e.type === 'raft')) {
      const x = Math.floor((raft.x + raft.route[0][0]) / 2 / 32);
      const y = Math.floor((raft.y + 40) / 32);
      assert.equal(map.rows[y][x], '!');
    }
  }
});

test('foreground water has no lateral cut when walking away from a ferry bank', () => {
  for (const n of [2, 3]) {
    const map = read(n), width = map.rows[0].length * 32;
    for (const raft of map.entities.filter(e => e.type === 'raft')) {
      const inlet = map.meta.coast.nearWater.find(w => w.raft === raft.id);
      for (const depth of [40, 100, 240, 320]) {
        for (let x = -240; x <= width + 240; x += 16) {
          assert.ok(inside(inlet.polygon, x, raft.y + depth), `${raft.id} exposes a side seam at ${x},${raft.y + depth}`);
        }
      }
    }
  }
});

const capture = () => ({
  points: [], rectangles: [], fillStyle: '',
  save() {}, restore() {}, beginPath() {}, closePath() {}, clip() {},
  createLinearGradient() { return { addColorStop() {} }; },
  moveTo(x, y) { this.points.push([x, y]); },
  lineTo(x, y) { this.points.push([x, y]); },
  fillRect(x, y, w, h) { this.rectangles.push({ x, y, w, h, color: this.fillStyle }); },
});

test('near-water shore and visible wave texture move with the terrain when the camera scrolls', () => {
  const coast = read(2).meta.coast;
  const a = capture(), b = capture();
  const cameraA = { x: 1600, y: 140 }, cameraB = { x: 1632, y: 164 };
  drawCoastWater(a, coast, cameraA, 4, null);
  drawCoastWater(b, coast, cameraB, 4, null);
  assert.deepEqual(b.points, a.points.map(([x, y]) => [x - 32, y - 24]));
  const worldWaves = (ctx, cam) => ctx.rectangles.filter(r => r.h === 1)
    .map(r => ({ ...r, x: r.x + cam.x, y: r.y + cam.y }))
    .filter(r => r.x > 1680 && r.x < 2040 && r.y > 180 && r.y < 480);
  const expected = worldWaves(a, cameraA);
  assert.ok(expected.length > 40, 'the local surface needs visible fine wavelets');
  assert.deepEqual(worldWaves(b, cameraB), expected);
});

test('contact wakes use both swimmer waterlines and the raft bottom while following camera motion', () => {
  const coast = read(2).meta.coast;
  const entities = [
    { x: 1700, y: 284, w: 56, h: 40, visible: true, def: { type: 'raft' } },
    { x: 1702, y: 330, w: 24, h: 12, visible: true, def: { type: 'swimmer' } },
    { x: 1732, y: 330, w: 24, h: 12, visible: true, def: { type: 'swimmer' } },
  ];
  const ctx = capture(), cam = { x: 1500, y: 140 };
  drawCoastWake(ctx, coast, entities, cam, 3);
  for (const e of entities) {
    assert.ok(ctx.rectangles.some(r => r.x === e.x - cam.x - 4 && r.y === e.y + e.h - cam.y + 1 && r.w === e.w + 8));
  }
});
