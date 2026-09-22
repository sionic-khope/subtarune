// 벚꽃 숲 10·11(BUILD283): 벚꽃 숲 9 왼쪽 끝 문 → 벚꽃 숲 10 동쪽 끝(문 되돌아가기) → 파란 토리이 → 10초 달리기(장애물 없음) → 절벽 오르막 → 도약(점프 소리) → 잔상 슬로우 6초(꽃잎)
//   → 낙하 → 어둡게 → 벚꽃 숲 11 나무 정상에 위에서 떨어져 착지(쿵) → 걷기 → QA 재입장. 실행: tests/playtest/run.sh jjajang-sakura10
import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright-core';
const shots = process.env.SHOT_DIR; fs.mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = []; page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'warning' && /cutscene|엔티티 없음|동작 없음|없음/.test(m.text())) errors.push('warn: ' + m.text()); });
let fails = 0;
const check = (ok, msg) => { if (!ok) { fails += 1; console.log('FAIL', msg); } else console.log('ok', msg); };
const cap = async n => { await page.screenshot({ path: path.join(shots, 'sakura10_' + n + '.png') }); };
const until = (fn, ms) => page.waitForFunction(fn, null, { timeout: ms, polling: 30 }).then(() => true).catch(() => false);
const ev = (fn, arg) => page.evaluate(fn, arg);
const go = async (key, cond, ms, run = false) => { await page.evaluate(c => { window.__cond = c; }, cond); if (run) await page.keyboard.down('KeyX'); await page.keyboard.down(key); const ok = await until(() => new Function('g', 'return ' + window.__cond)(window.game), ms); await page.keyboard.up(key); if (run) await page.keyboard.up('KeyX'); await page.waitForTimeout(100); return ok; };
const st = () => ev(() => { const g = window.game; const r = g.runner, p = g.player; return { map: g.mapId, px: Math.round(p.x), py: Math.round(p.y), hopY: Math.round(p.hopY || 0), visible: p.visible !== false, cam: [Math.round(g.camera.x), Math.round(g.camera.y)], locked: !!g.camera.locked, bgm: g.sound.bgmName, party: g.party.slice(), dialogue: g.dialogue.running, fade: +(g.fade?.alpha ?? g.fade?.value ?? 0).toFixed(2), petalRate: g.petals ? g.petals.rate : null, runner: r ? { phase: r.phase, dir: r.core.dir, water: r.water, obstacles: r.core.obstacles === null ? 'none' : r.core.obstacles.length, airY: Math.round(r.core.airY), groundY: Math.round(r.core.groundY), trail: r.core.trail.length, bits: r.leafBits.length, sfx: r.sfxLog.slice(), feetScreenY: Math.round(p.y + p.h - r.core.airY - g.camera.y), xScreen: Math.round(p.x - g.camera.x) } : null }; });
/** 화면 밝기(0~765): 게임 캔버스 다섯 점의 최대 — 어둠 막이 걷혔는지 */
const bright = (sx, sy) => ev(([x, y]) => { const c = document.querySelector('canvas').getContext('2d'); return Math.max(...[[0, 0], [10, 0], [-10, 0], [0, 10], [0, -10]].map(([dx, dy]) => { const d = c.getImageData(x + dx, y + dy, 1, 1).data; return d[0] + d[1] + d[2]; })); }, [sx, sy]);
const phase = (name, ms) => until(new Function('return window.game.runner && window.game.runner.phase === ' + JSON.stringify(name)), ms);
try {
  // 1) 벚꽃 숲 9 달리기 끝 자리 → 왼쪽 끝 문 → 벚꽃 숲 10 동쪽 끝(혼자, 브금 sakura) → 동쪽 문으로 되돌아가면 벚꽃 숲 9 서쪽 끝
  await page.goto('http://localhost:8000/?qa=jjajang_sakura9');
  check(await until(() => window.game?.mapId === 'jjajang_sakura9' && !window.game.transitioning, 30000), '벚꽃 숲 9 QA');
  await page.evaluate(() => window.game.changeMap('jjajang_sakura9', 'end'));
  await page.waitForFunction(() => window.game.mapId === 'jjajang_sakura9' && !window.game.transitioning, null, { timeout: 12000 }); await page.waitForTimeout(300);
  check(await go('ArrowLeft', "g.mapId === 'jjajang_sakura10'", 15000, true), '벚꽃 숲 9 왼쪽 끝 문 → 벚꽃 숲 10');
  await page.waitForFunction(() => !window.game.transitioning, null, { timeout: 10000 }); await page.waitForTimeout(400);
  let s = await st(); check(s.map === 'jjajang_sakura10' && s.px > 4900 && s.bgm === 'sakura' && s.party.length === 0, `10: 동쪽 끝·혼자·브금 sakura ${JSON.stringify([s.px, s.py, s.bgm])}`); await cap('00_enter');
  check(await go('ArrowRight', "g.mapId === 'jjajang_sakura9'", 8000, true), '동쪽 문 → 벚꽃 숲 9 서쪽 끝(되돌아가기)');
  await page.waitForFunction(() => !window.game.transitioning, null, { timeout: 10000 }); s = await st(); check(s.px < 100, `9 서쪽 끝 (${s.px})`);
  // 2) 토리이 앞 → 왼쪽으로 지나면 달린다(장애물 없음, 물 없음)
  await page.evaluate(() => window.game.changeMap('jjajang_sakura10', 'torii'));
  await page.waitForFunction(() => window.game.mapId === 'jjajang_sakura10' && !window.game.transitioning, null, { timeout: 12000 }); await page.waitForTimeout(300);
  await cap('01_torii');
  const t0 = Date.now();
  check(await go('ArrowLeft', '!!g.runner', 8000), '파란 토리이 → 달리기 시작');
  await page.waitForTimeout(1500); s = await st();
  check(s.runner && s.runner.dir === -1 && s.runner.water === false && s.runner.obstacles === 'none', `왼쪽으로·물 아님·장애물 없음 ${JSON.stringify(s.runner && [s.runner.phase, s.runner.dir, s.runner.water, s.runner.obstacles])}`);
  await cap('02_run');
  // 3) 10초쯤 달리면 절벽 오르막: 제동 없이 비탈을 달려 오른다
  check(await phase('ramp', 16000), '오르막에 닿음');
  const tRamp = (Date.now() - t0) / 1000; check(tRamp >= 9.5 && tRamp <= 13, `토리이부터 10초쯤 (${tRamp.toFixed(1)}초)`);
  await page.waitForTimeout(200); s = await st(); await cap('03_ramp');
  check(s.runner && s.runner.phase === 'ramp' && s.runner.groundY > 10 && !s.runner.sfx.includes('scrape'), `비탈을 달려 오른다(발 ${s.runner?.groundY}px 위, 제동 소리 없음)`);
  // 4) 꼭대기에서 도약(점프 소리) → 슬로우 6초: 잔상이 허공에 남고 꽃잎이 조금, 주인공은 화면 안
  check(await phase('leap', 3000) || await phase('float', 1000), '도약');
  s = await st(); check(s.runner && s.runner.sfx.includes('jump'), `점프 소리 ${JSON.stringify(s.runner?.sfx.slice(-3))}`);
  check(await phase('float', 2000), '슬로우 시작'); const tFloat = Date.now();
  await page.waitForTimeout(1200); s = await st(); await cap('04_float_1s');
  check(s.runner?.phase === 'float' && s.runner.airY >= 200 && s.runner.trail >= 8, `높이 뜬 채 잔상 (airY ${s.runner?.airY}, 잔상 ${s.runner?.trail})`);
  check(s.runner.feetScreenY >= 60 && s.runner.feetScreenY <= 330 && s.runner.xScreen >= 24 && s.runner.xScreen <= 440, `주인공이 화면 안 (${s.runner.xScreen}, ${s.runner.feetScreenY})`);
  check((s.petalRate ?? 0) >= 40 || s.runner.bits > 0, `꽃잎이 조금 (rate ${s.petalRate}, 조각 ${s.runner.bits})`);
  const air1 = s.runner.airY, px1 = s.px, cam1 = s.cam[0];
  await page.waitForTimeout(3000); s = await st(); await cap('05_float_4s');
  check(s.runner?.phase === 'float' && Math.abs(s.runner.airY - air1) < 60, `4초에도 아직 꼭대기 근처 (${air1} → ${s.runner?.airY})`);
  check(px1 - s.px >= 380 && cam1 - s.cam[0] >= 300, `슬로우 동안 앞으로 쭉 가고 맵이 흐른다 (x ${px1} → ${s.px}, cam ${cam1} → ${s.cam[0]})`);
  // 5) 낙하(보통 속도) → 어둡게 → 벚꽃 숲 11
  check(await phase('fall', 4000), '낙하 시작'); const tFall = (Date.now() - tFloat) / 1000; check(tFall >= 5.5 && tFall <= 7, `슬로우 6초쯤 (${tFall.toFixed(1)}초)`);
  await page.waitForTimeout(350); s = await st(); await cap('06_fall');
  check(!s.runner || s.runner.airY < air1 - 40, `떨어진다 (${s.runner?.airY})`);
  check(await until(() => window.game.mapId === 'jjajang_sakura11', 8000), '→ 벚꽃 숲 11 나무 정상');
  await page.waitForFunction(() => !window.game.transitioning, null, { timeout: 10000 });
  const dropSeen = await until(() => window.game.mapId === 'jjajang_sakura11' && (window.game.player.hopY || 0) > 40, 4000);
  check(dropSeen, '위에서 떨어져 내려온다'); if (dropSeen) { await page.waitForTimeout(250); await cap('07_drop'); }
  check(await until(() => !window.game.dialogue.running && (window.game.player.hopY || 0) === 0, 8000), '착지·조작 복귀');
  await page.waitForTimeout(400); s = await st(); await cap('08_landing');
  const L = await ev(() => window.game.map.def.spawns.landing);
  check(s.map === 'jjajang_sakura11' && s.visible && s.hopY === 0 && !s.locked && !s.runner && s.bgm === 'sakura' && Math.abs(s.px - L.x) < 4 && Math.abs(s.py - L.y) < 4, `나무 정상 가운데에 서 있다 ${JSON.stringify([s.px, s.py, s.hopY, s.locked, s.bgm])}`);
  const lit = await bright(640, 450); check(lit > 90, `화면이 밝다(어둠 막 걷힘, ${lit})`);
  check(await go('ArrowRight', `g.player.x > ${L.x + 40}`, 5000), '걸을 수 있다'); await cap('09_walk');
  // 6) 위쪽 길 → 문 → 벚꽃 숲 12 제단: 브금 꺼짐, 가운데 그루터기 위 어둠의 짜장면이 보라 오라를 두르고 맥동 → 아래 문으로 되돌아오면 브금 sakura
  await page.evaluate(() => { const g = window.game; g.player.x = g.map.def.spawns.from_north.x; });
  // 위쪽 길 위 끝 띠에서 sakura 가 꺼지고(hush) → 문 → 벚꽃 숲 12 는 shop3(사용자 지정)
  check(await go('ArrowUp', 'g.player.y < 90', 12000, true), '위쪽 길 위 끝(hush 띠 안, 문 앞)');
  check(await until(() => window.game.sound.bgmName === null, 3000), '위에 길로 가면 브금 꺼짐');
  check(await go('ArrowUp', "g.mapId === 'jjajang_sakura12'", 12000, true), '위쪽 길 끝 문 → 벚꽃 숲 12');
  await page.waitForFunction(() => !window.game.transitioning, null, { timeout: 10000 }); await page.waitForTimeout(700);
  s = await st(); check(s.map === 'jjajang_sakura12' && s.bgm === 'shop3' && s.party.length === 0, `12: 브금 shop3·혼자 ${JSON.stringify([s.bgm, s.px, s.py])}`);
  const altar = await ev(() => { const g = window.game; const a = g.entities.find(e => e.id === 'sakura12_altar'), b = g.entities.find(e => e.id === 'sakura12_dark_jjajang'); return a && b ? { ax: Math.round(a.x), ay: Math.round(a.y), bx: Math.round(b.def.ix), by: Math.round(b.def.iy), bw: b.iw, bh: b.ih, aura: !!b.def.aura, visible: b.visible !== false && a.visible !== false } : null; });
  check(altar && altar.aura && altar.visible, `그루터기 제단 위 어둠의 짜장면(오라) ${JSON.stringify(altar)}`);
  check(await go('ArrowUp', 'g.player.y < 300', 8000), '제단 앞까지 올라간다');
  await page.waitForTimeout(300); await cap('11_altar');
  // 오라 맥동: 그릇 옆(오른쪽 14px) 화면 픽셀의 보라 밝기가 시간에 따라 변한다
  const auraAt = async () => ev(([bx, by]) => { const g = window.game; const c = document.querySelector('canvas').getContext('2d'); const sx = Math.round((bx - g.camera.x) * 2), sy = Math.round((by - g.camera.y) * 2); const d = c.getImageData(sx, sy, 1, 1).data; return d[0] + d[2]; }, [altar.bx + altar.bw + 14, altar.by + altar.bh - 4]);
  const samples = []; for (let i = 0; i < 12; i++) { samples.push(await auraAt()); await page.waitForTimeout(140); }
  check(Math.max(...samples) >= 60 && Math.max(...samples) - Math.min(...samples) >= 10, `보라 오라가 맥동한다 (${Math.min(...samples)}~${Math.max(...samples)})`);
  check(await go('ArrowUp', 'false', 700) === false && (await st()).py > 190, '제단은 막혀 있다');
  // 7) 제단(짜장면)에 C → 원문 대사 → 획득 → (이후에) → 눈을 감는다 → 어두워졌다 밝아지고 조작 복귀(BUILD288)
  const next = async () => { await until(() => window.game.textbox.state === 'waiting', 8000); await page.keyboard.down('KeyC'); await page.waitForTimeout(60); await page.keyboard.up('KeyC'); };
  const line = () => ev(() => { const g = window.game; return { text: g.textbox.node?.text || null, speaker: g.textbox.node?.speaker || null, running: g.dialogue.running }; });
  const advanceTo = async (needle, ms = 40000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const l = await line(); if (l.text && l.text.includes(needle)) return l; if (l.text) await next(); await page.waitForTimeout(80); } return null; };
  await page.keyboard.down('KeyC'); await page.waitForTimeout(60); await page.keyboard.up('KeyC');
  let l = await advanceTo('안녕하세요', 5000); check(!!l && l.speaker === '짜장면', '짜장면: 안녕하세요'); await page.waitForTimeout(200); await cap('13_hello');
  await next(); check(await until(() => window.game.player.emote?.kind === '!', 3000), '요플래 느낌표');
  l = await advanceTo('프하하'); check(!!l, '짜장면: 왜요 짜장면이 말하면 안되는건가요? 프하하');
  l = await advanceTo('가재맨이요'); check(!!l, '짜장면: 네? 가재맨이요? 전 그런거 몰라요~');
  l = await advanceTo('이번 한번만이에요'); check(!!l, '짜장면: 흥. 이번 한번만이에요'); await next();
  l = await advanceTo('획득했다'); const got = await ev(() => ({ inv: window.game.inventory.includes('어둠의 짜장면'), bowl: !!window.game.entities.find(e => e.id === 'sakura12_dark_jjajang' && !e.dead), flag: !!window.game.flags.dark_jjajang_taken }));
  check(!!l && got.inv && !got.bowl && got.flag, `짜장면을 획득했다 (아이템·그릇 사라짐·플래그) ${JSON.stringify(got)}`); await cap('14_got');
  l = await advanceTo('어떻게 나가실거에요'); check(!!l && l.speaker === '짜장면', '짜장면: 근데 여기서 어떻게 나가실거에요?');
  l = await advanceTo('아 맞다'); check(!!l && !l.speaker, '나레이션: 아 맞다.');
  l = await advanceTo('나는 눈을 감는다'); check(!!l && !l.speaker, '나레이션: 나는 눈을 감는다.'); await next();
  check(await until(() => (window.game.fade?.alpha ?? window.game.fade?.value ?? 0) > 0.9, 4000), '눈을 감는다 → 어두워짐'); await cap('15_eyes');
  check(await until(() => window.game.mapId === 'jjajang_night_cliff' && window.game.flags.sakura12_eyes_closed, 15000), '눈을 감은 뒤 밤 절벽으로 전환');
  l = await advanceTo('아 씨발년 이럴줄알았어', 90000);
  check(!!l && l.speaker === '경섭', '밤 절벽 도주 뒤 경섭 마지막 대사'); await next();
  check(await until(() => window.game.mapId === 'jjajang_sakura12' && !window.game.dialogue.running && window.game.flags.night_cliff_scene_done, 10000), '밤 절벽 종료 뒤 제단 조작 복귀');
  await page.waitForTimeout(400); check((await bright(640, 450)) > 60, '제단 복귀 페이드인'); await cap('16_after_scene');
  const again = await ev(() => { const g = window.game; return { altar: !!g.entities.find(e => e.id === 'sakura12_altar' && !e.dead), count: g.inventory.filter(n => n === '어둠의 짜장면').length }; });
  check(again.altar && again.count === 1, `제단은 남고 짜장면은 하나 ${JSON.stringify(again)}`);
  await page.keyboard.down('KeyC'); await page.waitForTimeout(60); await page.keyboard.up('KeyC'); await page.waitForTimeout(700);
  const twice = await ev(() => ({ running: window.game.dialogue.running, text: window.game.textbox.node?.text || null, count: window.game.inventory.filter(n => n === '어둠의 짜장면').length }));
  check(!twice.running && !twice.text && twice.count === 1, `다시 C 를 눌러도 연출 반복·중복 획득 없음 ${JSON.stringify(twice)}`);
  check(await go('ArrowDown', "g.mapId === 'jjajang_sakura11'", 12000, true), '아래 문 → 벚꽃 숲 11');
  await page.waitForFunction(() => !window.game.transitioning, null, { timeout: 10000 }); await page.waitForTimeout(800);
  s = await st(); check(s.map === 'jjajang_sakura11' && s.py < 140 && s.py > 96, `되돌아오면 위쪽 길, hush 띠 아래 (${s.py})`);
  check(await until(() => window.game.sound.bgmName === 'sakura', 3000), '돌아오면 sakura');
  check(await go('ArrowDown', 'g.player.y > 200', 8000, true), '바닥으로 내려온다');
  check((await st()).bgm === 'sakura', '내려와도 sakura'); await cap('12_back');
  check(await go('ArrowUp', 'g.player.y < 90', 8000, true) && await until(() => window.game.sound.bgmName === null, 3000), '다시 올라가면 hush 띠에서 브금 꺼짐');
  // 6) QA 재입장: 바로 서 있다
  await page.goto('http://localhost:8000/?qa=jjajang_sakura11');
  check(await until(() => window.game?.mapId === 'jjajang_sakura11' && !window.game.transitioning, 30000), 'QA 벚꽃 숲 11');
  await page.waitForTimeout(500); s = await st(); check(s.visible && s.hopY === 0 && s.bgm === 'sakura', `QA 재입장 정상 ${JSON.stringify([s.hopY, s.bgm])}`); await cap('10_qa');
  // 8) 얻은 뒤 QA: 그릇 없음, 말 없는 그루터기, 아이템은 플래그로 유도
  await page.goto('http://localhost:8000/?qa=jjajang_sakura12_after');
  check(await until(() => window.game?.mapId === 'jjajang_sakura12' && !window.game.transitioning, 30000), 'QA 짜장면 얻은 뒤');
  await page.waitForTimeout(500); const after = await ev(() => { const g = window.game; return { bowl: !!g.entities.find(e => e.id === 'sakura12_dark_jjajang' && !e.dead), altar: !!g.entities.find(e => e.id === 'sakura12_altar' && !e.dead), inv: g.inventory.filter(n => n === '어둠의 짜장면').length, bgm: g.sound.bgmName }; });
  check(!after.bowl && after.altar && after.inv === 1 && after.bgm === 'shop3', `얻은 뒤: 그릇 없음·그루터기 그대로·아이템 하나 ${JSON.stringify(after)}`); await cap('17_after_qa');
  await page.evaluate(() => { const g = window.game; g.player.x = g.map.def.spawns.from_south.x; }); await go('ArrowUp', 'g.player.y < 300', 8000); await go('ArrowUp', 'false', 900);
  await page.keyboard.down('KeyC'); await page.waitForTimeout(60); await page.keyboard.up('KeyC'); await page.waitForTimeout(700);
  check(!(await ev(() => window.game.dialogue.running)), '얻은 뒤 재진입해서 C 를 눌러도 아무 일 없음');
} catch (e) { fails += 1; console.log('FAIL exception', e.stack || e.message); }
if (errors.length) { fails += 1; console.log('FAIL console/page errors', errors.slice(0, 5).join(' | ')); }
console.log(`=== total fails=${fails}`);
await browser.close(); process.exit(fails ? 1 : 0);
