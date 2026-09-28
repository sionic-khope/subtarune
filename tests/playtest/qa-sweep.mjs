// Shift+Q 전 지점 점검(BUILD406, 사용자 2026-09-28 “shift q 지점에 애매한 버그나 그런 거 없는지”, “네트워크 문제로 유실됐을 때 거기서부터 하기”).
// 지점마다 새로 불러온 뒤 타이틀 메뉴와 같은 devJump({...pt, healKit:true}) 로 넘어가, C 를 눌러 가며 몇 초 진행하고
// 에러·검은 화면·벽 속 스폰·도트 폴백 배우·멈춘 대사·회복템을 잰다. 샤드: QA_SWEEP_FROM / QA_SWEEP_TO(메뉴 순번, TO 미포함).
import fs from 'node:fs';
import path from 'node:path';
import { runScenario } from './lib/harness.mjs';

const FROM = Number(process.env.QA_SWEEP_FROM || 0), TO = Number(process.env.QA_SWEEP_TO || 1e9);
const WATCH_MS = Number(process.env.QA_SWEEP_WATCH_MS || 6000);

await runScenario({ name: 'qa-sweep', launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] } }, async ({ page, open, until, shot, check }) => {
  await page.setViewportSize({ width: 960, height: 720 });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await open();
  await until(() => !!window.game, 30000);
  const ids = await page.evaluate(async () => (await import('./src/core/story.js')).QA_POINTS.filter(p => !p.hidden).map(p => p.id));
  const rows = [];
  for (let i = Math.max(0, FROM); i < Math.min(ids.length, TO); i++) {
    const id = ids[i], before = errors.length;
    await open();
    await until(() => !!window.game?.title || window.game?.state === 'title', 30000);
    const started = await page.evaluate(async id => {
      const { QA_POINTS } = await import('./src/core/story.js');
      const pt = QA_POINTS.find(p => p.id === id);
      window.__jumpDone = false; window.__jumpError = null;
      window.game.devJump({ ...pt, healKit: true }).then(() => { window.__jumpDone = true; }, e => { window.__jumpError = String(e?.stack || e); });
      return pt.map;
    }, id);
    const jumped = await until(() => window.__jumpDone || window.__jumpError, 45000);
    const texts = new Set();
    const t0 = Date.now();
    while (Date.now() - t0 < WATCH_MS) {
      const s = await page.evaluate(() => window.game.textbox?.node?.text || '');
      if (s) texts.add(s);
      await page.keyboard.press('KeyC');
      await page.waitForTimeout(350);
    }
    const snap = await page.evaluate(async () => {
      const g = window.game, p = g.player, { qaHealKit } = await import('./src/core/story.js');
      const kit = qaHealKit(g.flags), inv = g.inventory || [];
      const kitOk = [...new Set(kit)].every(n => inv.filter(x => x === n).length >= 10);
      const cam = g.camera || {};
      const fallback = (g.entities || []).filter(e => !e.dead && e.visible !== false && !e.hidden && e.sprite?.fallback
        && (cam.x === undefined || (e.x > cam.x - 64 && e.x < cam.x + 544 && e.y > cam.y - 64 && e.y < cam.y + 424))).map(e => e.id || e.def?.sprite || e.sprite?.name);
      const solid = g.state === 'field' && !g.ride && g.map?.solidRect ? g.map.solidRect(p.x, p.y, p.w, p.h) : false;
      return { map: g.mapId, state: g.state, fade: +(g.fade?.alpha ?? 0).toFixed(2), dialogue: !!g.dialogue?.running,
        box: g.textbox?.state, text: g.textbox?.node?.text || '', battle: !!g.battle, transitioning: !!g.transitioning,
        bgm: g.sound?.bgmName || null, solid: !!solid, fallback, kit: kit.length, kitOk, inv: inv.length, jumpError: window.__jumpError };
    });
    const pageErrors = errors.slice(before);
    const issues = [];
    if (!jumped) issues.push('jump did not finish in 45s');
    if (snap.jumpError) issues.push('jump error: ' + snap.jumpError.slice(0, 160));
    if (pageErrors.length) issues.push('page error: ' + pageErrors[0].slice(0, 160));
    if (snap.solid) issues.push('player inside a wall');
    if (snap.fallback.length) issues.push('dot fallback: ' + snap.fallback.join(','));
    if (snap.transitioning) issues.push('still transitioning');
    if (!snap.kitOk) issues.push('heal kit missing');
    const dark = snap.fade > 0.95 && !snap.battle && !snap.dialogue;
    const stuck = snap.dialogue && texts.size <= 1 && snap.box === 'waiting';
    const row = { i, id, target: started, ...snap, texts: texts.size, dark, stuck, pageErrors, issues };
    rows.push(row);
    const name = `p${String(i).padStart(3, '0')}_${id.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
    await shot(name);
    console.log(`${issues.length ? 'ISSUE' : 'OK'} ${i} ${id} map=${snap.map} state=${snap.state} fade=${snap.fade} dark=${dark} stuck=${stuck} kit=${snap.kit} ${issues.join(' | ')}`);
    check(`${id}: jumps cleanly (no error, wall, fallback, hang; heal kit present)`, issues.length === 0, issues.join(' | '));
  }
  const out = path.join(process.env.SHOT_DIR || '.', `qa-sweep-${FROM}-${TO}.json`);
  fs.writeFileSync(out, JSON.stringify(rows, null, 1));
  console.log('SWEEP_JSON', out);
});
