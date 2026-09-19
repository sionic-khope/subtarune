// 찢칠라 길 1(BUILD242): 찢칠라 직전에서 오른쪽으로 → 표준 조우 → 전투(찢기·드럼통 탄막이 예고 뒤 실제로 나온다) → 이김(돈 18) → 영구 제거·플래그 → 오른쪽 문 → 찢칠라 길 2 → 토리이 a 를 지나면 달린다(올려베기 교대). 실행: tests/playtest/run.sh jjajang-chin
import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright-core';
const shots = process.env.SHOT_DIR; fs.mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = []; page.on('pageerror', e => errors.push(e.message));
let fails = 0;
const check = (ok, msg) => { if (!ok) { fails += 1; console.log('FAIL', msg); } else console.log('ok', msg); };
const cap = async n => { await page.screenshot({ path: path.join(shots, 'chin_' + n + '.png') }); };
const press = async key => { await page.keyboard.down(key); await page.waitForTimeout(60); await page.keyboard.up(key); };
const until = (fn, ms) => page.waitForFunction(fn, null, { timeout: ms, polling: 30 }).then(() => true).catch(() => false);
const st = () => page.evaluate(() => { const g = window.game; const b = g.battle; return { map: g.mapId, px: Math.round(g.player.x), money: g.money, battle: b ? { state: b.state, enemies: b.enemies.map(e => [e.id, e.hp]), bullets: b.bullets.length, tear: b.bullets.filter(x => x.tear || x.tearWarn).length, drums: b.bullets.filter(x => x.phase || (x.r === 9 && !x.harmless)).length } : null, flags: { c1: !!g.flags.jjajang_chin1_chin_defeated }, chin: !!g.entities.find(e => e.id === 'chin' && !e.dead), runner: g.runner ? { phase: g.runner.phase, up: !!g.runner.core.attack?.up } : null }; });
const go = async (key, cond, ms, run = true) => { await page.evaluate(c => { window.__cond = c; }, cond); if (run) await page.keyboard.down('KeyX'); await page.keyboard.down(key); const ok = await page.waitForFunction(() => new Function('g', 'return ' + window.__cond)(window.game), null, { timeout: ms, polling: 30 }).then(() => true).catch(() => false); await page.keyboard.up(key); if (run) await page.keyboard.up('KeyX'); await page.waitForTimeout(100); return ok; };
try {
  await page.goto('http://localhost:8000/?qa=jjajang_chin1_chin');
  await page.waitForFunction(() => window.game && window.game.mapId === 'jjajang_chin1' && !window.game.dialogue.running, null, { timeout: 30000 });
  await page.waitForTimeout(500);
  let s = await st(); check(s.chin && !s.battle, '찢칠라 직전 QA: 찢칠라가 길 위에 있다 ' + JSON.stringify({ px: s.px }));
  await cap('00_before');
  const money0 = s.money;
  await page.keyboard.down('ArrowRight');
  const met = await until(() => !!window.game.battle, 12000);
  await page.keyboard.up('ArrowRight');
  check(met, '닿으면 표준 조우 → 전투');
  check(await until(() => window.game.battle && window.game.battle.state === 'intro' && window.game.battle.enemies.every(e => e.img), 15000), '전투 열림(그림 로드)');
  s = await st(); check(s.battle && s.battle.enemies[0][0] === 'chinchilla' && s.battle.enemies[0][1] === 16, '찢칠라 체력 16 ' + JSON.stringify(s.battle));
  await page.waitForTimeout(800); await cap('01_intro');
  // 인트로 → 메뉴 → 공격 → 적 턴: 예고(무해)가 먼저, 그 뒤 위험 찢김/드럼통
  const tl = { firstHarmless: null, firstHarm: null, sawTear: false, sawDrum: false };
  const drive = async (ms) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      const q = await page.evaluate(() => { const b = window.game.battle; if (!b) return { gone: true }; const bullets = b.bullets; return { state: b.state, typed: b.typed, t: b.t, harmless: bullets.filter(x => x.harmless).length, harm: bullets.filter(x => !x.harmless).length, tear: bullets.some(x => x.tear), drum: bullets.some(x => x.phase || (x.r === 9 && !x.harmless)), now: performance.now() }; });
      if (q.gone) return 'gone';
      if (q.harmless && tl.firstHarmless === null) tl.firstHarmless = q.now;
      if (q.harm && tl.firstHarm === null) { tl.firstHarm = q.now; await cap('02_bullets'); }
      if (q.tear) tl.sawTear = true; if (q.drum) tl.sawDrum = true;
      if (q.state === 'intro') { if (q.typed && q.t > 0.65) await press('KeyC'); }
      else if (q.state === 'menu') { return 'menu'; }
      else if (q.state === 'win') { if (q.typed) await press('KeyC'); }
      await page.waitForTimeout(50);
    }
    return 'timeout';
  };
  check((await drive(12000)) === 'menu', '메뉴');
  await cap('01b_menu');
  // 공격 한 번(C: 싸움 → 대상 → 타이밍) → 적 턴 관찰
  for (let i = 0; i < 3; i++) { await press('KeyC'); await page.waitForTimeout(220); }
  const r = await (async () => { const t0 = Date.now(); while (Date.now() - t0 < 16000) { const q = await page.evaluate(() => { const b = window.game.battle; if (!b) return { gone: true }; return { state: b.state, harmless: b.bullets.filter(x => x.harmless).length, harm: b.bullets.filter(x => !x.harmless).length, tear: b.bullets.some(x => x.tear), drum: b.bullets.some(x => x.phase || (x.r === 9 && !x.harmless)), now: performance.now(), bubble: b.bubble?.text || null }; }); if (q.gone) return 'gone'; if (q.bubble) tl.bubble = q.bubble; if (q.harmless && tl.firstHarmless === null) tl.firstHarmless = q.now; if (q.harm && tl.firstHarm === null) { tl.firstHarm = q.now; await cap('02_bullets'); } if (q.tear) tl.sawTear = true; if (q.drum) tl.sawDrum = true; if (q.state === 'menu' && tl.firstHarm !== null) return 'menu'; if (q.state === 'win') { await press('KeyC'); } await page.waitForTimeout(40); } return 'timeout'; })();
  check(tl.firstHarmless !== null && tl.firstHarm !== null && tl.firstHarm - tl.firstHarmless >= 280, `예고(무해)가 먼저, 위험은 ≥0.3초 뒤 (${tl.firstHarmless && tl.firstHarm ? Math.round(tl.firstHarm - tl.firstHarmless) : 'n/a'}ms)`);
  check(tl.sawTear || tl.sawDrum, `찢김 또는 드럼통이 실제로 나온다 tear=${tl.sawTear} drum=${tl.sawDrum}`);
  check(['씨2발년아', '씹구멍 씹구멍', '찍찍찍찍찢'].includes(tl.bubble), '말풍선은 원문 대사 ' + tl.bubble);
  // 이김: HP 1 로 두고 공격
  const won = await (async () => { const t0 = Date.now(); let winText = ''; while (Date.now() - t0 < 40000) { const q = await page.evaluate(() => { const b = window.game.battle; if (!b) return { gone: true }; if (b.state === 'menu') { for (const e of b.enemies) e.hp = 1; return { menu: true }; } return { state: b.state, text: b.text, typed: b.typed }; }); if (q.gone) return winText; if (q.menu) { for (let i = 0; i < 6; i++) { await press('KeyC'); await page.waitForTimeout(150); } } else if (q.state === 'win') { winText = q.text; if (q.typed) await press('KeyC'); } await page.waitForTimeout(120); } return null; })();
  check(won !== null && won.includes('전투에서 승리했다') && won.includes('18원'), '승리 문구 + 18원 ' + JSON.stringify(won));
  check(await until(() => !window.game.battle && !window.game.dialogue.running && window.game.flags.jjajang_chin1_chin_defeated, 15000), '전투 끝 → 플래그');
  await page.waitForTimeout(500); s = await st(); await cap('03_won');
  check(!s.chin && s.money === money0 + 18, `찢칠라 제거, 돈 +18 (${money0} → ${s.money})`);
  // 오른쪽 문 → 길 2 → 토리이 a → 달리기(C 두 번: 내려·올려)
  check(await go('ArrowRight', "g.mapId === 'jjajang_chin2'", 25000), '오른쪽 문 → 찢칠라 길 2');
  await page.waitForFunction(() => !window.game.transitioning && !window.game.dialogue.running, null, { timeout: 10000 });
  await page.keyboard.down('ArrowRight');
  check(await until(() => !!window.game.runner, 20000), '토리이 a 를 지나면 달린다');
  await page.keyboard.up('ArrowRight');
  check(await until(() => window.game.runner?.phase === 'run', 4000), '달리기');
  await press('KeyC'); await page.waitForTimeout(120); const up1 = await page.evaluate(() => !!window.game.runner?.core.attack?.up);
  await until(() => !window.game.runner?.core.attack, 2000); await press('KeyC'); await page.waitForTimeout(100); const up2 = await page.evaluate(() => !!window.game.runner?.core.attack?.up);
  await cap('04_upslash');
  check(!up1 && up2, `땅 베기 내려·올려 교대 (${up1}, ${up2})`);
  // 아래 샛길 끝 마나샘(BUILD244): QA 스폰에서 오른쪽으로 → 막히는 자리에서 C → 전체 회복
  await page.evaluate(() => { const g = window.game; g.runner?.finish(); g.changeMap('jjajang_chin2', 'before_spring'); g.partyHp.hyungsub = 40; });
  await page.waitForFunction(() => window.game.mapId === 'jjajang_chin2' && !window.game.transitioning && Math.round(window.game.player.y / 32) >= 20, null, { timeout: 8000 });
  check(await go('ArrowRight', "g.entities.find(e => e.id === 'chin2_spring') && g.player.x + g.player.w >= g.entities.find(e => e.id === 'chin2_spring').x - 2", 8000), '아래 길 끝 마나샘 앞');
  await cap('05_spring');
  await press('KeyC');
  check(await until(() => window.game.hpOf('hyungsub') === window.game.maxHpOf('hyungsub') && /회복/.test(window.game.textbox.node?.text || ''), 5000), '마나샘: HP 전체 회복 + 나레이션');
  await cap('05b_spring_heal');
  check(errors.length === 0, 'page errors ' + JSON.stringify(errors.slice(0, 3)));
} catch (e) { fails += 1; console.log('FAIL exception', e.message); }
console.log('fails=' + fails); await browser.close(); process.exit(fails ? 1 : 0);
