import { runScenario } from './lib/harness.mjs';

await runScenario({ name: 'sinking-shore', launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] } }, async ({
  page, check, until, open, press, shot,
}) => {
  const readWaitingLine = async () => {
    const ready = await until(() => game.dialogue.running && game.textbox.state === 'waiting'
      ? { text: game.textbox.node?.text, speaker: game.textbox.node?.speaker || null } : null, 15000);
    return ready;
  };
  const acceptLine = async () => {
    await press('KeyC');
    await page.waitForTimeout(180);
  };

  await open({ qa: 'ship_sinking' });
  check('QA starts registered sinking script', !!await until(() => game.shipMemory?.snapshot().beat === 'underwater_enter'
    && game.dialogue.running && game.sound.bgmName === 'ship_sinking', 20000));
  await page.waitForTimeout(2500);
  const midSink = await page.evaluate(() => ({ ...game.shipMemory.snapshot(), hasText: !!game.textbox.node?.text }));
  check('underwater center descent has rays and moving bubbles before narration', midSink.sinkY > 174
    && midSink.sinkY < 226 && midSink.bubbles.length === 22 && !midSink.hasText, JSON.stringify(midSink));
  await shot('sinking_01_center_descent');

  const expectedNarration = [
    '* ...',
    '* ... ... ... 가재맨',
    '* 어쩌다가 우린',
    '* 이렇게 된걸까',
    '* 분명 행복한 삶이지 않았는가.',
  ];
  const narration = [];
  for (const expected of expectedNarration) {
    const line = await readWaitingLine();
    narration.push(line?.text);
    check(`underwater narration ${narration.length} is exact`, line?.text === expected, JSON.stringify(line));
    await acceptLine();
  }
  check('narration begins only after the five-second sink hold', midSink.time < 5
    && await page.evaluate(() => game.shipMemory.time >= 5), JSON.stringify(narration));

  for (let number = 1; number <= 5; number += 1) {
    const beat = `memory_${number}`;
    const started = await page.waitForFunction(expected => game.shipMemory?.snapshot().beat === expected, beat, { timeout: 15000 })
      .then(() => true, () => false);
    check(`${beat} starts as its own panel`, started);
    const decoded = await page.waitForFunction(expected => {
      const snapshot = game.shipMemory?.snapshot();
      return snapshot?.beat === expected && snapshot.imagesReady === 5 && snapshot.panel === expected;
    }, beat, { timeout: 8000 }).then(() => true, () => false);
    check(`${beat} image decodes with all five assets ready`, decoded);
    await page.waitForTimeout(5400);
    const panel = await page.evaluate(() => game.shipMemory.snapshot());
    check(`${beat} completes a slow fade through black`, panel.transition?.phase === 'panel'
      && panel.transition.alpha === 1 && panel.previousPanel !== panel.panel, JSON.stringify(panel));
    await shot(`sinking_memory_${number}`);
  }

  check('fifth memory returns to the underwater tableau', !!await until(() => game.shipMemory?.snapshot().beat === 'underwater_return', 15000));
  await page.waitForTimeout(5200);
  await shot('sinking_07_underwater_return');
  const heroOne = await readWaitingLine();
  check('Yoplait first resolve line is exact', heroOne?.speaker === '요플래' && heroOne.text === '* ... 그럼에도', JSON.stringify(heroOne));
  await acceptLine();
  const heroTwo = await readWaitingLine();
  check('Yoplait second resolve line is exact', heroTwo?.speaker === '요플래' && heroTwo.text === '* 난 ... 포기할수...', JSON.stringify(heroTwo));
  await acceptLine();
  check('very slow recovery transition follows the resolve', !!await until(() => game.shipMemory?.snapshot().beat === 'shore_transition', 5000));
  await page.waitForTimeout(4700);
  const recovery = await page.evaluate(() => game.shipMemory.snapshot());
  check('recovery reaches a near-white transition before shore', recovery.recoveryAlpha > 0.95, JSON.stringify(recovery));
  await shot('sinking_08_slow_recovery');

  check('shore arrival starts lying with helper disposed and party removed', !!await until(() => game.mapId === 'jjajang_shore'
    && game.player.pose === 'lying' && !game.shipMemory && game.party.length === 0, 10000));
  const shoreOne = await readWaitingLine();
  check('first beach narration is exact while lying', shoreOne?.text === '* ... ...'
    && await page.evaluate(() => game.player.pose === 'lying'), JSON.stringify(shoreOne));
  await shot('sinking_09_beach_first_line');
  const checkpoint = await page.evaluate(() => JSON.parse(localStorage.getItem('subtarune.save.v1')));
  check('arrival checkpoint is resumable from shore beat', checkpoint.map === 'jjajang_shore'
    && checkpoint.party.length === 0 && !checkpoint.flags.ship_sinking_done, JSON.stringify(checkpoint));

  await open();
  check('interruption returns to title with checkpoint', !!await until(() => game.state === 'title' && game.hasSave(), 20000));
  await press('KeyZ');
  await page.waitForTimeout(300);
  for (let index = 0; index < 40 && await page.evaluate(() => game.title?.phase !== 'locked'); index += 1) {
    await press('KeyC');
    await page.waitForTimeout(250);
  }
  await page.waitForTimeout(3300);
  await press('KeyC');
  check('Continue resumes known beach-arrival beat lying', !!await until(() => game.mapId === 'jjajang_shore'
    && game.dialogue.running && game.player.pose === 'lying' && !game.flags.ship_sinking_done, 15000));
  const resumedOne = await readWaitingLine();
  check('resumed beach first line repeats exactly', resumedOne?.text === '* ... ...', JSON.stringify(resumedOne));
  await acceptLine();
  const shoreTwo = await readWaitingLine();
  check('second beach narration is exact while lying', shoreTwo?.text === '* 여긴 어디지.'
    && await page.evaluate(() => game.player.pose === 'lying'), JSON.stringify(shoreTwo));
  await shot('sinking_10_beach_second_line');
  await acceptLine();
  check('get-up returns solo field control without reunion', !!await until(() => game.mapId === 'jjajang_shore'
    && game.state === 'field' && !game.dialogue.running && game.player.pose !== 'lying'
    && game.party.length === 0 && game.entities.every(entity => entity.def?.type !== 'follower')
    && game.flags.ship_sinking_done, 10000));
  await shot('sinking_11_getup_solo_control');
});
