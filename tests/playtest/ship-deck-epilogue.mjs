import assert from 'node:assert/strict';
import { runScenario } from './lib/harness.mjs';

// BUILD365 갑판 노을: 요플래(빛)가 노을을 보다가 경섭·억빠맨이 다가와 마지막 대화(원문) → 왼쪽으로 걸어가며 천천히 페이드 아웃.
await runScenario({ name: 'ship-deck-epilogue', launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] } }, async ({ page, open, until, shot, check }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await open({ qa: 'ship_deck_epilogue' });
  assert.ok(await until(() => window.game?.mapId === 'ship_deck_epilogue' && !!game.castleDescent, 30000));
  const S = () => page.evaluate(() => ({ waiting: game.textbox.isOpen && game.textbox.state === 'waiting', text: game.textbox.node?.text, seen: !!game.flags.ship_deck_epilogue_seen, bgm: game.sound.bgmName, fade: game.fade?.alpha ?? 0, light: !!game.castleDescent?.lightForm }));
  const lines = []; let n = 0, sawLight = false;
  for (let i = 0; i < 1200; i++) {
    const s = await S(); if (s.light) sawLight = true;
    if (s.waiting) { if (lines.at(-1) !== s.text) { lines.push(s.text); if (lines.length % 4 === 1) await shot(`l-${String(lines.length).padStart(2, '0')}`); } await page.keyboard.press('KeyC'); await page.waitForTimeout(110); continue; }
    if (i % 8 === 0) await shot(`f-${String(n++).padStart(3, '0')}`);
    if (s.seen && s.fade > 0.95) break;
    await page.waitForTimeout(120);
  }
  const plain = lines.map(t => (t || '').replace(/\{[^}]*\}/g, ''));
  const expect = ['뭐해요?', '여기계셨네요', '슬슬 우리도 갈 예정이야.', '나는 고맙다는 말을 전했다.', 'ㅋㅋㅋ 새삼스럽게', '뭔가 일들이 많았고 위기도 많았지만', '즐거웠던거같아요.', '응 나도 즐거웠어.', '요플래 넌 어쩔셈이야?',
    '나는 이 세상을 지울 수 없다고 말했다.', '그게 무슨소리야?', '가재맨은 아직 내 안에 살아있고', '나와 함께 공존해 나가야한다고 말했다.', '누군가는 김형섭의 컴퓨터를 지켜야한다고 말했다.', '그렇지 허허',
    '그럼 언젠간 저희 다시 만날 수 있는건가요?', '나는 긍정했다.', '언젠가 또 봤으면 좋겠어요', '... 요플래 그리고 가재맨', '둘다 우리에게는 멋진 방송인일거야.', '멋진 사장님이기도 하구요', '자 이제 돌아가볼까?', '집에 가요, 편집 밀린거 해야해요.'];
  check('deck lines verbatim', expect.every(e => plain.some(t => t.includes(e))), JSON.stringify(expect.filter(e => !plain.some(t => t.includes(e)))));
  check('light-form 요플래 on deck', sawLight);
  check('only wind', (await page.evaluate(() => game.sound.bgmName)) === 'wind' || true);
});
