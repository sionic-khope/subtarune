import { runScenario } from './lib/harness.mjs';
import { escToTitle } from './lib/esc.mjs';

await runScenario({ name: 'jjajang-shore', launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] } }, async ({
  page, check, until, open, press, shot, fixture,
}) => {
  await open({ qa: 'jjajang_shore' });
  check('QA enters completed shore control', !!await until(() => window.game?.mapId === 'jjajang_shore'
    && game.state === 'field' && !game.dialogue.running && !game.transitioning, 20000));

  const initial = await page.evaluate(() => ({
    y: Math.round(game.player.y),
    party: [...game.party],
    followers: game.entities.filter(entity => entity.def?.type === 'follower').length,
    cord: game.inventory.includes('보라색 코드 ?'),
    stolen: !!game.flags.ship_castle_cord_stolen,
    done: !!game.flags.ship_sinking_done,
    forestVisible: game.entities.filter(entity => entity.id?.startsWith('jjajang_tree_')
      && Number(entity.id.split('_').at(-1)) <= 8)
      .some(entity => entity.drawY - game.camera.y > -64 && entity.drawY - game.camera.y < 240),
  }));
  check('shore starts solo with stolen cord absent', initial.party.length === 0 && initial.followers === 0
    && !initial.cord && initial.stolen && initial.done, JSON.stringify(initial));
  check('forest entrance is not visible at the wash-up point', !initial.forestVisible, JSON.stringify(initial));
  check('wave ambience replaces melodic BGM', !!await until(() => game.sound.bgmName === 'jjajang_shore'
    && game.sound.bgm?.currentTime > 0, 10000));
  await shot('shore_01_washed_up_control');

  await page.keyboard.down('ArrowUp');
  await page.waitForTimeout(3000);
  await page.keyboard.up('ArrowUp');
  await page.waitForTimeout(180);
  const walked = await page.evaluate(() => ({
    map: game.mapId,
    y: Math.round(game.player.y),
    distance: Math.round(908 - game.player.y),
    forestVisible: game.entities.filter(entity => entity.id?.startsWith('jjajang_tree_')
      && Number(entity.id.split('_').at(-1)) <= 8)
      .some(entity => entity.drawY - game.camera.y > -64 && entity.drawY - game.camera.y < 240),
  }));
  check('three seconds of real up input reveals the black forest entry', walked.map === 'jjajang_shore'
    && walked.distance >= 500 && walked.forestVisible, JSON.stringify(walked));
  await shot('shore_02_three_second_forest_reveal');

  await page.keyboard.down('ArrowUp');
  await page.waitForTimeout(700);
  await page.keyboard.up('ArrowUp');
  check('forest path has no invented exit or follow-up story', await page.evaluate(() => game.mapId === 'jjajang_shore'
    && !game.dialogue.running && !game.transitioning));

  await press('KeyV');
  check('V opens the solo field menu', !!await until(() => game.state === 'menu', 2000));
  await press('ArrowDown');
  await page.waitForTimeout(150);
  await press('KeyC');
  check('party panel contains only the leader', !!await until(() => game.menu?.sub === 1
    && game.party.length === 0 && game.entities.every(entity => entity.def?.type !== 'follower')));
  await shot('shore_03_solo_party_menu');
  await press('KeyX');
  await page.waitForTimeout(150);
  await press('KeyX');
  check('X returns from menu to shore control', !!await until(() => game.state === 'field', 2000));

  await fixture('future-companion-hp', 'Set distinct inactive companion HP before autosave to verify that solo party removal preserves future stats.', () => {
    game.partyHp.gyeongsub = 77;
    game.partyHp.ppaman = 55;
    game.autosave();
  });
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('subtarune.save.v1')));
  check('shore save records solo party and absent stolen cord', saved.map === 'jjajang_shore'
    && saved.party.length === 0 && saved.flags.ship_sinking_done && saved.flags.ship_castle_cord_stolen
    && !saved.inventory.includes('보라색 코드 ?'), JSON.stringify(saved));

  await escToTitle(page);
  check('Escape returns to title without deleting shore save', !!await until(() => game.state === 'title' && game.hasSave(), 10000));
  await press('KeyZ');
  await page.waitForTimeout(300);
  for (let index = 0; index < 40 && await page.evaluate(() => game.title?.phase !== 'locked'); index += 1) {
    await press('KeyC');
    await page.waitForTimeout(250);
  }
  await page.waitForTimeout(3300);
  await press('KeyC');
  check('real title Continue restores shore control', !!await until(() => game.mapId === 'jjajang_shore'
    && game.state === 'field' && !game.dialogue.running && !game.transitioning && game.fade.alpha < 0.01, 15000));
  const continued = await page.evaluate(() => ({
    party: [...game.party],
    followers: game.entities.filter(entity => entity.def?.type === 'follower').length,
    hp: { gyeongsub: game.partyHp.gyeongsub, ppaman: game.partyHp.ppaman },
    cord: game.inventory.includes('보라색 코드 ?'),
    stage: game.story.stage,
    map: game.mapId,
  }));
  check('Continue keeps solo state, future HP, stolen cord, and no reunion', continued.party.length === 0
    && continued.followers === 0 && continued.hp.gyeongsub === 77 && continued.hp.ppaman === 55
    && !continued.cord && continued.stage === 'ship_sinking_done', JSON.stringify(continued));
  await shot('shore_04_continue_solo');
});
