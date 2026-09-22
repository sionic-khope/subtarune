import { runScenario } from './lib/harness.mjs';
import { verifyRunaway } from './lib/choimis-runaway.mjs';

await runScenario({ name: 'choimis-runaway', launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] } }, async context => {
  const { page, open, until, check } = context;
  page.setDefaultNavigationTimeout(30000);
  await open({ qa: 'choimis_runaway' });
  check('runaway QA entry loaded', await until(() => window.game?.mapId === 'jjajang_sakura8', 25000));
  const before = await page.evaluate(() => ({ hp: window.game.partyHp, party: window.game.party, inventory: window.game.inventory, money: window.game.money }));
  await verifyRunaway(context, before);
});
