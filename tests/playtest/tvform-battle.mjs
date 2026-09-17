// 변신 영클 전투(BUILD214/215): QA ship_tvform_battle → “편집노조의 힘을 얕보지마라” → 편집노조 넷 유령이 돌며 얼굴로 흡수(spin) → 띠리리리링·오라(charge, power) → 보통 메뉴 [공격하기][아이템]
//   → 공격 → 적 턴 코인 패턴 6종 순환(사방 레이저 → 미로 a → 뿌리기 → 회전 바퀴 → 미로 b → 유도 함선): 각 턴 코인 하나(후반), 봇은 코인이 뜨면 소울을 옮겨 먹는다(무적) → 서 있는 동료 모두 +30 회복(HP 를 미리 깎아 두고 잰다). 실행: tests/playtest/run.sh tvform-battle
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
const st = () => page.evaluate(() => { const b = window.game.battle; if (!b) return null; const sp = b.support, g = b.gimmick?.snapshot;
  const coin = b.bullets.find(x => x.pickup && !x.taken);
  return { state: b.state, text: (b.text || '').slice(0, 60), speaker: b.speaker, menuIdx: b.menuIdx, buttons: b.menuButtons ? b.menuButtons().map(x => x.label) : null,
    current: sp?.current, healed: sp?.healed, gimmick: g || null, shapes: b.bullets.map(x => x.shape), coinBullet: coin ? { x: coin.x, y: coin.y } : null,
    soul: { x: Math.round(b.soul.x), y: Math.round(b.soul.y) }, enemies: b.enemies.map(e => ({ id: e.id, hp: e.hp })), members: b.members.map(m => m.hp) }; });
const waitFor = async (fn, ms = 8000) => page.waitForFunction(fn, null, { timeout: ms }).then(() => true).catch(() => false);
const god = () => page.evaluate(() => { window.game.battle.soul.invuln = 5; });
const advanceUntil = async (fn, max = 24) => { for (let i = 0; i < max; i++) { const s = await st(); if (s && fn(s)) return s; await press('KeyC', 260); } return await st(); };
try {
  await page.goto('http://localhost:8000/?qa=ship_tvform_battle');
  await page.waitForFunction(() => window.game && window.game.battle && window.game.battle.state === 'intro', null, { timeout: 30000 });
  await page.evaluate(() => { const snd = window.game.sound; window.__sfx = []; const orig = snd.sfx.bind(snd); snd.sfx = (name, opts) => { window.__sfx.push(name); return orig(name, opts); }; });
  await page.waitForTimeout(600); let s = await st(); await cap('01_intro_line');
  check(s.state === 'intro' && (s.text || '').includes('편집노조의 힘') && s.speaker === '영클' && s.enemies.some(e => e.id === 'youngcle_tvform'), '전투 들어가자마자 영클 “편집노조의 힘을 얕보지마라” ' + JSON.stringify([s.state, s.text, s.speaker]));
  const bgm = await page.evaluate(() => window.game.sound.bgmName); check(bgm === 'youngcle_tvform_battle', '브금 youngcle_tvform_battle(사용자 지정 ttz22bFLZqQ) ' + bgm);
  await press('KeyC', 300); await press('KeyC', 300);
  // ① 편집노조 유령 흡수(spin) → 파워업(charge: snd_power·wing·great_shine) → 보통 메뉴
  const spin = await waitFor(() => window.game.battle.state === 'enemy-mode' && window.game.battle.gimmick?.snapshot?.phase === 'spin', 6000);
  await page.waitForTimeout(1500); s = await st(); await cap('02_spirits_spin');
  check(spin && s.gimmick?.phase === 'spin' && s.gimmick.spirits.some(x => x.k > 0 && x.k < 1), '편집노조 유령이 빙글빙글 돌며 얼굴로 들어간다 ' + JSON.stringify(s.gimmick?.spirits));
  const charge = await waitFor(() => window.game.battle.gimmick?.snapshot?.phase === 'charge', 8000);
  await page.waitForTimeout(900); s = await st(); await cap('03_power_charge');
  const sfx1 = await page.evaluate(() => window.__sfx.slice());
  check(charge && s.gimmick?.powered && sfx1.includes('power') && sfx1.includes('wing') && sfx1.includes('great_shine'), '넷 다 들어간 뒤 띠리리리링(snd_power) + 오라 휘이잉(wing) + 에너지(great_shine) ' + JSON.stringify([charge, s.gimmick?.powered, sfx1.filter(n => ['power', 'wing', 'great_shine'].includes(n))]));
  const menu = await waitFor(() => window.game.battle.state === 'menu', 10000);
  s = await st(); await cap('04_menu');
  check(menu && JSON.stringify(s.buttons) === JSON.stringify(['공격하기', '아이템']), '파워업 뒤 보통 메뉴 [공격하기][아이템](승부하기·코인벌기 없음) ' + JSON.stringify(s.buttons));
  // ② 공격 → 적 턴 코인 패턴 ×6 — 코인이 뜨면 소울을 옮겨 먹는다(봇 무적), 먹기 전에 HP 를 깎아 두고 회복을 잰다
  const expectShapes = { coin_lasers: ['aim', 'bolt', 'coin'], coin_rain: ['junk', 'coin', 'fake_coin'], coin_spokes: ['spokes', 'coin'], coin_ships: ['warship', 'coin'] };
  const results = []; let hpBefore = null;
  for (let turn = 0; turn < 6; turn++) {
    // 세 명 다 공격(대상 하나): [공격하기] → 대상 → C, ×3
    for (let m = 0; m < 3; m++) { await press('KeyC', 300); await press('KeyC', 350); }
    const started = await waitFor(() => { const b = window.game.battle; return b.state === 'bullets' || (b.state === 'enemy-mode' && b.gimmick?.snapshot?.variant); }, 20000);
    await page.evaluate(() => { for (const m of window.game.battle.members) m.hp = Math.max(1, m.maxHp - 60); });   // 회복을 재기 위해 미리 깎는다
    hpBefore = (await st()).members.slice();
    s = await st(); const name = s.current; const seen = new Set(); let shot = false;
    const t0 = Date.now();
    while (Date.now() - t0 < 32000) {
      s = await st(); if (!s) break;
      if (s.state === 'menu' || s.state === 'win') break;
      await god();
      for (const sh of s.shapes) seen.add(sh);
      if (s.state === 'bullets' && s.coinBullet) { if (!shot) { shot = true; await page.waitForTimeout(200); await cap('11_' + name); } await page.evaluate(({ x, y }) => { window.game.battle.soul.x = x; window.game.battle.soul.y = y; }, s.coinBullet); }
      if (s.state === 'enemy-mode' && s.gimmick?.coin) { if (!shot) { shot = true; await page.waitForTimeout(800); await cap('11_' + name); } if (s.gimmick.t > 3) await page.evaluate(({ x, y }) => { window.game.battle.soul.x = x; window.game.battle.soul.y = y; }, s.gimmick.coin); }
      if (s.state === 'text') await press('KeyC', 200);
      await page.waitForTimeout(120);
    }
    await waitFor(() => ['menu', 'win'].includes(window.game.battle.state), 8000); s = await st();
    const healedNow = s.members.every((hp, i) => hp >= hpBefore[i] + 30);
    results.push({ name, started, healedNow, members: s.members, seen: [...seen], text: s.text });
    const want = expectShapes[name]; const shapesOk = name?.startsWith('coin_maze') ? true : (want || []).every(x => seen.has(x));
    check(started && healedNow && shapesOk && s.healed === turn + 1 && (s.text || '').includes('회복'), `적 턴 ${turn + 1}: ${name} — 탄 ${JSON.stringify([...seen])}, 코인 먹고 모두 +30 ${JSON.stringify([hpBefore, s.members])} “${s.text}”`);
    if (s.state === 'win') break;
  }
  check(results.map(r => r.name).join(',') === 'coin_lasers,coin_maze_a,coin_rain,coin_spokes,coin_maze_b,coin_ships', '코인 패턴 6종 순환 순서 ' + results.map(r => r.name).join(','));
  s = await st(); check(s.enemies[0].hp < 120, '공격이 들어간다(영클 hp 120 에서 줄어듦) ' + JSON.stringify(s.enemies));
  const sfxAll = await page.evaluate(() => window.__sfx.slice());
  check(!sfxAll.includes('whoosh') && !sfxAll.includes('boom'), '합성 whoosh/boom 없음');
  check(errors.length === 0, '페이지 오류 없음 ' + JSON.stringify(errors.slice(0, 3)));
} catch (e) { fails += 1; console.log('CRASH', e.message); await cap('crash'); }
console.log('fails=' + fails);
await browser.close();
