// 조종실 입장 연출(BUILD202) ↔ 맵 youngcle20 정합: 컷신이 직접 든 자리 상수가 맵 생성기 meta 와 같아야 한다(맵을 옮기면 연출도 같이 옮긴다).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('test_ship_control_intro_spots_match_map_meta', () => {
  const map = JSON.parse(fs.readFileSync('assets/maps/youngcle20.json', 'utf8'));
  const src = fs.readFileSync('src/data/cutscenes/ship_control.js', 'utf8');
  const m = src.match(/const SPOT = (\{[^}]*\})/);
  assert.ok(m, 'SPOT 상수가 있어야 한다');
  const spot = Function(`return ${m[1]}`)();
  assert.deepEqual(spot, { junhee: map.meta.junhee, yongjun: map.meta.yongjun, ycEnter: map.meta.ycEnter, ycStand: map.meta.ycStand, cageDrop: map.meta.cageDrop });
  const ids = new Set(map.entities.map((e) => e.id));
  for (const id of ['ship_junhee', 'ship_yongjun', 'ship_youngcle', 'ship_obangsun', 'ship_naram', 'ship_cage', 'ship_cage_open', 'ship_cannon', 'ship_logo', 'ship_youngcle_down', 'ship_gajaeman']) assert.ok(ids.has(id), `${id} 가 맵에 없다`);
  // 보스전 뒤 연출(BUILD211): 가재맨 자리는 컷신 AFTER.gajaeman 과 맵 meta.gajaeman 이 같아야 하고, 변신·힘 받는 시트는 맵이 미리 읽는다
  const after = src.match(/const AFTER = (\{[^}]*\})/);
  assert.ok(after, 'AFTER 상수가 있어야 한다');
  assert.deepEqual(Function(`return ${after[1]}`)().gajaeman, map.meta.gajaeman);
  const gj = map.entities.find((e) => e.id === 'ship_gajaeman');
  assert.equal(gj.sprite, 'gajaeman_shadow'); assert.ok(gj.hidden, '가재맨은 연출 전엔 숨긴다');
  for (const src of ['assets/sprites/gajaeman_shadow.png', 'assets/sprites/youngcle_powerup.png', 'assets/sprites/youngcle_tvform.png']) assert.ok(map.preload.includes(src) && fs.existsSync(src), `${src} preload·존재`);
  assert.equal(map.enter?.script, 'ship_control_intro');
  for (const src of ['assets/props/ship_cannonball.png', 'assets/fx/cannon_smoke.png', 'assets/props/ship_cage.png', 'assets/props/ship_cage_open.png']) assert.ok(map.preload.includes(src) && fs.existsSync(src), `${src} preload·존재`);
});
