import { runScenario } from './lib/harness.mjs';
import { createHash } from 'node:crypto';
import { validateBaseUrl } from './lib/runner-utils.mjs';

await runScenario({ name: 'jjajang-night-coast-visual', launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] } }, async ({ page, open, check, shot, until, press: rawPress, fixture }) => {
  page.setDefaultNavigationTimeout(30000);
  const press = key => rawPress(key, { delay: 80 });
  const numbers = process.env.COAST_VISUAL_ROOM ? [Number(process.env.COAST_VISUAL_ROOM)] : [1, 2, 3];
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
    for (const width of [375, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await shot(`coast${number}_entry_${width}`);
      check(`coast${number} viewport ${width} fits`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    }
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
    check(`${id} returns every companion to land`, await until(() => {
      const g = window.game;
      return !g.ride && !g.dialogue.running && g.party.every(id => {
        const e = g.entities.find(e => e.id === id && e.def.type === 'follower');
        return e?.visible && !g.map.solidRect(e.x, e.y, e.w, e.h);
      });
    }, 14000));
    const beforeFollowers = await page.evaluate(() => Object.fromEntries(window.game.entities.filter(e => e.def.type === 'follower').map(e => [e.id, e.x])));
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(700);
    await page.keyboard.up('ArrowRight');
    check(`${id} companions keep following after disembark`, await page.evaluate(before => {
      const g = window.game;
      return g.party.every(id => {
        const e = g.entities.find(e => e.id === id && e.def.type === 'follower');
        return e?.visible && e.x > before[id] + 20 && Math.hypot(g.player.x - e.x, g.player.y - e.y) < 145;
      });
    }, beforeFollowers));
    await shot(`${id}_final_regrouped`);
  }
});
