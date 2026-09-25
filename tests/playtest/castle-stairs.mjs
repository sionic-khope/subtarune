import assert from 'node:assert/strict';
import { runScenario } from './lib/harness.mjs';

// BUILD334: 무너지는 계단을 실제 방향키로 끝까지 오른다. 주먹이 뒤 계단을 부수는 횟수, 몬스터·누누 연출, 오르는 시간을 잰다.
await runScenario({ name: 'castle-stairs', launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] } }, async ({ page, open, until, shot, check }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await open({ qa: 'castle_stairs' });
  assert.ok(await until(() => window.game?.mapId === 'gajaeman_castle_stairs' && !!game.castleStairs && game.state === 'field' && !game.transitioning, 30000));
  await page.waitForTimeout(500); await shot('00-start');
  const held = new Set();
  const setKeys = async want => {
    for (const k of [...held]) if (!want.has(k)) { await page.keyboard.up(k); held.delete(k); }
    for (const k of want) if (!held.has(k)) { await page.keyboard.down(k); held.add(k); }
  };
  const lines = []; const t0 = Date.now(); let walkMs = 0, last = Date.now(), shots = 0, lastShot = 0;
  let snap, lastKey = '', i0 = 0, lastBeat = '';
  for (let i = 0; i < 2000; i++) {
    snap = await page.evaluate(() => {
      const s = game.castleStairs, p = game.player, c = { x: p.x + p.w / 2, y: p.y + p.h / 2 };
      const ahead = s ? s.pointAt(s.progress + 70) : c;
      return { waiting: game.textbox.isOpen && game.textbox.state === 'waiting', text: game.textbox.node?.text, dialogue: game.dialogue.running,
        dx: ahead.x - c.x, dy: ahead.y - c.y, scene: s?.snapshot, flags: [!!game.flags.castle_stairs_monsters_done, !!game.flags.castle_stairs_nunu_done], y: p.y };
    });
    const now = Date.now();
    const beatKey = `${snap.scene?.fallers}|${snap.scene?.nunu}|${snap.scene?.allies?.length}`;
    if (beatKey !== lastBeat) { lastBeat = beatKey; await shot(`beat-${String(i).padStart(4, '0')}`); }
    if (snap.dialogue) {
      await setKeys(new Set());
      if (snap.waiting) { if (lastKey !== `${i0}|${snap.text}`) { lastKey = `${i0}|${snap.text}`; lines.push(snap.text); await shot(`line-${String(lines.length).padStart(2, '0')}`); } await page.keyboard.press('KeyC'); i0++; }
    } else {
      walkMs += now - last;
      const want = new Set();
      if (snap.dy < -6) want.add('ArrowUp');
      if (snap.dx > 10) want.add('ArrowRight'); else if (snap.dx < -10) want.add('ArrowLeft');
      await setKeys(want);
      if (now - lastShot > 2500) { lastShot = now; await shot(`climb-${String(shots++).padStart(2, '0')}`); }
    }
    last = now;
    // 꼭대기 층계참(위 출구 통로 1070px 전)까지가 오르기
    if (snap.scene && snap.scene.progress >= snap.scene.total - 1080) break;
    await page.waitForTimeout(80);
  }
  await setKeys(new Set());
  await shot('top');
  check('reached the top landing', snap.scene.progress >= snap.scene.total - 1080, JSON.stringify(snap.scene));
  check('the fist smashed the steps behind ten times', snap.scene.smashed === 10, JSON.stringify(snap.scene));
  check('monster and nunu encounters both played', snap.flags.every(Boolean), JSON.stringify(snap.flags));
  check('lines verbatim', ['* 으윽,,,몬스터네요 어떡하죠.', '* ...', '* ...', '* 이얍!', '* 이얍!', '* 윽 이런.. 고 고맙다..', '* ...', '* 잘... 부탁한다 너네들 살아서보자.', '* 이얍!', '* 고맙다.. 쥰희야.'].every((t, i) => lines[i] === t), JSON.stringify(lines));
  check('allies all gone after their sacrifices', snap.scene.allies.length === 0, JSON.stringify(snap.scene.allies));
  const walkSeconds = walkMs / 1000;
  check('about a minute of climbing', walkSeconds > 48 && walkSeconds < 68, walkSeconds.toFixed(1));
  console.log('TOTAL', ((Date.now() - t0) / 1000).toFixed(1), 'WALK', walkSeconds.toFixed(1));
});
