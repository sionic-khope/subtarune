import test from 'node:test';
import assert from 'node:assert/strict';
import { createChoimisFinalAssault } from '../../src/battle/choimis-final-assault.js';
import { createFinalAssaultRenderer } from '../../src/battle/choimis-final-assault-render.js';
import { CHOIMIS_FINAL_ASSAULT as C } from '../../src/data/choimis-final-assault.js';

const input = (...keys) => ({ down: key => keys.includes(key) });
function fixture() {
  const calls = { damage: 0, sounds: [], paused: 0, voices: [], media: [] };
  const enemy = { hp: 1, def: { damage: 15, scale: 0.506, scaleY: 1.2 }, projectiles: {} };
  const soul = { x: 240, y: 170, r: 5, invuln: 0 };
  const battle = { soul, hurtParty: () => calls.damage++, sfx: name => calls.sounds.push(name),
    hitEnemy: () => assert.fail('survival contacts must never request HP damage'),
    game: { sound: { blip: voice => calls.voices.push(voice), sfx: name => {
      const handle = { name, pause: () => calls.paused++, removeAttribute() {}, load() {} };
      calls.media.push(handle); return handle;
    } } } };
  const mode = createChoimisFinalAssault(battle, enemy, { box: { x: 8, y: 8, w: 464, h: 304 } });
  return { mode, battle, enemy, calls };
}

test('final assault completes only after sixty seconds, with no shooting required', () => {
  const { mode, enemy } = fixture();
  assert.equal(mode.update(59.99, input()), false);
  assert.equal(mode.update(0.01, input()), true);
  assert.equal(mode.snapshot.elapsed, 60);
  assert.equal(enemy.hp, 1);
});

test('test_final_assault_beam_release_plays_one_piercing_cut_without_laser_charge', () => {
  const { mode, battle, calls } = fixture();
  const cues = [];
  battle.sfx = (name, options) => { calls.sounds.push(name); cues.push({ name, options }); };
  mode.update(17.2, input());
  assert.equal(cues.length, 0, 'warning remains silent');
  mode.update(0.45, input());
  assert.deepEqual(cues, [{ name: 'choimis_piercing_blood', options: { volume: 0.85 } }]);
  assert.ok(mode.snapshot.hazards.some(hazard => hazard.kind === 'beam' && hazard.fired));
  mode.update(0.2, input());
  assert.equal(cues.length, 1, 'active beam does not repeat its sound each frame');
});

test('final assault leaves a reachable corridor through every wave and beam', () => {
  const { mode, battle, calls } = fixture();
  let previousY = mode.snapshot.safeY, peak = 0;
  const kinds = new Set();
  for (let step = 0; step < 3600; step++) {
    const target = mode.snapshot.safeY;
    const direction = Math.abs(target - battle.soul.y) < 1 ? [] : [target > battle.soul.y ? 'down' : 'up'];
    mode.update(1 / 60, input(...direction));
    const state = mode.snapshot;
    assert.ok(Math.abs(state.safeY - previousY) <= 126 / 60);
    assert.ok(state.hazards.length <= 96);
    for (const hazard of state.hazards) { kinds.add(hazard.kind); assert.ok(hazard.warn >= 0.3); }
    peak = Math.max(peak, state.hazards.length); previousY = state.safeY;
  }
  assert.equal(calls.damage, 0);
  assert.ok(peak >= 20, `expected dense attack, peak=${peak}`);
  assert.deepEqual([...kinds].sort(), ['bazziKart', 'beam', 'daoKart', 'money', 'noodle', 'petal']);
});

test('charged shots survive multiple contacts without boss damage', () => {
  const { mode, battle, enemy } = fixture();
  const fired = new Set();
  for (let step = 0; step < 1800; step++) {
    const snapshot = mode.snapshot;
    const target = step < 600 ? snapshot.hazards.find(h => h.kind === 'noodle' && h.age >= h.warn) : snapshot.boss;
    if (target) battle.soul.y = target.y;
    const cycle = step % 90;
    mode.update(1 / 60, input(...(cycle >= 1 && cycle <= 40 ? ['confirm'] : [])));
    for (const shot of mode.snapshot.shots) if (shot.charged && shot.contacts > 1) fired.add(shot.id);
  }
  assert.ok(mode.snapshot.destroyed > 0);
  assert.ok(mode.snapshot.contacts > 0);
  assert.ok(fired.size > 0, 'at least one charged shot penetrates multiple targets');
  assert.equal(enemy.hp, 1);
  assert.equal(mode.snapshot.elapsed, 30);
});

test('tap shots break noodles, consume the shot and never charge', () => {
  const { mode, battle, calls } = fixture();
  for (let step = 0; step < 720; step++) {
    const target = mode.snapshot.hazards.find(h => h.kind === 'noodle' && h.age >= h.warn && h.x > battle.soul.x);
    if (target) battle.soul.y = target.y;
    mode.update(1 / 60, input(...(step % 30 === 1 ? ['confirm'] : [])));
    assert.ok(mode.snapshot.shots.every(shot => !shot.charged && shot.contacts === 0));
  }
  assert.ok(mode.snapshot.destroyed > 0);
  assert.ok(calls.sounds.includes('yellowheart_shot'));
  assert.ok(!calls.sounds.includes('yellowheart_shot_big'));
});

test('standing still takes real party damage while invulnerability limits repeated hits', () => {
  const { mode, calls } = fixture();
  mode.update(60, input());
  assert.ok(calls.damage > 8, `stationary damage contacts=${calls.damage}`);
  assert.ok(calls.damage <= 80, '0.75s invulnerability bounds party damage');
});

test('combat rendering contains no screen background, panel border, or explanation text', () => {
  const { mode } = fixture();
  const fills = [], texts = [], borders = [];
  const ctx = new Proxy({ fillRect: (...rect) => fills.push(rect), fillText: (...args) => texts.push(args),
    strokeRect: (...rect) => borders.push(rect) }, { get: (target, key) => target[key] ?? (() => {}) });
  mode.update(17, input());
  mode.draw(ctx);
  assert.deepEqual(texts, []);
  assert.deepEqual(borders, []);
  assert.ok(fills.every(rect => rect[2] < 100 && rect[3] < 100));
});

test('disposal cancels charge, clears projectiles, restores soul and cannot finish early', () => {
  const { mode, battle, calls } = fixture();
  mode.update(0.01, input()); mode.update(0.3, input('confirm'));
  mode.dispose(); mode.dispose();
  assert.equal(calls.paused, 1);
  assert.equal(mode.snapshot.shots.length, 0);
  assert.equal(mode.snapshot.hazards.length, 0);
  assert.equal(mode.snapshot.charge.active, false);
  assert.equal(battle.soul.x, 240);
  assert.equal(battle.soul.y, 170);
  assert.equal(mode.update(60, input()), false);
});

test('test_final_assault_contact_milestones_show_three_nonblocking_balloons_once_and_preserve_survival', () => {
  const { mode, battle, enemy } = fixture();
  const lines = [], thresholds = [];
  for (let frame = 0; frame < 3599; frame++) {
    battle.soul.y = 160 + Math.sin((mode.snapshot.elapsed + 0.85) * 0.63) * 76;
    assert.equal(mode.update(1 / 60, input(...(frame % 24 === 1 ? ['confirm'] : []))), false);
    const bubble = mode.snapshot.bubble;
    if (bubble?.kind === 'resolve' && !lines.includes(bubble.text)) { lines.push(bubble.text); thresholds.push(mode.snapshot.contacts); }
  }
  assert.deepEqual(lines, ['아직이다.', '아직 쓰러질 수 없어.', '쓰읍 미스']);
  assert.ok(thresholds[0] < thresholds[1] && thresholds[1] < thresholds[2]);
  assert.equal(mode.snapshot.bubblesShown, 3);
  assert.equal(enemy.hp, 1);
  assert.equal(mode.update(1 / 60, input()), true);
  mode.dispose();
  assert.equal(mode.snapshot.bubble, null);
});

test('test_final_assault_chatter_types_with_choimis_voice_without_pausing_or_replaying_during_hold', () => {
  const { mode, calls, enemy } = fixture();
  mode.update(10.25, input());
  const first = mode.snapshot;
  assert.equal(first.bubble.text, '형들, 아직 끝난 거 아니에요.');
  assert.equal(first.bubble.kind, 'chatter');
  assert.ok(first.bubble.shown > 0 && first.bubble.shown < first.bubble.text.length);
  assert.ok(calls.voices.length > 0);
  assert.deepEqual([...new Set(calls.voices)], ['choimis_flower']);
  mode.update(1, input());
  const voices = calls.voices.length;
  mode.update(0.5, input());
  assert.equal(calls.voices.length, voices, 'completed text does not keep talking during its hold');
  assert.ok(mode.snapshot.elapsed > first.elapsed);
  assert.equal(enemy.hp, 1);
  mode.update(47.25, input());
  assert.equal(mode.snapshot.chatterShown, 3);
  mode.dispose();
  const afterDispose = calls.voices.length;
  mode.update(5, input());
  assert.equal(calls.voices.length, afterDispose);
});

test('test_final_assault_cape_swing_uses_six_frames_and_continuous_xy_motion_between_choso_volleys', () => {
  const { mode } = fixture(), frames = new Set(), motions = new Set(), xs = [], ys = [];
  let previousBoss = mode.snapshot.boss;
  for (let i = 0; i < 60 * 120; i++) {
    mode.update(1 / 120, input());
    const { boss, hazards, elapsed, transformed } = mode.snapshot;
    assert.ok(Math.hypot(boss.x - previousBoss.x, boss.y - previousBoss.y) <= C.motion.maxSpeed / 120 + 0.001, 'no teleport when a locked beam ends');
    assert.ok(boss.x > 320 && boss.x < 401, 'visible body remains in the right combat zone');
    if (boss.pose.sheet === 'capeSwing') { frames.add(boss.pose.frame); motions.add(boss.pose.motion); }
    for (const beam of hazards.filter(hazard => hazard.kind === 'beam' && hazard.age < hazard.life)) {
      assert.equal(transformed, true);
      assert.ok(Math.abs(boss.x - beam.from.x - 14) < 0.001);
      assert.ok(Math.abs(boss.y - beam.from.y - 10) < 0.001);
    }
    if (elapsed > 24 && elapsed < 29 || elapsed > 39 && elapsed < 44 || elapsed > 54 && elapsed < 59) {
      assert.notEqual(boss.pose.sheet, 'choso');
    }
    previousBoss = boss; xs.push(boss.x); ys.push(boss.y);
  }
  assert.deepEqual([...frames].sort(), [0, 1, 2, 3, 4, 5]);
  assert.deepEqual([...motions].sort(), ['recover', 'swing', 'windup']);
  assert.ok(Math.max(...xs) - Math.min(...xs) > 40);
  assert.ok(Math.max(...ys) - Math.min(...ys) > 140);
  assert.equal(mode.snapshot.transformations, 3);
});

test('test_final_assault_each_transform_owns_one_clip_without_blips_and_restores_ordinary_chatter', () => {
  const { mode, calls } = fixture();
  mode.update(15.01, input());
  assert.deepEqual(mode.snapshot.bubble, { text: C.transform.text, shown: C.transform.text.length, kind: 'transform' });
  assert.equal(calls.media.filter(handle => handle.name === C.transform.sfx).length, 1);
  const voices = calls.voices.length;
  mode.update(1.6, input());
  assert.equal(calls.voices.length, voices);
  assert.equal(mode.snapshot.hazards.some(hazard => hazard.kind === 'beam'), false, 'clip precedes beam warning');
  mode.update(43.39, input());
  assert.equal(calls.media.filter(handle => handle.name === C.transform.sfx).length, 3);
  assert.equal(mode.snapshot.chatterShown, 3, 'transform priority does not discard queued chatter');
  assert.ok(calls.voices.length > voices);
  assert.equal(calls.paused, 3);
  mode.dispose();
  assert.equal(calls.paused, 3, 'already completed clips are not stopped twice');
});

test('test_final_assault_live_transform_clip_delays_beam_and_disposal_stops_owned_handle', () => {
  const { mode, calls } = fixture();
  mode.update(15.01, input());
  Object.assign(calls.media.at(-1), { paused: false, ended: false });
  mode.update(3, input());
  assert.equal(mode.snapshot.bubble.kind, 'transform');
  assert.equal(mode.snapshot.hazards.some(hazard => hazard.kind === 'beam'), false);
  const voices = calls.voices.length;
  mode.dispose(); mode.dispose(); mode.update(45, input());
  assert.equal(calls.paused, 1);
  assert.equal(calls.voices.length, voices);
  assert.equal(mode.snapshot.bubble, null);
});

test('test_final_assault_renderer_aligns_different_cell_sizes_to_same_collision_body_center', () => {
  const images = { idle: { width: 320, height: 320 }, capeSwing: { width: 448, height: 576 }, choso: { width: 320, height: 320 } };
  const enemy = { img: images.idle, actionImages: images, projectiles: {}, def: { scale: 0.714, scaleY: 1, pivot: [72, 152],
    sheet: { cols: 2, rows: 2, count: 4 }, actions: {
      capeSwing: { cols: 2, rows: 3, count: 6, pivot: [136, 180] }, choso: { cols: 2, rows: 2, count: 4, pivot: [72, 152] },
    } } };
  const draws = [], ctx = new Proxy({ drawImage: (...args) => draws.push(args) }, { get: (target, key) => target[key] ?? (() => {}) });
  const renderer = createFinalAssaultRenderer(enemy);
  for (const [sheet, frame, pivot, width, height] of [['idle', 0, [72, 152], 160, 160], ['capeSwing', 5, [136, 180], 224, 192], ['choso', 2, [72, 152], 160, 160]]) {
    const boss = { x: 372, y: 160, flash: 0, pose: { sheet, frame } };
    renderer.draw(ctx, { box: C.box, boss, heart: { x: 50, y: 160, invuln: 0 }, elapsed: 0, charge: { active: false }, hazards: [], shots: [], effects: [] });
    const [image, sx, sy, sw, sh, dx, dy] = draws.at(-1);
    assert.equal(image, images[sheet]);
    assert.deepEqual([sx, sy, sw, sh], [frame % 2 * width, Math.floor(frame / 2) * height, width, height]);
    assert.ok(Math.abs(dx + pivot[0] * 0.714 - boss.x) <= 0.5);
    assert.ok(Math.abs(dy + (pivot[1] - C.bossBodyHeight / 2) * 0.714 - boss.y) <= 0.5);
  }
});
