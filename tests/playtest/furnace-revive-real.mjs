// 색깔 게임 뒤 복귀 연출을 실제 진행 경로로(2026-09-18 사용자 “성공 후에 쥰희랑 용준이 안 뜨는 버그”, “TV 내려올 때 용암에서 걸어 내려오네”):
//   갈림길 → 광장 인트로 끝까지 → 패널(furnace_panel) → 색깔 게임 QA 훅으로 통과 → 폭발·부활 대사 때 둘이 울타리 앞에 보여야 하고, TV 내려올 때 모이는 이동이 위(용암)에서 시작하면 안 된다.
//   실행: tests/playtest/run.sh furnace-revive-real
import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright-core';
const shots = process.env.SHOT_DIR; fs.mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = []; page.on('pageerror', e => errors.push(e.message));
let fails = 0;
const check = (ok, msg) => { if (!ok) { fails += 1; console.log('FAIL', msg); } else console.log('ok', msg); };
const cap = async n => { await page.screenshot({ path: path.join(shots, 'revive_' + n + '.png') }); };
const pressC = async () => { await page.keyboard.press('KeyC'); await page.waitForTimeout(160); };
const st = () => page.evaluate(() => { const g = window.game; const e = id => g.entities.find(x => x.id === id && !x.dead); const j = e('arena_junhee'), y = e('arena_yongjun'), c = e('lava_cage');
  const P = o => o ? { x: Math.round(o.x), y: Math.round(o.y), v: !!o.visible, ix: o.def.ix, iy: o.def.iy, hop: o.hopY || 0 } : null;
  return { map: g.mapId, dialogue: g.dialogue.running, text: (g.textbox.node?.text || '').slice(0, 40), j: P(j), yj: P(y), cage: P(c), camy: Math.round(g.camera.y), intro: !!g.flags.furnace_arena_intro_done, color: !!g.flags.furnace_color_done, scene3d: !!g.scene3d }; });
try {
  await page.goto('http://localhost:8000/?qa=youngcle17');
  await page.waitForFunction(() => window.game && window.game.mapId === 'youngcle17' && !window.game.dialogue.running, null, { timeout: 25000 });
  await page.waitForTimeout(500);
  await page.keyboard.down('ArrowRight'); await page.waitForFunction(() => window.game.player.x >= 320, null, { timeout: 8000 }).catch(() => {}); await page.keyboard.up('ArrowRight');
  await page.keyboard.down('ArrowUp'); await page.waitForFunction(() => window.game.mapId === 'youngcle18', null, { timeout: 12000 }).catch(() => {}); await page.keyboard.up('ArrowUp');
  let s = await st(); check(s.map === 'youngcle18', '광장 도착 ' + s.map);
  // 인트로: 대사를 C 로 끝까지(플래그가 설 때까지, 최대 2분)
  const t0 = Date.now(); while (Date.now() - t0 < 120000) { s = await st(); if (s.intro && !s.dialogue) break; await pressC(); }
  await page.waitForTimeout(800); s = await st(); await cap('01_after_intro');
  console.log('after intro', JSON.stringify([s.j, s.yj, s.cage]));
  check(s.intro && s.j?.v && s.j.y === 214 && s.yj?.y === 214, '인트로 끝: 둘이 철창 자리(y214)에 보임 ' + JSON.stringify([s.j, s.yj]));
  // 패널 스크립트 → 색깔 게임 → QA 훅으로 통과
  await page.evaluate(() => window.game.runScript('furnace_panel'));
  const scene = await page.waitForFunction(() => !!window.__colorgame, null, { timeout: 20000 }).then(() => true).catch(() => false);
  check(scene, '색깔 게임 씬 시작');
  await page.waitForTimeout(1500); await page.evaluate(() => window.__colorgame.finish(true));
  await page.waitForFunction(() => !window.__colorgame && !window.game.scene3d, null, { timeout: 15000 }).catch(() => {});
  // 복귀 연출: “부활이다” 까지 C 로 넘기며 둘의 좌표를 기록
  const trail = []; const t1 = Date.now(); let revived = null;
  while (Date.now() - t1 < 40000) { s = await st(); trail.push([s.j?.y, s.yj?.y, s.j?.v]); if ((s.text || '').includes('부활이다')) { revived = s; break; } if (s.dialogue) await pressC(); else await page.waitForTimeout(150); }
  await page.waitForTimeout(300); await cap('02_revive'); s = await st();
  console.log('revive', JSON.stringify([s.j, s.yj, s.cage, s.camy]));
  check(revived && s.j?.v && s.yj?.v && s.j.y >= 260 && s.j.y <= 320 && Math.abs(s.j.y - s.camy) < 360, '“부활이다” 때 둘이 울타리 앞(y≈284)에 보임 ' + JSON.stringify([s.j, s.yj, s.camy]));
  // TV 내려올 때 모이기: 이동 시작 위치가 위(용암, y<200)면 버그
  await pressC(); const ys = []; const t2 = Date.now();
  while (Date.now() - t2 < 5000) { s = await st(); ys.push(s.j?.y); await page.waitForTimeout(100); }
  await cap('03_gather');
  check(ys.every(y => y >= 200), '모이는 동안 쥰희가 위(용암)에서 내려오지 않는다 ' + JSON.stringify([Math.min(...ys), Math.max(...ys)]));
  check(errors.length === 0, 'page errors ' + JSON.stringify(errors.slice(0, 3)));
} catch (e) { fails += 1; console.log('FAIL exception', e.message); }
console.log('fails=' + fails); await browser.close(); process.exit(fails ? 1 : 0);
