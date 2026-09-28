// Ordinary-attack victory uses only keyboard input. Forced down/revive/retry checks
// run separately afterwards and are explicitly labelled in the evidence report.
import fs from 'node:fs';
import path from 'node:path';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const base = process.env.BASE_URL || 'http://localhost:8000';
const shots = process.env.SHOT_DIR || new URL('./shots/baron/', import.meta.url).pathname;
fs.mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true });
const page = await browser.newPage({ viewport: { width: 1000, height: 780 } });
const errors = [], checks = [], rounds = [], patterns = new Set();
let held = [], failures = 0;
page.on('pageerror', e => errors.push(e.message));
const check = (name, ok, detail) => { checks.push({ name, ok: !!ok, detail }); if (!ok) failures++; console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${JSON.stringify(detail ?? '')}`); };
const snapshot = () => page.evaluate(() => {
  const b = game.battle;
  return b && { state: b.state, t: b.t, text: b.text, cfg: b.cfg, modes: b.modes, attack: game.attack, bgm: game.sound.bgmName,
    hits: b.soul.hits, bullets: b.bullets.length, pattern: b.enemies[0].patternIdx,
    hp: b.enemies[0].hp, maxHp: b.enemies[0].maxHp,
    members: b.members.map(m => ({ id: m.id, hp: m.hp, maxHp: m.maxHp, down: m.down, downTurns: m.downTurns })) };
});
async function until(fn, ms = 15000) {
  const end = Date.now() + ms;
  while (Date.now() < end) { if (await page.evaluate(fn)) return true; await page.waitForTimeout(80); }
  return false;
}
async function keys(next) {
  for (const key of held) if (!next.includes(key)) await page.keyboard.up(key);
  for (const key of next) if (!held.includes(key)) await page.keyboard.down(key);
  held = next;
}
async function capture(name) {
  await until(() => !game.battle || !['menu', 'win'].includes(game.battle.state) || game.battle.typed, 2500);
  await page.screenshot({ path: path.join(shots, `${name}.png`) });
}
async function enter() {
  await page.goto(`${base}/index.html?qa=obj4_battle`);
  if (!await until(() => !!(window.game?.player))) throw new Error('QA map did not load');
  await page.keyboard.press('KeyX');
  await page.waitForTimeout(500);
  await keys(['ArrowUp']);
  const opened = await until(() => !!game.battle, 18000);
  await keys([]);
  if (!opened) { await capture('baron_entry_failure'); throw new Error(`Walking up did not trigger Baron battle: ${JSON.stringify(await page.evaluate(() => ({ map:game.mapId, player:{x:game.player.x,y:game.player.y}, flags:game.flags, dialogue:game.dialogue.running, textbox:game.textbox.state })))}`); }
  if (!await until(() => game.battle?.state === 'menu', 10000)) throw new Error('Battle did not reach menu');
}
// Receding-horizon steering reads current, visibly rendered projectiles. It cannot
// move the soul directly or inspect a future random pattern; real keys move it.
// Baron's anatomy hazards move along their own visible paths (bullet.steer, driven only by that bullet's age),
// so the planner projects each *already visible* hazard forward on a throwaway copy instead of treating it as static.
async function dodge() {
  const choice = await page.evaluate(() => {
    const b = game.battle, s = b.soul, box = b.board, m = 4 + s.r, hitR = Math.max(0, s.r - 2);
    const dirs = [[0,0],[-1,0],[1,0],[0,-1],[0,1],[-.7071,-.7071],[.7071,-.7071],[-.7071,.7071],[.7071,.7071]];
    const times = [.05,.1,.15,.2,.27,.34,.42,.5,.6,.72,.85];
    const hazards = b.bullets.filter(p => !p.harmless);
    // future hazard position at +t: copy the bullet and let its own path function place the copy
    const future = hazards.map(p => times.map(t => {
      const age = p.age + t;
      if (p.life && age >= p.life) return null;
      let x = p.x + (p.vx || 0) * t, y = p.y + (p.vy || 0) * t;
      if (p.steer) { const copy = { ...p, age }; try { p.steer.call(null, copy, t); x = copy.x; y = copy.y; } catch { /* keep linear */ } }
      return { x, y, active: !(p.warn && age < p.warn) };
    }));
    const clearance = (p, f, x, y) => {
      if (p.cells) {
        const bx = Math.round(f.x), by = Math.round(f.y);
        let best = Infinity;
        for (const c of p.cells) {
          const left = bx + Math.round(c.x), top = by + Math.round(c.y);
          const ox = Math.max(left - x, 0, x - left - c.w), oy = Math.max(top - y, 0, y - top - c.h);
          const d = Math.hypot(ox, oy); if (d < best) best = d;
        }
        return best - hitR;
      }
      if (p.zone) { const ox = Math.max(p.x - x, 0, x - p.x - p.w), oy = Math.max(p.y - y, 0, y - p.y - p.h); return Math.hypot(ox, oy) - hitR; }
      return Math.hypot(x - f.x, y - f.y) - (p.r || 0) - hitR;
    };
    // plans: hold one direction, or move for a moment then stop, or change direction mid-way
    const plans = [];
    for (let a = 0; a < dirs.length; a++) { plans.push([a, a, 9]); plans.push([a, 0, .2]); plans.push([a, 0, .42]); for (let c = 1; c < dirs.length; c++) if (c !== a) plans.push([a, c, .3]); }
    let best = null, min = Infinity;
    for (const [a, c, switchAt] of plans) {
      let x = s.x, y = s.y, prev = 0, cost = 0;
      for (let k = 0; k < times.length && cost < min; k++) {
        const t = times[k], dt = t - prev; prev = t;
        const [dx, dy] = dirs[t <= switchAt ? a : c];
        x = Math.max(box.x + m, Math.min(box.x + box.w - m, x + dx * s.speed * dt));
        y = Math.max(box.y + m, Math.min(box.y + box.h - m, y + dy * s.speed * dt));
        for (let i = 0; i < hazards.length; i++) {
          const f = future[i][k]; if (!f) continue;
          const p = hazards[i];
          if (!p.zone && (Math.abs(f.x - x) > 64 || Math.abs(f.y - y) > 64)) continue;
          const cl = clearance(p, f, x, y);
          if (cl > 40) continue;
          const weight = f.active ? 1 : .15;
          cost += weight * (cl < 1 ? 800 - cl * 20 : 18 / (cl + 2)) / (t + .25);
        }
        cost += .002 * Math.hypot(x - (box.x + box.w / 2), y - (box.y + box.h / 2));
      }
      if (cost < min) { min = cost; best = a; }
    }
    const [dx, dy] = dirs[best ?? 0];
    return [...(dx < 0 ? ['ArrowLeft'] : dx > 0 ? ['ArrowRight'] : []), ...(dy < 0 ? ['ArrowUp'] : dy > 0 ? ['ArrowDown'] : [])];
  });
  await keys(choice);
}
// Healing uses the ordinary battle ITEM menu with real keys: ITEM button → the healing item → the wounded member.
// Only items the party really carries at this QA point (derived from story flags) are used.
async function healPlan() {
  return page.evaluate(async () => {
    const { ITEMS } = await import('/src/data/items.js');
    const b = game.battle, me = b.members[b.memberIdx];
    if (!me || me.down) return null;
    const plain = game.inventory.filter(name => ITEMS[name]?.kind === 'plain');
    const reserved = b.plans.filter(plan => plan.type === 'item').map(plan => plan.name);
    const left = [...plain]; for (const name of reserved) { const i = left.indexOf(name); if (i >= 0) left.splice(i, 1); }
    const heals = left.filter(name => (ITEMS[name].heal || 0) > 0);
    if (!heals.length) return null;
    const planned = new Set(b.plans.filter(plan => plan.type === 'item').map(plan => plan.target?.id));
    const wounded = b.members.map((m, index) => ({ m, index })).filter(({ m }) => !m.down && !planned.has(m.id) && m.hp <= Math.max(30, m.maxHp * 0.3))
      .sort((x, y) => x.m.hp / x.m.maxHp - y.m.hp / y.m.maxHp)[0];
    if (!wounded) return null;
    const name = heals.sort((x, y) => ITEMS[y].heal - ITEMS[x].heal)[0];
    return { name, itemIdx: plain.indexOf(name), target: wounded.index, targetId: wounded.m.id, hp: wounded.m.hp };
  });
}
async function useHeal(plan) {
  for (let k = 0; k < 4 && await page.evaluate(() => game.battle.menuButtons()[game.battle.menuIdx]?.kind !== 'item'); k++) { await page.keyboard.press('ArrowRight', { delay: 40 }); await page.waitForTimeout(50); }
  await page.keyboard.press('KeyC', { delay: 40 });
  if (!await until(() => game.battle?.state === 'item', 1500)) return false;
  for (let k = 0; k < 12 && await page.evaluate(i => game.battle.itemIdx !== i, plan.itemIdx); k++) { await page.keyboard.press('ArrowDown', { delay: 40 }); await page.waitForTimeout(50); }
  await page.keyboard.press('KeyC', { delay: 40 });
  if (!await until(() => game.battle?.state === 'item-target', 1500)) return false;
  for (let k = 0; k < 6 && await page.evaluate(i => game.battle.itemTargetIdx !== i, plan.target); k++) { await page.keyboard.press('ArrowRight', { delay: 40 }); await page.waitForTimeout(50); }
  await page.keyboard.press('KeyC', { delay: 40 });
  await page.waitForTimeout(110);
  return true;
}
try {
  await enter();
  const initial = await snapshot();
  const baronHp = await page.evaluate(async () => (await import('./src/data/enemies.js')).ENEMIES.baron.hp);
  check('encounter starts with Baron at its data HP, ordinary modes, Black Knife key', initial.hp === baronHp && initial.maxHp === baronHp && initial.bgm === 'baron_battle' && initial.modes.attack === 'rush' && initial.modes.enemy === 'bullets', initial);
  await capture('baron_01_menu');
  let lastRound = -1, cannonShots = 0, healsUsed = 0;
  const deadline = Date.now() + 360000 * Math.max(1, initial.maxHp / 100);
  while (Date.now() < deadline) {
    const s = await snapshot();
    if (!s || s.state === 'win' || s.state === 'lose') break;
    // 대포 막기(용준 대포 12초 차징): 다음에 올 숨결 줄로 위·아래 이동, 대사는 C
    const cg = await page.evaluate(() => { const g = game.battle?.gimmick?.snapshot; if (!g || !g.breaths) return null; const next = g.breaths.filter(b => !b.resolved && g.elapsed >= b.at).sort((a, b) => a.at - b.at)[0]; return { phase: g.phase, lane: g.lane, next: next ? next.lane : null, typed: !!game.battle.typed }; });
    if (cg) {
      await keys([]);
      // 키를 40ms 눌러 둬야 줄이 움직인다(너무 빨리 떼면 프레임이 못 읽는다) — baron-cannon 시나리오와 같은 방식
      if ((cg.phase === 'guard' || cg.phase === 'focus') && cg.next != null) { for (let i = 0; i < Math.abs(cg.next - cg.lane); i++) { await page.keyboard.press(cg.next < cg.lane ? 'ArrowUp' : 'ArrowDown', { delay: 40 }); await page.waitForTimeout(30); } }
      else if (cg.typed) await page.keyboard.press('KeyC', { delay: 40 });
      await page.waitForTimeout(70);
      continue;
    }
    if (s.state === 'menu' || s.state === 'target' || s.state === 'interlude') {
      await keys([]);
      // 대포가 준비되면(9번 맞힘) 첫 멤버가 대포 버튼을 고른다
      if (s.state === 'menu' && await page.evaluate(() => !!game.battle.support?.ready && game.battle.memberIdx === 0)) {
        for (let k = 0; k < 4 && await page.evaluate(() => game.battle.menuButtons()[game.battle.menuIdx]?.kind !== 'support'); k++) { await page.keyboard.press('ArrowRight'); await page.waitForTimeout(60); }
        cannonShots++;
      }
      if (s.state === 'menu' && s.pattern !== lastRound) { lastRound=s.pattern; rounds.push(s); console.log(`ROUND ${s.pattern} Baron=${s.hp} party=${s.members.map(m=>m.hp)} hits=${s.hits}`); }
      // 대포 차례가 아니면, 크게 다친 동료가 있을 때 실제 ITEM 메뉴로 회복템을 쓴다
      const heal = s.state === 'menu' && await page.evaluate(() => game.battle.menuButtons()[game.battle.menuIdx]?.kind !== 'support') ? await healPlan() : null;
      if (heal) { if (await useHeal(heal)) { healsUsed++; console.log(`HEAL ${heal.name} → ${heal.targetId} (hp ${heal.hp})`); } continue; }
      await page.keyboard.press('KeyC');
      await page.waitForTimeout(110);
    } else if (s.state === 'bullets') {
      const index = (s.pattern-1)%6;
      await dodge();
      if (!patterns.has(index) && s.t > 1.35 && s.bullets) { await capture(`baron_pattern_${index+1}`); patterns.add(index); }
      await page.waitForTimeout(25);
    } else { await keys([]); await page.waitForTimeout(90); }
  }
  await keys([]);
  const victory = await snapshot();
  check('keyboard attacks plus the cannon defeat a full-HP Baron', victory?.state === 'win' && victory.hp === 0, victory);
  check('the cannon was fired', cannonShots > 0, String(cannonShots));
  console.log(`healing items used through the ITEM menu: ${healsUsed}`);
  check('six natural enemy patterns observed', patterns.size === 6, [...patterns]);
  await capture(victory?.state === 'win' ? 'baron_02_victory' : 'baron_primary_failure');
  if (victory?.state !== 'win') throw new Error('Primary victory failed; no forced checks run');
  await page.waitForTimeout(800); await page.keyboard.press('KeyC');
  check('victory ends battle', await until(() => !game.battle, 5000));
  check('battle HP persists to field', await page.evaluate(expected => expected.every(m => game.partyHp[m.id] === (m.down ? Math.ceil(m.maxHp/2) : m.hp)), victory.members));

  await enter();
  console.log('FORCED FIXTURE: down/revive/defeat checks below are separate from the completed natural victory.');
  await page.evaluate(() => game.battle.hurtParty(999));
  const down = await snapshot();
  check('forced single down keeps battle alive', down.state === 'menu' && down.members.filter(m=>m.down).length === 1, down.members);
  await capture('baron_forced_down');
  const downId = down.members.find(m=>m.down).id;
  for (let i=0; i<3; i++) await page.evaluate(() => game.battle.afterEnemyPhase());
  const revived = await snapshot(), member = revived.members.find(m=>m.id===downId);
  check('forced phase boundaries revive at half HP after three rounds', !member.down && member.hp === Math.ceil(member.maxHp/2) && revived.text.includes('다시 일어났다'), revived);
  await capture('baron_forced_revive');
  await page.evaluate(() => { for(let i=0;i<3;i++) game.battle.hurtParty(999); });
  await page.waitForTimeout(2300);
  const lost = await snapshot();
  check('forced total defeat shows game over and stops BGM', lost.state === 'lose' && lost.members.every(m=>m.down) && lost.bgm === null, lost);
  await capture('baron_forced_gameover');
  await page.keyboard.press('KeyC');
  check('retry button enters retry sequence', await until(() => game.battle?.state === 'retry', 1500));
  await until(() => game.battle?.state === 'menu', 10000);
  const retry = await snapshot();
  check('retry restores same Baron HP, modes and Black Knife BGM', retry.hp === baronHp && retry.bgm === 'baron_battle' && retry.cfg.bg === initial.cfg.bg && JSON.stringify(retry.modes) === JSON.stringify(initial.modes) && retry.members.every(m=>!m.down && m.hp===m.maxHp), retry);
  await capture('baron_forced_retry');
} catch (error) { check('playtest completes', false, error.stack); }
finally {
  check('no browser page errors', errors.length === 0, errors);
  fs.writeFileSync(path.join(shots,'baron-report.json'), JSON.stringify({ base, checks, rounds, failures }, null, 2));
  await browser.close();
}
console.log(`fails=${failures}`);
process.exitCode = failures ? 1 : 0;
