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
      const cam = game.camera, map = game.map, zm = game.zoom || { s: 1 }, z = zm.s ?? 1;
      // 실제 그리기와 같은 줌 변환(main.js draw): 화면 가장자리의 월드 좌표
      let toWorld = (sx, sy) => [cam.x + sx, cam.y + sy];
      if (z > 1.0001) {
        const Fx = zm.fx - cam.x, Fy = zm.fy - cam.y, k = zm.smax > 1 ? Math.min(1, (z - 1) / (zm.smax - 1)) : 1;
        const Cx = Fx + (240 - Fx) * k, Cy = Fy + (180 - Fy) * k;
        toWorld = (sx, sy) => [cam.x + (sx - Cx) / z + Fx, cam.y + (sy - Cy) / z + Fy];
      } else if (z < 0.9999) toWorld = (sx, sy) => [cam.x + (sx - 240) / z + 240, cam.y + (sy - 180) / z + 180];
      const [viewLeft, viewTop] = toWorld(0, 0), [viewRight, viewBottom] = toWorld(480, 360);
      const viewW = viewRight - viewLeft, viewH = viewBottom - viewTop, holes = [];
      if (viewBottom > map.pxH + 0.5) holes.push(['below-map', Math.round(viewBottom)]);
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
