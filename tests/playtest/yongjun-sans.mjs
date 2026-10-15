// 박용준 히든 보스(BUILD462): 라운지 상점에서 보라꽃 판매 → 필드 연출(보라 오라) → 샌즈식 오프닝(새소리 → 촵 암전 → 느린 무음 대사 → 메갈로바니아)
//   → 패턴 여섯을 하나씩(말풍선 = 패턴 speak) → 승리 → 라운지 복귀(브금·연기·배우 정리). 스크린샷은 SHOT_DIR.
//   QA 지점 yongjun_flower 는 보라꽃을 든 실제 진행 상태(STATE_FROM_FLAGS)로 상점 앞에서 시작한다.
import { runScenario } from './lib/harness.mjs';

await runScenario({ name: 'yongjun-sans' }, async ({ page, check, until, press, shot, open }) => {
  await open({ qa: 'yongjun_flower' });
  await until(() => window.game?.mapId === 'maillard_lounge' && game.state === 'field' && !game.dialogue.running && game.fade.alpha === 0, 20000);
  check('QA 지점은 보라꽃을 들고 상점 앞에서 시작', await page.evaluate(() => game.inventory.includes('보라꽃')));

  await page.keyboard.down('ArrowUp'); await page.waitForTimeout(220); await page.keyboard.up('ArrowUp');
  await press('KeyC');
  const opened = await until(() => game.state === 'shop' && !game.transitioning, 5000);
  check('상점 문에서 C 로 상점이 열린다', !!opened);
  for (let i = 0; i < 20 && await page.evaluate(() => game.shop.mode === 'greeting'); i++) { await press('KeyC'); await page.waitForTimeout(260); }
  await page.waitForTimeout(200);
  await press('ArrowDown'); await page.waitForTimeout(150); await press('KeyC'); await page.waitForTimeout(200);
  const index = await page.evaluate(() => game.inventory.indexOf('보라꽃'));
  for (let i = 0; i < index; i++) { await press('ArrowDown'); await page.waitForTimeout(90); }
  const listed = await page.evaluate(async () => { const { saleItemState } = await import('/src/core/shop.js'); const r = saleItemState(game, game.shop.index); return { name: r.name, ok: r.ok, event: r.event?.script, price: r.price }; });
  check('판매 목록의 보라꽃은 연출 판매(가격 ???)', listed.name === '보라꽃' && listed.ok && listed.event === 'yongjun_flower' && listed.price === undefined, JSON.stringify(listed));
  await press('KeyC'); await page.waitForTimeout(200);
  await press('ArrowLeft'); await page.waitForTimeout(120);
  await shot('yongjun_01_sell_confirm');
  const money = await page.evaluate(() => game.money);
  await press('KeyC');
  const field = await until(() => game.state === 'field' && game.dialogue.running && game.textbox.node?.speaker === '박용준' && game.fade.alpha < 0.05, 6000);
  check('판매하면 상점이 닫히고 필드에서 용준이 말한다', !!field);
  const staged = await page.evaluate(() => {
    const pick = id => { const e = id === 'player' ? game.player : game.entities.find(x => x.id === id); return e && { x: e.x, y: e.y, w: e.w, h: e.h, facing: e.facing, visible: e.visible !== false, sheet: !!e.sheet || !!e.frames }; };
    return { yongjun: pick('yongjun_flower_boss'), player: pick('player'), ppaman: pick('ppaman'), gyeongsub: pick('gyeongsub'), sold: !!game.flags.yongjun_flower_sold, inventory: game.inventory.includes('보라꽃'), money: game.money };
  });
  const overlap = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  const party = [staged.ppaman, staged.player, staged.gyeongsub];
  check('용준이 상점 문 앞에 서고 일행 셋이 그 아래 한 줄로 용준을 본다', staged.yongjun && staged.yongjun.visible && party.every(m => m && m.facing === 'up' && m.y > staged.yongjun.y && !overlap(m, staged.yongjun)) && !overlap(party[0], party[1]) && !overlap(party[1], party[2]), JSON.stringify(staged));
  check('보라꽃은 돈 없이 넘어가고 판매 플래그가 선다', staged.sold && !staged.inventory && staged.money === money, JSON.stringify({ money, after: staged.money }));
  await shot('yongjun_02_out');

  let aura = false, silent = false, battle = false;
  const fieldLines = [];
  for (let i = 0; i < 160 && !battle; i++) {
    const s = await page.evaluate(() => ({ text: game.textbox.node?.text || '', bgm: game.sound.bgmName, smoke: game.darkSmoke ? { mode: game.darkSmoke.mode, k: game.darkSmoke.elapsed / game.darkSmoke.duration, aura: !!game.darkSmoke.aura } : null, battle: !!game.battle, typing: game.textbox.state }));
    if (s.battle) { battle = true; break; }
    if (s.text.includes('... 오..') && !s.bgm) silent = true;
    const spoken = await page.evaluate(() => `${game.textbox.node?.speaker || ''}:${game.textbox.node?.text || ''}`);
    if (spoken !== ':' && fieldLines.at(-1) !== spoken) fieldLines.push(spoken);
    if (!aura && s.smoke?.mode === 'swell' && s.smoke.k > 0.7) { aura = s.smoke.aura && s.bgm === 'captain_reveal'; await shot('yongjun_03_aura'); }
    if (s.smoke?.mode === 'swell' && s.smoke.k <= 0.7) { await page.waitForTimeout(150); continue; }
    await press('KeyC'); await page.waitForTimeout(170);
  }
  check('“네 형님 … 욱...” 뒤 브금이 꺼진다', silent);
  check('“크크크...” 뒤 가재맨 첫 등장 보라 연기·오라와 그 브금(captain_reveal)', aura);
  check('전투 직전 네 줄(끔찍한 → 억빠맨 → 경섭 → 들어와라)', JSON.stringify(fieldLines.slice(-4)) === JSON.stringify(['박용준:* 끔찍한 시간을 보내게해주지', '억빠맨:* 형님들 꽃의 부작용인거같아요', '경섭:* 허허 일단 처리해야겠네.', '박용준:* 들어와라']), JSON.stringify(fieldLines.slice(-4)));
  battle = await until(() => game.battle?.gimmick?.snapshot?.phase === 'talk' && game.battle.bubble?.shown > 4, 15000);
  check('전투 진입 뒤 바로 샌즈식 오프닝(말풍선)', !!battle);
  check('오프닝은 새소리(sans_birds)', await page.evaluate(() => game.sound.bgmName === 'sans_birds'));
  await page.waitForTimeout(900);
  await shot('yongjun_04_intro');
  const lines = [];
  for (let i = 0; i < 20; i++) {
    const s = await page.evaluate(() => ({ phase: game.battle.gimmick?.snapshot?.phase, text: game.battle.bubble?.text }));
    if (s.phase !== 'talk') break;
    if (s.text && lines.at(-1) !== s.text) lines.push(s.text);
    await page.waitForTimeout(700); await press('KeyC'); await page.waitForTimeout(150);
  }
  check('오프닝 대사 세 줄 원문', JSON.stringify(lines) === JSON.stringify(['정말 아름다운 날이네요', '엄마는 도망가고 오마카세는 맛이없고', '이런날엔 여러분같은 악덕 형님들은']), JSON.stringify(lines));
  const black = await until(() => game.battle?.gimmick?.snapshot?.phase === 'black' ? { bgm: game.sound.bgmName } : null, 3000);
  check('세 번째 줄 뒤 새소리가 끊기고 화면 전체가 검다', black && !black.bgm, JSON.stringify(black));
  await shot('yongjun_05_black');
  const hell = await until(() => game.battle?.gimmick?.snapshot?.phase === 'hell' && game.battle.bubble?.shown >= game.battle.bubble.text.length ? { text: game.battle.bubble.text, voice: game.battle.bubble.voice, pose: game.battle.enemies[0].patternPose?.sheet } : null, 8000);
  check('“지 옥 에 서 불 타 버 려 야 해.” 목소리 없이 천천히, 눈 없는 얼굴', hell?.text === '지 옥 에 서 불 타 버 려 야 해.' && hell.voice === 'none' && hell.pose === 'dark', JSON.stringify(hell));
  await shot('yongjun_06_hell');
  await page.waitForTimeout(300); await press('KeyC');
  const keepAlive = () => { const b = game.battle; if (b?.soul) b.soul.invuln = 9; if (b) for (const m of b.members) { m.hp = m.maxHp; m.down = false; } };
  const opening = await page.waitForFunction(() => { const b = game.battle; if (b?.soul) b.soul.invuln = 9; return b?.state === 'bullets' ? { bubble: !!b.bubble, bgm: game.sound.bgmName, type: b.patterns[0]?.p && b.bullets.some(x => x.shape === 'blaster'), bg: b.cfg.bg } : null; }, undefined, { timeout: 6000, polling: 50 }).then(h => h.jsonValue(), () => null);
  check('C 뒤 메뉴 없이 바로 냄새 블래스터(음악 없음·말풍선 없음), 배경 라운지', opening && !opening.bubble && !opening.bgm && opening.bg === 'maillard_lounge', JSON.stringify(opening));
  let blasters = 0;
  for (const [k, at] of [[1, 0.8], [2, 1.0], [3, 2.6], [4, 5.6]]) {
    const ok = await page.waitForFunction((at) => { const b = game.battle; if (b?.soul) b.soul.invuln = 9; if (b) for (const m of b.members) { m.hp = m.maxHp; m.down = false; } return b?.state === 'bullets' && b.t >= at; }, at, { timeout: 9000, polling: 40 }).then(() => true, () => false);
    if (!ok) break;
    blasters = Math.max(blasters, await page.evaluate(() => game.battle.bullets.filter(x => x.shape === 'blaster').length));
    await shot(`yongjun_06b_blaster_${k}`);
  }
  check('냄새 블래스터가 여러 개 동시에', blasters >= 4, `max=${blasters}`);
  const line = await page.waitForFunction(() => { const b = game.battle; if (b?.soul) b.soul.invuln = 9; if (b) for (const m of b.members) { m.hp = m.maxHp; m.down = false; } return b?.state === 'interlude' && b.bubble?.shown >= b.bubble?.text.length ? b.bubble.text : null; }, undefined, { timeout: 12000, polling: 50 }).then(h => h.jsonValue(), () => null);
  check('강공격 뒤 “왜 다들 처음부터 강한공격을 안쓰시는걸까요?”', line === '왜 다들 처음부터 강한공격을 안쓰시는걸까요?', JSON.stringify(line));
  await shot('yongjun_06c_why');
  await page.waitForTimeout(300); await press('KeyC');
  const menu = await until(() => game.battle?.state === 'menu' ? { bgm: game.sound.bgmName, hp: game.battle.enemies[0].hp, max: game.battle.enemies[0].maxHp, idx: game.battle.enemies[0].patternIdx } : null, 4000);
  check('C 로 메갈로바니아와 함께 행동 선택(HP 100, 패턴 차례 처음부터)', menu?.bgm === 'megalovania' && menu.hp === 100 && menu.max === 100 && menu.idx === 0, JSON.stringify(menu));
  await page.evaluate(keepAlive);
  await shot('yongjun_07_menu');

  const speaks = [], leaks = [];
  const waitIn = (fn, arg, timeout) => page.waitForFunction(fn, arg, { timeout, polling: 50 }).then(() => true, () => false);
  for (let n = 0; n < 6; n++) {
    await page.evaluate((n) => { const b = game.battle; b.enemies[0].patternIdx = n; b.beginEnemyTurn(); }, n);
    const bubble = await waitIn(() => !!game.battle?.bubble?.text || game.battle?.state === 'bullets', undefined, 4000).then(() => page.evaluate(() => game.battle?.bubble?.text || null)); speaks.push(bubble);
    const type = await page.evaluate((n) => game.battle.enemies[0].def.patterns[n].type, n);
    let harm = 0;
    for (const [k, at] of [[1, 1.4], [2, 3.4], [3, 5.2]]) {
      const reached = await waitIn((at) => { const b = game.battle; if (b?.soul) b.soul.invuln = 9; if (b) for (const m of b.members) { m.hp = m.maxHp; m.down = false; } return b?.state === 'bullets' && b.t >= at; }, at, 12000);
      if (!reached) break;
      harm = Math.max(harm, await page.evaluate(() => game.battle.bullets.filter(b => !b.harmless).length));
      leaks.push(...await page.evaluate((n) => { const b = game.battle, r = b.board.rect; return b.bullets.filter(x => ['stench', 'crumb', 'tear', 'splash', 'spark'].includes(x.shape) && (x.x < r.x - 12 || x.x > r.x + r.w + 12 || x.y < r.y - 12 || x.y > r.y + r.h + 12)).map(x => `${n}:${x.shape}`); }, n));
      await shot(`yongjun_p${n}_${k}`);
    }
    check(`패턴 ${n} ${type}: 맞는 탄이 나온다`, harm > 0, `harmful=${harm}`);
    const back = await waitIn(() => { const b = game.battle; if (b?.soul) b.soul.invuln = 9; if (b) for (const m of b.members) { m.hp = m.maxHp; m.down = false; } return b?.state === 'menu'; }, undefined, 15000);
    check(`패턴 ${n} 뒤 행동 선택으로 돌아온다`, back);
  }
  check('상자 안 위협(악취·부스러기·눈물·불똥)은 상자 밖으로 새지 않는다', leaks.length === 0, JSON.stringify(leaks.slice(0, 6)));
  check('턴마다 말풍선이 패턴 대사(포옹은 “응? 인경님 무슨..”)', speaks.every(Boolean) && new Set(speaks).size === 6 && speaks[5] === '응? 인경님 무슨..', JSON.stringify(speaks));

  const before = await page.evaluate(() => ({ hpBonus: game.hpBonus, max: ['hyungsub', ...game.party].map(id => game.maxHpOf(id)) }));
  await page.evaluate(() => { game.battle.enemies[0].hp = 1; });
  for (let i = 0; i < 60 && !(await page.evaluate(() => game.battle?.state === 'win')); i++) { await press('KeyC'); await page.waitForTimeout(200); }
  check('HP 를 깎으면 이긴다', await page.evaluate(() => game.battle?.state === 'win'));
  for (let i = 0; i < 30 && await page.evaluate(() => !!game.battle); i++) { await press('KeyC'); await page.waitForTimeout(250); }
  const shopScene = await until(() => game.state === 'shop' && game.shop.mode === 'greeting' && !game.transitioning && game.fade.alpha < 0.05 ? {
    won: !!game.flags.yongjun_sans_won, bgm: game.sound.bgmName, smoke: !!game.darkSmoke, actor: game.entities.some(e => e.id === 'yongjun_flower_boss'), zoom: game.zoom.s,
  } : null, 12000);
  check('승리 뒤 상점 화면으로: 플래그·라운지 브금·연기 정리·용준 배우 정리·줌 1', shopScene?.won && shopScene.bgm === 'maillard_lounge' && !shopScene.smoke && !shopScene.actor && shopScene.zoom === 1, JSON.stringify(shopScene));
  const after = [];
  for (let i = 0; i < 40 && await page.evaluate(() => game.shop.mode === 'greeting'); i++) {
    const line = await page.evaluate(() => { const a = game.shop.greeting?.active; return a?.node ? `${a.node.speaker || '나레이션'}: ${a.node.text}` : null; });
    if (line && after.at(-1) !== line) { after.push(line); if (after.length === 1) await shot('yongjun_08_shop_after'); if (line.includes('오마카세')) await shot('yongjun_09_omakase'); }
    await page.waitForTimeout(450); await press('KeyC'); await page.waitForTimeout(120);
  }
  check('상점 화면 대사 원문 순서', JSON.stringify(after.map(l => l.replace(/\{[^}]*\}/g, ''))) === JSON.stringify(['박용준: * 윽 으윽', '박용준: * 아 형님들... 구해주셔서 감사합니다 이 꽃 뭐죠?', '억빠맨: * ㅗ', '박용준: * 아 빠맨이형 ㅎㅎ', '박용준: * 어쨋든 이 꽃은 제가 폐기처분 하겠습니다', '박용준: * 죄송하니 다들 이거 하나씩 드세요', '나레이션: * 박용준의 오마카세를 획득했다.* 팀원들 전체 체력이 10 상승했다.', '억빠맨: * 이걸로 봐준다.']), JSON.stringify(after));
  const buffed = await page.evaluate(() => ({ hpBonus: game.hpBonus, max: ['hyungsub', ...game.party].map(id => game.maxHpOf(id)), flag: !!game.flags.yongjun_omakase_eaten, mode: game.shop.mode }));
  check('오마카세: 팀 전체 최대 HP +10 바로 적용, 대사 뒤 평소 상점 메뉴', buffed.hpBonus === before.hpBonus + 10 && buffed.max.every((v, i) => v === before.max[i] + 10) && buffed.flag && buffed.mode === 'home', JSON.stringify({ before, buffed }));
  await page.waitForTimeout(300);
  await shot('yongjun_10_shop_home');
  await press('KeyX');
  const outside = await until(() => game.state === 'field' && !game.dialogue.running ? { bgm: game.sound.bgmName } : null, 5000);
  check('상점을 나오면 라운지 필드', outside?.bgm === 'maillard_lounge', JSON.stringify(outside));
  await shot('yongjun_11_field');
});
