import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { runScenario } from './lib/harness.mjs';

await runScenario({ name: 'castle-orb', launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] } }, async ({ page, open, until, press, shot, fixture, check }) => {
  const failures = [];
  page.on('response', response => { if (response.status() >= 400 && /\/(assets|src)\//.test(response.url())) failures.push(`${response.status()} ${response.url()}`); });
  // BUILD310 comparison plus audio.js optional-file probes, main.js optional portraits,
  // and TileMap.bake's void skip establish these exact non-required paths.
  const optionalProbes = new Set([
    '/assets/tiles/void.png',
    // BUILD313 visits Mario/Bidet; makePortraits derives Bidet's face from his loaded sheet.
    // prepareMapAssets probes a separate portrait PNG optionally, even for silent Mario.
    ...['youngcle', 'youngcle_hover', 'gajaeman_shadow', 'mini_mario', 'warm_bidet'].map(name => `/assets/portraits/${name}.png`),
    ...['default', 'hero', 'low', 'cat', 'robot', 'dao', 'bazzi'].flatMap(name => ['mp3', 'ogg'].map(ext => `/assets/audio/voices/${name}.${ext}`)),
    ...['chime', 'open', 'close'].flatMap(name => ['mp3', 'ogg'].map(ext => `/assets/audio/sfx/${name}.${ext}`)),
  ]);
  const field = () => until(() => window.game?.state === 'field' && !game.dialogue.running && !game.castleOrb && !game.transitioning && game.fade.alpha < 0.01, 30000);
  const key = async code => { await press(code, { delay: 45 }); await page.waitForTimeout(100); };
  const walk = async (code, predicate, label, timeout = 8000) => {
    await page.keyboard.down(code);
    try { assert.ok(await until(predicate, timeout), label); }
    finally { await page.keyboard.up(code); }
    await page.waitForTimeout(100);
  };
  const snapshot = () => page.evaluate(() => ({ map: game.mapId, party: [...game.party], player: [game.player.x, game.player.y],
    facing: game.player.facing, camera: [game.camera.x, game.camera.y], locked: game.camera.locked,
    flag: !!game.flags.castle_right_seal_active, stage: game.story.stage, scene: game.castleOrb?.beat || null,
    bgm: game.sound.bgmName, musicTime: game.sound.bgm?.currentTime, musicPaused: game.sound.bgm?.paused,
    hp: { ...game.partyHp }, attack: game.attack, inventory: [...game.inventory], money: game.money,
    playerFallback: !!game.player.sprite?.fallback,
    blocked: game.map.solidRect(game.player.x, game.player.y, game.player.w, game.player.h) }));
  const sizes = async label => {
    for (const width of [375, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 }); await page.waitForTimeout(120); await shot(`${label}-${width}`);
      check(`${label} canvas fits ${width}`, await page.evaluate(() => {
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
  const approach = async () => {
    await walk('ArrowUp', () => game.player.probe()?.id === 'castle_seal_orb', 'walk up to actual orb collider');
  };
  const narrate = async prefix => {
    const texts = [];
    await key('KeyC');
    for (let i = 0; i < 3; i++) {
      assert.ok(await until(() => game.textbox.isOpen && game.textbox.state === 'waiting', 8000));
      texts.push(await page.evaluate(() => ({ text: game.textbox.node.text, voice: game.textbox.node.voice, speaker: game.textbox.node.speaker })));
      if (prefix === 'activation' && i === 2) await sizes('narration-longest');
      await shot(`${prefix}-narration-${i + 1}`); await key('KeyC');
    }
    check(`${prefix} exact three narrator lines`, JSON.stringify(texts.map(line => line.text)) === JSON.stringify([
      '* ...', '* 알수없는 힘으로 가득한 구체다.', '* 나는 그것에 손을 가져다댔다.',
    ]) && texts.every(line => line.voice === 'narrator' && !line.speaker), JSON.stringify(texts));
  };

  await open({ qa: 'malzahar_arrival' }); assert.ok(await field());
  await shot('corridor-before-entry');
  await walk('ArrowUp', () => game.player.probe()?.id === 'castle_torii_end_door', 'north door reached by walking');
  await page.keyboard.down('ArrowUp'); await page.waitForTimeout(300); await page.keyboard.up('ArrowUp');
  check('closed north door requires C', (await snapshot()).map === 'gajaeman_torii_end');
  await key('KeyC'); assert.ok(await until(() => game.mapId === 'gajaeman_castle_orb', 15000)); assert.ok(await field());
  assert.ok(await until(() => game.sound.bgmName === 'castle_orb' && game.sound.bgm?.currentTime > 0.2 && !game.sound.bgm.paused, 8000));
  const entered = await snapshot();
  check('one-screen room starts solo at fixed camera with actual player sprite', entered.party.length === 0 && entered.camera[0] === 0
    && entered.camera[1] === 12 && !entered.flag && !entered.blocked && !entered.playerFallback, JSON.stringify(entered));
  check('purple orb bitmap loads rather than fallback', await page.evaluate(() => {
    const image = game.propImages['assets/props/castle-seal-orb.png'];
    return !!image && image.width === 128 && image.height === 128;
  }));
  await sizes('room-far');
  await walk('ArrowLeft', () => game.player.x <= 148, 'walk to left shadow angle');
  await walk('ArrowUp', () => game.player.y <= 208, 'left side of orb'); await key('ArrowRight'); await shot('shadow-left');
  await walk('ArrowDown', () => game.player.y >= 265, 'go around south side');
  await walk('ArrowRight', () => game.player.x >= 312, 'walk to right shadow angle');
  await walk('ArrowUp', () => game.player.y <= 208, 'right side of orb'); await key('ArrowLeft'); await shot('shadow-right');
  check('camera remains fixed while circling the sphere', JSON.stringify((await snapshot()).camera) === JSON.stringify(entered.camera));
  await walk('ArrowDown', () => game.player.y >= 260, 'return below sphere');
  await walk('ArrowLeft', () => game.player.x <= 230, 'align below sphere');
  await approach(); await shot('shadow-near');
  const before = await snapshot();
  await fixture('read-only-orb-cinematic-observer', 'Wrap actual draw and sound calls to record completed frames, live map/party/camera/music and SFX. Does not change flags, timings, positions, or scene state.', () => {
    const q = window.__orbQA = { samples: [], frames: {}, sounds: [], enabled: true };
    const draw = game.draw.bind(game), sfx = game.sound.sfx.bind(game.sound);
    game.sound.sfx = (name, options) => { if (q.enabled) q.sounds.push({ name, at: performance.now() }); return sfx(name, options); };
    game.draw = (...args) => {
      const result = draw(...args); if (!q.enabled) return result;
      const scene = game.castleOrb, now = performance.now();
      if (!scene || scene.beat === 'loading') return result;
      const sample = { at: now, beat: scene.beat, elapsed: scene.elapsed, duration: scene.duration,
        map: game.mapId, player: [game.player.x, game.player.y], party: [...game.party], camera: [game.camera.x, game.camera.y],
        flag: !!game.flags.castle_right_seal_active, bgm: game.sound.bgmName, time: game.sound.bgm?.currentTime,
        paused: game.sound.bgm?.paused, globalFade: game.fade.alpha };
      if (!q.samples.length || now - q.samples.at(-1).at >= 60) q.samples.push(sample);
      if (scene.elapsed > scene.duration * 0.42 && !q.frames[scene.beat]) q.frames[scene.beat] = { ...sample, data: game.canvas.toDataURL('image/png') };
      return result;
    };
  });
  await narrate('activation');
  assert.ok(await until(() => game.castleOrb?.beat === 'charge', 12000));
  await page.keyboard.down('ArrowDown'); await page.waitForTimeout(250); await page.keyboard.up('ArrowDown');
  check('activation locks player input without moving the real map', JSON.stringify((await snapshot()).player) === JSON.stringify(before.player));
  assert.ok(await field());
  const after = await snapshot();
  const q = await page.evaluate(() => { window.__orbQA.enabled = false; return window.__orbQA; });
  const captures = [];
  for (const [name, frame] of Object.entries(q.frames)) {
    const file = path.join(process.env.SHOT_DIR, `activation-${name}.png`);
    fs.writeFileSync(file, Buffer.from(frame.data.split(',')[1], 'base64'));
    captures.push({ ...frame, name, file, data: undefined });
  }
  fs.writeFileSync(path.join(process.env.SHOT_DIR, 'cinematic-evidence.json'), JSON.stringify({ ...q, frames: undefined, captures }, null, 2));
  const beats = [...new Set(q.samples.map(sample => sample.beat))];
  check('contact fade gate pan crackle purple hold and return all run in order', beats.join() === 'charge,out,reveal,pan,crackle,ignite,hold,returnOut,returnIn', JSON.stringify(beats));
  check('right seal switches only at ignition', q.samples.filter(sample => ['charge', 'out', 'reveal', 'pan', 'crackle'].includes(sample.beat)).every(sample => !sample.flag)
    && q.samples.some(sample => sample.beat === 'ignite' && sample.flag) && after.flag);
  check('cutaway never changes live room position party camera or music owner', q.samples.every(sample => sample.map === before.map
    && JSON.stringify(sample.player) === JSON.stringify(before.player) && JSON.stringify(sample.camera) === JSON.stringify(before.camera)
    && sample.party.length === 0 && sample.bgm === 'castle_orb' && !sample.paused));
  check('real-time BGM clock advances without restarting across cutaway', q.samples.every((sample, index) => !index || sample.time >= q.samples[index - 1].time)
    && q.samples.at(-1).time - q.samples[0].time > 7);
  check('contact rise static and ignition each play once', ['power', 'spearappear', 'static_burst', 'great_shine'].every(name => q.sounds.filter(sound => sound.name === name).length === 1), JSON.stringify(q.sounds));
  check('all four cues and narrator are real decoded assets, not synthetic fallback', await page.evaluate(() =>
    ['power', 'spearappear', 'static_burst', 'great_shine'].every(name => game.sound.files[name]?.readyState >= 2)
    && !!game.sound.voiceBuf.narrator));
  check('return restores control at exact original position with no resource or story-stage mutation', after.map === before.map && after.scene === null
    && JSON.stringify(after.player) === JSON.stringify(before.player) && JSON.stringify(after.camera) === JSON.stringify(before.camera)
    && after.stage === before.stage && after.money === before.money && after.attack === before.attack
    && JSON.stringify(after.hp) === JSON.stringify(before.hp) && JSON.stringify(after.inventory) === JSON.stringify(before.inventory));
  await sizes('room-activated');
  await key('KeyC'); assert.ok(await until(() => game.textbox.isOpen && game.textbox.state === 'waiting', 8000));
  check('reinteraction does not replay activation', await page.evaluate(() => !game.castleOrb && game.textbox.node.text === '* 구체가 보라색으로 빛나고 있다.'));
  await shot('orb-repeat-dialogue'); await key('KeyC'); assert.ok(await field());
  await fixture('save-completed-orb', 'Save only naturally completed state through production autosave; no save edits.', () => game.autosave());
  await key('Escape'); await continueFromTitle();
  check('real title continue preserves activated seal solo party and room camera', (await snapshot()).flag && (await snapshot()).party.length === 0
    && (await snapshot()).map === 'gajaeman_castle_orb' && JSON.stringify((await snapshot()).camera) === JSON.stringify(before.camera));
  await shot('orb-continued');
  await walk('ArrowDown', () => game.mapId === 'gajaeman_torii_end', 'south doorway returns to torii corridor'); assert.ok(await field());
  check('return corridor restores field BGM without losing seal', (await snapshot()).flag && (await snapshot()).bgm === 'castle_right');
  await shot('corridor-return');
  await walk('ArrowUp', () => game.player.probe()?.id === 'castle_torii_end_door', 'approach north door again'); await key('KeyC');
  assert.ok(await until(() => game.mapId === 'gajaeman_castle_orb', 15000)); assert.ok(await field());
  check('normal C reentry keeps seal and does not replay', (await snapshot()).flag && !(await snapshot()).scene && (await snapshot()).bgm === 'castle_orb');

  await fixture('activated-lobby-reentry', 'Load the ordinary lobby through production changeMap using the naturally completed seal. This skips walking all previous rooms and does not set any seal flag.', async () => {
    await game.changeMap('gajaeman_castle_lobby', 'from_right', true, { enter: false });
    game.player.x = 620; game.player.y = 360; game.player.facing = 'up'; game.camera.snap(); game.fadeTo(0, 0.3);
  });
  assert.ok(await field()); await sizes('lobby-right-seal-active');
  check('ordinary lobby retains right seal and a solid central gate', await page.evaluate(() => game.flags.castle_right_seal_active
    && game.entities.find(entity => entity.id === 'castle_lobby_sealed_door')?.def.solid === true));
  await key('KeyC'); assert.ok(await until(() => game.textbox.isOpen && game.textbox.state === 'waiting', 8000));
  await shot('lobby-sealed-dialogue');
  check('gate remains closed and describes only right activation', await page.evaluate(() => game.mapId === 'gajaeman_castle_lobby'
    && game.textbox.node.text.includes('오른쪽')));
  while (await page.evaluate(() => game.dialogue.running)) {
    assert.ok(await until(() => !game.dialogue.running || game.textbox.state === 'waiting', 8000));
    if (await page.evaluate(() => game.dialogue.running)) await key('KeyC');
  }
  assert.ok(await field());

  for (const post of [false, true]) {
    const label = post ? 'post-flag' : 'pre-flag';
    await open({ qa: 'castle_orb' }); assert.ok(await field()); await approach(); await narrate(label);
    assert.ok(await until(post ? () => game.castleOrb?.beat === 'hold' && game.flags.castle_right_seal_active : () => game.castleOrb?.beat === 'charge', 12000));
    await shot(`${label}-cancel-before`); await key('Escape');
    assert.ok(await until(() => game.state === 'title' && !game.castleOrb, 5000));
    check(`${label} Escape disposes cutaway and audio without late scene resume`, await page.evaluate(() => !game.castleOrb && !game.dialogue.running && game.sound.bgmName !== 'castle_orb'));
    await continueFromTitle(); await shot(`${label}-continued`);
    check(`${label} continue restores safe room control`, (await snapshot()).map === 'gajaeman_castle_orb' && !(await snapshot()).blocked
      && (await snapshot()).party.length === 0 && !(await snapshot()).scene && JSON.stringify((await snapshot()).camera) === '[0,12]');
    check(`${label} unfinished transaction stays retryable after continue`, !(await snapshot()).flag, JSON.stringify(await snapshot()));
  }
  const unexpected = failures.filter(value => !optionalProbes.has(new URL(value.slice(4)).pathname));
  fs.writeFileSync(path.join(process.env.SHOT_DIR, 'asset-probes.json'), JSON.stringify({
    knownOptional: [...new Set(failures.filter(value => optionalProbes.has(new URL(value.slice(4)).pathname)).map(value => new URL(value.slice(4)).pathname))],
    unexpected,
  }, null, 2));
  check('no required runtime asset or module fetch failures', unexpected.length === 0, JSON.stringify(unexpected));
});
