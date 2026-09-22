import test from 'node:test';
import assert from 'node:assert/strict';
import { Bullet } from '../../src/battle/bullets.js';
import { CHOIMIS_PATTERNS_A } from '../../src/battle/choimis-patterns-a.js';

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
  const pattern = CHOIMIS_PATTERNS_A[type](options);
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
    sfx(name) { sounds.push({ at: time, name }); },
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
  assert.ok(beams.length >= 5);
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
