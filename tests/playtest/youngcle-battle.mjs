// 조종실 전투(BUILD207~208): QA ship_battle → 인트로 → 셋이 영클 공격(피함) → 적 턴 1 오방순 광선 → 막간 대사(후후후 … 아이디어 추가) → 라운드 2·3(나람 내려찍기·철창 레이저) → 스택 9
//   → 아이디어 1(억빠맨 볼: 나람 5번 맞히기 → 쿠왕 → 영클 hp 7) → 라운드 ×3 → 아이디어 2(퀴즈 4문제 → 폭언 → 오방순 발작·충돌 hp 4·탈주) → 라운드 ×3 → 아이디어 3(보지 → 방심)
//   → 적 턴 건너뜀 → 공격 3대 × 1 = hp 1 → 피날레(대사 → 쥰희 기어옴 → 점프슬램 → 흰 화면 → 전투 끝 → 맵). 실행: tests/playtest/run.sh youngcle-battle
import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright-core';
const shots = process.env.SHOT_DIR; fs.mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = []; page.on('pageerror', e => errors.push(e.message));
let fails = 0;
const check = (ok, msg) => { if (!ok) { fails += 1; console.log('FAIL', msg); } else console.log('ok', msg); };
const cap = async n => { await page.screenshot({ path: path.join(shots, 'ycb_' + n + '.png') }); };
const press = async (k, ms = 180) => { await page.keyboard.press(k); await page.waitForTimeout(ms); };
const st = () => page.evaluate(() => { const b = window.game.battle; if (!b) return null; const yc = b.enemies.find(e => e.id === 'youngcle_hover'), sp = b.support;
  return { state: b.state, text: (b.text || '').slice(0, 60), turn: sp?.turn, current: sp?.current, charge: sp?.charge, unlocked: !!sp?.unlocked, ready: !!sp?.ready, ideaIdx: sp?.ideaIdx, distracted: !!sp?.distracted, obGone: !!sp?.obangsunGone,
    targets: b.targets().map(e => e.id), living: b.living().map(e => e.id), interlude: !!b.interlude, menuIdx: b.menuIdx,
    yc: yc ? { hp: yc.hp, popup: yc.popup?.text || null, pose: yc.patternPose ? [Math.round(yc.patternPose.x ?? -1), Math.round(yc.patternPose.y ?? -1), yc.patternPose.sheet || null] : null, x: Math.round(yc.x) } : null,
    bullets: b.bullets.length, shapes: [...new Set(b.bullets.map(x => x.shape))], bubble: b.bubble?.text || null, soul: { x: Math.round(b.soul.x), y: Math.round(b.soul.y) }, gimmick: b.gimmick?.snapshot || null,
    party: b.members.map(m => m.hp), bgm: JSON.stringify([window.game.sound.bgmName, window.game.sound.currentBgm]) }; });
const waitState = (s, ms = 20000) => page.waitForFunction(x => window.game.battle && window.game.battle.state === x, s, { timeout: ms }).then(() => true).catch(() => false);
const skipIntro = async () => { for (let i = 0; i < 12; i++) { const s = await st(); if (!s || s.state === 'menu') break; await press('KeyC', 350); } };
// 세 명 모두 [공격하기] → 영클
const attackAll = async () => { for (let i = 0; i < 3; i++) { const s = await st(); if (!s || s.state !== 'menu') break; if (s.menuIdx !== 0) { for (let k = 0; k < 3 && (await st()).menuIdx !== 0; k++) await press('ArrowRight'); } await press('KeyC'); await press('KeyC'); await page.waitForTimeout(150); } };
// 적 턴이 끝나 행동 선택으로 돌아올 때까지: 막간 대사(interlude)나 텍스트는 C 로 넘기고, 철창 모드는 ←→ 연타 뒤 위로 피한다
let cageShots = 0, beamSeen = 0, promptSeen = false, bands = [];
const heal = () => page.evaluate(() => { for (const m of window.game.battle.members) { m.hp = m.maxHp; m.down = false; m.downTurns = 0; } });
let godMode = false; const god = () => page.evaluate(() => { const b = window.game.battle; if (b && b.soul) b.soul.invuln = 5; });
const untilMenu = async (ms = 60000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const s = await st(); if (!s) return null; if (godMode && (s.state === 'bullets' || s.state === 'enemy-mode')) await god(); if (s.state === 'menu' && !s.interlude) { await heal(); return s; } if (s.interlude || s.state === 'text' || (s.state === 'act' && TALK_PHASES.includes(s.gimmick?.phase))) { await press('KeyC', 320); continue; } if (s.state === 'enemy-mode' && s.gimmick && s.gimmick.progress !== undefined && !s.gimmick.broken) { if (cageShots === 0 && !s.gimmick.locked) { cageShots++; await cap('06a_cage_incoming'); } if (cageShots === 1 && s.gimmick.locked && !s.gimmick.mashOpen) { cageShots++; await cap('06a2_cage_prompt'); promptSeen = true; }
    if (cageShots === 2 && s.gimmick.locked && s.gimmick.progress > 0.4) { cageShots++; await cap('06b_cage_charge'); } for (let m = 0; m < 3; m++) { await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(35); await page.keyboard.press('ArrowRight'); await page.waitForTimeout(35); } continue; } if (s.state === 'enemy-mode' && s.gimmick?.broken && !s.gimmick.fired) { await page.keyboard.down('ArrowUp'); await page.waitForTimeout(300); await page.keyboard.up('ArrowUp'); continue; }
  if (s.state === 'enemy-mode' && s.gimmick?.fired && s.gimmick.beamLeft > 0) { bands.push(s.gimmick.bandY); if (s.gimmick.beamLeft > 1.5 && cageShots === 3) { cageShots++; await cap('06c_cage_beam'); beamSeen = s.gimmick.beamLeft; } if (s.gimmick.beamLeft < 1.2 && cageShots === 4) { cageShots++; await cap('06d_cage_beam_late'); } } await page.waitForTimeout(250); } return await st(); };
const TALK_PHASES = ['talk', 'talk2', 'ready', 'insult', 'berserk', 'after', 'look'];
const BG_CHECK = () => page.evaluate(() => window.game.battle?.cfg?.bg);
const useIdea = async () => { for (let k = 0; k < 4 && (await st()).menuIdx !== 2; k++) await press('ArrowRight'); await press('KeyC'); };
const talkThrough = async (until, ms = 30000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const s = await st(); if (!s) return null; if (until(s)) return s; await press('KeyC', 300); } return await st(); };
try {
  await page.goto('http://localhost:8000/?qa=ship_battle');
  await page.waitForFunction(() => window.game && window.game.battle && window.game.battle.state === 'intro', null, { timeout: 30000 });
  await page.evaluate(() => { const snd = window.game.sound; window.__sfx = []; const orig = snd.sfx.bind(snd); snd.sfx = (name, opts) => { window.__sfx.push(name); return orig(name, opts); }; const b = window.game.battle; window.__hurt = []; const oh = b.hurtParty.bind(b); const oa = b.applyPartyDamage.bind(b); b.hurtParty = (d) => { window.__hurtIn = true; return oh(d); }; b.applyPartyDamage = (ms, d) => { if (window.__hurtIn) window.__hurt.push(d); window.__hurtIn = false; return oa(ms, d); }; });
  await page.waitForTimeout(700); await cap('01_intro');
  let s = await st();
  check(s.living.length === 3 && JSON.stringify(s.targets) === '["youngcle_hover"]' && s.yc.hp === 10, '적 셋, 때릴 수 있는 건 영클(hp 10)뿐 ' + JSON.stringify([s.living, s.targets, s.yc.hp]));
  await page.waitForTimeout(2500); s = await st(); check(s.bgm.includes('youngcle_battle'), '브금 youngcle_battle ' + s.bgm);
  check((await BG_CHECK()) === 'youngcle_bridge' && (await page.evaluate(() => !!window.game.propImages['assets/backdrops/ship_battle_wall.png'] && !!window.game.propImages['assets/props/ship_floor_logo.png'])), '전투 배경 youngcle_bridge(벽 그림·바닥 로고 로드됨)');
  await skipIntro();
  // ① 셋이 공격 → 영클 피함 → 적 턴 1(오방순) → 막간 대사 → 아이디어 추가
  await attackAll();
  const dodged = await page.waitForFunction(() => { const yc = window.game.battle.enemies.find(e => e.id === 'youngcle_hover'); return yc.popup && yc.popup.text === '피했다'; }, null, { timeout: 8000 }).then(() => true).catch(() => false);
  await page.waitForTimeout(120); s = await st(); await cap('02_dodge');
  check(dodged && s.yc.hp === 10 && s.yc.pose && s.yc.pose[0] > s.yc.x + 10, '영클이 공격을 피한다(hp 10, 뒤로 물러남) ' + JSON.stringify([dodged, s.yc]));
  await page.waitForFunction(() => window.game.battle.state === 'bullets' && window.game.battle.bullets.some(b => b.shape === 'ray'), null, { timeout: 25000 }).catch(() => {});
  await page.waitForTimeout(350); s = await st(); await cap('03_obangsun_rays');
  const faceOpen = await page.evaluate(() => !!window.game.battle.bullets.find(b => b.shape === 'obangsun_face')?.open);
  check(s.current === 'obangsun_rays' && s.shapes.includes('ray') && s.shapes.includes('flame') && faceOpen && (s.bubble || '').includes('흐어어어'), '턴 1 오방순: 얼굴·광선·불덩이·입 벌림·흐어어어 ' + JSON.stringify([s.current, s.shapes, faceOpen, s.bubble]));
  await page.keyboard.down('ArrowDown');
  const inter = await page.waitForFunction(() => !!window.game.battle.interlude, null, { timeout: 25000 }).then(() => true).catch(() => false); await page.keyboard.up('ArrowDown');
  const hurtLog = await page.evaluate(() => window.__hurt.slice()); check(hurtLog.every(d => d === 15), '피격 피해는 공격당 15 고정(계단 폐기, BUILD212) ' + JSON.stringify(hurtLog));
  await page.waitForTimeout(400); s = await st(); await cap('04_interlude');
  check(inter && (s.text || '').includes('안맞는다'), '적 턴 뒤 막간 대사 “후후후 안맞는다 게이들아” ' + JSON.stringify([inter, s.text]));
  s = await talkThrough(x => (x.text || '').includes('아이디어가 추가')); await cap('05_idea_added');
  check(!!s && (s.text || '').includes('아이디어가 추가'), '“억빠맨의 아이디어가 추가되었다.” ' + JSON.stringify([s?.text]));
  s = await untilMenu(); check(s?.unlocked && s.charge === 3 && !s.ready, '아이디어 버튼 해금(스택 3/9, 아직 못 씀) ' + JSON.stringify([s?.unlocked, s?.charge, s?.ready]));
  godMode = true;
  await cap('06_menu_idea_button');
  // ② 라운드 2·3 → 스택 9 → 아이디어 1(나람 볼)
  for (let r = 0; r < 2; r++) { await attackAll(); s = await untilMenu(); }
  check(s?.charge === 9 && s.ready, '9대 때려 아이디어 사용 가능 ' + JSON.stringify([s?.charge, s?.ready, s?.turn]));
  check(beamSeen > 1.5, '철창 레이저가 3초 이어진다 ' + JSON.stringify([beamSeen]));
  check(promptSeen, '잠긴 뒤 “좌우로 연타해라!” 안내가 먼저(연타 UI 는 나중에)');
  check(bands.length >= 3 && Math.max(...bands) - Math.min(...bands) <= 1, '빔은 갇힌 자리 한 영역에 고정(BUILD212: 스윕 제거) ' + JSON.stringify([Math.min(...bands), Math.max(...bands), bands.length]));
  await useIdea();
  await page.waitForFunction(() => window.game.battle.gimmick?.snapshot?.hits !== undefined, null, { timeout: 5000 }).catch(() => {});
  s = await talkThrough(x => x.gimmick?.phase === 'enter'); await page.waitForTimeout(1000); await cap('07a_ball_walk'); s = await st();
  check(s?.gimmick?.phase === 'enter' && s.gimmick.arena?.rx === 180, '“잠시만요!” 뒤 억빠맨이 타원 경기장(rx 180)으로 걸어 들어간다 ' + JSON.stringify([s?.gimmick?.phase, s?.gimmick?.arena]));
  s = await talkThrough(x => x.gimmick?.phase === 'talk2');
  await page.waitForTimeout(300); await cap('07_ball_morph');
  s = await talkThrough(x => x.gimmick?.phase === 'game'); check(s?.gimmick?.phase === 'game', '아이디어 1: 억빠맨 공 변신 → 나람 들어옴(게임 시작) ' + JSON.stringify(s?.gimmick));
  // 펭이 놀이: 나람 쪽으로 미끄러져 가까우면 C 돌진 — 5번 맞힐 때까지
  let spinSeen = false, tauntShot = false, tauntState = null;
  for (let i = 0; i < 400; i++) {
    const g = (await st())?.gimmick; if (!g || g.phase !== 'game') break;
    const dx = g.naram.x - g.ball.x, dy = g.naram.y - g.ball.y, d = Math.hypot(dx, dy);
    const kx = dx > 8 ? 'ArrowRight' : dx < -8 ? 'ArrowLeft' : null, ky = dy > 8 ? 'ArrowDown' : dy < -8 ? 'ArrowUp' : null;
    if (kx) await page.keyboard.down(kx); if (ky) await page.keyboard.down(ky); await page.waitForTimeout(70); if (kx) await page.keyboard.up(kx); if (ky) await page.keyboard.up(ky);
    if (d < 70 && Math.hypot(g.ball.vx, g.ball.vy) > 10) { await page.keyboard.press('KeyC'); await page.waitForTimeout(120); if (!spinSeen) { const q = (await st())?.gimmick; if (q?.spinning) spinSeen = true; } }
    if (i === 12) await cap('08_ball_game');
    if (g.taunted && !tauntShot) { tauntShot = true; await page.waitForTimeout(600); await cap('08b_ball_taunt'); tauntState = await page.evaluate(() => ({ bubble: window.game.battle.bubble?.text || null, pose: !!window.game.battle.enemies.find(e => e.id === 'youngcle_hover').patternPose })); }
  }
  check(spinSeen, 'C 돌진 때 팽이처럼 돈다(spinning)');
  check(!!tauntState && tauntState.bubble === '가만히 둘가보냐' && tauntState.pose, '2대 맞히면 영클 말풍선 “가만히 둘가보냐” + 선회 시작 ' + JSON.stringify(tauntState));
  // 5대째: 경기장이 닫히는 동안 억빠맨 공이 자동으로 뛰어올라 덤블링하며 돌아오고(exit), 동그라미가 꺼진 뒤에야 나람이 날아간다(BUILD212 사용자 “동그라미 때문에 영클 맞는 게 안 보인다”)
  await page.waitForFunction(() => window.game.battle.gimmick?.snapshot?.phase === 'exit', null, { timeout: 12000 }).catch(() => {}); await page.waitForTimeout(380); s = await st(); await cap('09_ball_exit');
  check(s?.gimmick?.phase === 'exit' && s.gimmick.open < 1 && !s.gimmick.ballDone, '5대째: 경기장이 닫히는 동안 억빠맨 공이 자동으로 뛰어올라 덤블링하며 돌아온다 ' + JSON.stringify([s?.gimmick?.phase, s?.gimmick?.open, s?.gimmick?.ball]));
  await page.waitForFunction(() => window.game.battle.gimmick?.snapshot?.phase === 'launch', null, { timeout: 12000 }).catch(() => {}); await page.waitForTimeout(700); s = await st(); await cap('09a_naram_arc');
  check(s?.gimmick?.phase === 'launch' && s.gimmick.open === 0 && s.gimmick.ballDone, '동그라미가 꺼지고 억빠맨이 제자리에 선 뒤에 나람이 영클에게 날아간다(경기장이 안 가린다) ' + JSON.stringify([s?.gimmick?.open, s?.gimmick?.ballDone]));
  await page.waitForFunction(() => window.game.battle.gimmick?.snapshot?.phase === 'impact', null, { timeout: 12000 }).catch(() => {});
  await page.waitForTimeout(200); s = await st(); await cap('09_naram_launch');
  const sfxA = await page.evaluate(() => window.__sfx.slice());
  check(s?.gimmick?.hits >= 5 && s.yc.hp === 7 && sfxA.includes('queen_hoot') && sfxA.includes('punch') && sfxA.includes('furnace_blast') && !sfxA.includes('whoosh') && !sfxA.includes('boom'), '나람볼 5번 → 쿠왕(furnace_blast) → 포물선 → 영클 호오·펀치, hp 7 (파도소리 없음) ' + JSON.stringify([s?.gimmick?.hits, s?.yc?.hp, sfxA.filter(n => ['queen_hoot', 'punch', 'furnace_blast', 'whoosh', 'boom'].includes(n))]));
  s = await untilMenu(); check(s?.state === 'menu' && s.charge === 0 && s.ideaIdx === 1, '아이디어 1 뒤 스택 0, 다음은 아이디어 2 ' + JSON.stringify([s?.charge, s?.ideaIdx]));
  // ③ 라운드 ×3 → 아이디어 2(퀴즈)
  for (let r = 0; r < 6 && !(await st())?.ready; r++) { await attackAll(); s = await untilMenu(); }
  check(s?.ready, '다시 9대 → 아이디어 2 가능 ' + JSON.stringify([s?.charge, s?.ready, s?.party]));
  await useIdea();
  s = await talkThrough(x => x.gimmick?.phase === 'quiz'); await page.waitForTimeout(250); await cap('10a_quiz_reveal'); await page.waitForTimeout(700); await cap('10_quiz'); s = await st();
  check(s?.gimmick?.phase === 'quiz' && s.gimmick.zones?.length === 2 && s.gimmick.zones[0].w >= 140, '아이디어 2: 퀴즈 상자(폭 320, 위 문제, 아래 좌우 칸) ' + JSON.stringify([s?.gimmick?.q, s?.gimmick?.zones?.[0]?.w]));
  const answers = [0, 0, 0, 0];   // 컴퓨터 사기 / 김디삼 / 행복맨 / 똥이든성배 부정선거(사용자 정정)
  for (let qi = 0; qi < 4; qi++) {
    const g = (await st()).gimmick; if (!g || g.phase !== 'quiz') break;
    await page.waitForFunction(() => window.game.battle.gimmick?.snapshot?.revealed, null, { timeout: 4000 }).catch(() => {});
    const z = g.zones[answers[qi]]; const tx = z.x + z.w / 2, ty = z.y + z.h / 2;
    for (let i = 0; i < 60; i++) { const q = (await st()).gimmick; const dx = tx - q.soul.x, dy = ty - q.soul.y; if (Math.abs(dx) < 6 && Math.abs(dy) < 6) break; const kx = dx > 4 ? 'ArrowRight' : dx < -4 ? 'ArrowLeft' : null, ky = dy > 4 ? 'ArrowDown' : dy < -4 ? 'ArrowUp' : null; if (kx) await page.keyboard.down(kx); if (ky) await page.keyboard.down(ky); await page.waitForTimeout(60); if (kx) await page.keyboard.up(kx); if (ky) await page.keyboard.up(ky); }
    await press('KeyC', 250);
  }
  s = await st(); check(s?.gimmick?.phase === 'insult' || s?.gimmick?.q === 4, '4문제 정답 → 폭언 단계 ' + JSON.stringify([s?.gimmick?.phase, s?.gimmick?.q]));
  s = await talkThrough(x => x.gimmick?.phase === 'dots', 15000); await page.waitForTimeout(1500); await cap('11a_dots'); s = await st();
  check(s?.gimmick?.phase === 'dots' && !s.text, '폭언 뒤 억빠맨 빼고 모두 머리 위 “...” 말풍선(대사 상자 없음) ' + JSON.stringify([s?.gimmick?.phase, s?.text]));
  await page.waitForFunction(() => window.game.battle.gimmick?.snapshot?.phase === 'closeup', null, { timeout: 8000 }).catch(() => {}); await page.waitForTimeout(1200); await cap('11_closeup'); s = await st();
  check(s?.gimmick?.phase === 'closeup' && !s.bgm.includes('youngcle_battle'), '폭언 → 브금 꺼짐 → 모두 ... → 오방순 클로즈업 ' + JSON.stringify([s?.gimmick?.phase, s?.bgm]));
  await page.waitForFunction(() => window.game.battle.gimmick?.snapshot?.phase === 'berserk', null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(600); await cap('12_berserk');
  s = await talkThrough(x => ['leap', 'flee', 'after'].includes(x.gimmick?.phase), 20000);
  await page.waitForFunction(() => window.game.battle.gimmick?.snapshot?.phase === 'after', null, { timeout: 8000 }).catch(() => {});
  s = await st(); await cap('13_after_obangsun');
  check(s?.gimmick?.phase === 'after' && s.yc.hp === 4 && s.obGone && !s.living.includes('obangsun'), '오방순 발작 → 영클 충돌 hp 4 → 탈주 ' + JSON.stringify([s?.gimmick?.phase, s?.yc?.hp, s?.obGone, s?.living]));
  s = await untilMenu(); check(s?.state === 'menu' && s.ideaIdx === 2 && s.bgm.includes('youngcle_battle'), '“니앰” 뒤 다음 턴, 브금 복귀 ' + JSON.stringify([s?.ideaIdx, s?.bgm]));
  // ④ 라운드 ×3 → 아이디어 3(보지) → 방심 → 적 턴 건너뜀 → 3대 × 1 → hp 1
  for (let r = 0; r < 6 && !(await st())?.ready; r++) { await attackAll(); s = await untilMenu(); }
  check(s?.ready && !s.living.includes('obangsun'), '아이디어 3 가능(오방순 없이 패턴 순환) ' + JSON.stringify([s?.charge, s?.ready, s?.current, s?.party]));
  await useIdea();
  s = await talkThrough(x => (x.text || '').includes('보지'), 20000); await page.waitForTimeout(300); await cap('14_boji_mosaic');
  const mo = await page.evaluate(() => window.game.battle.lineMosaic); check(mo && mo.text === '지', '경섭 “보지?” — 지 모자이크 ' + JSON.stringify(mo));
  s = await talkThrough(x => x.gimmick?.phase === 'look' || x.distracted, 20000); await page.waitForTimeout(300); await cap('15_look_back'); s = await st();
  check(s?.yc?.pose && s.yc.pose[2] === 'surprise', '영클이 오 하며 뒤를 본다(놀람 시트) ' + JSON.stringify(s?.yc?.pose));
  s = await untilMenu(); check(s?.distracted && s.state === 'menu', '“어디???” → 적 턴 건너뛰고 바로 우리 턴 ' + JSON.stringify([s?.distracted, s?.turn]));
  await attackAll();
  await page.waitForFunction(() => window.game.battle.enemies.find(e => e.id === 'youngcle_hover').hp <= 1, null, { timeout: 12000 }).catch(() => {});
  s = await st(); await cap('16_hp1');
  check(s?.yc?.hp === 1, '방심한 영클에게 3대 × 1 = hp 1 ' + JSON.stringify([s?.yc?.hp]));
  await page.waitForTimeout(700); await cap('16b_hp1_after');
  // ⑤ 피날레
  const fin = await waitState('enemy-mode', 20000); s = await st();
  check(fin && (s.text || '').includes('피해절감'), '피날레: “ㅋㅋ 이럴줄알고 뒤통수에 피해절감 방어막…” ' + JSON.stringify([fin, s?.text]));
  s = await talkThrough(x => x.gimmick?.phase === 'crawl', 20000); await page.waitForTimeout(1500); await cap('17_junhee_crawl'); s = await st();
  check(s?.gimmick?.phase === 'crawl' && !s.bgm.includes('youngcle_battle') && s.gimmick.junhee.x > s.yc.x && s.gimmick.junhee.y < 140, '브금 꺼지고 쥰희가 오른쪽 위(영클 뒤통수 높이)에서 기어 나온다 ' + JSON.stringify([s?.gimmick, s?.bgm, s?.yc?.x]));
  await page.waitForFunction(() => window.game.battle.gimmick?.snapshot?.phase === 'jump', null, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(900); s = await st(); await cap('18_jump_slam');
  check(s?.gimmick?.phase === 'jump' && (s.text || '').includes('마이야르 점프슬램') && s.gimmick.kieek && s.yc.pose?.[2] === 'surprise' && s.gimmick.zoom > 1.2, '점프슬램: 대사·슬로우·영클 놀람(끼엑)·확대 ' + JSON.stringify([s?.gimmick, s?.text]));
  await page.waitForFunction(() => window.game.battle?.gimmick?.snapshot?.phase === 'white', null, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(700); await cap('19_white');
  const ended = await page.waitForFunction(() => !window.game.battle && window.game.mapId === 'youngcle20', null, { timeout: 15000 }).then(() => true).catch(() => false);
  const sfxZ = await page.evaluate(() => window.__sfx.slice(-30));
  await page.waitForTimeout(800); await cap('20_back_to_map');
  check(ended && sfxZ.includes('furnace_blast'), '쿠와아아앙 → 흰 화면 → 전투 끝 → 맵 ' + JSON.stringify([ended, sfxZ.includes('furnace_blast')]));
  const hurtAll = await page.evaluate(() => window.__hurt.slice()); check(hurtAll.every(d => d === 15), '피격 피해는 공격당 15 고정(계단 없음, BUILD212 사용자 정정) ' + JSON.stringify(hurtAll));
  check(errors.length === 0, '페이지 오류 없음 ' + JSON.stringify(errors.slice(0, 3)));
} catch (e) { fails += 1; console.log('CRASH', e.message); await cap('crash'); }
console.log('fails=' + fails);
await browser.close();
