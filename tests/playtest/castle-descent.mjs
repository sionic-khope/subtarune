import assert from 'node:assert/strict';
import { runScenario } from './lib/harness.mjs';

// BUILD358: 꼭대기 뒤 — 끝없는 길(가재맨 도망·착지·섭 몬스터 셋 구간·검 넷과 영클 레이저) → 뗏목 웅덩이(가재맨 상승·대사·뗏목 점프로 벽 꼭대기).
await runScenario({ name: 'castle-descent', launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] } }, async ({ page, open, until, shot, check }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await open({ qa: 'castle_road' });
  assert.ok(await until(() => window.game?.mapId === 'gajaeman_castle_skyroad', 30000));
  const S = () => page.evaluate(() => ({ map: game.mapId, running: game.dialogue.running, waiting: game.textbox.isOpen && game.textbox.state === 'waiting', text: game.textbox.node?.text,
    px: Math.round(game.player.x), scene: game.castleDescent?.snapshot, bgm: game.sound.bgmName }));
  const lines = []; let n = 0, holding = false, maxSwords = 0;
  const seenMaps = new Set();
  for (let i = 0; i < 1600; i++) {
    const s = await S();
    seenMaps.add(s.map);
    maxSwords = Math.max(maxSwords, s.scene?.swords || 0);
    if (s.waiting) {
      if (holding) { await page.keyboard.up('ArrowRight'); holding = false; }
      if (lines.at(-1) !== s.text) { lines.push(s.text); await shot(`l-${String(lines.length).padStart(2, '0')}`); }
      await page.keyboard.press('KeyC'); await page.waitForTimeout(120); continue;
    }
    if (s.running) {
      if (holding) { await page.keyboard.up('ArrowRight'); holding = false; }
      if (i % 3 === 0) await shot(`f-${String(n++).padStart(3, '0')}`);
      await page.waitForTimeout(150); continue;
    }
    if (s.map === 'gajaeman_castle_raft') { if (await page.evaluate(() => !!game.flags.castle_raft_launched)) break; await page.waitForTimeout(150); continue; }
    if (!holding) { await page.keyboard.down('ArrowRight'); holding = true; }
    if (i % 6 === 0) await shot(`w-${String(n++).padStart(3, '0')}`);
    await page.waitForTimeout(150);
  }
  if (holding) await page.keyboard.up('ArrowRight');
  await shot('end');
  const end = await page.evaluate(() => ({ map: game.mapId, flags: ['castle_road_landed', 'castle_road_z1', 'castle_road_z2', 'castle_road_z3', 'castle_road_done', 'castle_raft_launched'].filter(f => game.flags[f]),
    raft: game.castleDescent?.snapshot?.raft, py: Math.round(game.player.y + game.player.h), bgm: game.sound.bgmName }));
  const plain = lines.map(t => (t || '').replace(/\{[^}]*\}/g, ''));
  const expect = ['빨리 가샘 가서 족치고오샘 ㅇㅇ', '올라갔어요!', '윽.', '경섭이형', '응', '지금 저랑 같은생각 하고 계시죠', '그런것같다.', '갈까요!!! 요플래형 부탁해요'];
  check('lines verbatim and in order', expect.every((e, i) => plain.findIndex(t => t.includes(e)) >= 0 && (i === 0 || plain.findIndex(t => t.includes(e)) > plain.findIndex(t => t.includes(expect[i - 1])))), JSON.stringify(plain));
  check('road → raft room', seenMaps.has('gajaeman_castle_skyroad') && end.map === 'gajaeman_castle_raft', JSON.stringify([...seenMaps]));
  check('all road beats played', end.flags.length === 6, JSON.stringify(end.flags));
  check('four swords came in', maxSwords === 4, maxSwords);
  check('raft carried the party up to the ledge', end.raft && end.raft.y < 200 && end.py < 220, JSON.stringify(end));
  check('SAVE The World keeps playing', end.bgm === 'save_the_world', end.bgm);
});
