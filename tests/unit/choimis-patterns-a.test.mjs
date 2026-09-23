import test from 'node:test';
import assert from 'node:assert/strict';
import { Bullet } from '../../src/battle/bullets.js';
import { CHOIMIS_PATTERNS_A } from '../../src/battle/choimis-patterns-a.js';
import { ENEMIES } from '../../src/data/enemies.js';

const BOX = { x: 140, y: 139, w: 200, h: 150 };
const SOUL = { x: 240, y: 214, r: 6 };
const CAMPS = [
  { x: 152, y: 151, r: 6 }, { x: 240, y: 151, r: 6 }, { x: 328, y: 151, r: 6 },
  { x: 152, y: 214, r: 6 }, { ...SOUL }, { x: 328, y: 214, r: 6 },
  { x: 152, y: 277, r: 6 }, { x: 240, y: 277, r: 6 }, { x: 328, y: 277, r: 6 },
];

function recordingContext() {
  const lines = [];
  return {
    lines,
    save() {}, restore() {}, beginPath() {}, rect() {}, clip() {}, stroke() {}, setLineDash() {},
    moveTo(x, y) { lines.push(['move', x, y]); },
    lineTo(x, y) { lines.push(['line', x, y]); },
    set lineCap(value) {}, set strokeStyle(value) {}, set lineWidth(value) {},
  };
}

function simulate(type, options = {}, soulAt = () => SOUL) {
  const pattern = CHOIMIS_PATTERNS_A[type]({ ...ENEMIES.choimis_flower.patterns.find(p => p.type === type), ...options });
  const emitted = [], said = [], poses = [], sounds = [];
  let active = [], time = 0;
  const threatened = new Set();
  const image = { width: 26, height: 22 };
  const api = {
    box: BOX,
    soul: { ...SOUL },
    actor: { x: 396, y: 176, scale: 1 },
    images: { jjajang: image },
    rnd: () => 0.37,
    emit(config) {
      const bullet = new Bullet(config);
      emitted.push({ at: time, bullet });
      active.push(bullet);
      return bullet;
    },
    say(text, hold) { said.push({ at: time, text, hold }); },
    present(pose) { poses.push({ at: time, pose }); },
    sfx(name, options) { sounds.push({ at: time, name, options }); },
  };
  const dt = 1 / 30;
  for (time = 0; time < pattern.duration + 3; time += dt) {
    Object.assign(api.soul, soulAt(time));
    pattern.update(time, dt, api);
    for (const bullet of active) bullet.update(dt, BOX);
    active = active.filter((bullet) => !bullet.out(BOX));
    for (const [index, camp] of CAMPS.entries()) {
      if (active.some((bullet) => bullet.hits(camp))) threatened.add(index);
    }
    let safe = 0;
    for (let x = BOX.x + 12; x <= BOX.x + BOX.w - 12; x += 12) {
      for (let y = BOX.y + 12; y <= BOX.y + BOX.h - 12; y += 12) {
        if (active.every((bullet) => !bullet.hits({ x, y, r: 6 }))) safe++;
      }
    }
    assert.ok(safe >= 8, `${type} keeps usable dodge space at ${time.toFixed(2)}s`);
  }
  assert.equal(active.length, 0, `${type} hazards clean themselves up`);
  return { pattern, emitted, said, poses, sounds, threatened, image };
}

test('test_choimis_patterns_a_exports_the_three_registry_factories', () => {
  // Given: the registry integration imports one object.
  // When: its keys are enumerated.
  // Then: only the three owned pattern ids are present.
  assert.deepEqual(Object.keys(CHOIMIS_PATTERNS_A), ['choimis_jjajang', 'choimis_choso', 'choimis_money']);
  for (const factory of Object.values(CHOIMIS_PATTERNS_A)) assert.equal(typeof factory, 'function');
});

test('test_choimis_jjajang_uses_bowls_sauce_and_noodle_streaks_with_real_geometry', () => {
  // Given: the approved dark-jjajang bowl image is available through the enemy asset contract.
  // When: the complete attack is simulated.
  const result = simulate('choimis_jjajang');
  // Then: it is a dedicated moving meal silhouette, not a recolored generic rain projectile.
  const bowls = result.emitted.filter(({ bullet }) => bullet.shape === 'choimis_jjajang_bowl');
  assert.ok(bowls.length >= 4);
  assert.ok(bowls.every(({ bullet }) => bullet.image === result.image && bullet.sauce && bullet.noodles >= 3));
  assert.ok(bowls.every(({ bullet }) => bullet.warn >= 0.3 && bullet.drawShape && bullet.hitShape));
  assert.equal(result.threatened.size, CAMPS.length, 'crossing bowls eventually pressure every sampled camp');
  const sample = bowls[0].bullet;
  sample.age = sample.warn + 0.15;
  sample.steer(sample, 0);
  assert.equal(sample.hits({ x: sample.x, y: sample.y, r: 2 }), true, 'visible bowl center collides');
  assert.equal(sample.hits({ x: BOX.x - 30, y: BOX.y - 30, r: 2 }), false);
});

test('test_choimis_choso_locks_each_aim_after_warning_and_restores_the_idle_costume', () => {
  // Given: the soul crosses the arena after the first warning locks.
  const result = simulate('choimis_choso', {}, (time) => {
    const targets = [SOUL, { x: 160, y: 260, r: 6 }, { x: 320, y: 270, r: 6 }, { x: 185, y: 160, r: 6 }];
    return targets[Math.floor(time / 0.8) % targets.length];
  });
  // When: the beam volley resolves.
  const beams = result.emitted.filter(({ bullet }) => bullet.shape === 'choimis_blood_beam');
  // Then: multiple straight beams use fixed endpoints and the costume is temporary.
  assert.equal(beams.length, 6);
  assert.equal(result.pattern.duration, 6.6);
  assert.ok(beams.every(({ bullet }) => bullet.warn === 0.55 && bullet.width === 12 && Math.abs(bullet.life - 0.83) < 1e-9));
  for (const [index, expected] of [0.12, 0.95, 1.78, 3.55, 4.38, 5.21].entries()) {
    assert.ok(Math.abs(beams[index].at - expected) <= 1 / 30, 'original Choso cast schedule is preserved');
  }
  assert.ok(beams.every(({ bullet }) => bullet.warn >= 0.3 && bullet.drawShape && bullet.hitShape));
  assert.ok(beams.every(({ bullet }) => bullet.ax === 358 && bullet.ay === 98), 'every cast starts at the frame-2 hand anchor');
  assert.ok(new Set(beams.map(({ bullet }) => Math.atan2(bullet.by - bullet.ay, bullet.bx - bullet.ax).toFixed(3))).size >= 3,
    'fixed hand origin still produces distinct warned aim angles');
  const first = beams[0].bullet;
  const endpoints = [first.ax, first.ay, first.bx, first.by];
  first.age = first.warn - 0.01;
  first.steer?.(first, 1);
  assert.deepEqual([first.ax, first.ay, first.bx, first.by], endpoints, 'beam does not track after warning');
  const ctx = recordingContext();
  first.drawShape(ctx, first);
  assert.ok(ctx.lines.some((entry) => entry[0] === 'move' && entry[1] === first.ax && entry[2] === first.ay));
  assert.ok(ctx.lines.some((entry) => entry[0] === 'line' && entry[1] === first.bx && entry[2] === first.by));
  first.age = first.warn + 0.05;
  assert.equal(first.hits({ x: (first.ax + first.bx) / 2, y: (first.ay + first.by) / 2, r: 2 }), true);
  assert.equal(first.hits({ x: first.ax, y: first.ay, r: 2 }), false, 'external cast stem never damages outside the dodge box');
  assert.equal(result.said.filter(({ text }) => text === '천혈!').length, 1);
  assert.equal(result.poses[0].pose.sheet, 'choso');
  assert.equal(result.poses.at(-1).pose, null);
  assert.deepEqual([...new Set(result.poses.filter(({ pose }) => pose?.sheet === 'choso').map(({ pose }) => pose.frame))], [0, 1, 2, 3]);
  const gaps = beams.slice(1).map(({ at }, index) => at - beams[index].at);
  assert.ok(gaps.some((gap) => gap >= 1.1), 'volley includes a safe interlude');
  const cues = result.sounds.filter(sound => sound.name.startsWith('laser_'));
  assert.equal(cues.length, 12);
  assert.ok(cues.every(cue => cue.options.volume <= 0.22 && cue.options.len > 0 && cue.options.len <= 0.28), 'original charge/fire clips have short bounded quiet playback');
});

test('test_choimis_money_announces_1500_and_scatters_recognizable_warned_notes', () => {
  // Given: the money attack starts with no projectile image dependency.
  // When: its complete scatter is simulated.
  const result = simulate('choimis_money');
  // Then: the announcement and rectangular banknote geometry are explicit.
  assert.deepEqual(result.said.map(({ text }) => text), ['1500만원']);
  const notes = result.emitted.filter(({ bullet }) => bullet.shape === 'choimis_money_note');
  assert.ok(notes.length >= 20);
  assert.ok(notes.every(({ bullet }) => bullet.warn >= 0.3 && bullet.noteWidth > bullet.noteHeight && bullet.denomination === '1500'));
  const note = notes[0].bullet;
  note.age = note.warn + 0.2;
  note.steer(note, 0);
  assert.equal(note.hits({ x: note.x, y: note.y, r: 2 }), true, 'rendered note center collides');
  assert.equal(note.hits({ x: note.x + note.noteWidth, y: note.y + note.noteHeight, r: 1 }), false);
  assert.ok(result.threatened.size >= 7, 'scatter pressures center, edges, and corners instead of leaving corner cheese');
});

test('test_choimis_noodle_volleys_build_from_straight_bowls_to_arcs_and_sauce', () => {
  const { pattern, emitted: all, sounds } = simulate('choimis_jjajang');
  const emitted = all.filter(({ bullet }) => bullet.shape === 'choimis_jjajang_bowl');
  const splashes = all.filter(({ bullet }) => bullet.shape === 'choimis_jjajang_splash');
  assert.equal(pattern.duration, 6.4);
  assert.equal(emitted.length, 9);
  assert.equal(splashes.length, 9);
  assert.ok(emitted.slice(0, 3).every(({ bullet }) => bullet.arcHeight === 0));
  assert.ok(emitted.slice(3).every(({ bullet }) => Math.abs(bullet.arcHeight) >= 20));
  assert.ok(splashes.every(({ bullet }) => bullet.warn >= 0.3 && bullet.drawShape && bullet.hitShape));
  assert.equal(sounds.length, 3, 'one sound per bowl volley, not one per projectile');
  for (let wave = 0; wave < 3; wave++) {
    const volley = emitted.slice(wave * 3, wave * 3 + 3);
    assert.equal(new Set(volley.map(({ bullet }) => bullet.startY)).size, 3);
    assert.ok(volley[1].at - volley[0].at >= 0.1);
    assert.ok(volley[2].at - volley[1].at >= 0.1);
    for (const { bullet } of volley) {
      assert.ok(Math.abs(bullet.life - bullet.warn - 0.05 - 1.1) < 1e-9);
      bullet.age = bullet.warn + 0.55;
      bullet.steer(bullet);
      assert.equal(bullet.x, SOUL.x, 'bowl crosses the center in half of its 1.10s flight');
    }
    const end = volley.at(-1).at + volley.at(-1).bullet.life;
    const nextAttack = emitted[(wave + 1) * 3];
    const nextDanger = nextAttack ? nextAttack.at + nextAttack.bullet.warn : pattern.duration;
    assert.ok(nextDanger - end >= 0.35, 'each salvo leaves a real non-damaging breathing gap');
  }
  assert.notDeepEqual(emitted.slice(0, 3).map(({ bullet }) => bullet.startY), emitted.slice(3, 6).map(({ bullet }) => bullet.startY));
});

test('test_choimis_money_alternates_rain_fans_and_shifts_the_safe_corridor', () => {
  const { pattern, emitted, threatened } = simulate('choimis_money');
  assert.equal(pattern.duration, 6.4);
  assert.equal(emitted.length, 36);
  assert.equal(threatened.size, CAMPS.length, 'rain and side fans reach all corners as well as the center');
  const gaps = [];
  for (let wave = 0; wave < 6; wave++) {
    const volley = emitted.slice(wave * 6, wave * 6 + 6);
    assert.equal(new Set(volley.map(({ at }) => at)).size, 1);
    const horizontal = wave === 1 || wave === 3;
    const positions = volley.map(({ bullet }) => horizontal ? bullet.startY : bullet.startX).sort((a, b) => a - b);
    const widest = Math.max(...positions.slice(1).map((position, index) => position - positions[index]));
    assert.ok(widest >= (horizontal ? 54 : 75) - 1e-9, 'two absent notes leave a visible corridor wider than the soul');
    gaps.push(positions.findIndex((position, index) => index && position - positions[index - 1] === widest));
    assert.ok(volley.every(({ bullet }) => bullet.warn >= 0.5));
    assert.ok(volley.every(({ bullet }) => Math.abs(bullet.life - bullet.warn - 0.05 - 1.05) < 1e-9));
  }
  assert.ok(new Set(gaps).size >= 3, 'the empty corridor shifts instead of preserving one safe column');
  const last = emitted.at(-1);
  assert.ok(pattern.duration - last.at - last.bullet.life >= 0.5);
});

test('test_choimis_noodle_money_warnings_and_clipped_geometry_never_damage', () => {
  for (const type of ['choimis_jjajang', 'choimis_money']) {
    const { emitted } = simulate(type);
    for (const { bullet } of emitted) {
      bullet.age = bullet.warn - 0.001;
      bullet.steer(bullet);
      assert.equal(bullet.hits({ x: bullet.x, y: bullet.y, r: 6 }), false);
      bullet.age = bullet.warn;
      bullet.steer(bullet);
      const outside = bullet.x < SOUL.x ? BOX.x + 2 : BOX.x + BOX.w - 2;
      assert.equal(bullet.hits({ x: outside, y: bullet.y, r: 6 }), false);
      bullet.age = bullet.life;
      assert.equal(bullet.hits({ x: bullet.x, y: bullet.y, r: 6 }), false);
    }
  }
});

test('test_choimis_denser_patterns_keep_speed_limited_escape_paths_from_nine_regions', () => {
  const spacing = 5, dt = 0.05, cols = 37, rows = 27;
  const points = Array.from({ length: cols * rows }, (_, index) => ({
    x: BOX.x + 10 + index % cols * spacing,
    y: BOX.y + 10 + Math.floor(index / cols) * spacing, r: 6,
  }));
  const starts = [0, 18, 36, 13 * cols, 13 * cols + 18, 13 * cols + 36, 26 * cols, 26 * cols + 18, 26 * cols + 36];
  for (const type of ['choimis_jjajang', 'choimis_money']) {
    const pattern = CHOIMIS_PATTERNS_A[type]();
    let active = [], reachable = new Uint16Array(points.length);
    starts.forEach((start, index) => { reachable[start] = 1 << index; });
    const api = { box: BOX, soul: SOUL, emit(config) { active.push(new Bullet(config)); } };
    for (let time = 0; time <= pattern.duration + dt; time += dt) {
      pattern.update(time, dt, api);
      const previous = active.map((bullet) => ({ ...bullet }));
      for (const bullet of active) bullet.update(dt, BOX);
      active = active.filter((bullet) => !bullet.out(BOX));
      const next = new Uint16Array(points.length);
      for (let index = 0; index < points.length; index++) {
        if (active.some((bullet) => bullet.hits(points[index]))) continue;
        const neighbors = [index];
        if (index % cols > 0) neighbors.push(index - 1);
        if (index % cols < cols - 1) neighbors.push(index + 1);
        if (index >= cols) neighbors.push(index - cols);
        if (index < points.length - cols) neighbors.push(index + cols);
        for (const neighbor of neighbors) {
          if (!reachable[neighbor]) continue;
          const middle = { x: (points[index].x + points[neighbor].x) / 2, y: (points[index].y + points[neighbor].y) / 2, r: 6 };
          if (previous.some((bullet) => bullet.hitShape(bullet, middle)) || active.some((bullet) => bullet.hits(middle))) continue;
          next[index] |= reachable[neighbor];
        }
      }
      reachable = next;
      assert.equal(reachable.reduce((mask, value) => mask | value, 0), 511,
        `${type} has an unhit route from all nine start regions at ${time.toFixed(2)}s with 100px/s movement`);
    }
  }
});

test('test_choimis_warning_led_routes_clear_both_patterns_without_a_hit', () => {
  const dt = 1 / 120;
  for (const type of ['choimis_jjajang', 'choimis_money']) {
    const pattern = CHOIMIS_PATTERNS_A[type](), soul = { ...SOUL };
    let active = [], spawned = [], target = { ...SOUL };
    const api = { box: BOX, soul, emit(config) {
      const bullet = new Bullet(config);
      active.push(bullet); spawned.push(bullet);
    } };
    for (let time = 0; time < pattern.duration; time += dt) {
      spawned = [];
      pattern.update(time, dt, api);
      if (type === 'choimis_jjajang') {
        // The upper gap, upper edge, then middle row open in the three warned volleys.
        target.y = time < 1.8 ? 181.5 : time < 3.7 ? 151 : 214;
      } else if (spawned.length) {
        // Read the empty space between actual warning lines; future volleys are unknown.
        const axis = spawned[0].startX === spawned[1].startX ? 'y' : 'x';
        const positions = spawned.map((bullet) => axis === 'x' ? bullet.startX : bullet.startY).sort((a, b) => a - b);
        const gaps = positions.slice(1).map((position, index) => ({ size: position - positions[index], middle: (position + positions[index]) / 2 }));
        target[axis] = gaps.sort((a, b) => b.size - a.size)[0].middle;
      }
      const dx = target.x - soul.x, dy = target.y - soul.y;
      const amount = Math.min(1, 100 * dt / (Math.hypot(dx, dy) || 1));
      soul.x += dx * amount; soul.y += dy * amount;
      for (const bullet of active) bullet.update(dt, BOX);
      active = active.filter((bullet) => !bullet.out(BOX));
      assert.ok(active.every((bullet) => !bullet.hits(soul)), `${type} readable route stays clear at ${time.toFixed(3)}s`);
    }
    assert.equal(active.length, 0, 'the last wave finishes before the turn ends');
  }
});
