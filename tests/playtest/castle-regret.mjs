import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { runScenario } from './lib/harness.mjs';

const ENCOUNTERS = [
  { id: 'yisub', qa: 'castle_regret_yi', direction: 'ArrowRight', flag: 'gajaeman_regret1_yisub_defeated', ids: ['yisub'],
    shapes: [['regret_alpha_slash'], ['regret_wuju_blade'], ['regret_wuju_blade']] },
  { id: 'syndrasub', qa: 'castle_regret_syndra', direction: 'ArrowLeft', flag: 'gajaeman_regret2_syndrasub_defeated', ids: ['syndrasub'],
    shapes: [['regret_dark_sphere'], ['regret_force_drop', 'regret_force_ripple'], ['regret_dark_sphere']] },
  { id: 'taliyahsub', qa: 'castle_regret_duo', direction: 'ArrowRight', flag: 'gajaeman_regret2_taliyahsub_defeated', ids: ['taliyahsub', 'aurelionsub'],
    shapes: [['taliyah_threaded_stone', 'taliyah_worked_ground', 'aurelion_singularity_core', 'aurelion_accretion_stars'],
      ['taliyah_seismic_shove', 'taliyah_unraveled_mine', 'aurelion_locked_breath'],
      ['taliyah_wall_spur', 'taliyah_wall_crosspiece', 'aurelion_falling_star', 'aurelion_stardust_shockwave']] },
];

await runScenario({ name: 'castle-regret', launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] } }, async ({ page, open, until, press, shot, fixture, check }) => {
  const base = process.env.QA_BASE_URL || 'http://localhost:8000/';
  const sourceRoot = process.env.QA_RESULT_FILE
    ? JSON.parse(fs.readFileSync(path.join(path.dirname(process.env.QA_RESULT_FILE), '..', 'summary.json'), 'utf8')).cwd
    : process.cwd();
  const sourceFiles = ['src/core/story.js', 'src/data/enemies.js', 'src/data/characters.js', 'src/data/cutscenes/castle_regret.js',
    'src/battle/bullets.js', 'src/battle/castle-regret-duel-patterns.js', 'src/battle/castle-regret-cosmic-patterns.js',
    'assets/maps/gajaeman_castle_left1.json', 'assets/maps/gajaeman_regret1.json', 'assets/maps/gajaeman_regret2.json'];
  for (const file of sourceFiles) {
    const local = fs.readFileSync(path.join(sourceRoot, file));
    const response = await fetch(new URL(file, base));
    const served = Buffer.from(await response.arrayBuffer());
    const hash = data => createHash('sha256').update(data).digest('hex');
    check(`served source identity ${file}`, response.ok && hash(local) === hash(served), JSON.stringify({ local: hash(local), served: hash(served) }));
  }
  const key = async code => { await press(code, { delay: 45 }); await page.waitForTimeout(100); };
  const field = () => until(() => window.game?.state === 'field' && !game.battle && !game.dialogue.running && !game.transitioning && game.fade.alpha < 0.01, 25000);
  const state = () => page.evaluate(() => ({ map: game.mapId, x: game.player.x, y: game.player.y, flags: { ...game.flags },
    bgm: game.sound.bgmName, money: game.money, enemies: game.entities.filter(e => e.def?.type === 'enemy' && !e.dead).map(e => e.id) }));
  const responsive = async name => {
    for (const width of [375, 1280]) { await page.setViewportSize({ width, height: 900 }); await page.waitForTimeout(120); await shot(`${name}-${width}`); }
    await page.setViewportSize({ width: 1000, height: 780 });
  };
  const walk = async (code, predicate, label, timeout = 15000) => {
    await page.keyboard.down(code);
    try { assert.ok(await until(predicate, timeout), `${label}: ${JSON.stringify(await state())}`); }
    finally { await page.keyboard.up(code); }
    await page.waitForTimeout(80);
    check(label, true, JSON.stringify(await state()));
  };
  const dialogue = async name => {
    const seen = [];
    assert.ok(await until(() => game.dialogue.running && game.textbox.isOpen, 5000));
    while (await page.evaluate(() => game.dialogue.running)) {
      assert.ok(await until(() => !game.dialogue.running || game.textbox.state === 'waiting', 10000));
      if (!await page.evaluate(() => game.dialogue.running)) break;
      const node = await page.evaluate(() => ({ speaker: game.textbox.node?.speaker, text: game.textbox.node?.text }));
      seen.push(node); await responsive(`${name}-${seen.length}`); await key('KeyC');
    }
    assert.ok(await field()); return seen;
  };
  const selectAttacks = async () => {
    for (let index = 0; index < 3; index++) {
      assert.equal(await page.evaluate(() => game.battle?.state), 'menu');
      await key('KeyC'); assert.equal(await page.evaluate(() => game.battle?.state), 'target');
      await key('KeyC');
    }
  };
  const finishIntro = async () => {
    assert.ok(await until(() => game.battle?.state === 'intro' && game.battle.members.every(m => m.frames) && game.battle.enemies.every(e => e.img), 30000));
    while (await page.evaluate(() => game.battle?.state === 'intro')) {
      if (await page.evaluate(() => game.battle.typed && game.battle.t > 0.65)) await key('KeyC');
      else await page.waitForTimeout(80);
    }
    assert.ok(await until(() => game.battle?.state === 'menu', 5000));
  };
  const observeTurn = async (config, turn) => {
    const index = turn % 3, speaker = config.ids.length === 2 && turn >= 3 ? 'aurelionsub' : config.id;
    await fixture(`${config.id}-turn${turn + 1}-speaker`, 'Choose only the production random speaker for this turn so each pattern hint is visibly observed. Pattern factories and their three-turn cycle remain production code.', upper => {
      game.battle.rnd = () => upper ? 0.99 : 0.01;
    }, speaker === 'aurelionsub');
    const expected = await page.evaluate(id => { const e = game.battle.enemies.find(e => e.id === id); return e.def.patterns[e.patternIdx % e.def.patterns.length]; }, speaker);
    await selectAttacks();
    assert.ok(await until(() => game.battle?.state === 'enemy-prep', 10000));
    assert.ok(await until(() => game.battle.bubble?.shown === game.battle.bubble?.text.length, 7000));
    const hint = await page.evaluate(() => ({ speaker: game.battle.bubble?.enemy.id, text: game.battle.bubble?.text }));
    check(`${speaker} pattern${index + 1} displays its preattack hint`, hint.speaker === speaker && Boolean(expected.speak) && hint.text === expected.speak, JSON.stringify(hint));
    await shot(`${speaker}-p${index + 1}-hint`);
    assert.ok(await until(() => game.battle?.state === 'bullets', 8000));
    await fixture(`${config.id}-turn${turn + 1}-observation`, 'Keep the soul invulnerable during the complete real-time timeline. This verifies warning, release, rendering and turn return; it is not human avoidance or combat-balance evidence.', () => { game.battle.soul.invuln = 999; });
    const frames = Object.fromEntries(config.ids.map(id => [id, new Set()]));
    const warnings = new Set(), active = new Set(), captured = new Set();
    const started = Date.now();
    while (Date.now() - started < 12000) {
      const sample = await page.evaluate(() => ({ state: game.battle?.state, poses: game.battle?.enemies.map(e => ({ id: e.id, frame: e.patternPose?.frame })),
        bullets: game.battle?.bullets.map(b => ({ shape: b.shape, age: b.age, warn: b.warn, harmless: b.harmless })) }));
      if (sample.state !== 'bullets') break;
      for (const pose of sample.poses) if (pose.frame !== undefined) frames[pose.id].add(pose.frame);
      for (const b of sample.bullets) if (!b.harmless) (b.age < b.warn ? warnings : active).add(b.shape);
      for (const id of config.ids) {
        const prefix = id === 'aurelionsub' ? 'aurelion_' : id === 'taliyahsub' ? 'taliyah_' : 'regret_';
        const pose = sample.poses.find(e => e.id === id)?.frame;
        for (const [phase, frame, shapes] of [['warning', 1, warnings], ['release', 2, active]]) {
          const name = `${id}-${phase}`;
          if (turn < 3 && !captured.has(name) && pose === frame && [...shapes].some(shape => shape?.startsWith(prefix))) {
            await shot(`${id}-p${index + 1}-${phase}`); captured.add(name);
          }
        }
      }
      await page.waitForTimeout(30);
    }
    assert.ok(await until(() => game.battle?.state === 'menu', 8000));
    for (const id of config.ids) check(`${id} pattern${index + 1} cast preparation and release`, frames[id].has(1) && frames[id].has(2), JSON.stringify([...frames[id]]));
    check(`${config.id} turn${turn + 1} warns then activates every intended hazard`, config.shapes[index].every(shape => warnings.has(shape) && active.has(shape)), JSON.stringify({ warnings: [...warnings], active: [...active] }));
    check(`${config.id} turn${turn + 1} cleans hazards and cast pose before menu`, await page.evaluate(() => game.battle.bullets.length === 0 && game.battle.enemies.every(e => !e.patternPose)));
    if (turn < 3) check(`${config.id} turn${turn + 1} captures each actor warning and release`, captured.size === config.ids.length * 2, JSON.stringify([...captured]));
  };
  let battleCount = 0;
  const encounter = async config => {
    battleCount++;
    await finishIntro();
    const before = await page.evaluate(() => ({ money: game.money, bgm: game.sound.bgmName, enemies: game.battle.enemies.map(e => ({ id: e.id, hp: e.hp, maxHp: e.maxHp, patterns: e.def.patterns.length, money: e.def.money })) }));
    check(`${config.id} actual encounter has correct HP45 roster and three patterns each`, JSON.stringify(before.enemies.map(e => e.id)) === JSON.stringify(config.ids) && before.enemies.every(e => e.hp === 45 && e.maxHp === 45 && e.patterns === 3) && before.bgm === 'castle_battle', JSON.stringify(before));
    assert.ok(await until(() => game.battle?.typed, 7000));
    await responsive(`${config.id}-battle-neutral`);
    if (config.ids.includes('aurelionsub')) {
      for (let frame = 0; frame < 4; frame++) {
        await fixture(`aurelion-frame${frame}-layout`, 'Select one authored cast-sheet frame for a static browser render and alpha pixel bounds audit. This is visual-layout preparation only; natural pattern animation is observed separately in real turns.', frame => {
          game.battle.enemies.find(e => e.id === 'aurelionsub').patternPose = { sheet: 'cast', frame };
        }, frame);
        const bounds = await page.evaluate(() => {
          const b = game.battle, e = b.enemies.find(e => e.id === 'aurelionsub');
          const canvas = document.createElement('canvas'); canvas.width = 600; canvas.height = 360;
          const ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = false;
          b.drawEnemy(ctx, e);
          const pixels = ctx.getImageData(0, 0, 600, 360).data;
          let left = 600, right = 0, top = 360, bottom = 0, count = 0;
          for (let y = 0; y < 360; y++) for (let x = 0; x < 600; x++) if (pixels[(y * 600 + x) * 4 + 3] > 0) {
            left = Math.min(left, x); right = Math.max(right, x + 1); top = Math.min(top, y); bottom = Math.max(bottom, y + 1); count++;
          }
          return { left, right, top, bottom, count, boardRight: 240 + b.boardSize()[0] / 2 };
        });
        check(`Aurelion frame${frame} opaque pixels clear arena and right screen edge`, bounds.count > 0 && bounds.left >= bounds.boardRight && bounds.right <= 480 && bounds.top >= 0 && bounds.bottom <= 246, JSON.stringify(bounds));
        await shot(`aurelionsub-frame${frame}-layout`);
      }
      await fixture('aurelion-layout-restore', 'Remove only the static pose override before exercising production turn animation.', () => { game.battle.enemies.find(e => e.id === 'aurelionsub').patternPose = null; });
    }
    await fixture(`${config.id}-observation-hp`, 'After asserting production HP45, enlarge remaining HP to500 for all complete pattern turns. Keep maxHp45 so this fixture cannot hide the displayed production maximum. Victory boundaries below restore remaining HP only.', () => { for (const e of game.battle.enemies) e.hp = 500; });
    for (let turn = 0; turn < (config.ids.length === 2 ? 6 : 3); turn++) await observeTurn(config, turn);
    if (config.ids.length === 2) {
      await fixture('duo-first-defeat-boundary', 'Reduce only Taliyah current HP to1; Aurelion remains alive. Actual menu attacks must kill Taliyah without winning the encounter.', () => { game.battle.enemies[0].hp = 1; });
      await selectAttacks();
      assert.ok(await until(() => game.battle?.enemies[0].hp <= 0 && game.battle.state === 'enemy-prep', 12000));
      check('duo requires both enemies defeated before victory', await page.evaluate(() => game.battle.enemies[1].hp > 0 && !game.flags.gajaeman_regret2_taliyahsub_defeated && game.battle.state !== 'win'));
      await shot('duo-one-remains');
      assert.ok(await until(() => game.battle?.state === 'bullets', 8000));
      await fixture('duo-survivor-turn', 'Observe the survivor full turn with invulnerability; no victory/state flags are injected.', () => { game.battle.soul.invuln = 999; });
      assert.ok(await until(() => game.battle?.state === 'menu', 12000));
    }
    await fixture(`${config.id}-victory-boundary`, 'Set only surviving enemy current HP to1, then use real attack selection to exercise standard victory, reward, field return and persistence.', () => { for (const e of game.battle.enemies) if (e.hp > 0) e.hp = 1; });
    await selectAttacks(); assert.ok(await until(() => game.battle?.state === 'win', 12000));
    await shot(`${config.id}-win`);
    assert.ok(await until(() => game.battle?.typed && game.battle.t > 0.65, 5000)); await key('KeyC'); assert.ok(await field());
    const after = await state();
    check(`${config.id} victory removes encounter and restores field music`, after.flags[config.flag] && !after.enemies.includes(config.id) && after.bgm === 'castle_regret', JSON.stringify(after));
    check(`${config.id} rewards all combatants exactly once`, after.money - before.money === before.enemies.reduce((sum, e) => sum + e.money, 0), JSON.stringify({ before: before.money, after: after.money }));
  };

  if (process.env.REGRET_PHASE === 'targets') {
    const config = ENCOUNTERS[2];
    await open({ qa: config.qa }); assert.ok(await field());
    await walk(config.direction, () => !!game.battle, 'duo target-menu actual collision'); await finishIntro();
    await key('KeyC');
    assert.ok(await until(() => game.battle?.state === 'target', 5000));
    const roster = await page.evaluate(() => game.battle.enemies.map(e => ({ id: e.id, name: e.def.name, hp: e.hp, maxHp: e.maxHp })));
    check('target menu retains both production HP45 combatants before any HP fixture', JSON.stringify(roster.map(e => e.id)) === JSON.stringify(config.ids) && roster.every(e => e.hp === 45 && e.maxHp === 45), JSON.stringify(roster));
    await responsive('duo-target-menu-hp45');
    return;
  }
  if (process.env.REGRET_PHASE === 'hints') {
    for (const [config, index] of [[ENCOUNTERS[0], 2], [ENCOUNTERS[1], 0]]) {
      await open({ qa: config.qa }); assert.ok(await field());
      await walk(config.direction, () => !!game.battle, `${config.id} checkpoint actual collision`); await finishIntro();
      await fixture(`${config.id}-hint${index + 1}-capture-window`, 'Select only the requested pattern index and extend its preattack minimum hold to8seconds so both viewport screenshots capture fully typed text. Production text and rendering are unchanged; this is not normal timing evidence.', index => {
        const e = game.battle.enemies[0]; e.patternIdx = index; e.def.patterns[index].speakDuration = 8;
      }, index);
      await selectAttacks(); assert.ok(await until(() => game.battle?.state === 'enemy-prep' && game.battle.bubble?.shown === game.battle.bubble?.text.length, 12000));
      const hint = await page.evaluate(() => ({ text: game.battle.bubble.text, shown: game.battle.bubble.shown, expected: game.battle.enemies[0].def.patterns[game.battle.enemies[0].patternIdx].speak }));
      check(`${config.id} polished hint is fully typed and exact`, hint.text === hint.expected && hint.shown === hint.text.length, JSON.stringify(hint));
      await responsive(`${config.id}-p${index + 1}-hint-polished`);
    }
    await open({ qa: 'castle_regret_entry' }); assert.ok(await field());
    await walk('ArrowUp', () => game.player.y <= 160, 'fresh bridge route reaches sign approach');
    await walk('ArrowRight', () => game.player.x >= 438, 'fresh sign right approach'); await key('ArrowUp'); await key('KeyC');
    const sign = await dialogue('sign-polished');
    check('fresh fully typed sign preserves exact two requested lines', JSON.stringify(sign) === JSON.stringify([{ speaker: '억빠맨', text: '* 후회의방 이라고 적혀있어요' }, { speaker: '경섭', text: '* 후회? 뭘까..' }]), JSON.stringify(sign));
    return;
  }
  if (['patterns', 'duo'].includes(process.env.REGRET_PHASE)) {
    for (const config of ENCOUNTERS.filter(config => process.env.REGRET_PHASE !== 'duo' || config.ids.length === 2)) {
      await open({ qa: config.qa }); assert.ok(await field());
      await walk(config.direction, () => !!game.battle, `${config.id} checkpoint actual collision`);
      await encounter(config);
    }
    return;
  }
  await open({ qa: 'castle_regret_entry' }); assert.ok(await field());
  check('bridge starts with selected field BGM and no encounter', (await state()).bgm === 'castle_regret' && (await state()).enemies.length === 0, JSON.stringify(await state()));
  await responsive('bridge-entry');
  await walk('ArrowUp', () => game.player.y <= 948, 'first bridge reaches spring branch');
  await walk('ArrowRight', () => game.player.x >= 532, 'spring pocket is walkable'); await key('ArrowUp');
  check('spring is reachable by normal C probe', await page.evaluate(() => game.player.probe()?.id === 'castle_regret_spring'));
  await fixture('spring-damaged-party', 'Damage the three party members before using the normal spring C interaction; this tests real healing without requiring a preceding combat.', () => { for (const id of ['hyungsub', ...game.party]) game.partyHp[id] = 1; });
  await key('KeyC'); await dialogue('spring-heal');
  check('spring restores every party member', await page.evaluate(() => ['hyungsub', ...game.party].every(id => game.hpOf(id) === game.maxHpOf(id))));
  await walk('ArrowLeft', () => game.player.x <= 372, 'return from spring pocket to bridge');
  await walk('ArrowUp', () => game.player.y <= 160, 'walk reaches north door'); await responsive('door-approach');
  await walk('ArrowRight', () => game.player.x >= 438, 'walk reaches right sign'); await key('ArrowUp');
  check('right sign is reachable by normal C probe', await page.evaluate(() => game.player.probe()?.id === 'castle_regret_sign'));
  await key('KeyC'); const sign = await dialogue('sign');
  check('sign has exact two speakers and requested wording', JSON.stringify(sign) === JSON.stringify([{ speaker: '억빠맨', text: '* 후회의방 이라고 적혀있어요' }, { speaker: '경섭', text: '* 후회? 뭘까..' }]), JSON.stringify(sign));
  await walk('ArrowLeft', () => game.player.x <= 372, 'return to small door'); await key('ArrowUp');
  check('north door waits for C', (await state()).map === 'gajaeman_castle_left1'); await key('KeyC');
  assert.ok(await until(() => game.mapId === 'gajaeman_regret1', 12000)); assert.ok(await field()); await responsive('regret1-entry');
  await walk('ArrowUp', () => game.player.y <= 968, 'regret1 north leg');
  await walk('ArrowRight', () => !!game.battle, 'first map naturally encounters Yi'); await encounter(ENCOUNTERS[0]);
  await walk('ArrowRight', () => game.player.x >= 1030, 'regret1 east leg'); await walk('ArrowUp', () => game.player.y <= 328, 'regret1 upper leg');
  await walk('ArrowLeft', () => game.mapId === 'gajaeman_regret2', 'regret1 west exit reaches regret2'); assert.ok(await field()); await responsive('regret2-entry');
  await walk('ArrowLeft', () => !!game.battle, 'second map naturally encounters Syndra'); await encounter(ENCOUNTERS[1]);
  await walk('ArrowLeft', () => game.player.x <= 324, 'regret2 west leg'); await walk('ArrowUp', () => game.player.y <= 808, 'regret2 north bend');
  await walk('ArrowRight', () => !!game.battle, 'second map Taliyah contact starts duo'); await encounter(ENCOUNTERS[2]);
  await walk('ArrowRight', () => game.player.x >= 1252, 'regret2 east leg'); await walk('ArrowUp', () => game.player.y <= 200, 'regret2 final north leg'); await responsive('regret2-end');
  const completed = await state();
  check('full route has exactly three encountered battles and all defeat flags', battleCount === 3 && ENCOUNTERS.every(c => completed.flags[c.flag]), JSON.stringify(completed));
  const beforeSave = await state();
  await fixture('save-and-continue-regret', 'Save the completed three-encounter route with production autosave and continueGame. No save contents or defeated flags are edited.', async () => { game.autosave(); await game.continueGame(); }); assert.ok(await field());
  const restored = await state();
  check('save continue preserves position money flags and absent enemies', restored.map === beforeSave.map && Math.abs(restored.x - beforeSave.x) < 4 && Math.abs(restored.y - beforeSave.y) < 4 && restored.money === beforeSave.money && ENCOUNTERS.every(c => restored.flags[c.flag]) && restored.enemies.length === 0, JSON.stringify(restored));
  await walk('ArrowDown', () => game.player.y >= 808, 'return south final leg'); await walk('ArrowLeft', () => game.player.x <= 324, 'return west mid leg');
  await walk('ArrowDown', () => game.player.y >= 1448, 'return south lower leg'); await walk('ArrowRight', () => game.mapId === 'gajaeman_regret1', 'return regret2 to regret1'); assert.ok(await field());
  check('revisited regret1 does not respawn Yi', !(await state()).enemies.includes('yisub'));
  await walk('ArrowRight', () => game.player.x >= 1030, 'regret1 return east'); await walk('ArrowDown', () => game.player.y >= 968, 'regret1 return south');
  await walk('ArrowLeft', () => game.player.x <= 260, 'regret1 return west'); await walk('ArrowDown', () => game.mapId === 'gajaeman_castle_left1', 'regret1 return to bridge'); assert.ok(await field());
  await walk('ArrowUp', () => game.player.y <= 144, 'reapproach completed door'); await key('KeyC');
  assert.ok(await until(() => game.mapId === 'gajaeman_regret1', 12000)); assert.ok(await field());
  check('door reentry preserves removal reward and BGM', !(await state()).enemies.includes('yisub') && (await state()).money === restored.money && (await state()).bgm === 'castle_regret');
});
