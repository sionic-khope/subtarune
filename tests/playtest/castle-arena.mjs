import assert from 'node:assert/strict';
import { runScenario } from './lib/harness.mjs';

// BUILD332: 결전지 도착 연출 전체를 실제 C 입력으로 넘기며 대사 순서·비트·중간 프레임을 기록한다.
await runScenario({ name: 'castle-arena', launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] } }, async ({ page, open, until, shot, check }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await open({ qa: 'castle_arena' });
  assert.ok(await until(() => window.game?.mapId === 'gajaeman_castle_arena' && !!game.castleArena, 30000), 'arena loads');
  const lines = [], beats = [];
  let shots = 0, lastShot = 0, minCamY = Infinity, maxFountain = 0;
  const t0 = Date.now();
  for (let i = 0; i < 900; i++) {
    const s = await page.evaluate(() => ({ running: game.dialogue.running, waiting: game.textbox.isOpen && game.textbox.state === 'waiting', text: game.textbox.isOpen ? game.textbox.node?.text : null,
      speaker: game.textbox.node?.speaker, scene: game.castleArena?.snapshot, cam: [Math.round(game.camera.x), Math.round(game.camera.y)], zoom: game.zoom?.s ?? 1,
      stage: !!game.flags.castle_arena_seen, bgm: game.sound.bgmName }));
    minCamY = Math.min(minCamY, s.cam[1]); maxFountain = Math.max(maxFountain, s.scene?.fountain || 0);
    const key = JSON.stringify([s.scene?.level, s.scene?.erupting, s.scene?.charging > 0, s.scene?.orb?.phase, (s.scene?.swords || []).join(), s.scene?.fountain > 0]);
    if (beats.at(-1)?.key !== key) { beats.push({ key, at: ((Date.now() - t0) / 1000).toFixed(1), cam: s.cam }); await shot(`beat-${String(beats.length).padStart(2, '0')}`); shots++; }
    else if (Date.now() - lastShot > 1400 && !s.waiting) { lastShot = Date.now(); await shot(`frame-${String(i).padStart(3, '0')}`); }
    if (s.waiting) {
      if (lines.at(-1) !== s.text) { lines.push(`${s.speaker || ''}|${s.text}`); if (lines.length % 4 === 1) await shot(`line-${String(lines.length).padStart(2, '0')}`); }
      await page.keyboard.press('KeyC'); await page.waitForTimeout(120);
    } else await page.waitForTimeout(150);
    if (!s.running && s.stage) break;
  }
  await shot('end');
  const final = await page.evaluate(() => ({ stage: !!game.flags.castle_arena_seen, cam: [game.camera.x, game.camera.y], scene: game.castleArena?.snapshot }));
  const expected = ['...', '섭타룬.', '내가 지금 이렇게 활동할 수 있는 힘의 근원이자', '모든 것을 없애버릴 수 있는 강력한 힘', '그것이 섭타룬이다.', 'ㅇㅉ',
    '왜 너희는 나를 방해하려고 하는거지?', '어차피 김형섭이라는 인간은, 너희에게 그렇게 소중하지 않잖아?', '내가 받아왔던 치부처럼.', 'ㄹㅇ', '영클아', '김형섭은'];
  check('opening lines verbatim and in order', expected.every((t, i) => lines[i]?.endsWith(`* ${t}`)), JSON.stringify(lines.slice(0, 12)));
  check('all 47 lines shown', lines.length === 47, `${lines.length} ${JSON.stringify(lines)}`);
  check('the full sequence ran: aura, eruption, charge, orb, swords stuck, fountain', ['true', 'held', 'stuck'].every(k => beats.some(b => b.key.includes(k))) && maxFountain > 3000, JSON.stringify(beats));
  check('camera climbs far above the arena, then returns to the heroes', minCamY < 400 && final.cam[1] > 2600, JSON.stringify([minCamY, final.cam]));
  check('arrival saved as a stage', final.stage);
  check('tense bgm (SPAWN) plays after youngcle is struck', await page.evaluate(() => game.sound.bgmName === 'castle_gajaeman'));
  console.log('BEATS', JSON.stringify(beats));
});
