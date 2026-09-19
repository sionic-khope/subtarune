// 토리이 굽이 길(BUILD236): 입구에서 청소부 한마디(껄껄 웃음) → 휘리릭 사라짐 → 토리이 a 오른쪽 달리기(장애물: C 로 쳐내면 deflect, 못 쳐내면 HP −10)
//   → 끝에서 멈춤(청소부는 사라진 채) → 밑길 → 토리이 b 왼쪽 달리기(스프라이트 반전, 카메라 오른쪽) → 밑길 → 토리이 c 오른쪽 달리기 → 끝에서 청소부가 걸어와 “껄껄 이제 적응좀 됐나보구만”(웃음) 뒤 합류. 실행: tests/playtest/run.sh jjajang-run2
import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright-core';
const shots = process.env.SHOT_DIR; fs.mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = []; page.on('pageerror', e => errors.push(e.message));
let fails = 0;
const check = (ok, msg) => { if (!ok) { fails += 1; console.log('FAIL', msg); } else console.log('ok', msg); };
const cap = async n => { await page.screenshot({ path: path.join(shots, 'run2_' + n + '.png') }); };
const press = async key => { await page.keyboard.down(key); await page.waitForTimeout(60); await page.keyboard.up(key); };
const until = (fn, ms) => page.waitForFunction(fn, null, { timeout: ms, polling: 30 }).then(() => true).catch(() => false);
const st = () => page.evaluate(() => { const g = window.game; const r = g.runner; const f = g.entities.find(e => e.def?.type === 'follower' && !e.dead); return { map: g.mapId, px: Math.round(g.player.x), py: Math.round(g.player.y), facing: g.player.facing, hp: g.hpOf('hyungsub'), cam: [Math.round(g.camera.x), Math.round(g.camera.y)], locked: !!g.camera.locked, runner: r ? { phase: r.phase, dir: r.core.dir, vx: Math.round(r.core.vx), obstacles: r.core.obstacles?.length ?? -1, hurt: r.core.hurtCount, deflect: r.core.deflectCount, grounded: r.core.grounded, tutorial: r.core.tutorial, sfx: r.sfxLog.slice() } : null, popup: !!g.hpPopup, follower: f ? { x: Math.round(f.x), y: Math.round(f.y), visible: f.visible !== false } : null }; });
const go = async (key, cond, ms, run = true) => { await page.evaluate(c => { window.__cond = c; }, cond); if (run) await page.keyboard.down('KeyX'); await page.keyboard.down(key); const ok = await page.waitForFunction(() => new Function('g', 'return ' + window.__cond)(window.game), null, { timeout: ms, polling: 30 }).then(() => true).catch(() => false); await page.keyboard.up(key); if (run) await page.keyboard.up('KeyX'); await page.waitForTimeout(100); return ok; };
const line = async (text, capture) => {
  const seen = await page.waitForFunction(t => window.game.textbox.node?.text?.includes(t), text, { timeout: 12000, polling: 60 }).then(() => true).catch(() => false);
  check(seen, `대사: ${text}`); if (!seen) throw new Error('missing line ' + text);
  if (await page.evaluate(() => window.game.textbox.state === 'typing')) { await press('KeyC'); await until(() => window.game.textbox.state === 'waiting', 3000); }
  if (capture) await cap(capture);
  const before = await page.evaluate(() => window.game.textbox.node?.text);
  await press('KeyC');
  await page.waitForFunction(p => !window.game.dialogue.running || window.game.textbox.node?.text !== p, before, { timeout: 4000, polling: 40 }).catch(() => {});
};
// 달리는 동안: 앞에 장애물이 가까이 오면 C(쳐냄). attack=false 면 아무것도 안 해 맞는다
const runThrough = async (attack, tag) => {
  let shots = 0;
  while (await page.evaluate(() => !!window.game.runner)) {
    if (attack) {
      const near = await page.evaluate(() => { const r = window.game.runner; if (!r || !r.core.obstacles) return false; const px = r.core.x + 12; return r.core.obstacles.some(o => !o.deflected && (o.x - px) * r.core.dir > 36 && (o.x - px) * r.core.dir < 96 && !r.core.attack && r.core.grounded); });
      if (near) { await press('KeyC'); shots += 1; }
    }
    if (shots === 3 && tag) { await cap(tag); shots += 1; }
    await page.waitForTimeout(40);
  }
};
try {
  // 실제 진행 경로로 들어온다(BUILD246): 파란 토리이 길 동쪽 끝 → 오른쪽 문 → 굽이 길. 달려서(X) 들어와도 입구 연출이 발동해야 한다
  //   전엔 입구 트리거가 스폰에서 32px 앞이라 맵 전환 직후 트리거 쿨다운(0.6초)이 끝나기 전에 지나쳐 영영 안 밟혔다(사용자 “청소부가 이따보새 하고 사라지는 거 추가하라고”)
  await page.goto('http://localhost:8000/?qa=jjajang_run');
  await page.waitForFunction(() => window.game && window.game.mapId === 'jjajang_run' && !window.game.dialogue.running, null, { timeout: 30000 });
  await page.evaluate(() => { const g = window.game; for (const f of ['run_intro_started', 'run_intro_done', 'run_outro_done']) g.setFlag(f); g.setFlag('party_hidden', false); g.changeMap('jjajang_run', 'from_east'); });
  await page.waitForFunction(() => window.game.mapId === 'jjajang_run' && !window.game.transitioning, null, { timeout: 12000 });
  await page.waitForTimeout(300);
  await page.keyboard.down('KeyX'); await page.keyboard.down('ArrowRight');
  check(await until(() => window.game.mapId === 'jjajang_run2', 20000), '파란 토리이 길 오른쪽 문 → 굽이 길');
  const entered = await until(() => window.game.dialogue.running && window.game.flags.run2_enter_started, 12000);
  await page.keyboard.up('ArrowRight'); await page.keyboard.up('KeyX');
  check(entered, '달려 들어와도 입구 청소부 연출이 발동한다');
  await page.waitForTimeout(200);
  let s = await st(); check(s.follower && s.hp > 0, '청소부 동행 ' + JSON.stringify({ px: s.px, hp: s.hp }));
  const hp0 = s.hp;
  await line('이번엔 검도 휘둘러보게 이따보게', '00_enter');
  check(await until(() => !window.game.dialogue.running && window.game.flags.run2_enter_done, 6000), '연출 끝');
  s = await st(); check(s.follower && !s.follower.visible, '청소부가 휘리릭 사라졌다');
  // 토리이 a: 오른쪽 달리기, 장애물을 안 쳐내면 맞는다
  await page.keyboard.down('ArrowRight');
  check(await until(() => !!window.game.runner, 12000), '토리이 a 를 지나면 달린다');
  await page.keyboard.up('ArrowRight');
  // 첫 나뭇잎 튜토리얼(BUILD240): 그 전엔 X 점프가 안 먹고, 맞기 직전에 멈춰 C 를 기다린다 → C 로 쳐낸다
  const L = await page.evaluate(() => { const g = window.game; const rows = g.map.def.rows; const [[a0, a1], [b0, b1], [c0, c1]] = g.map.def.meta.runRoadRows; const cols = r => [...rows[r]].map((ch, i) => (ch === '*' || ch === '+' ? i : -1)).filter(i => i >= 0); const dr = cols(a1 + 1), dl = cols(b1 + 1); return { W: rows[0].length, b0, c0, dr0: dr[0], dl1: dl[dl.length - 1] }; });
  await until(() => window.game.runner?.phase === 'run', 3000); await press('KeyX'); await page.waitForTimeout(150);
  s = await st(); check(s.runner && s.runner.grounded && s.runner.tutorial === 'pending', '첫 나뭇잎 전엔 점프가 잠긴다 ' + JSON.stringify({ grounded: s.runner?.grounded, tutorial: s.runner?.tutorial }));
  check(await until(() => window.game.runner?.core.obstacles?.length > 0, 6000), '장애물이 나온다');
  await page.waitForTimeout(300); await cap('01_obstacles');
  check(await until(() => window.game.runner?.core.tutorial === 'hold', 8000), '첫 나뭇잎 직전에 멈춘다');
  const hx = await page.evaluate(() => window.game.runner.core.x); await page.waitForTimeout(400); await cap('01b_tutorial');
  check(await page.evaluate(x => window.game.runner.core.x === x, hx), '멈춘 동안 안 움직인다');
  await press('KeyC');
  check(await until(() => window.game.runner?.core.tutorial === 'done' && window.game.runner.core.deflectCount >= 1 && window.game.flags.run_leaf_tutorial_done, 3000), 'C 로 첫 나뭇잎을 쳐내고 튜토리얼 끝(플래그)');
  check(await until(() => !!window.game.hpPopup, 15000), '맞으면 아래에 HP 띠가 뜬다');
  await page.waitForTimeout(250); await cap('01c_hp');
  await runThrough(false, null);
  s = await st();
  const runsA = await page.evaluate(() => window.game.map.def.meta.runs.a);
  check(!s.runner && s.px >= runsA.endX - 4 && s.hp < hp0 && s.follower && !s.follower.visible, `A 끝: 맞아서 HP 가 줄었고(${hp0} → ${s.hp}) 청소부는 아직 없다`);
  check((hp0 - s.hp) % 10 === 0 && hp0 - s.hp >= 10, '맞을 때마다 10씩');
  // 밑길로 → B 길 → 왼쪽으로 토리이 b
  check(await go('ArrowRight', `g.player.x >= ${L.dr0 * 32 + 4}`, 6000), '오른쪽 밑길 앞');
  check(await go('ArrowDown', `g.player.y >= ${L.b0 * 32 + 4}`, 8000), '밑길로 내려온다');
  await page.keyboard.down('ArrowLeft');
  check(await until(() => !!window.game.runner, 12000), '토리이 b 를 왼쪽으로 지나면 달린다');
  await page.keyboard.up('ArrowLeft');
  s = await st(); check(s.runner && s.runner.dir === -1 && s.facing === 'left', '왼쪽 달리기 ' + JSON.stringify(s.runner));
  check(await until(() => window.game.runner?.phase === 'run', 3000), '달린다');
  await page.waitForTimeout(500); s = await st(); await cap('02_left_run');
  const camRight = s.px + 12 - s.cam[0];
  check(Math.abs(camRight - 480 * 0.78) < 40, `왼쪽 달리기: 캐릭터가 화면 오른쪽(${camRight.toFixed(0)}px)`);
  const hpB = s.hp;
  await runThrough(true, '03_deflect');
  s = await st();
  const runsB = await page.evaluate(() => window.game.map.def.meta.runs.b);
  const log = await page.evaluate(() => window.__lastRunner || null);
  check(!s.runner && s.px <= runsB.endX + 4, `B 끝(${runsB.endX})에서 멈춘다 ` + s.px);
  // 밑길 → C 길 → 토리이 c
  check(await go('ArrowLeft', `g.player.x <= ${L.dl1 * 32 + 4}`, 6000), '왼쪽 밑길 앞');
  check(await go('ArrowDown', `g.player.y >= ${L.c0 * 32 + 4}`, 8000), '밑길로 내려온다');
  await page.evaluate(() => { const g = window.game; window.__stats = { deflect: 0, hurt: 0 }; });
  await page.keyboard.down('ArrowRight');
  check(await until(() => !!window.game.runner, 12000), '토리이 c 를 지나면 달린다');
  await page.keyboard.up('ArrowRight');
  const hpC = (await st()).hp;
  await page.waitForTimeout(300);
  await page.evaluate(() => { window.__rc = window.game.runner.core; });
  await runThrough(true, null);
  const rc = await page.evaluate(() => ({ deflect: window.__rc.deflectCount, hurt: window.__rc.hurtCount, sfx: window.__rc && window.game.runner ? [] : [] }));
  check(rc.deflect >= 1, `C 구간에서 쳐낸 횟수 ${rc.deflect}`);
  s = await st();
  check(s.hp === hpC - rc.hurt * 10 || s.hp === 1, `맞은 횟수(${rc.hurt})만큼 10씩 (${hpC} → ${s.hp})`);
  // 끝: 청소부가 오른쪽에서 걸어와 합류
  check(await until(() => { const j = window.game.entities.find(e => e.id === 'janitor' && !e.dead); return j && j.visible !== false && j.x > window.game.player.x + 150; }, 4000), '청소부가 오른쪽 멀리서 나타난다');
  await page.waitForTimeout(1200); await cap('04_walk_in');
  await line('이제 적응좀 됐나보구만', '04b_line');
  check(await until(() => { const j = window.game.entities.find(e => e.id === 'janitor' && !e.dead); return j && !!j.motion; }, 3000), '껄껄 뒤에 웃는다');
  check(await until(() => !window.game.dialogue.running && window.game.flags.run2_outro_done, 12000), '대사 뒤 합류');
  await page.waitForTimeout(500); s = await st(); await cap('05_end');
  check(s.follower && s.follower.visible && s.follower.x < s.px, '다시 뒤에 선다 ' + JSON.stringify(s.follower));
  check(await go('ArrowRight', `g.player.x >= ${(L.W - 2) * 32}`, 8000), '오른쪽 끝(다음 맵 대기)');
  check(errors.length === 0, 'page errors ' + JSON.stringify(errors.slice(0, 3)));
} catch (e) { fails += 1; console.log('FAIL exception', e.message); }
console.log('fails=' + fails); await browser.close(); process.exit(fails ? 1 : 0);
