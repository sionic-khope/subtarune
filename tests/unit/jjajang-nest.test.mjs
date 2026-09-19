// 드럼통 둥지(BUILD249): 왼쪽 입구에서 1초쯤 걸으면 드럼통 더미가 두른 동그란 공간(보스전 맵 느낌), 브금 없음, 가운데 오른쪽에 상호작용 드럼통. 굽은 물길 오른쪽 문에서 이어진다.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { SCRIPTS } from '../../src/data/scripts.js';
import { QA_POINTS, storyBgm, JJAJANG_AFTER_JOIN_MAPS } from '../../src/core/story.js';

const load = id => JSON.parse(readFileSync(new URL(`../../assets/maps/${id}.json`, import.meta.url), 'utf8'));
const nest = load('jjajang_nest'), bend = load('jjajang_bend2');
const walk = (m, c, r) => m.rows[r]?.[c] === '*' || m.rows[r]?.[c] === '+';
const WALK_SPEED = 120;   // 걷기 px/s

test('test_nest_is_a_round_arena_one_second_past_the_entrance', () => {
  const { center: [cx, cy], radius } = nest.meta.nest;
  const W = nest.rows[0].length, H = nest.rows.length;
  // 원: 중심에서 반지름 안은 걷는 칸, 반지름 밖(+2)은 숲
  for (const [dx, dy] of [[0, 0], [radius - 1, 0], [0, radius - 1], [-(radius - 1), 0], [0, -(radius - 1)]]) assert.ok(walk(nest, cx + dx, cy + dy), `원 안 ${dx},${dy}`);
  for (const [dx, dy] of [[0, -(radius + 2)], [0, radius + 2], [radius + 2, 0]]) assert.ok(!walk(nest, cx + dx, cy + dy), `원 밖 ${dx},${dy}`);
  assert.ok(radius >= 8 && radius * 2 * 32 > 480 && radius * 2 * 32 < 700, `적당히 큰 공간 — 지름 ${radius * 2 * 32}px 이라 둘러싼 드럼통 벽이 화면(480)에 걸쳐 보인다`);
  // 입구: 왼쪽 가장자리에서 원까지 걸어서 1초 안팎
  const spawn = nest.spawns.from_west;
  const entryRow = Math.floor(spawn.y / 32);
  for (let c = 0; c <= cx - radius; c++) assert.ok(walk(nest, c, entryRow), `입구 길 ${c}`);
  const seconds = ((cx - radius) * 32 - spawn.x) / WALK_SPEED;
  assert.ok(seconds > 0.6 && seconds < 2.2, `원까지 약 1초 (${seconds.toFixed(2)}초)`);
  assert.equal(nest.rows[entryRow][0], '+', '왼쪽 가장자리는 출입구 타일');
  // 브금 없음
  assert.equal(nest.bgm, null, '맵 브금 없음 → changeMap 이 stopBgm');
  assert.equal(storyBgm('jjajang_nest', { torii_janitor_joined: true, janitor_left: true }), undefined, '스토리 브금 덮어쓰기도 없다');
  assert.ok(!JJAJANG_AFTER_JOIN_MAPS.includes('jjajang_nest'), '브금을 이어 주는 목록에 넣지 않는다');
});

test('test_nest_is_ringed_with_drum_piles_and_has_one_drum_to_interact_with', () => {
  const { center: [cx, cy], radius, drumCol } = nest.meta.nest;
  const piles = nest.entities.filter(e => /jjajang_nest_pile/.test(e.id || ''));
  assert.ok(piles.length >= 10, `둘레 드럼통 더미 ${piles.length}개`);
  let ring = 0, inner = 0;
  for (const p of piles) {
    const col = Math.floor((p.x + 12) / 32), row = Math.floor((p.y + 6) / 32);
    const d = Math.hypot(col - cx, row - cy);
    if (d > radius) { ring += 1; assert.ok(d < radius + 4 && nest.rows[row][col] === '@', `${p.id}: 둘레(밑동은 길 밖) (${d.toFixed(1)})`); }
    else { inner += 1; assert.ok(d >= 4, `${p.id}: 가운데는 비워 둔다 (${d.toFixed(1)})`); }
    assert.ok(p.solid && existsSync(new URL('../../' + p.image, import.meta.url)), p.id);
    assert.ok(p.ix <= p.x && p.iy + 48 <= p.y + p.h, `${p.id}: 히트박스는 그림 안`);
  }
  assert.ok(ring >= 12, `둘레를 촘촘히 두른다 (${ring})`);
  assert.ok(inner >= 3, `공간 안에도 쓰레기장처럼 널브러져 있다 (${inner})`);
  assert.ok(new Set(piles.map(p => p.image)).size === 2, '큰 더미·작은 더미가 섞여 쓰레기장처럼');
  const drum = nest.entities.find(e => e.id === 'jjajang_nest_drum');
  assert.ok(drum && drum.solid && drum.script === 'jjajang_nest_drum', '상호작용 드럼통');
  assert.equal(Math.floor((drum.x + 12) / 32), drumCol);
  assert.ok(drumCol > nest.rows[0].length / 2 && drumCol > cx, '맵 가운데보다 살짝 오른쪽');
  assert.equal(nest.rows[Math.floor((drum.y + 6) / 32)][drumCol], '*', '원 안(길 위)에 서 있다');
  assert.ok(SCRIPTS.jjajang_nest_drum && SCRIPTS.jjajang_nest_drum.every(n => n.voice === 'narrator'), '연출 브리핑 전까지는 나레이션 한 줄');
  const west = nest.entities.find(e => e.type === 'door');
  assert.deepEqual([west.to, west.spawn, west.x], ['jjajang_bend2', 'from_east', 0]);
  assert.equal(nest.entities.filter(e => e.type === 'door').length, 1, '출구는 왼쪽 하나(보스전 맵 느낌)');
  const east = bend.entities.find(e => e.id === 'bend2_nest_door');
  assert.deepEqual([east.to, east.spawn, east.x], ['jjajang_nest', 'from_west', bend.rows[0].length * 32 - 10]);
  const qa = id => QA_POINTS.find(p => p.id === id);
  assert.ok(qa('jjajang_nest') && qa('jjajang_nest_center').spawn === 'before_drum');
});
