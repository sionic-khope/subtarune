import assert from 'node:assert/strict';
import { runScenario } from './lib/harness.mjs';

// BUILD373 엔딩 쿠키: 크레딧 뒤 처음 집 — 침대에서 일어나 세 마디 → 컴퓨터(코드 없음) → 서랍 검은 코드 → 컴퓨터: 사진 메시지 → 사진 뷰어 → C 로 메인 메뉴.
await runScenario({ name: 'home-cookie', launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] } }, async ({ page, open, until, shot, check }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await open({ qa: 'home_cookie' });
  assert.ok(await until(() => window.game?.mapId === 'room' && !game.transitioning, 30000));
  const S = () => page.evaluate(() => ({ running: game.dialogue.running, waiting: game.textbox.isOpen && game.textbox.state === 'waiting', text: game.textbox.node?.text, bgm: game.sound.bgmName, photo: !!game.cookiePhoto, state: game.state, map: game.mapId, party: [...game.party] }));
  const lines = [];
  const drive = async (tag, stop, max = 400) => {
    for (let i = 0; i < max; i++) {
      const s = await S();
      if (stop(s)) return s;
      if (s.waiting) { if (lines.at(-1) !== s.text) { lines.push(s.text); await shot(`${tag}-${String(lines.length).padStart(2, '0')}`); } await page.keyboard.press('KeyC'); await page.waitForTimeout(120); continue; }
      if (i % 6 === 0) await shot(`${tag}-f${String(i).padStart(3, '0')}`);
      await page.waitForTimeout(120);
    }
    return S();
  };
  // 1) 크레딧 뒤 방: 누워 있다가 일어나 세 마디
  await page.evaluate(async () => { const m = await import('/src/data/cutscenes/ending_cookie.js'); game.runScript([...m.ending_cookie_wake, { end: true }]); });
  await page.waitForTimeout(400);
  const w = await drive('w', s => !s.running && lines.length >= 3);
  check('wake alone in the room', w.map === 'room' && w.party.length === 0, JSON.stringify(w));
  // 2) 컴퓨터 — 코드가 또 없다
  await page.evaluate(() => game.runScript('room_computer'));
  await drive('p', s => !s.running && lines.length >= 4, 120);
  // 3) 서랍 검은 코드(3D) 모습만 확인하고 취소
  await page.evaluate(() => game.runScript([{ scene3d: 'drawer', cord: 'black' }, { end: true }]));
  await page.waitForTimeout(4500); await shot('drawer-black');
  await page.keyboard.press('KeyX'); await page.waitForTimeout(1500);
  // 4) 코드를 챙긴 뒤 컴퓨터 → 사진 메시지 → 사진 뷰어
  await page.evaluate(() => { game.setFlag('cookie_cord'); game.runScript('room_computer'); });
  const ph = await drive('m', s => s.photo, 200);
  check('photo viewer opens after the message', ph.photo, JSON.stringify(ph));
  for (let i = 0; i < 6; i++) { await page.waitForTimeout(1500); await shot(`v-${i}`); }
  check('photo song plays', (await S()).bgm === 'good_night', (await S()).bgm);
  await page.keyboard.press('KeyC');
  const t = await until(() => game.state === 'title', 8000);
  check('C returns to the main menu', !!t, JSON.stringify(await S()));
  const plain = lines.map(x => (x || '').replace(/\{[^}]*\}/g, ''));
  const expect = ['아', '뭔가 긴 꿈을 꾼거같은데 시간 몇시지.', '아 미친 빨리 방송 켜야겠다!!', '?! 아 코드 또없네 시바', '응? 이건 뭐지?', '두고.. 간 사진.. 보내드립니다..?'];
  check('cookie lines verbatim', expect.every(e => plain.some(p => p.includes(e))), JSON.stringify(plain));
});
