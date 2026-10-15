// 청소부 히든 보스 필드 연출(BUILD469 사용자 2026-10-15 다섯 요청): 분수 = 홀로 탁자 뒤편 버튼, 허약 청소부 첫 등장 곡·절반 거리,
//   드럼통 악마전 상승·낙하(붉은 잔상·소리), “너희를 계엄해주겠다.” 뒤 대치 → 껄껄 → 깃발 공격 → 전투. 콘티 design/narrative/cutscenes/janitor_hidden.md
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ship_basement_janitor, JANITOR_HIDDEN as J } from '../../src/data/cutscenes/janitor_hidden.js';
import { DRUM_DEVIL_RESCUE } from '../../src/data/drum-devil-rescue.js';
import { JANITOR_HERO_ACTIONS } from '../../src/data/janitor-hero-actions.js';
import { CHARACTER_MOTIONS } from '../../src/data/character-motions.js';
import { CHARACTERS } from '../../src/data/characters.js';
import { makeWaiter } from '../../src/ui/cutscene.js';
import { TILE } from '../../src/world/tiles.js';

const readMap = id => JSON.parse(fs.readFileSync(`assets/maps/${id}.json`, 'utf8'));
const lounge = readMap('ship_lounge'), basement = readMap('ship_basement');
const entity = (map, id) => map.entities.find(e => e.id === id);
const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
// world.js Character.probe 와 같은 자리: 바라보는 쪽으로 0.6칸 민 몸 상자
const probe = (x, y, dir) => { const [dx, dy] = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[dir]; return { x: x + dx * TILE * 0.6, y: y + dy * TILE * 0.6, w: 24, h: 16 }; };
// 노드 트리를 펼친다(parallel 가지·배열 가지 포함)
const flat = nodes => nodes.flatMap(n => Array.isArray(n) ? flat(n) : [n, ...(Array.isArray(n?.parallel) ? flat(n.parallel) : []), ...(Array.isArray(n?.async) ? flat(n.async) : [])]);
const topIndex = predicate => ship_basement_janitor.findIndex(n => flat([n]).some(predicate));

test('test_janitor_hidden_fountain_button_sits_behind_holo_table_reachable_only_facing_down', () => {
  const holo = entity(lounge, 'lounge_holo'), sign = entity(lounge, 'ship_lounge_fountain_button'), shop = entity(lounge, 'ship_lounge_shop');
  const spawn = lounge.spawns.fountain_back;
  // 분수 = 상점과 같은 높이의 건너편(오른쪽) 홀로 탁자
  assert.ok(holo.iy < shop.y + shop.h && holo.y + holo.h > shop.iy && holo.x > shop.x + shop.w, '상점 건너편');
  // 뒤편 = 탁자 그림 윗변 위에 발, 탁자 가운데
  assert.ok(spawn.y + 16 <= holo.iy + 8 && spawn.x + 12 > holo.x && spawn.x + 12 < holo.x + holo.w, JSON.stringify(spawn));
  assert.equal(spawn.facing, 'down');
  assert.ok(overlaps(probe(spawn.x, spawn.y, 'down'), sign), '스폰에서 아래를 보면 버튼');
  // 탁자에 몸을 붙여 서도(충돌 윗변 바로 위) 닿는다
  assert.ok(overlaps(probe(spawn.x, holo.y - 16, 'down'), sign), '탁자에 붙어 서도 버튼');
  // 탁자 아래에서 위를 보거나 옆에서 보면 닿지 않는다
  assert.ok(!overlaps(probe(spawn.x, holo.y + holo.h, 'up'), sign), '아래에서 위로는 안 닿음');
  assert.ok(!overlaps(probe(holo.x + holo.w, holo.y - 8, 'left'), sign), '오른쪽 옆에서는 안 닿음');
  assert.ok(!overlaps(probe(holo.x - 24, holo.y - 8, 'right'), sign), '왼쪽 옆에서는 안 닿음');
  // 작은 마나샘(ship_lounge_spring) 옆은 이제 버튼이 아니다
  const spring = entity(lounge, 'ship_lounge_spring');
  assert.ok(!overlaps(probe(spring.x, spring.y - 28, 'down'), sign), '마나샘 뒤는 버튼이 아님');
});

test('test_janitor_hidden_weak_janitor_walks_half_the_old_distance_from_inside_the_room', () => {
  const weak = entity(basement, J.weak), fall = basement.spawns.fall;
  const stopX = fall.x + 24 + J.weakStop[0];
  const oldStart = 900;
  assert.equal(weak.x - stopX, (oldStart - stopX) / 2, '벽 앞(900)에서 걷던 거리의 절반');
  // 걸음 속도는 그대로(46)
  const walk = flat(ship_basement_janitor).find(n => n.move === J.weak);
  assert.equal(walk.speed, 46); assert.equal(walk.rel, 'player'); assert.deepEqual(walk.by, [88, 0]);
});

test('test_janitor_hidden_weak_janitor_entrance_plays_first_appearance_bgm_and_slam_cuts_it', () => {
  const show = topIndex(n => n.show === J.weak);
  const entrance = ship_basement_janitor[show + 1];
  const bgm = flat([entrance]).find(n => 'bgm' in n);
  assert.equal(bgm.bgm, 'wise_words', '토리이 길 첫 등장 곡');
  assert.ok(bgm.fadeIn >= 1.2, '무음에서 켜는 곡은 1.2초 이상 페이드 인');
  assert.ok(flat([entrance]).some(n => n.move === J.weak), '걷기와 같이 시작');
  const slam = ship_basement_janitor[topIndex(n => n.drop === J.hero)];
  assert.ok(flat([slam]).some(n => 'bgm' in n && n.bgm === null), '내려찍을 때 곡이 끊김');
});

test('test_janitor_hidden_rise_and_dive_reuse_drum_devil_timing_sounds_and_red_trail', () => {
  const rise = ship_basement_janitor[topIndex(n => n.rise === J.weak)];
  const riseNode = flat([rise]).find(n => n.rise === J.weak);
  assert.equal(riseNode.duration, DRUM_DEVIL_RESCUE.rise);
  assert.equal(riseNode.trail, J.trail);
  assert.ok(flat([rise]).some(n => n.sfx === 'spearappear' && n.volume === 0.7 && Object.keys(n).length === 2));
  const dive = ship_basement_janitor[topIndex(n => n.drop === J.hero)];
  const dropNode = flat([dive]).find(n => n.drop === J.hero);
  assert.equal(dropNode.duration, DRUM_DEVIL_RESCUE.dive);
  assert.equal(dropNode.trail, J.trail);
  assert.ok(flat([dive]).some(n => n.sfx === 'wing' && n.volume === 0.9 && Object.keys(n).length === 2));
  const land = ship_basement_janitor[topIndex(n => n.drop === J.hero) + 1];
  assert.ok(flat([land]).some(n => n.sfx === 'impact' && n.volume === 0.9));
  assert.ok(flat([land]).some(n => n.shake === 0.45 && n.amp === 7));
  // 잔상 거리·투명도는 드럼통 악마전과 같은 34/70/112, 0.24−0.07i
  assert.deepEqual(J.trail.steps.map(([d]) => d), [34, 70, 112]);
  J.trail.steps.forEach(([, alpha], i) => assert.ok(Math.abs(alpha - (0.24 - i * 0.07)) < 1e-9));
});

test('test_janitor_hidden_faceoff_laugh_attack_follow_the_last_line_before_battle', () => {
  const last = ship_basement_janitor.findIndex(n => n.text === '* 너희를 계엄해주겠다.');
  const battleStart = ship_basement_janitor.findIndex((n, i) => i > last && n.sfx === 'battle_start');
  assert.ok(last > 0 && battleStart > last);
  const between = ship_basement_janitor.slice(last + 1, battleStart);
  const at = predicate => between.findIndex(n => flat([n]).some(predicate));
  const dash = at(n => n.move === J.hero && n.rel === 'player' && n.dash && n.trail === J.trail);
  const faceLeft = at(n => n.face === J.hero && n.dir === 'left');
  const laugh = at(n => n.motion === J.hero && n.name === 'laugh' && n.sfx === 'laugh_janitor');
  const attack = at(n => n.motion === J.hero && n.name === 'attack');
  assert.ok(dash >= 0 && dash < faceLeft && faceLeft < laugh && laugh < attack, JSON.stringify({ dash, faceLeft, laugh, attack }));
  // 오른쪽 위로(요플래 오른쪽·위쪽) 옮긴다
  const move = flat([between[dash]]).find(n => n.move === J.hero);
  assert.equal(move.at, 'right'); assert.ok(move.by[0] > 0 && move.by[1] < 0);
  // 대치 동안 대사를 지어내지 않는다
  assert.ok(!between.some(n => typeof n.text === 'string'));
  // 깃발 내려치기 칸에 루드 버스터 휘두름
  const swing = flat([between[attack]]);
  const release = JANITOR_HERO_ACTIONS.attack.holds.slice(0, 3).reduce((sum, hold) => sum + hold, 0);
  assert.ok(swing.some(n => n.wait === release));
  assert.ok(swing.some(n => n.sfx === 'rudebuster_swing'));
});

test('test_janitor_hero_field_attack_motion_matches_battle_sheet_and_still_faces_right', () => {
  const attack = CHARACTER_MOTIONS.janitor_hero.attack, A = JANITOR_HERO_ACTIONS.attack;
  assert.equal(attack.src, A.src);
  assert.equal(attack.faces, 'right');
  assert.equal(attack.scale, CHARACTER_MOTIONS.janitor_hero.laugh.scale, '서기·웃음과 같은 몸 크기');
  assert.deepEqual(attack.frames.map(f => f.duration), A.holds);
  assert.deepEqual(attack.frames.map(f => f.rect), A.holds.map((_, i) => [(i % A.cols) * A.cell, Math.floor(i / A.cols) * A.cell, A.cell, A.cell]));
  for (const f of attack.frames) assert.deepEqual(f.pivot, A.pivot);
  assert.equal(CHARACTERS.janitor_hero.stillFaces, 'right');
});

test('test_cutscene_trail_rise_drop_move_spread_behind_up_to_travelled_and_clear_at_end', () => {
  const tint = image => image;
  const trail = { tint, steps: [[34, 0.24], [70, 0.17]] };
  const actor = { id: 'a', x: 100, y: 100, w: 24, h: 16, hopY: 0 };
  const game = { entities: [actor], sound: { sfx() {} }, shake: null };
  // 상승: 잔상은 발 아래쪽(+y), 지나온 높이까지만
  const rise = makeWaiter(game, { rise: 'a', height: 200, duration: 1, trail });
  rise.update(0.2);
  const lifted = actor.hopY;
  assert.ok(lifted > 0 && lifted < 34);
  assert.deepEqual(actor.afterimage.steps.map(([dx, dy]) => [Math.abs(dx), Math.round(dy)]), [[0, lifted], [0, lifted]]);
  rise.update(0.5);
  assert.deepEqual(actor.afterimage.steps.map(([, dy, alpha]) => [dy, alpha]), [[34, 0.24], [70, 0.17]]);
  assert.equal(rise.update(0.5), true);
  assert.equal(actor.afterimage, null);
  // 낙하: 잔상은 위쪽(−y), 착지하면 지운다
  const drop = makeWaiter(game, { drop: 'a', height: 200, duration: 1, sfx: false, land: false, trail });
  drop.update(0.9);
  assert.ok(actor.afterimage.steps.every(([, dy]) => dy < 0));
  assert.equal(drop.update(0.2), true);
  assert.equal(actor.afterimage, null);
  // 이동: 지나온 쪽(오른쪽으로 가면 왼쪽)
  actor.x = 100; actor.y = 100;
  const move = makeWaiter(game, { move: 'a', px: [300, 100], exact: true, speed: 100, trail });
  move.update(0.5);
  assert.ok(actor.afterimage.steps.every(([dx, dy]) => dx < 0 && dy === 0));
  while (!move.update(0.1));
  assert.equal(actor.afterimage, null);
});
