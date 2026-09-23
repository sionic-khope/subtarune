// 다오·배찌(BUILD266): 적 데이터·카트라이더 패턴 계약(예고 → 발사, 소리 이름, 상자 안)·벚꽃 숲 4 배치·문 연결
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { ENEMIES } from '../../src/data/enemies.js';
import { CHARACTERS } from '../../src/data/characters.js';
import { Board, Soul, PATTERNS } from '../../src/battle/bullets.js';
import { Battle } from '../../src/battle/battle.js';
import { KART_PATTERNS, MISSILE, BOOSTER, BANANA, WATERBOMB, MAGNET } from '../../src/battle/kart-patterns.js';
import { QA_POINTS } from '../../src/core/story.js';

const load = id => JSON.parse(readFileSync(new URL(`../../assets/maps/${id}.json`, import.meta.url), 'utf8'));
const mulberry = seed => () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
/** 패턴을 dt 0.02 로 돌려 emit/sfx 기록 — 탄은 간단히 위치만 적분 */
function run(pattern, seconds = 5.4, soulMove = null) {
  const box = { x: 140, y: 139, w: 200, h: 150 }, soul = { x: 240, y: 214, r: 6 }, emitted = [], sfx = [];
  const api = { box, soul, rnd: mulberry(3), images: {}, sfx: name => sfx.push({ t: now, name }), emit: null };
  let now = 0;
  api.emit = o => { const b = { rot: 0, spin: 0, age: 0, ...o, at: now }; emitted.push(b); return b; };
  for (let t = 0; t < seconds; t += 0.02) {
    now = t; if (soulMove) soulMove(soul, t);
    pattern.update(t, 0.02, api);
    for (const b of emitted) { if (b.dead) continue; b.age += 0.02; if (b.steer) b.steer(b, 0.02); b.vx = (b.vx || 0) + (b.ax || 0) * 0.02; b.vy = (b.vy || 0) + (b.ay || 0) * 0.02; b.x += (b.vx || 0) * 0.02; b.y += (b.vy || 0) * 0.02; b.rot += (b.spin || 0) * 0.02; if (b.life && b.age >= b.life) b.dead = true; }
  }
  return { emitted, sfx, box, soul };
}

test('test_dao_and_bazzi_have_hp_36_kart_patterns_and_reuse_the_pasted_art', () => {
  for (const id of ['dao', 'bazzi']) {
    const e = ENEMIES[id]; assert.equal(e.hp, 36, `${id} 체력 36(원문)`);
    assert.ok(existsSync(new URL(`../../${e.image}`, import.meta.url)) && existsSync(new URL(`../../${CHARACTERS[id].still}`, import.meta.url)), `${id} 전투·필드 그림`);
    assert.ok(e.patterns.length === 3 && e.patterns.every(p => p.type.startsWith('kart_') && PATTERNS[p.type]), `${id} 카트라이더 패턴 셋 등록`);
    assert.ok(e.lines.speak.length === 3 && e.lines.appear && e.lines.die && e.lines.idle.length >= 2);
  }
  assert.deepEqual(ENEMIES.dao.patterns.map(p => p.type), ['kart_missile', 'kart_booster', 'kart_banana']);
  assert.deepEqual(ENEMIES.dao.patterns.map(p => p.speak), ['미사일!', '부스터!', '바나나!']); assert.deepEqual(ENEMIES.bazzi.patterns.map(p => p.speak), ['물폭탄!', '자석!', '물파리!']);
  assert.deepEqual(ENEMIES.bazzi.patterns.map(p => p.type), ['kart_waterbomb', 'kart_magnet', 'kart_waterfly']);
  for (const name of ['kart_missile', 'kart_booster', 'kart_banana', 'kart_waterbomb', 'kart_magnet', 'kart_waterfly']) assert.ok(existsSync(new URL(`../../assets/audio/sfx/${name}.mp3`, import.meta.url)), `${name} 소리 파일`);
  assert.ok(MISSILE.track + MISSILE.lock >= 0.35 && BOOSTER.warn >= 0.35 && BANANA.warn >= 0.35 && WATERBOMB.arcWarn >= 0.35 && MAGNET.warn >= 0.35, '모든 예고 ≥ 0.35초');
});

test('test_kart_enemy_turn_speech_matches_selected_pattern_through_cycle_wrap', () => {
  const expected = {
    dao: ['미사일!', '부스터!', '바나나!', '미사일!'],
    bazzi: ['물폭탄!', '자석!', '물파리!', '물폭탄!'],
  };
  for (const [id, lines] of Object.entries(expected)) {
    const enemy = { id, def: ENEMIES[id], hp: 36, maxHp: 36, dead: false, dying: 0, patternIdx: 0 };
    const battle = Object.assign(Object.create(Battle.prototype), {
      enemies: [enemy], members: [], support: null, modes: { enemy: 'bullets' },
      board: new Board(), soul: new Soul(), rnd: () => 0, setText() {}, sfx() {},
    });
    for (const [turn, text] of lines.entries()) {
      battle.beginEnemyTurn();
      assert.equal(battle.state, 'enemy-prep');
      assert.equal(battle.bubble.text, text, `${id} turn ${turn}: speech must describe the selected attack`);
      assert.equal(enemy.patternIdx, turn, 'preparation cannot consume the attack');
      battle.beginBullets();
      assert.equal(battle.state, 'bullets');
      assert.equal(battle.patterns.length, 1);
      assert.equal(enemy.patternIdx, turn + 1);
    }
  }
});

test('test_kart_missile_locks_on_then_flies_to_the_locked_point_and_bursts', () => {
  const r = run(KART_PATTERNS.kart_missile(), 3.2, (soul, t) => { soul.x = 240 + Math.sin(t * 3) * 40; });
  const marks = r.emitted.filter(b => b.harmless && b.at < 0.5), missiles = r.emitted.filter(b => b.shape === 'missile'), frags = r.emitted.filter(b => b.shape === 'circle' && !b.harmless && b.r === MISSILE.fragR);
  assert.ok(marks.length >= 1, '조준 십자선이 먼저');
  assert.ok(missiles.length >= 1 && r.sfx.some(s => s.name === 'kart_missile'), '미사일 발사 + 카트라이더 소리');
  assert.ok(missiles[0].at - marks[0].at >= MISSILE.track + MISSILE.lock - 0.03, '잠긴 뒤에 발사');
  assert.ok(frags.length >= MISSILE.frags, '터지며 파편');
});

test('test_kart_booster_warns_a_lane_then_a_white_kart_crosses_it', () => {
  const r = run(KART_PATTERNS.kart_booster(), 3.0);
  const lanes = r.emitted.filter(b => b.harmless && b.life === BOOSTER.warn), karts = r.emitted.filter(b => b.shape === 'kart');
  assert.ok(lanes.length >= 2 && karts.length >= 2, `띠 예고 ${lanes.length}, 카트 ${karts.length}`);
  assert.ok(karts[0].at - lanes[0].at >= BOOSTER.warn - 0.03 && karts[0].y === lanes[0].y, '예고한 띠로 지나간다');
  assert.ok(karts[0].hitShape({ x: karts[0].x, y: karts[0].y }, { x: karts[0].x + 5, y: karts[0].y + 6, r: 6 }) && !karts[0].hitShape(karts[0], { x: karts[0].x, y: karts[0].y + 40, r: 6 }), '띠 높이 안만 맞는다');
  assert.ok(r.sfx.some(s => s.name === 'kart_booster'));
});

test('test_kart_banana_drops_peels_that_stay_then_a_booster_lane_cuts_through', () => {
  const r = run(KART_PATTERNS.kart_banana(), 5.0);
  const peels = r.emitted.filter(b => b.shape === 'banana');
  assert.equal(peels.length, BANANA.count);
  assert.ok(peels.every(p => p.x >= r.box.x && p.x <= r.box.x + r.box.w), '상자 안');
  assert.ok(r.emitted.some(b => b.shape === 'kart' && b.at >= BANANA.laneAt), '바나나 뒤 부스터 띠');
  assert.ok(r.sfx.filter(s => s.name === 'kart_banana').length >= 1);
});

test('test_kart_waterbomb_arc_then_ring_and_drops_and_magnet_pulls_the_soul_after_warning', () => {
  const w = run(KART_PATTERNS.kart_waterbomb(), 3.0);
  const arcs = w.emitted.filter(b => b.harmless && b.life === WATERBOMB.arcWarn), bombs = w.emitted.filter(b => b.shape === 'bomb'), rings = w.emitted.filter(b => b.shape === 'ring');
  assert.ok(arcs.length >= 1 && bombs.length >= 1 && bombs[0].at - arcs[0].at >= WATERBOMB.arcWarn - 0.03, '점선 호 뒤 물폭탄');
  assert.ok(rings.length >= 1 && rings[0].hitShape(rings[0], { x: rings[0].x + 5, y: rings[0].y, r: 6 }), '착지 고리는 안쪽만 맞는다');
  assert.ok(w.sfx.some(s => s.name === 'kart_waterbomb'));
  const m = run(KART_PATTERNS.kart_magnet(), MAGNET.warn + 0.8);
  assert.ok(m.soul.x > 240 + 30, `자석이 오른쪽으로 끈다 ${m.soul.x}`);
  assert.ok(m.sfx.find(s => s.name === 'kart_magnet').t >= MAGNET.warn - 0.03, '예고 뒤에 당긴다');
  assert.ok(m.emitted.filter(b => b.shape === 'spike').length === MAGNET.spikes, '벽에 가시');
  const f = run(KART_PATTERNS.kart_waterfly(), 2.5);
  assert.ok(f.emitted.some(b => b.shape === 'fly') && f.sfx.some(s => s.name === 'kart_waterfly'));
});

test('test_sakura4_zigzag_map_places_dao_and_bazzi_apart_and_links_from_sakura3_landing', () => {
  const m = load('jjajang_sakura4'), S = m.meta.sakura4, three = load('jjajang_sakura3');
  assert.deepEqual([m.bgm, m.battleBg], ['sakura', 'sakura']);
  for (const [c0, c1, r0, r1] of S.legs) for (const [c, r] of [[c0, r0], [c1, r1]]) assert.equal(m.rows[r][c], ')', `길 ${c},${r}`);
  assert.ok(S.walkTiles >= 120, `적당히 길다(${S.walkTiles}칸)`);
  const dao = m.entities.find(e => e.id === 'dao'), bazzi = m.entities.find(e => e.id === 'bazzi');
  assert.deepEqual([dao.type, dao.enemies, dao.unless], ['enemy', ['dao'], 'jjajang_sakura4_dao_defeated']);
  assert.deepEqual([bazzi.type, bazzi.enemies, bazzi.unless], ['enemy', ['bazzi'], 'jjajang_sakura4_bazzi_defeated']);
  assert.ok(Math.abs(dao.y - bazzi.y) >= 10 * 32, '둘은 다른 곳');
  const landing = three.entities.find(e => e.id === 'sakura3_landing_door'), north = m.entities.find(e => e.id === 'sakura4_north_door');
  assert.deepEqual([landing.to, landing.spawn, north.to, north.spawn], ['jjajang_sakura4', 'from_north', 'jjajang_sakura3', 'landing']);
  const qa = id => QA_POINTS.find(p => p.id === id);
  assert.deepEqual([qa('jjajang_sakura4').spawn, qa('jjajang_sakura4_dao').spawn, qa('jjajang_sakura4_bazzi').spawn], ['from_north', 'before_dao', 'before_bazzi']);
});
