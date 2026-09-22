import { runScenario } from './lib/harness.mjs';
import { createHash } from 'node:crypto';
import { validateBaseUrl } from './lib/runner-utils.mjs';

await runScenario({ name: 'jjajang-night-coast-visual', launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] } }, async ({ page, open, check, shot, until, press: rawPress, fixture }) => {
  page.setDefaultNavigationTimeout(30000);
  const press = key => rawPress(key, { delay: 80 });
  const numbers = process.env.COAST_RENDER_ONLY === '1' ? [] : process.env.COAST_VISUAL_ROOM ? [Number(process.env.COAST_VISUAL_ROOM)] : [1, 2, 3];
  if (!numbers.every(number => [1, 2, 3].includes(number))) throw new Error('COAST_VISUAL_ROOM must be1,2 or3');
  const sourceFiles = ['src/data/build.js', 'src/main.js', 'src/world/tiles.js', 'tests/playtest/jjajang-night-coast-visual.mjs', ...numbers.map(number => `assets/maps/jjajang_night_coast${number}.json`)];
  const sources = await Promise.all(sourceFiles.map(async file => {
    const response = await page.request.get(new URL(file, validateBaseUrl(process.env.QA_BASE_URL)).href);
    if (!response.ok()) throw new Error(`Capture source unavailable: ${file}`);
    return [file, await response.text()];
  }));
  console.log('CAPTURE_SOURCE', JSON.stringify({ build: new Map(sources).get('src/data/build.js').trim(), servedSha256: Object.fromEntries(sources.map(([file, text]) => [file, createHash('sha256').update(text).digest('hex')])) }));
  for (const number of numbers) {
    await open({ qa: `jjajang_night_coast${number}` });
    check(`coast${number} loads current textures`, await until(() => window.game?.map?.def.meta?.coast && !window.game.transitioning, 30000));
    check(`coast${number} uses coast music`, await page.evaluate(() => window.game.sound.bgmName === 'night_coast'));
    check(`coast${number} entry fits all three party members`, await page.evaluate(() => {
      const g = window.game;
      return [g.player, ...g.entities.filter(e => e.def.type === 'follower')].every(e => e.x >= 0 && e.x + e.w <= g.map.pxW);
    }));
    await page.keyboard.down('ArrowRight');
    try { check(`coast${number} walking chatter starts without C`, await until(() => {
      const box = window.game.coastChatter.box;
      if (!box.isOpen) return false;
      box.auto = 999;
      return true;
    }, 5000)); }
    finally { await page.keyboard.up('ArrowRight'); }
    const movement = await page.evaluate(() => {
      const g = window.game, p = g.player;
      const right = !g.map.solidRect(p.x + 48, p.y, p.w, p.h);
      return { axis: right ? 'x' : 'y', sign: right ? 1 : -1, start: right ? p.x : p.y, key: right ? 'ArrowRight' : 'ArrowUp' };
    });
    await page.keyboard.down('KeyX'); await page.keyboard.down(movement.key);
    try {
      check(`coast${number} movement stays live under top dialogue`, await page.waitForFunction(m => m.sign * (window.game.player[m.axis] - m.start) > 30 && !window.game.dialogue.running, movement, { timeout: 5000 }).then(h => h.dispose()).then(() => true));
    } finally { await page.keyboard.up(movement.key); await page.keyboard.up('KeyX'); }
    await fixture(`coast${number}-capture-text-hold`, 'Hold only automatic line dismissal for the responsive screenshots; typing and real field movement remain active. Restore normal timing after the captures.', () => { window.game.coastChatter.box.auto = 999; });
    if (!await until(() => window.game.coastChatter.box.state === 'waiting', 10000)) throw new Error('Walking dialogue did not finish typing for capture');
    for (const width of [375, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await shot(`coast${number}_entry_${width}`);
      check(`coast${number} viewport ${width} fits`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      check(`coast${number} top dialogue layout fits at ${width}`, await page.evaluate(() => {
        const b = window.game.coastChatter.box, r = b.layoutRect();
        return r.y >= 0 && r.y + r.h < 120 && b.pages.every(page => page.length <= 2);
      }));
    }
    await fixture(`coast${number}-release-text-hold`, 'Restore the normal1.7second automatic dialogue hold after the viewport capture.', () => { const b = window.game.coastChatter.box; b.auto = 1.7; b.autoTimer = 0; });
    await shot(`coast${number}_final_entry`);
    await press('KeyV');
    check(`coast${number} field menu opens`, await until(() => window.game.state === 'menu', 3000));
    await shot(`coast${number}_menu`);
    await press('KeyX');
    check(`coast${number} menu returns to field`, await until(() => window.game.state === 'field', 3000));
    if (number === 1) continue;
    const id = `coast${number}_a`;
    await fixture(`coast${number}-dock-framing`, 'Visual-only fixture: place the party at this room’s first ferry bank, past the already naturally verified walking route. Do not change raft position, input, clock or ride state.', () => {
      const g = window.game, end = g.map.def.meta.coast.walkRoute[0].at(-1);
      g.player.x = end[0] + 26; g.player.y = end[1] - 1; g.player.facing = 'right';
      g.player.trail = []; g.spawnParty(); g.camera.snap();
    });
    await press('KeyC');
    check(`${id} departs with both swimming companions`, await page.waitForFunction(id => {
      const r = window.game.entities.find(e => e.id === id);
      return r?.moving && r.swimmers.filter(e => !e.dead).length === 2;
    }, id, { timeout: 10000 }).then(h => h.dispose()).then(() => true));
    const frame = await page.waitForFunction(id => {
      const g = window.game, r = g.ride, p = g.player, cam = g.camera;
      if (!r || r.id !== id || !r.moving || !r.visible || !r.image || !p.visible || g.transitioning || g.fade.alpha >= 0.01 || cam.locked) return false;
      if (Math.abs(p.cx - cam.x - 240) > 48 || Math.abs(p.cy - cam.y - 180) > 48) return false;
      const rect = { x: r.drawX - cam.x, y: r.drawY - cam.y - r.jumpY, w: r.iw, h: r.ih };
      if (rect.x < 0 || rect.y < 138 || rect.x + rect.w > 480 || rect.y + rect.h > 360) return false;
      if (Math.abs(r.x - r.route[0][0]) < r.w * 2 || Math.abs(r.x - r.route.at(-1)[0]) < r.w * 2) return false;
      const swimmers = r.swimmers.filter(sw => !sw.dead && sw.visible);
      if (swimmers.length !== 2 || swimmers.some(sw => sw.x - cam.x < 0 || sw.x + sw.w - cam.x > 480 || sw.y - cam.y < 138 || sw.y + sw.h - cam.y > 360)) return false;
      r.hold = true;
      return { map: g.mapId, fade: g.fade.alpha, camera: { x: cam.x, y: cam.y }, raftDrawRect: rect,
        player: { x: p.x - cam.x, y: p.y - cam.y, visible: p.visible },
        swimmers: swimmers.map(sw => ({ id: sw.id, x: sw.x - cam.x, y: sw.y - cam.y, visible: sw.visible })) };
    }, id, { timeout: 10000, polling: 'raf' });
    check(`${id} rendered midride frame is ready`, true, JSON.stringify(await frame.jsonValue()));
    await frame.dispose();
    await shot(`${id}_final_midride`);
    check(`${id} is below the water horizon`, await page.evaluate(() => {
      const g = window.game, r = g.ride;
      return r && r.y + r.h - g.camera.y > 138 && r.swimmers.every(sw => sw.y - g.camera.y > 138);
    }));
    await fixture(`${id}-release-capture-hold`, 'The midride observer held the naturally moving raft for its screenshot only. Release that capture hold without changing route, position or speed.', () => { window.game.ride.hold = false; });
    check(`${id} returns every companion to land`, await until(() => {
      const g = window.game;
      return !g.ride && !g.dialogue.running && g.party.every(id => {
        const e = g.entities.find(e => e.id === id && e.def.type === 'follower');
        return e?.visible && !g.map.solidRect(e.x, e.y, e.w, e.h);
      });
    }, 14000));
    const beforeFollowers = await page.evaluate(() => Object.fromEntries(window.game.entities.filter(e => e.def.type === 'follower').map(e => [e.id, e.x])));
    const landedX = await page.evaluate(() => window.game.player.x);
    await page.keyboard.down('KeyX'); await page.keyboard.down('ArrowRight');
    try { await page.waitForFunction(x => window.game.player.x >= x + 140, landedX, { timeout: 5000 }); }
    finally { await page.keyboard.up('ArrowRight'); await page.keyboard.up('KeyX'); }
    check(`${id} companions keep following after disembark`, await page.evaluate(before => {
      const g = window.game;
      return g.party.every(id => {
        const e = g.entities.find(e => e.id === id && e.def.type === 'follower');
        return e?.visible && e.x > before[id] + 20 && Math.hypot(g.player.x - e.x, g.player.y - e.y) < 145;
      });
    }, beforeFollowers));
    if (!await until(() => !window.game.transitioning && window.game.fade.alpha < 0.01, 5000)) throw new Error('Regrouped frame remained in transition');
    await shot(`${id}_final_regrouped`);
  }
  if (!numbers.length) {
    await open({ qa: 'jjajang_night_coast1' });
    if (!await until(() => !!window.game?.map?.def.meta?.coast && !window.game.transitioning, 60000)) throw new Error('Render-only QA did not load');
  }
  await fixture('coast1-return-to-sakura8-setup', 'Prepare the coast1 west entrance after the entry conversation was already read; actual left/right input crosses both doors and the return spawn.', async () => {
    const g = window.game;
    await g.devJump({ map: 'jjajang_night_coast1', spawn: 'from_west', flags: { ...g.flags, night_coast_entry_seen: true }, party: ['gyeongsub', 'ppaman'] });
  });
  if (!await until(() => !window.game.transitioning, 10000)) throw new Error('Coast return fixture not ready');
  await page.keyboard.down('ArrowLeft');
  try { if (!await until(() => window.game.transitioning, 5000)) throw new Error('West door did not trigger'); }
  finally { await page.keyboard.up('ArrowLeft'); }
  check('coast1 west door reaches safe Sakura8 from_east spawn', await until(() => {
    const g = window.game;
    return g.mapId === 'jjajang_sakura8' && !g.transitioning && !g.dialogue.running && g.player.x < 1100;
  }, 10000));
  await page.keyboard.down('ArrowRight');
  try { if (!await until(() => window.game.transitioning, 5000)) throw new Error('Return crossing replayed or blocked entry dialogue'); }
  finally { await page.keyboard.up('ArrowRight'); }
  check('return crossing does not replay the one-time entry conversation', await until(() => window.game.mapId === 'jjajang_night_coast1' && !window.game.transitioning && !window.game.dialogue.running, 10000));
  for (const [number, oldBanks] of [[1, [[120, 64]]], [2, [[78, 10], [48, 54], [108, 78]]], [3, [[132, 70], [136, 70]]]]) {
    await fixture(`legacy-coast${number}-room-setup`, 'Reuse the loaded game and its standard QA devJump path to prepare this coastal room before legacy-save restoration.', async number => {
      const g = window.game;
      await g.devJump({ map: `jjajang_night_coast${number}`, spawn: 'from_west', flags: { ...g.flags }, party: ['gyeongsub', 'ppaman'] });
    }, number);
    if (!await until(() => !!window.game?.map?.def.meta?.coast && !window.game.transitioning, 30000)) throw new Error('Legacy-save fixture room not ready');
    const count = [6, 4, 7][number - 1];
    for (let line = 0; line < count; line++) {
      await fixture(`coast${number}-line${line}-render`, 'Render-only CJK coverage: show this authored line with the existing TextBox, finish typing and hold it for capture. Natural progression is verified by the separate walking scenario.', async line => {
        const { NIGHT_COAST_CHAT } = await import('./src/data/cutscenes/jjajang_night_coast.js');
        const g = window.game;
        g.coastChatter.update(0);
        g.coastChatter.box.show({ ...NIGHT_COAST_CHAT[g.mapId][line], auto: 999 }, g.ctx, null);
        g.coastChatter.box.update(60, { just: () => false });
      }, line);
      if (!await until(() => window.game.fade.alpha < 0.01 && window.game.coastChatter.box.state === 'waiting', 10000)) throw new Error('CJK render frame not ready');
      await shot(`coast${number}_line${line}_readable`);
      if (number === 2 && line === 2) {
        for (const width of [375, 768, 1280]) {
          await page.setViewportSize({ width, height: 900 });
          await shot(`coast2_longest_${width}`);
        }
      }
    }
    await page.evaluate(() => window.game.coastChatter.clear());
    for (const [x, y] of oldBanks) {
      await fixture(`legacy291-coast${number}-${x}-${y}`, 'Restore a BUILD291 save at its authored bank coordinates with the corresponding completed bridges and ferries; only Continue may migrate it.', async ({ x, y }) => {
        const g = window.game;
        g.autosave();
        const saved = JSON.parse(localStorage.getItem('subtarune.save.v1'));
        saved.x = x * 32 + 4; saved.y = y * 32 + 8;
        delete saved.flags.night_coast_geometry292;
        for (const gate of g.map.def.meta.coast.gates) saved.flags[gate.flag] = true;
        for (const raft of g.entities.filter(e => e.def.type === 'raft')) saved.flags[`raft_${raft.id}`] = 1;
        localStorage.setItem('subtarune.save.v1', JSON.stringify(saved));
        await g.continueGame();
      }, { x, y });
      check(`legacy coast${number} bank ${x},${y} stays on its corresponding shore`, await page.evaluate(({ x, y }) => {
        const g = window.game, p = g.player;
        return g.flags.night_coast_geometry292 && !g.map.solidRect(p.x, p.y, p.w, p.h)
          && Math.hypot(p.x - (x * 32 * 0.9 + 4), p.y - (y * 32 * 0.9 + 8)) < 40;
      }, { x, y }));
    }
    await fixture(`coast${number}-migration-idempotence`, 'Save the migrated coordinates and Continue once more, proving BUILD292 saves are not scaled twice.', async () => {
      const g = window.game; g.autosave(); window.coastSavedPosition = [g.player.x, g.player.y]; await g.continueGame();
    });
    check(`coast${number} current save is not migrated twice`, await page.evaluate(() => Math.hypot(window.game.player.x - window.coastSavedPosition[0], window.game.player.y - window.coastSavedPosition[1]) < 2));
  }
});
