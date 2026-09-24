import assert from 'node:assert/strict';
import { runScenario } from './lib/harness.mjs';

// BUILD323: 미로 출구 → 회복방 도착 첫 대사까지, 실제 방향키로 들어가며 화면 밖(맵 아래 빈 곳)이 보이지 않는지 본다.
await runScenario({ name: 'castle-refuge-arrival', launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] } }, async ({ page, open, until, shot, fixture, check }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await open({ qa: 'castle_dark_chase' });
  assert.ok(await until(() => window.game?.mapId === 'gajaeman_castle_dark_arrival' && game.state === 'field' && !game.transitioning && !game.dialogue.running, 30000));
  await fixture('near-exit', 'Place the leader below the north exit so the real arrow-key exit can be observed; no story flags are changed.', () => {
    const exit = game.entities.find(e => e.def?.to === 'gajaeman_castle_dark_refuge');
    game.player.x = exit.x + exit.w / 2 - game.player.w / 2; game.player.y = exit.y + 150; game.player.facing = 'up';
    game.spawnParty(); game.camera.snap();
  });
  await page.keyboard.down('ArrowUp');
  try { assert.ok(await until(() => game.mapId === 'gajaeman_castle_dark_refuge', 10000), 'reached refuge'); }
  finally { await page.keyboard.up('ArrowUp'); }
  const frames = [];
  for (let i = 0; i < 12; i++) {
    const f = await page.evaluate(() => {
      const cam = game.camera, map = game.map, z = game.zoom?.s ?? 1;
      const viewH = 360 / z, viewTop = cam.y + 180 - viewH / 2;
      const viewW = 480 / z, viewLeft = cam.x + 240 - viewW / 2, holes = [];
      // 방 둘레(3~20열) 안에서 화면에 보이는 빈칸(' ') = 원경이 뚫려 보이는 자리
      for (let row = Math.max(0, Math.floor(viewTop / 32)); row <= Math.min(map.rows.length - 1, Math.floor((viewTop + viewH - 1) / 32)); row++)
        for (let col = Math.max(3, Math.floor(viewLeft / 32)); col <= Math.min(20, Math.floor((viewLeft + viewW - 1) / 32)); col++)
          if (map.rows[row][col] === ' ') holes.push([col, row]);
      return { fade: +game.fade.alpha.toFixed(2), cam: [Math.round(cam.x), Math.round(cam.y)], zoom: z, text: game.textbox.isOpen ? game.textbox.node?.text : null,
        holes, player: [Math.round(game.player.x), Math.round(game.player.y)] };
    });
    frames.push(f);
    if (f.fade < 0.95) await shot(`arrival-${String(i).padStart(2, '0')}`);
    if (f.text) break;
    await page.waitForTimeout(250);
  }
  assert.ok(await until(() => game.textbox.isOpen && game.textbox.state === 'waiting', 10000));
  await shot('arrival-first-line');
  const visible = frames.filter(f => f.fade < 0.95);
  check('arrival frames show no open void inside the room outline', visible.length > 3 && visible.every(f => !f.holes.length), JSON.stringify(frames));
});
