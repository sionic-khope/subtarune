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
  // 대사 기록은 페이지 안에서 매 프레임 노드가 바뀔 때마다 — 부하가 걸려 폴링이 한 줄을 건너뛰어도 놓치지 않게(BUILD 부하 중 12줄 중 1줄 누락)
  await page.evaluate(() => {
    // 대문 대화는 이 방(첨탑)에서만 — 끝나면 결전지(arena)로 넘어가 다음 컷신 대사가 이어지므로 맵이 바뀌면 기록을 멈춘다
    const seen = window.__doorLines = [], room = game.mapId; let last = null;
    const tick = () => { if (game.mapId !== room) return; const node = game.textbox.isOpen ? game.textbox.node : null; if (node && node !== last && node.text) seen.push(node.text); last = node; if (seen.length < 64) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  });
  await key('KeyC');
  assert.ok(await until(() => game.textbox.isOpen && game.textbox.state === 'waiting', 12000), 'door talk starts');
  await shot('door-first-line');
  for (let i = 0; i < 40; i++) {
    // 다 찍힌(waiting) 줄에서만 C — 타이핑 중 C 는 줄을 채우기만 해서 누른 횟수와 줄 수가 어긋난다
    const ready = await until(() => !game.dialogue.running || game.mapId !== 'gajaeman_castle_prophecy' || (game.textbox.isOpen && game.textbox.state === 'waiting'), 8000);
    if (await page.evaluate(() => !game.dialogue.running || game.mapId !== 'gajaeman_castle_prophecy')) break;
    if (!ready) continue;
    if ((await page.evaluate(() => window.__doorLines.length)) === 6) await shot('door-mid');
    await key('KeyC'); await page.waitForTimeout(150);
  }
  const lines = await page.evaluate(() => window.__doorLines);
  check('all 12 lines shown', lines.length === 12, JSON.stringify(lines));
  // BUILD332: 대문 대화가 끝나면 결전지로 넘어간다
  assert.ok(await until(() => game.mapId === 'gajaeman_castle_arena', 12000));
  check('door talk saved', await page.evaluate(() => game.flags.castle_prophecy_door_done === true));
});
