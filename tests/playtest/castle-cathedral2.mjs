import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { runScenario } from './lib/harness.mjs';

// BUILD325: 대성당1 꼭대기 → 가재맨 이동 → 둘째 회랑(브금 연속) → 중간 검 9개 대치·구출 → 레이저 지원 3자루 → 이어하기.
await runScenario({ name: 'castle-cathedral2', launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] } }, async ({ page, open, until, press, shot, fixture, check }) => {
  const obs = { beats: {}, triples: [] };
  const key = async code => { await press(code, { delay: 40 }); await page.waitForTimeout(90); };
  const snap = () => page.evaluate(() => ({ map: game.mapId, xy: [Math.round(game.player.x), Math.round(game.player.y)], state: game.state,
    dialogue: game.dialogue.running, text: game.textbox.isOpen ? game.textbox.node?.text : null, bgm: game.sound.bgmName,
    bgmTime: game.sound.bgm?.currentTime ?? null, hp: ['hyungsub', ...game.party].map(id => game.hpOf(id)), scene: game.castleCathedral?.snapshot || null }));
  const waitLine = async text => {
    const ok = await page.waitForFunction(t => game.textbox.isOpen && game.textbox.state === 'waiting' && game.textbox.node?.text === t, text, { timeout: 20000, polling: 80 }).then(() => true, () => false);
    if (!ok) await shot('fail-line');
    assert.ok(ok, `line ${text}: ${JSON.stringify(await snap())}`);
  };
  await page.setViewportSize({ width: 1280, height: 900 });
  await open({ qa: 'castle_cathedral_climb' });
  assert.ok(await until(() => window.game?.mapId === 'gajaeman_castle_cathedral' && game.state === 'field' && !game.transitioning && !game.dialogue.running, 30000));
  await fixture('near-first-top', 'Move the leader to y1400 of the first hall so the top handoff can be walked with real input; hazards stay live.', () => {
    game.player.y = 1400; game.spawnParty(); game.camera.snap();
  });
  await page.keyboard.down('ArrowUp');
  try {
    assert.ok(await until(() => game.castleCathedral?.beat === 'leave', 20000), 'boss leaves near the top');
    await page.keyboard.up('ArrowUp');
    await page.waitForTimeout(250); await shot('01-leave');
    check('boss is on screen when he starts to leave', await page.evaluate(() => { const a = game.entities.find(e => e.id === 'cathedral_gajaeman'); return a && a.y + a.h > game.camera.y && a.y < game.camera.y + 360; }));
    await page.waitForTimeout(700); await shot('01b-leave-mid');
    await page.keyboard.down('ArrowUp');
    obs.beats.leave = await snap();
    assert.ok(await until(() => game.mapId === 'gajaeman_castle_cathedral2', 30000), 'north edge leads to hall 2');
  } finally { await page.keyboard.up('ArrowUp'); }
  assert.ok(await until(() => !game.transitioning && game.fade.alpha < 0.05, 10000));
  await page.waitForTimeout(400); await shot('02-hall2-start'); obs.beats.start = await snap();
  check('climb music continues across the hall change', obs.beats.start.bgm === 'cathedral_climb' && obs.beats.start.bgmTime > obs.beats.leave.bgmTime, JSON.stringify([obs.beats.leave.bgmTime, obs.beats.start.bgmTime]));
  check('hall 2 starts armed with heart and gajaeman at the far top', obs.beats.start.scene?.climbing && obs.beats.start.scene?.heart);
  // 중간 대치는 QA 시작점에서 실제로 걸어 올라가 발동
  await open({ qa: 'castle_cathedral2_rescue' });
  assert.ok(await until(() => window.game?.mapId === 'gajaeman_castle_cathedral2' && game.state === 'field' && !game.transitioning, 30000));
  await page.keyboard.down('ArrowUp');
  try { assert.ok(await until(() => game.dialogue.running && game.castleCathedral?.snapshot.event, 15000), 'rescue scene starts at mid hall'); }
  finally { await page.keyboard.up('ArrowUp'); }
  assert.ok(await until(() => game.castleCathedral?.beat === 'swarm', 10000)); await page.waitForTimeout(1200); await shot('03-swarm');
  await waitLine('* 으...윽 이런..!'); await shot('04-heroes-line'); await key('KeyC');
  await waitLine('* 아 안돼..'); await key('KeyC');
  assert.ok(await until(() => game.castleCathedral?.beat === 'gather', 8000)); await page.waitForTimeout(1800); await shot('05-gather');
  assert.ok(await until(() => game.castleCathedral?.beat === 'rescue', 8000));
  await page.waitForTimeout(900); await shot('06-lasers');
  await page.waitForTimeout(900); await shot('07-junhee-smash');
  await waitLine('* 어서 가자!!'); await shot('08-junhee-line'); await key('KeyC');
  await waitLine('* 후후후 내 레이저로 지원해드리겠..슴 ;;'); await key('KeyC');
  assert.ok(await until(() => game.state === 'field' && !game.dialogue.running && game.castleCathedral?.snapshot.rescued, 10000));
  await page.waitForTimeout(800); await shot('09-support'); obs.beats.support = await snap();
  check('junhee trails the party and youngcle escorts on the left', obs.beats.support.scene.junhee && obs.beats.support.scene.youngcle?.visible && obs.beats.support.scene.youngcle.x < 288, JSON.stringify(obs.beats.support.scene));
  check('rescue saved', await page.evaluate(() => JSON.parse(localStorage.getItem(game.constructor.SAVE_KEY)).flags.castle_cathedral_rescue_done === true));
  // 지원 뒤 3자루: 영클 느낌표 → 레이저로 한 줄을 연다 → 나머지 두 자루 발사
  await page.keyboard.down('ArrowUp');
  let warned = false, lasered = false;
  try {
    const t0 = Date.now();
    while (Date.now() - t0 < 30000 && !(warned && lasered)) {
      const s = await page.evaluate(() => ({ swords: game.castleCathedral.swords.map(w => ({ lane: w.lane, phase: w.phase, t: +w.t.toFixed(2), triple: !!w.triple, laser: !!w.laser })),
        lane: [320, 384, 448].reduce((b, x, i) => Math.abs(x - game.player.x - 12) < Math.abs([320, 384, 448][b] - game.player.x - 12) ? i : b, 0) }));
      const triple = s.swords.filter(w => w.triple);
      if (triple.length && !warned && triple.some(w => w.laser && w.t >= 0.3)) { warned = true; await shot('10-youngcle-alert'); }
      if (triple.some(w => w.phase === 'broken') && !lasered) { lasered = true; await page.waitForTimeout(60); await shot('11-laser-gap'); obs.triples.push(s); }
      await page.waitForTimeout(40);
    }
  } finally { await page.keyboard.up('ArrowUp'); }
  check('triple volley: youngcle alerts then opens one lane that is not the player lane', warned && lasered && obs.triples.every(t => t.swords.filter(w => w.phase === 'broken').every(w => w.lane !== t.lane)), JSON.stringify(obs.triples));
  // 이어하기: 합류 상태 복원
  await key('Escape'); assert.ok(await until(() => game.state === 'title' && game.title.phase === 'wait', 10000));
  await key('Space'); assert.ok(await until(() => game.title.phase === 'zoom', 5000));
  await key('KeyC'); assert.ok(await until(() => game.title.phase === 'locked' && game.title.time > 3.05, 5000));
  await key('KeyC'); assert.ok(await until(() => game.state === 'field' && !game.transitioning, 20000));
  await page.waitForTimeout(1500); obs.beats.continued = await snap(); await shot('12-continue');
  check('continue restores junhee, youngcle escort and the armed climb', obs.beats.continued.map === 'gajaeman_castle_cathedral2' && obs.beats.continued.scene?.rescued && obs.beats.continued.scene?.junhee && obs.beats.continued.scene?.climbing && !obs.beats.continued.dialogue, JSON.stringify(obs.beats.continued));
  fs.writeFileSync(path.join(process.env.SHOT_DIR, 'observations.json'), JSON.stringify(obs, null, 2));
});
