// 조종실 보스전 뒤 연출(BUILD211): QA ship_aftermath → 얼굴 박힌 영클 옆 쥰희 웃음(오방순·나람 없음) → 대사 → 브금 꺼짐 → 영클 “...안돼” → 쥰희 화들짝 점프 → 천둥·ANOTHER HIM·검은 연기·보라 화면 → 모두 느낌표
//   → 소용돌이·연기가 가운데 위로 → 가재맨(카메라 따라감, 모두 위를 봄) → 대사 → 가재맨 연기화 → 영클에게 흡수 → 쥰희 뒤로 달려감 → 영클 힘 받는 자세 → 변신음·떨림·쿠와아앙 → 흰 화면 → TV 머리 영클(팔 풍차) → I'm Very Bad
//   → 대사 → 전투 시작 연출 → 대치 상태·플래그 → 재입장(ship_control_after). 실행: tests/playtest/run.sh ship-aftermath
import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright-core';
const shots = process.env.SHOT_DIR; fs.mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = []; page.on('pageerror', e => errors.push(e.message));
let fails = 0;
const check = (ok, msg) => { if (!ok) { fails += 1; console.log('FAIL', msg); } else console.log('ok', msg); };
const cap = async n => { await page.screenshot({ path: path.join(shots, 'shipa_' + n + '.png') }); };
const pressC = async () => { await page.keyboard.press('KeyC'); await page.waitForTimeout(200); };
const key = () => page.evaluate(() => `${window.game.dialogue.i}:${window.game.textbox.node?.text ?? ''}`);
const advance = async () => { const before = await key(); for (let i = 0; i < 4; i++) { await pressC(); const now = await key(); const running = await page.evaluate(() => window.game.dialogue.running); if (now !== before || !running) return; } };
const st = () => page.evaluate(() => { const g = window.game; const e = id => id === 'player' ? g.player : g.entities.find(x => x.id === id && !x.dead);
  const ent = id => { const a = e(id); return a ? { x: Math.round(a.x), y: Math.round(a.y), v: a.visible, f: a.facing, pose: a.pose || null, sprite: a.def.sprite, loop: !!a.motion?.loop, motion: !!a.motion, emote: !!a.emote } : null; };
  return { map: g.mapId, dialogue: g.dialogue.running, text: g.textbox.node?.text?.slice(0, 70), speaker: g.textbox.node?.speaker, portrait: g.textbox.node?.portrait ?? null,
    camx: Math.round(g.camera.x), camy: Math.round(g.camera.y), bgm: JSON.stringify([g.sound.bgmName, g.sound.currentBgm, g.sound.bgmId]), zoom: g.camera.zoom ?? g.zoom ?? 1,
    p: ent('player'), gs: ent('gyeongsub'), pp: ent('ppaman'), j: ent('ship_junhee'), yj: ent('ship_yongjun'), yc: ent('ship_youngcle'), ob: ent('ship_obangsun'), nr: ent('ship_naram'), down: ent('ship_youngcle_down'), gj: ent('ship_gajaeman'),
    smoke: g.darkSmoke ? { mode: g.darkSmoke.mode, veil: Math.round(g.darkSmoke.veil * 100) / 100, aura: g.darkSmoke.aura?.actor?.id ?? null } : null,
    booms: (g.booms || []).length, flag: !!g.flags.ship_aftermath_done, introFlag: !!g.flags.ship_intro_done }; });
const untilText = async (needle, max = 90) => { for (let i = 0; i < max; i++) { const s = await st(); if ((s.text || '').includes(needle)) return s; if (!s.dialogue) { await page.waitForTimeout(300); continue; } await advance(); } return null; };
const waitFor = async (fn, ms = 8000) => page.waitForFunction(fn, null, { timeout: ms }).then(() => true).catch(() => false);
const sfxHas = name => page.evaluate(n => window.__sfx.includes(n), name);
try {
  await page.goto('http://localhost:8000/?qa=ship_aftermath');
  await page.waitForFunction(() => window.game && window.game.mapId === 'youngcle20', null, { timeout: 25000 });
  await page.evaluate(() => { const snd = window.game.sound; window.__sfx = []; const orig = snd.sfx.bind(snd); snd.sfx = (name, opts) => { window.__sfx.push(name); return orig(name, opts); }; });
  // ① 전투 뒤 자리: 오방순·나람 없음, 얼굴 박힌 영클 소품, 그 옆에 쥰희(서서 오른쪽을 봄), 일행은 로고 왼쪽 — 쥰희 웃음 동작 + 웃음소리
  const laughed = await waitFor(() => window.__sfx.includes('laugh_junhee'), 8000);
  await page.waitForTimeout(350); let s = await st(); await cap('01_laugh');
  check(laughed && s.j.x === 484 && s.j.y === 316 && s.j.f === 'right' && !s.j.pose && s.j.motion && s.down.v && !s.ob.v && !s.nr.v && !s.yc.v && s.p.x === 400 && s.p.f === 'right' && s.yj.pose === 'lying',
    '전투 뒤: 쥰희가 얼굴 박힌 영클 옆에 서서 웃음(동작·소리), 오방순·나람 없음, 일행 로고 왼쪽, 용준은 벽에 누움 ' + JSON.stringify([laughed, s.j, s.down, s.ob, s.nr, s.p]));
  s = await untilText('어떠냐 븅신새끼'); await cap('02_junhee_line');
  check(s && s.speaker === '쥰희' && s.portrait === 'junhee' && Math.abs(s.camx - 240) <= 2, '쥰희 “ㅋㅋㅋㅋ어떠냐 븅신새끼ㅋㅋ” — 카메라 로고 가운데 ' + JSON.stringify([s?.speaker, s?.camx]));
  const bgm1 = await waitFor(() => window.game.sound.bgmName === 'storage_show', 4000); check(bgm1, '조종실 곡(storage_show) 복귀');
  s = await untilText('지방층'); check(!!s, '쥰희 “고작 대포따위로…”');
  s = await untilText('우리 적은 아닌거같아요'); check(s && s.speaker === '억빠맨', '억빠맨 “근데 영클형이 우리 적은 아닌거같아요”');
  s = await untilText('뭐야?'); check(s && s.j.f === 'left', '쥰희 “뭐야?” — 일행 쪽(왼쪽)을 본다 ' + s?.j?.f);
  s = await untilText('나갈 수 있는 문'); await advance();
  const bangJ = await waitFor(() => { const j = window.game.entities.find(x => x.id === 'ship_junhee'); return j && j.emote; }, 3000); await cap('03_junhee_bang');
  check(bangJ, '쥰희(느낌표)');
  s = await untilText('나가는 문이 맞았었군'); check(!!s, '쥰희 “그렇군 역시 그 문이…”');
  s = await untilText('형섭이는?'); check(s && s.speaker === '경섭', '경섭 “근데 그러면... 형섭이는?”');
  s = await untilText('네 그게 맞는거같아요'); await advance();
  // ② 브금 꺼짐 → 영클 “...안돼”(째려봄 초상) → 쥰희 화들짝 앞으로 점프하고 영클 쪽을 본다
  s = await untilText('...안돼'); await cap('04_andwae');
  check(s && s.speaker === '영클' && s.portrait === 'youngcle_tv_glare' && !s.bgm.includes('storage_show'), '브금이 꺼진 뒤 영클 “...안돼” ' + JSON.stringify([s?.speaker, s?.portrait, s?.bgm]));
  await advance();
  s = await untilText('아직살아있었나'); await cap('05_junhee_jump');
  check(s && s.j.x === 456 && s.j.y === 330 && s.j.f === 'right', '쥰희가 앞으로 점프(456,330)하고 영클 쪽(오른쪽)을 본다 ' + JSON.stringify(s?.j));
  s = await untilText('넘겨줄순없음'); check(s && s.portrait === 'youngcle_tv_glare', '영클 “아직 끝낼수없다…”');
  s = await untilText('실상은'); await advance();
  // ③ 천둥 → ANOTHER HIM → 영클에게서 검은 연기(swell)·보라 화면 → 모두 느낌표
  const dark = await waitFor(() => window.game.darkSmoke && window.game.darkSmoke.mode === 'swell', 4000);
  await page.waitForTimeout(2600); s = await st(); await cap('06_dark_power');
  const emoted = s.p.emote && s.gs.emote && s.pp.emote && s.j.emote;
  check(dark && s.smoke && s.smoke.veil >= 0.2 && s.bgm.includes('captain_reveal') && (await sfxHas('captain_thunder')) && emoted, '어둠의 힘: 천둥·ANOTHER HIM·검은 연기·보라 음영(veil≥0.2)·모두 느낌표 ' + JSON.stringify([dark, s.smoke, s.bgm, emoted]));
  s = await untilText('가재맨이야'); check(s && s.speaker === '경섭', '경섭 “가재맨이야.”'); await advance();
  // ④ 소용돌이·연기가 가운데 위로 모이고 카메라가 따라가면 가재맨 등장 — 모두 위를 본다
  const vortexed = await waitFor(() => window.game.booms.length > 0 && window.game.darkSmoke?.mode === 'gather', 4000);
  await page.waitForTimeout(2000); await cap('07_vortex_gather');
  const gjShown = await waitFor(() => { const g = window.game.entities.find(x => x.id === 'ship_gajaeman'); return g && g.visible; }, 8000);
  await page.waitForTimeout(700); s = await st(); await cap('08_gajaeman');
  check(vortexed && gjShown && s.gj.x === 468 && s.gj.y === 118 && s.camy <= 40 && s.camx >= 230 && [s.p, s.gs, s.pp, s.j].every(a => a.f === 'up'), '소용돌이(boom)·연기 모임 → 카메라 위로 → 가재맨(468,118) 등장 → 모두 위를 본다 ' + JSON.stringify([vortexed, gjShown, s.gj, s.camx, s.camy, [s.p.f, s.gs.f, s.pp.f, s.j.f]]));
  s = await untilText('가 가재맨'); check(s && s.speaker === '억빠맨', '억빠맨 “가 가재맨!!”');
  s = await untilText('용캐도 영클을'); check(s && s.speaker === '가재맨' && !s.portrait, '가재맨 “ㅋㅋ 용캐도 영클을 이겼구나”(초상 없음) ' + JSON.stringify([s?.speaker, s?.portrait]));
  s = await untilText('지구를 파괴'); check(!!s, '가재맨 “지구를 파괴시켜버릴거임”');
  s = await untilText('모두가 나를 이렇게'); check(!!s, '가재맨 “모두가 나를 이렇게 만들었으니까.”');
  s = await untilText('알아서 잘 처리해봐라'); await page.waitForTimeout(300); s = await st(); await cap('09_gajaeman_cloak');
  check(s && s.smoke?.mode === 'cloak', '가재맨이 힘을 주며 연기화(cloak) ' + JSON.stringify(s?.smoke)); await advance();
  // ⑤ 연기가 영클에게 빨려 들어감 → 가재맨 사라짐 → 쥰희가 일행 뒤(300,300)로 달려가 영클을 본다 → 영클 힘 받는 자세
  const transfer = await waitFor(() => window.game.darkSmoke?.mode === 'transfer', 4000);
  await page.waitForTimeout(1500); await cap('10_transfer');
  const junheeBack = await waitFor(() => { const j = window.game.entities.find(x => x.id === 'ship_junhee'); return j && j.x === 300 && j.y === 300; }, 12000);
  await page.waitForTimeout(500); s = await st();
  check(transfer && junheeBack && !s.gj.v && s.j.f === 'right' && s.p.f === 'right', '연기 이동(transfer) → 가재맨 사라짐 → 쥰희가 일행 뒤(300,300)로 달려가 오른쪽(영클)을 본다 ' + JSON.stringify([transfer, junheeBack, s.gj, s.j]));
  const rose = await waitFor(() => { const y = window.game.entities.find(x => x.id === 'ship_youngcle'), d = window.game.entities.find(x => x.id === 'ship_youngcle_down'); return y && y.visible && y.def.sprite === 'youngcle_powerup' && y.motion?.loop && d && !d.visible; }, 8000);
  await page.waitForTimeout(800); s = await st(); await cap('11_rise');
  check(rose && s.yc.x === 556 && s.yc.y === 300 && s.smoke?.aura === 'ship_youngcle', '얼굴 박힌 소품 → 힘 받는 영클(556,300)·오라가 영클에 ' + JSON.stringify([rose, s.yc, s.smoke]));
  s = await untilText('으으으 후후후'); check(s && s.portrait === 'youngcle_tv_laugh', '영클 “으으으 후후후 후후후후”');
  s = await untilText('편집노조 친구들의 힘'); check(s && s.portrait === 'youngcle_tv_taunt', '영클 “느껴진다…”');
  s = await untilText('힘든 싸움'); await advance();
  // ⑥ 변신: 브금 끊김 → 변신음 → 떨림·진동 → 쿠와아앙 → 흰 화면 → TV 머리 영클(팔 풍차 루프) → I'm Very Bad
  const transform = await waitFor(() => window.__sfx.includes('captain_transform'), 4000);
  await page.waitForTimeout(2200); s = await st(); await cap('12_charging');
  check(transform && !s.bgm.includes('captain_reveal') && s.yc.sprite === 'youngcle_powerup' && s.smoke?.mode === 'cloak', '변신 준비: 브금 끊김·변신음·연기 감싸기(힘 받는 자세) ' + JSON.stringify([transform, s.bgm, s.yc.sprite, s.smoke]));
  const blast = await waitFor(() => window.__sfx.includes('furnace_blast'), 8000);
  await page.waitForTimeout(650); await cap('13_white');
  const tenna = await waitFor(() => { const y = window.game.entities.find(x => x.id === 'ship_youngcle'); return y && y.def.sprite === 'youngcle_tvform' && y.motion?.loop; }, 6000);
  await page.waitForTimeout(2300); s = await st(); await cap('14_tenna');
  check(blast && tenna && s.yc.v && s.smoke?.veil >= 0.3 && s.smoke.aura === 'ship_youngcle', '쿠와아앙 → 흰 화면 → TV 머리 영클(youngcle_tvform, 팔 풍차 루프)·보라 음영·오라 유지 ' + JSON.stringify([blast, tenna, s.yc, s.smoke]));
  s = await untilText('너희를 족치고'); await cap('15_tenna_line');
  check(s && s.speaker === '영클' && s.portrait === 'youngcle_tv_taunt' && s.bgm.includes('captain_mankatsuki'), '변신 뒤 “너희를 족치고 난 집에가겠음” + I\'m Very Bad ' + JSON.stringify([s?.speaker, s?.bgm]));
  s = await untilText('느금마'); check(s && s.speaker === '억빠맨', '억빠맨 “느금마”');
  // 2차전 진입 대사 6줄(BUILD218 사용자 원문): 억빠맨 → 영클 → 경섭 → 억빠맨 → 쥰희 → 영클
  // HP 를 깎아 두고 회복 연출(쥰희 버섯 세 개 → 전부 회복)을 잰다
  await page.evaluate(() => { for (const id of ['hyungsub', 'gyeongsub', 'ppaman']) window.game.partyHp[id] = 10; });
  for (const [key, who] of [['징그럽다', '억빠맨'], ['힘좀 써야할거임', '영클'], ['저거먼저', '경섭'], ['기억안나냐', '억빠맨'], ['안남', '쥰희'], ['하나씩 먹어라', '쥰희']]) { s = await untilText(key, 60); check(s && s.speaker === who, `2차전 진입 대사 ${who} “${key}”`); }
  await advance(); await page.waitForTimeout(260); await cap('15b_mushroom');   // 첫 버섯이 날아가는 중(0.42초 비행)
  s = await untilText('오 나이스', 60); check(s && s.speaker === '억빠맨', '2차전 진입 대사 억빠맨 “오 나이스”'); await cap('15c_nice');
  const healed = await page.evaluate(() => ['hyungsub', 'gyeongsub', 'ppaman'].map(id => [window.game.hpOf(id), window.game.maxHpOf(id)]));
  check(healed.every(([hp, max]) => hp === max), '버섯 세 개로 형섭·경섭·빠맨 체력 전부 회복 ' + JSON.stringify(healed));
  s = await untilText('육체까지'); check(s && s.speaker === '영클', '2차전 진입 대사 영클 “육체까지”');
  await advance();
  // ⑦ 전투 시작 연출(battle_start·소용돌이·줌·검게) → 변신 영클 전투(BUILD214, 내용은 tvform-battle.mjs) — 여기선 전투가 뜨면 바로 끝내고 대치 상태·플래그만 본다
  const started = await waitFor(() => window.__sfx.includes('battle_start'), 5000);
  await page.waitForTimeout(700); await cap('16_battle_start');
  const battleUp = await waitFor(() => window.game.battle && window.game.battle.state !== 'load' && window.game.battle.enemies.some(e => e.id === 'youngcle_tvform'), 15000);
  check(battleUp, '전투 시작 연출 뒤 변신 영클(youngcle_tvform) 전투가 뜬다');
  if (battleUp) await page.evaluate(() => window.game.battle.finish(true));
  // BUILD223(Codex) 뒤: 실제 승리는 ship_tvform_won 플래그 → 전투가 닫히며 ship_tvform_ending(원래 모습으로 풀림 → 맨홀)이 바로 이어진다(자세한 검사는 ship-ending.mjs)
  const done = await waitFor(() => !window.game.battle && window.game.flags.ship_tvform_won && window.game.dialogue.running, 15000);
  await page.waitForTimeout(900); s = await st(); await cap('17_after');
  check(started && done && s.flag && s.dialogue, '전투 승리 뒤 곧바로 승리 후 연출(ship_tvform_ending)이 이어진다 ' + JSON.stringify([started, done, s.flag, s.dialogue]));
  // ⑧ 재입장(ship_control_after): 변신 영클과 대치 상태 그대로
  await page.goto('http://localhost:8000/?qa=ship_control_after');
  await page.waitForFunction(() => window.game && window.game.mapId === 'youngcle20', null, { timeout: 25000 });
  await page.waitForTimeout(1500); s = await st(); await cap('18_reenter');
  check(!s.dialogue && s.yc?.v && s.yc.sprite === 'youngcle_tvform' && s.yc.loop && s.j?.x === 300 && !s.j.pose && !s.down?.v && !s.ob?.v && !s.nr?.v && !s.gj?.v && s.smoke?.veil >= 0.3 && s.bgm.includes('captain_mankatsuki'),
    '재입장: 변신 영클(556,300)·쥰희 일행 뒤·오방순·나람·가재맨 없음·보라 음영·I\'m Very Bad ' + JSON.stringify([s.yc, s.j, s.down, s.smoke, s.bgm]));
  check(errors.length === 0, '페이지 오류 없음 ' + JSON.stringify(errors.slice(0, 3)));
} catch (e) { fails += 1; console.log('CRASH', e.message); await cap('crash'); }
console.log('fails=' + fails);
await browser.close();
