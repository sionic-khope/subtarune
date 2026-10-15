// 청소부 히든 보스(BUILD469): 아이템 반응(깃발 들고 +10 → 껄껄)·말풍선 웃음·한 번씩 휭 퍽·멸공 파동·느린 경광등·깃발 잡담 문구의 계약.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Bullet } from '../../src/battle/bullets.js';
import { JANITOR_PATTERNS, CROSS, WAVE, crossStrike, crossStrikeTimes, waveVolleys } from '../../src/battle/janitor-patterns.js';
import { createJanitorHiddenSupport } from '../../src/battle/support/janitor-hidden.js';
import { BASEMENT_BG, basementLampLevel } from '../../src/battle/backgrounds.js';
import { ENEMIES } from '../../src/data/enemies.js';
import { JANITOR_HIDDEN, janitorItemHeal } from '../../src/data/janitor-hidden.js';

const seeded = (seed = 11) => { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; };
const SOUL_SPEED = 110;

function makeBattle(hp = 50) {
  const boss = { def: ENEMIES.janitor_hidden, hp, maxHp: 100, x: 400, y: 236, dead: false, dying: 0, popup: null };
  const battle = { enemies: [boss], state: 'act', turnConfig: null, sounds: [], sparkles: 0, panels: 0,
    game: { sound: { loadSfxFiles: () => null } },
    sfx(name) { this.sounds.push(name); }, sparkle() { this.sparkles++; }, drawPanel() { this.panels++; } };
  return { battle, boss, support: createJanitorHiddenSupport(battle) };
}

function runReaction(support, battle, boss, dt = 1 / 60) {
  const gimmick = support.afterItem({ type: 'item' });
  assert.ok(gimmick, 'an item use starts the janitor reaction');
  const poses = [];
  let done = false;
  for (let t = 0; t < 10 && !done; t += dt) { done = gimmick.update(dt); const pose = support.poseFor(boss); if (poses.at(-1)?.key !== JSON.stringify(pose)) poses.push({ key: JSON.stringify(pose), t }); }
  assert.equal(done, true, 'the reaction ends');
  gimmick.dispose();
  return poses;
}

test('test_janitor_item_reaction_notice_raises_flag_heals_ten_then_laughs', () => {
  const { battle, boss, support } = makeBattle(50);
  const poses = runReaction(support, battle, boss);
  assert.equal(boss.hp, 60);
  assert.deepEqual(boss.popup && { text: boss.popup.text, color: boss.popup.color }, { text: '+10', color: '#7cff7c' });
  const S = JANITOR_HIDDEN.itemReaction.sounds;
  assert.deepEqual(battle.sounds, [S.notice, S.raise, S.heal, S.laugh], '! chime → flag swing → heal → laugh');
  assert.deepEqual(poses.map(p => p.key), ['null', JSON.stringify({ sheet: 'attack', frame: 2 }), JSON.stringify({ sheet: 'laugh', frame: 0 }), 'null']);
  assert.equal(battle.sparkles, 1);
  assert.equal(support.poseFor(boss), null, 'the pose returns to idle afterwards');
});

test('test_janitor_item_reaction_never_heals_past_max_and_skips_a_fallen_boss', () => {
  const full = makeBattle(95);
  runReaction(full.support, full.battle, full.boss);
  assert.equal(full.boss.hp, 100);
  assert.equal(full.boss.popup.text, '+5');
  const top = makeBattle(100);
  runReaction(top.support, top.battle, top.boss);
  assert.equal(top.boss.hp, 100);
  assert.equal(top.boss.popup, null, 'no +0 popup');
  const dying = makeBattle(0);
  assert.equal(dying.support.afterItem({ type: 'item' }), null);
  assert.equal(janitorItemHeal({ hp: 30, maxHp: 100, dying: 0.3 }), 0);
});

test('test_janitor_laughs_with_the_laugh_sprite_while_the_flag_turn_bubble_shows', () => {
  const { battle, boss, support } = makeBattle(80);
  const kick = ENEMIES.janitor_hidden.patterns.find(p => p.type === 'janitor_kick_flags');
  assert.equal(kick.speak, '멸공!');
  assert.equal(kick.laugh, true);
  battle.state = 'enemy-prep'; battle.turnConfig = kick;
  assert.deepEqual(support.poseFor(boss), { sheet: 'laugh', frame: 0 });
  support.update(1 / 60); support.update(1 / 60);
  assert.deepEqual(battle.sounds, ['laugh_janitor'], 'one laugh per bubble');
  battle.state = 'bullets'; support.update(1 / 60);
  assert.equal(support.poseFor(boss), null);
  battle.state = 'enemy-prep'; battle.turnConfig = ENEMIES.janitor_hidden.patterns.find(p => p.type === 'janitor_drum');
  assert.equal(support.poseFor(boss), null, 'other turns keep the idle pose');
  const laugh = ENEMIES.janitor_hidden.actions.laugh;
  assert.equal(laugh.src, 'assets/battle/janitor-hero-laugh.png');
});

test('test_janitor_battle_idle_lines_are_about_the_flag_not_laughing', () => {
  const idle = ENEMIES.janitor_hidden.lines.idle;
  assert.ok(idle.length >= 2);
  for (const line of idle) { assert.match(line, /멸공의 깃발/); assert.doesNotMatch(line, /껄껄/); }
});

test('test_janitor_basement_red_light_changes_slowly', () => {
  assert.ok(BASEMENT_BG.period >= 3, 'at least three seconds per cycle');
  let maxStep = 0;
  for (let t = 0; t < BASEMENT_BG.period; t += 1 / 60) maxStep = Math.max(maxStep, Math.abs(basementLampLevel(t + 1 / 60) - basementLampLevel(t)));
  assert.ok(maxStep < 0.02, `per-frame change ${maxStep}`);
  assert.ok(basementLampLevel(BASEMENT_BG.period / 4) > 0.99 && basementLampLevel(BASEMENT_BG.period * 3 / 4) < 0.01);
});

test('test_janitor_new_patterns_are_in_the_turn_order_with_their_boxes', () => {
  const pats = ENEMIES.janitor_hidden.patterns.map(p => p.type);
  assert.ok(pats.includes('janitor_stomp_cross') && pats.includes('janitor_wave'));
  const wave = ENEMIES.janitor_hidden.patterns.find(p => p.type === 'janitor_wave');
  assert.equal(wave.speak, '멸공!');
  assert.deepEqual(wave.board, [...WAVE.board]);
  assert.equal(ENEMIES.janitor_hidden.projectiles.wave, 'assets/fx/janitor-red-triple.png');
});

test('test_janitor_stomp_cross_strikes_one_at_a_time_cycling_four_directions', () => {
  const times = crossStrikeTimes();
  assert.equal(times.length, CROSS.strikes);
  const gaps = times.slice(1).map((t, i) => t - times[i]);
  assert.ok(gaps.every((g, i) => i === 0 || g <= gaps[i - 1] + 1e-9), 'gaps shrink');
  assert.ok(Math.min(...gaps) >= CROSS.warn[1] + CROSS.sweep, 'a strike lands before the next one starts warning');
  const box = { x: 165, y: 111, w: 150, h: 150 };
  const dirs = times.map((_, i) => CROSS.dirs[i % CROSS.dirs.length]);
  assert.deepEqual(dirs.slice(0, 4), ['lr', 'rl', 'tb', 'bt']);
  for (const dir of CROSS.dirs) for (const at of [0, 120, 186, 999]) {
    const s = crossStrike(dir, box, at);
    const [x, y, w, h] = s.band;
    assert.ok(x >= box.x && y >= box.y && x + w <= box.x + box.w + 1e-9 && y + h <= box.y + box.h + 1e-9, `${dir} band inside the box`);
    assert.ok(Math.min(w, h) === CROSS.band, 'one band thick');
    const horizontal = dir === 'lr' || dir === 'rl';
    assert.equal(s.axis, horizontal ? 'x' : 'y');
    assert.ok(horizontal ? s.from !== s.to && (dir === 'lr') === (s.from < s.to) : (dir === 'tb') === (s.from < s.to), `${dir} sweeps the right way`);
  }
  assert.ok((CROSS.band / 2 + 6) / SOUL_SPEED < CROSS.warn[1], 'the heart can leave the band during the shortest warning');
});

test('test_janitor_wave_volleys_are_hard_but_always_leave_a_reachable_lane', () => {
  for (const seed of [1, 7, 11, 99, 1234]) {
    const v = waveVolleys(WAVE, seeded(seed));
    assert.equal(v.length, WAVE.aimed.count + WAVE.walls.count + WAVE.weave.count);
    assert.ok(v.every((x, i) => i === 0 || x.at > v[i - 1].at), 'in time order');
    const laneH = WAVE.board[1] / WAVE.lanes;
    const walls = v.filter(x => x.lanes && x.lanes.length === WAVE.lanes - 1);
    assert.equal(walls.length, WAVE.walls.count);
    const gaps = walls.map(x => [...Array(WAVE.lanes).keys()].find(l => !x.lanes.includes(l)));
    for (let i = 1; i < gaps.length; i++) {
      assert.notEqual(gaps[i], gaps[i - 1], 'the gap moves every wall');
      assert.ok(Math.abs(gaps[i] - gaps[i - 1]) * laneH / SOUL_SPEED < WAVE.walls.every, 'the next gap is reachable in time');
    }
    const weave = v.slice(-WAVE.weave.count);
    weave.forEach((x, i) => assert.ok(x.lanes.every(l => l % 2 === i % 2), 'odd/even lanes alternate'));
    assert.ok(laneH / SOUL_SPEED < WAVE.weave.every, 'one lane hop fits between weave volleys');
    assert.ok(v.slice(0, WAVE.aimed.count).every(x => x.aim));
  }
  assert.ok(WAVE.hitH + 6 - 3 < WAVE.board[1] / WAVE.lanes, 'a heart in the next lane is safe');
});

function simulate(type, cfg, fps, soulAt) {
  const pattern = JANITOR_PATTERNS[type](cfg);
  const box = { x: cfg.center[0] - cfg.board[0] / 2, y: cfg.center[1] - cfg.board[1] / 2, w: cfg.board[0], h: cfg.board[1] };
  const soul = { x: soulAt?.[0] ?? box.x + box.w / 2, y: soulAt?.[1] ?? box.y + box.h / 2, r: 6 };
  const sounds = [], poses = [];
  let active = [], hazards = 0, hits = 0;
  const api = { box, soul, rnd: seeded(5), actor: { x: 400, y: 236, scale: 0.736 }, images: {},
    emit(o) { const b = new Bullet(o); active.push(b); if (!b.harmless) hazards++; return b; }, sfx(name) { sounds.push(name); }, present(pose) { poses.push(pose); }, shake() {} };
  const dt = 1 / fps;
  for (let t = 0; t < pattern.duration + 3; t += dt) {
    if (t < pattern.duration) pattern.update(t, dt, api);
    for (const b of active) {
      b.update(dt, box);
      if (b.harmless) for (let x = box.x + 8; x < box.x + box.w; x += 24) for (let y = box.y + 8; y < box.y + box.h; y += 24) assert.equal(b.hits({ x, y, r: 6 }), false, `${type}: warnings never hurt`);
      else if (b.hits(soul)) hits++;
    }
    active = active.filter(b => !b.out(box));
  }
  return { pattern, sounds, poses, hazards, hits, active };
}

for (const type of ['janitor_stomp_cross', 'janitor_wave']) {
  for (const fps of [60, 240]) {
    test(`test_janitor_${type}_hits_a_still_heart_and_cleans_up_at_${fps}hz`, () => {
      const cfg = ENEMIES.janitor_hidden.patterns.find(p => p.type === type);
      const r = simulate(type, cfg, fps);
      assert.ok(r.hazards > 0, 'emits hazards');
      assert.ok(r.hits > 0, 'standing still gets hit');
      assert.equal(r.active.length, 0, 'everything cleans up');
      assert.ok(r.pattern.duration < 12, `duration ${r.pattern.duration}`);
      assert.ok(r.poses.some(p => p?.sheet === 'attack'), 'the janitor swings his flag');
      assert.ok(r.sounds.includes(type === 'janitor_wave' ? 'rudebuster_swing' : 'gerson_queen_punched_lower'));
    });
  }
}

test('test_janitor_wave_fires_left_to_right_from_the_left_of_the_box', () => {
  const cfg = ENEMIES.janitor_hidden.patterns.find(p => p.type === 'janitor_wave');
  const r = simulate('janitor_wave', cfg, 60);
  const stand = r.poses.find(p => p?.sheet === 'attack');
  assert.ok(stand.x < cfg.center[0] - cfg.board[0] / 2, 'the janitor stands left of the box');
  assert.equal(stand.flipX, false, 'facing right');
});
