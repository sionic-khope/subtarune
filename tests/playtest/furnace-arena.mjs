// 용광로 마나샘 갈림길·광장(BUILD196): QA youngcle17 → 오른쪽 → 위 통로 → 위 출입구 → youngcle18 도착 연출(브금 꺼짐 → 느낌표 → TV 내려옴·켜짐·영클 브금 → 철창 덜렁·흔들림 → TV 철창 옆 → 쥰희 발차기 → 규칙 → TV 오른쪽 대기 → 조작 복귀).
//   대사는 C 로 넘기며 원문 몇 줄과 순서를 확인하고 장면마다 프레임을 찍는다. 실행: tests/playtest/run.sh furnace-arena
import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright-core';
const shots = process.env.SHOT_DIR; fs.mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = []; page.on('pageerror', e => errors.push(e.message));
let fails = 0;
const check = (ok, msg) => { if (!ok) { fails += 1; console.log('FAIL', msg); } else console.log('ok', msg); };
const cap = async n => { await page.screenshot({ path: path.join(shots, 'arena_' + n + '.png') }); };
const pressC = async () => { await page.keyboard.press('KeyC'); await page.waitForTimeout(200); };
const key = () => page.evaluate(() => `${window.game.dialogue.i}:${window.game.textbox.node?.text ?? ''}`);
const advance = async () => { const before = await key(); for (let i = 0; i < 4; i++) { await pressC(); const now = await key(); const running = await page.evaluate(() => window.game.dialogue.running); if (now !== before || !running) return; } };
const st = () => page.evaluate(() => { const g = window.game; const e = id => g.entities.find(x => x.id === id && !x.dead); const tv = e('youngcle_tv'), cage = e('lava_cage'), j = e('arena_junhee');
  const tb = g.tvBroadcast; return { map: g.mapId, dialogue: g.dialogue.running, text: g.textbox.node?.text?.slice(0, 60), px: Math.round(g.player.x), py: Math.round(g.player.y), camx: Math.round(g.camera.x), camy: Math.round(g.camera.y),
    tv: tv ? { x: Math.round(tv.x), y: Math.round(tv.y), phase: tb?.phase, expr: tb?.expression, fold: Math.round((tv.def.foldX ?? 1) * 100) / 100, arm: (() => { const a = e('youngcle_tv_arm'); return a ? Math.round(a.y + 320 - tv.y) : null; })() } : null, cage: cage ? { x: Math.round(cage.x), y: Math.round(cage.y), visible: cage.visible, sway: !!cage.def.oscillate } : null, junhee: j ? { visible: j.visible, facing: j.facing, x: Math.round(j.x), y: Math.round(j.y) } : null,
    bgm: JSON.stringify([g.sound.bgmName, g.sound.currentBgm, g.sound.bgmId]), flag: !!g.flags.furnace_arena_intro_done }; });
const inView = (s, r) => r.x + r.w > s.camx && r.x < s.camx + 480 && r.y + r.h > s.camy && r.y < s.camy + 360;
const untilText = async (needle, max = 40) => { for (let i = 0; i < max; i++) { const s = await st(); if ((s.text || '').includes(needle)) return s; if (!s.dialogue) return null; await advance(); } return null; };
try {
  // ① 갈림길: 오른쪽 → 가운데 위. 마나샘이 있고 위 출입구로 광장
  await page.goto('http://localhost:8000/?qa=youngcle17');
  await page.waitForFunction(() => window.game && window.game.mapId === 'youngcle17' && !window.game.dialogue.running, null, { timeout: 25000 });
  await page.waitForTimeout(600); await cap('junction');
  const spring = await page.evaluate(() => { const g = window.game; const s = g.entities.find(e => e.id === 'youngcle17_spring'); return { spring: !!s, script: s?.def.script, bgm: JSON.stringify([g.sound.bgmName, g.sound.currentBgm, g.sound.bgmId]).includes('pandora_palace') }; });
  check(spring.spring && spring.script === 'maillard_spring' && spring.bgm, '갈림길: 마나샘·Pandora Palace ' + JSON.stringify(spring));
  await page.keyboard.down('ArrowRight'); await page.waitForFunction(() => window.game.player.x >= 320, null, { timeout: 8000 }).catch(() => {}); await page.keyboard.up('ArrowRight');
  await page.keyboard.down('ArrowUp'); await page.waitForFunction(() => window.game.mapId === 'youngcle18', null, { timeout: 12000 }).catch(() => {}); await page.keyboard.up('ArrowUp');
  let s = await st(); check(s.map === 'youngcle18', '오른쪽 → 가운데 위 통로 끝까지 걸어 광장으로 ' + JSON.stringify([s.map, s.px, s.py]));
  // 효과음 기록(느낌표 띠링 확인용 — 사용자 “느낌표에 왜 자꾸 소리 안 내냐”)
  await page.evaluate(() => { const snd = window.game.sound; window.__sfx = []; const orig = snd.sfx.bind(snd); snd.sfx = (name, opts) => { window.__sfx.push(name); return orig(name, opts); }; });
  // ② 도착 연출: 브금 꺼짐, 천천히 들어오고 느낌표
  await page.waitForFunction(() => window.game.dialogue.running, null, { timeout: 8000 }).catch(() => {});
  // 걸어 들어오는 길에 대각선이 없어야 한다(사용자 “왜 대각선으로 한번 갔다가 위로 가냐”): 7초 동안 셋의 자리를 50ms 마다 기록해 매 구간이 한 축으로만 움직였는지 본다
  await page.evaluate(() => { window.__walk = []; const g = window.game; const ids = ['player', 'gyeongsub', 'ppaman']; const rec = () => window.__walk.push(ids.map(id => { const e = id === 'player' ? g.player : g.entities.find(x => x.id === id); return [Math.round(e.x), Math.round(e.y), e.facing]; })); rec(); window.__walkTimer = setInterval(rec, 50); setTimeout(() => clearInterval(window.__walkTimer), 7000); });
  await page.waitForTimeout(1800); await cap('enter'); s = await st();
  await page.waitForTimeout(5400); await cap('walk_done');
  const walk = await page.evaluate(() => window.__walk);
  const leg1 = walk.filter(f => f[0][1] > 376);
  check(leg1.length > 10 && leg1.every(f => f[0][0] === 484 && f[0][2] === 'up' && f[1][0] === 484 && f[2][0] === 484), '가운데 문에서 한 줄로 곧장 위로 걸어 들어온다(x 484 그대로, 위를 보며) ' + JSON.stringify([leg1.length, leg1[Math.floor(leg1.length / 2)]]));
  const dirSeq = m => walk.map(f => f[m][2]).filter((d, k, arr) => k === 0 || d !== arr[k - 1]).join('>');
  check(dirSeq(0) === 'up>left>up' && dirSeq(1) === 'up>left>up' && dirSeq(2) === 'up>left>up', '앞으로 → 옆으로 → 앞으로(셋 다 위>왼쪽>위) ' + JSON.stringify([dirSeq(0), dirSeq(1), dirSeq(2)]));
  const diag = []; for (let k = 1; k < walk.length; k++) for (let m = 0; m < 3; m++) { const a = walk[k - 1][m], b = walk[k][m]; if (a[2] === b[2] && Math.abs(a[0] - b[0]) >= 1 && Math.abs(a[1] - b[1]) >= 1) diag.push([k, m, a, b]); }   // 같은 방향을 본 채 두 축이 같이 움직이면 대각선(모퉁이에서 방향이 바뀌는 한 표본은 제외)
  check(walk.length > 100 && diag.length === 0, '입장 걸음 ' + walk.length + '표본: 대각선 구간 0 ' + JSON.stringify(diag.slice(0, 3)));
  const rowEnd = walk[walk.length - 1];
  check(rowEnd[0][0] === 356 && rowEnd[1][0] === 312 && rowEnd[2][0] === 400 && rowEnd.every(p => p[1] === 288 && p[2] === 'up'), '울타리 3번 칸 앞 한 줄(경섭·형섭·빠맨)로 서서 위를 본다 ' + JSON.stringify(rowEnd));
  check(s.dialogue && !s.bgm.includes('pandora') && !s.bgm.includes('storage_show'), '연출 시작: 브금 꺼짐 ' + s.bgm);
  s = await untilText('무섭네요'); check(!!s, '억빠맨 “와 ㅈㄴ 무섭네요”');
  const chimes = await page.evaluate(() => window.__sfx.filter(n => n === 'chime').length);
  check(chimes === 1, '느낌표(셋 동시)에 띠링 한 번 ' + JSON.stringify(chimes));
  s = await untilText('후후후'); check(!!s, '영클 “후후후”'); await advance();
  // TV 가 내려온다(1.2초 뒤 중간 프레임) → 켜짐 → 영클 브금
  // 느낌표·카메라 뒤 TV 가 내려오기 시작한다 — 화면에 반쯤 들어온 순간을 잡는다
  await page.waitForFunction(() => { const tv = window.game.entities.find(e => e.id === 'youngcle_tv'); return tv && tv.y > -60 && tv.y < 100; }, null, { timeout: 8000 }).catch(() => {});
  await cap('tv_down'); s = await st();
  check(s.tv && s.tv.y > -60 && s.tv.y < 110 && s.tv.fold < 0.5 && s.tv.arm === 22 && inView(s, { x: s.tv.x, y: s.tv.y, w: 236, h: 144 }), 'TV 가 접힌 채 모니터암(프레임에 붙음)을 타고 내려오는 중(화면 안) ' + JSON.stringify([s.tv, s.camy]));
  s = await untilText('반갑노'); check(!!s && s.tv.phase === 'on' && s.tv.expr === 'greet' && s.tv.fold === 1 && s.tv.x === 250 && s.tv.y === 100 && s.bgm.includes('storage_show') && s.camx >= 100 && s.camx <= 160, 'TV 가 일행 앞·화면 가운데(카메라 x368)에서 펼쳐져 켜지고 “반갑노 게이들아”(인사) + 영클 브금(카메라 가운데) ' + JSON.stringify([s?.tv, s?.bgm]));
  await cap('greet');
  s = await untilText('이걸 보시라'); check(!!s, '“먼저 이걸 보시라!”'); await advance();
  // 철창이 덜렁 내려와 흔들린다(카메라 위)
  await page.waitForTimeout(1900); await cap('cage'); s = await st();
  check(s.cage && s.cage.visible && s.cage.y > -130 && s.cage.y < -100 && s.cage.sway && s.junhee.visible && inView(s, { x: s.cage.x, y: s.cage.y + 200, w: 136, h: 160 }) && s.cage.x + 136 > s.camx + 300, '밧줄 철창(쥰희·용준)이 화면 오른쪽 위에서 내려와 매달려 흔들린다 ' + JSON.stringify([s.cage, s.junhee, s.camx, s.camy]));
  const swayX = await page.evaluate(() => new Promise(resolve => { const g = window.game; const j = g.entities.find(x => x.id === 'arena_junhee'), c = g.entities.find(x => x.id === 'lava_cage'); const xs = [], ds = []; const t0 = performance.now(); const tick = () => { xs.push(Math.round(j.x)); ds.push(Math.round(j.x - c.x)); if (performance.now() - t0 > 1500) resolve({ min: Math.min(...xs), max: Math.max(...xs), dmin: Math.min(...ds), dmax: Math.max(...ds) }); else requestAnimationFrame(tick); }; tick(); }));
  check(swayX.max - swayX.min >= 8 && swayX.dmax - swayX.dmin <= 1, '쥰희·용준이 철창 움직임에 맞춰 좌우로 데롱데롱(철창과 같은 폭으로) ' + JSON.stringify(swayX));
  s = await untilText('살려줘 씨발'); check(!!s, '쥰희 “살려줘 씨발”');
  s = await untilText('살려줘요홍홍'); check(!!s && s.tv.x === 316 && s.tv.y === 44 && s.tv.x + 236 <= s.cage.x + 12 && s.camx > 280 && s.tv.phase === 'on' && s.tv.expr === 'taunt' && s.tv.fold === 1, 'TV 가 철창 왼쪽 옆으로 내려와 펼쳐져 조롱(철창을 가리지 않음) ' + JSON.stringify([s?.tv, s?.cage])); await cap('tv_beside_cage');
  s = await untilText('좆같은 영클'); check(!!s, '쥰희 “이 좆같은 영클”'); await advance(); await page.waitForTimeout(500); s = await st();
  check(s.junhee && s.junhee.facing === 'left', '쥰희가 왼쪽(TV)을 보며 철창을 찬다 ' + JSON.stringify(s.junhee)); await cap('kick');
  s = await untilText('느금마'); check(!!s, '쥰희 “느금마”');
  s = await untilText('조작 패널이 보이는가'); check(!!s && s.tv.x === 250 && s.tv.y === 100 && s.tv.fold === 1 && s.camx >= 100 && s.camx <= 160, 'TV 가 접혔다 일행 앞으로 다시 내려와 규칙 설명(카메라 가운데) ' + JSON.stringify([s?.tv, s?.camx])); await cap('rules');
  s = await untilText('밧줄은 내려갈거고'); check(!!s, '“저 밧줄은 내려갈거고”'); await advance(); await page.waitForTimeout(700); s = await st(); check(s.camy < 60, '밧줄로 카메라 이동 ' + s.camy);
  s = await untilText('오홍홍홍'); check(!!s, '“패널을 잡으렴 게이들아 오홍홍홍”');
  for (let i = 0; i < 30; i++) { s = await st(); if (!s.dialogue) break; await advance(); }
  await page.waitForFunction(() => !window.game.dialogue.running && window.game.flags.furnace_arena_intro_done, null, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(800); await cap('end'); s = await st();
  const overlap = s.tv && s.cage && s.tv.x < s.cage.x + 136 && s.tv.x + 236 > s.cage.x && s.tv.y < s.cage.y + 360 && s.tv.y + 144 > s.cage.y + 200;
  check(!s.dialogue && s.flag && s.tv.phase === 'on' && s.tv.expr === 'smirk' && s.tv.x === 704 && !overlap && s.cage.visible && s.bgm.includes('storage_show'), '연출 끝: TV 는 오른쪽 끝에서 팔짱 끼고 켜진 채 대기(철창을 가리지 않음), 철창 그대로, 영클 브금, 조작 복귀 ' + JSON.stringify([s.flag, s.tv, s.cage.visible, overlap]));
  // 대기 중인 TV 앞(아래)으로 걸어가도 캐릭터가 TV 에 가려지지 않는다(그리기 순서: TV 는 아랫변 기준, 캐릭터 발이 더 아래면 앞에 그림 — 사용자 “거기로 가면 캐릭터들 위로 티비가 올라가서 가려짐”)
  await page.evaluate(() => { const g = window.game; g.player.x = 740; g.player.y = 266; g.player.facing = 'up'; });
  await page.waitForTimeout(500); await cap('under_tv');
  const order = await page.evaluate(() => { const g = window.game; const tv = g.entities.find(e => e.id === 'youngcle_tv'); const key = e => (e.def?.sortY ?? (e.y + e.h)); return { tv: key(tv), player: key(g.player), tvBottom: tv.y + tv.h, py: g.player.y }; });
  check(order.player > order.tv, 'TV 아래로 걸어가면 캐릭터가 TV 앞에 그려진다 ' + JSON.stringify(order));
  // ③ 재입장(QA youngcle18_after): 철창·TV 유지
  await page.goto('http://localhost:8000/?qa=youngcle18_after');
  await page.waitForFunction(() => window.game && window.game.mapId === 'youngcle18' && !window.game.dialogue.running, null, { timeout: 25000 });
  await page.waitForTimeout(800); s = await st(); await cap('after');
  check(s.cage.visible && s.junhee.visible && s.tv.phase === 'on' && s.bgm.includes('storage_show'), '연출 뒤 재입장: 철창·쥰희·용준·TV 그대로 ' + JSON.stringify([s.cage, s.tv]));
} catch (e) { fails += 1; console.log('CRASH', e.message); }
check(errors.length === 0, 'pageerror 없음 ' + JSON.stringify(errors));
console.log(`fails=${fails}`);
await browser.close();
