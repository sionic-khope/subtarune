// 색깔 기억 게임(BUILD198): QA furnace_color → 1인칭 씬(TV 내려옴 → 튜토리얼 대사 → 시작 → 1판 RED 호출 → 마우스로 빨강 → 통과·철창 복귀 → 틀림 → C 다시 → 시간 초과(철창 내려감)
//   → 8판 광기: 카메라·느낌표 버튼 → 클릭 → 폭발·영클 대사 → 철창 날아감 → 씬 끝) → 광장 복귀 연출(철창 낙하 폭발·둘 탈출·TV 가운데·대사·퇴장) → 아래 문으로 나갔다 와서 재입장 상태.
// 실행: tests/playtest/run.sh color-game
import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright-core';
const shots = process.env.SHOT_DIR; fs.mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = []; page.on('pageerror', e => errors.push(e.message));
let fails = 0;
const check = (ok, msg) => { if (!ok) { fails += 1; console.log('FAIL', msg); } else console.log('ok', msg); };
const cap = async n => { await page.screenshot({ path: path.join(shots, 'color_' + n + '.png') }); };
const pressC = async () => { await page.keyboard.press('KeyC'); await page.waitForTimeout(160); };
const st = () => page.evaluate(() => { const c = window.__colorgame; if (!c) return null; const s = c.state, r = s.round; return { phase: s.phase, stage: s.stage, tvY: Math.round(s.tvY), tvOn: s.tvOn, screen: s.screen.kind, screenId: s.screen.id || null, face: s.face, talk: s.talk ? { i: s.talk.i, n: s.talk.lines.length, text: s.talk.lines[s.talk.i].text, who: s.talk.lines[s.talk.i].who } : null, round: r ? { status: r.status, i: r.i, n: r.expected.length, chaos: r.chaos, t: Math.round(r.t * 100) / 100, loops: r.loops, speed: r.speed, wrongs: r.wrongs, expected: r.expected } : null, over: s.over, go: s.go > 0, active: s.active, btnDown: s.buttons.map(b => b.down > 0), sunk: !!s.cage.sunk, splashed: !!s.cage.splashed, cageY: c.cageRect().y, cageDrop: Math.round(s.cage.drop * 100) / 100, cageFly: Math.round(s.cage.fly), camOn: s.camOn, camAlpha: Math.round(s.camAlpha * 100) / 100, camPlaying: !c.cam.paused, bang: c.bangPos(), blasting: s.blasting, blasts: s.blasts.length, hand: s.mouse.inside, press: s.hand.press > 0 }; });
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
const RULES_CALL = 1.0;
const waitPhase = (phase, timeout = 8000) => page.waitForFunction((p) => window.__colorgame && window.__colorgame.state.phase === p, phase, { timeout }).then(() => true).catch(() => false);
try {
  await page.goto('http://localhost:8000/?qa=furnace_color');
  await page.waitForFunction(() => !!window.__colorgame, null, { timeout: 25000 });
  // ① 페이드인 뒤 TV 가 천천히 내려온다(중간 프레임) — 브금은 멈춤
  await page.waitForFunction(() => { const s = window.__colorgame.state; return s.phase === 'drop' && s.tvY > -150 && s.tvY < -20; }, null, { timeout: 8000 }).catch(() => {});
  await cap('tv_down'); let s = await st();
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
  // ⑤ 2판: 틀린 색을 누르면 실패가 아니라 철창이 더 빨리 내려갈 뿐, 맞는 색부터 이어서 통과
  check(await waitPhase('round', 4000), '2판 시작'); s = await st(); check(s.stage === 1, '2판 ' + s.stage);
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
  // ⑦ 8판(광기): 카메라가 페이드인, 이상한 말이 반복되고 3초 뒤 느낌표 버튼이 좌우로
  await page.evaluate(() => window.__colorgame.skipTo(7)); await page.waitForTimeout(2200); s = await st();
  check(s.round && s.round.chaos && s.camOn && s.camAlpha > 0.5 && s.camPlaying, '광기 판: 오른쪽 아래 모니터에 얼빡 카메라 페이드인·영상 재생 ' + JSON.stringify([s.camOn, s.camAlpha, s.camPlaying]));
  check(s.bang === null, '3초 전엔 느낌표 없음');
  await page.waitForFunction(() => !!window.__colorgame.bangPos(), null, { timeout: 4000 }).catch(() => {});
  const b1 = await page.evaluate(() => window.__colorgame.bangPos()); await page.waitForTimeout(250); const b2 = await page.evaluate(() => window.__colorgame.bangPos());
  check(b1 && b2 && Math.abs(b1.x - b2.x) > 8, '느낌표 버튼이 좌우로 움직인다 ' + JSON.stringify([b1, b2]));
  await page.waitForFunction(() => window.__colorgame.round.loops >= 1 || window.__colorgame.round.t > 9, null, { timeout: 12000 }).catch(() => {});
  s = await st(); check(s.round.status === 'calling' && s.round.loops >= 1, '어쩌고저쩌고 계속 반복(입력 차례 없음) ' + JSON.stringify(s.round));
  await cap('chaos');
  // ⑧ 느낌표 클릭 → 딸깍·삐요오옹 → 폭발 → TV 켜지며 영클 대사(폭발 계속) → 쥰희 → 철창 날아감 → 페이드아웃
  const pass = await page.evaluate(() => { const c = window.__colorgame; const p = c.bangPos(); return c.clickAt(p.x, p.y); });
  check(pass && pass.type === 'pass', '느낌표를 누르면 통과 ' + JSON.stringify(pass));
  check(await waitPhase('talk', 6000), '폭발 뒤 TV 켜지며 영클 대사'); await page.waitForTimeout(400); s = await st();
  const bl = await page.evaluate(() => window.__colorgame.state.talk.lines.map(l => `${l.who}:${l.text}`));
  check(bl[0] === 'youngcle:오 ㅅㅂ 이게 머노' && bl[1] === 'youngcle:정지 정지 장비를 정지' && bl[2] === 'youngcle:안대잔아 씨바' && bl[3] === 'junhee:하하 꼴좋다 쓰레기색기', '폭발 대사 원문 ' + JSON.stringify(bl));
  check(s.blasting && s.blasts > 0 && s.face === 'shock', '대사 동안 주변 폭발이 계속 ' + JSON.stringify([s.blasting, s.blasts, s.face]));
  await cap('blowup');
  for (let i = 0; i < 10; i++) { s = await st(); if (!s || s.phase !== 'talk') break; await pressC(); await page.waitForTimeout(60); }
  check(await waitPhase('boomcage', 3000), '쥰희 대사 뒤 큰 폭발'); await page.waitForTimeout(700); s = await st();
  check(s.cageFly < -30, '철창이 위로 날아간다 ' + JSON.stringify(s.cageFly)); await cap('cage_fly');
  await page.waitForFunction(() => !window.__colorgame, null, { timeout: 8000 }).catch(() => {});
  check(!(await page.evaluate(() => !!window.__colorgame)), '씬이 끝나 맵으로');
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
  check(m.tv && m.tv.x === 294 && m.tv.y > 40, 'TV 가 천천히 다섯의 가운데(412) 위로 내려온다 ' + JSON.stringify(m.tv));
  m = await untilText('인정하마'); check(!!m && m.bgm.includes('storage_show'), '영클 “큭.. 그래 인정하마” + 영클 브금 ' + JSON.stringify([m?.text, m?.bgm]));
  const around = await g(); check(around.junhee.facing === 'up' && around.junhee.x === 312 && around.junhee.y === 288 && around.px === 356 && around.py === 288, '모두 TV 아래 한 줄로 모여 위를 본다(쥰희 312·형섭 356 — 주인공은 아래 입구 x320~416 안) ' + JSON.stringify([around.junhee, around.px, around.py]));
  await cap('gather');
  m = await untilText('얼굴보면'); check(!!m, '“뭐 일단 이제 얼굴보면 되겠군”');
  m = await untilText('이따보자'); check(!!m, '“왼쪽으로갔다가 올라오면 됨 이따보자 ㅂㅇ”');
  await advance();
  await page.waitForFunction(() => !window.game.dialogue.running, null, { timeout: 12000 }).catch(() => {});
  await page.waitForTimeout(400); await cap('after'); m = await g();
  check(!m.dialogue && m.flags.after && m.tv && m.tv.y < 0 && !m.bgm.includes('storage_show'), '연출 끝: TV 떠남·브금 꺼짐·플래그 ' + JSON.stringify([m.dialogue, m.flags, m.tv, m.bgm]));
  check(!m.cage, '철창은 날아가 없다 ' + JSON.stringify(m.cage));
  // ⑩ 아래 문으로 나갔다 다시 들어오면: 철창 없음, 둘은 울타리 앞, TV 없음, 연출 없음
  await page.keyboard.down('ArrowDown'); await page.waitForFunction(() => window.game.mapId === 'youngcle17', null, { timeout: 12000 }).catch(() => {}); await page.keyboard.up('ArrowDown');
  await page.waitForFunction(() => !window.game.transitioning, null, { timeout: 4000 }).catch(() => {}); await page.waitForTimeout(300);
  await page.keyboard.down('ArrowUp'); await page.waitForFunction(() => window.game.mapId === 'youngcle18', null, { timeout: 12000 }).catch(() => {}); await page.keyboard.up('ArrowUp');
  await page.waitForTimeout(1200); m = await g(); await cap('reenter');
  check(m.map === 'youngcle18' && !m.dialogue && !m.cage && m.junhee && m.junhee.visible && m.junhee.y > 250 && !m.tv?.phase, '재입장: 철창 없음·둘은 바닥·TV 없음 ' + JSON.stringify([m.map, m.dialogue, m.cage, m.junhee, m.tv]));
  check(errors.length === 0, '페이지 오류 없음 ' + JSON.stringify(errors.slice(0, 3)));
} catch (e) { fails += 1; console.log('CRASH', e.message); await cap('crash').catch(() => {}); }
console.log(`=== fails=${fails}`);
await browser.close();
