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
  // 게임을 통과한 뒤 조작 패널을 다시 만져도 색깔 게임으로 들어가지 않는다(사용자 지적)
  await hold('ArrowLeft', () => window.game.player.x <= 214, 8000);
  await page.keyboard.press('ArrowUp'); await page.waitForTimeout(150);
  await page.keyboard.press('KeyC'); await page.waitForTimeout(900);
  const panel = await page.evaluate(() => ({ scene: !!window.game.scene3d, dialogue: window.game.dialogue.running, map: window.game.mapId, fade: window.game.fade?.alpha ?? 0, px: Math.round(window.game.player.x), facing: window.game.player.facing }));
  check(!panel.scene && !panel.dialogue && panel.map === 'youngcle18' && !(panel.fade > 0.5), '패널 앞에서 C: 색깔 게임 재진입 없음·대사 없음·화면 그대로 ' + JSON.stringify(panel));
  await hold('ArrowRight', () => window.game.player.x >= 484, 8000);
  await hold('ArrowUp', () => window.game.mapId === 'youngcle19', 15000);
  s = await st(); check(s.map === 'youngcle19' && s.px === 228 && s.py === 904 && s.facing === 'up', '위 통로 끝 → 다리길 아래 스폰(228,904) ' + JSON.stringify([s.map, s.px, s.py]));
  await page.waitForTimeout(700); await cap('01_bridge_bottom'); s = await st();
  check(s.tile === 'N' && s.gate && s.hull && s.rails && !s.bgm.includes('pandora_palace') && s.party.every(Boolean), '다리 바닥 N·철문·선체 벽·난간·브금 없음(사용자)·동료 ' + JSON.stringify([s.tile, s.gate, s.hull, s.rails, s.bgm]));
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
  await page.waitForFunction(() => window.game.mapId === 'youngcle20', null, { timeout: 8000 }).catch(() => {});
  // 예 → 조종실 도착과 함께 입장 연출이 바로 시작돼야 한다(사용자 “들어왔는데 이벤트 연출도 안 나옴” — 철문 스크립트가 맵을 바꾸는 동안엔 도착 스크립트가 건너뛰어졌다 → {map, enter:true})
  const intro = await page.waitForFunction(() => window.game.mapId === 'youngcle20' && window.game.dialogue.running && window.game.player.emote, null, { timeout: 6000 }).then(() => true).catch(() => false);
  s = await st(); check(s.map === 'youngcle20' && intro && s.party.every(Boolean) && !s.bgm.includes('pandora'), '예 → 조종실 도착과 함께 입장 연출 시작(느낌표), 동료 함께, 브금 없음 ' + JSON.stringify([s.map, intro, s.party, s.bgm]));
  const untilText = async (needle, max = 30) => { for (let i = 0; i < max; i++) { const t = await page.evaluate(() => window.game.textbox.node?.text || ''); if (t.includes(needle)) return true; if (!(await page.evaluate(() => window.game.dialogue.running))) { await page.waitForTimeout(300); continue; } await page.keyboard.press('KeyC'); await page.waitForTimeout(250); } return false; };
  check(await untilText('어서 나와라'), '연출이 진행된다(쥰희 “어서 나와라 …”)'); await cap('04_control_room');
  // ⑤ 이후 동선은 연출 뒤 상태(QA ship_control_after): 영클은 로고 오른쪽(556,300)에서 왼쪽을 보고 떠 있고 서 있어도 프레임이 돈다(hover)
  await page.goto('http://localhost:8000/?qa=ship_control_after');
  await page.waitForFunction(() => window.game && window.game.mapId === 'youngcle20' && !window.game.dialogue.running, null, { timeout: 25000 });
  await page.waitForTimeout(500);
  const yc = () => page.evaluate(() => { const e = window.game.entities.find(x => x.id === 'ship_youngcle'); return e ? { x: Math.round(e.x), y: Math.round(e.y), facing: e.facing, frame: e.frame, phase: e.animPhase, hoverT: e.hoverT || 0, sprite: e.def.sprite, v: e.visible } : null; });
  const y1 = await yc(); const down = await page.evaluate(() => { const e = window.game.entities.find(x => x.id === 'ship_youngcle_down'); return e ? { v: e.visible, x: Math.round(e.x), img: !!e.image } : null; });
  check(y1 && !y1.v && down && down.v && down.img, '전투 뒤(BUILD209): 영클 NPC 는 숨고 얼굴 박힌 영클 소품이 로고 오른쪽에 보인다 ' + JSON.stringify([y1, down]));
  const props = await page.evaluate(() => ['ship_main_screen', 'ship_helm', 'ship_holo', 'ship_logo', 'ship_console_0', 'ship_console_5', 'ship_conduit_l', 'ship_conduit_r', 'ship_trunk_l', 'ship_trunk_r', 'ship_plasma_0', 'ship_plasma_5', 'ship_reactor', 'ship_tv'].map(id => !!window.game.entities.find(x => x.id === id && !x.dead)));
  const strips = await page.evaluate(() => window.game.entities.filter(x => /ship_strip/.test(x.id || '')).length);
  check(props.every(Boolean) && strips === 0, '조종실 소품(대형 화면·조타 콘솔·홀로그램 탁자·바닥 로고·콘솔 6·플라즈마 배관 2·케이블 트렁크 2·플라즈마 케이블 6·반응로·TV), 연두 유도등 없음 ' + JSON.stringify([props, strips]));
  await page.waitForTimeout(800); await cap('05_control_room_2');
  // ⑥ 가운데(로고, 걷는 장식)를 지나 조타 콘솔 앞(y≈122)까지 곧장 — 대치 중인 영클·오방순·나람은 막지 않는다
  await hold('ArrowUp', () => window.game.player.y <= 126, 8000);
  s = await st(); check(s.py >= 120 && s.py <= 126 && s.px === 468, '가운데 로고를 지나 조타 콘솔 앞(y≈122) ' + JSON.stringify([s.px, s.py]));
  await cap('07_helm');
  // ⑦ 아래로 나가면 다리길 철문 앞(228,232) 아래를 봄 → 다리 아래 끝까지 → 광장 위 통로(484,40)
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
