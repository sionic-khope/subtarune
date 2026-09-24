// 색깔 기억 게임(BUILD198): QA furnace_color → 1인칭 씬(TV 내려옴 → 튜토리얼 대사 → 시작 → 1판 RED 호출 → 마우스로 빨강 → 통과·철창 복귀 → 틀림 → C 다시 → 시간 초과(철창 내려감)
//   → 8판 광기: 보통 호출 → 버벅·웃음 → 꺼짐(카메라) → 폭주 → 느낌표 버튼 → 클릭 → 폭발·영클 대사 → 철창 날아감 → 씬 끝) → 광장 복귀 연출(철창 낙하 폭발·둘 탈출·TV 가운데·대사 → 다리 철컥·울타리 사라짐·둘이 뛰쳐 나감) → 아래 문으로 나갔다 와서 재입장 상태.
// 실행: tests/playtest/run.sh color-game
import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright-core';
import { escToTitle } from './lib/esc.mjs';
const shots = process.env.SHOT_DIR; fs.mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = []; page.on('pageerror', e => errors.push(e.message));
let fails = 0;
const check = (ok, msg) => { if (!ok) { fails += 1; console.log('FAIL', msg); } else console.log('ok', msg); };
const cap = async n => { await page.screenshot({ path: path.join(shots, 'color_' + n + '.png') }); };
const pressC = async () => { await page.keyboard.press('KeyC'); await page.waitForTimeout(160); };
const st = () => page.evaluate(() => { const c = window.__colorgame; if (!c) return null; const s = c.state, r = s.round; return { phase: s.phase, stage: s.stage, tvY: Math.round(s.tvY), tvOn: s.tvOn, screen: s.screen.kind, screenId: s.screen.id || null, face: s.face, talk: s.talk ? { i: s.talk.i, n: s.talk.lines.length, text: s.talk.lines[s.talk.i].text, who: s.talk.lines[s.talk.i].who } : null, round: r ? { status: r.status, i: r.i, n: r.expected.length, chaos: r.chaos, gap: r.gap, t: Math.round(r.t * 100) / 100, loops: r.loops, speed: r.speed, wrongs: r.wrongs, expected: r.expected } : null, over: s.over, go: s.go > 0, active: s.active, btnDown: s.buttons.map(b => b.down > 0), sunk: !!s.cage.sunk, splashed: !!s.cage.splashed, cageY: c.cageRect().y, cageDrop: Math.round(s.cage.drop * 100) / 100, cageFly: Math.round(s.cage.fly), camOn: s.camOn, camAlpha: Math.round(s.camAlpha * 100) / 100, camReady: c.cam.ready, camFrame: c.cam.frame, white: Math.round(s.white * 100) / 100, confirm: c.confirm ? c.confirm.sel : null, hiss: c.hiss, rampage: s.rampage, chaosPhase: c.chaosPhase(), bang: c.bangPos(), blasting: s.blasting, blasts: s.blasts.length, hand: s.mouse.inside, press: s.hand.press > 0 }; });
const g = () => page.evaluate(() => { const g = window.game; const e = id => g.entities.find(x => x.id === id && !x.dead); const tv = e('youngcle_tv'), cage = e('lava_cage'), j = e('arena_junhee'), y = e('arena_yongjun');
  return { map: g.mapId, dialogue: g.dialogue.running, text: g.textbox.node?.text?.slice(0, 50), px: Math.round(g.player.x), py: Math.round(g.player.y), camx: Math.round(g.camera.x), camy: Math.round(g.camera.y),
    tv: tv ? { x: Math.round(tv.x), y: Math.round(tv.y), phase: g.tvBroadcast?.phase, expr: g.tvBroadcast?.expression } : null, cage: cage ? { x: Math.round(cage.x), y: Math.round(cage.y), visible: cage.visible } : null,
    junhee: j ? { visible: j.visible, x: Math.round(j.x), y: Math.round(j.y), facing: j.facing } : null, yongjun: y ? { visible: y.visible, x: Math.round(y.x), y: Math.round(y.y) } : null,
    bgm: JSON.stringify([g.sound.bgmName, g.sound.currentBgm, g.sound.bgmId]), flags: { color: !!g.flags.furnace_color_done, after: !!g.flags.furnace_aftermath_done }, scene3d: g.scene3d }; });
const advance = async () => { const before = await page.evaluate(() => `${window.game.dialogue.i}:${window.game.textbox.node?.text ?? ''}`); for (let i = 0; i < 4; i++) { await pressC(); const now = await page.evaluate(() => `${window.game.dialogue.i}:${window.game.textbox.node?.text ?? ''}`); if (now !== before || !(await page.evaluate(() => window.game.dialogue.running))) return; } };
const untilText = async (needle, max = 30) => { for (let i = 0; i < max; i++) { const s = await g(); if ((s.text || '').includes(needle)) return s; if (!s.dialogue) return null; await advance(); } return null; };
// 오버레이(480×360) 좌표 → 브라우저 좌표
const css = (x, y) => page.evaluate(([x, y]) => { const r = document.getElementById('colorgame').getBoundingClientRect(); return { x: r.left + x * r.width / 480, y: r.top + y * r.height / 360 }; }, [x, y]);
const clickColor = async (id) => { const r = await page.evaluate((id) => { const c = window.__colorgame; const i = ['red', 'orange', 'yellow', 'green', 'blue', 'navy', 'purple'].indexOf(id); return c.buttonRect(i); }, id); const p = await css(r.x + r.w / 2, r.y + r.h / 2); await page.mouse.move(p.x, p.y); await page.waitForTimeout(60); await page.mouse.click(p.x, p.y); await page.waitForTimeout(120); };
const RULES_CALL = 1.2;
const waitPhase = (phase, timeout = 8000) => page.waitForFunction((p) => window.__colorgame && window.__colorgame.state.phase === p, phase, { timeout }).then(() => true).catch(() => false);
try {
  await page.goto('http://localhost:8000/?qa=furnace_color');
  await page.waitForFunction(() => !!window.__colorgame, null, { timeout: 25000 });
  // ⓪ Esc → “바탕화면으로 돌아가시겠습니까?” 예/아니오(사용자): 기본은 아니오, 왼쪽으로 예 → C 로 나가면 씬이 끝나고 맵 브금 복귀. 그 뒤 다시 들어와 이어서 검사
  await page.waitForTimeout(600); await escToTitle(page); await page.waitForTimeout(150); let s = await st(); await cap('quit_confirm');
  check(s.confirm === 1, 'Esc → 확인 상자(기본 아니오) ' + JSON.stringify(s.confirm));
  const tvBefore = s.tvY; await page.waitForTimeout(400); s = await st();
  check(s.confirm === 1 && s.tvY === tvBefore, '상자가 열린 동안 게임이 멈춘다(TV 안 내려옴) ' + JSON.stringify([s.tvY, tvBefore]));
  await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(100); s = await st(); check(s.confirm === 0, '← 로 예 선택');
  await pressC(); await page.waitForFunction(() => !window.__colorgame, null, { timeout: 3000 }).catch(() => {});
  await page.waitForFunction(() => !window.game.dialogue.running && !window.game.transitioning, null, { timeout: 5000 }).catch(() => {});
  const quit = await page.evaluate(() => [!window.__colorgame, window.game.mapId, window.game.dialogue.running, !!document.getElementById('colorgame')]);
  check(quit[0] && quit[1] === 'youngcle18' && !quit[2] && !quit[3], '예 → 씬이 끝나 광장으로(오버레이 제거, 조작 복귀) ' + JSON.stringify(quit));
  await page.goto('http://localhost:8000/?qa=furnace_color');
  await page.waitForFunction(() => !!window.__colorgame, null, { timeout: 25000 });
  // ① 페이드인 뒤 TV 가 천천히 내려온다(중간 프레임) — 브금은 멈춤
  await page.waitForFunction(() => { const s = window.__colorgame.state; return s.phase === 'drop' && s.tvY > -150 && s.tvY < -20; }, null, { timeout: 8000 }).catch(() => {});
  await cap('tv_down'); s = await st();
  check(s.phase === 'drop' && s.tvY < 0, 'TV 가 위에서 천천히 내려오는 중 ' + JSON.stringify([s.phase, s.tvY]));
  const bgm = await page.evaluate(() => [window.game.sound.bgmName, !!window.game.sound.paused]);
  check(!bgm[0], '씬 동안 맵 브금 꺼짐(일시정지) ' + JSON.stringify(bgm));
  // ② 켜지며 영클 먼저: 튜토리얼 대사 원문 순서
  check(await waitPhase('talk', 9000), 'TV 켜지고 영클 대사 시작');
  await page.waitForTimeout(500); await cap('intro'); s = await st();
  const lines = await page.evaluate(() => window.__colorgame.state.talk.lines.map(l => l.text));
  check(lines[0] === 'ㅎㅇ' && lines.includes('자 그러면 튜토리얼 따위는 필요없고') && lines.includes('내가 부르는 색깔 그대로 누르면 됨 ㅇㅇ') && lines.includes('제한시간안에, 그를 살려라') && lines.includes('준비~~') && lines[lines.length - 1] === '시작 ~~~!', '튜토리얼 대사 원문 6줄 ' + JSON.stringify(lines));
  check(s.screen === 'face' && s.face === 'greet', 'TV 화면에 영클 그림(greet) ' + JSON.stringify([s.screen, s.face]));
  for (let i = 0; i < 14; i++) { s = await st(); if (!s || s.phase !== 'talk') break; await pressC(); await page.waitForTimeout(60); }
  // ③ ‘시작~~~!’ 뒤 2초 있다가 화면이 꺼지고 1판: RED 호출(화면은 빨강, 가운데 글자)
  check(await waitPhase('countdown', 3000), '시작~~~! 뒤 카운트다운');
  await page.waitForFunction(() => { const s = window.__colorgame.state; return s.phase === 'round' && s.screen.kind === 'color' && s.screen.id === 'red'; }, null, { timeout: 6000 }).catch(() => {});
  await cap('call_red'); s = await st();
  check(s.phase === 'round' && s.stage === 0 && s.screen === 'color' && s.screenId === 'red', '1판: TV 화면이 빨강 + RED 글자 ' + JSON.stringify([s.phase, s.stage, s.screen, s.screenId]));
  // 판 중 Esc: 상자가 뜨고 판 시간이 멈춘다 → X(아니오) 로 닫으면 이어서
  await escToTitle(page); await page.waitForTimeout(120); s = await st(); const tHold = s.round.t; await page.waitForTimeout(400); s = await st();
  check(s.confirm === 1 && s.round.t === tHold, '판 중 Esc → 상자, 판 시간 멈춤 ' + JSON.stringify([s.confirm, tHold, s.round.t]));
  await page.keyboard.press('KeyX'); await page.waitForTimeout(300); s = await st();
  check(s.confirm === null && s.phase === 'round' && s.round.t > tHold, 'X → 닫히고 판이 이어진다 ' + JSON.stringify([s.confirm, s.phase, s.round.t]));
  const voices = await page.evaluate(() => ['color_red', 'color_navy', 'color_ngaita', 'furnace_blast'].map(n => !!window.game.sound.files[n]));
  check(voices.every(Boolean), '로봇 음성·폭발음 파일 로드 ' + JSON.stringify(voices));
  // 호출 중엔 버튼이 꺼져 있어 눌러도 아무 일도 없다(전에 누른 게 무시돼 다음 색이 틀렸다고 나오던 것)
  const early = await page.evaluate(() => { const c = window.__colorgame; const r = c.press('red'); return { r: r.type, down: c.state.buttons[0].down, status: c.round.status, i: c.round.i }; });
  check(early.r === 'ignored' && early.down === 0 && early.i === 0, '호출 중 누른 버튼은 무시되고 내려앉지도 않는다 ' + JSON.stringify(early));
  // ④ 입력 차례: 마지막 색이 꺼지면 바로 GO! 와 함께 버튼이 켜진다. 손이 마우스를 따라오고 빨강을 누르면 통과, 철창은 위로
  await page.waitForFunction(() => window.__colorgame.round && window.__colorgame.round.status === 'answer', null, { timeout: 5000 }).catch(() => {});
  s = await st(); check(s.round.status === 'answer' && s.go && s.round.t < RULES_CALL + 1.0, '마지막 호출 뒤 1초 안에 GO! 입력 차례 ' + JSON.stringify([s.go, s.round.t]));
  await page.waitForTimeout(150); await cap('go');
  const r0 = await page.evaluate(() => window.__colorgame.buttonRect(0)); const p0 = await css(r0.x + r0.w / 2, r0.y + r0.h / 2);
  await page.mouse.move(p0.x - 40, p0.y - 30); await page.waitForTimeout(200); await cap('hand'); s = await st();
  check(s.hand === true, '형섭 손이 마우스를 따라온다 ' + JSON.stringify(s.hand));
  await page.waitForTimeout(900); const dropMid = (await st()).cageDrop;
  await clickColor('red'); s = await st();
  check(s.phase === 'clear' && s.stage === 0, '빨강을 눌러 1판 통과 ' + JSON.stringify([s.phase, s.stage, s.round]));
  check(dropMid > 0.05, '입력 차례 동안 철창이 내려가기 시작했다 ' + JSON.stringify(dropMid));
  await page.waitForTimeout(700); s = await st();
  check(s.cageDrop < dropMid, '통과하면 철창이 다시 위로 ' + JSON.stringify([dropMid, s.cageDrop]));
  await cap('clear');
  // 통과 뒤 준비 쿨다운 2초(사용자 “성공 효과음과 함께 준비시간 2초”): 다음 판 번호를 보여 주고 나서 2판
  check(await waitPhase('ready', 3000), '통과 뒤 준비 쿨다운'); await page.waitForTimeout(300); await cap('ready'); s = await st();
  check(s.phase === 'ready' && s.screen === 'ready' && s.stage === 0, '준비 화면(ROUND 2) ' + JSON.stringify([s.phase, s.screen]));
  // 준비가 2초 가는지는 씬의 시계(phaseT)로 잰다(브라우저 폴링 지연과 무관)
  let readyMax = 0; for (let i = 0; i < 60; i++) { const x = await page.evaluate(() => [window.__colorgame.state.phase, window.__colorgame.state.phaseT]); if (x[0] === 'ready') readyMax = Math.max(readyMax, x[1]); else if (x[0] === 'round') break; await page.waitForTimeout(60); }
  // ⑤ 2판: 틀린 색을 누르면 실패가 아니라 철창이 더 빨리 내려갈 뿐, 맞는 색부터 이어서 통과
  check(await waitPhase('round', 4000), '2판 시작'); s = await st(); check(s.stage === 1 && readyMax >= 1.7, '준비 2초 뒤 2판 ' + JSON.stringify([s.stage, Math.round(readyMax * 100) / 100]));
  await page.evaluate(() => window.__colorgame.answerNow()); await page.waitForTimeout(100);
  const d0 = (await st()).cageDrop;
  await clickColor('blue'); s = await st();
  check(s.phase === 'round' && s.round.status === 'answer' && s.round.speed === 1.5 && s.round.wrongs === 1 && s.round.i === 0, '틀린 색 → 판은 계속, 철창 속도 ×1.5 ' + JSON.stringify([s.phase, s.round]));
  await page.waitForTimeout(600); await cap('wrong'); const d1 = (await st()).cageDrop;
  check(d1 - d0 > 0.6 * 1.5 / 12 * 0.9, '빨라진 철창 ' + JSON.stringify([d0, d1]));
  await clickColor('red'); await clickColor('green'); s = await st();
  check(s.phase === 'clear' && s.stage === 1, '틀린 뒤에도 빨강·초록 순서대로 누르면 통과 ' + JSON.stringify([s.phase, s.stage]));
  // ⑥ 시간 초과(모든 판 12초 동일): 철창이 실시간으로 끝까지 내려가고 → 용암에 풍덩 → TIME OVER + C 재시도 → 그 판부터
  check(await waitPhase('round', 4000), '3판 시작'); s = await st(); check(s.stage === 2 && JSON.stringify(s.round.expected) === '["red","green","yellow"]', '3판 = 2판 + 노랑(이어서 하나 추가) ' + JSON.stringify([s.stage, s.round.expected]));
  await page.evaluate(() => window.__colorgame.answerNow()); await page.waitForTimeout(3000); s = await st();
  check(s.round && s.round.status === 'answer' && s.cageDrop > 0.18 && s.cageDrop < 0.34, '시간에 정비례해 철창이 내려간다(3초/12초) ' + JSON.stringify([s.round?.status, s.cageDrop]));
  await cap('timer');
  check(await waitPhase('plunge', 11000), '시간 초과 → 철창이 용암으로 떨어진다'); const y0 = (await st()).cageY;
  await page.waitForFunction(() => window.__colorgame.state.cage.splashed, null, { timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(120); await cap('plunge'); s = await st();
  check(s.phase === 'plunge' && s.splashed && s.cageY > y0 + 40 && s.over === 'timeout', '풍덩(치이익·불티) 하며 잠기는 중 ' + JSON.stringify([s.phase, s.splashed, y0, s.cageY]));
  check(await waitPhase('fail', 5000), 'TIME OVER + C 재시도'); await page.waitForTimeout(400); await cap('timeover'); s = await st();
  check(s.sunk, '철창이 용암에 잠겨 안 보인다 ' + JSON.stringify(s.sunk));
  await pressC(); await page.waitForTimeout(200); s = await st();
  check(s.phase === 'round' && s.stage === 2 && !s.sunk && s.cageDrop === 0 && s.cageY < 0, 'C → 실패한 3판부터 다시, 철창은 위로 ' + JSON.stringify([s.phase, s.stage, s.sunk, s.cageDrop, s.cageY]));
  // ⑦ 8판(광기): 빨·초·노는 보통처럼 → 파랑에서 버벅(끊긴 호출 + 영클 웃는 화면) → 화면 꺼짐 …(카메라 페이드인) → 폭주(0.3초 간격 반복 + 치이익) → 느낌표는 폭주 4초 뒤
  await page.evaluate(() => window.__colorgame.skipTo(7)); await page.waitForTimeout(600); s = await st();
  check(s.round && s.round.chaos && s.chaosPhase === 'normal' && s.screen === 'color' && s.screenId === 'red' && !s.camOn, '광기 판 시작: RED 는 보통처럼, 카메라는 아직 ' + JSON.stringify([s.chaosPhase, s.screen, s.screenId, s.camOn]));
  const kinds = new Set(), faces = new Set(); let camEarly = null;
  for (let i = 0; i < 60; i++) { const x = await st(); kinds.add(x.screen); if (x.screen === 'face') faces.add(x.face); if (x.chaosPhase === 'stutter' && x.camOn && camEarly === null) camEarly = x.round.t; if (x.chaosPhase === 'off') break; await page.waitForTimeout(100); }
  check(kinds.has('stutter') && faces.has('laugh'), '파랑에서 버벅이고 영클이 한 번씩 웃는 화면 ' + JSON.stringify([[...kinds], [...faces]]));
  check(camEarly !== null && camEarly >= 5.5 && camEarly < 6.6, '카메라는 화면이 꺼지기 1초 전(버벅 중, 5.6초)부터 페이드인 ' + JSON.stringify(camEarly));
  await page.waitForFunction(() => window.__colorgame.chaosPhase() === 'off', null, { timeout: 6000 }).catch(() => {});
  await page.waitForTimeout(1200); await cap('chaos_off'); s = await st();
  check(s.chaosPhase === 'off' && s.screen === 'dead' && s.camOn && s.camAlpha > 0.4 && s.camReady && s.bang === null, '화면이 꺼진 채 … 오른쪽 아래 카메라가 페이드인(느낌표 아직) ' + JSON.stringify([s.chaosPhase, s.screen, s.camOn, s.camAlpha, s.camReady]));
  await page.waitForFunction(() => window.__colorgame.chaosPhase() === 'rampage', null, { timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(1500); s = await st(); const mean = await page.evaluate(() => window.__colorgame.monitorMean());
  check(s.rampage && s.hiss && s.round.gap === 0.3 && s.camAlpha === 1 && mean > 25, '폭주: 0.3초 간격 반복 + 치이익 잡음, 카메라 영상이 실제로 그려진다(모니터 평균 밝기 > 25) ' + JSON.stringify([s.rampage, s.hiss, s.round.gap, s.camAlpha, Math.round(mean)]));
  check(s.bang === null, '폭주 시작 직후엔 느낌표 없음(4초 뒤)');
  await page.waitForFunction(() => !!window.__colorgame.bangPos(), null, { timeout: 6000 }).catch(() => {});
  s = await st(); check(!!s.bang && s.round.t >= 12.2, '느낌표 버튼은 폭주 4초 뒤(판 시작 12.3초) ' + JSON.stringify([!!s.bang, s.round.t]));
  const b1 = await page.evaluate(() => window.__colorgame.bangPos()); await page.waitForTimeout(250); const b2 = await page.evaluate(() => window.__colorgame.bangPos());
  check(b1 && b2 && Math.abs(b1.x - b2.x) > 8, '느낌표 버튼이 좌우로 움직인다 ' + JSON.stringify([b1, b2]));
  await page.waitForFunction(() => window.__colorgame.round.loops >= 1 || window.__colorgame.round.t > 20, null, { timeout: 12000 }).catch(() => {});
  s = await st(); check(s.round.status === 'calling' && s.round.loops >= 1, '어쩌고저쩌고 계속 반복(입력 차례 없음) ' + JSON.stringify(s.round));
  await cap('chaos');
  // ⑧ 느낌표 클릭 → 딸깍·삐요오옹 → 폭발 → TV 켜지며 영클 대사(폭발 계속) → 쥰희 → 철창 날아감 → 페이드아웃
  const pass = await page.evaluate(() => { const c = window.__colorgame; const p = c.bangPos(); return c.clickAt(p.x, p.y); });
  check(pass && pass.type === 'pass', '느낌표를 누르면 통과 ' + JSON.stringify(pass));
  s = await st(); check(s.phase === 'blowup' && !s.hiss && !s.rampage, '누르면 잡음이 끊기고 폭발 순서로 ' + JSON.stringify([s.phase, s.hiss]));
  check(await waitPhase('talk', 6000), '폭발 뒤 TV 켜지며 영클 대사'); await page.waitForTimeout(400); s = await st();
  const bl = await page.evaluate(() => window.__colorgame.state.talk.lines.map(l => `${l.who}:${l.text}`));
  check(bl[0] === 'youngcle:오 ㅅㅂ 이게 머노' && bl[1] === 'youngcle:정지 정지 장비를 정지' && bl[2] === 'youngcle:안대잔아 씨바' && bl[3] === 'junhee:하하 꼴좋다 쓰레기색기', '폭발 대사 원문 ' + JSON.stringify(bl));
  check(s.blasting && s.blasts > 0 && s.face === 'surprise', '대사 동안 주변 폭발이 계속, 영클은 느낌표만 있는 surprise 얼굴(19책 shock 아님) ' + JSON.stringify([s.blasting, s.blasts, s.face]));
  await cap('blowup');
  for (let i = 0; i < 10; i++) { s = await st(); if (!s || s.phase !== 'talk') break; await pressC(); await page.waitForTimeout(60); }
  check(await waitPhase('boomcage', 3000), '쥰희 대사 뒤 큰 폭발'); await page.waitForTimeout(700); s = await st();
  check(s.cageFly < -30, '철창이 위로 날아간다 ' + JSON.stringify(s.cageFly)); await cap('cage_fly');
  // 더 오래 폭발하며 화면이 천천히 하얘진다: 큰 폭발 2.5초 뒤엔 반쯤 하얗고 아직 폭발 중, 씬은 5초 넘게 더 간다
  const boomAt = Date.now(); await page.waitForTimeout(1800); s = await st(); await cap('whiteout');
  check(s.phase === 'boomcage' && s.blasting && s.white > 0.2 && s.white < 0.8, '큰 폭발 뒤 계속 폭발하며 화면이 천천히 하얘지는 중 ' + JSON.stringify([s.phase, s.blasting, s.white, s.blasts]));
  await page.waitForFunction(() => !window.__colorgame, null, { timeout: 12000 }).catch(() => {});
  check(!(await page.evaluate(() => !!window.__colorgame)) && Date.now() - boomAt >= 4500, '다 하얘진 뒤 씬이 끝나 맵으로(큰 폭발 뒤 5초 이상) ' + JSON.stringify(Date.now() - boomAt));
  // ⑨ 광장 복귀 연출: 억빠맨 … → 오른쪽 → 철창 낙하 폭발 → 둘 탈출 → 대사 → TV 가운데 → 대사 → 퇴장
  await page.waitForFunction(() => window.game.dialogue.running, null, { timeout: 8000 }).catch(() => {});
  let m = await g(); check(m.flags.color && m.dialogue, '통과 플래그 + 복귀 연출 시작 ' + JSON.stringify(m.flags));
  check(m.cage && m.cage.y < -200 && m.tv && m.tv.y < 0, '돌아온 광장: 철창은 위로 날아가 안 보이고 TV 도 올라가 있다 ' + JSON.stringify([m.cage, m.tv]));
  m = await untilText('...'); check(!!m && m.text.includes('...'), '억빠맨 “...”'); await cap('back');
  await advance();
  await page.waitForFunction(() => { const g = window.game; const c = g.entities.find(e => e.id === 'lava_cage'); return !c || c.dead || c.y > -150; }, null, { timeout: 6000 }).catch(() => {});
  await page.waitForTimeout(350); await cap('cage_fall'); m = await g();
  check(m.junhee && m.junhee.visible && m.yongjun && m.yongjun.visible, '폭발과 함께 용준·쥰희가 바깥으로 ' + JSON.stringify([m.junhee, m.yongjun]));
  m = await untilText('살았다'); check(!!m, '용준 “어? 살 살았다!!!”');
  m = await untilText('부활이다'); check(!!m, '쥰희 “으하하 이몸 부활이다.”'); await cap('revive');
  const jy = (await g()).junhee; check(jy && jy.y > 250, '쥰희가 철창 밖 바닥에 서 있다 ' + JSON.stringify(jy));
  await advance();
  await page.waitForFunction(() => { const tv = window.game.entities.find(e => e.id === 'youngcle_tv'); return tv && tv.y > 40; }, null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(500); await cap('tv_center'); m = await g();
  check(m.tv && m.tv.x === 383 && m.tv.y > 40, 'TV 가 천천히 가운데로 내려온다 ' + JSON.stringify(m.tv));
  m = await untilText('인정해주겠음'); check(!!m && m.bgm.includes('storage_show') && m.tv?.expr === 'glare', '영클(째려보는 glare) “ㅇㅋ.. 인정해주겠음” + 영클 브금 ' + JSON.stringify([m?.text, m?.bgm, m?.tv?.expr]));
  await cap('glare');
  for (const [needle, expr] of [['다음은 없음', 'glare'], ['난 꼭', 'glare'], ['곧 보자고', 'shrug']]) { m = await untilText(needle); check(!!m && m.tv?.expr === expr, `영클 “${needle}” (${expr}) ` + JSON.stringify([m?.text, m?.tv?.expr])); }
  const around = await g(); check(around.junhee.facing === 'up' && around.junhee.x === 360 && around.junhee.y === 288 && around.px === 456 && around.py === 288, '모두 TV 아래 한 줄로 모여 위를 본다(쥰희 360·형섭 456 — 주인공은 아래 문 기둥 x448~544 안) ' + JSON.stringify([around.junhee, around.px, around.py]));
  await cap('gather');
  // 다리: TV 가 떠난 뒤 웅덩이 가운데(cols 14~16)에 판 6장이 앞에서부터 하나씩 철컥 내려앉고 그 줄이 걷는 바닥이 된다 → 앞 울타리 세 칸이 내려가 없어진다
  const bridge = () => page.evaluate(() => { const g = window.game; const e = id => g.entities.find(x => x.id === id && !x.dead); const planks = [0, 1, 2, 3, 4, 5].map(i => e(`lava_bridge_${i}`));
    return { shown: planks.filter(p => p && p.visible).length, ys: planks.map(p => p ? Math.round(p.y) : null), walk: [2, 4, 7].map(r => !g.map.tileAt(15, r).solid), fences: [6, 7, 8].map(i => !!e(`lava_fence_${i}`)), camx: Math.round(g.camera.x), camy: Math.round(g.camera.y),
      junhee: (() => { const j = e('arena_junhee'); return j ? { visible: j.visible, x: Math.round(j.x), y: Math.round(j.y) } : null; })(), yongjun: (() => { const y = e('arena_yongjun'); return y ? { visible: y.visible, x: Math.round(y.x), y: Math.round(y.y) } : null; })(), text: g.textbox.node?.text?.slice(0, 40) }; });
  await advance();
  await page.waitForFunction(() => { const g = window.game; const p = g.entities.find(x => x.id === 'lava_bridge_2'); return p && p.visible; }, null, { timeout: 12000 }).catch(() => {});
  let br = await bridge(); await cap('bridge_mid');
  check(br.shown >= 3 && br.shown < 6 && br.ys[0] === 224 && br.walk.every(w => !w), '다리 판이 앞에서부터 하나씩 놓이는 중(아직 걷는 타일 아님) ' + JSON.stringify(br));
  await page.waitForFunction(() => !window.game.map.tileAt(15, 4).solid, null, { timeout: 8000 }).catch(() => {});
  br = await bridge(); await cap('bridge');
  check(br.shown === 6 && br.ys.join() === '224,192,160,128,96,64' && br.walk.every(Boolean) && Math.abs(br.camx - 256) < 60, '다리 6장이 다 놓이고 그 줄(cols 14~16, rows 2~7)이 걷는 바닥 — 카메라는 웅덩이 가운데 ' + JSON.stringify(br));
  await page.waitForFunction(() => ![6, 7, 8].some(i => window.game.entities.find(x => x.id === `lava_fence_${i}` && !x.dead)), null, { timeout: 6000 }).catch(() => {});
  br = await bridge(); check(br.fences.every(f => !f), '앞 울타리 세 칸(cols 14~16)이 없어졌다 ' + JSON.stringify(br.fences));
  // 쥰희가 빠르게 뛰쳐 나가고, 용준 “형 형 기다려요 같이가요” 하고 따라감 → 주인공 쪽으로 포커스
  m = await untilText('기다려요'); check(!!m && m.text.includes('형 형 기다려요 같이가요'), '용준 “형 형 기다려요 같이가요” ' + JSON.stringify(m?.text));
  br = await bridge(); check(br.junhee && !br.junhee.visible, '그때 쥰희는 이미 다리를 건너 사라졌다 ' + JSON.stringify(br.junhee));
  await cap('runout');
  await advance();
  await page.waitForFunction(() => !window.game.dialogue.running, null, { timeout: 12000 }).catch(() => {});
  await page.waitForTimeout(400); await cap('after'); m = await g();
  check(!m.dialogue && m.flags.after && m.tv && m.tv.y < 0 && !m.bgm.includes('storage_show'), '연출 끝: TV 떠남·브금 꺼짐·플래그 ' + JSON.stringify([m.dialogue, m.flags, m.tv, m.bgm]));
  br = await bridge(); check(br.junhee && !br.junhee.visible && br.yongjun && !br.yongjun.visible && Math.abs(br.camx + 240 - (m.px + 12)) < 40, '둘 다 떠났고 카메라는 주인공에게 ' + JSON.stringify([br.junhee, br.yongjun, br.camx, m.px]));
  check(!m.cage, '철창은 날아가 없다 ' + JSON.stringify(m.cage));
  // ⑩ 아래 문으로 나갔다 다시 들어오면: 철창 없음, 둘은 울타리 앞, TV 없음, 연출 없음
  await page.keyboard.down('ArrowDown'); await page.waitForFunction(() => window.game.mapId === 'youngcle17', null, { timeout: 12000 }).catch(() => {}); await page.keyboard.up('ArrowDown');
  await page.waitForFunction(() => !window.game.transitioning, null, { timeout: 4000 }).catch(() => {}); await page.waitForTimeout(300);
  await page.keyboard.down('ArrowUp'); await page.waitForFunction(() => window.game.mapId === 'youngcle18', null, { timeout: 12000 }).catch(() => {}); await page.keyboard.up('ArrowUp');
  await page.waitForTimeout(1200); m = await g(); await cap('reenter');
  br = await bridge();
  check(m.map === 'youngcle18' && !m.dialogue && !m.cage && m.junhee && !m.junhee.visible && !m.tv?.phase && br.shown === 6 && br.walk.every(Boolean) && br.fences.every(f => !f), '재입장: 철창 없음·둘은 떠남·TV 없음·다리 놓임(걷는 타일)·울타리 세 칸 없음 ' + JSON.stringify([m.map, m.dialogue, m.cage, m.junhee, m.tv, br.shown, br.walk, br.fences]));
  check(errors.length === 0, '페이지 오류 없음 ' + JSON.stringify(errors.slice(0, 3)));
} catch (e) { fails += 1; console.log('CRASH', e.message); await cap('crash').catch(() => {}); }
console.log(`=== fails=${fails}`);
await browser.close();
