import test from 'node:test';
import assert from 'node:assert/strict';
import { PATTERNS, Bullet, Soul } from '../../src/battle/bullets.js';
import { ENEMIES } from '../../src/data/enemies.js';
import { VIEWER_NAMES } from '../../src/battle/viewer-patterns.js';
import { menuTextLines } from '../../src/ui/menu-layout.js';

const BOX = { x: 132, y: 136, w: 216, h: 156 };
function simulate(index, seconds = Infinity) {
  const config = ENEMIES.expelled_viewer.patterns[index], pattern = PATTERNS[config.type](config);
  const emitted = [], speech = [], sounds = [], soul = new Soul();
  const api = { box: BOX, soul, rnd: () => 0, images: {}, emit: (o) => emitted.push({ at: time, bullet: new Bullet(o) }), say: (text) => speech.push({ text, at: time }), sfx: (name) => sounds.push(name) };
  let time = 0;
  for (; time < Math.min(pattern.duration, seconds); time += 1 / 60) pattern.update(time, 1 / 60, api);
  return { emitted, speech, sounds };
}

test('test_viewer_has_seven_exclusive_patterns_hp66_money666_and_exact_taunts', () => {
  const def = ENEMIES.expelled_viewer;
  assert.equal(def.name, '악질맨'); assert.equal(def.hp, 66); assert.equal(def.money, 666);
  assert.equal(def.patterns.length, 7); assert.equal(new Set(def.patterns.map((p) => p.type)).size, 7);
  assert.ok(def.patterns.every((p) => p.type.startsWith('viewer_')));
  assert.equal(def.lines.speak.length, 10); assert.equal(VIEWER_NAMES.length, 16);
  for (let i = 0; i < 7; i++) assert.ok(simulate(i).emitted.length, `pattern ${i} emits`);
});

test('test_viewer_giant_letters_drop_eom_jun_sik_in_order_after_clear_warning', () => {
  const all = simulate(0).emitted, letters = all.filter((e) => e.bullet.text);
  assert.deepEqual(letters.map((e) => e.bullet.text), [...'엄준식엄준식']);
  letters.forEach((entry, i) => {
    const warning = all.filter((e) => e.bullet.shape === 'viewer_warning')[i];
    assert.ok(entry.at - warning.at >= ENEMIES.expelled_viewer.patterns[0].warn - 1 / 60 - 1e-6);
    assert.ok(entry.bullet.w < BOX.w / 3);
    assert.equal(warning.bullet.hits(new Soul()), false);
  });
});

test('test_viewer_names_keep_a_clear_band_and_emit_individual_chars_from_both_sides', () => {
  const all = simulate(1).emitted, chars = all.filter((e) => e.bullet.text);
  assert.ok(chars.every((e) => e.bullet.text.length === 1));
  assert.ok(chars.some((e) => e.bullet.vx > 0) && chars.some((e) => e.bullet.vx < 0));
  const warnings = all.filter((e) => e.bullet.shape === 'viewer_warning');
  assert.equal(warnings.length, 6);
  for (let i = 0; i < warnings.length; i += 2) assert.notEqual(warnings[i].bullet.y, warnings[i + 1].bullet.y);
  const first = chars.filter((e) => e.at < 2 && e.bullet.vx > 0);
  assert.equal(first.map((e) => e.bullet.text).reverse().join(''), VIEWER_NAMES[0]);
});

test('test_viewer_rock_dialogue_then_three_second_fuse_and_twenty_shards', () => {
  const { emitted, speech, sounds } = simulate(2);
  assert.equal(speech[0].text, '어 이건 무슨바위지?');
  const shards = emitted.filter((e) => e.bullet.shape === 'viewer_shard');
  assert.equal(shards.length, 20);
  assert.ok(shards[0].at - speech[0].at >= 2.99);
  assert.deepEqual(sounds, ['boom']);
});

test('test_viewer_timeout_telegraph_is_safe_and_chase_turns_without_restricting_xy', () => {
  const { emitted, speech } = simulate(6);
  assert.equal(speech[0].text, '벤하지말아주세요ㅠㅠ');
  const b = emitted[0].bullet;
  assert.equal(b.hits({ x: b.x, y: b.y, r: 6 }), false);
  b.age = b.warn + 0.01; b.steer(b, 1 / 60);
  assert.ok(Math.hypot(b.vx, b.vy) > 0);
  const soul = new Soul(), x = soul.x, y = soul.y;
  soul.update(0.1, { down: (key) => ['right', 'up'].includes(key) }, BOX);
  assert.ok(soul.x > x && soul.y < y);
});

test('test_viewer_long_unspaced_taunts_wrap_inside_bubble_without_truncation', () => {
  const ctx = { measureText: (s) => ({ width: s.length * 12 }) };
  for (const text of ENEMIES.expelled_viewer.lines.speak) {
    const lines = menuTextLines(ctx, text, 152, 20);
    assert.ok(lines.every((line) => ctx.measureText(line).width <= 152));
    assert.equal(lines.join('').replace(/\s/g, ''), text.replace(/\s/g, ''));
  }
});
