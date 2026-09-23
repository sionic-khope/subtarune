import assert from 'node:assert/strict';
import { runScenario } from './lib/harness.mjs';

await runScenario({ name: 'choimis-chase-raft' }, async ({ page, open, until, press, check, shot, fixture }) => {
  const field = () => until(() => game.state === 'field' && !game.transitioning && !game.dialogue.running && game.fade.alpha === 0, 20000);
  const raftState = () => page.evaluate(() => {
    const r = game.entities.find(e => e.id === 'sakura6_raft');
    return { map: game.mapId, player: [game.player.x, game.player.y], raft: r && { at: r.at, x: r.x, visible: r.visible, image: !!r.image, dead: !!r.dead }, flag: game.flags.raft_sakura6_raft, flower: game.flags.choimis_flower_done, ready: game.flags.choimis_chase_raft_ready };
  });
  const dock = async () => {
    await page.keyboard.down('ArrowRight');
    try { assert.ok(await until(() => game.player.x >= 278, 4000)); }
    finally { await page.keyboard.up('ArrowRight'); }
  };
  const cross = async label => {
    await press('KeyC', { delay: 70 });
    assert.ok(await until(() => !!game.ride?.moving, 8000), `${label}: C boards and departs`);
    await shot(`${label}-riding`);
    assert.ok(await until(() => !game.ride && !game.dialogue.running, 15000));
    check(`${label}: landed with both companions`, await page.evaluate(() => game.entities.filter(e => e.def?.type === 'follower' && e.visible).length === 2), JSON.stringify(await raftState()));
  };
  await open({ qa: 'jjajang_sakura6_dock' });
  assert.ok(await field()); await dock(); await cross('outbound');
  check('outbound crossing persisted the east bank', (await raftState()).flag === 1);
  await fixture('later-story-boundary', 'Skip unchanged sakura7/8 and cliff conversations, retaining the actual raft crossing and its persisted flag. Start the production runaway montage, crash, eating and transformation scripts.', async () => {
    const { QA_POINTS } = await import('./src/core/story.js');
    Object.assign(game.flags, QA_POINTS.find(p => p.id === 'choimis_runaway').flags);
    game.party = []; game.spawnParty();
    await game.changeMap('jjajang_sakura8', 'chase', true, { enter: false });
    game.runScript('choimis_runaway');
  });
  const started = Date.now();
  while (Date.now() - started < 180000) {
    if (await page.evaluate(() => game.flags.choimis_flower_done && !game.dialogue.running)) break;
    await press('KeyC', { delay: 45 }); await page.waitForTimeout(110);
  }
  assert.ok(await field());
  check('real montage and transformation finish in sakura5 with old raft state', await page.evaluate(() => game.mapId === 'jjajang_sakura5' && game.flags.choimis_flower_done && game.flags.raft_sakura6_raft === 1));
  await shot('transformation-finished');
  await fixture('approach-sakura5-east-door', 'Place on the already traversed sakura5 east exit approach; actual ArrowRight crosses the existing door.', () => {
    const door = game.entities.find(e => e.def?.to === 'jjajang_sakura6');
    if (!door) throw new Error('sakura6 door missing');
    game.player.x = door.x - 40; game.player.y = door.y; game.camera.snap();
  });
  await page.keyboard.down('ArrowRight');
  try { assert.ok(await until(() => game.mapId === 'jjajang_sakura6' && !game.transitioning, 10000)); }
  finally { await page.keyboard.up('ArrowRight'); }
  assert.ok(await field()); await dock();
  const before = await raftState();
  check('chase reentry has a visible reachable west-bank raft', before.raft?.at === 0 && before.raft.visible && before.raft.image, JSON.stringify(before));
  await shot('chase-west-dock');
  if (before.raft?.at !== 0) {
    await press('KeyC', { delay: 70 }); await page.waitForTimeout(500);
    check('original symptom: C boards from west dock', await page.evaluate(() => !!game.ride || game.dialogue.running));
    await fixture('diagnostic-endpoint-toggle', 'Diagnostic only: reset just the persisted raft endpoint, reload at the same dock, and retry C. This proves endpoint state rather than hidden/despawned entity or missing QA flags.', async () => {
      game.setFlag('raft_sakura6_raft', 0); await game.changeMap('jjajang_sakura6', 'dock', true);
    });
    assert.ok(await field()); await dock(); await cross('diagnostic-toggle');
    return;
  }
  await fixture('save-west-dock', 'Save the actual repaired west-dock state and load it through production continueGame.', async () => { game.autosave(); await game.continueGame(); });
  assert.ok(await field()); await shot('continued-west-dock');
  check('continue retains west raft and party', (await raftState()).raft.at === 0);
  await cross('chase');
  await fixture('save-east-bank', 'Save naturally arrived east-bank state and restore actual saved player coordinates.', async () => { game.autosave(); await game.continueGame(); });
  assert.ok(await field());
  check('east-bank continue does not recall raft to the west', (await raftState()).raft.at === 1, JSON.stringify(await raftState()));
  await shot('continued-east-bank');
  await page.keyboard.down('ArrowLeft');
  try { assert.ok(await until(() => game.player.x <= 1235, 2500)); }
  finally { await page.keyboard.up('ArrowLeft'); }
  await cross('reverse');
  check('reverse crossing ends at west bank', (await raftState()).raft.at === 0);
  for (const [bank, x, expected] of [['west', 278, 0], ['east', 1260, 1]]) {
    await fixture(`legacy-${bank}-save`, 'Recreate the shipped pre-fix save: transformation finished, east endpoint persisted, no repair flag. Normal continueGame restores saved coordinates before bank repair.', async x => {
      game.autosave(); const save = JSON.parse(localStorage.getItem('subtarune.save.v1'));
      delete save.flags.choimis_chase_raft_ready;
      save.flags.raft_sakura6_raft = 1; save.x = x; save.y = 358;
      localStorage.setItem('subtarune.save.v1', JSON.stringify(save)); await game.continueGame();
    }, x);
    assert.ok(await field());
    check(`legacy ${bank} save restores reachable raft`, (await raftState()).raft.at === expected, JSON.stringify(await raftState()));
    await shot(`legacy-${bank}-save`);
  }
});
