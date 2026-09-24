import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { runScenario } from './lib/harness.mjs';

await runScenario({ name: 'castle-dark-chase', launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] } }, async ({ page, open, until, press, shot, fixture, check }) => {
  const mode = process.env.QA_CHASE_MODE || 'main';
  const width = Number(process.env.QA_WIDTH || 1280);
  await page.setViewportSize({ width, height: 900 });
  const key = async code => { await press(code, { delay: 40 }); await page.waitForTimeout(90); };
  const ready = () => until(() => game.state === 'field' && !game.dialogue.running && !game.transitioning && game.fade.alpha < 0.01, 30000);
  const state = () => page.evaluate(() => ({ map: game.mapId, state: game.state, xy: [game.player.x, game.player.y],
    party: game.party, hp: ['hyungsub', ...game.party].map(id => [id, game.hpOf(id), game.maxHpOf(id)]),
    inventory: game.inventory, seen: !!game.flags.castle_dark_chase_seen, done: !!game.flags.castle_dark_chase_done,
    chase: game.castleDarkChase?.snapshot, dark: !!game.castleDarkPath, pulses: game.castleDarkPath?.pulses.length ?? 0,
    locked: game.camera.locked, zoom: game.zoom.s, dialogue: game.dialogue.running,
    bgm: game.sound.bgmName, clock: game.sound.bgm?.currentTime, paused: game.sound.bgm?.paused,
    blocked: game.map.solidRect(game.player.x, game.player.y, game.player.w, game.player.h) }));
  const walk = async (code, predicate, label, timeout = 15000) => {
    await page.keyboard.down(code);
    try { assert.ok(await until(predicate, timeout), label); }
    finally { await page.keyboard.up(code); }
  };
  const observe = () => fixture('read-only-scene-observer', 'Wrap production draw, sound and textbox entry to record real phase/position/audio handles. No flags, position, clocks or inputs are changed.', () => {
    const q = window.__chaseQA = { samples: [], texts: [], sounds: [], audio: [], radii: [] };
    const sfx = game.sound.sfx.bind(game.sound), draw = game.draw.bind(game), show = game.textbox.show.bind(game.textbox);
    game.textbox.show = (...args) => { q.texts.push({ at: performance.now(), text: args[0]?.text }); return show(...args); };
    game.sound.sfx = (name, options) => {
      const a = sfx(name, options); q.sounds.push({ name, at: performance.now(), handle: !!a });
      if (a) q.audio.push({ name, handle: a }); return a;
    };
    const ctx = game.canvas.getContext('2d'), gradient = ctx.createRadialGradient.bind(ctx);
    ctx.createRadialGradient = (...args) => { if (game.castleDarkPath && q.radii.length < 20000) q.radii.push(args[5]); return gradient(...args); };
    game.draw = (...args) => {
      const result = draw(...args);
      if (!q.samples.length || performance.now() - q.samples.at(-1).at > 70) {
        const c = game.castleDarkChase;
        q.samples.push({ at: performance.now(), state: game.state, map: game.mapId, xy: [game.player?.x, game.player?.y],
          phase: c?.phase, monster: c ? [c.x, c.y] : null, monsterInWall: c ? game.map.tileAt(Math.floor(c.x / 32), Math.floor(c.y / 32)).solid : null,
          dialogue: game.dialogue.running, text: game.textbox.node?.text, fade: game.fade.alpha,
          pulses: game.castleDarkPath?.pulses.length ?? 0, zoom: game.zoom.s,
          bgm: game.sound.bgmName, clock: game.sound.bgm?.currentTime, paused: game.sound.bgm?.paused,
          facing: [game.player, ...game.entities.filter(e => e.def?.type === 'follower')].map(e => e?.facing),
          emotes: [game.player, ...game.entities.filter(e => e.def?.type === 'follower')].map(e => e?.emote?.kind),
          audio: q.audio.map(({ name, handle: a }) => ({ name, time: a.currentTime, paused: a.paused, ended: a.ended, source: a.currentSrc, ready: a.readyState })) });
      }
      return result;
    };
  });
  const finishDialogues = async stop => {
    const end = Date.now() + 60000;
    while (Date.now() < end) {
      if (await page.evaluate(stop)) return;
      if (await page.evaluate(() => game.textbox.isOpen && game.textbox.state === 'waiting')) await key('KeyC');
      else await page.waitForTimeout(60);
    }
    throw new Error('Dialogue did not reach expected state');
  };
  const continueTitle = async () => {
    assert.ok(await until(() => game.state === 'title' && game.title.phase === 'wait', 10000));
    await key('Space'); assert.ok(await until(() => game.title.phase === 'zoom', 5000));
    await key('KeyC'); assert.ok(await until(() => game.title.phase === 'locked' && game.title.time > 3.05, 5000));
    await key('KeyC'); assert.ok(await until(() => game.state === 'field', 20000));
  };
  const dump = async () => {
    const q = await page.evaluate(() => ({ ...window.__chaseQA, audio: window.__chaseQA.audio.map(({ name, handle: a }) => ({ name, source: a.currentSrc, time: a.currentTime, paused: a.paused, ended: a.ended })) }));
    fs.writeFileSync(path.join(process.env.SHOT_DIR, 'observations.json'), JSON.stringify(q, null, 2));
    return q;
  };
  const mask = async label => {
    const observed = await page.evaluate(async () => {
      const { CHAR_SCALE } = await import('./src/world/world.js');
      const ctx = game.canvas.getContext('2d'), data = ctx.getImageData(0, 0, game.canvas.width, game.canvas.height).data;
      const scale = game.canvas.width / 480, cam = { x: Math.round(game.camera.x), y: Math.round(game.camera.y) };
      const bounds = game.entities.filter(e => e === game.player || e.def?.type === 'follower').map(e => {
        const w = Math.round(e.sprite.fw / e.sprite.px * CHAR_SCALE * (e.def.visualScale || 1));
        const h = Math.round(e.sprite.fh / e.sprite.px * CHAR_SCALE * (e.def.visualScale || 1));
        return [e.x + e.w / 2 - w / 2, e.y + e.h - h, w, h];
      });
      const c = game.castleDarkChase; if (c) bounds.push([c.x - 98, c.y - 98, 196, 196]);
      bounds.push(...game.castleDarkPath.rectangles);
      let tested = 0, lit = 0;
      for (let y = 10; y < 345; y++) for (let x = 5; x < 475; x++) {
        const wx = x + cam.x, wy = y + cam.y;
        if (bounds.some(([a, b, w, h]) => wx >= a - 2 && wx <= a + w + 2 && wy >= b - 2 && wy <= b + h + 2)) continue;
        const i = (Math.floor((y + 0.5) * scale) * game.canvas.width + Math.floor((x + 0.5) * scale)) * 4;
        tested++; if (data[i] || data[i + 1] || data[i + 2]) lit++;
      }
      return { tested, lit };
    });
    check(`${label} pulses never reveal outside real floor`, observed.tested > 1000 && observed.lit === 0, JSON.stringify(observed));
  };
  for (const file of ['src/scenes/castle-dark-chase.js', 'src/data/cutscenes/castle_dark_chase.js', 'src/scenes/castle-dark-path.js', 'assets/maps/gajaeman_castle_dark_arrival.json', 'assets/maps/gajaeman_castle_dark_refuge.json']) {
    const local = fs.readFileSync(path.join(process.env.QA_SOURCE_ROOT, file));
    const remote = Buffer.from(await (await page.request.get(new URL(file, process.env.QA_BASE_URL).href)).body());
    check(`served source ${file}`, local.equals(remote), crypto.createHash('sha256').update(local).digest('hex'));
  }
  await open({ qa: 'castle_dark_chase_intro' });
  assert.ok(await until(() => window.game?.mapId === 'gajaeman_castle_dark_arrival' && !!game.castleDarkChase, 30000));
  await observe();
  if (mode === 'cancel') {
    await finishDialogues(() => game.castleDarkChase?.phase === 'reveal');
    await shot('reveal-before-cancel'); await key('Escape');
    assert.ok(await until(() => game.state === 'title', 5000));
    check('cancel stops the owned roar handle immediately', await page.evaluate(() => window.__chaseQA.audio.filter(a => a.name === 'baron_roar').every(a => a.handle.paused || a.handle.ended)));
    await page.waitForTimeout(2500);
    check('reveal cancel disposes threat, camera, dialogue and tense audio', await page.evaluate(() => !game.castleDarkChase && !game.castleDarkPath && !game.dialogue.running && !game.camera.locked && game.sound.bgmName !== 'baron_intro'));
    await continueTitle(); await finishDialogues(() => !game.dialogue.running && game.castleDarkChase?.phase === 'chase');
    assert.ok(await ready());
    check('cancel Continue replays safely into chase', (await state()).seen && !(await state()).locked && (await state()).party.length === 2);
    await key('Escape'); await page.waitForTimeout(1000);
    check('active chase title removes threat and loop', await page.evaluate(() => !game.castleDarkChase && game.sound.bgmName !== 'baron_intro'));
    await continueTitle(); await finishDialogues(() => !game.dialogue.running && game.castleDarkChase?.phase === 'chase'); assert.ok(await ready());
    await shot('chase-continued'); await dump(); return;
  }

  const lines = [];
  for (let i = 0; i < 4; i++) {
    assert.ok(await until(() => game.textbox.isOpen && game.textbox.state === 'waiting', 15000));
    lines.push(await page.evaluate(() => game.textbox.node.text));
    if (i === 3) await shot('intro-fourth-line');
    const a = (await state()).chase;
    await page.waitForTimeout(180);
    check(`intro line ${i + 1} never moves monster`, JSON.stringify((await state()).chase) === JSON.stringify(a));
    await key('KeyC');
  }
  check('exact four introductory lines and order', JSON.stringify(lines) === JSON.stringify(['* 형들,,', '* 왜 빠맨아?', '* 아까부터느낀건데,,,', '* 뒤에서 뭔가가 따라오는 기분이..']), JSON.stringify(lines));
  assert.ok(await until(() => game.castleDarkChase?.phase === 'reveal', 8000)); await page.waitForTimeout(900); await shot('monster-reveal-mid');
  assert.ok(await until(() => game.textbox.state === 'waiting' && game.textbox.node?.text === '* 오 씨발 도망가요 빨리', 8000));
  const fixed = (await state()).chase;
  for (const w of [375, 768, 1280]) { await page.setViewportSize({ width: w, height: 900 }); await shot(`monster-reveal-${w}`); }
  await page.waitForTimeout(1200);
  check('monster stays frozen throughout held escape dialogue', JSON.stringify((await state()).chase) === JSON.stringify(fixed));
  check('approved 192px monster image decoded', await page.evaluate(() => { const image = game.propImages['assets/enemies/castle-dark-pursuer.png']; return image?.complete && image.naturalWidth === 192 && image.naturalHeight === 192; }));
  const reveal = await page.evaluate(() => window.__chaseQA.samples);
  check('roar has actual decoded audio and advancing playback time', reveal.some(s => s.audio.some(a => a.name === 'baron_roar' && a.ready >= 2 && a.time > 0.1 && !a.paused)));
  check('tense BGM plays during reveal', reveal.some(s => s.phase === 'reveal' && s.bgm === 'baron_intro' && !s.paused && s.clock > 0.1));
  check('party turns down before threat reveal', reveal.some(s => s.phase === 'reveal' && s.facing.length === 3 && s.facing.every(f => f === 'down')));
  check('all three exclamation emotes occur before reveal', reveal.some(s => s.emotes.length === 3 && s.emotes.every(kind => kind === '!')));
  await key('KeyC'); assert.ok(await ready());
  await fixture('initial-wounded-party', 'Set three current HP values below max once at chase start to verify non-damaging catch/reset and later real fountain healing. No positions, flags, item inventory or progress injected.', () => {
    for (const id of ['hyungsub', ...game.party]) game.partyHp[id] = game.maxHpOf(id) - 37;
  });
  const wounded = await state();
  assert.ok(await until(() => game.castleDarkChase?.phase === 'caught', 16000)); await shot('caught-fade');
  assert.ok(await until(() => game.castleDarkChase?.phase === 'chase' && !game.transitioning && game.fade.alpha < 0.01, 5000));
  check('catch restores entrance with zero HP/item loss', JSON.stringify((await state()).hp) === JSON.stringify(wounded.hp)
    && JSON.stringify((await state()).inventory) === JSON.stringify(wounded.inventory)
    && Math.hypot((await state()).xy[0] - 228, (await state()).xy[1] - 240) < 1);
  const startTime = Date.now();
  await walk('ArrowUp', () => game.player.y <= 104, 'first north turn');
  await walk('ArrowRight', () => game.player.x >= 1188, 'east across first leg'); await shot('chase-first-corner'); await mask('first corner');
  await walk('ArrowDown', () => game.player.y >= 1480, 'long south leg');
  await walk('ArrowRight', () => game.player.x >= 2276, 'east across lower leg');
  await walk('ArrowUp', () => game.player.y <= 680, 'middle north leg'); await shot('chase-middle-pulses'); await mask('middle corner');
  await walk('ArrowRight', () => game.player.x >= 3268, 'east across upper leg');
  await walk('ArrowUp', () => game.mapId === 'gajaeman_castle_dark_refuge', 'north refuge exit'); assert.ok(await ready());
  const duration = Date.now() - startTime, arrived = await state(); await shot('refuge-arrival');
  check('natural winding traversal reaches refuge without extra catch', arrived.done && !arrived.chase && !arrived.dark && !arrived.blocked && JSON.stringify(arrived.hp) === JSON.stringify(wounded.hp), `wall time ${duration}ms`);
  const q = await dump();
  check('threat crosses solid walls independently of player route', q.samples.some(s => s.phase === 'chase' && s.monsterInWall));
  check('real steps show broad but sparse pulses', Math.max(...q.samples.map(s => s.pulses)) > 0 && Math.max(...q.samples.map(s => s.pulses)) <= 2 && Math.max(...q.radii) > 165);
  // Draw snapshots can straddle catch-up frames; measure sustained one-second windows.
  const speeds = [];
  for (let i = 0; i < q.samples.length; i++) {
    const first = q.samples[i]; if (first.phase !== 'chase') continue;
    let distance = 0;
    for (let j = i + 1; j < q.samples.length; j++) {
      const current = q.samples[j], previous = q.samples[j - 1];
      if (current.phase !== 'chase' || current.map !== first.map) break;
      distance += Math.hypot(current.monster[0] - previous.monster[0], current.monster[1] - previous.monster[1]);
      if (current.at - first.at >= 1000) { speeds.push(distance / ((current.at - first.at) / 1000)); break; }
    }
  }
  const speedEvidence = { windows: speeds.length, minimum: Math.min(...speeds), maximum: Math.max(...speeds), mean: speeds.reduce((a, b) => a + b, 0) / speeds.length };
  check('visible pursuit speed remains slow over sustained windows', speeds.length > 100 && speedEvidence.maximum < 38 && speedEvidence.mean > 32 && speedEvidence.mean < 36, JSON.stringify(speedEvidence));
  assert.ok(await until(() => game.sound.bgmName === 'castle_dark_path' && game.sound.bgm?.currentTime > 0.1 && !game.sound.bgm.paused, 8000));
  const clock = (await state()).clock; await page.waitForTimeout(400);
  check('refuge music has real advancing clock', (await state()).clock > clock + 0.2);
  await walk('ArrowRight', () => game.player.x >= 548, 'approach fountain column');
  await walk('ArrowUp', () => game.player.probe()?.id === 'castle_dark_refuge_spring', 'actual fountain approach');
  await key('KeyC'); assert.ok(await until(() => game.textbox.isOpen, 5000)); await shot('fountain-heals');
  check('C fountain heals all genuinely wounded party members', (await state()).hp.every(([, hp, max]) => hp === max));
  await finishDialogues(() => !game.dialogue.running); assert.ok(await ready());
  await walk('ArrowLeft', () => game.player.x <= 372, 'return central door column');
  await walk('ArrowUp', () => game.player.y <= 326, 'approach final gate');
  const beforeDoor = await state(); await page.keyboard.down('ArrowUp'); await page.waitForTimeout(450); await page.keyboard.up('ArrowUp'); await key('KeyC'); await shot('final-closed-door');
  check('last gate remains closed with no unrequested new story', (await state()).map === 'gajaeman_castle_dark_refuge' && (await state()).xy[1] >= 319 && !(await state()).dialogue && !(await state()).blocked, JSON.stringify({ before: beforeDoor.xy, after: (await state()).xy }));
  await key('Escape'); await continueTitle(); assert.ok(await ready());
  check('refuge Continue retains done flag party health and clean scene', (await state()).done && !(await state()).chase && !(await state()).dark && (await state()).party.length === 2 && (await state()).hp.every(([, hp, max]) => hp === max));
  await dump();
  check('audio evidence is playback observation, not subjective listening', true);
});
