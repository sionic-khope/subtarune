// 섭리오 1-4: 따듯한비데가 무대 밖으로 잘려 보이지 않는가(2026-09-15 사용자 "여기있을땐 깨지는데").
//   - 보스 그림은 몸(72)보다 넓다(중심 기준 좌 105·우 106). 몸만 무대 안이어선 부족 → BOSS_ART 기준으로 잰다.
//   - 실제 전투를 돌리며 매 프레임 보스 중심의 화면 좌표를 모으고, 추격 거리(teleFar 안)에선 그림이 통째로 화면 안인지 본다.
//   - 양옆 발판(2~6·29~33열) 위 주인공을 노린 순간이동도 무대 안 바닥으로 떨어지는지 본다.
// 실행: tests/playtest/run.sh subrio-boss-frame
import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright-core';
const shots = process.env.SHOT_DIR || 'shots'; fs.mkdirSync(shots, { recursive: true });
const base = process.env.BASE_URL || 'http://localhost:8000';
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = []; page.on('pageerror', e => errors.push(e.message));
let fails = 0;
const check = (ok, msg) => { if (!ok) { fails += 1; console.log('FAIL', msg); } else console.log('ok', msg); };
const cap = async n => { await page.waitForTimeout(60); await page.screenshot({ path: path.join(shots, 'bossframe_' + n + '.png') }); };

await page.goto(base + '/?qa=subrio_boss');
await page.waitForFunction(() => !!window.__subrio, null, { timeout: 30000 });
await page.waitForFunction(() => window.__subrio.state.boss, null, { timeout: 30000 });
// 오프닝 대사를 넘기고 전투 시작
await page.waitForFunction(() => window.__subrio.state.boss.state !== 'intro', null, { timeout: 60000 }).catch(() => {});
const consts = await page.evaluate(async () => {
  const m = await import('/src/scenes/subrio-core.js');
  return { ART: m.BOSS_ART, VIEW_W: m.VIEW_W, teleFar: m.BOSS.teleFar, band: window.__subrio.level.arena.floor, bw: m.BOSS.w };
});
console.log('consts', JSON.stringify(consts));
check(!!consts.ART && consts.ART.l >= 105 && consts.ART.r >= 106, 'BOSS_ART 는 시트 실측 돌출 이상 ' + JSON.stringify(consts.ART));

// 매 프레임 표본: 화면 좌표 보스 중심·주인공 중심·그림자 자리
await page.evaluate(({ ART, VIEW_W, teleFar }) => {
  window.__frames = { worst: null, worstGhost: null, n: 0, outOfBand: 0, onSidePlatform: 0 };
  const st = window.__subrio.state, band = window.__subrio.level.arena.floor;
  const tick = () => {
    const b = st.boss;
    if (b && !b.hidden && !b.dead && b.state !== 'intro' && b.state !== 'enter') {
      const bc = b.x + b.w / 2 - st.cam, hc = st.actors[0].x + st.actors[0].w / 2 - st.cam;
      const cut = Math.max(0, ART.l - bc, bc + ART.r - VIEW_W);
      const dist = Math.abs((b.x + b.w / 2) - (st.actors[0].x + st.actors[0].w / 2));
      window.__frames.n += 1;
      if (dist <= teleFar && (!window.__frames.worst || cut > window.__frames.worst.cut)) window.__frames.worst = { cut, bc, hc, dist, state: b.state, x: Math.round(b.x), cam: Math.round(st.cam) };
      if (b.x + b.w / 2 < band[0] + b.w / 2 - 1 || b.x + b.w / 2 > band[1] - b.w / 2 + 1) window.__frames.outOfBand += 1;
      if (b.grounded && b.y + b.h < 18 * 16 - 1) window.__frames.onSidePlatform += (b.x < band[0] || b.x + b.w > band[1]) ? 1 : 0;
      for (const sh of b.extraSlams || []) {
        const gc = sh.x - st.cam, gcut = Math.max(0, ART.l - gc, gc + ART.r - VIEW_W);
        if (!window.__frames.worstGhost || gcut > window.__frames.worstGhost.cut) window.__frames.worstGhost = { cut: gcut, gc, x: sh.x, cam: Math.round(st.cam) };
      }
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}, consts);

// 전투를 굴린다: 좌우로 뛰어다니며 창을 던져 격노까지 간다
const keys = ['ArrowLeft', 'ArrowRight'];
for (let i = 0; i < 150; i++) {
  const k = keys[i % 2];
  await page.keyboard.down(k); await page.waitForTimeout(220); await page.keyboard.up(k);
  if (i % 3 === 0) await page.keyboard.press('KeyC');
  if (i % 17 === 0) await page.keyboard.press('ArrowUp');
  if (i === 40) { await page.evaluate(() => { const b = window.__subrio.state.boss; b.hp = Math.min(b.hp, Math.ceil(b.maxHp * 0.5)); }); await cap('enraged'); }
  // 양옆 발판 위로 올라가 순간이동을 유도한다
  if (i === 60 || i === 100) await page.evaluate(() => { const s = window.__subrio.state, h = s.actors[0];
    h.x = 3 * 16; h.y = 14 * 16 - h.h; h.vx = 0; h.vy = 0; h.grounded = true; s.boss.state = 'chase'; s.boss.stateT = 99; s.boss.seq = 3; });
  if (i === 80) await page.evaluate(() => { const s = window.__subrio.state, h = s.actors[0];
    h.x = 31 * 16; h.y = 14 * 16 - h.h; h.vx = 0; h.vy = 0; h.grounded = true; s.boss.state = 'chase'; s.boss.stateT = 99; s.boss.seq = 3; });
  if (i === 62 || i === 82 || i === 102) await cap('slam_' + i);
  if (await page.evaluate(() => !window.__subrio || !window.__subrio.state.boss || window.__subrio.state.boss.dead)) break;
}
const f = await page.evaluate(() => window.__frames);
console.log('frames', JSON.stringify(f));
check(f.n > 600, '전투 프레임 표본 충분 ' + f.n);
check(f.worst && f.worst.cut === 0, '추격 거리에선 보스가 통째로 화면 안 ' + JSON.stringify(f.worst));
check(!f.worstGhost || f.worstGhost.cut === 0, '격노 그림자 내려찍기도 화면 안 ' + JSON.stringify(f.worstGhost));
check(f.outOfBand === 0, '보스는 무대(arena.floor) 밖으로 나가지 않는다 ' + f.outOfBand);
check(f.onSidePlatform === 0, '보스가 양옆 발판 위에 서지 않는다 ' + f.onSidePlatform);
check(errors.length === 0, '런타임 오류 없음 ' + errors.join(' | '));
await cap('end');
console.log('fails=' + fails);
await browser.close();
process.exit(fails ? 1 : 0);
