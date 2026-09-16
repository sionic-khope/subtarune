// 조종실 입장 연출(BUILD202): QA ship_control → 느낌표 → 카메라 로고 → 쥰희 4줄 → 대포 드르르륵·발사·연기 → 쥰희 벽까지 날아가 쾅·꾸엑·기절 → 용준 “어?! 형 !!!” → 용준도 벽 → 셋 가운데
//   → 영클 ㅋㅋ(브금) 앞으로 내려옴·뒷걸음 → 대사(악당 빨강) → 영클 상승 → 일행 왼쪽·오른쪽 봄 → 영클 오른쪽에서 훅훅훅 하강 → 나와라 → 철창 하강·착지·문 열림 → 오방순(위)·나람(아래) → 즐 → 전투 시작 연출 → 대치 상태·플래그 → 재입장 상태. 실행: tests/playtest/run.sh ship-control
import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright-core';
const shots = process.env.SHOT_DIR; fs.mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = []; page.on('pageerror', e => errors.push(e.message));
let fails = 0;
const check = (ok, msg) => { if (!ok) { fails += 1; console.log('FAIL', msg); } else console.log('ok', msg); };
const cap = async n => { await page.screenshot({ path: path.join(shots, 'shipc_' + n + '.png') }); };
const pressC = async () => { await page.keyboard.press('KeyC'); await page.waitForTimeout(200); };
const key = () => page.evaluate(() => `${window.game.dialogue.i}:${window.game.textbox.node?.text ?? ''}`);
const advance = async () => { const before = await key(); for (let i = 0; i < 4; i++) { await pressC(); const now = await key(); const running = await page.evaluate(() => window.game.dialogue.running); if (now !== before || !running) return; } };
const st = () => page.evaluate(() => { const g = window.game; const e = id => g.entities.find(x => x.id === id && !x.dead);
  const ent = id => { const a = e(id); return a ? { x: Math.round(a.x), y: Math.round(a.y), v: a.visible, f: a.facing, pose: a.pose || null } : null; };
  return { map: g.mapId, dialogue: g.dialogue.running, text: g.textbox.node?.text?.slice(0, 70), speaker: g.textbox.node?.speaker, portrait: g.textbox.node?.portrait, px: Math.round(g.player.x), py: Math.round(g.player.y), pf: g.player.facing,
    camx: Math.round(g.camera.x), camy: Math.round(g.camera.y), bgm: JSON.stringify([g.sound.bgmName, g.sound.currentBgm, g.sound.bgmId]),
    j: ent('ship_junhee'), yj: ent('ship_yongjun'), yc: ent('ship_youngcle'), ob: ent('ship_obangsun'), nr: ent('ship_naram'), cage: ent('ship_cage'), open: ent('ship_cage_open'), cannon: ent('ship_cannon'), ball1: ent('ship_ball1'), ball2: ent('ship_ball2'),
    flag: !!g.flags.ship_intro_done, booms: (g.booms || []).length, emotes: ['player', 'gyeongsub', 'ppaman'].map(id => !!(id === 'player' ? g.player : e(id))?.emote) }; });
const untilText = async (needle, max = 60) => { for (let i = 0; i < max; i++) { const s = await st(); if ((s.text || '').includes(needle)) return s; if (!s.dialogue) { await page.waitForTimeout(300); continue; } await advance(); } return null; };
const waitFor = async (fn, ms = 8000) => page.waitForFunction(fn, null, { timeout: ms }).then(() => true).catch(() => false);
try {
  await page.goto('http://localhost:8000/?qa=ship_control');
  await page.waitForFunction(() => window.game && window.game.mapId === 'youngcle20', null, { timeout: 25000 });
  await page.evaluate(() => { const snd = window.game.sound; window.__sfx = []; const orig = snd.sfx.bind(snd); snd.sfx = (name, opts) => { window.__sfx.push(name); return orig(name, opts); }; });
  // ① 입장 느낌표
  const bang = await waitFor(() => window.game.player.emote, 6000); await cap('01_bang');
  let s = await st(); check(bang && s.emotes.every(Boolean) && !s.bgm.includes('pandora'), '입장 뒤 셋 다 느낌표·브금 없음 ' + JSON.stringify([s.emotes, s.bgm]));
  // ② 카메라가 로고(480,300)로 → 쥰희 4줄(앞을 보고)
  s = await untilText('어서 나와라'); await cap('02_junhee');
  check(s && s.speaker === '쥰희' && Math.abs(s.camx - 240) <= 2 && Math.abs(s.camy - 121) <= 2 && s.j.f === 'up' && s.yj.f === 'up', '카메라 로고 가운데·쥰희 “어서 나와라 시발롬아”·둘 다 앞을 봄 ' + JSON.stringify([s?.camx, s?.camy, s?.j, s?.yj]));
  s = await untilText('맞짱이다'); check(!!s, '쥰희 “맞짱이다 개새끼”');
  s = await untilText('...?'); check(!!s, '쥰희 “...?”');
  await advance();
  // ③ 대포: 카메라 왼쪽 벽, 대포 슬라이드(scrape) → 발사(boom·연기) → 포탄 → 쥰희 벽(900)·진동·impact → 꾸엑 → 눕기
  const out = await waitFor(() => { const c = window.game.entities.find(x => x.id === 'ship_cannon'); return c && c.visible && c.x >= 8; }, 6000);
  s = await st(); await cap('03_cannon');
  check(out && s.camx >= 0 && s.camx <= 40 && s.cannon.x === 8, '왼쪽 벽에서 대포가 드르르륵 나온다(x8, 카메라가 왼쪽 벽에서 천천히 흐름) ' + JSON.stringify([s.camx, s.cannon]));
  const smoked = await waitFor(() => window.game.booms.length > 0, 5000);
  await page.waitForTimeout(60); await cap('04_fire'); s = await st();
  check(smoked && s.booms >= 1 && !!s.ball1, '발사: 연기 이펙트 + 포탄 생성 ' + JSON.stringify([s.ball1, s.booms]));
  s = await untilText('꾸엑'); await cap('05_junhee_wall');
  check(s && s.j.x === 900 && s.j.y === 278 && !s.ball1, '쥰희가 오른쪽 벽(900)까지 날아가 쾅, 포탄 사라짐, “꾸엑” ' + JSON.stringify([s?.j, s?.ball1]));
  const sfx1 = await page.evaluate(() => window.__sfx.slice());
  check(['scrape', 'boom', 'cannon_puff', 'impact'].every(n => sfx1.includes(n)), '대포 소리: 드르르륵·발사·연기·충격 ' + JSON.stringify(sfx1.filter(n => ['scrape', 'boom', 'cannon_puff', 'impact'].includes(n))));
  await advance();
  s = await untilText('어?! 형'); check(s && s.j.pose === 'lying', '쥰희 기절(눕기) → 용준 “어?! 형 !!!” ' + JSON.stringify([s?.j?.pose, s?.speaker]));
  await advance();
  const hit2 = await waitFor(() => { const y = window.game.entities.find(x => x.id === 'ship_yongjun'); return y && y.x >= 900 && y.pose === 'lying'; }, 9000);
  await page.waitForTimeout(300); s = await st(); await cap('06_yongjun_wall');
  check(hit2 && s.yj.x === 900 && s.yj.pose === 'lying' && !s.ball2, '용준도 가운데서 온 포탄에 맞아 쥰희 옆에 쓰러짐(900, 눕기), 포탄 사라짐 ' + JSON.stringify([s.yj, s.ball2]));
  // ④ 셋 가운데로 → 영클 ㅋㅋ → 브금 → 앞으로 내려오고 뒷걸음
  s = await untilText('ㅋㅋ'); check(s && s.speaker === '영클' && s.portrait === 'youngcle_tv_laugh' && s.px === 468 && s.py === 330, '셋이 가운데(468,330)로 → 영클 “ㅋㅋ”(웃는 초상) ' + JSON.stringify([s?.px, s?.py, s?.portrait]));
  await advance();
  const ycIn = await waitFor(() => { const y = window.game.entities.find(x => x.id === 'ship_youngcle'); return y && y.visible && y.y >= 236; }, 14000);
  await page.waitForTimeout(2400); s = await st(); await cap('07_youngcle_enter');
  check(ycIn && s.yc.x === 470 && s.yc.y === 236 && s.bgm.includes('storage_show') && s.py === 370 && s.pf === 'up', '영클이 앞으로 내려오고(470,236) 브금 storage_show, 일행 뒷걸음(y370)·위를 봄 ' + JSON.stringify([s.yc, s.bgm, s.py, s.pf]));
  s = await untilText('반갑노'); check(!!s, '“반갑노 게이들아”');
  s = await untilText('출구를 알고있다'); await advance(); await page.waitForTimeout(300); s = await st();
  check(s.emotes.every(Boolean), '“출구를 알고있다” 뒤 모두 느낌표 ' + JSON.stringify(s.emotes));
  s = await untilText('김형섭 아니지'); await page.waitForTimeout(400); await cap('08a_glare'); check(s && s.portrait === 'youngcle_tv_glare', '“너 김형섭 아니지?” 째려보는 초상 ' + s?.portrait);
  s = await untilText('악당'); await cap('08_akdang');
  check(s && (s.text || '').includes('{c=red}악당{/c}'), '“악당” 빨간 글자 ' + JSON.stringify(s?.text));
  s = await untilText('김형섭에서 파생된'); check(!!s, '영클 “김형섭에서 파생된 착한 자아”(수정 대사)');
  s = await untilText('보라색 코드'); await advance(); await page.waitForTimeout(300); s = await st();
  check(s.emotes[0], '“보라색 코드” 뒤 요플래 느낌표 ' + JSON.stringify(s.emotes));
  s = await untilText('갖고있나보군'); await advance();
  // ⑤ 영클 상승 → 일행 왼쪽(400,292)·오른쪽 봄 → 영클 오른쪽(556,300)에서 훅훅훅 하강(ember·whoosh)
  const up = await waitFor(() => { const y = window.game.entities.find(x => x.id === 'ship_youngcle'); return y && (!y.visible || y.y < 0); }, 5000);
  check(up, '영클이 하늘로 쭉 올라가 사라짐');
  const descended = await waitFor(() => { const y = window.game.entities.find(x => x.id === 'ship_youngcle'); return y && y.visible && y.y >= 300 && y.x === 556; }, 24000);
  await page.waitForTimeout(2400); s = await st(); await cap('09_youngcle_right');
  const sfx2 = await page.evaluate(() => window.__sfx.slice());
  check(descended && s.px === 400 && s.pf === 'right' && s.yc.f === 'left' && sfx2.filter(n => n === 'ember').length >= 3 && sfx2.includes('rocket'), '일행 중앙 살짝 왼쪽(400)에서 오른쪽 봄, 영클 오른쪽(556,300)으로 끊김 없이 천천히 내려와 착지(ember·whoosh)·상승 rocket ' + JSON.stringify([s.px, s.pf, s.yc, sfx2.filter(n => n === 'ember').length]));
  s = await untilText('편집노조'); const mosaic = await page.evaluate(() => (window.game.textbox.tokens || []).filter(t => t.mosaic).map(t => [t.ch, t.mosaic])); await page.waitForTimeout(1500); await cap('09a_mosaic'); check(!!s && JSON.stringify(mosaic) === '[["노",2]]', '“편집노조”의 노만 약한 모자이크(block 2) ' + JSON.stringify(mosaic));
  s = await untilText('나와라'); check(s && s.portrait === 'youngcle_tv_taunt', '“나와라”'); await advance();
  // ⑥ 버튼 → 철창 하강(chain_extend·흔들림) → 착지 → 문 열림(locker) → 오방순(556,236)·나람(556,364) 걸어 나와 왼쪽 봄
  const swing = await waitFor(() => { const c = window.game.entities.find(x => x.id === 'ship_cage'); return c && c.visible && c.def.oscillate; }, 5000);
  await page.waitForTimeout(1500); await cap('10_cage_drop');
  // 철창은 카메라 안에서, 오방순·나람을 태운 채 내려온다(사용자 “갑자기 생기는 느낌”, “뚫리면서 나오는 느낌”)
  const ride = await page.evaluate(() => { const g = window.game; const c = g.entities.find(x => x.id === 'ship_cage'), o = g.entities.find(x => x.id === 'ship_obangsun'), n = g.entities.find(x => x.id === 'ship_naram');
    return { cx: Math.round(c.x), cy: Math.round(c.y), camx: Math.round(g.camera.x), camy: Math.round(g.camera.y), inView: c.x >= g.camera.x && c.x + 100 <= g.camera.x + 480 && c.y + 178 > g.camera.y, ov: o.visible, nv: n.visible, oInside: o.x > c.x && o.x < c.x + 100 && o.y > c.y && o.y < c.y + 178, nInside: n.x > c.x && n.x < c.x + 100 && n.y > c.y && n.y < c.y + 178 }; });
  check(ride.inView && ride.ov && ride.nv && ride.oInside && ride.nInside, '내려오는 철창이 화면 안에 있고 오방순·나람이 그 안에 타고 있다 ' + JSON.stringify(ride));
  const landed = await waitFor(() => { const c = window.game.entities.find(x => x.id === 'ship_cage_open'); return c && c.visible; }, 12000);
  s = await st(); await cap('11_cage_open');
  check(swing && landed && s.open.y === 194 && (!s.cage || !s.cage.v), '철창이 흔들리며 내려와(chain_extend) 착지 → 문 열린 철창(y194) ' + JSON.stringify([swing, landed, s.open, s.cage]));
  const outTwo = await waitFor(() => { const g = window.game; const o = g.entities.find(x => x.id === 'ship_obangsun'), n = g.entities.find(x => x.id === 'ship_naram'); return o && n && o.x === 556 && o.y === 236 && n.x === 556 && n.y === 364; }, 20000);
  await page.waitForTimeout(300); s = await st(); await cap('12_experiments');
  check(outTwo && s.ob.f === 'left' && s.nr.f === 'left' && s.yc.f === 'left', '오방순(위 556,236)·나람(아래 556,364)이 천천히 걸어 나와 영클과 함께 왼쪽을 봄 ' + JSON.stringify([s.ob, s.nr]));
  const nrSize = await page.evaluate(() => { const n = window.game.entities.find(x => x.id === 'ship_naram'); return [n.sprite.fw, n.def.sprite]; });
  check(nrSize[0] === 96 && nrSize[1] === 'naram_giant', '나람은 거대 시트(96px 셀) ' + JSON.stringify(nrSize));
  const obRows = await page.evaluate(() => { const s = window.game.entities.find(x => x.id === 'ship_obangsun').sprite; const d = c => c.toDataURL(); return { lr: d(s.left[0]) !== d(s.right[0]), ud: d(s.up[0]) !== d(s.down[0]), lu: d(s.left[0]) !== d(s.up[0]) }; });
  check(obRows.lr && obRows.ud && obRows.lu, '오방순 시트 행: 왼쪽·오른쪽·위·아래가 서로 다른 그림(rowOrder) ' + JSON.stringify(obRows));
  s = await untilText('방순아 나람아'); check(!!s, '“자 방순아 나람아. 갈까”');
  s = await untilText('흐어어어'); const twoLines = await page.evaluate(() => (window.game.textbox.tokens || []).some(t => t.ch === '\n')); await page.waitForTimeout(1200); await cap('12a_obangsun_line');
  check(s && s.speaker === '오방순' && s.portrait === 'obangsun' && twoLines, '오방순 “흐어어어, …” — \\ _ / 는 아랫줄 ' + JSON.stringify([s?.speaker, s?.portrait, twoLines]));
  s = await untilText('히요오오옹'); check(s && s.speaker === '나람이', '나람 “아이구 형님들 …”');
  s = await untilText('즐'); check(s && s.portrait === 'youngcle_tv_taunt', '영클 “즐”'); await cap('13_jeul');
  await advance();
  // ⑦ 전투 시작 연출(battle_start·소용돌이·줌·검게) → 돌아와 대치 상태·플래그
  const started = await waitFor(() => window.__sfx.includes('battle_start'), 4000);
  await page.waitForTimeout(700); await cap('14_battle_start');
  const done = await waitFor(() => !window.game.dialogue.running && window.game.flags.ship_intro_done, 12000);
  await page.waitForTimeout(600); s = await st(); await cap('15_after');
  check(started && done && s.flag && s.yc.x === 556 && s.ob.y === 236 && s.nr.y === 364 && s.j.pose === 'lying' && s.bgm.includes('storage_show'), '전투 시작 연출 뒤 대치 상태로 돌아옴·플래그·브금 ' + JSON.stringify([started, done, s.flag, s.bgm]));
  // ⑧ 재입장: 연출 없이 같은 대치 상태
  await page.goto('http://localhost:8000/?qa=ship_control_after');
  await page.waitForFunction(() => window.game && window.game.mapId === 'youngcle20' && !window.game.dialogue.running, null, { timeout: 25000 });
  await page.waitForTimeout(800); s = await st(); await cap('16_reenter');
  check(!s.dialogue && s.j?.x === 900 && s.j.pose === 'lying' && s.yj?.pose === 'lying' && s.yc?.x === 556 && s.yc.v && s.ob?.v && s.nr?.v && s.open?.v && !s.cannon && !s.cage, '재입장: 쥰희·용준 벽 앞에 누움, 영클·오방순·나람 대치, 철창 열림, 대포 없음 ' + JSON.stringify([s.j, s.yc, s.open, s.cannon, s.cage]));
  check(errors.length === 0, '페이지 오류 없음 ' + JSON.stringify(errors.slice(0, 3)));
} catch (e) { fails += 1; console.log('CRASH', e.message); await cap('crash'); }
console.log('fails=' + fails);
await browser.close();
