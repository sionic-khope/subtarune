import assert from 'node:assert/strict';
import { runScenario } from './lib/harness.mjs';

// BUILD359/363(3초 빨리 도착, 착지 뒤 곡 멎음): 뗏목 점프 → 곡(원곡 42.7초부터) → 화면 전체 상승(성벽 → 노을 바다, 슬로우모션) → 원곡 58초 흰 번쩍임·노을 땅 → 가재맨 도망 → 앞덤블링 → 원곡 64초 무릎 착지(챱).
await runScenario({ name: 'castle-rise', launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] } }, async ({ page, open, until, shot, check }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await open({ qa: 'castle_raft' });
  assert.ok(await until(() => window.game?.mapId === 'gajaeman_castle_raft', 30000));
  const S = () => page.evaluate(() => ({ map: game.mapId, running: game.dialogue.running, waiting: game.textbox.isOpen && game.textbox.state === 'waiting', text: game.textbox.node?.text,
    T: game.riseT, bgm: game.sound.bgmName, gj: !!game.castleDescent?.gj?.visible, launching: !!game.castleDescent?.launching, fade: +(game.fade?.alpha ?? 0).toFixed(2), button: !!game.castleDescent?.button, tumble: game.castleDescent?.tumble ? { u: +game.castleDescent.tumble.u.toFixed(2), landed: !!game.castleDescent.tumble.landed } : null }));
  let n = 0, sawGajaeman = false, sawTumble = false, landedAt = null;
  for (let i = 0; i < 700; i++) {
    const s = await S();
    if (s.map === 'gajaeman_castle_sunset' && s.gj) sawGajaeman = true;
    if (s.tumble) sawTumble = true;
    if (s.tumble?.landed && landedAt == null) landedAt = s.T;
    if (s.waiting) { await page.keyboard.press('KeyC'); await page.waitForTimeout(120); continue; }
    if (s.T != null || s.launching || s.fade > 0.05 || s.map === 'gajaeman_castle_sunset') { await shot(`r-${String(n++).padStart(3, '0')}`); await page.waitForTimeout(260); }
    else await page.waitForTimeout(150);
    if ((s.button || !s.running) && s.map === 'gajaeman_castle_sunset' && i > 5) break;
  }
  await shot('end');
  const end = await page.evaluate(() => ({ map: game.mapId, arrived: !!game.flags.castle_sunset_arrived, visible: game.player.visible, feet: [Math.round(game.player.x + game.player.w / 2), Math.round(game.player.y + game.player.h)], bgm: game.sound.bgmName }));
  check('rise ends on the sunset ground', end.map === 'gajaeman_castle_sunset' && end.arrived, JSON.stringify(end));
  check('the same song keeps playing after landing', end.bgm === 'save_the_world_full', end.bgm);
  check('gajaeman was up there first', sawGajaeman);
  check('tumble played and landed on the 64s drop', sawTumble && landedAt != null && landedAt >= 21.1 && landedAt < 21.8, String(landedAt));
  check('yoplae stays kneeling on the landing spot', !end.visible && Math.abs(end.feet[0] - 300) < 4 && Math.abs(end.feet[1] - 262) < 4, JSON.stringify(end.feet));
});
