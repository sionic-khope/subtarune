// 엄청대박인배 다리길·조종실(BUILD201): QA furnace_after(광장, 다리 놓인 뒤) → 위 통로 → youngcle19 다리 위로 쭉 → 철문 앞 정지 → C “엄청대박인배 조종실 이라고 적혀있다. 들어갈까?” 예/아니오
//   → 아니오·X 는 그대로 → 예 → youngcle20 조종실(영클 비행 장치 순찰·소품·가운데 홀로그램 탁자에 막힘) → 아래로 나가면 철문 앞 → 다리 아래로 광장 위 통로. 장면마다 프레임.
//   실행: tests/playtest/run.sh ship-bridge
import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright-core';
const shots = process.env.SHOT_DIR; fs.mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = []; page.on('pageerror', e => errors.push(e.message));
let fails = 0;
const check = (ok, msg) => { if (!ok) { fails += 1; console.log('FAIL', msg); } else console.log('ok', msg); };
const cap = async n => { await page.screenshot({ path: path.join(shots, 'ship_' + n + '.png') }); };
const st = () => page.evaluate(() => { const g = window.game; const e = id => g.entities.find(x => x.id === id && !x.dead);
  const tile = (x, y) => (g.map.rows[Math.floor(y / 32)] || '')[Math.floor(x / 32)];
  return { map: g.mapId, dialogue: g.dialogue.running, box: g.textbox.state, choice: g.textbox.choiceIndex, text: g.textbox.node?.text?.slice(0, 60), px: Math.round(g.player.x), py: Math.round(g.player.y), facing: g.player.facing,
    tile: tile(g.player.x + 12, g.player.y + 8), camx: Math.round(g.camera.x), camy: Math.round(g.camera.y), bgm: JSON.stringify([g.sound.bgmName, g.sound.currentBgm, g.sound.bgmId]),
    gate: !!e('ship_gate'), hull: !!e('ship_hull'), rails: !!e('ship_rail_l') && !!e('ship_rail_r'), fences: [6, 7, 8].map(i => !!e('lava_fence_' + i)), bridgeTiles: [2, 3, 4, 5, 6, 7].map(r => (g.map.rows[r] || '').slice(14, 17)),
    party: ['gyeongsub', 'ppaman'].map(id => !!e(id)), transitioning: g.transitioning }; });
const hold = async (key, until, max = 12000) => { await page.keyboard.down(key); await page.waitForFunction(until, null, { timeout: max }).catch(() => {}); await page.keyboard.up(key); await page.waitForTimeout(150); };
try {
  // ① 광장(연출 뒤): 다리 자리 타일 F, 앞 울타리 세 칸 없음 → 위 통로 끝까지 걸어 다리길로
  await page.goto('http://localhost:8000/?qa=furnace_after');
  await page.waitForFunction(() => window.game && window.game.mapId === 'youngcle18' && !window.game.dialogue.running, null, { timeout: 25000 });
  await page.waitForTimeout(500);
  let s = await st();
  check(s.bridgeTiles.every(t => t === 'FFF') && s.fences.every(f => !f), '광장 재입장: 다리 자리 타일 F·앞 울타리 3칸 없음 ' + JSON.stringify([s.bridgeTiles, s.fences]));
  await hold('ArrowUp', () => window.game.mapId === 'youngcle19', 15000);
  s = await st(); check(s.map === 'youngcle19' && s.px === 228 && s.py === 904 && s.facing === 'up', '위 통로 끝 → 다리길 아래 스폰(228,904) ' + JSON.stringify([s.map, s.px, s.py]));
  await page.waitForTimeout(700); await cap('01_bridge_bottom'); s = await st();
  check(s.tile === 'N' && s.gate && s.hull && s.rails && s.bgm.includes('pandora_palace') && s.party.every(Boolean), '다리 바닥 N·철문·선체 벽·난간·브금·동료 ' + JSON.stringify([s.tile, s.gate, s.hull, s.rails, s.bgm]));
  // ② 다리 위로 쭉: 철문 히트박스(밑변 192)에 막혀 y192 에서 선다
  const t0 = Date.now();
  await hold('ArrowUp', () => window.game.player.y <= 196, 20000);
  s = await st(); check(s.py >= 190 && s.py <= 196 && s.px === 228 && s.map === 'youngcle19', '다리 끝 철문 앞에서 정지(y≈192, x 그대로) ' + JSON.stringify([s.px, s.py, Math.round((Date.now() - t0) / 100) / 10 + 's']));
  await page.waitForTimeout(400); await cap('02_gate');
  // ③ C → 명판 대사 + 예/아니오. 아니오(→ 확정) → 그대로. 다시 C → X(취소=아니오) → 그대로
  await page.keyboard.press('KeyC'); await page.waitForTimeout(250);
  for (let i = 0; i < 40 && (await st()).box !== 'choice'; i++) await page.waitForTimeout(100);
  s = await st(); check(s.dialogue && s.box === 'choice' && (s.text || '').includes('엄청대박인배 조종실') && (s.text || '').includes('들어갈까'), '철문 C: “엄청대박인배 조종실 이라고 적혀있다. 들어갈까?” 선택지 ' + JSON.stringify([s.box, s.text]));
  const labels = await page.evaluate(() => window.game.textbox.choice?.options?.map(o => o.label));
  check(JSON.stringify(labels) === '["예","아니오"]' && s.choice === 0, '선택지 예/아니오(기본 예) ' + JSON.stringify([labels, s.choice]));
  await cap('03_prompt');
  await page.keyboard.press('ArrowRight'); await page.waitForTimeout(150); s = await st(); check(s.choice === 1, '→ 로 아니오 선택 ' + s.choice);
  await page.keyboard.press('KeyC'); await page.waitForTimeout(500); s = await st();
  check(!s.dialogue && s.map === 'youngcle19' && s.py <= 196, '아니오 → 대사 닫히고 그 자리 그대로 ' + JSON.stringify([s.dialogue, s.map, s.py]));
  await page.keyboard.press('KeyC'); await page.waitForTimeout(250);
  for (let i = 0; i < 40 && (await st()).box !== 'choice'; i++) await page.waitForTimeout(100);
  await page.waitForTimeout(250); await page.keyboard.press('KeyX'); await page.waitForTimeout(500); s = await st();
  check(!s.dialogue && s.map === 'youngcle19', 'X(취소) 도 아니오와 같다 ' + JSON.stringify([s.dialogue, s.map]));
  // ④ 예 → 검게 → 조종실 철문 앞 스폰
  await page.keyboard.press('KeyC'); await page.waitForTimeout(250);
  for (let i = 0; i < 40 && (await st()).box !== 'choice'; i++) await page.waitForTimeout(100);
  await page.waitForTimeout(200); await page.keyboard.press('KeyC');
  await page.waitForFunction(() => window.game.mapId === 'youngcle20' && !window.game.dialogue.running && !window.game.transitioning, null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(800); s = await st();
  check(s.map === 'youngcle20' && s.px === 468 && s.py === 488 && s.facing === 'up' && s.party.every(Boolean), '예 → 조종실 철문 앞 스폰(468,488) 동료 함께 ' + JSON.stringify([s.map, s.px, s.py, s.party]));
  await cap('04_control_room');
  // ⑤ 영클 비행 장치: 순찰로 움직이고(자리·방향 바뀜), 서 있어도 프레임이 돈다(hover), 6px 떠 있다
  const yc = () => page.evaluate(() => { const e = window.game.entities.find(x => x.id === 'ship_youngcle'); return e ? { x: Math.round(e.x), y: Math.round(e.y), facing: e.facing, frame: e.frame, sprite: e.def.sprite, hover: !!(e.hoverT > 0), moving: e.moving, solid: e.solid } : null; });
  const y1 = await yc(); await page.waitForTimeout(1200); const y2 = await yc();
  check(y1 && y2 && y1.sprite === 'youngcle_hover' && (y1.x !== y2.x || y1.y !== y2.y) && y2.hover && !y2.solid, '영클 비행 장치가 순찰 중(자리 바뀜·hover 시계) ' + JSON.stringify([y1, y2]));
  const props = await page.evaluate(() => ['ship_main_screen', 'ship_helm', 'ship_holo', 'ship_console_0', 'ship_console_7', 'ship_rack_0', 'ship_rack_5', 'ship_reactor', 'ship_tv', 'ship_strip_0'].map(id => !!window.game.entities.find(x => x.id === id && !x.dead)));
  check(props.every(Boolean), '조종실 소품(대형 화면·조타 콘솔·홀로그램 탁자·콘솔 8·서버 랙 6·반응로·TV·유도등) ' + JSON.stringify(props));
  await page.waitForTimeout(1500); await cap('05_control_room_2');
  // 대사 중엔(선택지 등) 순찰이 멈추고 그래도 hover 프레임은 돈다 — 조작 없이 hover 만 확인: 순찰을 잠시 끄고 프레임 변화를 본다
  const idle = await page.evaluate(async () => { const e = window.game.entities.find(x => x.id === 'ship_youngcle'); const saved = e.def.patrol; e.def.patrol = null; const f0 = e.frame, t0 = e.hoverT;
    await new Promise(r => setTimeout(r, 400)); const out = { moving: e.moving, frameChanged: e.frame !== f0 || e.animPhase > 0.5, hoverAdvanced: e.hoverT > t0 }; e.def.patrol = saved; return out; });
  check(!idle.moving && idle.frameChanged && idle.hoverAdvanced, '서 있어도 불꽃 프레임·오르내림이 돈다 ' + JSON.stringify(idle));
  // ⑥ 가운데로 올라가면 홀로그램 탁자(y294~322)에 막힌다 → 옆으로 돌아 조타 콘솔 앞까지
  await hold('ArrowUp', () => window.game.player.y <= 326, 6000);
  s = await st(); check(s.py >= 320 && s.py <= 326 && s.px === 468, '가운데 홀로그램 탁자에 막힘(y≈322) ' + JSON.stringify([s.px, s.py]));
  await cap('06_holo_block');
  await hold('ArrowLeft', () => window.game.player.x <= 380, 5000);
  await hold('ArrowUp', () => window.game.player.y <= 126, 8000);
  s = await st(); check(s.py >= 120 && s.py <= 126 && s.px <= 404, '왼쪽 통로로 돌아 조타 콘솔 앞(y≈122)까지 ' + JSON.stringify([s.px, s.py]));
  await cap('07_helm');
  // ⑦ 아래로 나가면 다리길 철문 앞(228,232) 아래를 봄 → 다리 아래 끝까지 → 광장 위 통로(484,40)
  await hold('ArrowDown', () => window.game.player.y >= 420, 8000);
  await hold('ArrowRight', () => window.game.player.x >= 468, 5000);
  await hold('ArrowDown', () => window.game.mapId === 'youngcle19', 15000);
  s = await st(); check(s.map === 'youngcle19' && s.px === 228 && s.py === 232 && s.facing === 'down', '조종실 아래로 나가면 철문 앞(228,232) ' + JSON.stringify([s.map, s.px, s.py, s.facing]));
  await page.waitForTimeout(500); await cap('08_back_gate');
  await hold('ArrowDown', () => window.game.mapId === 'youngcle18', 20000);
  s = await st(); check(s.map === 'youngcle18' && s.px === 484 && s.py === 40 && !s.dialogue, '다리 아래 끝 → 광장 위 통로(484,40), 연출 재발 없음 ' + JSON.stringify([s.map, s.px, s.py, s.dialogue]));
  await hold('ArrowDown', () => window.game.player.y >= 296, 8000);
  s = await st(); check(s.map === 'youngcle18' && s.py >= 296, '다리를 건너 광장으로 내려온다 ' + JSON.stringify([s.px, s.py]));
  await page.waitForTimeout(400); await cap('09_back_arena');
  // ⑧ QA 바로가기 둘
  for (const [qa, map] of [['ship_bridge', 'youngcle19'], ['ship_control', 'youngcle20']]) {
    await page.goto('http://localhost:8000/?qa=' + qa);
    await page.waitForFunction(m => window.game && window.game.mapId === m && !window.game.dialogue.running, map, { timeout: 25000 }).catch(() => {});
    s = await st(); check(s.map === map && s.party.every(Boolean), 'QA ' + qa + ' → ' + map + ' ' + JSON.stringify([s.map, s.px, s.py]));
  }
  check(errors.length === 0, '페이지 오류 없음 ' + JSON.stringify(errors.slice(0, 3)));
} catch (e) { fails += 1; console.log('CRASH', e.message); await cap('crash'); }
console.log('fails=' + fails);
await browser.close();
