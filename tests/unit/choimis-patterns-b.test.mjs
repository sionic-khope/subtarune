import test from 'node:test';
import assert from 'node:assert/strict';
import { Bullet } from '../../src/battle/bullets.js';
import { CHOIMIS_PATTERNS_B } from '../../src/battle/choimis-patterns-b.js';

const BOX = Object.freeze({ x: 140, y: 140, w: 200, h: 150 });
const SOUL = Object.freeze({ x: 184, y: 252, r: 6 });
const IDS = ['choimis_rap', 'choimis_seup', 'choimis_fashion'];

function start(id, options = {}) {
  const emitted = [], sounds = [], poses = [], soul = { ...SOUL };
  const api = {
    box: BOX, soul, rnd: () => 0.5, images: {},
    emit(spec) { const bullet = new Bullet(spec); emitted.push(bullet); return bullet; },
    sfx(name) { sounds.push(name); },
    present(pose) { poses.push(pose); },
  };
  return { pattern: CHOIMIS_PATTERNS_B[id](options), emitted, sounds, poses, soul, api };
}

function advance(run, end, step = 0.05) {
  for (let t = 0; t <= end + 1e-9; t += step) {
    run.pattern.update(t, step, run.api);
    for (const bullet of run.emitted) bullet.update(step, BOX);
  }
}

function verifyReachableTimeline(id) {
  const run = start(id), dt = 1 / 60, moveFrames = 7, spacing = 12;
  const xs = [], ys = [], points = [], byPosition = new Map();
  for (let x = SOUL.x; x >= BOX.x + 10; x -= spacing) xs.push(x);
  for (let x = SOUL.x + spacing; x <= BOX.x + BOX.w - 10; x += spacing) xs.push(x);
  for (let y = SOUL.y; y >= BOX.y + 10; y -= spacing) ys.push(y);
  for (let y = SOUL.y + spacing; y <= BOX.y + BOX.h - 10; y += spacing) ys.push(y);
  xs.sort((a, b) => a - b); ys.sort((a, b) => a - b);
  for (const y of ys) for (const x of xs) { byPosition.set(`${x},${y}`, points.length); points.push({ x, y, r: SOUL.r }); }
  const neighbors = points.map(point => [[0, 0], [-spacing, 0], [spacing, 0], [0, -spacing], [0, spacing]]
    .map(([dx, dy]) => byPosition.get(`${point.x + dx},${point.y + dy}`)).filter(index => index !== undefined));
  const startIndex = byPosition.get(`${SOUL.x},${SOUL.y}`);
  const corners = [
    { x: BOX.x + 10, y: BOX.y + 10, r: SOUL.r }, { x: BOX.x + BOX.w - 10, y: BOX.y + 10, r: SOUL.r },
    { x: BOX.x + 10, y: BOX.y + BOX.h - 10, r: SOUL.r }, { x: BOX.x + BOX.w - 10, y: BOX.y + BOX.h - 10, r: SOUL.r },
  ];
  let active = [], reachable = new Set([startIndex]), interval = [];
  const threatenedCorners = new Set();
  run.api.emit = spec => { const bullet = new Bullet(spec); run.emitted.push(bullet); active.push(bullet); return bullet; };
  const cleanupAt = run.pattern.duration + 1.2 + dt;
  for (let frame = 0; frame <= Math.ceil(cleanupAt / dt); frame++) {
    const time = frame * dt;
    if (time < run.pattern.duration) run.pattern.update(time, dt, run.api);
    for (const bullet of active) bullet.update(dt, BOX);
    active = active.filter(bullet => !bullet.out(BOX));
    corners.forEach((corner, index) => { if (active.some(bullet => bullet.hits(corner))) threatenedCorners.add(index); });
    if (time >= run.pattern.duration) continue;
    interval.push(active.map(bullet => new Bullet({ ...bullet })));
    if (interval.length < moveFrames) continue;
    const next = new Set();
    for (const fromIndex of reachable) for (const toIndex of neighbors[fromIndex]) {
      const from = points[fromIndex], to = points[toIndex];
      const safe = interval.every((bullets, index) => {
        const u = (index + 1) / moveFrames;
        const soul = { x: from.x + (to.x - from.x) * u, y: from.y + (to.y - from.y) * u, r: SOUL.r };
        return bullets.every(bullet => !bullet.hits(soul));
      });
      if (safe) next.add(toIndex);
    }
    reachable = next;
    assert.ok(reachable.size, `${id} retains a 110px/s reachable path at ${time.toFixed(2)}s`);
    Object.assign(run.api.soul, points[reachable.values().next().value]);
    interval = [];
  }
  assert.equal(threatenedCorners.size, corners.length, `${id} eventually pressures every corner`);
  assert.equal(active.length, 0, `${id} hazards expire through Bullet.out before the battle lifecycle cleanup cap`);
}

test('test_choimis_pattern_b_exports_exact_registry_contract', () => {
  assert.deepEqual(Object.keys(CHOIMIS_PATTERNS_B), IDS);
  for (const id of IDS) {
    const pattern = CHOIMIS_PATTERNS_B[id]();
    assert.ok(pattern.duration >= 5);
    assert.equal(typeof pattern.update, 'function');
  }
});

test('test_choimis_rap_keeps_center_mic_silhouette_and_delivers_exact_lyrics_from_board_edges', () => {
  const run = start('choimis_rap');
  advance(run, run.pattern.duration);
  const boss = run.emitted.find(b => b.shape === 'choimis_mic');
  const lyrics = run.emitted.filter(b => b.shape === 'choimis_lyric');

  assert.ok(boss);
  assert.deepEqual({ x: boss.x, y: boss.y }, { x: BOX.x + BOX.w / 2, y: BOX.y + BOX.h / 2 });
  assert.ok(Math.abs(boss.sourceBodyHeight * boss.spriteScale - 62.238) < 0.01, 'approved 123px body renders at the shared 0.506 boss scale');
  assert.deepEqual(boss.spritePivot, [80, 152]);
  assert.ok(boss.warn >= 0.3);
  boss.age = boss.warn - 0.01;
  assert.equal(boss.hits({ x: boss.x, y: boss.y, r: 1 }), false, 'center silhouette telegraphs before becoming solid');
  boss.age = boss.warn;
  assert.equal(boss.hits({ x: boss.x, y: boss.y, r: 1 }), true);
  assert.equal(boss.hits({ x: boss.x + 22, y: boss.y - 23, r: 1 }), false, 'transparent mic-pose corner stays safe');
  assert.equal(lyrics.map(b => b.text).join(''), '요최미스래퍼딱지를때이젠앰씨로포에버포에버');
  assert.deepEqual(lyrics.map(b => b.order), lyrics.map((_, index) => index));
  assert.ok(lyrics.every(b => b.warn >= 0.3));
  assert.ok(lyrics.every(b => b.spawnX >= BOX.x - 40 && b.spawnX <= BOX.x + BOX.w + 40), 'outside entries survive Bullet.out');
  assert.ok(new Set(lyrics.map(b => b.lane)).size >= 4, 'lyrics cover enough lanes to defeat corner camping');
});

test('test_choimis_rap_draws_readable_cjk_inside_its_collision_rectangle', () => {
  const run = start('choimis_rap');
  advance(run, 1.7);
  const lyric = run.emitted.find(b => b.shape === 'choimis_lyric');
  const calls = [];
  const ctx = new Proxy({}, {
    get(target, key) { return target[key] ?? ((...args) => calls.push([key, ...args])); },
    set(target, key, value) { target[key] = value; calls.push([key, value]); return true; },
  });
  lyric.age = lyric.warn + 0.1;
  lyric.draw(ctx);
  assert.ok(calls.some(call => call[0] === 'font' && String(call[1]).includes('NeoDunggeunmo')));
  assert.ok(calls.some(call => call[0] === 'fillText' && call[1] === lyric.text));
  assert.ok(lyric.w <= BOX.w - 10);
  assert.equal(lyric.hits({ x: lyric.x, y: lyric.y, r: 1 }), true);
  assert.equal(lyric.hits({ x: lyric.x, y: lyric.y + lyric.h, r: 1 }), false);
});

test('test_choimis_seup_uses_existing_clip_once_and_locks_every_warned_path', () => {
  const run = start('choimis_seup');
  advance(run, run.pattern.duration);
  const threats = run.emitted.filter(b => !b.harmless && ['choimis_breath', 'choimis_finger_beam'].includes(b.shape));

  assert.deepEqual(run.sounds.filter(name => name === 'choimis_seup_miss'), ['choimis_seup_miss']);
  assert.ok(threats.length >= 10);
  assert.ok(threats.every(b => b.warn >= 0.3));
  const beam = threats.find(b => b.shape === 'choimis_finger_beam');
  const locked = { ...beam.lockedTarget };
  run.soul.x = BOX.x + BOX.w - 8; run.soul.y = BOX.y + 8;
  beam.update(0.2, BOX);
  assert.deepEqual(beam.lockedTarget, locked, 'danger line never tracks after telegraph');
  assert.ok(threats.some(b => b.fromEdge === 'left') && threats.some(b => b.fromEdge === 'right'));
  assert.ok(threats.some(b => b.fromEdge === 'top') && threats.some(b => b.fromEdge === 'bottom'));
});

test('test_choimis_fashion_sends_four_distinct_outfit_silhouettes_in_sequence', () => {
  const run = start('choimis_fashion');
  advance(run, run.pattern.duration);
  const outfits = run.emitted.filter(b => b.shape === 'choimis_outfit');

  assert.deepEqual(outfits.map(b => b.look), [0, 1, 2, 3]);
  assert.ok(outfits.every(b => b.warn >= 0.3));
  assert.deepEqual(outfits.map(b => Math.sign(b.direction)), [1, -1, 1, -1]);
  assert.equal(new Set(outfits.map(b => b.profile)).size, 4, 'outfits are geometry changes, not color reskins');
  for (const outfit of outfits) {
    outfit.age = outfit.warn + outfit.flight / 2;
    outfit.steer(outfit);
    assert.equal(outfit.hits({ x: outfit.x, y: outfit.y, r: 1 }), true);
    assert.equal(outfit.hits({ x: outfit.x + outfit.w / 2, y: outfit.y - outfit.h / 2, r: 1 }), false,
      'transparent bounding-box corners do not deal damage');
  }
});

test('test_choimis_fashion_reads_the_four_outfits_from_a_two_by_two_sheet', () => {
  const run = start('choimis_fashion');
  run.api.images.fashion = { width: 192, height: 192 };
  advance(run, run.pattern.duration);
  const outfits = run.emitted.filter(b => b.shape === 'choimis_outfit');

  for (const outfit of outfits) {
    const calls = [];
    const ctx = new Proxy({}, {
      get(target, key) { return target[key] ?? ((...args) => calls.push([key, ...args])); },
      set(target, key, value) { target[key] = value; return true; },
    });
    outfit.age = outfit.warn + 0.1; outfit.steer(outfit); outfit.draw(ctx);
    const draw = calls.find(call => call[0] === 'drawImage');
    const [left, top, right, bottom] = outfit.sourceBbox;
    assert.deepEqual(draw.slice(2, 6), [outfit.look % 2 * 96 + left, Math.floor(outfit.look / 2) * 96 + top, right - left, bottom - top]);
    assert.ok(outfit.w <= 48 && outfit.h <= 60);
    assert.equal(calls.some(call => call[0] === 'fillRect' || call[0] === 'stroke'), false, 'approved garment art has no generated bars or outline');
  }
});

test('test_choimis_fashion_uses_cached_alpha_pixels_for_visible_garment_collision', () => {
  const pixels = new Uint8ClampedArray(192 * 192 * 4);
  for (let look = 0; look < 4; look++) {
    const ox = look % 2 * 96, oy = Math.floor(look / 2) * 96;
    for (let y = 20; y <= 80; y++) for (let x = 30; x <= 38; x++) pixels[((oy + y) * 192 + ox + x) * 4 + 3] = 255;
    for (let y = 72; y <= 80; y++) for (let x = 30; x <= 75; x++) pixels[((oy + y) * 192 + ox + x) * 4 + 3] = 255;
  }
  const previousDocument = globalThis.document;
  globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ({ drawImage() {}, getImageData: () => ({ data: pixels }) }) }) };
  try {
    const run = start('choimis_fashion');
    run.api.images.fashion = { width: 192, height: 192 };
    advance(run, 0.4);
    const outfit = run.emitted.find(b => b.shape === 'choimis_outfit');
    outfit.age = outfit.warn + outfit.flight / 2; outfit.steer(outfit);
    const [left, top, right, bottom] = outfit.sourceBbox, drawLeft = outfit.x - outfit.w / 2, drawTop = outfit.y - outfit.h / 2;
    const atSource = (x, y) => ({
      x: drawLeft + (x - left + 0.5) / (right - left) * outfit.w,
      y: drawTop + (y - top + 0.5) / (bottom - top) * outfit.h,
      r: 1,
    });
    assert.deepEqual(outfit.sourceBbox, [30, 20, 76, 81]);
    assert.equal(outfit.hits(atSource(35, 45)), true, 'opaque garment pixel collides');
    assert.equal(outfit.hits(atSource(70, 30)), false, 'transparent space inside alpha bounds stays safe');
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
});

test('test_choimis_patterns_b_keep_a_reachable_path_and_clean_up_at_sixty_hertz', () => {
  for (const id of IDS) verifyReachableTimeline(id);
});
