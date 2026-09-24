import assert from 'node:assert/strict';
import { runScenario } from './lib/harness.mjs';

await runScenario({ name: 'castle-malzahar-scene', launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] } }, async ({ page, open, until, press, shot, fixture, check }) => {
  await page.addInitScript(() => {
    window.entry312 = { frames: [], sounds: [] };
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function (...args) {
      entry312.sounds.push({ src: this.currentSrc || this.src, at: performance.now() });
      return play.apply(this, args);
    };
    const sample = () => {
      const g = window.game;
      if (g?.mapId === 'gajaeman_castle_fork' && entry312.frames.length < 30000) {
        const actors = [g.player, ...g.entities.filter(e => ['gyeongsub', 'ppaman'].includes(e.id))];
        entry312.frames.push({ at: performance.now(), fade: g.fade.alpha, transitioning: g.transitioning,
          party: actors.map(e => ({ id: e.id, visible: e.visible, x: e.x - g.camera.x, y: e.y - g.camera.y, emote: e.emote?.kind })),
          runner: g.runner && { phase: g.runner.core.phase, elapsed: g.runner.core.elapsed, x: g.runner.core.x,
            vx: g.runner.core.vx, animT: g.runner.core.animT, frame: g.runner.core.frame },
          battle: g.battle && { state: g.battle.state, phase: g.battle.gimmick?.snapshot?.runner?.phase,
            frame: g.battle.gimmick?.snapshot?.runner?.frame, animT: g.battle.gimmick?.snapshot?.runner?.animT,
            fade: g.fade.alpha, hudAlpha: g.battle.gimmick?.hudAlpha },
        });
      }
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  const field = () => until(() => window.game?.state === 'field' && !game.dialogue.running && !game.transitioning && game.fade.alpha < 0.01, 30000);
  const walk = async (key, predicate, label, timeout = 12000) => {
    await page.keyboard.down(key);
    try { assert.ok(await until(predicate, timeout), label); }
    finally { await page.keyboard.up(key); }
    await page.waitForTimeout(100);
  };
  const snapshot = () => page.evaluate(() => ({ map: game.mapId, party: [...game.party],
    x: game.player.x, y: game.player.y, bgm: game.sound.bgmName,
    split: !!game.flags.castle_malzahar_split, cameraLocked: game.camera.locked,
    defenders: game.entities.filter(entity => ['castle_warm_bidet', 'castle_dot_mario', 'castle_guard_gyeongsub', 'castle_guard_ppaman'].includes(entity.id))
      .map(entity => ({ id: entity.id, x: entity.x, y: entity.y, visible: entity.visible, facing: entity.facing })),
  }));
  const sizes = async label => {
    for (const width of [375, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForTimeout(150); await shot(`${label}-${width}`);
      check(`${label} canvas fits viewport ${width}`, await page.evaluate(() => {
        const rect = document.querySelector('canvas').getBoundingClientRect();
        return rect.left >= 0 && rect.right <= innerWidth + 1 && rect.top >= 0 && rect.bottom <= innerHeight + 1;
      }));
    }
    await page.setViewportSize({ width: 1000, height: 780 });
  };
  await open({ qa: 'memory_end' }); assert.ok(await field());
  await shot('memory-north-before');
  await walk('ArrowUp', () => game.mapId === 'gajaeman_castle_fork', 'normal north threshold enters fork');
  assert.ok(await until(() => game.dialogue.running && game.fade.alpha < 0.01, 15000));
  await shot('fork-entry-visible-party');
  assert.ok(await until(() => entry312.frames.some(f => f.party.some(a => a.emote === '!')), 3000), 'entry reaches exclamation');
  await shot('fork-entry-exclamation');
  const entryTiming = await page.evaluate(() => {
    const frames = entry312.frames, visible = frames.find(f => f.fade < 0.01 && !f.transitioning
      && f.party.length === 3 && f.party.every(a => a.visible !== false && a.x >= 0 && a.x < 480 && a.y >= 0 && a.y < 360));
    const exclamation = frames.find(f => f.party.some(a => a.emote === '!'));
    return { visible, exclamation, delay: visible && exclamation ? exclamation.at - visible.at : null };
  });
  check('party is visibly established for 0.6 seconds after fade before exclamation', entryTiming.delay >= 560, JSON.stringify(entryTiming));
  await page.waitForTimeout(650); await shot('fork-reveal-camera-mid');
  const pages = [], captured = new Set();
  let splitMotion = false;
  while (await page.evaluate(() => game.dialogue.running)) {
    assert.ok(await until(() => !game.dialogue.running || (game.textbox.isOpen && game.textbox.state === 'waiting'), 12000), 'script reaches readable dialogue or field');
    if (!await page.evaluate(() => game.dialogue.running)) break;
    const node = await page.evaluate(() => ({ text: game.textbox.node.text, speaker: game.textbox.node.speaker, voice: game.textbox.node.voice }));
    if (pages.at(-1)?.text !== node.text) pages.push(node);
    const captures = [['* 오 ㅎㅇ', 'fork-meeting'], ['* 하이', 'fork-mario-after-jump'],
      ['* 이상한 결계같은게 있는데 제가 들어가도 다시 튕겨져 나오더라구요', 'fork-torii-camera'],
      ['* 몬스터들이 나와요.', 'fork-upper-aperture'], ['* 몸조심하세요 형.', 'fork-farewell']];
    for (const [text, label] of captures) if (node.text === text && !captured.has(label)) {
      await shot(label); captured.add(label);
    }
    await press('KeyC', { delay: 45 }); await page.waitForTimeout(100);
    if (node.text === '* 아마 그럴거같아 요플래 부탁한다.' && !splitMotion) {
      await page.waitForTimeout(1500); await shot('fork-split-walk-mid'); splitMotion = true;
    }
  }
  assert.ok(await field());
  check('Mario jump plays existing mario_jump audio', await page.evaluate(() => entry312.sounds.some(sound => /mario_jump/.test(sound.src))));
  check('full introduction reaches farewell with narrator voice and silent Mario', pages.length === 25
    && pages.at(-1).text === '* 몸조심하세요 형.'
    && pages.some(node => node.text === '* 내가 저 길을 뚫을 수 있다고 말했다.' && node.voice === 'narrator')
    && pages.every(node => !node.speaker?.includes('마리오')), JSON.stringify(pages));
  const separated = await snapshot();
  check('split returns solo control with four defenders, camera follow and field BGM', separated.split && separated.party.length === 0
    && !separated.cameraLocked && separated.defenders.length === 4 && separated.defenders.every(actor => actor.visible && actor.y < separated.y && actor.facing === 'up')
    && separated.bgm === 'castle_right', JSON.stringify(separated));
  await sizes('fork-separated');
  await walk('ArrowUp', () => game.textbox.isOpen, 'north approach automatically warns after split');
  assert.ok(await until(() => game.textbox.state === 'waiting', 5000));
  check('north approach uses PPAMAN exact farewell line', await page.evaluate(() => game.textbox.node.text === '* 몸조심하세요 형.'
    && game.textbox.node.voice === 'ppaman' && game.textbox.node.speaker === '억빠맨'));
  await shot('fork-north-block-warning');
  await press('KeyC', { delay: 45 }); assert.ok(await field());
  await page.keyboard.down('ArrowUp'); await page.waitForTimeout(1200); await page.keyboard.up('ArrowUp');
  check('north blockade physically prevents walking past defenders', await page.evaluate(() => game.mapId === 'gajaeman_castle_fork'
    && game.player.y >= 400 && game.player.y <= 424 && !game.dialogue.running));
  await shot('fork-north-block-physical');
  await walk('ArrowDown', () => game.player.y >= 704, 'return to horizontal fork');
  await walk('ArrowLeft', () => game.player.x <= 388, 'return along west stone floor');
  await walk('ArrowDown', () => game.mapId === 'gajaeman_memory2', 'return to memory2'); assert.ok(await field());
  check('memory return preserves solo party after split', (await snapshot()).party.length === 0);
  await walk('ArrowUp', () => game.mapId === 'gajaeman_castle_fork', 're-enter fork'); assert.ok(await field());
  const reentered = await snapshot();
  check('re-entry skips replay and restores all four defenders', reentered.split && reentered.party.length === 0
    && reentered.defenders.every(actor => actor.visible && actor.facing === 'up' && actor.y <= 336), JSON.stringify(reentered));
  await fixture('production-save-and-continue', 'Persist the naturally completed split through production autosave, then read that unmodified save through continueGame. No flags, position, party or HP are injected.', async () => {
    game.autosave(); await game.continueGame();
  });
  assert.ok(await field());
  const continued = await snapshot();
  check('continue restores split, solo party, exact position and defenders', continued.map === reentered.map && continued.split && continued.party.length === 0
    && Math.abs(continued.x - reentered.x) < 2 && Math.abs(continued.y - reentered.y) < 2
    && JSON.stringify(continued.defenders) === JSON.stringify(reentered.defenders), JSON.stringify(continued));
  await walk('ArrowUp', () => game.player.y <= 680, 'approach horizontal torii road');
  await fixture('delayed-background-observer', 'Delay one required battle background image promise by six real seconds, including cached images, to expose loading continuity beyond the corridor length; no game state or clock is changed. Restore the production loader after that call.', () => {
    const cache = game.mapAssets, original = cache.image;
    cache.image = function (src) {
      const image = original.call(this, src);
      if (src !== 'assets/enemies/malzahar-background-warwick.png') return image;
      cache.image = original;
      entry312.delayedBackground = true;
      return Promise.all([image, new Promise(resolve => setTimeout(resolve, 6000))]).then(([result]) => result);
    };
  });
  await walk('ArrowRight', () => !!game.runner, 'walking through purple torii starts runner without C', 16000);
  await shot('torii-blue-ready');
  assert.ok(await until(() => game.runner?.core.phase === 'run', 4000), 'ready animation reaches run without C');
  await shot('torii-blue-running');
  const loadingReached = await until(() => game.battle?.state === 'load', 6000);
  assert.ok(loadingReached, `three-second run reaches battle asset loading: ${JSON.stringify(await page.evaluate(() => ({
    runner: game.runner && { cfg: game.runner.cfg, phase: game.runner.core.phase, elapsed: game.runner.core.elapsed, encounterStarted: game.runner.encounterStarted },
    battle: game.battle?.state, dialogue: game.dialogue.running, textbox: game.textbox.node,
  })))}`);
  await page.waitForTimeout(400); await shot('torii-running-during-battle-load');
  await page.waitForTimeout(4500); await shot('torii-running-after-corridor-load');
  assert.ok(await until(() => !!game.battle?.gimmick?.fullscreen, 7000), 'three-second run enters fullscreen Malzahar');
  await shot('torii-battle-continuation');
  const handoff = await page.evaluate(() => {
    const frames = entry312.frames, firstRun = frames.find(f => f.runner?.phase === 'run');
    const lastRun = frames.findLast(f => f.runner && !f.battle?.phase), firstBattle = frames.find(f => f.battle?.phase);
    const firstLoad = frames.find(f => f.battle?.state === 'load'), loading = frames.filter(f => f.battle?.state === 'load');
    return { firstRun, lastRun, firstBattle, duration: firstRun && firstLoad ? firstLoad.at - firstRun.at : null,
      loading: { count: loading.length, first: loading[0], last: loading.at(-1) },
      phases: [...new Set(frames.filter(f => f.runner).map(f => f.runner.phase))] };
  });
  check('automatic torii entry shows prep dash and three seconds of uninterrupted running', handoff.phases.includes('prep') && handoff.phases.includes('dash')
    && handoff.duration >= 2700 && handoff.duration <= 3400 && handoff.lastRun.runner.vx > 0 && handoff.firstBattle.battle.phase === 'run'
    && handoff.firstBattle.fade < 0.01, JSON.stringify(handoff));
  check('delayed battle loading keeps field movement animation and camera alive', handoff.loading.count >= 200
    && handoff.loading.last.at - handoff.loading.first.at >= 5500
    && handoff.loading.last.runner.phase === 'run' && handoff.loading.last.runner.vx > 0
    && handoff.loading.last.runner.animT > handoff.loading.first.runner.animT
    && handoff.loading.last.fade < 0.01 && handoff.firstBattle.battle.hudAlpha < 0.05, JSON.stringify(handoff.loading));
  await open({ qa: 'malzahar_arrival' }); assert.ok(await field());
  check('arrival checkpoint is solo with castle music', await page.evaluate(() => game.mapId === 'gajaeman_torii_end' && game.party.length === 0 && game.sound.bgmName === 'castle_right'));
  await shot('arrival-before-door');
  await walk('ArrowDown', () => game.player.y >= 480, 'reach arrival horizontal hallway');
  await walk('ArrowLeft', () => game.textbox.isOpen, 'walking left automatically gives narrator warning');
  assert.ok(await until(() => game.textbox.state === 'waiting', 5000));
  check('arrival left return is blocked with exact narrator line', await page.evaluate(() => game.textbox.node.text === '* 앞이 먼저다.'
    && game.textbox.node.voice === 'narrator' && !game.textbox.node.speaker));
  await shot('arrival-left-warning');
  await press('KeyC', { delay: 45 }); assert.ok(await field());
  await page.keyboard.down('ArrowLeft'); await page.waitForTimeout(1000); await page.keyboard.up('ArrowLeft');
  check('arrival left boundary physically prevents backtracking', await page.evaluate(() => game.mapId === 'gajaeman_torii_end' && game.player.x >= 608 && game.player.x < 632));
  await shot('arrival-left-physical');
  await walk('ArrowRight', () => game.player.x >= 692, 'return to north door alignment');
  await walk('ArrowUp', () => game.player.probe()?.id === 'castle_torii_end_door', 'reach north door with normal movement');
  await press('KeyC', { delay: 45 });
  assert.ok(await until(() => game.mapId === 'gajaeman_castle_orb', 15000));
  assert.ok(await field());
  check('north door C enters the BUILD311 orb room with solo party and requested music', await page.evaluate(() =>
    game.party.length === 0 && game.sound.bgmName === 'castle_orb' && !game.flags.castle_right_seal_active));
  await shot('arrival-orb-room');
});
