// 짜장 토리이 길(BUILD226 사용자 “위쪽 두 칸 + 오른쪽으로 쭉, 토리이 3개 대각선 통로, 주인공 기준 3분의 2 원만 보이고 겉으로 갈수록 노이즈 어둠”):
//   짜장숲 위 가장자리 문으로 들어와 두 칸 올라간 뒤 오른쪽 끝까지, 세 토리이 아래를 지난다. 시야 오버레이는 화면 구석이 검고 주인공 주변은 보인다. 실행: tests/playtest/run.sh jjajang-torii
import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright-core';
const shots = process.env.SHOT_DIR; fs.mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = []; page.on('pageerror', e => errors.push(e.message));
let fails = 0;
const check = (ok, msg) => { if (!ok) { fails += 1; console.log('FAIL', msg); } else console.log('ok', msg); };
const cap = async n => { await page.screenshot({ path: path.join(shots, 'torii_' + n + '.png') }); };
const st = () => page.evaluate(() => { const g = window.game; return { map: g.mapId, px: Math.round(g.player.x), py: Math.round(g.player.y), bgm: g.sound.bgmName, tile: g.map.tileAt(Math.floor((g.player.x + g.player.w / 2) / 32), Math.floor((g.player.y + g.player.h - 1) / 32))?.name }; });
const walk = async (key, until, ms, run = true) => { if (run) await page.keyboard.down('KeyX'); await page.keyboard.down(key); const ok = await page.waitForFunction(until, null, { timeout: ms }).then(() => true).catch(() => false); await page.keyboard.up(key); if (run) await page.keyboard.up('KeyX'); return ok; };
// 캔버스 픽셀 밝기(0~255): 화면 구석 vs 주인공 주변 — 시야 오버레이 검사
const lum = (x, y) => page.evaluate(([x, y]) => { const c = document.querySelector('canvas'); const s = c.width / 480; const d = c.getContext('2d').getImageData(Math.round(x * s), Math.round(y * s), 4, 4).data; let sum = 0; for (let i = 0; i < d.length; i += 4) sum += (d[i] + d[i + 1] + d[i + 2]) / 3; return sum / (d.length / 4); }, [x, y]);
try {
  await page.goto('http://localhost:8000/?qa=jjajang_forest');
  await page.waitForFunction(() => window.game && window.game.mapId === 'jjajang_forest' && !window.game.dialogue.running, null, { timeout: 30000 });
  await page.waitForTimeout(400);
  const crossed = await walk('ArrowUp', () => window.game.mapId === 'jjajang_torii', 25000);
  await page.waitForTimeout(700); let s = await st(); await cap('01_arrive_from_forest');
  check(crossed && s.map === 'jjajang_torii' && s.py > 11 * 32, '짜장숲 위 가장자리를 올라가면 토리이 길 아래 입구에 선다 ' + JSON.stringify(s));
  const up = await walk('ArrowUp', () => window.game.player.y < 9 * 32 + 8, 8000);
  s = await st(); check(up && s.tile === 'jjajang_path_echo', '두 칸 올라가면 가로 길에 닿는다(에코 발소리 타일) ' + JSON.stringify(s));
  const gates = await page.evaluate(() => window.game.map?.meta?.torii || JSON.parse(JSON.stringify((window.MAPS || {}).jjajang_torii?.meta?.torii || [])));
  const toriiX = gates.length ? gates.map(g => g.nearBase[0]) : [16 * 32 + 16, 28 * 32 + 16, 40 * 32 + 16];
  for (let i = 0; i < toriiX.length; i++) {
    await page.evaluate(t => { window.__toriiTarget = t; }, toriiX[i] + 70);
    const reached = await walk('ArrowRight', () => window.game.player.x >= window.__toriiTarget, 12000, false);
    check(reached, `토리이 ${i + 1} 기둥 사이까지 걸어간다`);
    s = await st(); await cap(`02_gate_${i + 1}`);
    if (i === 0) {
      // 시야: 주인공이 가로 길 위에 있을 때 같은 길 줄의 화면 가장자리는 검고, 주인공 옆은 보인다
      const sp = await page.evaluate(() => { const g = window.game; return { x: g.player.x + g.player.w / 2 - g.camera.x, y: g.player.y + g.player.h - 6 - g.camera.y }; });
      const corner = await lum(6, 6), edgePath = await lum(6, sp.y), nearPath = await lum(sp.x - 70, sp.y), farPath = await lum(sp.x - 190, sp.y);
      check(corner < 12 && edgePath < 14 && nearPath > 28 && farPath < nearPath * 0.7, `시야 오버레이: 구석 ${corner.toFixed(0)}, 길 가장자리 ${edgePath.toFixed(0)}, 주인공 옆 길 ${nearPath.toFixed(0)}, 190px 밖 길 ${farPath.toFixed(0)}`);
    }
    check(s.map === 'jjajang_torii' && s.py >= 8 * 32 && s.py < 10 * 32, `토리이 ${i + 1} 아래를 길에서 지난다 ` + JSON.stringify(s));
  }
  const end = await walk('ArrowRight', () => window.game.player.x >= 46 * 32, 15000);
  s = await st(); await cap('03_right_end');
  check(end && s.map === 'jjajang_torii', '오른쪽 끝까지 걸어갈 수 있다(다음 맵 없음) ' + JSON.stringify([s.px, s.py]));
  const backLeft = await walk('ArrowLeft', () => window.game.player.x <= 10 * 32 - 8, 20000);
  const backDown = backLeft && await walk('ArrowDown', () => window.game.mapId === 'jjajang_forest', 8000);
  await page.waitForTimeout(600); s = await st(); await cap('04_back_to_forest');
  check(backDown && s.map === 'jjajang_forest' && s.py < 4 * 32, '아래 문으로 내려가면 짜장숲 위(from_north)로 돌아온다 ' + JSON.stringify(s));
  check(errors.length === 0, 'page errors ' + JSON.stringify(errors.slice(0, 3)));
} catch (e) { fails += 1; console.log('FAIL exception', e.message); }
console.log('fails=' + fails); await browser.close(); process.exit(fails ? 1 : 0);
