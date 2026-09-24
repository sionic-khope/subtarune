import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { runScenario } from './lib/harness.mjs';

await runScenario({ name: 'castle-dark-chase', launchOptions: { args: ['--autoplay-policy=no-user-gesture-required', '--disable-gpu'] } }, async ({ page, open, until, press, shot, fixture, check }) => {
  const mode = process.env.QA_CHASE_MODE || 'main';
  const width = Number(process.env.QA_WIDTH || 1280);
  await page.setViewportSize({ width, height: 900 });
  const key = async code => { await press(code, { delay: 40 }); await page.waitForTimeout(90); };
  const ready = () => until(() => game.state === 'field' && !game.dialogue.running && !game.transitioning && game.fade.alpha < 0.01, 30000);
  const state = () => page.evaluate(() => ({ map: game.mapId, state: game.state, xy: [game.player.x, game.player.y],
    party: game.party, hp: ['hyungsub', ...game.party].map(id => [id, game.hpOf(id), game.maxHpOf(id)]),
    inventory: game.inventory, seen: !!game.flags.castle_dark_chase_seen, done: !!game.flags.castle_dark_chase_done,
    refugeDialogueDone: !!game.flags.castle_dark_refuge_dialogue_done,
    chase: game.castleDarkChase?.snapshot, dark: !!game.castleDarkPath, pulses: game.castleDarkPath?.pulses.length ?? 0,
    locked: game.camera.locked, zoom: game.zoom.s, dialogue: game.dialogue.running,
    bgm: game.sound.bgmName, clock: game.sound.bgm?.currentTime, paused: game.sound.bgm?.paused,
    blocked: game.map.solidRect(game.player.x, game.player.y, game.player.w, game.player.h) }));
  const walk = async (code, predicate, label, timeout = 15000) => {
    await page.keyboard.down(code);
    try { assert.ok(await until(predicate, timeout), label); }
    finally { await page.keyboard.up(code); }
  };
  const observe = () => fixture('read-only-scene-observer', 'Wrap production draw, sound and textbox entry to record real phase/position/audio handles. No flags, position, clocks or inputs are changed.', async () => {
    const { CHAR_SCALE } = await import('./src/world/world.js');
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
        const z = game.zoom, focus = z.fy - game.camera.y;
        const amount = z.smax > 1 ? Math.min(1, (z.s - 1) / (z.smax - 1)) : 1;
        const center = focus + (180 - focus) * amount;
        const project = y => z.s > 1.0001 ? center + (y - game.camera.y - focus) * z.s : (y - game.camera.y - 180) * z.s + 180;
        q.samples.push({ at: performance.now(), state: game.state, map: game.mapId, xy: [game.player?.x, game.player?.y],
          phase: c?.phase, monster: c ? [c.x, c.y] : null, monsterInWall: c ? game.map.tileAt(Math.floor(c.x / 32), Math.floor(c.y / 32)).solid : null,
          camera: [game.camera.x, game.camera.y], separation: c ? Math.hypot(c.x - game.player.x - game.player.w / 2, c.y - game.player.y - game.player.h / 2) : null,
          onScreen: c ? Math.abs(c.x - game.camera.x - 240) < 240 / game.zoom.s + 96 && Math.abs(c.y - game.camera.y - 180) < 180 / game.zoom.s + 96 : false,
          hp: ['hyungsub', ...game.party].map(id => [id, game.hpOf(id)]), chaseSnapshot: c?.snapshot, moving: !!game.player.moving,
          dialogue: game.dialogue.running, text: game.textbox.node?.text, fade: game.fade.alpha,
          pulses: game.castleDarkPath?.pulses.length ?? 0, zoom: game.zoom.s,
          bgm: game.sound.bgmName, clock: game.sound.bgm?.currentTime, paused: game.sound.bgm?.paused,
          facing: [game.player, ...game.entities.filter(e => e.def?.type === 'follower')].map(e => e?.facing),
          actors: [game.player, ...game.entities.filter(e => e.def?.type === 'follower')].map(e => ({ id: e.id, x: e.x, y: e.y, moving: !!e.moving,
            top: project(e.y + e.h - Math.round((e.sprite?.fh || 0) / (e.sprite?.px || 1) * CHAR_SCALE * (e.def.visualScale || 1))), bottom: project(e.y + e.h) })),
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
        const wx = (x - 240) / game.zoom.s + 240 + cam.x, wy = (y - 180) / game.zoom.s + 180 + cam.y;
        if (bounds.some(([a, b, w, h]) => wx >= a - 2 && wx <= a + w + 2 && wy >= b - 2 && wy <= b + h + 2)) continue;
        const i = (Math.floor((y + 0.5) * scale) * game.canvas.width + Math.floor((x + 0.5) * scale)) * 4;
        tested++; if (data[i] || data[i + 1] || data[i + 2]) lit++;
      }
      return { tested, lit };
    });
    check(`${label} pulses never reveal outside real floor`, observed.tested > 1000 && observed.lit === 0, JSON.stringify(observed));
  };
  const refugeLines = ['* 와 겨우 나왔네요 ㅈ될뻔', '* 후.. 저 앞에 문이 있네', '* 얼른 가보죠'];
  const readRefugeLines = async (capture = false) => {
    for (let index = 0; index < refugeLines.length; index++) {
      assert.ok(await until(() => game.textbox.isOpen && game.textbox.state === 'waiting', 10000), `refuge line ${index + 1} appears`);
      const node = await page.evaluate(() => ({ text: game.textbox.node.text, speaker: game.textbox.node.speaker, portrait: game.textbox.node.portrait }));
      const portrait = index === 1 ? 'gyeongsub' : 'ppaman', speaker = index === 1 ? '경섭' : '억빠맨';
      check(`refuge line ${index + 1} exact speaker text and portrait`, node.text === refugeLines[index] && node.speaker === speaker && node.portrait === portrait, JSON.stringify(node));
      check(`refuge line ${index + 1} already safe but not prematurely completed`, (await state()).done && !(await state()).refugeDialogueDone && !(await state()).chase && !(await state()).dark && (await state()).bgm !== 'baron_intro');
      if (capture) {
        await shot(`refuge-line-${index + 1}-1280`);
        const framing = await page.evaluate(async () => {
          const { CHAR_SCALE } = await import('./src/world/world.js');
          const z = game.zoom, focus = z.fy - game.camera.y;
          const amount = z.smax > 1 ? Math.min(1, (z.s - 1) / (z.smax - 1)) : 1;
          const center = focus + (180 - focus) * amount;
          const project = y => z.s > 1.0001 ? center + (y - game.camera.y - focus) * z.s : (y - game.camera.y - 180) * z.s + 180;
          return [game.player, ...game.entities.filter(e => e.def?.type === 'follower')].map(e => ({ id: e.id,
            top: project(e.y + e.h - Math.round(e.sprite.fh / e.sprite.px * CHAR_SCALE * (e.def.visualScale || 1))),
            bottom: project(e.y + e.h), fallback: !!e.sprite.fallback }));
        });
        check(`refuge line ${index + 1} shows all three decoded party sprites above textbox`, framing.length === 3 && framing.every(e => e.top >= -1 && e.bottom <= 230 && !e.fallback), JSON.stringify(framing));
        if (index === 0) {
          check('first line stays at refuge entrance before walking', await page.evaluate(() => Math.abs(game.player.x - 372) < 1 && Math.abs(game.player.y - 560) < 1 && game.zoom.s > 1 && game.zoom.s <= 1.1));
          for (const w of [375, 768]) {
            await page.setViewportSize({ width: w, height: 900 }); await shot(`refuge-line-1-${w}`);
            check(`refuge dialogue canvas fits ${w}px`, await page.evaluate(() => { const r = game.canvas.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1; }));
          }
          await page.setViewportSize({ width: 1280, height: 900 });
        }
      }
      const moveStartedAt = capture && index === 0 ? await page.evaluate(() => performance.now()) : null;
      await key('KeyC');
      if (capture && index === 0) {
        check('first C closes textbox and moves party north visibly', await until(() => !game.textbox.isOpen && game.player.y < 550 && game.player.y > 416, 2000));
        await shot('refuge-walk-north-mid');
        assert.ok(await until(() => game.player.y <= 417 && game.entities.some(e => e.id === 'gyeongsub' && e.x < 352 && e.x > 306), 8000), 'north walk reaches visible fanout');
        await shot('refuge-fanout-mid');
        check('party spreads only after leader has passed north of spring', await page.evaluate(() => !game.textbox.isOpen && game.player.y < 480));
        assert.ok(await until(() => game.textbox.state === 'waiting' && game.textbox.node?.speaker === '경섭', 8000));
        const motion = await page.evaluate(at => window.__chaseQA.samples.filter(s => s.at >= at && s.map === 'gajaeman_castle_dark_refuge'), moveStartedAt);
        check('north walk and fanout keep every party sprite in canvas', motion.length > 10 && motion.every(s => s.actors.length === 3 && s.actors.every(e => e.top >= -1 && e.bottom <= 361)), JSON.stringify({ samples: motion.length, clipped: motion.filter(s => s.actors.some(e => e.top < -1 || e.bottom > 361)).map(s => ({ at: s.at, actors: s.actors })) }));
      }
      if (capture && index === 1) check('door line occurs only after whole party stands north of spring', await page.evaluate(() => [game.player, ...game.entities.filter(e => e.def?.type === 'follower')].every(e => Math.abs(e.y - 416) < 1)));
    }
    assert.ok(await ready());
    check('third C completes and saves refuge dialogue once', (await state()).refugeDialogueDone && await page.evaluate(() => JSON.parse(localStorage.getItem(game.constructor.SAVE_KEY)).flags.castle_dark_refuge_dialogue_done));
  };
  for (const file of ['index.html', 'src/data/build.js', 'src/main.js', 'src/core/story.js', 'src/core/input.js', 'src/data/scripts.js', 'src/scenes/castle-dark-chase.js', 'src/data/cutscenes/castle_dark_chase.js', 'src/scenes/castle-dark-path.js', 'assets/maps/gajaeman_castle_dark_arrival.json', 'assets/maps/gajaeman_castle_dark_refuge.json']) {
    const local = fs.readFileSync(path.join(process.env.QA_SOURCE_ROOT, file));
    const remote = Buffer.from(await (await page.request.get(new URL(file, process.env.QA_BASE_URL).href)).body());
    check(`served source ${file}`, local.equals(remote), crypto.createHash('sha256').update(local).digest('hex'));
  }
  await open({ qa: mode === 'old-save' || mode.startsWith('refuge-') ? 'castle_dark_chase' : 'castle_dark_chase_intro' });
  assert.ok(await until(() => window.game?.mapId === 'gajaeman_castle_dark_arrival' && !!game.castleDarkChase, 30000));
  await observe();
  if (mode === 'refuge-return' || mode === 'refuge-interrupt') {
    assert.ok(await ready());
    await fixture('unfinished-save-near-final-exit', 'Prepare an unfinished chase save at (5060,180,up), skipping the unchanged fifty-second maze. Preserve party, HP and inventory. Real Escape/Continue and all following movement/dialogue inputs test runtime transitions; no runtime positions, clocks or completion flags are injected.', () => {
      const key = game.constructor.SAVE_KEY, saved = JSON.parse(localStorage.getItem(key));
      Object.assign(saved, { x: 5060, y: 180, facing: 'up' });
      localStorage.setItem(key, JSON.stringify(saved));
    });
    await key('Escape'); await continueTitle(); assert.ok(await ready());
    const initial = await state();
    check('unfinished Continue still resumes chase with a safe lead', initial.chase?.phase === 'chase' && !initial.done && initial.bgm === 'baron_intro' && Math.hypot(initial.chase.x - initial.xy[0] - 12, initial.chase.y - initial.xy[1] - 12) > 180, JSON.stringify(initial));
    await walk('ArrowUp', () => game.mapId === 'gajaeman_castle_dark_refuge', 'actual unfinished chase exit into refuge');
    assert.ok(await until(() => game.textbox.state === 'waiting' && game.textbox.node?.text === '* 와 겨우 나왔네요 ㅈ될뻔', 10000));
    const first = await state();
    check('natural exit preserves party HP inventory and immediately ends pursuit', first.done && !first.refugeDialogueDone && !first.chase && !first.dark && JSON.stringify(first.hp) === JSON.stringify(initial.hp) && JSON.stringify(first.party) === JSON.stringify(initial.party) && JSON.stringify(first.inventory) === JSON.stringify(initial.inventory));
    if (mode === 'refuge-interrupt') {
      await shot('refuge-first-line-before-interrupt'); await key('Escape');
      assert.ok(await until(() => game.state === 'title', 10000));
      check('first-line interruption retains safety completion but not dialogue completion in save', await page.evaluate(() => { const saved = JSON.parse(localStorage.getItem(game.constructor.SAVE_KEY)); return saved.map === 'gajaeman_castle_dark_refuge' && saved.flags.castle_dark_chase_done && !saved.flags.castle_dark_refuge_dialogue_done; }));
      await continueTitle();
      await readRefugeLines(true);
      await shot('refuge-interrupted-continued-complete');
    } else {
      await readRefugeLines(true);
    }
    const completed = await state();
    await walk('ArrowDown', () => game.textbox.isOpen, 'downward attempt reaches locked south exit');
    assert.ok(await until(() => game.textbox.state === 'waiting', 5000)); await shot('refuge-south-exit-locked');
    check('south exit says exact locked narration and keeps refuge safe', await page.evaluate(() => game.mapId === 'gajaeman_castle_dark_refuge' && game.textbox.node.text === '* 잠긴 것 같다.' && !game.textbox.node.speaker && !game.castleDarkChase && game.sound.bgmName !== 'baron_intro'));
    await key('KeyC'); assert.ok(await ready());
    const lockedCount = await page.evaluate(() => window.__chaseQA.texts.length);
    await page.keyboard.down('ArrowDown'); await page.waitForTimeout(1500); await page.keyboard.up('ArrowDown');
    check('holding at locked exit neither repeats nor transitions or damages party', await page.evaluate(n => window.__chaseQA.texts.length === n && game.mapId === 'gajaeman_castle_dark_refuge' && !game.dialogue.running, lockedCount) && JSON.stringify((await state()).hp) === JSON.stringify(completed.hp));
    const count = await page.evaluate(() => window.__chaseQA.texts.length);
    await walk('ArrowUp', () => game.player.y <= 324, 'walk to north cathedral gate');
    await key('KeyC'); assert.ok(await until(() => game.mapId === 'gajaeman_castle_cathedral', 10000)); assert.ok(await ready());
    await shot('cathedral-forward-entry');
    check('north C still enters cathedral with party HP inventory intact', JSON.stringify((await state()).hp) === JSON.stringify(completed.hp) && JSON.stringify((await state()).inventory) === JSON.stringify(completed.inventory) && !(await state()).chase);
    await walk('ArrowDown', () => game.mapId === 'gajaeman_castle_dark_refuge', 'return from cathedral to completed refuge'); assert.ok(await ready());
    await shot('refuge-return-no-repeat');
    check('completed refuge reentry never repeats dialogue', await page.evaluate(n => window.__chaseQA.texts.length === n, count));
    await key('Escape'); await continueTitle(); assert.ok(await ready()); await shot('refuge-continue-no-repeat');
    const continued = await state();
    check('completed refuge Continue keeps dialogue done HP inventory party and safe state', continued.refugeDialogueDone && continued.done && !continued.chase && !continued.dark && !continued.dialogue && continued.bgm === 'castle_dark_path' && JSON.stringify(continued.hp) === JSON.stringify(initial.hp) && JSON.stringify(continued.inventory) === JSON.stringify(initial.inventory) && JSON.stringify(continued.party) === JSON.stringify(initial.party) && await page.evaluate(n => window.__chaseQA.texts.length === n, count));
    if (mode === 'refuge-return') {
      await fixture('legacy-cleared-save-on-old-map', 'Prepare a legacy cleared save on the chase map at (5060,180,up) with seen/done true and no new dialogue flag. Runtime remains untouched until real Escape/Continue; this tests old save compatibility separately from natural completed traversal.', () => {
        const key = game.constructor.SAVE_KEY, saved = JSON.parse(localStorage.getItem(key));
        Object.assign(saved, { map: 'gajaeman_castle_dark_arrival', x: 5060, y: 180, facing: 'up' });
        saved.flags.castle_dark_chase_seen = true; saved.flags.castle_dark_chase_done = true;
        delete saved.flags.castle_dark_refuge_dialogue_done;
        localStorage.setItem(key, JSON.stringify(saved));
      });
      await key('Escape'); await continueTitle(); assert.ok(await ready());
      const safeAt = await page.evaluate(() => performance.now());
      await page.waitForTimeout(10000); await shot('legacy-cleared-continue-safe-ten-seconds');
      const legacy = await state();
      const safeSamples = await page.evaluate(at => window.__chaseQA.samples.filter(s => s.at >= at && s.map === 'gajaeman_castle_dark_arrival'), safeAt);
      const safeSounds = await page.evaluate(at => window.__chaseQA.sounds.filter(s => s.at >= at), safeAt);
      check('legacy cleared old-map Continue stays safe for ten real seconds', legacy.map === 'gajaeman_castle_dark_arrival' && legacy.done && !legacy.chase && !legacy.dialogue && legacy.bgm === 'castle_dark_path' && JSON.stringify(legacy.hp) === JSON.stringify(initial.hp) && JSON.stringify(legacy.inventory) === JSON.stringify(initial.inventory) && safeSamples.length > 100 && safeSamples.every(s => !s.monster && s.bgm !== 'baron_intro') && safeSounds.every(s => s.name !== 'baron_roar' && s.name !== 'damage'), JSON.stringify({ state: legacy, samples: safeSamples.length, sounds: safeSounds }));
      await walk('ArrowUp', () => game.mapId === 'gajaeman_castle_dark_refuge', 'legacy cleared save enters refuge');
      await readRefugeLines();
      check('legacy cleared save can complete new refuge conversation without pursuit', (await state()).refugeDialogueDone && !(await state()).chase);
    }
    await dump(); return;
  }
  if (mode === 'old-save') {
    assert.ok(await ready());
    await fixture('legacy319-save-position', 'Prepare only the saved x/y/facing fields in the retained old north-end stub (3268,72,up). Real Escape/Continue must restore it and real arrows must reach the extended exit; no runtime position/progress mutation.', () => {
      const key = game.constructor.SAVE_KEY, saved = JSON.parse(localStorage.getItem(key));
      Object.assign(saved, { x: 3268, y: 72, facing: 'up' }); localStorage.setItem(key, JSON.stringify(saved));
    });
    await key('Escape'); await continueTitle(); assert.ok(await ready()); await shot('legacy-save-restored');
    const restored = await state();
    check('old319 saved north corridor restores on walkable floor', Math.hypot(restored.xy[0] - 3268, restored.xy[1] - 72) < 1 && !restored.blocked && restored.seen);
    await walk('ArrowDown', () => game.player.y >= 104, 'leave retained old stub toward new turn');
    await walk('ArrowRight', () => game.player.x >= 4164, 'new upper east leg');
    await walk('ArrowDown', () => game.player.y >= 1448, 'new south leg');
    await walk('ArrowRight', () => game.player.x >= 5060, 'new lower east leg');
    await walk('ArrowUp', () => game.mapId === 'gajaeman_castle_dark_refuge', 'legacy save reaches new exit'); await readRefugeLines();
    await shot('legacy-save-refuge');
    check('legacy save naturally reaches refuge with party and scene cleanup', (await state()).done && !(await state()).chase && !(await state()).dark && (await state()).party.length === 2);
    await dump(); return;
  }
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
    await shot('chase-continued'); await page.waitForTimeout(600); await shot('chase-continued-settled');
    const actors = await page.evaluate(async () => {
      const { CHAR_SCALE } = await import('./src/world/world.js');
      return game.entities.filter(e => e === game.player || e.def?.type === 'follower').map(e => ({
        id: e.id, top: e.y + e.h - Math.round(e.sprite.fh / e.sprite.px * CHAR_SCALE * (e.def.visualScale || 1)) - game.camera.y,
        bottom: e.y + e.h - game.camera.y,
      }));
    });
    check('Continue framing keeps all three full-height party sprites visible', actors.length === 3 && actors.every(e => e.top >= -1 && e.bottom <= 361), JSON.stringify(actors));
    await dump(); return;
  }

  if (mode === 'contacts') {
    await finishDialogues(() => !game.dialogue.running && game.castleDarkChase?.phase === 'chase'); assert.ok(await ready());
    await walk('ArrowUp', () => game.player.y <= 104, 'north before contact test');
    await walk('ArrowRight', () => game.player.x >= 548, 'leave entrance before contact test');
    await key('KeyV'); assert.ok(await until(() => game.state === 'menu', 3000));
    const paused = await state(); await page.waitForTimeout(1000);
    check('V menu pauses pursuer and player without damage', JSON.stringify((await state()).chase) === JSON.stringify(paused.chase) && JSON.stringify((await state()).xy) === JSON.stringify(paused.xy) && JSON.stringify((await state()).hp) === JSON.stringify(paused.hp));
    await key('KeyX'); assert.ok(await ready()); await shot('contact-approach');
    for (let hit = 1; hit <= 2; hit++) {
      const before = await state(), hp = before.hp[0][1];
      assert.ok(await page.waitForFunction(value => game.hpOf('hyungsub') < value, hp, { timeout: 12000, polling: 16 }));
      const after = await state(); await shot(`contact-${hit}`);
      check(`contact ${hit} subtracts exactly 15 only from leader`, hp - after.hp[0][1] === 15 && JSON.stringify(after.hp.slice(1)) === JSON.stringify(before.hp.slice(1)));
      check(`contact ${hit} never resets entrance or shifts player`, Math.hypot(after.xy[0] - before.xy[0], after.xy[1] - before.xy[1]) < 1 && after.xy[0] >= 548 && !after.blocked);
      const distance = await page.evaluate(() => Math.hypot(game.castleDarkChase.x - game.player.x - game.player.w / 2, game.castleDarkChase.y - game.player.y - game.player.h / 2));
      await page.waitForTimeout(300);
      const later = await state(), recoiled = await page.evaluate(() => Math.hypot(game.castleDarkChase.x - game.player.x - game.player.w / 2, game.castleDarkChase.y - game.player.y - game.player.h / 2));
      check(`contact ${hit} recoils the sphere and avoids stacked damage`, recoiled > distance + 5 && later.hp[0][1] === after.hp[0][1] && !later.blocked, JSON.stringify({ distance, recoiled, hp: later.hp[0][1] }));
      if (hit === 1) {
        await shot('contact-recoil-mid');
        assert.ok(await until(() => game.castleDarkChase?.phase === 'chase', 2000)); await shot('contact-recoil-settled');
      }
    }
    const q = await dump();
    const drops = q.samples.slice(1).filter((s, i) => s.hp[0][1] < q.samples[i].hp[0][1]);
    check('observed damage increments never stack within a contact', drops.length >= 2 && drops.every(s => q.samples[q.samples.indexOf(s) - 1].hp[0][1] - s.hp[0][1] === 15));
    return;
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
  await fixture('initial-wounded-party', 'Set three current HP values below max once at chase start to verify real fountain healing after natural traversal. No positions, flags, item inventory or progress injected.', () => {
    for (const id of ['hyungsub', ...game.party]) game.partyHp[id] = game.maxHpOf(id) - 37;
  });
  const wounded = await state();
  const startTime = Date.now(), routeClock = await page.evaluate(() => performance.now());
  await walk('ArrowUp', () => game.player.y <= 104, 'first north turn');
  await walk('ArrowRight', () => game.player.x >= 1188, 'east across first leg'); await shot('chase-first-corner'); await mask('first corner');
  await walk('ArrowDown', () => game.player.y >= 1480, 'long south leg');
  await walk('ArrowRight', () => game.player.x >= 2276, 'east across lower leg');
  await walk('ArrowUp', () => game.player.y <= 680, 'middle north leg'); await shot('chase-middle-pulses'); await mask('middle corner');
  await walk('ArrowRight', () => game.player.x >= 3268, 'east across upper leg');
  await walk('ArrowUp', () => game.player.y <= 104, 'preserved north corridor to new turn');
  await walk('ArrowRight', () => game.player.x >= 4164, 'extended upper east leg'); await shot('chase-upper-extension');
  await walk('ArrowDown', () => game.player.y >= 1448, 'extended south leg'); await shot('chase-extension');
  await walk('ArrowRight', () => game.player.x >= 5060, 'last east leg');
  await walk('ArrowUp', () => game.mapId === 'gajaeman_castle_dark_refuge', 'north refuge exit');
  const duration = Date.now() - startTime;
  await readRefugeLines();
  const arrived = await state(); await shot('refuge-arrival');
  check('natural extended traversal reaches refuge in about fifty seconds', arrived.done && !arrived.chase && !arrived.dark && !arrived.blocked && duration >= 45000 && duration <= 58000 && arrived.hp[0][1] > 0 && JSON.stringify(arrived.hp.slice(1)) === JSON.stringify(wounded.hp.slice(1)) && JSON.stringify(arrived.inventory) === JSON.stringify(wounded.inventory), `wall time ${duration}ms; HP ${JSON.stringify(arrived.hp)}`);
  const q = await dump();
  const travel = q.samples.filter(s => s.at >= routeClock && s.map === 'gajaeman_castle_dark_arrival' && s.state === 'field' && !s.dialogue);
  const visibility = { samples: travel.length, visible: travel.filter(s => s.onScreen).length, fraction: travel.filter(s => s.onScreen).length / travel.length, separationMax: Math.max(...travel.map(s => s.separation)) };
  fs.writeFileSync(path.join(process.env.SHOT_DIR, 'visibility.json'), JSON.stringify(visibility, null, 2));
  check('pursuer remains visibly threatening throughout moving route', visibility.samples > 400 && visibility.fraction >= 0.75, JSON.stringify(visibility));
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
  check('continuous pursuit has no entrance-reset discontinuity', speeds.length > 100 && speedEvidence.maximum < 360, JSON.stringify(speedEvidence));
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
  const beforeDoor = await state(); await page.keyboard.down('ArrowUp'); await page.waitForTimeout(450); await page.keyboard.up('ArrowUp'); await shot('final-closed-door');
  check('last gate waits for C after walking against it', (await state()).map === 'gajaeman_castle_dark_refuge' && (await state()).xy[1] >= 319 && !(await state()).dialogue && !(await state()).blocked, JSON.stringify({ before: beforeDoor.xy, after: (await state()).xy }));
  await key('Escape'); await continueTitle(); assert.ok(await ready());
  check('refuge Continue retains done flag party health and clean scene', (await state()).done && !(await state()).chase && !(await state()).dark && (await state()).party.length === 2 && (await state()).hp.every(([, hp, max]) => hp === max));
  await dump();
  check('audio evidence is playback observation, not subjective listening', true);
});
