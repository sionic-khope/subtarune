import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { TileMap } from '../../src/world/world.js';

const map = JSON.parse(fs.readFileSync('assets/maps/gajaeman_castle_arena.json', 'utf8'));

test('test_arena_causeway_reaches_the_rim_and_the_camera_has_room_to_climb', () => {
  const world = new TileMap(map), pad = map.meta.arena.topPad;
  assert.ok(pad >= 2000, 'a long climb above the chamber');
  for (let y = map.spawns.start.y; y >= map.spawns.rim.y; y -= 8) assert.equal(world.solidRect(map.spawns.start.x, y, 24, 16), false);
  for (let x = 40; x <= 704; x += 8) assert.equal(world.solidRect(x, map.spawns.rim.y, 24, 16), false, `rim walkable at ${x}`);
  assert.equal(map.bgm, null, 'arrival starts in silence');
  for (const src of ['arena332_room', 'arena332_upper', 'arena332_cheong', 'arena332_arm', 'arena332_giant']) assert.ok(fs.existsSync(`assets/props/${src}.png`));
});

test('test_arena_summons_five_varied_monsters_on_each_side', () => {
  const list = map.meta.arena.summons;
  assert.equal(list.filter(s => s.side === 'left').length, 5);
  assert.equal(list.filter(s => s.side === 'right').length, 5);
  const heights = list.map(s => map.entities.find(e => e.id === s.id)).map(e => e && fs.existsSync(e.image));
  assert.ok(heights.every(Boolean));
  for (const s of list) assert.ok(s.side === 'left' ? s.x < 300 : s.x > 470, `${s.id} stays on its wing`);
});

test('test_arena_intro_uses_the_user_lines_verbatim_in_order', async () => {
  const { SCRIPTS } = await import('../../src/data/scripts.js');
  const lines = SCRIPTS.castle_arena_intro.filter(n => n.text).map(n => `${n.speaker}: ${n.text.slice(2).replace(/\{\/?[a-z]+(=[^}]*)?\}/g, '')}`);
  assert.deepEqual(lines.slice(0, 6), ['가재맨: ...', '가재맨: 섭타룬.', '가재맨: 내가 지금 이렇게 활동할 수 있는 힘의 근원이자',
    '가재맨: 모든 것을 없애버릴 수 있는 강력한 힘', '가재맨: 그것이 섭타룬이다.', '영클: ㅇㅉ']);
  assert.ok(lines.includes('영클: 돈 주는 사장님이기에 소중하다!!!'));
  assert.ok(lines.includes('파크가디언: 응 잘가세연'));
  assert.ok(lines.includes('가재맨: 잘 가 라.'));
  assert.equal(lines.at(-1), '억빠맨: 형 빨리 도망가요');
  assert.equal(lines.length, 47);
});
