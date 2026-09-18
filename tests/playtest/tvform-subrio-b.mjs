import { runScenario } from './lib/harness.mjs';

await runScenario({ name: 'tvform-subrio-b', launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] } }, async ({ page, check, until, open, press, fixture, shot }) => {
  const state = () => page.evaluate(() => {
    const b = window.game.battle;
    return { state: b.state, hp: b.enemies[0]?.hp, game: b.gimmick?.snapshot?.game || null };
  });
  const tap = async (key, wait = 260) => { await press(key); await page.waitForTimeout(wait); };
  await open({ qa: 'ship_tvform_battle' });
  await until(() => window.game?.battle?.state === 'intro', 30000);
  for (let n = 0; n < 12 && (await state()).state === 'intro'; n++) await tap('KeyC');
  check('battle menu reached', await until(() => window.game.battle.state === 'menu', 20000));
  await fixture('second-subrio-visit', 'Select Subrio B by recording one previous special visit. Fill party HP before the real input sequence; no HP or actor positions change during the dodge test.', () => {
    const b = window.game.battle;
    const sp = b.support;
    sp.turn = 0; sp.specialIdx = 0; sp.enemyModeFor(); sp.turn = 0; sp.specialIdx = 0;
    for (const m of b.members) { m.hp = m.maxHp; m.down = false; }
  });
  for (let n = 0; n < 3; n++) { await tap('KeyC', 300); await tap('KeyC', 350); }
  check('second visit enters Subrio B', await until(() => window.game.battle.gimmick?.snapshot?.game?.variant === 'b', 25000));
  check('all three actors land', await until(() => window.game.battle.gimmick?.snapshot?.game?.party.every(p => p.dropped), 10000));
  check('boss disappears before warnings', await until(() => window.game.battle.gimmick?.snapshot?.game?.phase === 'vanish', 10000));
  await shot('b01_vanish');
  check('two positions warned together', await until(() => {
    const g = window.game.battle.gimmick?.snapshot?.game;
    return g?.phase === 'marker' && g.markers.length === 2 && !g.ycVisible;
  }, 6000));
  await shot('b02_multiple_markers');
  let g = (await state()).game;
  check('boss scale is 1.5 times the former 1.9', Math.abs(g.yc.scale / 1.9 - 1.5) < 1e-9);
  check('warning bands leave 64 pixels between them', Math.abs(g.markers[0].x - g.markers[1].x) - g.markers[0].w === 64);
  const hpBeforeDodge = await page.evaluate(() => window.game.battle.members.map(m => m.hp));
  let target = null, wave = -1, warnedAt = 0, held = null, maxCam = 0, drops = 0;
  const captured = new Set();
  const start = Date.now();
  while (Date.now() - start < 48000) {
    g = (await state()).game;
    if (!g || ['stumble', 'down'].includes(g.phase)) break;
    maxCam = Math.max(maxCam, g.cam); drops = Math.max(drops, g.slams);
    if (g.phase === 'marker' && g.wave !== wave) { wave = g.wave; warnedAt = g.t; target = null; }
    if (g.markers.length && target === null && g.t - warnedAt >= 0.4) target = (g.markers[0].x + g.markers[1].x) / 2;
    const delta = target === null ? 0 : target - (g.hero.x + 8);
    const wanted = delta > 3 ? 'ArrowRight' : delta < -3 ? 'ArrowLeft' : null;
    if (wanted !== held) { if (held) await page.keyboard.up(held); if (wanted) await page.keyboard.down(wanted); held = wanted; }
    const capture = g.phase === 'dive' && g.yc.y > 180 && !captured.has('dive') ? 'dive'
      : g.phase === 'slam' && !captured.has('slam') ? 'slam'
      : g.markers.length === 3 && g.phase === 'marker' && !captured.has('triple') ? 'triple' : null;
    if (capture) { captured.add(capture); await shot('b03_' + capture); }
    await page.waitForTimeout(25);
  }
  if (held) await page.keyboard.up(held);
  check('camera scrolls with real walking', maxCam > 40, 'cam=' + maxCam);
  check('falling, impact, and triple warning frames captured', ['dive', 'slam', 'triple'].every(k => captured.has(k)));
  check('all five waves finish with thirteen slams', g?.wave === 5 && g.slams === 13, JSON.stringify({ wave: g?.wave, slams: g?.slams, seen: drops }));
  check('warning-directed walking avoids all damage', JSON.stringify(await page.evaluate(() => window.game.battle.members.map(m => m.hp))) === JSON.stringify(hpBeforeDodge));
  if (g?.phase === 'stumble') await shot('b04_stumble');
  check('counterattack window opens', await until(() => window.game.battle.gimmick?.snapshot?.game?.phase === 'down', 5000));
  await shot('b05_counterattack');
  const hpBefore = (await state()).hp;
  let sawMate = false, best = (await state()).game;
  const downStart = Date.now();
  while (Date.now() - downStart < 8000) {
    const s = await state();
    if (!s.game || s.game.phase !== 'down') break;
    best = s.game;
    sawMate ||= best.fires > 0 || best.clocks > 0;
    const delta = best.yc.x - (best.hero.x + 8);
    const facing = delta > 0 ? 'ArrowRight' : 'ArrowLeft';
    await page.keyboard.down(facing); await page.waitForTimeout(35); await page.keyboard.up(facing);
    await page.keyboard.down('KeyC'); await page.waitForTimeout(35); await page.keyboard.up('KeyC'); await page.waitForTimeout(65);
  }
  const after = await state();
  best = after.game || best;
  check('companions join the counterattack', sawMate);
  check('counterattacks retain five hits per damage with a ten damage cap', best.hits >= 5 && best.damageDealt === Math.min(10, Math.floor(best.hits / 5)) && after.hp === hpBefore - best.damageDealt, JSON.stringify(best));
  await shot('b06_counter_result');
  check('special transition returns to battle menu', await until(() => window.game.battle.state === 'menu' && !window.game.battle.gimmick, 15000));
  await shot('b07_back_in_battle');
});
