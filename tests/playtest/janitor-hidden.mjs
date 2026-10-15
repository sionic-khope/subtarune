// 청소부 히든 보스(BUILD468): 엄청대박인배 라운지 분수 뒤에서 아래를 보고 C → 버튼(예) → 경섭·요플래 발밑 구멍 → 지하실 낙하 → 허약 청소부 → “어디가셨..” 끊김
//   → 강한 청소부 내려찍기 → 전투(지하실 붉은 경광등 배경, Hammer of Justice, 요플래·경섭 둘) → 이기면 라운지 분수 뒤로(억빠맨 재합류). 스크린샷은 SHOT_DIR.
import { runScenario } from './lib/harness.mjs';

await runScenario({ name: 'janitor-hidden' }, async ({ page, check, until, press, shot, open }) => {
  await open({ qa: 'janitor_hidden' });
  await until(() => window.game?.mapId === 'ship_lounge' && game.state === 'field' && !game.dialogue.running && game.fade.alpha === 0, 20000);
  const start = await page.evaluate(() => ({ facing: game.player.facing, sign: game.entities.some(e => e.id === 'ship_lounge_fountain_button'), party: game.party }));
  check('분수 뒤에서 아래를 보고 서 있고 버튼 자리가 있다', start.facing === 'down' && start.sign && start.party.includes('ppaman'), JSON.stringify(start));
  await press('KeyC');
  const first = await until(() => game.dialogue.running && game.textbox.node?.text ? { speaker: game.textbox.node.speaker, text: game.textbox.node.text } : null, 4000);
  check('C → 억빠맨 “응? 왜요 형?”', first?.speaker === '억빠맨' && first.text === '* 응? 왜요 형?', JSON.stringify(first));
  await shot('janitor_01_lounge');
  const lines = [];
  let pits = false, fell = false;
  for (let i = 0; i < 120; i++) {
    const s = await page.evaluate(() => ({ map: game.mapId, text: game.textbox.node?.text || '', speaker: game.textbox.node?.speaker || '', choice: !!game.textbox.choice, pits: game.entities.filter(e => e.id?.startsWith('pit_') && !e.dead).length, falling: !!game.player.doorTransit, battle: !!game.battle }));
    if (s.map === 'ship_basement') break;
    if (s.text && lines.at(-1) !== `${s.speaker}:${s.text}`) lines.push(`${s.speaker}:${s.text}`);
    if (s.pits === 2 && !pits) { pits = true; await shot('janitor_02_pits'); }
    if (s.falling && !fell) { fell = true; await page.waitForTimeout(250); await shot('janitor_03_fall'); }
    await page.waitForTimeout(220); await press('KeyC'); await page.waitForTimeout(80);
  }
  check('라운지 대사 원문(억빠맨 → 경섭 → 버튼 → … → 어 어 형들!!)', ['억빠맨:* 응? 왜요 형?', '경섭:* 여기에 버튼이 있어', ':* 버튼을 눌러볼까?', '억빠맨:* ...', '경섭:* 허허 뭐지', '억빠맨:* 아무 반응도 없는데요.', '억빠맨:* 어 어 형들!!'].every(l => lines.includes(l)), JSON.stringify(lines));
  check('발밑 구멍 둘 → 둘이 빠짐', pits && fell);
  const basement = await until(() => game.mapId === 'ship_basement' ? { party: game.party } : null, 10000);
  check('지하실로 떨어짐(억빠맨은 위에 남음)', basement && JSON.stringify(basement.party) === '["gyeongsub"]', JSON.stringify(basement));
  const blines = []; let walked = false, slam = false, cut = null;
  for (let i = 0; i < 200; i++) {
    const s = await page.evaluate(() => ({ battle: !!game.battle, text: game.textbox.node?.text || '', speaker: game.textbox.node?.speaker || '', shown: game.textbox.shown ?? null,
      weak: (() => { const e = game.entities.find(x => x.id === 'basement_janitor'); return e ? { v: e.visible !== false, x: Math.round(e.x) } : null; })(),
      hero: (() => { const e = game.entities.find(x => x.id === 'janitor_hero'); return e ? { v: e.visible !== false, hop: Math.round(e.hopY || 0) } : null; })(),
      lying: game.player.pose === 'lying' }));
    if (s.battle) break;
    if (s.text && blines.at(-1) !== `${s.speaker}:${s.text}`) {
      blines.push(`${s.speaker}:${s.text}`);
      if (blines.length === 1) await shot('janitor_04_basement');
    }
    if (s.weak?.v && !walked && s.text.includes('아..아빠')) { walked = true; await shot('janitor_05_weak'); }
    if (s.text.includes('어디가셨')) cut = s.shown;
    if (s.hero?.v && s.hero.hop === 0 && !slam) { slam = true; await page.waitForTimeout(200); await shot('janitor_06_slam'); }
    await page.waitForTimeout(220); await press('KeyC'); await page.waitForTimeout(80);
  }
  const must = ['경섭:* 어 괜찮아?', '???:* 도움이필요한가?', '경섭:* 아..아빠?', '청소부:* 여기서 나가고싶나?', '청소부:* 앞으로 해쳐나아가야 하는 것 아니겠나', '경섭:* 어디가셨..', '청소부:* 어디 한번 놀아볼까?', '청소부:* 멸공의 깃발.', '청소부:* 너희를 계엄해주겠다.'];
  check('지하실 대사 원문 순서', must.every(l => blines.includes(l)) && must.map(l => blines.indexOf(l)).every((v, i, a) => i === 0 || v > a[i - 1]), JSON.stringify(blines));
  check('허약 청소부가 걸어오고 강한 청소부가 내려찍는다', walked && slam);
  const battle = await until(() => game.battle?.enemies?.[0]?.img ? { id: game.battle.enemies[0].id, bg: game.battle.cfg.bg, bgm: game.battle.cfg.bgm, members: game.battle.members.map(m => m.id), hp: game.battle.enemies[0].maxHp } : null, 15000);
  check('전투: 청소부 HP 100, 지하실 배경, Hammer of Justice, 요플래·경섭 둘', battle?.id === 'janitor_hidden' && battle.bg === 'janitor_basement' && battle.bgm === 'janitor_hidden' && battle.hp === 100 && battle.members.length === 2 && battle.members.includes('gyeongsub'), JSON.stringify(battle));
  await page.waitForTimeout(1200); await shot('janitor_07_battle');
  const n = await page.evaluate(() => game.battle.enemies[0].def.patterns.length);
  for (let k = 0; k < n; k++) {
    await until(() => ['intro', 'menu'].includes(game.battle?.state), 8000);
    await page.evaluate((k) => { const b = game.battle; b.enemies[0].patternIdx = k; b.beginEnemyTurn(); }, k);
    const type = await page.evaluate((k) => game.battle.enemies[0].def.patterns[k].type, k);
    const times = { janitor_kick_flags: [0.75, 1.15, 2.6, 7.6, 12.3], janitor_stomp: [0.4, 1.05, 1.9, 7.4, 11.4], janitor_drum: [0.8, 2.2, 4.5, 8.5], janitor_stomp_scan: [0.8, 1.15, 2.6] }[type] || [1.4, 3.0];
    let maxHazards = 0;
    for (const [i, at] of times.map((v, j) => [j + 1, v])) {
      const ok = await page.waitForFunction((at) => { const b = game.battle; if (b?.soul) b.soul.invuln = 9; if (b) for (const m of b.members) { m.hp = m.maxHp; m.down = false; } return b?.state === 'bullets' && b.t >= at; }, at, { timeout: 12000, polling: 50 }).then(() => true, () => false);
      if (ok) { maxHazards = Math.max(maxHazards, await page.evaluate(() => game.battle.bullets.filter(b => !b.harmless).length)); await shot(`janitor_p${k}_${i}`); }
    }
    const back = await page.waitForFunction(() => { const b = game.battle; if (b?.soul) b.soul.invuln = 9; if (b) for (const m of b.members) { m.hp = m.maxHp; m.down = false; } return b?.state === 'menu'; }, undefined, { timeout: 25000, polling: 50 }).then(() => true, () => false);
    check(`패턴 ${k} ${type}: 맞는 탄이 나오고 끝나면 행동 선택`, maxHazards > 0 && back, `hazards=${maxHazards}`);
  }
  const attack0 = await page.evaluate(() => game.attack);
  await page.evaluate(() => { game.battle.enemies[0].hp = 1; });
  for (let i = 0; i < 60 && !(await page.evaluate(() => game.battle?.state === 'win')); i++) { await press('KeyC'); await page.waitForTimeout(200); }
  for (let i = 0; i < 30 && await page.evaluate(() => !!game.battle); i++) { await press('KeyC'); await page.waitForTimeout(250); }
  const alines = []; let reunionShot = false, afterShot = false;
  for (let i = 0; i < 120; i++) {
    const s = await page.evaluate(() => ({ map: game.mapId, run: game.dialogue.running, fade: game.fade.alpha, text: game.textbox.node?.text || '', speaker: game.textbox.node?.speaker || '' }));
    if (!s.run && s.map === 'ship_lounge' && s.fade === 0 && alines.length > 8) break;
    if (s.text && alines.at(-1) !== `${s.speaker}:${s.text}`) {
      alines.push(`${s.speaker}:${s.text}`);
      if (!afterShot && s.text.includes('간만에')) { afterShot = true; await shot('janitor_08_after'); }
      if (!reunionShot && s.text.includes('형들 괜찮으세요')) { reunionShot = true; await shot('janitor_09_reunion'); }
    }
    await page.waitForTimeout(240); await press('KeyC'); await page.waitForTimeout(80);
  }
  const afterMust = ['청소부:* 껄껄 간만에 즐거웠네', '청소부:* 뭐... 이정도라면 충분히 해쳐나갈 수 있겠지', '청소부:* 아 물론 약속은 지켜야지 이리 와보게', '경섭:* 네', ':* 멸공의 깃발이 무기에 감긴다.{n}* {c=yellow}요플래와 경섭의 공격력이 증가했다.{/c}', '청소부:* 이제 올라가보새', '청소부:* 잘 컸구나.', '억빠맨:* 형들 괜찮으세요 ? 무슨일 있으셨어요?', '경섭:* 아니 아무일도 없었어.', '억빠맨:* 어휴 다행이네요 형님들 걱정했잖아요', '경섭:* 그래 미안하다 ㅋㅋ'];
  check('승리 뒤 대사 원문 순서(지하실 → 분수 앞 억빠맨)', afterMust.every(l => alines.includes(l)) && afterMust.map(l => alines.indexOf(l)).every((v, i, a) => i === 0 || v > a[i - 1]), JSON.stringify(alines));
  const back = await until(() => game.mapId === 'ship_lounge' && game.state === 'field' && !game.dialogue.running && game.fade.alpha === 0 ? { won: !!game.flags.janitor_hidden_won, wrapped: !!game.flags.janitor_flag_wrapped, attack: game.attack, party: game.party, sign: game.entities.some(e => e.id === 'ship_lounge_fountain_button'), bgm: game.sound.bgmName } : null, 15000);
  check('분수 앞으로: 팀 공격력 +1, 억빠맨 재합류, 버튼 사라짐, 라운지 브금', back?.won && back.wrapped && back.attack === attack0 + 1 && back.party.includes('ppaman') && !back.sign && back.bgm === 'ship_lounge', JSON.stringify({ attack0, back }));
  await shot('janitor_10_back');
});
