import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { runScenario } from './lib/harness.mjs';

await runScenario({ name: 'castle-pipe', launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] } }, async ({ page, open, until, press, shot, fixture, check }) => {
  const key = async code => { await press(code, { delay: 45 }); await page.waitForTimeout(100); };
  const field = () => until(() => window.game?.state === 'field' && !game.dialogue.running && !game.transitioning && game.fade.alpha < 0.01, 30000);
  const walk = async (code, predicate, label, timeout = 9000) => {
    await page.keyboard.down(code);
    try { assert.ok(await until(predicate, timeout), label); }
    finally { await page.keyboard.up(code); }
  };
  const state = () => page.evaluate(() => ({ map: game.mapId, party: [...game.party], flags: { ...game.flags }, stage: game.story.stage,
    player: [game.player.x, game.player.y], camera: [game.camera.x, game.camera.y], cameraLocked: game.camera.locked,
    hp: { ...game.partyHp }, inventory: [...game.inventory], money: game.money, attack: game.attack,
    blocked: game.map.solidRect(game.player.x, game.player.y, game.player.w, game.player.h), bgm: game.sound.bgmName,
    actors: game.entities.filter(e => !e.dead && e.visible).map(e => e.id), background: game.background.length,
    inputReady: !game.dialogue.running && game.state === 'field' && !game.transitioning }));
  const sizes = async label => {
    for (const width of [375, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 }); await page.waitForTimeout(100); await shot(`${label}-${width}`);
      check(`${label} fits viewport ${width}`, await page.evaluate(() => {
        const rect = game.canvas.getBoundingClientRect();
        return rect.left >= 0 && rect.right <= innerWidth + 1 && rect.top >= 0 && rect.bottom <= innerHeight + 1;
      }));
    }
    await page.setViewportSize({ width: 1000, height: 780 });
  };
  const continueFromTitle = async () => {
    assert.ok(await until(() => game.state === 'title' && game.title.phase === 'wait', 5000));
    await key('Space'); assert.ok(await until(() => game.title.phase === 'zoom', 5000));
    await key('KeyC'); assert.ok(await until(() => game.title.phase === 'locked' && game.title.time > 3.05, 5000));
    await key('KeyC'); assert.ok(await field());
  };
  const observe = () => fixture('read-only-pipe-observer', 'Record completed Canvas frames, actor positions/hops/clipping, camera, fade, text, scripts and audio calls. No timing, player, flag, or completion mutation.', () => {
    const q = window.__pipeQA = { samples: [], frames: {}, lines: [], audio: [], scripts: [], enabled: true };
    const draw = game.draw.bind(game), sfx = game.sound.sfx.bind(game.sound), runScript = game.runScript.bind(game);
    game.runScript = (id, ...args) => { if (q.enabled) q.scripts.push({ id, at: performance.now() }); return runScript(id, ...args); };
    game.sound.sfx = (name, options) => { if (q.enabled) q.audio.push({ name, at: performance.now() }); return sfx(name, options); };
    game.draw = (...args) => {
      const result = draw(...args); if (!q.enabled) return result;
      const now = performance.now(), box = game.textbox;
      const actors = [game.player, ...game.entities.filter(e => /castle_return_|^(ppaman|gyeongsub)$/.test(e.id))].map(e => ({
        id: e === game.player ? 'player' : e.id, x: e.x, y: e.y, visible: e.visible, dead: e.dead,
        hop: e.hopY || 0, flyX: e.flyX || 0, flyY: e.flyY || 0, moving: e.moving, scale: e.def.visualScale || 1,
        emerge: e.emerge ? { ...e.emerge } : null, transit: e.doorTransit ? { ...e.doorTransit } : null,
        customDraw: Object.hasOwn(e, 'draw'), fallback: !!e.sprite?.fallback, type: e.def.type, emote: e.emote?.kind || null,
      }));
      const node = game.dialogue.script?.[game.dialogue.i - 1];
      const kind = node ? Object.keys(node)[0] : 'field';
      const sample = { at: now, map: game.mapId, fade: game.fade.alpha, i: game.dialogue.i, kind,
        text: box.isOpen ? box.node?.text : null, textWaiting: box.isOpen && box.state === 'waiting',
        camera: [game.camera.x, game.camera.y], locked: game.camera.locked, actors,
        ready: !!game.flags.castle_pipe_ready, returned: !!game.flags.castle_pipe_returned,
        party: [...game.party], bgm: game.sound.bgmName };
      if (!q.samples.length || now - q.samples.at(-1).at >= 35) q.samples.push(sample);
      if (sample.text && q.lines.at(-1) !== sample.text) q.lines.push(sample.text);
      const stamp = `${game.mapId}-${sample.i}-${kind}`;
      if (q.stamp !== stamp) { q.stamp = stamp; q.since = now; }
      const phase = Math.min(2, Math.floor((now - q.since) / 260));
      const moving = actors.some(a => a.visible && !a.dead && (a.hop || a.emerge || a.transit || a.customDraw || a.moving));
      const record = name => { if (!q.frames[name]) q.frames[name] = { ...sample, data: game.canvas.toDataURL('image/png') }; };
      if (sample.fade < 0.01 && game.mapId !== 'gajaeman_castle_orb') {
        if (moving || kind === 'camera') record(`${stamp}-${phase}`);
        for (const actor of actors) {
          if (actor.visible && actor.transit) record(`door-${actor.id}-${Math.floor(-actor.transit.offsetY / 55)}`);
          if (actor.visible && actor.moving && ['castle_return_mario', 'castle_return_bidet'].includes(actor.id)
            && q.lines.includes('* 먼저 가서 기다리겠습니다.')) record(`departure-${actor.id}-${Math.floor(actor.x / 120)}-${Math.floor(actor.y / 80)}`);
        }
        if (sample.textWaiting) record(`line-${q.lines.length}-page-${box.page}`);
        if (!q.clearFrame) { record('outside-clear-start'); q.clearFrame = true; }
      }
      return result;
    };
  });
  const exportEvidence = async label => {
    const q = await page.evaluate(() => { window.__pipeQA.enabled = false; return window.__pipeQA; });
    const captures = [];
    for (const [name, frame] of Object.entries(q.frames)) {
      const file = path.join(process.env.SHOT_DIR, `${label}-${name}.png`);
      fs.writeFileSync(file, Buffer.from(frame.data.split(',')[1], 'base64'));
      captures.push({ ...frame, file, data: undefined });
    }
    fs.writeFileSync(path.join(process.env.SHOT_DIR, `${label}-evidence.json`), JSON.stringify({ ...q, frames: undefined, captures }, null, 2));
    return q;
  };

  await open({ qa: 'castle_orb' }); assert.ok(await field());
  await walk('ArrowDown', () => game.mapId === 'gajaeman_torii_end', 'inactive orb south exit'); assert.ok(await field());
  await page.waitForTimeout(1900);
  check('inactive orb exit never spawns a pipe or Mario', await page.evaluate(() => !game.flags.castle_pipe_ready && !game.dialogue.running
    && !game.entities.some(e => /castle_return_/.test(e.id) && e.visible && !e.dead)));
  await shot('inactive-exit');

  await open({ qa: 'castle_orb_after' }); assert.ok(await field());
  const before = await state(); await observe();
  await page.keyboard.down('KeyC');
  await walk('ArrowDown', () => game.mapId === 'gajaeman_torii_end', 'activated orb actual south exit');
  assert.ok(await until(() => game.flags.castle_pipe_ready && !game.dialogue.running, 15000));
  await page.waitForTimeout(850);
  check('holding C from exit does not auto-board', (await state()).map === 'gajaeman_torii_end' && (await state()).inputReady && !(await state()).flags.castle_pipe_returned);
  await page.keyboard.up('KeyC');
  const emergence = await exportEvidence('emergence');
  const outside = emergence.samples.filter(s => s.map === 'gajaeman_torii_end');
  const clear = outside.find(s => s.fade < 0.01);
  const rise = outside.find(s => s.actors.some(a => a.id === 'castle_return_pipe' && a.visible && a.customDraw));
  check('pipe rise starts after 1.5 seconds of fully visible corridor', !!clear && !!rise && rise.at - clear.at >= 1460, JSON.stringify({ clear: clear?.at, rise: rise?.at, delay: rise && clear ? rise.at - clear.at : null }));
  check('Mario emerges then jumps with his original sound', outside.some(s => s.actors.some(a => a.id === 'castle_return_mario' && a.emerge))
    && outside.some(s => s.actors.some(a => a.id === 'castle_return_mario' && a.hop > 15))
    && emergence.audio.filter(a => a.name === 'mario_jump').length === 1);
  check('emergence starts once and keeps the original solo party and resources', emergence.audio.filter(s => s.name === 'mario_pipe').length === 2
    && (await state()).party.length === 0 && (await state()).money === before.money && JSON.stringify((await state()).inventory) === JSON.stringify(before.inventory));
  await sizes('outside-ready');
  check('ready pipe and Mario fit entirely above bottom of view', await page.evaluate(() => {
    const pipe = game.entities.find(e => e.id === 'castle_return_pipe'), mario = game.entities.find(e => e.id === 'castle_return_mario');
    return pipe.drawY + pipe.ih <= game.camera.y + 360 && mario.y + mario.h <= game.camera.y + 360;
  }));
  await fixture('save-ready-pipe', 'Production autosave after the pipe naturally emerges. No save or story mutation.', () => game.autosave());
  await key('Escape'); await continueFromTitle();
  check('title Continue restores waiting pipe without replay or boarding', await page.evaluate(() => game.flags.castle_pipe_ready && !game.flags.castle_pipe_returned
    && game.mapId === 'gajaeman_torii_end' && game.party.length === 0 && game.entities.filter(e => e.id === 'castle_return_pipe' && e.visible && !e.dead).length === 1
    && game.entities.filter(e => e.id === 'castle_return_mario' && e.visible && !e.dead).length === 1));
  await shot('ready-continued');
  await fixture('ready-pipe-approach', 'Position south of the waiting pipe after Continue, then use real Up and C. Only skips walking from the door; does not start boarding.', () => {
    game.player.x = 692; game.player.y = 430; game.player.facing = 'up'; game.player.trail = []; game.camera.snap();
  });
  await walk('ArrowUp', () => game.player.probe()?.id === 'castle_return_pipe', 'reach actual pipe collider');
  await page.waitForTimeout(600);
  check('touching waiting pipe does not board without fresh C', (await state()).inputReady && (await state()).map === 'gajaeman_torii_end');
  await observe(); await key('KeyC');
  assert.ok(await until(() => game.dialogue.running, 5000));
  const started = Date.now(); let responsive = false;
  while (Date.now() - started < 150000) {
    const box = await page.evaluate(() => ({ done: game.flags.castle_pipe_returned && !game.dialogue.running,
      open: game.textbox.isOpen, waiting: game.textbox.state === 'waiting', text: game.textbox.node?.text }));
    if (box.done) break;
    if (box.open && box.waiting) {
      if (!responsive && box.text?.includes('저는 일단 왼쪽으로')) { await sizes('lobby-dialogue'); responsive = true; }
      await key('KeyC');
    } else await page.waitForTimeout(75);
  }
  assert.ok(await field(), 'pipe reunion finishes');
  const after = await state(), board = await exportEvidence('boarding');
  const visibleActor = (sample, id) => sample.actors.find(a => a.id === id && a.visible && !a.dead);
  check('fresh C boards exactly once', board.scripts.filter(s => s.id === 'castle_pipe_board').length === 1);
  check('both passengers jump and descend into corridor pipe', board.samples.some(s => s.map === 'gajaeman_torii_end'
    && visibleActor(s, 'player')?.hop > 20 && visibleActor(s, 'castle_return_mario')?.hop > 20)
    && board.samples.some(s => s.map === 'gajaeman_torii_end' && visibleActor(s, 'player')?.emerge?.progress < 0.7 && visibleActor(s, 'castle_return_mario')?.emerge?.progress < 0.7));
  check('lobby pipe emits both passengers before retracting', board.samples.some(s => s.map === 'gajaeman_castle_lobby'
    && visibleActor(s, 'player')?.emerge && visibleActor(s, 'castle_return_mario')?.emerge)
    && board.samples.some(s => s.map === 'gajaeman_castle_lobby' && visibleActor(s, 'player')?.hop > 15 && visibleActor(s, 'castle_return_mario')?.hop > 15)
    && !after.actors.includes('castle_return_pipe'));
  const expected = ['형 성공하셨네요', '어 성공한거같다. 저기 불이 들어와있어.',
    '저는 일단 왼쪽으로 가보려구요 영클형이랑 연락이 안됩니다.', '그렇군..', '네 아직 왼쪽에 불이 안들어와있어요.',
    '만약.', '요플래만 이 불을 킬 수 있는거라면?', '아', '우리도 가야되지않을까.', '저희도 도울만큼 도우겠습니다.',
    '가자.', '그렇네요 갑시다', '먼저 가서 기다리겠습니다.'].map(text => `* ${text}`);
  check('all 13 requested dialogue lines appear exactly and in order', JSON.stringify(board.lines) === JSON.stringify(expected), JSON.stringify(board.lines));
  check('Ppaman shows surprise before greeting and again before realization', board.samples.some(s => !s.text && visibleActor(s, 'ppaman')?.emote === '!')
    && board.audio.filter(a => a.name === 'chime').length === 2);
  const first = board.samples.findIndex(s => s.text === expected[1]), next = board.samples.findIndex(s => s.text === expected[2]);
  const cameraBeat = board.samples.slice(first, next);
  check('camera visits lit right seal and returns before Bidet line', first >= 0 && next > first && cameraBeat.some(s => s.camera[1] < 150)
    && Math.abs(board.samples[next].camera[1] - board.samples[first].camera[1]) < 5);
  for (const id of ['castle_return_bidet', 'castle_return_mario']) {
    const transit = board.samples.filter(s => visibleActor(s, id)?.transit);
    check(`${id} runs to left doorway and clips through its opening`, transit.length >= 3
      && transit.every(s => visibleActor(s, id).x < 400)
      && new Set(transit.map(s => Math.round(visibleActor(s, id).transit.offsetY))).size >= 3
      && !after.actors.includes(id));
  }
  check('all visible characters use loaded sprites', board.samples.every(s => s.actors.filter(a => a.visible && !a.dead && a.type !== 'prop').every(a => !a.fallback)));
  check('complete scene restores three-person party, camera, resources and control', after.flags.castle_pipe_returned && after.party.join() === 'gyeongsub,ppaman'
    && after.inputReady && !after.cameraLocked && !after.blocked && after.money === before.money && after.attack === before.attack
    && JSON.stringify(after.inventory) === JSON.stringify(before.inventory));
  await sizes('lobby-completed');
  const followerBefore = await page.evaluate(() => game.entities.filter(e => e.def.type === 'follower').map(e => [e.id, e.x, e.y]));
  await walk('ArrowDown', () => game.player.y > 830, 'walk far enough for both follower trail gaps');
  check('both restored followers actually follow player movement', await page.evaluate(beforePositions => beforePositions.length === 2 && beforePositions.every(([id, x, y]) => {
    const actor = game.entities.find(e => e.id === id); return actor && actor.visible && (Math.abs(actor.x - x) + Math.abs(actor.y - y) > 15);
  }), followerBefore));
  await key('KeyV'); check('menu input restored after reunion', Boolean(await until(() => game.state === 'menu', 3000))); await key('KeyX'); assert.ok(await field());
  await fixture('left-block-check', 'Position by the former lobby left warning trigger, then walk across it; not evidence of reaching the lobby naturally.', () => {
    game.player.x = 500; game.player.y = 656; game.player.facing = 'left'; game.player.trail = []; game.camera.snap();
  });
  await walk('ArrowLeft', () => game.player.x < 435 || game.dialogue.running, 'cross former left guard');
  check('completed reunion disables former left-block warning', await page.evaluate(() => game.player.x < 435 && !game.dialogue.running));
  await fixture('save-completed-pipe', 'Save naturally completed reunion through production autosave without editing stored state.', () => game.autosave());
  const saved = await state(); await key('Escape'); await continueFromTitle();
  const continued = await state();
  check('title Continue preserves completed party and resources without duplicate actors', continued.flags.castle_pipe_returned && continued.party.join() === 'gyeongsub,ppaman'
    && continued.money === saved.money && JSON.stringify(continued.hp) === JSON.stringify(saved.hp)
    && JSON.stringify(continued.inventory) === JSON.stringify(saved.inventory)
    && !continued.actors.some(id => /castle_return_/.test(id)));
  await shot('completed-continued');

  await fixture('completed-corridor-reentry', 'Production changeMap reentry with naturally completed flags; skips walking the intervening rooms and never edits flags.', async () => {
    await game.changeMap('gajaeman_torii_end', 'from_orb', true); game.fadeTo(0, 0.2);
  });
  assert.ok(await field()); await page.waitForTimeout(1700);
  check('completed corridor revisit does not replay emergence or duplicate Mario', await page.evaluate(() => game.flags.castle_pipe_returned
    && !game.dialogue.running && !game.entities.some(e => /castle_return_/.test(e.id) && e.visible && !e.dead)));
  await shot('completed-corridor-reentry');

  await open({ qa: 'castle_pipe_ready' }); assert.ok(await field()); await observe();
  await walk('ArrowUp', () => game.player.probe()?.id === 'castle_return_pipe', 'ready QA reaches pipe'); await key('KeyC');
  assert.ok(await until(() => game.mapId === 'gajaeman_castle_lobby' && game.textbox.isOpen, 30000));
  await shot('interruption-before-completion'); await key('Escape');
  check('Escape interrupts reunion before completion flag', Boolean(await until(() => game.state === 'title' && !game.flags.castle_pipe_returned && !game.dialogue.running, 5000)));
  await continueFromTitle();
  check('interrupted reunion Continue returns to retryable solo waiting pipe', (await state()).map === 'gajaeman_torii_end'
    && (await state()).flags.castle_pipe_ready && !(await state()).flags.castle_pipe_returned && (await state()).party.length === 0 && (await state()).inputReady);
  await shot('interrupted-continued');
  await walk('ArrowUp', () => game.player.probe()?.id === 'castle_return_pipe', 'retry restored waiting pipe'); await key('KeyC');
  assert.ok(await until(() => game.castlePipe && game.player.hopY > 10, 5000));
  await shot('interruption-mid-jump'); await key('Escape');
  check('Escape during pipe jump disposes temporary owner before title', Boolean(await until(() => game.state === 'title' && !game.castlePipe && !game.dialogue.running, 5000)));
  await continueFromTitle();
  check('mid-jump Continue restores visible unscaled player and retryable pipe', await page.evaluate(() => game.mapId === 'gajaeman_torii_end'
    && game.player.visible && !game.player.emerge && !game.player.hopY && (game.player.def.visualScale ?? 1) === 1
    && game.flags.castle_pipe_ready && !game.flags.castle_pipe_returned && game.party.length === 0));
  await shot('mid-jump-continued');
});
