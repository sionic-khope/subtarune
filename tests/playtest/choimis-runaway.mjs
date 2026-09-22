import { runScenario } from './lib/harness.mjs';
import { verifyRunaway } from './lib/choimis-runaway.mjs';

await runScenario({ name: 'choimis-runaway', launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] } }, async context => {
  const { page, open, until, check, fixture, press, shot } = context;
  page.setDefaultNavigationTimeout(30000);
  await open({ qa: 'choimis_runaway' });
  check('runaway QA entry loaded', await until(() => window.game?.mapId === 'jjajang_sakura8', 25000));
  const before = await page.evaluate(() => ({ hp: window.game.partyHp, party: window.game.party, inventory: window.game.inventory, money: window.game.money }));
  await verifyRunaway(context, before);
  const preserved = await page.evaluate(() => ({ hp: window.game.partyHp, inventory: window.game.inventory, money: window.game.money }));
  await fixture('build290-completed-save', 'Use the completed-save boundary from BUILD290: runaway_done true, flower_done absent, solo party; retain earned HP, money and consumed inventory. Re-enter via the actual map-enter dispatcher.', async () => {
    const g = window.game;
    delete g.flags.choimis_flower_done;
    g.party = []; g.spawnParty(); g.autosave();
    await g.changeMap('jjajang_sakura5', 'after_runaway', true);
  });
  check('old save resumes directly at the transformed greeting', await until(() => window.game.textbox.node?.text?.includes('하핫 ~') && window.game.textbox.state !== 'closed', 10000));
  check('old save skips tree crash and bowl recreation', await page.evaluate(() => !window.game.entities.some(e => !e.dead && ['sakura5_giant_tree', 'runaway_bowl', 'domijorim_scene'].includes(e.id)) && window.game.entities.find(e => e.id === 'choimis_runaway')?.def.sprite === 'choimis_flower'));
  await shot('flower_migration_greeting');
  for (let i = 0; i < 180; i++) {
    const done = await page.evaluate(() => window.game.flags.choimis_flower_done && !window.game.dialogue.running);
    if (done) break;
    await press('KeyC', { delay: 40 }); await page.waitForTimeout(120);
  }
  check('old save finishes continuation and safely restores followers', await page.evaluate(() => window.game.flags.choimis_flower_done && !window.game.dialogue.running && window.game.party.join(',') === 'gyeongsub,ppaman'));
  const migrated = await page.evaluate(() => ({ hp: window.game.partyHp, inventory: window.game.inventory, money: window.game.money }));
  check('migration leaves HP inventory and money untouched', JSON.stringify(migrated) === JSON.stringify(preserved));
  await fixture('completed-migration-reentry', 'Re-enter again with the newly persisted completion flag to prove the migration does not replay.', async () => { await window.game.changeMap('jjajang_sakura5', 'after_runaway', true); });
  check('completed migration is idempotent and leaves no old Choimis', await until(() => !window.game.dialogue.running && !window.game.entities.some(e => !e.dead && e.id === 'choimis_runaway'), 5000));
  await shot('flower_migration_once');
});
