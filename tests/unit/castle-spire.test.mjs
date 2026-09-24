import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { TileMap } from '../../src/world/world.js';

const readMap = id => JSON.parse(fs.readFileSync(`assets/maps/${id}.json`, 'utf8'));

test('test_spire_hall2_top_edge_leads_to_the_spire_and_boss_leaves_first', () => {
  const hall = readMap('gajaeman_castle_cathedral2'), spire = readMap('gajaeman_castle_spire');
  const door = hall.entities.find(entity => entity.type === 'door' && entity.to === spire.id);
  assert.ok(door, 'hall 2 success edge needs a real next map');
  assert.deepEqual([door.y, door.interact, door.spawn], [0, false, 'start']);
  // BUILD328: 가재맨은 이미 다음 맵으로 갔다 — 둘째 회랑 끝에는 없다
  assert.equal(hall.entities.some(entity => entity.sprite === 'gajaeman_shadow'), false);
  assert.equal(hall.meta.cathedralClimb.leaveY, 0);
  assert.equal(new TileMap(spire).solidRect(spire.spawns.start.x, spire.spawns.start.y, 24, 16), false);
});

test('test_spire_is_one_windless_navy_aisle_up_to_the_spring_room_with_an_open_north_passage', async () => {
  const map = readMap('gajaeman_castle_spire'), world = new TileMap(map);
  assert.equal(map.meta.cathedralClimb, undefined, 'no wind, heart or sword hazard');
  assert.deepEqual(map.enter, { script: 'castle_spire_intro', early: true });
  const tiles = new Set(map.rows.join('').replace(/ /g, ''));
  assert.deepEqual([...tiles].sort(), ['▒', '╟', '╢'].sort());
  for (const x of [308, 372, 436]) for (let y = 0; y <= map.spawns.start.y; y += 8) assert.equal(world.solidRect(x, y, 24, 16), false);
  // BUILD328: 북쪽 끝은 밟는 문으로 예언의 회랑에 이어진다
  assert.deepEqual(map.entities.filter(entity => entity.type === 'door').map(door => [door.to, door.y, door.interact]), [['gajaeman_castle_prophecy', 0, false]]);
  const spring = map.entities.find(entity => entity.id === 'spire_spring');
  assert.equal(spring.script, 'maillard_spring');
  assert.ok(spring.y > 128 && spring.y < 576, 'spring sits in the top room');
  assert.equal(world.solidRect(map.spawns.spring.x, map.spawns.spring.y, 24, 16), false);
  for (const id of ['spire_gajaeman', 'spire_junhee', 'spire_youngcle']) assert.equal(map.entities.find(entity => entity.id === id).hidden, true);
  const back = map.entities.find(entity => entity.id === 'spire_back');
  assert.equal(back.y + back.h, world.pxH);
  const { SCRIPTS } = await import('../../src/data/scripts.js');
  assert.deepEqual(SCRIPTS.castle_spire_back.map(node => node.text), ['* 앞이 먼저다.']);
  assert.equal(SCRIPTS.castle_spire_intro.some(node => node.text), false, 'no invented lines in the arrival');
});

test('test_spire_intro_anchors_keep_runners_and_party_off_screen_until_they_enter', async () => {
  const map = readMap('gajaeman_castle_spire');
  const { SPIRE } = await import('../../src/data/cutscenes/castle_spire.js');
  const viewTop = SPIRE.entryCam[1] * 32 + 16 - 180, viewBottom = viewTop + 360;
  const at = id => map.entities.find(entity => entity.id === id);
  for (const id of ['player', 'gyeongsub', 'ppaman']) assert.ok(at(`spire_in_${id}`).y + 16 - 48 > viewBottom, `${id} starts below the view`);
  for (const id of ['player', 'gyeongsub', 'ppaman']) assert.ok(at(`spire_stand_${id}`).y < viewBottom - 40, `${id} stands inside the view`);
  assert.ok(at('spire_run_out').y + 16 < viewTop, 'runners leave through the top of the view');
  assert.ok(at('spire_gajaeman').y > viewTop && at('spire_gajaeman').y < viewBottom, 'gajaeman is in the first frame');
  assert.equal(at('spire_stand_ppaman').x - at('spire_stand_gyeongsub').x, 128);
});
