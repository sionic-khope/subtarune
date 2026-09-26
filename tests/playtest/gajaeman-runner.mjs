import assert from 'node:assert/strict';
import { runScenario } from './lib/harness.mjs';

// BUILD363: 노을 땅 SAVE THE WORLD → 흰 화면 준비 동작 → 무지개 레터박스 달리기(곡) → 가재맨 등장·대사 3줄 → 오오라 폭발 → 결전
//   (검 = 점프/베기, 누워 돌진 = C 로 쳐냄 ×5) → 마지막 따라오는 돌진 → 맞붙기 직전 C. 봇이 스냅샷을 보고 X/C 를 누른다.
await runScenario({ name: 'gajaeman-runner', launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] } }, async ({ page, open, until, shot, check }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await open({ qa: 'castle_sunset_run' });
  assert.ok(await until(() => window.game?.mapId === 'gajaeman_castle_sunset' && !!game.castleDescent, 30000));
  const S = () => page.evaluate(() => {
    const d = game.castleDescent, m = game.battle?.gimmick?.snapshot ?? null;
    return { running: game.dialogue.running, waiting: game.textbox.isOpen && game.textbox.state === 'waiting', text: game.textbox.node?.text,
      button: d?.button ? { heart: d.button.heart, pressed: !!d.button.pressed } : null, run: d?.run ? { white: +d.run.white.toFixed(2), boss: d.run.boss.visible } : null,
      battle: !!game.battle, mode: m, bgm: game.sound.bgmName, fade: game.fade?.alpha ?? 0 };
  });
  const lines = []; const lineFades = []; let sawLock = false, maxGauge = 0, lockShots = 0, slashShots = 0, n = 0, sawHum = false, sawHeart = false, sawWhite = false, bgmAtRun = null, maxCounters = 0, sawClashWait = false, jumps = 0;
  for (let i = 0; i < 3000; i++) {
    const s = await S();
    if (s.bgm === 'sunset_hum') sawHum = true;
    if (s.button?.heart) sawHeart = true;
    if (s.run && s.run.white > 0.9) sawWhite = true;
    if (s.run && s.run.white < 0.05 && bgmAtRun == null) bgmAtRun = s.bgm;
    if (s.button?.heart && !s.button.pressed) { await shot(`b-${n++}`); await page.keyboard.press('KeyC'); await page.waitForTimeout(100); continue; }
    if (s.waiting) { if (lines.at(-1) !== s.text) { lines.push(s.text); lineFades.push(s.fade); await shot(`l-${lines.length}`); } await page.keyboard.press('KeyC'); await page.waitForTimeout(120); continue; }
    const m = s.mode;
    if (m) {
      maxCounters = Math.max(maxCounters, m.counters);
      if (m.phase === 'clash_wait') { sawClashWait = true; await shot('clash-wait'); await page.keyboard.press('KeyC'); await page.waitForTimeout(80); continue; }
      if (m.phase === 'lock') { sawLock = true; maxGauge = Math.max(maxGauge, m.gauge); if (lockShots++ % 12 === 0) await shot(`lock-${lockShots}`); await page.keyboard.press('KeyC'); await page.waitForTimeout(110); continue; }
      if (m.phase === 'release' || m.phase === 'slash') { if (slashShots++ % 3 === 0) await shot(`slash-${slashShots}`); }
      const px = m.player.x;
      // 돌진: 가까워지면 C · 검: 앞 40~95px 안에 낮게 오면 X(점프)
      if (m.phase === 'dash' && m.boss.x - px < 105 && m.boss.x - px > 10) { await page.keyboard.press('KeyC'); await page.waitForTimeout(60); continue; }
      if (m.airY === 0 && m.swordList.some(w => w.x - px > 30 && w.x - px < 95 && w.y > 200)) { jumps++; await page.keyboard.press('KeyX'); await page.waitForTimeout(60); continue; }
      if (i % 4 === 0) await shot(`m-${String(n++).padStart(3, '0')}`);
    } else if (i % 3 === 0 && (s.run || s.button)) await shot(`f-${String(n++).padStart(3, '0')}`);
    if (!s.running && !s.battle && i > 20 && !s.run) break;
    await page.waitForTimeout(40);
  }
  await shot('end');
  const end = await page.evaluate(() => ({ fade: game.fade?.alpha ?? 0, gone: !game.castleDescent?.run, clash: !!game.flags.castle_gajaeman_clash, hp: { ...game.partyHp }, bgm: game.sound.bgmName }));
  const plain = lines.map(t => (t || '').replace(/\{[^}]*\}/g, ''));
  check('hum then heart on the SAVE THE WORLD button', sawHum && sawHeart);
  check('white screen before the run', sawWhite);
  check('song starts as the white lifts', bgmAtRun === 'save_the_world_run', String(bgmAtRun));
  check('gajaeman lines verbatim', ['요플래..', '꼭 그렇게 나를 막고싶다면', '여기서 끝을 보자.'].every(e => plain.some(t => t.includes(e))), JSON.stringify(plain));
  check('five counters then the final clash', maxCounters === 5 && sawClashWait, `${maxCounters} ${sawClashWait}`);
  check('clash ends the fight', end.clash, JSON.stringify(end));
  check('blade lock filled by mashing C into the slash', sawLock && maxGauge > 0.9 && slashShots > 0, `${maxGauge} ${slashShots}`);
  check('aftermath lines verbatim', ['...그.. 그래..', '... ... ...', '뭐...', '롤..이나 하러.. 가야겠군'].every(e => plain.some(t => t.includes(e))), JSON.stringify(plain));
  check('gajaeman gone after the smoke', end.gone, JSON.stringify(end));
  check('screen not left faded out', end.fade < 0.05, String(end.fade));
  check('aftermath lines shown on a visible screen', lineFades.every(f => f < 0.05), JSON.stringify(lineFades));
  check('bot had to jump over swords', jumps > 0, String(jumps));
});
