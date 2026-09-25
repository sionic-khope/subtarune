import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { TileMap } from '../../src/world/world.js';

const map = JSON.parse(fs.readFileSync('assets/maps/gajaeman_castle_stairs.json', 'utf8'));
const arena = JSON.parse(fs.readFileSync('assets/maps/gajaeman_castle_arena.json', 'utf8'));

test('test_stairs_are_reached_by_walking_right_off_the_arena_terrace', () => {
  const door = arena.entities.find(e => e.type === 'door' && e.to === map.id);
  assert.ok(door && door.interact === false && door.x + door.w === new TileMap(arena).pxW, 'right edge of the arena');
  const world = new TileMap(map), sp = map.spawns[door.spawn];
  assert.equal(world.solidRect(sp.x, sp.y, 24, 16), false);
});

test('test_stairs_path_takes_about_a_minute_at_stair_pace_and_stays_walkable', () => {
  const world = new TileMap(map), path = map.meta.stairs.path;
  let length = 0;
  for (let i = 1; i < path.length; i++) {
    const [ax, ay] = path[i - 1], [bx, by] = path[i];
    length += Math.hypot(bx - ax, by - ay);
    for (let k = 0; k <= 10; k++) {
      const x = ax + (bx - ax) * k / 10, y = ay + (by - ay) * k / 10;
      assert.equal(world.solidRect(x - 12, y - 8, 24, 16), false, `walkable at ${Math.round(x)},${Math.round(y)}`);
    }
  }
  const toTopLanding = length - Math.hypot(0, path.at(-2)[1] - path.at(-1)[1]);
  assert.ok(toTopLanding / 124.8 > 52 && toTopLanding / 124.8 < 66, `${(toTopLanding / 124.8).toFixed(1)}s`);
  assert.equal(map.meta.stairs.smash.length, 6);
  assert.deepEqual(map.meta.stairs.allies.map(a => a[0]), ['stairs_park', 'stairs_ttuulla', 'stairs_junhee']);
});

test('test_stairs_scripts_use_the_user_lines', async () => {
  const { SCRIPTS } = await import('../../src/data/scripts.js');
  const text = id => SCRIPTS[id].filter(n => n.text).map(n => `${n.speaker}: ${n.text.slice(2)}`);
  assert.deepEqual(text('castle_stairs_monsters'), ['억빠맨: 으윽,,,몬스터네요 어떡하죠.', '파크가디언: ...', '뚜울라알라: ...', '파크가디언: 이얍!', '뚜울라알라: 이얍!']);
  assert.deepEqual(text('castle_stairs_nunu'), ['쥰희: 잘... 부탁한다 너네들 살아서보자.', '쥰희: 이얍!']);
});
