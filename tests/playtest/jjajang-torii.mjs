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
  // BUILD226+: 두 번째 토리이를 지나면 청소부 합류 컷신('거기 너')이 걸음만으로 시작된다(자세한 연출은 jjajang-torii-janitor).
  //   이 시나리오는 길 자체를 보므로 컷신을 C 로 끝까지 넘기고, 청소부가 동료가 된 뒤 남은 길을 이어 걷는다.
  const playJanitorJoin = async () => {
    for (let n = 0; n < 400; n++) {
      const st2 = await page.evaluate(() => ({ running: window.game.dialogue.running, joined: !!window.game.flags.torii_janitor_joined, box: window.game.textbox.state }));
      if (st2.joined && !st2.running) return true;
      if (st2.box !== 'closed') await page.keyboard.press('KeyC', { delay: 40 });
      await page.waitForTimeout(110);
    }
    return false;
  };
  for (let i = 0; i < toriiX.length; i++) {
    await page.evaluate(t => { window.__toriiTarget = t; }, toriiX[i] + 70);
    let reached = await walk('ArrowRight', () => window.game.player.x >= window.__toriiTarget || window.game.dialogue.running, 12000, false);
    if (reached && await page.evaluate(() => window.game.dialogue.running && window.game.flags.torii_janitor_started)) {
      check(i === 2, `청소부 합류 컷신은 두 번째 토리이 뒤, 세 번째 토리이 앞에서 시작된다 (다음 목표 토리이 ${i + 1})`);
      const joined = await playJanitorJoin();
      const after = await page.evaluate(() => ({ party: [...window.game.party], bgm: window.game.sound.bgmName, running: window.game.dialogue.running }));
      check(joined && after.party.includes('janitor') && after.bgm === 'wise_words', '청소부 합류 컷신을 끝내면 청소부가 동료가 되고 조작이 돌아온다 ' + JSON.stringify(after));
      await cap('02_janitor_joined');
      reached = await walk('ArrowRight', () => window.game.player.x >= window.__toriiTarget, 12000, false);
    }
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
  // 오른쪽 끝 문(torii_pines_door)은 이제 굽은 길(jjajang_bend) 서쪽 입구로 이어진다 — 옛 "다음 맵 없음" 대신 실제로 건너가 본다
  const end = await walk('ArrowRight', () => window.game.mapId === 'jjajang_bend', 15000);
  await page.waitForFunction(() => !window.game.transitioning, null, { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(500);
  s = await st(); await cap('03_right_end_bend');
  const bend = await page.evaluate(() => ({ party: [...window.game.party], followers: window.game.entities.filter(e => e.def?.type === 'follower' && !e.dead).map(e => e.id), dialogue: window.game.dialogue.running }));
  check(end && s.map === 'jjajang_bend' && s.px < 3 * 32 && bend.party.includes('janitor') && bend.followers.includes('janitor') && !bend.dialogue, '오른쪽 끝까지 걸어가면 굽은 길(jjajang_bend) 서쪽 입구로 이어지고 청소부가 따라온다 ' + JSON.stringify({ s, bend }));
  const backToTorii = await walk('ArrowLeft', () => window.game.mapId === 'jjajang_torii', 10000);
  await page.waitForFunction(() => !window.game.transitioning, null, { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(400);
  s = await st();
  check(backToTorii && s.map === 'jjajang_torii' && s.px > 40 * 32, '굽은 길 서쪽 문으로 되돌아가면 토리이 길 동쪽 끝(from_east)에 선다 ' + JSON.stringify(s));
  const backLeft = await walk('ArrowLeft', () => window.game.player.x <= 10 * 32 - 8, 20000);
  const backDown = backLeft && await walk('ArrowDown', () => window.game.mapId === 'jjajang_forest', 8000);
  await page.waitForTimeout(600); s = await st(); await cap('04_back_to_forest');
  check(backDown && s.map === 'jjajang_forest' && s.py < 4 * 32, '아래 문으로 내려가면 짜장숲 위(from_north)로 돌아온다 ' + JSON.stringify(s));
  check(errors.length === 0, 'page errors ' + JSON.stringify(errors.slice(0, 3)));
} catch (e) { fails += 1; console.log('FAIL exception', e.message); }
console.log('fails=' + fails); await browser.close(); process.exit(fails ? 1 : 0);
