import assert from 'node:assert/strict';
import { runScenario } from './lib/harness.mjs';

const ENCOUNTERS = Object.freeze([
  { id: 'seobruto', flag: 'gajaeman_memory1_seobruto_defeated', shapes: [['memory_rasengan'], ['memory_shuriken'], ['memory_rasengan', 'memory_shuriken']] },
  { id: 'jiroesub', flag: 'gajaeman_memory2_jiroesub_defeated', shapes: [['memory_kuromi'], ['memory_mine'], ['memory_web']] },
  { id: 'udyrsub', flag: 'gajaeman_memory2_udyrsub_defeated', shapes: [['memory_claw'], ['memory_mantle', 'memory_stampede'], ['memory_storm']] },
]);

await runScenario({ name: 'castle-memory', launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] } }, async ({ page, open, until, press, shot, fixture, check }) => {
  const key = async code => { await press(code, { delay: 45 }); await page.waitForTimeout(100); };
  const field = () => until(() => game.state === 'field' && !game.battle && !game.dialogue.running && !game.transitioning && game.fade.alpha < 0.01, 25000);
  const walk = async (code, predicate, label, timeout = 15000) => {
    await page.keyboard.down(code);
    try { assert.ok(await until(predicate, timeout), label); }
    finally { await page.keyboard.up(code); }
    await page.waitForTimeout(100);
  };
  const state = () => page.evaluate(() => ({ map: game.mapId, x: Math.round(game.player.x), y: Math.round(game.player.y), facing: game.player.facing,
    bgm: game.sound.bgmName, battle: game.battle?.state || null, flags: { ...game.flags },
    enemies: game.entities.filter(entity => entity.def?.type === 'enemy' && !entity.dead).map(entity => entity.id),
  }));
  const settleDialogue = async () => {
    const pages = [];
    const done = await until(() => !game.dialogue.running || (game.textbox.isOpen && game.textbox.state === 'waiting'), 8000);
    assert.ok(done, 'dialogue reaches a waiting page');
    while (await page.evaluate(() => game.dialogue.running)) {
      const text = await page.evaluate(() => game.textbox.node?.text || '');
      if (text && pages.at(-1) !== text) pages.push(text);
      await key('KeyC');
      await until(() => !game.dialogue.running || (game.textbox.isOpen && game.textbox.state === 'waiting'), 5000);
    }
    return pages;
  };
  const finishIntro = async () => {
    assert.ok(await until(() => game.battle?.state === 'intro' && game.battle.members.every(member => member.frames) && game.battle.enemies.every(enemy => enemy.img), 30000), 'battle loads');
    while (await page.evaluate(() => game.battle?.state === 'intro')) {
      const ready = await page.evaluate(() => game.battle.typed && game.battle.t > 0.65);
      if (ready) await key('KeyC'); else await page.waitForTimeout(80);
    }
    assert.ok(await until(() => game.battle?.state === 'menu', 5000), 'battle menu opens');
  };
  const pickAll = async () => {
    for (let member = 0; member < 3; member++) {
      assert.equal(await page.evaluate(() => game.battle.state), 'menu');
      await key('KeyC'); assert.equal(await page.evaluate(() => game.battle.state), 'target');
      await key('KeyC');
    }
  };
  const observePattern = async (enemy, patternIndex, expectedShapes) => {
    await pickAll();
    assert.ok(await until(() => game.battle?.state === 'enemy-prep', 10000), `${enemy} pattern ${patternIndex + 1} prepares`);
    assert.equal(await page.evaluate(() => game.sound.bgmName), 'castle_battle');
    assert.ok(await until(() => game.battle?.state === 'bullets', 8000), `${enemy} pattern ${patternIndex + 1} starts`);
    await fixture(`${enemy}-pattern-${patternIndex + 1}-observer`, 'Keep the soul invulnerable only while observing this full configured hazard timeline; warning, hazard emission, cast frames and return are real, but this is not evidence of human avoidance difficulty.', () => { game.battle.soul.invuln = 999; });
    let warning = false, active = false, maxBullets = 0;
    const frames = new Set(), shapes = new Set(); let captured = false;
    const started = Date.now();
    while (Date.now() - started < 10000) {
      const sample = await page.evaluate(() => {
        const battle = game.battle;
        if (!battle) return null;
        return { state: battle.state, pose: battle.enemies[0]?.patternPose?.frame,
          bullets: battle.bullets.map(bullet => ({ shape: bullet.shape, age: bullet.age, warn: bullet.warn, harmless: bullet.harmless })),
        };
      });
      if (!sample || sample.state !== 'bullets') break;
      if (sample.pose !== undefined && sample.pose !== null) frames.add(sample.pose);
      maxBullets = Math.max(maxBullets, sample.bullets.length);
      for (const bullet of sample.bullets) {
        if (bullet.shape) shapes.add(bullet.shape);
        if (!bullet.harmless && bullet.age < bullet.warn) warning = true;
        if (!bullet.harmless && bullet.age >= bullet.warn) active = true;
      }
      if (!captured && warning && active && frames.has(1) && (frames.has(2) || enemy === 'jiroesub' && patternIndex === 2)) {
        await shot(`${enemy}-pattern-${patternIndex + 1}`);
        captured = true;
      }
      await page.waitForTimeout(40);
    }
    assert.ok(await until(() => game.battle?.state === 'menu', 8000), `${enemy} pattern ${patternIndex + 1} returns to menu`);
    const expectedFrames = enemy === 'jiroesub' && patternIndex === 2 ? [1, 0, 3] : [1, 2, 3];
    check(`${enemy} pattern ${patternIndex + 1} has warning, active hazard, cast and recovery`, warning && active && maxBullets > 0 && expectedFrames.every(frame => frames.has(frame)), JSON.stringify({ frames: [...frames], shapes: [...shapes], maxBullets }));
    check(`${enemy} pattern ${patternIndex + 1} emits its configured hazards`, expectedShapes.every(shape => shapes.has(shape)), JSON.stringify([...shapes]));
  };
  const encounter = async config => {
    assert.ok(await until(() => !!game.battle, 12000), `${config.id} natural collision starts battle`);
    await finishIntro();
    const initial = await page.evaluate(() => ({ id: game.battle.enemies[0].id, hp: game.battle.enemies[0].maxHp,
      patterns: game.battle.enemies[0].def.patterns.map(pattern => pattern.type), bgm: game.sound.bgmName }));
    check(`${config.id} starts at HP50 with three patterns and castle BGM`, initial.id === config.id && initial.hp === 50 && initial.patterns.length === 3 && initial.bgm === 'castle_battle', JSON.stringify(initial));
    if (config.id === 'seobruto') {
      for (const width of [375, 768, 1280]) { await page.setViewportSize({ width, height: 900 }); await page.waitForTimeout(120); await shot(`battle-intro-${width}`); }
      await page.setViewportSize({ width: 1000, height: 780 });
      const palette = await page.evaluate(() => {
        const canvas = document.querySelector('canvas'), ctx = canvas.getContext('2d');
        const pixels = ctx.getImageData(0, 0, canvas.width, Math.floor(canvas.height * 0.68)).data;
        let black = 0, purple = 0;
        for (let offset = 0; offset < pixels.length; offset += 4) {
          const r = pixels[offset], g = pixels[offset + 1], b = pixels[offset + 2];
          if (r < 24 && g < 24 && b < 28) black++;
          if (b > g + 6 && r > g + 4 && b > 25) purple++;
        }
        return { black, purple, sampled: pixels.length / 4 };
      });
      check('battle background visibly contains black field and purple aura', palette.black > palette.sampled * 0.45 && palette.purple > 100, JSON.stringify(palette));
    }
    for (let index = 0; index < config.shapes.length; index++) await observePattern(config.id, index, config.shapes[index]);
    await fixture(`${config.id}-victory-boundary`, 'After observing all three full enemy turns, set only the remaining enemy HP to one so the standard victory/return/save path finishes promptly.', () => { game.battle.enemies[0].hp = 1; });
    await pickAll();
    assert.ok(await until(() => game.battle?.state === 'win', 10000), `${config.id} reaches standard win`);
    await shot(`${config.id}-win`);
    await until(() => game.battle?.typed && game.battle.t > 0.65, 5000); await key('KeyC');
    assert.ok(await field(), `${config.id} returns to field`);
    const returned = await state();
    check(`${config.id} win persists and restores castle field BGM`, returned.flags[config.flag] === true && returned.bgm === 'castle_right' && !returned.enemies.includes(config.id), JSON.stringify(returned));
  };

  await open({ qa: 'castle_memory_door' }); assert.ok(await field());
  for (const width of [375, 768, 1280]) { await page.setViewportSize({ width, height: 900 }); await page.waitForTimeout(120); await shot(`memory-door-${width}`); }
  await page.setViewportSize({ width: 1000, height: 780 });
  await walk('ArrowRight', () => game.player.x >= 438, 'walk reaches sign'); await key('ArrowUp'); await key('KeyC');
  const signPages = await settleDialogue();
  check('right-hand sign is reachable and delivers all three pages', signPages.length === 3, JSON.stringify(signPages));
  await walk('ArrowLeft', () => game.player.x <= 380, 'walk returns to door'); await key('ArrowUp'); await key('KeyC');
  assert.ok(await until(() => game.mapId === 'gajaeman_memory1', 10000), 'C on door enters memory map'); assert.ok(await field());
  check('door entry lands on memory1 with castle field BGM', (await state()).bgm === 'castle_right', JSON.stringify(await state()));
  for (const width of [375, 768, 1280]) { await page.setViewportSize({ width, height: 900 }); await page.waitForTimeout(120); await shot(`memory1-start-${width}`); }
  await page.setViewportSize({ width: 1000, height: 780 });
  await walk('ArrowUp', () => game.player.y <= 850, 'memory1 north leg');
  await walk('ArrowRight', () => !!game.battle, 'memory1 east leg reaches Seobruto', 12000); await encounter(ENCOUNTERS[0]);
  await walk('ArrowRight', () => game.player.x >= 1100, 'memory1 east leg completes');
  await walk('ArrowUp', () => game.player.y <= 230, 'memory1 second north leg');
  await walk('ArrowLeft', () => game.mapId === 'gajaeman_memory2', 'memory1 west leg enters memory2', 12000); assert.ok(await field());
  check('memory1 follows up/right/up/left route into memory2', (await state()).map === 'gajaeman_memory2', JSON.stringify(await state()));
  for (const width of [375, 768, 1280]) { await page.setViewportSize({ width, height: 900 }); await page.waitForTimeout(120); await shot(`memory2-start-${width}`); }
  await page.setViewportSize({ width: 1000, height: 780 });
  await walk('ArrowLeft', () => !!game.battle, 'memory2 west leg reaches Jiroesub', 12000); await encounter(ENCOUNTERS[1]);
  await walk('ArrowLeft', () => game.player.x <= 270, 'memory2 west leg completes');
  await walk('ArrowUp', () => game.player.y <= 850, 'memory2 north leg completes');
  await walk('ArrowRight', () => !!game.battle, 'memory2 east leg reaches Udyrsub', 12000); await encounter(ENCOUNTERS[2]);
  await walk('ArrowRight', () => game.player.x >= 1270, 'memory2 east leg completes');
  await page.keyboard.down('ArrowUp'); await page.waitForTimeout(4000); await page.keyboard.up('ArrowUp');
  const wallY = await page.evaluate(() => game.player.y);
  await page.keyboard.down('ArrowUp'); await page.waitForTimeout(500); await page.keyboard.up('ArrowUp');
  check('memory end stops at final wall with all three flags', await page.evaluate(y => game.mapId === 'gajaeman_memory2' && Math.abs(game.player.y - y) < 2
    && ['gajaeman_memory1_seobruto_defeated', 'gajaeman_memory2_jiroesub_defeated', 'gajaeman_memory2_udyrsub_defeated'].every(flag => game.flags[flag]), wallY), JSON.stringify({ wallY, state: await state() }));
  await shot('memory-end');
  const beforeSave = await state();
  await fixture('save-and-continue-memory-end', 'Persist the naturally completed route through game.autosave, then reload the unmodified save through production continueGame.', async () => { game.autosave(); await game.continueGame(); });
  assert.ok(await field());
  const continued = await state();
  check('save/continue restores final map, position and defeated encounters', continued.map === beforeSave.map && Math.abs(continued.x - beforeSave.x) < 4 && Math.abs(continued.y - beforeSave.y) < 4
    && ENCOUNTERS.every(config => continued.flags[config.flag]), JSON.stringify({ beforeSave, continued }));
  await fixture('return-leg-position', 'Place the completed party beside the existing map2 return threshold; flags and save data are not modified.', () => { game.player.x = 1570; game.player.y = 1576; game.player.facing = 'right'; game.player.trail = []; game.camera.snap(); });
  await walk('ArrowRight', () => game.mapId === 'gajaeman_memory1', 'return to memory1'); assert.ok(await field());
  await fixture('memory1-exit-position', 'Place the completed party beside the existing map1 south return threshold; flags and save data are not modified.', () => { game.player.x = 260; game.player.y = 1510; game.player.facing = 'down'; game.player.trail = []; game.camera.snap(); });
  await walk('ArrowDown', () => game.mapId === 'gajaeman_castle_right1', 'return to castle corridor'); assert.ok(await field());
  await page.keyboard.down('ArrowUp'); await page.waitForTimeout(900); await page.keyboard.up('ArrowUp'); await page.waitForTimeout(100);
  check('completed return reaches the interactive memory door', await page.evaluate(() => game.player.probe()?.id === 'castle_memory_door'), JSON.stringify(await state()));
  await key('KeyC'); assert.ok(await until(() => game.mapId === 'gajaeman_memory1', 10000)); assert.ok(await field());
  const reentered = await state();
  check('re-entering completed memory route keeps defeated enemy absent', reentered.flags.gajaeman_memory1_seobruto_defeated && !reentered.enemies.includes('seobruto'), JSON.stringify(reentered));
  for (const qa of ['gajaeman_memory1', 'memory_seobruto', 'gajaeman_memory2', 'memory_jiroesub', 'memory_udyrsub', 'memory_end']) {
    await open({ qa }); assert.ok(await field());
    check(`QA checkpoint ${qa} opens`, ['gajaeman_memory1', 'gajaeman_memory2'].includes((await state()).map), JSON.stringify(await state()));
  }
});
