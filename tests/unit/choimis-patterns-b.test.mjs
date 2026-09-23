import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Bullet } from '../../src/battle/bullets.js';
import { Battle } from '../../src/battle/battle.js';
import { CHOIMIS_PATTERNS_B } from '../../src/battle/choimis-patterns-b.js';
import { createChoimisRapVideo } from '../../src/battle/choimis-rap-video.js';
import { ENEMIES } from '../../src/data/enemies.js';

const BOX = Object.freeze({ x: 140, y: 140, w: 200, h: 150 });
const SOUL = Object.freeze({ x: 184, y: 252, r: 6 });
const IDS = ['choimis_rap', 'choimis_seup', 'choimis_fashion'];
const FASHION_LINES = ENEMIES.choimis_flower.patterns.find(pattern => pattern.type === 'choimis_fashion').lines;
const RAP = ENEMIES.choimis_flower.patterns.find(pattern => pattern.type === 'choimis_rap');
const RAP_TEXT = '래퍼딱지를때는중이젠앰씨로 예술가의길로!@#!@$!@#@#$포에버포에버';
const ROOT = new URL('../../', import.meta.url);

function start(id, options = {}) {
  const emitted = [], sounds = [], poses = [], speech = [], mediaStarts = [], mediaStops = [], mediaSyncs = [], soul = { ...SOUL };
  const api = {
    box: BOX, soul, rnd: () => 0.5, images: {},
    emit(spec) { const bullet = new Bullet(spec); emitted.push(bullet); return bullet; },
    sfx(name) { sounds.push(name); },
    present(pose) { poses.push(pose); },
    say(text, hold) { speech.push({ text, hold, at: this.now }); },
    startRapVideo(spec) { const handle = { spec }; mediaStarts.push(handle); return handle; },
    stopRapVideo(handle) { mediaStops.push(handle); },
    syncRapVideo(handle, time) { mediaSyncs.push({ handle, time }); },
  };
  return { pattern: CHOIMIS_PATTERNS_B[id]({ ...(id === 'choimis_rap' ? RAP : {}), ...options }), emitted, sounds, poses, speech, mediaStarts, mediaStops, mediaSyncs, soul, api };
}

function advance(run, end, step = 0.05) {
  for (let t = 0; t <= end + 1e-9; t += step) {
    run.api.now = t;
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

test('test_choimis_rap_runtime_asset_keeps_the_verified_video_and_audio_contract', () => {
  const asset = new URL('assets/video/choimis-forever-22-41.mp4', ROOT);
  const metadata = JSON.parse(fs.readFileSync(new URL('assets/source/choimis-rap297/metadata.json', ROOT), 'utf8'));
  const bytes = fs.readFileSync(asset);
  assert.equal(bytes.length, metadata.bytes);
  assert.equal(bytes.subarray(4, 8).toString('ascii'), 'ftyp');
  assert.deepEqual([metadata.segment_seconds.duration, metadata.video.width, metadata.video.height, metadata.video.fps, metadata.video.frames], [19, 480, 270, 15, 285]);
  assert.deepEqual([metadata.audio.codec, metadata.audio.sample_rate, metadata.audio.channels], ['aac', 44100, 2]);
});

test('test_choimis_rap_keeps_center_mic_and_rains_only_supplied_lyrics_for_full_video_segment', () => {
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
  assert.equal(run.pattern.duration, 19);
  assert.ok(lyrics.length > 70, 'brisk staggered bursts fill the verse');
  assert.equal(lyrics.slice(0, Array.from(RAP_TEXT.replace(/\s/g, '')).length).map(b => b.text).join(''), RAP_TEXT.replace(/\s/g, ''));
  assert.ok(lyrics.every(b => Array.from(b.text).length === 1 && b.w <= 14 && b.h <= 14));
  assert.deepEqual(lyrics.map(b => b.order), lyrics.map((_, index) => index));
  assert.ok(lyrics.every(b => b.warn >= 0.3));
  assert.ok(lyrics.every(b => b.direction === 'down' && b.spawnY >= BOX.y && b.spawnY < BOX.y + 20), 'each glyph starts visibly at the top edge');
  assert.ok(new Set(lyrics.map(b => b.column)).size >= 2, 'alternating rain columns defeat one-side camping');
  assert.equal(run.mediaStarts.length, 1);
  assert.deepEqual(run.mediaStarts[0].spec, { src: 'assets/video/choimis-forever-22-41.mp4', volume: 0.72, opacity: 0.22 });
  assert.ok(run.mediaSyncs.length > 300 && run.mediaSyncs.every(sync => sync.handle === run.mediaStarts[0]));
  assert.deepEqual(run.mediaStops, [run.mediaStarts[0]], 'normal 19-second completion releases the video handle exactly once');
});

test('test_choimis_rap_draws_readable_cjk_inside_its_collision_rectangle', () => {
  const run = start('choimis_rap');
  advance(run, 3.5);
  const lyric = run.emitted.find(b => b.shape === 'choimis_lyric' && b.text === '래');
  const calls = [];
  const ctx = new Proxy({}, {
    get(target, key) { return target[key] ?? ((...args) => calls.push([key, ...args])); },
    set(target, key, value) { target[key] = value; calls.push([key, value]); return true; },
  });
  lyric.age = lyric.warn + 0.1;
  lyric.draw(ctx);
  assert.ok(calls.some(call => call[0] === 'font' && String(call[1]).includes('NeoDunggeunmo')));
  assert.equal(calls.filter(call => call[0] === 'fillText').map(call => call[1]).join(''), lyric.text);
  assert.ok(lyric.w <= BOX.w - 10);
  assert.equal(lyric.hits({ x: lyric.x, y: lyric.y, r: 1 }), true);
  assert.equal(lyric.hits({ x: lyric.x, y: lyric.y + lyric.h, r: 1 }), false);
});

test('test_choimis_seup_prepares_then_sends_readable_miss_words_through_alternating_corridors', () => {
  const run = start('choimis_seup');
  advance(run, 0.75);
  assert.equal(run.emitted.length, 0, 'the approved idle pose and inhale clip prepare the attack before hazards appear');
  advance(run, run.pattern.duration);
  const threats = run.emitted.filter(b => !b.harmless);

  assert.deepEqual(run.sounds.filter(name => name === 'choimis_seup_miss'), ['choimis_seup_miss']);
  assert.equal(threats.length, 12);
  assert.ok(threats.every(b => b.shape === 'choimis_miss' && b.text === 'MISS'));
  assert.ok(threats.every(b => b.warn >= 0.3));
  assert.ok(threats.some(b => b.fromEdge === 'left') && threats.some(b => b.fromEdge === 'right'));
  const gaps = [...new Map(threats.map(b => [b.wave, b.safeGap])).values()];
  assert.deepEqual(gaps, ['bottom', 'top', 'bottom', 'top'], 'MISS rows alternate the safe vertical corridor');

  const miss = threats[0], calls = [];
  const ctx = new Proxy({}, {
    get(target, key) { return target[key] ?? ((...args) => calls.push([key, ...args])); },
    set(target, key, value) { target[key] = value; calls.push([key, value]); return true; },
  });
  miss.age = miss.warn; miss.steer(miss); miss.draw(ctx);
  assert.ok(calls.some(call => call[0] === 'font' && String(call[1]).includes('NeoDunggeunmo')));
  assert.ok(calls.some(call => call[0] === 'fillText' && call[1] === 'MISS'));
  assert.equal(miss.hits({ x: miss.x, y: miss.y, r: 1 }), true);
  assert.equal(miss.hits({ x: miss.x + miss.w / 2 + 3, y: miss.y + miss.h / 2 + 3, r: 1 }), false,
    'the visible MISS plaque and its collision rectangle share the same boundary');
});

test('test_choimis_normal_cadence_increases_modestly_without_shortening_warnings', () => {
  const rap = start('choimis_rap', { every: undefined, burstPause: undefined });
  advance(rap, 5);
  const glyphs = rap.emitted.filter(bullet => bullet.shape === 'choimis_lyric');
  assert.ok(Math.abs(glyphs[1].fallAt - glyphs[0].fallAt - 0.08) < 1e-9);
  assert.ok(Math.abs(glyphs[7].fallAt - glyphs[6].fallAt - 0.5) < 1e-9);
  assert.ok(glyphs.every(bullet => bullet.warn === 0.48));
  const seup = start('choimis_seup');
  const emittedAt = [];
  seup.api.emit = spec => { emittedAt.push({ at: seup.api.now, ...spec }); return new Bullet(spec); };
  advance(seup, seup.pattern.duration, 0.01);
  const firstRows = emittedAt.filter(bullet => bullet.slot === 0);
  assert.equal(firstRows.length, 4);
  for (let index = 1; index < firstRows.length; index++) {
    assert.ok(Math.abs(firstRows[index].at - firstRows[index - 1].at - 1.27) < 0.011);
  }
  assert.ok(firstRows.every(bullet => bullet.warn === 0.42));
});

test('test_choimis_rap_starts_video_immediately_but_first_glyph_falls_at_three_seconds', () => {
  const run = start('choimis_rap'), dt = 0.01;
  let firstFall = null;
  for (let frame = 0; frame < 340; frame++) {
    const t = frame * dt, now = t + dt;
    run.pattern.update(t, dt, run.api);
    if (frame === 0) assert.equal(run.mediaStarts.length, 1);
    for (const bullet of run.emitted) {
      bullet.update(dt, BOX);
      if (now < 3 - 1e-9) assert.equal(bullet.hits({ x: bullet.x, y: bullet.y, r: 6 }), false, 'including central mic, no hazard before 3s');
      if (bullet.shape === 'choimis_lyric' && bullet.y > bullet.spawnY + 0.001) firstFall ??= now;
    }
  }
  assert.ok(firstFall >= 3 && firstFall <= 3.02, `first visible fall is ${firstFall}s`);
  const glyphs = run.emitted.filter(b => b.shape === 'choimis_lyric');
  assert.equal(glyphs[0].fallAt, 3);
  for (const [index, glyph] of glyphs.slice(1, 5).entries()) {
    const previous = glyphs[index].fallAt, interval = glyph.fallAt - previous;
    const tolerance = Number.EPSILON * (Math.abs(glyph.fallAt) + Math.abs(previous) + 0.08);
    assert.ok(Math.abs(interval - 0.08) <= tolerance, `glyph interval ${interval} must be 0.08s within floating-point precision`);
  }
  assert.ok(glyphs.every(b => !b.safeColumns.includes(b.column)), 'warned glyph columns preserve two adjacent empty lanes');
});

test('test_choimis_rap_large_steps_keep_glyph_schedule_and_stop_video_once', () => {
  const run = start('choimis_rap');
  run.pattern.update(0, 0.01, run.api);
  run.pattern.update(8, 0.8, run.api);
  const glyphs = run.emitted.filter(b => b.shape === 'choimis_lyric');
  assert.ok(glyphs.length > 20);
  assert.equal(new Set(glyphs.map(b => b.order)).size, glyphs.length);
  for (const glyph of glyphs) {
    glyph.update(0.8, BOX);
    const elapsed = 8.8 - glyph.fallAt;
    assert.ok(Math.abs(glyph.y - glyph.spawnY - Math.max(0, elapsed) * RAP.speed) < 1e-8);
    if (glyph.out(BOX)) assert.equal(glyph.hits({ x: glyph.x, y: glyph.y, r: 6 }), false);
  }
  run.pattern.update(18.8, 0.2, run.api);
  const total = run.emitted.length;
  run.pattern.update(21, 2, run.api);
  assert.equal(run.emitted.length, total);
  assert.deepEqual(run.mediaStops, [run.mediaStarts[0]]);
});

test('test_choimis_fashion_adds_three_staggered_outfits_with_readable_per_outfit_bubbles', () => {
  const run = start('choimis_fashion', { lines: FASHION_LINES });
  advance(run, run.pattern.duration);
  const outfits = run.emitted.filter(b => b.shape === 'choimis_outfit');

  assert.deepEqual(outfits.map(b => b.look), [0, 1, 2, 3, 4, 5, 6]);
  assert.ok(outfits.every(b => b.warn >= 0.3));
  assert.deepEqual(outfits.map(b => Math.sign(b.direction)), [1, -1, 1, -1, 1, -1, 1]);
  assert.equal(new Set(outfits.map(b => b.profile)).size, 7, 'new outfits have distinct silhouettes');
  assert.deepEqual(outfits.map(b => b.safeGap), ['bottom', 'top', 'bottom', 'top', 'bottom', 'top', 'bottom']);
  assert.deepEqual(outfits.map(b => b.entryAt), [0.35, 1.3, 2.25, 3.2, 4.15, 5.1, 6.05]);
  assert.deepEqual(run.speech.map(entry => entry.text), [
    '이거 패턴이 이쁘네', '이건 매치하기 좋을듯', '이건 좀 과감한가?', '역시 핑크가 잘 받아',
    '이거 패턴이 이쁘네', '이건 매치하기 좋을듯', '이건 좀 과감한가?',
  ]);
  const warningReleases = outfits.map(outfit => outfit.entryAt + outfit.warn);
  run.speech.forEach((entry, index) => {
    assert.ok(entry.at >= warningReleases[index] && entry.at < warningReleases[index] + 0.051,
      `look ${index} remark starts on the first update after its warning releases`);
  });
  assert.ok(run.speech.every(entry => entry.hold === 1), 'each outfit gets a bounded one-second head bubble');
  const textSecondsPerCharacter = 0.03;
  for (const [index, outfit] of outfits.entries()) {
    const remark = run.speech[index], nextRemarkAt = run.speech[index + 1]?.at ?? Infinity;
    const speed = (BOX.w + 68) / outfit.flight;
    const fullInsideDistance = outfit.direction > 0
      ? BOX.x + 3 + outfit.w / 2 - outfit.spawnX
      : outfit.spawnX - (BOX.x + BOX.w - 3 - outfit.w / 2);
    const fullOutsideDistance = outfit.direction > 0
      ? BOX.x + BOX.w - 3 - outfit.w / 2 - outfit.spawnX
      : outfit.spawnX - (BOX.x + 3 + outfit.w / 2);
    const fullyInsideAt = outfit.entryAt + outfit.warn + fullInsideDistance / speed;
    const leavesFullViewAt = outfit.entryAt + outfit.warn + fullOutsideDistance / speed;
    const fullTextAt = remark.at + remark.text.length * textSecondsPerCharacter;
    const bubbleEndsAt = Math.min(nextRemarkAt, fullTextAt + remark.hold);
    const synchronizedSeconds = Math.min(leavesFullViewAt, bubbleEndsAt) - Math.max(fullyInsideAt, fullTextAt);
    assert.ok(synchronizedSeconds >= 0.3,
      `look ${index} keeps its complete remark and full visible garment together for ${synchronizedSeconds.toFixed(2)}s`);
  }
  for (const outfit of outfits) {
    assert.equal((BOX.w + 68) / outfit.flight, 126, 'pressure comes from staggered outfits, not faster projectiles');
    assert.ok(outfit.entryAt + outfit.life < run.pattern.duration, 'each outfit clears naturally before the pattern ends');
    outfit.age = outfit.warn + outfit.flight / 2;
    outfit.steer(outfit);
    assert.equal(outfit.hits({ x: outfit.x, y: outfit.y, r: 1 }), true);
    assert.equal(outfit.hits({ x: outfit.x + outfit.w / 2, y: outfit.y - outfit.h / 2, r: 1 }), false,
      'transparent bounding-box corners do not deal damage');
  }
});

test('test_choimis_every_registered_attack_has_an_in_character_preamble', () => {
  const patterns = ENEMIES.choimis_flower.patterns;
  assert.ok(patterns.every(pattern => typeof pattern.speak === 'string' && pattern.speak.length > 0));
  assert.deepEqual(Object.fromEntries(patterns.map(pattern => [pattern.type, pattern.speak])), {
    choimis_jjajang: '내 짜장면 맛 좀 볼래?',
    choimis_choso: '내 추구미는 쵸소우야',
    choimis_rap: '요 최미스 래퍼딱지를때이젠앰씨로 포에버 포에버',
    choimis_money: '가져가라.',
    choimis_seup: '스읍 미스',
    choimis_fashion: '이거 패션어떰?',
    choimis_pink_choso: '내 추구미는 쵸소우야',
    choimis_pink_kart: '막자할게',
    choimis_pink_gasuni: '가순이들아 나에게 힘을줘!',
    choimis_pink_prism: '차징해서 쏜 공격 아닌 이상 이 코어들은 무너지지 않아.',
    choimis_eating_race: '짜장면 먹방 대결해볼까? 들어와',
  });
  assert.ok(patterns.every(pattern => !/(?:6\s*번|3\s*번|\d+\s*회|damage|hit)/i.test(pattern.speak)), 'preambles never expose objective counters');
});

test('test_choimis_rap_video_plays_moving_media_with_audio_and_disposes_without_bgm_access', async () => {
  const calls = [], listeners = {}, documentRef = {
    hidden: false,
    addEventListener(name, listener) { listeners[name] = listener; },
    removeEventListener(name, listener) { if (listeners[name] === listener) delete listeners[name]; },
  }, video = {
    readyState: 3, videoWidth: 854, videoHeight: 480, currentTime: 0, paused: true,
    load() { calls.push('load'); }, play() { this.paused = false; calls.push('play'); return Promise.resolve(); },
    pause() { this.paused = true; calls.push('pause'); }, removeAttribute(name) { calls.push(`remove:${name}`); },
  };
  documentRef.createElement = () => video;
  const handle = createChoimisRapVideo({ src: 'clip.mp4', volume: 0.72, opacity: 0.22, documentRef });
  await Promise.resolve();
  assert.equal(video.src, 'clip.mp4'); assert.equal(video.preload, 'auto'); assert.equal(video.playsInline, true); assert.equal(video.muted, false); assert.equal(video.volume, 0.72);
  assert.deepEqual(calls.slice(0, 2), ['load', 'play']);
  assert.equal(await handle.ready, true);
  handle.sync({ time: 3.25, muted: true, paused: true });
  assert.equal(video.currentTime, 3.25); assert.equal(video.muted, true); assert.equal(video.paused, true);
  handle.sync({ time: 3.25, muted: false, paused: false });
  assert.equal(video.muted, false); assert.equal(video.paused, false);
  documentRef.hidden = true; listeners.visibilitychange();
  assert.equal(video.paused, true, 'hidden page pauses media even while requestAnimationFrame is suspended');
  documentRef.hidden = false; handle.sync({ time: 3.25, muted: false, paused: false });
  const drawn = [], ctx = new Proxy({ globalAlpha: 1 }, {
    get(target, key) { return target[key] ?? ((...args) => drawn.push([key, ...args])); },
    set(target, key, value) { target[key] = value; return true; },
  });
  handle.draw(ctx, { x: 0, y: 0, w: 480, h: 360 });
  assert.ok(drawn.some(call => call[0] === 'drawImage' && call[1] === video), 'decoded moving video frame is drawn, not a static stand-in');
  const pausesBeforeStop = calls.filter(call => call === 'pause').length;
  handle.stop(); handle.stop();
  assert.equal(calls.filter(call => call === 'pause').length, pausesBeforeStop + 1); assert.equal(calls.filter(call => call === 'remove:src').length, 1);
  assert.equal(listeners.visibilitychange, undefined);
  assert.equal('bgm' in handle, false, 'video lifecycle has no route to stop or restart battle BGM');
});

test('test_choimis_rap_video_stop_settles_a_pending_preload', async () => {
  const listeners = {}, video = {
    readyState: 0, paused: true, load() {}, play() { return Promise.resolve(); }, pause() {}, removeAttribute() {},
    addEventListener(name, listener) { listeners[name] = listener; }, removeEventListener(name, listener) { if (listeners[name] === listener) delete listeners[name]; },
  };
  const handle = createChoimisRapVideo({ autoplay: false, documentRef: { createElement: () => video } });
  handle.stop();
  assert.equal(await handle.ready, false);
  assert.deepEqual(listeners, {});
});

test('test_choimis_rap_video_abnormal_battle_cleanup_is_idempotent', () => {
  let stops = 0;
  const handle = { stop() { stops++; } };
  const battle = Object.assign(Object.create(Battle.prototype), { rapVideo: handle, gimmick: null, activeEnemyMode: null, actorFocus: null, enemies: [] });

  battle.disposeGimmick(); battle.disposeGimmick();

  assert.equal(stops, 1);
  assert.equal(battle.rapVideo, null);
});

test('test_choimis_fashion_reads_seven_outfits_from_the_extended_two_by_four_sheet', () => {
  const run = start('choimis_fashion');
  run.api.images.fashion = { width: 192, height: 384 };
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
  const pixels = new Uint8ClampedArray(192 * 384 * 4);
  for (let look = 0; look < 7; look++) {
    const ox = look % 2 * 96, oy = Math.floor(look / 2) * 96;
    for (let y = 20; y <= 80; y++) for (let x = 30; x <= 38; x++) pixels[((oy + y) * 192 + ox + x) * 4 + 3] = 255;
    for (let y = 72; y <= 80; y++) for (let x = 30; x <= 75; x++) pixels[((oy + y) * 192 + ox + x) * 4 + 3] = 255;
  }
  const previousDocument = globalThis.document;
  globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ({ drawImage() {}, getImageData: () => ({ data: pixels }) }) }) };
  try {
    const run = start('choimis_fashion');
    run.api.images.fashion = { width: 192, height: 384 };
    advance(run, run.pattern.duration);
    const outfits = run.emitted.filter(b => b.shape === 'choimis_outfit');
    assert.equal(outfits.length, 7);
    for (const outfit of outfits) {
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
    }
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
});

test('test_choimis_patterns_b_keep_a_reachable_path_and_clean_up_at_sixty_hertz', () => {
  for (const id of IDS) verifyReachableTimeline(id);
});
