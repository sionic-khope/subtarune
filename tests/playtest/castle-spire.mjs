import assert from 'node:assert/strict';
import { runScenario } from './lib/harness.mjs';

// BUILD327: 둘째 회랑 꼭대기(성공) → 가재맨 이탈 → 남색 오르막 도착 연출(가재맨 샘 방으로 → 쥰희·영클 추격 → 주인공들 뒤따라 입장) → 조작·샘.
await runScenario({ name: 'castle-spire', launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] } }, async ({ page, open, until, shot, fixture, check }) => {
  const snap = () => page.evaluate(() => {
    const find = id => game.entities.find(e => e.id === id && !e.dead);
    const view = e => e && e.visible !== false ? { x: Math.round(e.x), y: Math.round(e.y), onScreen: e.y + e.h > game.camera.y && e.y - 130 < game.camera.y + 360 } : null;
    return { map: game.mapId, state: game.state, dialogue: game.dialogue.running, cam: [Math.round(game.camera.x), Math.round(game.camera.y)],
      bgm: game.sound.bgmName, bgmTime: game.sound.bgm?.currentTime ?? null, windWalk: !!game.windWalk, scene: !!game.castleCathedral,
      gajaeman: view(find('spire_gajaeman')), junhee: view(find('spire_junhee')), youngcle: view(find('spire_youngcle')),
      party: ['player', 'gyeongsub', 'ppaman'].map(id => view(id === 'player' ? game.player : find(id))), stage: !!game.flags.castle_spire_arrived };
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  await open({ qa: 'castle_cathedral2_support' });
  assert.ok(await until(() => window.game?.mapId === 'gajaeman_castle_cathedral2' && game.state === 'field' && !game.transitioning && !game.dialogue.running, 30000));
  await fixture('near-hall2-top', 'Move the leader to y1000 of hall 2 so the success edge is walked with real input.', () => {
    game.player.y = 1000; game.spawnParty(); game.camera.snap();
  });
  await page.keyboard.down('ArrowUp');
  let before;
  try {
    await page.waitForTimeout(1500);
    before = await snap();
    check('hall 2 has no gajaeman at the end', await page.evaluate(() => !game.entities.some(e => e.id === 'cathedral_gajaeman' && !e.dead)));
    assert.ok(await until(() => game.mapId === 'gajaeman_castle_spire', 30000), 'hall-2 north edge leads to the spire');
  } finally { await page.keyboard.up('ArrowUp'); }
  const frames = [];
  for (let i = 0; i < 60; i++) {
    const f = await snap(); frames.push(f);
    if (i % 2 === 0) await shot(`spire-${String(i).padStart(2, '0')}`);
    if (f.stage && !f.dialogue) break;
    await page.waitForTimeout(250);
  }
  const last = frames.at(-1);
  check('climb music continues into the spire', last.bgm === 'cathedral_climb' && last.bgmTime > before.bgmTime, JSON.stringify([before.bgmTime, last.bgmTime]));
  check('no wind drag, heart or sword scene in the spire', frames.every(f => !f.windWalk && !f.scene));
  check('gajaeman is seen before he rushes up and is gone afterwards', frames.some(f => f.gajaeman?.onScreen) && !last.gajaeman);
  check('camera reaches the spring room while he passes', frames.some(f => f.cam[1] < 200));
  check('junhee and youngcle run through the entry view before the heroes appear',
    frames.some(f => f.junhee?.onScreen && f.party.every(p => !p)) && !last.junhee && !last.youngcle);
  check('heroes appear only after the two runners', frames.findIndex(f => f.party[0]) > frames.findIndex(f => f.junhee));
  check('heroes stand in view with 64px spacing, leader in front', last.party.every(p => p?.onScreen) && last.party[1].y > last.party[0].y && last.party[2].x - last.party[1].x === 128, JSON.stringify(last.party));
  check('arrival saved as a story stage', last.stage);
  await shot('spire-control');
  // 조작: 방향키로 샘 방까지 올라가 샘(전원 회복)을 쓴다
  await page.keyboard.down('ArrowUp');
  try { assert.ok(await until(() => game.player.y < 520, 20000), 'walk up into the spring room'); }
  finally { await page.keyboard.up('ArrowUp'); }
  await page.waitForTimeout(400); await shot('spire-room');
  check('spring prop is in the room', await page.evaluate(() => !!game.entities.find(e => e.id === 'spire_spring' && e.visible !== false)));
  // 이어하기: 연출 없이 조작 상태로 복원
  await open({ qa: 'castle_spire_after' });
  assert.ok(await until(() => window.game?.mapId === 'gajaeman_castle_spire' && game.state === 'field' && !game.transitioning, 30000));
  await page.waitForTimeout(600);
  const resumed = await snap();
  check('after the stage the intro does not replay and runners stay gone', !resumed.dialogue && !resumed.gajaeman && !resumed.junhee && !resumed.youngcle, JSON.stringify(resumed));
});
