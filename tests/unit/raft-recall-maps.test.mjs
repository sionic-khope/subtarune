import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { getTile } from '../../src/world/tiles.js';

const maps = JSON.parse(fs.readFileSync('assets/maps/index.json')).maps.map(id => JSON.parse(fs.readFileSync(`assets/maps/${id}.json`)));
const rafts = maps.flatMap(map => map.entities.filter(entity => entity.type === 'raft' && entity.id !== 'maillard_cart').map(raft => ({ map, raft })));
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const rect = entity => {
  if (entity.w !== undefined) return { ...entity, h: entity.h ?? 16 };
  if (entity.image && fs.existsSync(entity.image)) {
    const png = fs.readFileSync(entity.image), scale = entity.scale ?? 1;
    const w = png.readUInt32BE(16) / (entity.anim?.cols ?? 1) * scale, height = png.readUInt32BE(20) * scale;
    const h = Math.max(4, Math.round(height * 0.4));
    return { ...entity, w, h, y: entity.y + height - h };
  }
  return { ...entity, w: 24, h: 16 };
};

test('every actual raft bank has one recall lever and rail cart remains excluded', () => {
  assert.equal(rafts.length, 25);
  const levers = maps.flatMap(map => map.entities.filter(entity => entity.type === 'raft_recall'));
  assert.equal(levers.length, 49);
  for (const { map, raft } of rafts) {
    const endpoints = map.entities.filter(entity => entity.type === 'raft_recall' && entity.raft === raft.id).map(entity => entity.endpoint).sort();
    assert.deepEqual(endpoints, raft.id === 'obj5_raft' ? ['start'] : ['end', 'start'], `${map.id}.${raft.id}`);
  }
  assert.ok(!levers.some(lever => lever.raft === 'maillard_cart'));
});

for (const map of maps.filter(map => map.entities.some(entity => entity.type === 'raft_recall'))) {
  const levers = map.entities.filter(entity => entity.type === 'raft_recall');
  test(`${map.id}: nearby recall pillars have separate visible sprite bounds`, () => {
    for (let index = 0; index < levers.length; index++) {
      for (const other of levers.slice(index + 1)) {
        const lever = levers[index];
        assert.ok(!overlap({ x: lever.ix, y: lever.iy, w: 32, h: 48 }, { x: other.ix, y: other.iy, w: 32, h: 48 }), `${lever.id} overlaps ${other.id}`);
      }
    }
  });
  const blockers = map.entities.filter(entity => entity.type !== 'raft' && entity.solid !== false && ['prop', 'npc', 'raft_recall'].includes(entity.type)).map(rect);
  const onGround = box => [[box.x, box.y], [box.x + box.w - 1, box.y], [box.x, box.y + box.h - 1], [box.x + box.w - 1, box.y + box.h - 1]].every(([x, y]) => !getTile(map.rows[Math.floor(y / 32)]?.[Math.floor(x / 32)] ?? ' ').solid);
  const free = box => onGround(box) && !blockers.some(blocker => overlap(box, blocker));
  for (const lever of levers) test(`${map.id}.${lever.id}: solid bank supports lever, C approach and boarding path`, () => {
    assert.ok(onGround(lever), 'lever foot lies entirely on existing walkable bank');
    assert.ok(!blockers.some(blocker => blocker.id !== lever.id && overlap(lever, blocker)), 'lever does not overlap existing obstacle');
    assert.ok(!map.entities.filter(entity => ['door', 'trigger'].includes(entity.type)).some(entity => overlap(lever, rect(entity))), 'lever does not block an event or exit');
    for (const spawn of Object.values(map.spawns)) assert.ok(!overlap(lever, { ...spawn, w: 24, h: 16 }), 'lever does not overlap spawn');
    for (const image of [lever.image, lever.imageOn]) assert.ok(map.preload.includes(image), 'both lever states preloaded');
    const raft = map.entities.find(entity => entity.type === 'raft' && entity.id === lever.raft);
    const [rx, ry] = lever.endpoint === 'start' ? [raft.x, raft.y] : raft.route.at(-1);
    const dock = { x: rx, y: ry, w: 56, h: 40 };
    const probes = [[0, -19, 'up'], [0, 19, 'down'], [-19, 0, 'left'], [19, 0, 'right']];
    const candidates = [];
    for (let y = Math.floor((lever.y - 40) / 4) * 4; y <= lever.y + 40; y += 4) {
      for (let x = Math.floor((lever.x - 44) / 4) * 4; x <= lever.x + 36; x += 4) {
        const player = { x, y, w: 24, h: 16 };
        if (free(player)) for (const [dx, dy, facing] of probes) if (overlap({ ...player, x: x + dx, y: y + dy }, lever)) candidates.push({ x, y, facing });
      }
    }
    assert.ok(candidates.length, 'C probe reaches lever from solid bank');
    const queue = candidates.map(candidate => [candidate.x, candidate.y]);
    const visited = new Set(queue.map(point => point.join(',')));
    let reached = false;
    for (let index = 0; index < queue.length && !reached; index++) {
      const [x, y] = queue[index], player = { x, y, w: 24, h: 16 };
      reached = probes.some(([dx, dy]) => overlap({ ...player, x: x + dx, y: y + dy }, dock));
      for (const [dx, dy] of [[4, 0], [-4, 0], [0, 4], [0, -4]]) {
        const nx = x + dx, ny = y + dy, key = `${nx},${ny}`;
        if (Math.abs(nx - rx) > 160 || Math.abs(ny - ry) > 160 || visited.has(key) || !free({ x: nx, y: ny, w: 24, h: 16 })) continue;
        visited.add(key); queue.push([nx, ny]);
      }
    }
    assert.ok(reached, 'lever C approach connects across solid bank to real raft boarding probe');
  });
}
