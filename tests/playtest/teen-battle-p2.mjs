import assert from 'node:assert/strict';
import { runScenario } from './lib/harness.mjs';

// BUILD351: 청소년전 2페이즈 — 1페이즈 HP 1 → 전투 안 전환 연출(가재맨 대사·빙의·검은 폭발·+999·일행 대사·코어) → 적 이름 가재맨, 코어 한 대 20, 매 턴 가재맨 대사.
await runScenario({ name: 'teen-battle-p2', launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] } }, async ({ page, open, until, shot, fixture, check }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await open({ qa: 'castle_summit_confront' });
  assert.ok(await until(() => window.game?.mapId === 'gajaeman_castle_summit' && game.state === 'field' && !game.transitioning, 30000));
  await fixture('standoff-done', 'Skip the standoff (covered by castle-summit) and open the battle.', () => { game.setFlag('castle_summit_ready'); game.runScript('castle_summit_confront'); });
  assert.ok(await until(() => game.battle?.state === 'intro', 20000), 'battle opens');
  const B = () => page.evaluate(() => ({ state: game.battle?.state, text: game.battle?.text, sup: game.battle?.support?.snapshot, bubble: game.battle?.bubble?.text }));
  const press = async k => { await page.keyboard.press(k); await page.waitForTimeout(120); };
  for (let i = 0; i < 40 && (await B()).state !== 'menu'; i++) await press('KeyC');
  // 첫 턴 뒤 바로 쓰러지게: 게이지 100, 무적
  await fixture('overload-now', 'Fill the gauge and make the autoplay invulnerable so the first enemy turn ends in a collapse.', () => { game.battle.support.gauge = 100; game.battle.soul.invuln = 99; });
  for (let m = 0; m < 3; m++) await press('KeyC');
  assert.ok(await until(() => game.battle.state === 'interlude', 45000), 'collapse');
  while ((await B()).state === 'interlude') await press('KeyC');
  assert.ok(await until(() => game.battle.state === 'menu' && game.battle.support.snapshot.phase === 'down', 10000), 'down menu');
  // HP 를 조금만 남겨 이번 공격으로 1 이 되게
  await fixture('almost-dead', 'Leave 1페이즈 HP low so this attack round hits the HP-1 floor.', () => { game.battle.enemies[0].hp = 20; });
  for (let m = 0; m < 3; m++) { await press('KeyC'); await press('KeyC'); }
  assert.ok(await until(() => !!game.battle.support.snapshot.trans, 20000), 'phase-2 transition starts');
  check('1페이즈 is not finished off: HP stays at 1', (await B()).sup.hp >= 1, JSON.stringify((await B()).sup));
  const seen = new Set(), lines = [];
  for (let i = 0; i < 400; i++) {
    const s = await B();
    if (s.sup.trans) { if (!seen.has(s.sup.trans)) { seen.add(s.sup.trans); await shot(`p2-${String(seen.size).padStart(2, '0')}-${s.sup.trans}`); } }
    else if (s.sup.phase === 'p2') break;
    if (s.text && lines.at(-1) !== s.text && /^\* /.test(s.text)) lines.push(s.text);
    if (['gajaeman', 'party'].includes(s.sup.trans)) { await page.waitForTimeout(500); await press('KeyC'); } else await page.waitForTimeout(150);
  }
  check('transition steps in order', ['approach', 'gajaeman', 'enter', 'focusIn', 'focusHold', 'burst', 'heal', 'exclaim', 'party', 'stand', 'core'].every(k => seen.has(k)), JSON.stringify([...seen]));
  check('gajaeman lines verbatim', ['* 이런... 말도안돼', '* 이 쓸모없는 녀석..', '* 뭐 상관없어.', '* 이제 끝을보자,', '* 내가 상대해주지'].every(t => lines.includes(t)), JSON.stringify(lines));
  check('party lines verbatim', ['* 이런..', '* 아직 끝이 아닌거같군', '* 언제까지.. 이 싸움을 해야할까요', '* 빠맨아 약해지지말자.', '* 네 알았어요 형..'].every(t => lines.includes(t)), JSON.stringify(lines));
  const p2 = (await B()).sup;
  check('phase 2: enemy is 가재맨 with 999 HP', p2.phase === 'p2' && p2.name === '가재맨' && p2.hp === 999, JSON.stringify(p2));
  // 2페이즈 첫 적 턴: 가재맨 대사 → 패턴
  assert.ok(await until(() => game.battle.state === 'enemy-prep' && !!game.battle.bubble, 30000), 'phase-2 enemy turn');
  check('gajaeman taunts on attack', ['죽어.', '죽여줄게', '니애미따라가'].includes((await B()).bubble), (await B()).bubble);
  await page.waitForTimeout(600); await shot('p2-taunt');
  assert.ok(await until(() => game.battle.state === 'bullets', 20000));
  await page.evaluate(() => { game.battle.soul.invuln = 99; });
  await page.waitForTimeout(2500); await shot('p2-pattern');
  assert.ok(await until(() => game.battle.state === 'menu', 40000), 'back to menu');
  await shot('p2-menu');
  const hp0 = (await B()).sup.hp;
  for (let m = 0; m < 3; m++) { await press('KeyC'); await press('KeyC'); }
  assert.ok(await until(() => game.battle.state === 'enemy-prep' || game.battle.state === 'bullets', 20000), 'attacks resolved');
  const hp1 = (await B()).sup.hp;
  check('each hit on the core deals 20', hp0 - hp1 >= 20 && (hp0 - hp1) % 20 === 0, `${hp0}->${hp1}`);
});
