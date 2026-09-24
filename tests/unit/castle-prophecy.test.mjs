import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { TileMap } from '../../src/world/world.js';

const map = JSON.parse(fs.readFileSync('assets/maps/gajaeman_castle_prophecy.json', 'utf8'));
const WALK = 218.4;

test('test_prophecy_six_panels_reveal_about_three_seconds_apart_on_the_left_of_the_view', async () => {
  const list = map.meta.prophecy;
  assert.deepEqual(list.map(p => p.text), ['인생의 시작', '실패와 고통', '성공의 갈망, 후회', '외딴섬', '다시 시작.', '끝']);
  for (let i = 1; i < list.length; i++) {
    const seconds = (list[i].at - list[i - 1].at) / WALK;
    assert.ok(seconds > 2.7 && seconds < 3.3, `gap ${i}: ${seconds}`);
  }
  const { panelRect } = await import('../../src/scenes/prophecy-hall.js');
  for (const p of list) {
    assert.ok(fs.existsSync(p.image));
    // 드러날 때는 화면 오른쪽 가운데, 3초 뒤(다음 그림이 나올 때)에는 왼쪽 절반 안에 온전히 남는다
    const camAt = seconds => p.at - 228 + seconds * WALK;
    const now = panelRect(p, camAt(0)), later = panelRect(p, camAt(3));
    assert.ok(now.x > 160 && now.x + now.w < 480, `${p.text} appears inside the view`);
    assert.ok(later.x >= 0 && later.x + later.w <= 240, `${p.text} on the left half 3s later: ${later.x}`);
    assert.ok(now.y - 20 > 40, 'label stays below the view top');
  }
});

test('test_prophecy_path_is_narrow_and_ends_under_the_grand_door', async () => {
  const world = new TileMap(map);
  assert.equal(new Set(map.rows.join('').replace(/ /g, '')).size, 1);
  assert.equal(map.rows.filter(row => row.includes('▓')).length, 2, 'two-tile path');
  for (let x = 0; x <= map.spawns.door.x; x += 8) assert.equal(world.solidRect(x, 336, 24, 16), false);
  const door = map.entities.find(entity => entity.id === 'prophecy_door');
  assert.equal(door.script, 'castle_prophecy_door');
  assert.ok(door.x < map.spawns.door.x && door.x + door.w > map.spawns.door.x + 24);
  assert.equal(map.bgm, 'dark_place');
  assert.ok(fs.existsSync('assets/audio/bgm/dark_place.mp3'));
  assert.equal(map.entities.some(entity => entity.type === 'door'), false, 'next map not made yet');
  const { SCRIPTS } = await import('../../src/data/scripts.js');
  assert.deepEqual(SCRIPTS.castle_prophecy_door.filter(node => node.text).map(node => `${node.speaker || '나레이션'}: ${node.text.slice(2)}`), [
    '억빠맨: ...', '억빠맨: 요플래형, 경섭이형', '경섭: 응 빠맨아', '억빠맨: 저는 그리고 저희는, 형들과 함께라서 기뻐요', '경섭: ...',
    '억빠맨: 우리는 꼭 형섭이형을 구해 돌아갈거에요 그렇죠?', '경섭: 응 당연하지.', '경섭: 구하자 형섭이', '경섭: 구하자. 세상을.',
    '나레이션: ...', '나레이션: 지금까지 길고길었던 모험의 끝이 보이는 듯 하다.', '나레이션: 결전의 시간이다.']);
});
