import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { runScenario } from './lib/harness.mjs';
import { escToTitle } from './lib/esc.mjs';

await runScenario({ name: 'castle-gate', launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] } }, async ({ page, open, until, press, shot, fixture, check }) => {
  const mode = process.env.QA_GATE_MODE || 'main';
  const observations = [];
  const key = async code => { await press(code, { delay: 45 }); await page.waitForTimeout(90); };
  const ready = () => until(() => game.state === 'field' && !game.dialogue.running && !game.transitioning && game.fade.alpha < 0.01, 30000);
  const walk = async (code, predicate, label, timeout = 25000) => {
    await page.keyboard.down(code);
    try { assert.ok(await until(predicate, timeout), label); }
    finally { await page.keyboard.up(code); }
    await page.waitForTimeout(100);
  };
  const state = () => page.evaluate(() => ({ map: game.mapId, party: [...game.party], xy: [game.player.x, game.player.y],
    stage: game.story.stage, open: !!game.flags.castle_gate_open, reunion: !!game.flags.castle_gate_reunion_done,
    seals: [!!game.flags.castle_left_seal_active, !!game.flags.castle_right_seal_active],
    dark: !!game.castleDarkPath, pulses: game.castleDarkPath?.pulses.length ?? 0,
    blocked: game.map.solidRect(game.player.x, game.player.y, game.player.w, game.player.h),
    bgm: game.sound.bgmName, clock: game.sound.bgm?.currentTime, paused: game.sound.bgm?.paused,
    actors: game.entities.filter(e => e.id?.startsWith('gate_')).map(e => ({ id: e.id, dead: !!e.dead, visible: e.visible })) }));
  const sizes = async label => {
    for (const width of [375, 768]) {
      await page.setViewportSize({ width, height: 900 }); await page.waitForTimeout(100); await shot(`${label}-${width}`);
      check(`${label} canvas fits ${width}`, await page.evaluate(() => { const r = game.canvas.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1; }));
    }
    await page.setViewportSize({ width: 1280, height: 900 });
  };
  const observe = async () => fixture('production-call-observer', 'Read-only wrappers record actual sound calls, actor draw alpha, completed draw states and dialogue. No positions, flags, timings or inputs are injected.', () => {
    const q = window.__gateQA = { sounds: [], walks: [], alpha: [], samples: [], transits: [], transitEvents: [], texts: [], radii: [] };
    const observedPassengers = new WeakSet();
    const sfx = game.sound.sfx.bind(game.sound), walk = game.sound.walk.bind(game.sound), draw = game.draw.bind(game);
    game.sound.sfx = (name, options) => { q.sounds.push({ name, options, at: performance.now() }); return sfx(name, options); };
    game.sound.walk = def => { if (q.walks.length < 8000) q.walks.push({ loop: def?.loop || null, map: game.mapId, moving: game.player.moving, at: performance.now() }); return walk(def); };
    const context = game.canvas.getContext('2d'), gradient = context.createRadialGradient.bind(context);
    context.createRadialGradient = (...args) => { if (game.castleDarkPath && q.radii.length < 20000) q.radii.push(args[5]); return gradient(...args); };
    let watchedPlayer;
    game.draw = (...args) => {
      if (game.player && watchedPlayer !== game.player) {
        watchedPlayer = game.player;
        const playerDraw = watchedPlayer.draw.bind(watchedPlayer);
        watchedPlayer.draw = (ctx, cam) => { if (q.alpha.length < 20000) q.alpha.push({ map: game.mapId, alpha: ctx.globalAlpha }); return playerDraw(ctx, cam); };
      }
      const result = draw(...args), scene = game.castleGate;
      for (const passenger of scene?.passengers || []) {
        if (!q.transits.includes(passenger.actor.id)) q.transits.push(passenger.actor.id);
        if (!observedPassengers.has(passenger)) { observedPassengers.add(passenger); q.transitEvents.push({ id: passenger.actor.id, at: performance.now() }); }
      }
      if (!q.samples.length || performance.now() - q.samples.at(-1).at > 100) q.samples.push({ at: performance.now(),
        map: game.mapId, fade: game.fade.alpha, progress: scene?.progress, open: !!game.flags.castle_gate_open,
        junhee: game.entities.find(e => e.id === 'gate_junhee')?.y, passengers: scene?.passengers.length || 0,
        camera: [game.camera.x, game.camera.y], zoom: game.zoom.s,
        actors: game.mapId === 'gajaeman_castle_lobby' ? ['player', 'gyeongsub', 'ppaman', 'gate_youngcle', 'gate_junhee', 'gate_bidet', 'gate_mario', 'gate_ttuulla', 'gate_park'].map(id => {
          const e = id === 'player' ? game.player : game.entities.find(e => e.id === id && !e.dead);
          if (!e) return { id, absent: true };
          const fx = e.x + e.w / 2, fy = e.y + e.h - 1;
          return { id, x: e.x, y: e.y, feet: [fx, fy], visible: e.visible, moving: e.moving,
            solid: game.map.solidRect(e.x, e.y, e.w, e.h), footSolid: !!game.map.tileAt(Math.floor(fx / 32), Math.floor(fy / 32)).solid };
        }) : [],
        bgm: game.sound.bgmName, pulses: game.castleDarkPath?.pulses.length || 0 });
      return result;
    };
  });
  const dialogue = async (stop, captures = true) => {
    const seen = new Set(); let opening = false, transit = false;
    const deadline = Date.now() + 120000;
    while (Date.now() < deadline) {
      if (await page.evaluate(stop)) return;
      const s = await page.evaluate(() => ({ waiting: game.textbox.isOpen && game.textbox.state === 'waiting',
        text: game.textbox.node?.text, speaker: game.textbox.node?.speaker, portrait: game.textbox.node?.portrait,
        mosaic: game.textbox.node?.mosaic, map: game.mapId, opening: game.castleGate?.opening?.elapsed,
        transit: game.castleGate?.passengers.length || 0 }));
      if (captures && !opening && s.opening > 0.5 && s.opening < 1.3) { opening = true; await shot('gate-opening-mid'); }
      if (captures && !transit && s.transit) { transit = true; await shot('allies-transit-mid'); }
      if (s.waiting) {
        const id = `${s.map}:${s.text}`;
        if (!seen.has(id)) {
          seen.add(id); await page.evaluate(line => window.__gateQA.texts.push(line), s);
          if (captures && s.text === '* 다 됐노?') await shot('boulder-return-dialogue');
          if (captures && s.text === '* 흠..') await shot('reunion-assembly');
          if (captures && s.text === '* 열어볼게.') await shot('gate-before-open');
          if (captures && s.text === '* 오 시발.') { await shot('gate-open-retreat'); await sizes('gate-open'); }
          if (captures && s.mosaic) await shot('union-mosaic');
          if (captures && s.text === '* 쓰으으으으으으읍 미스') await shot('party-after-allies');
          if (captures && s.text === '* 아무것도 안보여요') await shot('black-intro');
        }
        await key('KeyC');
      } else await page.waitForTimeout(50);
    }
    throw new Error('Dialogue traversal exceeded 120 seconds');
  };
  const continueTitle = async () => {
    assert.ok(await until(() => game.state === 'title' && game.title.phase === 'wait', 10000));
    await key('Space'); assert.ok(await until(() => game.title.phase === 'zoom', 5000));
    await key('KeyC'); assert.ok(await until(() => game.title.phase === 'locked' && game.title.time > 3.05, 5000));
    await key('KeyC'); assert.ok(await until(() => game.state === 'field', 20000));
  };
  const start = async () => {
    await open({ qa: 'castle_left_orb_after' }); assert.ok(await ready());
    await page.setViewportSize({ width: 1280, height: 900 }); await observe();
    const s = await state(); check('initial checkpoint is solo with both seals, before gate completion', s.party.length === 0 && s.seals.every(Boolean) && !s.open && !s.reunion, JSON.stringify(s));
    await walk('ArrowDown', () => game.mapId === 'gajaeman_castle_boulder', 'natural south exit to boulder');
  };
  const mask = async label => {
    const evidence = await page.evaluate(async () => {
      const { CHAR_SCALE } = await import('./src/world/world.js');
      const ctx = game.canvas.getContext('2d'), scale = game.canvas.width / 480;
      const data = ctx.getImageData(0, 0, game.canvas.width, game.canvas.height).data;
      const cam = { x: Math.round(game.camera.x), y: Math.round(game.camera.y) }, rects = game.castleDarkPath.rectangles;
      const actors = game.entities.filter(e => e === game.player || e.def?.type === 'follower').map(e => {
        const width = Math.round(e.sprite.fw / e.sprite.px * CHAR_SCALE * (e.def.visualScale || 1));
        const height = Math.round(e.sprite.fh / e.sprite.px * CHAR_SCALE * (e.def.visualScale || 1));
        return [Math.round(e.x + e.w / 2 - width / 2), Math.round(e.y + e.h - height), width, height];
      });
      let tested = 0, lit = 0;
      for (let y = 55; y < 280; y++) for (let x = 8; x < 472; x++) {
        const wx = x + cam.x, wy = y + cam.y;
        // Tall character art may legitimately project above the walkable floor at a bend.
        if (actors.some(([rx, ry, w, h]) => wx >= rx - 2 && wx < rx + w + 2 && wy >= ry - 2 && wy < ry + h + 2)) continue;
        if (rects.some(([rx, ry, w, h]) => wx >= rx - 2 && wx < rx + w + 2 && wy >= ry - 2 && wy < ry + h + 2)) continue;
        const i = (Math.floor((y + 0.5) * scale) * game.canvas.width + Math.floor((x + 0.5) * scale)) * 4;
        tested++; if (data[i] || data[i + 1] || data[i + 2]) lit++;
      }
      return { tested, lit, pulses: game.castleDarkPath.pulses.length, camera: [cam.x, cam.y] };
    });
    check(`${label} path exterior is exact RGB black`, evidence.tested > 1000 && evidence.lit === 0, JSON.stringify(evidence));
  };

  if (mode === 'entry-cancel') {
    for (const phase of ['fade', 'walk']) {
      await start();
      await dialogue(phase === 'fade'
        ? () => game.mapId === 'gajaeman_castle_lobby' && game.fade.alpha < 0.8 && game.fade.alpha > 0.1
        : () => game.mapId === 'gajaeman_castle_lobby' && game.fade.alpha < 0.01 && game.player.moving, false);
      await shot(`entry-cancel-${phase}`); await escToTitle(page);
      assert.ok(await until(() => game.state === 'title' && !game.castleGate, 6000));
      check(`${phase} interruption disposes entry without completion`, await page.evaluate(() => !game.dialogue.running && !game.flags.castle_gate_open
        && !game.flags.castle_gate_reunion_done && game.entities.every(e => !e.doorTransit)));
      await continueTitle();
      if (await page.evaluate(() => game.mapId === 'gajaeman_castle_left_orb')) {
        assert.ok(await ready()); await walk('ArrowDown', () => game.mapId === 'gajaeman_castle_boulder', 'entry cancel retry naturally exits orb');
      }
      await dialogue(() => !game.dialogue.running && !!game.flags.castle_gate_reunion_done, false); assert.ok(await ready());
      await shot(`entry-cancel-${phase}-recovered`);
      check(`${phase} Continue retries to safe completed party`, (await state()).open && (await state()).reunion && (await state()).party.length === 2 && !(await state()).blocked);
    }
    fs.writeFileSync(path.join(process.env.SHOT_DIR, 'entry-observations.json'), JSON.stringify(await page.evaluate(() => window.__gateQA), null, 2));
    return;
  }
  if (mode === 'dark319') {
    await open({ qa: 'castle_dark_path' }); assert.ok(await until(() => window.game?.state === 'field', 30000));
    await page.setViewportSize({ width: 1280, height: 900 }); await observe();
    await dialogue(() => !game.dialogue.running && !!game.flags.castle_dark_path_seen, false); assert.ok(await ready());
    const constants = await page.evaluate(async () => (await import('./src/scenes/castle-dark-path.js')).CASTLE_DARK_PATH);
    await shot('dark319-idle-before');
    const before = (await state()).xy; let tapMax = 0, captured = false;
    for (let i = 0; i < 120 && before[1] - (await state()).xy[1] < 75; i++) {
      await press('ArrowUp', { delay: 12 }); await page.waitForTimeout(30);
      const s = await state(); tapMax = Math.max(tapMax, s.pulses);
      if (s.pulses && !captured) { await shot('dark319-short-tap'); captured = true; }
    }
    check('sparse rings preserve real short-tap guidance', tapMax > 0 && tapMax <= 2);
    await page.keyboard.down('ArrowUp'); await page.waitForTimeout(1800); await page.keyboard.up('ArrowUp');
    await shot('dark319-held-broad'); await mask('319 held broad');
    await page.waitForTimeout(1550); await shot('dark319-idle-clear');
    check('sparse rings fully disappear at idle', (await state()).pulses === 0);
    await walk('ArrowUp', () => game.player.y <= 1898, '319 broad rings reveal first corner');
    await shot('dark319-corner'); await mask('319 corner');
    await walk('ArrowRight', () => game.player.x >= 540, '319 actual corner navigation'); await shot('dark319-after-turn'); await mask('319 after turn');
    const q = await page.evaluate(() => window.__gateQA), maximum = Math.max(...q.samples.map(s => s.pulses));
    check('at most two rings are live during actual held movement and taps', maximum > 0 && maximum <= 2, `observed maximum ${maximum}`);
    check('actual rendered radius is substantially broader than former 110px', Math.max(...q.radii) >= 155 && constants.radius >= 170,
      JSON.stringify({ constants, maximumRenderedRadius: Math.max(...q.radii) }));
    check('corner stays traversable with party and no collision penetration', (await state()).party.length === 2 && !(await state()).blocked);
    await escToTitle(page); check('sparse ring scene disposes at title', await page.evaluate(() => !game.castleDarkPath));
    fs.writeFileSync(path.join(process.env.SHOT_DIR, 'dark319-observations.json'), JSON.stringify({ constants, ...q }, null, 2));
    return;
  }
  if (mode === 'entry-baseline' || mode === 'entry-final') {
    await start();
    await dialogue(() => game.mapId === 'gajaeman_castle_lobby', false);
    await shot('entry-black');
    assert.ok(await until(() => game.mapId === 'gajaeman_castle_lobby' && game.fade.alpha < 0.85 && game.fade.alpha > 0.2, 8000));
    await shot('entry-fade-mid');
    assert.ok(await until(() => game.fade.alpha < 0.01, 8000)); await shot('entry-arrival');
    assert.ok(await until(() => game.castleGate && game.player.moving, 8000));
    await page.waitForTimeout(550); await shot('entry-walk-mid');
    assert.ok(await until(() => game.textbox.state === 'waiting' && game.textbox.node?.text === '* 흠..', 15000));
    await shot('entry-assembly'); await sizes('entry-assembly');
    const q = await page.evaluate(() => window.__gateQA);
    const lobby = q.samples.filter(s => s.map === 'gajaeman_castle_lobby');
    const assembly = lobby.at(-1);
    check('bounded entry records all nine actor feet and collision state', assembly.actors.length === 9, JSON.stringify(assembly));
    if (mode === 'entry-final') {
      check('all nine are present before the lobby becomes visible', lobby.filter(s => s.fade < 0.99).every(s => s.actors.length === 9 && s.actors.every(a => !a.absent && a.visible)));
      check('all visible arrival walk and assembly feet remain on collision-safe floor', lobby.filter(s => s.fade < 0.99).every(s => s.actors.every(a => !a.solid && !a.footSolid)));
      check('all nine visibly walk together', lobby.some(s => s.fade < 0.01 && s.actors.every(a => a.moving)));
      check('return line uses the requested door wording', q.texts.some(t => t.text === '* 이제 빨리 다시 그 문앞으로 가볼까'));
      await dialogue(() => game.castleGate?.opening?.elapsed > 0.4, false); await shot('entry-open-mid');
      await dialogue(() => game.textbox.state === 'waiting' && game.textbox.node?.text === '* 오 시발.', false); await shot('entry-retreat');
      await dialogue(() => game.castleGate?.passengers.length > 0, false); await shot('entry-transit-mid');
      await dialogue(() => !game.dialogue.running && !!game.flags.castle_gate_reunion_done, false);
      assert.ok(await ready()); await shot('entry-party-complete');
      check('corrected formation preserves each of six actual door transits exactly once', await page.evaluate(() => window.__gateQA.transitEvents.length === 6
        && [...window.__gateQA.transits].sort().join() === ['gate_youngcle', 'gate_junhee', 'gate_bidet', 'gate_mario', 'gate_ttuulla', 'gate_park'].sort().join()),
      JSON.stringify(await page.evaluate(() => window.__gateQA.transitEvents)));
      check('visible queue routes remain floor safe until actors enter aperture', await page.evaluate(() => window.__gateQA.samples
        .filter(s => s.map === 'gajaeman_castle_lobby' && s.fade < 0.01).every(s => s.actors.filter(a => !a.absent && a.visible).every(a => !a.solid && !a.footSolid))));
      await walk('ArrowUp', () => game.player.probe()?.id === 'castle_lobby_open_door', 'entry regression reaches open gate');
      await key('KeyC'); await dialogue(() => game.mapId === 'gajaeman_castle_dark_path' && !game.dialogue.running && !!game.flags.castle_dark_path_seen, false);
      assert.ok(await ready()); await shot('entry-dark');
      check('entry correction preserves gate completion and real C dark entry', (await state()).party.length === 2 && (await state()).open && (await state()).dark);
    }
    fs.writeFileSync(path.join(process.env.SHOT_DIR, 'entry-observations.json'), JSON.stringify(await page.evaluate(() => window.__gateQA), null, 2));
    return;
  }
  if (mode === 'post-return') {
    await open({ qa: 'castle_gate_after' }); assert.ok(await ready());
    await page.setViewportSize({ width: 1280, height: 900 });
    await fixture('completed-left-orb-revisit-start', 'Initial checkpoint only: preserve completed gate QA flags/party, load the left orb through production changeMap, then autosave. This skips the long cleared left-wing revisit and does not claim that approach was played.', async () => {
      await game.changeMap('gajaeman_castle_left_orb', 'start', true, { enter: false });
      game.fadeTo(0, 0.1); game.autosave();
    });
    assert.ok(await ready()); await observe(); await shot('completed-left-orb-start');
    const initial = await state();
    check('revisit fixture has saved completed gate both seals and full party', initial.map === 'gajaeman_castle_left_orb'
      && initial.open && initial.reunion && initial.seals.every(Boolean) && initial.party.join() === 'gyeongsub,ppaman');
    await walk('ArrowDown', () => game.mapId === 'gajaeman_castle_lobby', 'completed orb revisit returns directly to lobby');
    assert.ok(await ready()); await shot('completed-left-orb-lobby');
    const returned = await state();
    check('completed return preserves open gate party and safe field control', returned.open && returned.reunion
      && returned.party.join() === 'gyeongsub,ppaman' && !returned.blocked && !returned.dark && !returned.bgm);
    check('completed return never enters boulder or replays reunion dialogue', await page.evaluate(() =>
      window.__gateQA.samples.every(s => s.map !== 'gajaeman_castle_boulder') && !game.castleGate && window.__gateQA.texts.length === 0));
    await walk('ArrowUp', () => game.player.probe()?.id === 'castle_lobby_open_door', 'returned party can approach open gate');
    await key('KeyC');
    await dialogue(() => game.mapId === 'gajaeman_castle_dark_path' && !game.dialogue.running && !!game.flags.castle_dark_path_seen, false);
    assert.ok(await ready()); await shot('completed-left-orb-dark-reentry');
    check('actual C after completed return reaches playable dark path', (await state()).map === 'gajaeman_castle_dark_path'
      && (await state()).party.length === 2 && (await state()).dark && !(await state()).blocked);
    check('only the original dark introduction runs after C', JSON.stringify((await page.evaluate(() => window.__gateQA.texts)).map(t => t.text))
      === JSON.stringify(['* ...', '* 아무것도 안보여요', '* 다른애들은 어디로간거지?', '* 일단 앞으로 가봐요..']));
    fs.writeFileSync(path.join(process.env.SHOT_DIR, 'production-observations.json'), JSON.stringify(await page.evaluate(() => window.__gateQA), null, 2));
    return;
  }
  if (mode === 'taps') {
    await open({ qa: 'castle_dark_path' });
    assert.ok(await until(() => window.game?.state === 'field', 30000));
    await page.setViewportSize({ width: 1280, height: 900 }); await observe();
    await dialogue(() => !game.dialogue.running && !!game.flags.castle_dark_path_seen, false);
    assert.ok(await ready()); await shot('short-taps-before');
    const before = (await state()).xy; let maximum = 0, captured = false;
    for (let i = 0; i < 120 && before[1] - (await state()).xy[1] < 65; i++) {
      await press('ArrowUp', { delay: 12 }); await page.waitForTimeout(30);
      const s = await state(); maximum = Math.max(maximum, s.pulses);
      if (s.pulses && !captured) { await shot('short-taps-pulse'); captured = true; }
    }
    const after = await state();
    check('real short taps accumulate movement and reveal guidance', before[1] - after.xy[1] >= 36 && maximum > 0,
      JSON.stringify({ before, after: after.xy, maximum }));
    await mask('short taps'); await page.waitForTimeout(1750); await shot('short-taps-idle');
    check('stationary interval clears every pulse', (await state()).pulses === 0);
    await page.keyboard.down('ArrowLeft'); await page.waitForTimeout(700); await page.keyboard.up('ArrowLeft');
    await page.waitForTimeout(1750); const wall = (await state()).xy; let blockedPulses = 0;
    for (let i = 0; i < 30; i++) {
      await press('ArrowLeft', { delay: 12 }); await page.waitForTimeout(30);
      blockedPulses = Math.max(blockedPulses, (await state()).pulses);
    }
    await shot('short-taps-blocked');
    check('blocked short taps create neither movement nor false rings', Math.abs((await state()).xy[0] - wall[0]) < 0.01 && blockedPulses === 0);
    await escToTitle(page); check('short-tap scene disposes at title', await page.evaluate(() => !game.castleDarkPath));
    await open(); await continueTitle(); assert.ok(await ready());
    check('true page reload Continue preserves open flags party and 13am', (await state()).open && (await state()).reunion
      && (await state()).party.join() === 'gyeongsub,ppaman' && (await state()).bgm === 'castle_dark_path');
    return;
  }
  await start();
  if (mode === 'cancel') {
    for (const beat of ['opening', 'transit']) {
      if (beat === 'transit') await start();
      await dialogue(beat === 'opening' ? () => game.castleGate?.opening?.elapsed > 0.3 : () => game.castleGate?.passengers.length > 0, false);
      await shot(`cancel-${beat}-before`); await escToTitle(page);
      assert.ok(await until(() => game.state === 'title' && !game.castleGate, 6000));
      check(`${beat} interruption removes scene and actor transit state`, await page.evaluate(() => !game.dialogue.running && !game.castleGate
        && game.entities.every(e => !e.doorTransit) && !game.flags.castle_gate_open && !game.flags.castle_gate_reunion_done));
      await continueTitle();
      if (await page.evaluate(() => game.mapId === 'gajaeman_castle_left_orb')) {
        assert.ok(await ready());
        await walk('ArrowDown', () => game.mapId === 'gajaeman_castle_boulder', 'retry naturally descends from saved orb checkpoint');
      }
      await dialogue(() => !game.dialogue.running && !!game.flags.castle_gate_reunion_done, false);
      assert.ok(await ready()); await shot(`cancel-${beat}-recovered`);
      check(`${beat} retry naturally completes without softlock`, (await state()).open && (await state()).reunion && (await state()).party.length === 2);
    }
  } else {
    await dialogue(() => !game.dialogue.running && !!game.flags.castle_gate_reunion_done);
    assert.ok(await ready()); await shot('party-control'); await sizes('party-control');
    const reunion = await state(), q = await page.evaluate(() => window.__gateQA);
    observations.push({ phase: 'reunion', ...q });
    check('boulder return original three lines occur before reunion', JSON.stringify(q.texts.slice(0, 3).map(t => t.text)) === JSON.stringify(['* 다 됐노?', '* 이제 빨리 다시 그 문앞으로 가볼까', '* ㅇㅋ요']));
    check('Youngcle uses approved loaded portrait for every line', q.texts.filter(t => t.speaker === '영클').every(t => t.portrait === 'youngcle_tv_smirk')
      && await page.evaluate(() => !!game.portraits.youngcle_tv_smirk));
    check('only union 노 has the one-character mosaic', q.texts.filter(t => t.mosaic).length === 1 && q.texts.find(t => t.mosaic)?.mosaic.text === '노');
    check('six allies each actually traverse the door once', q.transitEvents.length === 6
      && [...q.transits].sort().join() === ['gate_youngcle', 'gate_junhee', 'gate_bidet', 'gate_mario', 'gate_ttuulla', 'gate_park'].sort().join(), JSON.stringify(q.transitEvents));
    check('gate opening progresses, then Junhee retreats', q.samples.some(s => s.progress > 0.1 && s.progress < 0.9)
      && q.samples.some(s => s.open && s.junhee >= 515));
    check('only original three-person party remains with both seals and open gate', reunion.open && reunion.reunion && reunion.party.join() === 'gyeongsub,ppaman'
      && reunion.seals.every(Boolean) && reunion.actors.every(a => a.dead || a.visible === false), JSON.stringify(reunion));
    check('locker and rumble are actual opening calls', ['locker', 'rumble'].every(name => q.sounds.some(s => s.name === name)));
    check('boulder-to-lobby transition includes black fade and stays silent', q.samples.some(s => s.map === 'gajaeman_castle_boulder' && s.fade > 0.95)
      && q.samples.filter(s => s.map === 'gajaeman_castle_lobby').every(s => !s.bgm));
    await escToTitle(page); await continueTitle(); assert.ok(await ready());
    check('production autosave and title Continue preserve gate and party', (await state()).open && (await state()).reunion && (await state()).party.join() === 'gyeongsub,ppaman');
    await observe();
    await walk('ArrowUp', () => game.player.probe()?.id === 'castle_lobby_open_door', 'approach open gate');
    await page.keyboard.down('ArrowUp'); await page.waitForTimeout(350); await page.keyboard.up('ArrowUp');
    check('walking into gate does not replace C interaction', (await state()).map === 'gajaeman_castle_lobby');
    await key('KeyC'); await dialogue(() => game.mapId === 'gajaeman_castle_dark_path' && !game.dialogue.running && !!game.flags.castle_dark_path_seen);
    assert.ok(await ready()); assert.ok(await until(() => game.sound.bgmName === 'castle_dark_path' && game.sound.bgm?.currentTime > 0.2 && !game.sound.bgm.paused, 8000));
    check('13am runtime source is decoded at original duration and playback rate', await page.evaluate(() => /castle_dark_path\.mp3/.test(game.sound.bgm.currentSrc)
      && game.sound.bgm.duration > 90 && game.sound.bgm.duration < 92 && game.sound.bgm.playbackRate === 1 && game.sound.bgm.readyState >= 2));
    await shot('black-path-idle');
    check('black intro exact four lines', JSON.stringify((await page.evaluate(() => window.__gateQA.texts)).map(t => t.text)) === JSON.stringify(['* ...', '* 아무것도 안보여요', '* 다른애들은 어디로간거지?', '* 일단 앞으로 가봐요..']));
    const clock = (await state()).clock;
    await walk('ArrowUp', () => game.player.y <= 3340, 'first steps make rings'); await shot('black-rings-first'); await mask('first leg');
    check('movement emits rings and original water-walk calls', (await state()).pulses > 0 && await page.evaluate(() => window.__gateQA.walks.some(w => /water_walk_loop/.test(w.loop || '') && w.moving)));
    await page.waitForTimeout(1750); await shot('black-rings-cleared');
    check('idle clears rings while BGM clock advances', (await state()).pulses === 0 && (await state()).clock > clock + 1.5);
    observations.push({ phase: 'dark-first-entry', ...await page.evaluate(() => window.__gateQA) });
    await escToTitle(page);
    check('title disposes dark path pulses', await page.evaluate(() => !game.castleDarkPath));
    await continueTitle(); assert.ok(await ready()); await observe();
    assert.ok(await until(() => game.sound.bgmName === 'castle_dark_path' && game.sound.bgm?.currentTime > 0.15 && !game.sound.bgm.paused, 8000));
    check('dark Continue restores party and music without repeating intro', (await state()).dark && (await state()).party.length === 2 && !await page.evaluate(() => game.dialogue.running));
    await page.keyboard.down('ArrowLeft'); await page.waitForTimeout(650); await page.keyboard.up('ArrowLeft');
    const edge = (await state()).xy;
    await page.keyboard.down('ArrowLeft'); await page.waitForTimeout(500); await page.keyboard.up('ArrowLeft');
    check('invisible path wall blocks actual walking without penetration', Math.abs((await state()).xy[0] - edge[0]) < 3 && !(await state()).blocked);
    await walk('ArrowRight', () => game.player.x >= 260, 'return lane center');
    const began = Date.now();
    await walk('ArrowUp', () => game.player.y <= 1898, 'up to first turn'); await shot('black-turn-one'); await sizes('black-turn-one'); await mask('first turn');
    await walk('ArrowRight', () => game.player.x >= 3266, 'right to second turn'); await shot('black-turn-two'); await mask('second turn');
    await walk('ArrowUp', () => game.mapId === 'gajaeman_castle_dark_arrival', 'north exit reaches real arrival map'); assert.ok(await ready()); await shot('black-arrival');
    check('real up-right-up traversal reaches connected arrival with party', (await state()).party.join() === 'gyeongsub,ppaman' && !(await state()).blocked, `traversal wall time ${Date.now() - began}ms`);
    check('dark actors actually render dimmed without mutating their sprites', await page.evaluate(() => window.__gateQA.alpha.some(a => a.map === 'gajaeman_castle_dark_path' && Math.abs(a.alpha - 0.48) < 0.01)));
    await walk('ArrowDown', () => game.mapId === 'gajaeman_castle_dark_path', 'arrival south return'); assert.ok(await ready());
    check('arrival reentry restores 13am', (await state()).bgm === 'castle_dark_path' && !(await state()).paused);
    await walk('ArrowDown', () => game.player.y >= 1894, 'return down to second turn');
    await walk('ArrowLeft', () => game.player.x <= 262, 'return left to first turn');
    await walk('ArrowDown', () => game.mapId === 'gajaeman_castle_lobby', 'return south to open lobby'); assert.ok(await ready()); await shot('lobby-return-restored');
    check('return disposes darkness and restores full party brightness', !(await state()).dark && (await state()).party.length === 2
      && await page.evaluate(() => window.__gateQA.alpha.some(a => a.map === 'gajaeman_castle_lobby' && a.alpha === 1)));
    await escToTitle(page); await continueTitle(); assert.ok(await ready());
    check('return save Continue keeps open gate and party without reunion replay', (await state()).open && (await state()).reunion && (await state()).party.length === 2 && !await page.evaluate(() => !!game.castleGate));
  }
  const evidence = await page.evaluate(() => window.__gateQA);
  observations.push({ phase: mode === 'cancel' ? 'cancel' : 'dark-path', ...evidence });
  fs.writeFileSync(path.join(process.env.SHOT_DIR, 'production-observations.json'), JSON.stringify(observations, null, 2));
  check('audio evidence is runtime playback/calls, not a claimed listening test', true, 'No subjective auditory verification claimed.');
});
