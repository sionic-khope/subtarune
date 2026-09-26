import assert from 'node:assert/strict';
import { runScenario } from './lib/harness.mjs';

// BUILD370 마지막 작별 → 엔딩 크레딧: 대사 원문, 경섭 마지막 대사는 2초 동안 C 로 못 넘김, 문 닫히고 크레딧 곡·로고·The End.
await runScenario({ name: 'ship-farewell', launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] } }, async ({ page, open, until, shot, check }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await open({ qa: 'ship_lounge_farewell' });
  assert.ok(await until(() => window.game?.mapId === 'ship_lounge_farewell' && !!game.castleDescent, 30000));
  const S = () => page.evaluate(() => ({ waiting: game.textbox.isOpen && game.textbox.state === 'waiting', text: game.textbox.node?.text, credits: !!game.castleDescent?.credits?.started, bgm: game.sound.bgmName }));
  const lines = []; let n = 0, holdOk = null;
  for (let i = 0; i < 900; i++) {
    const s = await S();
    if (s.credits) break;
    if (s.waiting) {
      if (lines.at(-1) !== s.text) {
        lines.push(s.text); await shot(`l-${String(lines.length).padStart(2, '0')}`);
        if ((s.text || '').includes('우리의 밤을 지켜줘서 고마워.')) {
          await page.keyboard.press('KeyC'); await page.waitForTimeout(300);
          holdOk = (await S()).text === s.text;
          await page.waitForTimeout(2000);
        }
      }
      await page.keyboard.press('KeyC'); await page.waitForTimeout(120); continue;
    }
    if (i % 5 === 0) await shot(`f-${String(n++).padStart(3, '0')}`);
    await page.waitForTimeout(120);
  }
  const creditsBgm = (await S()).bgm;
  for (let i = 0; i < 6; i++) { await page.waitForTimeout(3000); await shot(`c-${i}`); }
  await page.evaluate(() => { const c = game.castleDescent.credits, a = game.sound.bgm; c.offset = (isFinite(a?.duration) ? a.duration : 99.7) - 6 - c.t; });
  await page.waitForTimeout(5000); await shot('the-end');
  // 크레딧 곡이 끝나면 3초 뒤 쿠키(처음 집): 곡이 다시 나오지 않고, 카메라·확대가 방 기준으로 풀린다
  // 개발 서버는 오디오 탐색이 안 돼 곡 끝을 흉내 낸다(끝난 곡 = paused + ended). 끝난 뒤 키를 눌러도 다시 나오면 안 된다
  await page.evaluate(() => { const a = game.sound.bgm; if (a) { a.pause(); Object.defineProperty(a, 'ended', { get: () => true }); } });
  for (let i = 0; i < 3; i++) { await page.keyboard.press('KeyZ'); await page.waitForTimeout(300); }
  const replay = await page.evaluate(() => !game.sound.bgm?.paused && game.sound.bgmName === 'ending_credits');
  check('ended credits song is not restarted by a key press', !replay, String(replay));
  const home = await until(() => game.mapId === 'room' && !game.transitioning, 30000);
  await page.waitForTimeout(2500);
  for (let i = 0; i < 3; i++) { await page.keyboard.press('KeyZ'); await page.waitForTimeout(200); }
  const room = await page.evaluate(() => ({ map: game.mapId, locked: !!game.camera.locked, zoom: +game.zoom.s.toFixed(2), bgm: game.sound.bgmName, credits: !game.sound.bgm?.paused && game.sound.bgmName === 'ending_credits' }));
  await shot('cookie-room');
  check('credits hand over to the cookie room', !!home && room.map === 'room', JSON.stringify(room));
  check('cookie room camera follows at zoom 1', !room.locked && room.zoom === 1, JSON.stringify(room));
  check('credits song does not play again', room.bgm !== 'ending_credits' && !room.credits, JSON.stringify(room));
  const plain = lines.map(t => (t || '').replace(/\{[^}]*\}/g, ''));
  const expect = ['...', '그럼 ㅅㄱ', '즐거웠음', '요플래형. 고마웠어요.', '뭐 또 볼 날이 있겠죠', '요플래', '아니', '가재맨', '우리의 밤을 지켜줘서 고마워.'];
  check('farewell lines verbatim', expect.every(e => plain.some(t => t.includes(e))), JSON.stringify(plain));
  check('last line holds for 2 seconds', holdOk === true, String(holdOk));
  check('credits roll with the ending song', creditsBgm === 'ending_credits', creditsBgm);
});
