import { runScenario } from './lib/harness.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

await runScenario({ name: 'choimis-win-rescue' }, async ({ page, open, until, press, shot, check, fixture }) => {
  const evidence = { limitation: 'Natural original choimis_sky script and entry. Disclosed fixture invokes existing victory method after entry, without replaying the separately tested 60-second finale. Physical C crosses common victory and subsequent scene updates are real-time.', sources: [] };
  for (const relative of ['src/battle/battle.js', 'src/main.js', 'src/data/cutscenes/choimis_sky.js', 'src/data/cutscenes/choimis_rescue.js', 'src/scenes/choimis-rescue.js']) {
    const response = await page.request.get(new URL(relative, process.env.QA_BASE_URL).href);
    const sha = bytes => createHash('sha256').update(bytes).digest('hex');
    const local = sha(fs.readFileSync(path.join(process.env.QA_SOURCE_ROOT, relative))), served = sha(await response.body());
    evidence.sources.push({ relative, local, served }); check(`served ${relative}`, local === served);
  }
  await open({ qa: 'choimis_sky' });
  await until(() => window.game?.mapId === 'jjajang_night_cliff' && !game.transitioning, 30000);
  await page.keyboard.down('ArrowRight');
  check('natural original script starts', await until(() => window.game?.dialogue?.running, 30000));
  await page.keyboard.up('ArrowRight');
  const start = Date.now();
  while (Date.now() - start < 65000 && !await page.evaluate(() => !!game.battle)) {
    if (await page.evaluate(() => game.textbox.isOpen)) await press('KeyC', { delay: 50 });
    await page.waitForTimeout(130);
  }
  check('natural sky script waits on battle with preloaded rescue', await until(() => game.battle?.state === 'intro' && !!game.choimisRescueAssets?.images?.jet, 20000));
  await fixture('victory-boundary', 'Invoke the existing common victory method after natural battle entry; do not assign fade, script, rescue state, or completion flags.', () => game.battle.beginWin());
  await page.waitForTimeout(800);
  for (let i = 0; i < 8 && await page.evaluate(() => !!game.battle); i++) { await press('KeyC', { delay: 60 }); await page.waitForTimeout(350); }
  check('real confirmation resumes rescue', await until(() => !!game.choimisRescue && game.textbox.isOpen, 5000));
  await page.waitForTimeout(900);
  evidence.state = await page.evaluate(() => ({ fade: game.fade, text: game.textbox.node?.text, rescue: game.choimisRescue?.snapshot(), battle: !!game.battle, flag: game.flags.choimis_flower_won }));
  await shot('victory-rescue-first-dialogue');
  fs.writeFileSync(path.join(process.env.SHOT_DIR, 'boundary-evidence.json'), JSON.stringify(evidence, null, 2));
  check('victory black curtain clears before first rescue dialogue', evidence.state.fade.alpha === 0, JSON.stringify(evidence.state));
});
