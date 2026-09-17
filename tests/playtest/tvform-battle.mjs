// 변신 영클 전투(BUILD214): QA ship_tvform_battle → “편집노조의 힘을 얕보지마라” → 편집노조 넷 유령이 돌며 얼굴로 흡수(spin) → 띠리리리링·오라(charge, power) → “공격도 하지마라.”
//   → 행동 창 막간: [공격하기][아이템] → 땅 내리침(baron_slam) → [공격하기] 사라짐 → “ㅋㅋ 대신 이거드림.” → VS 버튼 던져 안착 → [코인벌기] 뿅 → 나레이션 2줄 → 메뉴 [승부하기][코인벌기][아이템], 코인 3
//   → 승부하기: “승부를 하려면 코인이 필요하다” → 코인벌기 ×6: 사방 레이저 → 미로 a → 뿌리기 → 회전 바퀴 → 미로 b → 유도 함선 — 각 턴 코인 하나(후반), 봇은 코인이 뜨면 소울을 옮겨 줍는다(무적) → 코인 9. 실행: tests/playtest/run.sh tvform-battle
import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright-core';
const shots = process.env.SHOT_DIR; fs.mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = []; page.on('pageerror', e => errors.push(e.message));
let fails = 0;
const check = (ok, msg) => { if (!ok) { fails += 1; console.log('FAIL', msg); } else console.log('ok', msg); };
const cap = async n => { await page.screenshot({ path: path.join(shots, 'tvb_' + n + '.png') }); };
const press = async (k, ms = 220) => { await page.keyboard.press(k); await page.waitForTimeout(ms); };
const st = () => page.evaluate(() => { const b = window.game.battle; if (!b) return null; const sp = b.support, g = b.gimmick?.snapshot, il = b.interlude?.snapshot;
  return { state: b.state, text: (b.text || '').slice(0, 60), speaker: b.speaker, menuIdx: b.menuIdx, buttons: b.menuButtons ? b.menuButtons().map(x => x.label) : null, hud: sp?.hud ?? null,
    coins: sp?.coins, coinTurn: !!sp?.coinTurn, current: sp?.current, menuReady: !!sp?.menuReady, gimmick: g || null, interlude: il || null, shapes: b.bullets.map(x => x.shape), coinBullet: b.bullets.find(x => x.pickup && !x.taken) ? { x: b.bullets.find(x => x.pickup && !x.taken).x, y: b.bullets.find(x => x.pickup && !x.taken).y } : null,
    soul: { x: Math.round(b.soul.x), y: Math.round(b.soul.y) }, enemies: b.enemies.map(e => e.id), members: b.members.map(m => m.hp) }; });
const waitFor = async (fn, ms = 8000) => page.waitForFunction(fn, null, { timeout: ms }).then(() => true).catch(() => false);
const god = () => page.evaluate(() => { window.game.battle.soul.invuln = 5; for (const m of window.game.battle.members) { m.hp = m.maxHp; m.down = false; } });
const advanceUntil = async (fn, max = 24) => { for (let i = 0; i < max; i++) { const s = await st(); if (s && fn(s)) return s; await press('KeyC', 260); } return await st(); };
const untilText = async (needle, max = 40) => { for (let i = 0; i < max; i++) { const s = await st(); if (s && (s.text || '').includes(needle)) return s; await press('KeyC', 250); } return await st(); };
try {
  await page.goto('http://localhost:8000/?qa=ship_tvform_battle');
  await page.waitForFunction(() => window.game && window.game.battle && window.game.battle.state === 'intro', null, { timeout: 30000 });
  await page.evaluate(() => { const snd = window.game.sound; window.__sfx = []; const orig = snd.sfx.bind(snd); snd.sfx = (name, opts) => { window.__sfx.push(name); return orig(name, opts); }; });
  await page.waitForTimeout(600); let s = await st(); await cap('01_intro_line');
  check(s.state === 'intro' && (s.text || '').includes('편집노조의 힘') && s.speaker === '영클' && s.enemies.includes('youngcle_tvform'), '전투 들어가자마자 영클 “편집노조의 힘을 얕보지마라” ' + JSON.stringify([s.state, s.text, s.speaker]));
  const bgm = await page.evaluate(() => window.game.sound.bgmName); check(bgm === 'youngcle_tvform_battle', '브금 youngcle_tvform_battle(사용자 지정 ttz22bFLZqQ) ' + bgm);
  await press('KeyC', 300); await press('KeyC', 300);
  // ① 편집노조 유령 흡수(spin) → 파워업(charge: snd_power·wing·great_shine) → “공격도 하지마라.”
  const spin = await waitFor(() => window.game.battle.state === 'enemy-mode' && window.game.battle.gimmick?.snapshot?.phase === 'spin', 6000);
  await page.waitForTimeout(1500); s = await st(); await cap('02_spirits_spin');
  check(spin && s.gimmick?.phase === 'spin' && s.gimmick.spirits.some(x => x.k > 0 && x.k < 1), '편집노조 유령이 빙글빙글 돌며 얼굴로 들어간다 ' + JSON.stringify(s.gimmick?.spirits));
  const charge = await waitFor(() => window.game.battle.gimmick?.snapshot?.phase === 'charge', 8000);
  await page.waitForTimeout(900); s = await st(); await cap('03_power_charge');
  const sfx1 = await page.evaluate(() => window.__sfx.slice());
  check(charge && s.gimmick?.powered && sfx1.includes('power') && sfx1.includes('wing') && sfx1.includes('great_shine'), '넷 다 들어간 뒤 띠리리리링(snd_power) + 오라 휘이잉(wing) + 에너지(great_shine) ' + JSON.stringify([charge, s.gimmick?.powered, sfx1.filter(n => ['power', 'wing', 'great_shine'].includes(n))]));
  const after = await waitFor(() => window.game.battle.gimmick?.snapshot?.phase === 'after', 8000);
  s = await st(); await cap('04_no_attack_line');
  check(after && (s.text || '').includes('공격도 하지마라'), '영클 “공격도 하지마라.” ' + JSON.stringify([after, s.text]));
  await advanceUntil(x => x.state !== 'enemy-mode');
  // ② 행동 창 막간: [공격하기][아이템] → 땅 내리침 → [공격하기] 사라짐 → “ㅋㅋ 대신 이거드림.” → VS 던지기·안착 → [코인벌기] 뿅 → 나레이션
  const menuShown = await waitFor(() => window.game.battle.interlude?.snapshot?.phase === 'menu', 5000);
  await page.waitForTimeout(400); await cap('05_menu_before_slam');
  const slam = await waitFor(() => window.game.battle.interlude?.snapshot?.fightDrop, 5000);
  await page.waitForTimeout(250); s = await st(); await cap('06_slam_fight_drop');
  const sfx2 = await page.evaluate(() => window.__sfx.slice());
  check(menuShown && slam && sfx2.includes('baron_slam'), '행동 창이 뜬 뒤 영클이 땅을 내리쳐(baron_slam) [공격하기]가 떨어진다 ' + JSON.stringify([menuShown, slam, sfx2.includes('baron_slam')]));
  s = await untilText('대신 이거드림', 10); check((s?.text || '').includes('대신 이거드림'), '영클 “ㅋㅋ 대신 이거드림.”'); await advanceUntil(x => x.interlude?.phase === 'throw', 8);
  const thrown = await waitFor(() => window.game.battle.interlude?.snapshot?.phase === 'throw', 4000);
  await page.waitForTimeout(350); await cap('07_vs_throw');
  const landed = await waitFor(() => window.game.battle.interlude?.snapshot?.vs?.landed, 4000);
  await page.waitForTimeout(500); s = await st(); await cap('08_vs_landed_coins_pop');
  check(thrown && landed && s.interlude?.coinsPop > 0, 'VS 승부하기 버튼이 날아와 패널에 안착하고 옆에 [코인벌기]가 뜬다 ' + JSON.stringify([thrown, landed, s.interlude]));
  s = await untilText('승부하기 버튼이 만들어졌다', 12); check(!!s && (s.text || '').includes('만들어졌다'), '나레이션 “승부하기 버튼이 만들어졌다.”');
  s = await untilText('3코인 남았다', 6); check(!!s && (s.text || '').includes('3코인'), '나레이션 “승부를 하려면 코인이 필요하다. 3코인 남았다.”');
  s = await advanceUntil(x => x.state === 'menu' && x.menuReady, 10); const menu = s.state === 'menu' && s.menuReady; await page.waitForTimeout(300);
  s = await st(); await cap('09_menu_duel_coins');
  check(menu && JSON.stringify(s.buttons) === JSON.stringify(['승부하기', '코인벌기', '아이템']) && s.hud === '코인 3' && s.coins === 3, '메뉴 [승부하기][코인벌기][아이템] + 코인 3 ' + JSON.stringify([s.buttons, s.hud, s.coins]));
  // ③ 승부하기 → 규칙 전 문구
  await press('KeyC', 400); s = await st(); await cap('10_duel_text');
  check(s.state === 'text' && (s.text || '').includes('승부를 하려면 코인이 필요하다'), '승부하기: “승부를 하려면 코인이 필요하다. 3코인 남았다.” ' + JSON.stringify([s.state, s.text]));
  await press('KeyC', 400); await waitFor(() => window.game.battle.state === 'menu', 4000);
  // ④ 코인벌기 ×6 — 코인이 뜨면 소울을 옮겨 줍는다(봇 무적)
  const expectShapes = { coin_lasers: ['aim', 'bolt', 'coin'], coin_rain: ['junk', 'coin', 'fake_coin'], coin_spokes: ['spokes', 'coin'], coin_ships: ['warship', 'coin'] };
  const results = [];
  for (let turn = 0; turn < 6; turn++) {
    await press('ArrowRight', 250); s = await st(); if (s.menuIdx !== 1) { await press('ArrowRight', 250); }
    await press('KeyC', 400);
    const started = await waitFor(() => { const b = window.game.battle; return b.state === 'bullets' || (b.state === 'enemy-mode' && b.gimmick?.snapshot?.variant); }, 12000);
    s = await st(); const name = s.current; const seen = new Set(); let gotCoin = false, shot = false;
    const t0 = Date.now();
    while (Date.now() - t0 < 32000) {
      s = await st(); if (!s) break;
      if (s.state === 'menu' || s.state === 'interlude') break;
      await god();
      for (const sh of s.shapes) seen.add(sh);
      if (s.state === 'bullets' && s.coinBullet) { if (!shot) { shot = true; await page.waitForTimeout(200); await cap('11_' + name); } await page.evaluate(({ x, y }) => { window.game.battle.soul.x = x; window.game.battle.soul.y = y; }, s.coinBullet); }
      if (s.state === 'enemy-mode' && s.gimmick?.coin) { if (!shot) { shot = true; await page.waitForTimeout(800); await cap('11_' + name); } if (s.gimmick.t > 3) await page.evaluate(({ x, y }) => { window.game.battle.soul.x = x; window.game.battle.soul.y = y; }, s.gimmick.coin); }
      if (s.state === 'text') await press('KeyC', 200);
      await page.waitForTimeout(120);
    }
    await waitFor(() => window.game.battle.state === 'menu', 8000); s = await st();
    gotCoin = s.coins === 3 + turn + 1;
    results.push({ name, started, gotCoin, coins: s.coins, seen: [...seen], text: s.text });
    const want = expectShapes[name]; const shapesOk = name?.startsWith('coin_maze') ? true : (want || []).every(x => seen.has(x));
    check(started && gotCoin && shapesOk && (s.text || '').includes('코인을 얻었다'), `코인벌기 ${turn + 1}: ${name} — 탄 ${JSON.stringify([...seen])}, 코인 ${s.coins}, “${s.text}”`);
  }
  check(results.map(r => r.name).join(',') === 'coin_lasers,coin_maze_a,coin_rain,coin_spokes,coin_maze_b,coin_ships', '코인 패턴 6종 순환 순서 ' + results.map(r => r.name).join(','));
  const sfxAll = await page.evaluate(() => window.__sfx.slice());
  check(!sfxAll.includes('whoosh') && !sfxAll.includes('boom'), '합성 whoosh/boom 없음');
  check(errors.length === 0, '페이지 오류 없음 ' + JSON.stringify(errors.slice(0, 3)));
} catch (e) { fails += 1; console.log('CRASH', e.message); await cap('crash'); }
console.log('fails=' + fails);
await browser.close();
