import { runScenario } from './lib/harness.mjs';

await runScenario({ name: 'jjajang-night-coast', launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] } }, async ({ page, open, check, shot, until, press: rawPress, fixture }) => {
  page.setDefaultNavigationTimeout(30000);
  const press = key => rawPress(key, { delay: 80 });
  const startRoom = Number(process.env.COAST_START_ROOM || 1);
  const position = () => page.evaluate(() => ({ x: window.game.player.x, y: window.game.player.y, map: window.game.mapId }));
  const walkAxis = async (axis, target) => {
    for (let attempt = 0; attempt < 12; attempt++) {
      const start = await position(), delta = target - start[axis];
      if (Math.abs(delta) < 10) return;
      const key = axis === 'x' ? (delta > 0 ? 'ArrowRight' : 'ArrowLeft') : (delta > 0 ? 'ArrowDown' : 'ArrowUp');
      if (Math.abs(delta) <= 48) {
        await page.keyboard.down('KeyX');
        try { await rawPress(key, { delay: Math.max(60, Math.min(160, Math.abs(delta) / 124.8 * 1000)) }); }
        finally { await page.keyboard.up('KeyX'); }
        continue;
      }
      await page.keyboard.down(key);
      try {
        await page.waitForFunction(({ axis, target, sign }) => sign * (window.game.player[axis] - target) >= -32,
          { axis, target, sign: Math.sign(delta) }, { timeout: Math.abs(delta) / 100 * 1000 + 3000, polling: 'raf' });
      } finally { await page.keyboard.up(key); }
    }
    throw new Error(`Walking input did not converge to ${axis}=${target}: ${JSON.stringify(await position())}`);
  };
  const walk = async ([x, y]) => { await walkAxis('y', y); await walkAxis('x', x); };
  const checkFree = async name => check(name, await page.evaluate(() => {
    const g = window.game;
    return !g.map.solidRect(g.player.x, g.player.y, g.player.w, g.player.h) && !g.ride && !g.dialogue.running;
  }));
  const ferry = async (id, right) => {
    const r = await page.evaluate(id => { const e = window.game.entities.find(e => e.id === id); return { x: e.x, y: e.y, w: e.w }; }, id);
    await walk([right ? r.x - 27 : r.x + r.w + 3, r.y + 11]);
    await press(right ? 'ArrowRight' : 'ArrowLeft');
    await press('KeyC');
    check(`${id} boards with C`, await until(() => !!window.game.ride, 7000));
    await shot(`${id}_${right ? 'east' : 'west'}_riding`);
    check(`${id} lands without input injection`, await until(() => !window.game.ride && !window.game.dialogue.running, 14000));
    await checkFree(`${id} lands on solid bank`);
  };
  const followRoom = async reverse => {
    const data = await page.evaluate(() => {
      const g = window.game;
      return { id: g.mapId, paths: g.map.def.meta.coast.walkRoute, gates: g.map.def.meta.coast.gates,
        ferries: g.entities.filter(e => e.def.type === 'raft').map(e => ({ id: e.id, direction: Math.sign(e.route.at(-1)[0] - e.route[0][0]) })) };
    });
    const paths = reverse ? data.paths.toReversed().map(path => path.toReversed()) : data.paths;
    const ferries = reverse ? data.ferries.toReversed() : data.ferries;
    for (let p = 0; p < paths.length; p++) {
      const path = paths[p];
      if (p > 0) await walk([path[0][0], path[0][1]]);
      for (let i = 1; i < path.length; i++) {
        const from = path[i - 1], to = path[i];
        if (!reverse && from[1] === to[1]) {
          const gates = data.gates.filter(g => g.y === from[1] && g.x > Math.min(from[0], to[0]) && g.x < Math.max(from[0], to[0]));
          gates.sort((a, b) => (a.x - b.x) * Math.sign(to[0] - from[0]));
          for (const gate of gates) {
            await walk([gate.lever[0], from[1]]);
            await walk(gate.lever);
            await press('ArrowUp');
            console.log('LEVER_APPROACH', gate.flag, await page.evaluate(() => {
              const g = window.game;
              return { x: g.player.x, y: g.player.y, target: g.player.probe()?.id };
            }));
            await press('KeyC');
            const opened = await page.waitForFunction(flag => window.game.flags[flag] && !window.game.dialogue.running, gate.flag, { timeout: 6000 }).catch(async error => {
              await shot(`${gate.flag}_failure`);
              console.log('LEVER_STATE', await page.evaluate(() => ({ x: window.game.player.x, y: window.game.player.y, facing: window.game.player.facing, flags: window.game.flags, dialogue: window.game.dialogue.running })));
              throw error;
            });
            await opened.dispose();
            check(`${gate.flag} bridge opens from C interaction`, true);
            await shot(gate.flag);
            await walk([gate.lever[0], from[1]]);
          }
        }
        const endpoint = [...to];
        if (i === path.length - 1 && p === paths.length - 1) endpoint[0] += reverse ? 35 : -35;
        await walk(endpoint);
      }
      if (p < ferries.length) await ferry(ferries[p].id, (ferries[p].direction > 0) !== reverse);
    }
    await checkFree(`${data.id} ${reverse ? 'return' : 'forward'} route safe`);
  };
  if (startRoom === 1) {
  await open({ qa: 'jjajang_sakura8_right' });
  check('entry dialogue fixture loads', await until(() => window.game?.mapId === 'jjajang_sakura8' && !window.game.transitioning, 30000));
  await page.keyboard.down('ArrowRight');
  try { check('entry dialogue triggers before the coast', await until(() => window.game.dialogue.running, 5000)); }
  finally { await page.keyboard.up('ArrowRight'); }
  check('entry is approximately three tiles before east exit', await page.evaluate(() => window.game.map.pxW - window.game.player.x >= 90 && window.game.map.pxW - window.game.player.x <= 130));
  await shot('sakura8_coast_entry_dialogue');
  while (await page.evaluate(() => window.game.dialogue.running)) { await press('KeyC'); await page.waitForTimeout(100); }
  await page.keyboard.down('ArrowRight');
  try { await until(() => window.game.transitioning, 3000); }
  finally { await page.keyboard.up('ArrowRight'); }
  } else await open({ qa: `jjajang_night_coast${startRoom}` });
  check('post-transformation coast QA loads', await until(() => window.game?.map?.def.meta?.coast && !window.game.transitioning, 30000));
  await page.evaluate(() => {
    window.coastObserved = [];
    let last = null;
    const observe = () => {
      const g = window.game, text = g?.coastChatter?.box.node?.text;
      if (text && text !== last) { window.coastObserved.push({ map: g.mapId, text, modal: g.dialogue.running }); last = text; }
      requestAnimationFrame(observe);
    };
    requestAnimationFrame(observe);
  });
  await fixture('cliff-scene-already-viewed', 'Skip only the previously existing remote cliff cutscene at the final destination; coast switches, rafts, coordinates and time remain untouched.', () => { window.game.flags.night_cliff_scene_done = true; window.game.flags.night_cliff_scene_started = true; });
  await shot('coast1_entry');
  const started = Date.now();
  const rooms = [];
  for (let n = startRoom; n <= 3; n++) {
    const roomStarted = Date.now();
    await followRoom(false);
    const expected = [6, 4, 7][n - 1];
    check(`coast${n} delivers every walking line without modal dialogue`, await page.evaluate(({ n, expected }) => {
      const lines = window.coastObserved.filter(line => line.map === `jjajang_night_coast${n}`);
      return lines.length === expected && lines.every(line => !line.modal);
    }, { n, expected }));
    if (n === 3) {
      await fixture('damaged-party-before-spring', 'Set party HP to1 solely to verify the existing spring heals every party member through C interaction.', () => {
        const g = window.game;
        for (const id of ['hyungsub', ...g.party]) g.partyHp[id] = 1;
      });
      const spring = await page.evaluate(() => { const s = window.game.entities.find(e => e.id === 'coast3_spring'); return { x: s.x, y: s.y, h: s.h }; });
      await walk([spring.x + 4, spring.y + spring.h + 24]);
      await press('ArrowUp'); await press('KeyC');
      check('spring heals the entire party', await until(() => {
        const g = window.game;
        return ['hyungsub', ...g.party].every(id => g.hpOf(id) === g.maxHpOf(id));
      }, 3000));
      await shot('coast3_healing_spring');
      while (await page.evaluate(() => window.game.dialogue.running)) { await press('KeyC'); await page.waitForTimeout(100); }
      await walk([spring.x + 4, spring.y + spring.h + 14]);
      const end = await page.evaluate(() => window.game.map.def.meta.coast.walkRoute.at(-1).at(-1));
      await walk([end[0] - 35, end[1]]);
    }
    const next = n === 3 ? 'jjajang_night_cliff' : `jjajang_night_coast${n + 1}`;
    await page.keyboard.down('ArrowRight');
    try { check(`right edge enters ${next}`, await until(() => window.game.transitioning, 3000)); }
    finally { await page.keyboard.up('ArrowRight'); }
    await page.waitForFunction(id => window.game.mapId === id && !window.game.transitioning, next, { timeout: 8000 });
    rooms.push({ map: `jjajang_night_coast${n}`, seconds: (Date.now() - roomStarted) / 1000 });
  }
  const seconds = (Date.now() - started) / 1000;
  console.log('NATURAL_DEFAULT_SECONDS', seconds, JSON.stringify(rooms));
  if (startRoom === 1) check('shortened traversal including the healing stop stays within its route budget', seconds >= 155 && seconds <= 240, JSON.stringify({ seconds, rooms }));
  await shot('existing_cliff_arrival');
  await fixture('continue-at-cliff', 'Save and invoke the actual Continue entry point to verify completed coast bridge/raft states survive.', async () => { window.game.autosave(); await window.game.continueGame(); });
  check('Continue preserves all seven bridges', await page.evaluate(() => ['night_coast1_a', 'night_coast1_b', 'night_coast2_a', 'night_coast2_b', 'night_coast2_c', 'night_coast3_a', 'night_coast3_b'].every(flag => window.game.flags[flag])));
  check('Continue preserves all delivered walking lines', await page.evaluate(start => [6, 4, 7].every((count, map) => map + 1 < start || Array.from({ length: count }, (_, i) => window.game.flags[`jjajang_night_coast${map + 1}_chat_${i}`]).every(Boolean)), startRoom));
  await page.keyboard.down('ArrowLeft');
  try { await until(() => window.game.transitioning, 3000); } finally { await page.keyboard.up('ArrowLeft'); }
  check('cliff returns to coast3 without portal ping-pong', await until(() => window.game.mapId === 'jjajang_night_coast3' && !window.game.transitioning, 8000));
  await page.waitForTimeout(2500);
  check('return and Continue do not repeat coast3 walking dialogue', await page.evaluate(() => !window.game.coastChatter.box.isOpen));
  if (process.env.COAST_FULL_RETURN === '1') {
    for (let n = 3; n >= 1; n--) {
      await followRoom(true);
      const next = n === 1 ? 'jjajang_sakura8' : `jjajang_night_coast${n - 1}`;
      await page.keyboard.down('ArrowLeft');
      try { await until(() => window.game.transitioning, 3000); } finally { await page.keyboard.up('ArrowLeft'); }
      await page.waitForFunction(id => window.game.mapId === id && !window.game.transitioning, next, { timeout: 8000 });
    }
    check('full natural return reaches Sakura8', (await position()).map === 'jjajang_sakura8');
  }
});
