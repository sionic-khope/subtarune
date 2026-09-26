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
  for (let i = 0; i < 6; i++) { await page.waitForTimeout(3000); await shot(`c-${i}`); }
  await page.evaluate(() => { const c = game.castleDescent.credits, a = game.sound.bgm; c.offset = (isFinite(a?.duration) ? a.duration : 99.7) - 6 - (a?.currentTime || c.t); });
  await page.waitForTimeout(5000); await shot('the-end');
  const plain = lines.map(t => (t || '').replace(/\{[^}]*\}/g, ''));
  const expect = ['...', '그럼 ㅅㄱ', '즐거웠음', '요플래형. 고마웠어요.', '뭐 또 볼 날이 있겠죠', '요플래', '아니', '가재맨', '우리의 밤을 지켜줘서 고마워.'];
  check('farewell lines verbatim', expect.every(e => plain.some(t => t.includes(e))), JSON.stringify(plain));
  check('last line holds for 2 seconds', holdOk === true, String(holdOk));
  check('credits roll with the ending song', (await S()).bgm === 'ending_credits', (await S()).bgm);
});
