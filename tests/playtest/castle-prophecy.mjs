import assert from 'node:assert/strict';
import { runScenario } from './lib/harness.mjs';

// BUILD328: 샘 방 북쪽 → 예언의 회랑(브금 Dark Place) → 오른쪽으로 걸으며 예언 6장이 왼쪽에 페이드인 → 남색 대문 C → 대화.
await runScenario({ name: 'castle-prophecy', launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] } }, async ({ page, open, until, press, shot, fixture, check }) => {
  const key = async code => { await press(code, { delay: 40 }); await page.waitForTimeout(90); };
  await page.setViewportSize({ width: 1280, height: 900 });
  await open({ qa: 'castle_spire_after' });
  assert.ok(await until(() => window.game?.mapId === 'gajaeman_castle_spire' && game.state === 'field' && !game.transitioning && !game.dialogue.running, 30000));
  await fixture('spring-room', 'Place the leader in the spring room below the north passage.', () => { game.player.y = 200; game.spawnParty(); game.camera.snap(); });
  await page.keyboard.down('ArrowUp');
  try { assert.ok(await until(() => game.mapId === 'gajaeman_castle_prophecy', 15000), 'north passage leads to the prophecy hall'); }
  finally { await page.keyboard.up('ArrowUp'); }
  assert.ok(await until(() => !game.transitioning && game.fade.alpha < 0.05, 10000));
  await page.waitForTimeout(600); await shot('00-start');
  check('dark place plays', await page.evaluate(() => game.sound.bgmName === 'dark_place'));
  // BUILD331: 입구는 아래 → 위로 올라간 뒤 오른쪽
  await page.keyboard.down('ArrowUp');
  try { assert.ok(await until(() => game.player.y <= 340, 8000), 'walk up the entry'); } finally { await page.keyboard.up('ArrowUp'); }
  await shot('00b-turn');
  const reveals = [];
  await page.keyboard.down('ArrowRight');
  const t0 = Date.now();
  try {
    for (let i = 0; i < 6; i++) {
      assert.ok(await page.waitForFunction(n => game.prophecyHall?.snapshot[n] > 0, i, { timeout: 12000, polling: 50 }).then(() => true, () => false), `panel ${i + 1} appears`);
      reveals.push((Date.now() - t0) / 1000);
      await page.waitForTimeout(1300);
      await shot(`panel-${i + 1}`);
      const r = await page.evaluate(async n => { const { panelRect } = await import('/src/scenes/prophecy-hall.js'); return panelRect(game.prophecyHall.panels[n], game.camera.x); }, i);
      check(`panel ${i + 1} fully in view after fading in`, r.x >= 0 && r.x + r.w <= 480, JSON.stringify(r));
    }
    assert.ok(await until(() => game.player.x > 7300, 15000));
  } finally { await page.keyboard.up('ArrowRight'); }
  const gaps = reveals.slice(1).map((t, i) => +(t - reveals[i]).toFixed(2));
  check('panels about 5s apart', gaps.every(g => g > 4.4 && g < 5.8), JSON.stringify(gaps));
  await page.keyboard.down('ArrowUp'); await page.waitForTimeout(300); await page.keyboard.up('ArrowUp');
  await shot('door-before');
  await key('KeyC');
  assert.ok(await until(() => game.textbox.isOpen && game.textbox.state === 'waiting', 12000), 'door talk starts');
  await shot('door-first-line');
  const lines = [];
  for (let i = 0; i < 24; i++) {
    const t = await page.evaluate(() => game.textbox.isOpen && game.textbox.state === 'waiting' ? game.textbox.node?.text : null);
    if (t && lines.at(-1) !== t) { lines.push(t); if (lines.length === 6) await shot('door-mid'); }
    if (!(await page.evaluate(() => game.dialogue.running))) break;
    await key('KeyC'); await page.waitForTimeout(250);
  }
  check('all 12 lines shown', lines.length === 12, JSON.stringify(lines));
  assert.ok(await until(() => !game.dialogue.running && game.state === 'field', 8000));
  check('door talk saved', await page.evaluate(() => game.flags.castle_prophecy_door_done === true));
});
