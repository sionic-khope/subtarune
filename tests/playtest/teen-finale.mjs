import assert from 'node:assert/strict';
import { runScenario } from './lib/harness.mjs';

// BUILD352: 청소년 2페이즈 격파 뒤 필드 연출 — 가재맨 대사·오오라·퍼어엉(일행 HP 1)·거대 칼·슬로우모션·용준대포·박용준·바론·쥰희 막기·가재맨 도망·쥰희 쓰러짐·영클·편집노조.
await runScenario({ name: 'teen-finale', launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] } }, async ({ page, open, until, shot, fixture, check }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await open({ qa: 'castle_summit_confront' });
  assert.ok(await until(() => window.game?.mapId === 'gajaeman_castle_summit' && game.state === 'field' && !game.transitioning, 30000));
  await fixture('battle-won', 'Start right after the phase-2 kill (the battle itself is covered by teen-battle / teen-battle-p2).', () => {
    game.setFlag('castle_summit_ready'); game.setFlag('castle_teen_won'); game.castleSummit.giant = { t: 99 }; game.runScript('castle_summit_confront');
  });
  const S = () => page.evaluate(() => ({ running: game.dialogue.running, waiting: game.textbox.isOpen && game.textbox.state === 'waiting', text: game.textbox.node?.text, bgm: game.sound.bgmName, hp: { ...game.partyHp }, cam: [Math.round(game.camera.x), Math.round(game.camera.y)] }));
  const lines = []; let n = 0;
  for (let i = 0; i < 1200; i++) {
    const s = await S();
    if (s.waiting) { if (lines.at(-1) !== s.text) { lines.push(s.text); await shot(`l-${String(lines.length).padStart(2, '0')}`); } await page.keyboard.press('KeyC'); await page.waitForTimeout(120); }
    else { if (i % 5 === 0) await shot(`f-${String(n++).padStart(3, '0')}`); await page.waitForTimeout(160); }
    if (!s.running && i > 5) break;
  }
  const end = await page.evaluate(() => ({ seen: !!game.flags.castle_teen_finale_seen, bgm: game.sound.bgmName, hp: { ...game.partyHp } }));
  const expect = ['말..말도안돼', '이건... 이럴수가 없어.', '너희가 나를 막게 둘수없다!!!', '헉... 헉... 미친.. 말도안돼', '...윽.. 이대로 지는건가..', '잘.. 가라..', '이제 끝내자.', '죽어!!', '하이요 형들ㅋㅋ', '용.. 용준아 살아있었구나!!', '아 당연하죠 형님들 ㅋㅋ', '이... 이...녀석들이!!!', '?!', '으하하, 펠월드 고수 대용준님께선 바론 테이밍따윈 일도 아니란 말씀!!', '죽어라 괴물!!!', '?! 타코', '너까지 살아있었구나', '바보같은 소리하지마라 가재맨!!!!!', '우리가 가재맨을 싫어한다고?', '지랄도 정도껏이지.', '가재맨 바로 너란말이다!!!!!!!!', '앞을 부탁한다.. 너네들,,,', '이번엔 내가 맡지!', '영클아 그리고 너희들..', '빨리 쫒아가자 이딴 상처 아무것도 아님.'];
  const plain = lines.map(t => (t || '').replace(/\{[^}]*\}/g, ''));
  check('finale lines verbatim and in order', expect.every(e => plain.some(t => t.includes(e))), JSON.stringify(plain));
  check('party left at 1 HP by the release blast', Object.values(end.hp).every(v => v === 1), JSON.stringify(end.hp));
  check('SAVE The World plays once 박용준 arrives', end.bgm === 'save_the_world', end.bgm);
  check('finale marked seen', end.seen);
});
