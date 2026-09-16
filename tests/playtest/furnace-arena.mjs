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
    tv: tv ? { x: Math.round(tv.x), y: Math.round(tv.y), phase: tb?.phase, expr: tb?.expression } : null, cage: cage ? { x: Math.round(cage.x), y: Math.round(cage.y), visible: cage.visible, sway: !!cage.def.oscillate } : null, junhee: j ? { visible: j.visible, facing: j.facing, x: Math.round(j.x), y: Math.round(j.y) } : null,
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
  // ② 도착 연출: 브금 꺼짐, 천천히 들어오고 느낌표
  await page.waitForFunction(() => window.game.dialogue.running, null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(2600); await cap('enter'); s = await st();
  check(s.dialogue && !s.bgm.includes('pandora') && !s.bgm.includes('storage_show'), '연출 시작: 브금 꺼짐 ' + s.bgm);
  s = await untilText('무섭네요'); check(!!s, '억빠맨 “와 ㅈㄴ 무섭네요”');
  s = await untilText('후후후'); check(!!s, '영클 “후후후”'); await advance();
  // TV 가 내려온다(1.2초 뒤 중간 프레임) → 켜짐 → 영클 브금
  // 느낌표·카메라 뒤 TV 가 내려오기 시작한다 — 화면에 반쯤 들어온 순간을 잡는다
  await page.waitForFunction(() => { const tv = window.game.entities.find(e => e.id === 'youngcle_tv'); return tv && tv.y > -60 && tv.y < 100; }, null, { timeout: 8000 }).catch(() => {});
  await cap('tv_down'); s = await st();
  check(s.tv && s.tv.y > -60 && s.tv.y < 100 && inView(s, { x: s.tv.x, y: s.tv.y, w: 288, h: 176 }), 'TV 가 모니터암을 타고 내려오는 중(화면 안) ' + JSON.stringify([s.tv, s.camy]));
  s = await untilText('반갑노'); check(!!s && s.tv.phase === 'on' && s.tv.expr === 'greet' && s.bgm.includes('storage_show'), 'TV 켜지고 “반갑노 게이들아”(인사) + 영클 브금 ' + JSON.stringify([s?.tv, s?.bgm]));
  await cap('greet');
  s = await untilText('이걸 보시라'); check(!!s, '“먼저 이걸 보시라!”'); await advance();
  // 철창이 덜렁 내려와 흔들린다(카메라 위)
  await page.waitForTimeout(1900); await cap('cage'); s = await st();
  check(s.cage && s.cage.visible && s.cage.y > -130 && s.cage.y < -100 && s.cage.sway && s.junhee.visible && inView(s, { x: s.cage.x, y: s.cage.y + 200, w: 96, h: 160 }), '밧줄 철창(쥰희·용준)이 내려와 매달려 흔들린다 ' + JSON.stringify([s.cage, s.junhee, s.camy]));
  s = await untilText('살려줘 씨발'); check(!!s, '쥰희 “살려줘 씨발”');
  s = await untilText('살려줘요홍홍'); check(!!s && s.tv.x < 200 && s.tv.phase === 'on' && s.tv.expr === 'taunt', 'TV 가 철창 왼쪽 옆으로 내려와 조롱 ' + JSON.stringify(s?.tv)); await cap('tv_beside_cage');
  s = await untilText('좆같은 영클'); check(!!s, '쥰희 “이 좆같은 영클”'); await advance(); await page.waitForTimeout(500); s = await st();
  check(s.junhee && s.junhee.facing === 'left', '쥰희가 왼쪽(TV)을 보며 철창을 찬다 ' + JSON.stringify(s.junhee)); await cap('kick');
  s = await untilText('느금마'); check(!!s, '쥰희 “느금마”');
  s = await untilText('조작 패널이 보이는가'); check(!!s && s.tv.x === 336 && s.tv.y === 100, 'TV 가 접혔다 일행 앞으로 다시 내려와 규칙 설명 ' + JSON.stringify(s?.tv)); await cap('rules');
  s = await untilText('밧줄은 내려갈거고'); check(!!s, '“저 밧줄은 내려갈거고”'); await advance(); await page.waitForTimeout(700); s = await st(); check(s.camy < 60, '밧줄로 카메라 이동 ' + s.camy);
  s = await untilText('오홍홍홍'); check(!!s, '“패널을 잡으렴 게이들아 오홍홍홍”');
  for (let i = 0; i < 30; i++) { s = await st(); if (!s.dialogue) break; await advance(); }
  await page.waitForFunction(() => !window.game.dialogue.running && window.game.flags.furnace_arena_intro_done, null, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(800); await cap('end'); s = await st();
  check(!s.dialogue && s.flag && s.tv.phase === 'on' && s.tv.x > 400 && s.cage.visible && s.bgm.includes('storage_show'), '연출 끝: TV 는 살짝 오른쪽에서 켜진 채 대기, 철창 그대로, 영클 브금, 조작 복귀 ' + JSON.stringify([s.flag, s.tv, s.cage.visible]));
  // ③ 재입장(QA youngcle18_after): 철창·TV 유지
  await page.goto('http://localhost:8000/?qa=youngcle18_after');
  await page.waitForFunction(() => window.game && window.game.mapId === 'youngcle18' && !window.game.dialogue.running, null, { timeout: 25000 });
  await page.waitForTimeout(800); s = await st(); await cap('after');
  check(s.cage.visible && s.junhee.visible && s.tv.phase === 'on' && s.bgm.includes('storage_show'), '연출 뒤 재입장: 철창·쥰희·용준·TV 그대로 ' + JSON.stringify([s.cage, s.tv]));
} catch (e) { fails += 1; console.log('CRASH', e.message); }
check(errors.length === 0, 'pageerror 없음 ' + JSON.stringify(errors));
console.log(`fails=${fails}`);
await browser.close();
