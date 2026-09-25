import assert from 'node:assert/strict';
import { runScenario } from './lib/harness.mjs';

// BUILD339: 꼭대기 대치 뒤 청소년 보스전. 잠긴 공격(X)·방어하기·청소기/주먹 패턴·청소 용량·쓰러짐·가재맨 세 패턴·공격 달려가기.
await runScenario({ name: 'teen-battle', launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] } }, async ({ page, open, until, shot, fixture, check }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await open({ qa: 'castle_summit_confront' });
  assert.ok(await until(() => window.game?.mapId === 'gajaeman_castle_summit' && game.state === 'field' && !game.transitioning, 30000));
  await fixture('standoff-done', 'Mark the summit standoff as seen and run its script, which goes straight to the battle (the standoff itself is covered by castle-summit).', () => {
    game.setFlag('castle_summit_ready'); game.runScript('castle_summit_confront');
  });
  assert.ok(await until(() => !!game.battle && game.battle.state === 'intro', 20000), 'battle opens');
  const B = () => page.evaluate(() => ({ state: game.battle?.state, text: game.battle?.text, menuIdx: game.battle?.menuIdx, sup: game.battle?.support?.snapshot, hp: game.battle?.enemies[0]?.hp, bullets: game.battle?.bullets.length }));
  const press = async k => { await page.keyboard.press(k); await page.waitForTimeout(120); };
  const lines = [];
  for (let i = 0; i < 40; i++) { const s = await B(); if (s.state === 'menu') break; if (s.text && lines.at(-1) !== s.text) { lines.push(s.text); await shot(`intro-${lines.length}`); } await press('KeyC'); }
  check('intro lines verbatim', ['* 형들 일단 여기서 공격하는건 자살행위에요', '* 그렇지 그럼 어떻게 할까???', '* 기회를 노려야죠,,', '* (공격하기가 비활성화 되었다.)', '* (방어하기 버튼이 생겼다.)'].every(t => lines.includes(t)), JSON.stringify(lines));
  assert.ok(await until(() => game.battle.state === 'menu', 5000));
  await shot('menu-locked');
  // BUILD342: 행동 창 문구는 한 줄 전체(예전엔 문자열에서 글자 하나를 뽑아 “지”·“막”만 보였다)
  await page.waitForTimeout(900);
  check('menu flavor line is a whole line', ['* 마지막이다.', '* 끝이다.', '* 이것이 마지막 싸움이다.', '* 모든 것의 끝이 다가온다.'].includes((await B()).text), (await B()).text);
  const homes = await page.evaluate(() => Object.fromEntries(game.battle.members.map(m => [m.id, m.home])));
  check('party stands on the broken end at the field feet (same screen as the standoff)', JSON.stringify(homes) === JSON.stringify({ hyungsub: [125, 176], gyeongsub: [93, 204], ppaman: [61, 232] }), JSON.stringify(homes));
  check('cleaning gauge hidden outside the cleaning pattern', (await B()).sup.gaugeAlpha < 0.1, JSON.stringify((await B()).sup));
  await press('KeyC');
  check('locked 공격하기 does nothing', (await B()).state === 'menu');
  // 방어하기(세 번째 버튼)
  await press('ArrowRight'); await press('ArrowRight'); await press('KeyC');
  assert.ok(await until(() => game.battle.state === 'bullets', 8000), 'enemy turn after defend');
  check('defending this turn', (await B()).sup.defending);
  await page.waitForTimeout(1000); await shot('vacuum-prep'); await page.waitForTimeout(3000); await shot('vacuum-1');
  check('cleaning gauge faded in during the cleaning pattern', (await B()).sup.gaugeAlpha > 0.8, JSON.stringify((await B()).sup));
  await page.waitForTimeout(5000); await shot('vacuum-2');
  assert.ok(await until(() => game.battle.state === 'menu', 25000));
  const g1 = (await B()).sup.gauge;
  check('dodging debris fills the cleaning gauge', g1 > 0, String(g1));
  // 두 턴 더(3턴째 주먹)
  for (let turn = 2; turn <= 3; turn++) {
    await press('ArrowRight'); await press('ArrowRight'); await press('KeyC');
    assert.ok(await until(() => game.battle.state === 'bullets', 8000));
    if (turn === 3) { await page.waitForTimeout(1300); await shot('slam-1'); await page.waitForTimeout(4200); await shot('slam-giant'); }
    assert.ok(await until(() => game.battle.state === 'menu' || game.battle.state === 'interlude', 20000));
    while ((await B()).state === 'interlude') await press('KeyC');
  }
  // 게이지를 채워 쓰러짐을 본다
  await fixture('fill-gauge', 'Credit enough dodges to reach 100% (the dodge counting itself is checked above).', () => { for (let i = 0; i < 110; i++) game.battle.support.onProjectile({ type: 'teen_dodge' }); });
  await press('ArrowRight'); await press('ArrowRight'); await press('KeyC');
  assert.ok(await until(() => game.battle.state === 'interlude', 30000), 'collapse interlude');
  // 쓰러지는 연출이 몇 초 이어진 뒤에야 대사(사용자 “바로 대사가 뜨는게아니라 쓰러지는 연출도 몇초”)
  await page.waitForTimeout(700); await shot('collapse-1');
  check('collapsing before the line', (await B()).sup.fall === 'collapse' && (await B()).text !== '* 지금이에요 공격해요!!', JSON.stringify(await B()));
  await page.waitForTimeout(1100); await shot('collapse-2');
  assert.ok(await until(() => game.battle.text === '* 지금이에요 공격해요!!', 6000), 'down line after the collapse');
  await page.waitForTimeout(600); await shot('down-line');
  check('gajaeman left the shoulder to hover behind the fallen 청소년', (await B()).sup.gajaeman === 'hover', JSON.stringify((await B()).sup));
  while ((await B()).state === 'interlude') await press('KeyC');
  assert.ok(await until(() => game.battle.state === 'menu', 5000));
  check('phase down and fight unlocked', (await B()).sup.phase === 'down');
  await shot('menu-unlocked');
  // 자동 입력은 피하지 않으므로(청소 16.8초 ×여러 번) 가재맨 턴을 보기 전에 체력을 채운다 — 패턴·흐름만 본다
  const heal = () => page.evaluate(() => { for (const m of game.battle.members) { m.hp = m.maxHp; m.down = false; m.downTurns = 0; } });
  await fixture('heal-before-gajaeman', 'Refill party HP so the undodged autoplay survives the gajaeman turns.', () => { for (const m of game.battle.members) { m.hp = m.maxHp; m.down = false; m.downTurns = 0; } });
  // 공격: 세 명 모두
  const hp0 = (await B()).hp;
  for (let m = 0; m < 3; m++) { await press('KeyC'); await press('KeyC'); }
  await page.waitForTimeout(500); await shot('attack-run');
  assert.ok(await until(() => game.battle.state === 'enemy-prep' || game.battle.state === 'bullets', 20000), 'attacks resolved');
  await page.waitForTimeout(200); await shot('attack-crit');
  const hp1 = (await B()).hp;
  // 공격은 타이밍 입력이라 자동 연타가 빗나갈 수 있다 — 들어간 공격마다 정확히 80 인지 본다
  check('each hit on the fallen 청소년 deals 80', hp0 - hp1 >= 80 && (hp0 - hp1) % 80 === 0, `${hp0}->${hp1}`);
  const gjPatterns = [], gjLines = [];
  for (let turn = 0; turn < 3; turn++) {
    assert.ok(await until(() => game.battle.state === 'enemy-prep' && !!game.battle.bubble, 20000));
    gjLines.push(await page.evaluate(() => game.battle.bubble?.text)); await page.waitForTimeout(500); await shot(`gajaeman-line-${turn}`);
    assert.ok(await until(() => game.battle.state === 'bullets', 20000));
    await page.waitForTimeout(2600); await shot(`gajaeman-${turn}`); gjPatterns.push(await page.evaluate(() => game.battle.patterns.map(p => p.p.duration)));
    assert.ok(await until(() => game.battle.state === 'menu' || game.battle.state === 'interlude', 25000));
    while ((await B()).state === 'interlude') await press('KeyC');
    await heal();
    if (turn < 2) for (let m = 0; m < 3; m++) { await press('KeyC'); await press('KeyC'); }
  }
  check('gajaeman says his line before each pattern', JSON.stringify(gjLines) === JSON.stringify(['너검없냐?', '넣을게~', '니애미따라가라']), JSON.stringify(gjLines));
  const end = await B();
  check('attacks hurt the fallen 청소년', end.hp < hp0, `${hp0}->${end.hp}`);
  check('after three turns 청소년 is back up with an empty gauge', end.sup.phase === 'guard' && end.sup.gauge === 0, JSON.stringify(end.sup));
});
