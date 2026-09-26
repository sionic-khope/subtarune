import assert from 'node:assert/strict';
import { runScenario } from './lib/harness.mjs';

// BUILD364 결말: 동료 합류·대사 → 빛·하트 상승(heart_rise)·세로 빛의 파장 → 경섭이 받음(김형섭) → 하트 귀환·나레이션 → 보라 코드 → 빛의 요플래 → 영클 → 왼쪽으로
//   → 검은 화면 나레이션 4줄 → 라운지 퍼레이드(lounge_parade, 대사 없음, 다섯 장면).
await runScenario({ name: 'castle-epilogue', launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] } }, async ({ page, open, until, shot, check }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await open({ qa: 'castle_epilogue' });
  assert.ok(await until(() => window.game?.mapId === 'gajaeman_castle_sunset' && !!game.castleDescent, 30000));
  const S = () => page.evaluate(() => ({ map: game.mapId, running: game.dialogue.running, waiting: game.textbox.isOpen && game.textbox.state === 'waiting', text: game.textbox.node?.text,
    bgm: game.sound.bgmName, card: game.castleDescent?.card?.text || null, heart: !!game.castleDescent?.heart, light: !!game.castleDescent?.lightForm, flags: { parade: !!game.flags.ship_lounge_epilogue_seen } }));
  const lines = [], cards = new Set(), bgms = new Set(); let n = 0, sawHeart = false, sawLight = false, loungeAt = null;
  for (let i = 0; i < 2400; i++) {
    const s = await S();
    if (s.bgm) bgms.add(s.bgm); if (s.card) cards.add(s.card); if (s.heart) sawHeart = true; if (s.light) sawLight = true;
    if (s.waiting) { if (lines.at(-1) !== s.text) { lines.push(s.text); await shot(`l-${String(lines.length).padStart(2, '0')}`); } await page.keyboard.press('KeyC'); await page.waitForTimeout(110); continue; }
    if (s.map === 'ship_lounge_epilogue') { loungeAt ??= i; if (s.flags.parade) { await shot('parade-end'); break; } }
    if (i % 6 === 0) await shot(`f-${String(n++).padStart(3, '0')}`);
    await page.waitForTimeout(120);
  }
  const plain = lines.map(t => (t || '').replace(/\{[^}]*\}/g, ''));
  const expect = ['요 요플래형!!', '괜찮아?!', '쓰 쓰러트린건가?!', '그.. 그런거같아..', '저 저건..', '돌아왔구나 형섭아.', '가재맨과 요플래는 다시 하나가 되었습니다.', '저를 도와주셔서 고마웠습니다.',
    '가재맨은.. 그저 상처만 가지고 있었을 뿐이에요.', '모두가 김형섭을 구하기위해 달리는 모습을 보고', '다시 한번 사랑받고 있음을.', '느낀것같습니다.', '... 요플래', '이제 집에 갈 시간입니다.',
    '뭐.. 집에 가려면 일단 저 배부터 고쳐야하니까', '같이 가시죠.', 'ㅇㅈ', 'ㅅㅂ 내가어떻게만든 전함인데', '수리를 빨리 도와라', '요플래 니도 우리 엄청대박인배 동료임 ㅇㅇ', '하하하', '가자. 집에'];
  check('epilogue lines verbatim', expect.every(e => plain.some(t => t.includes(e))), JSON.stringify(plain.filter(t => !expect.some(e => t.includes(e)))));
  check('heart rose and came back as the light form', sawHeart && sawLight);
  check('heart song then wind', bgms.has('heart_rise') && bgms.has('wind'), JSON.stringify([...bgms]));
  check('black-screen narration', ['...', '그렇게 우리는, 김형섭과 세상을 구했다.', '요플래와 우리는 엄청대박인배를 고치고', '모두를 모았으며, 집에 갈 준비를 마쳤다.'].every(t => cards.has(t)), JSON.stringify([...cards]));
  check('lounge parade reached with its song', loungeAt != null && bgms.has('lounge_parade'), JSON.stringify([...bgms]));
});
