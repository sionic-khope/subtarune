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
async function dodge() {
  const choice = await page.evaluate(() => {
    const b = game.battle, s = b.soul, box = b.board;
    const directions = [[0,0],[-1,0],[1,0],[0,-1],[0,1],[-.7071,-.7071],[.7071,-.7071],[-.7071,.7071],[.7071,.7071]];
    let best = 0, min = Infinity;
    directions.forEach(([dx,dy], index) => {
      let cost = 0;
      for (const t of [.12,.25,.4,.6,.8]) {
        const x = Math.max(box.x+10, Math.min(box.x+box.w-10, s.x+dx*s.speed*t));
        const y = Math.max(box.y+10, Math.min(box.y+box.h-10, s.y+dy*s.speed*t));
        for (const p of b.bullets) {
          if (p.life && p.age+t > p.life && !p.harmless) continue;
          let clearance;
          if (p.cells) {
            if (p.harmless) continue;
            clearance = Math.min(...p.cells.map(cell => {
              const left = Math.round(p.x) + Math.round(cell.x), top = Math.round(p.y) + Math.round(cell.y);
              const outsideX = Math.max(left-x,0,x-left-cell.w), outsideY = Math.max(top-y,0,y-top-cell.h);
              return Math.hypot(outsideX,outsideY)-7;
            }));
          } else if (p.zone) {
            const outsideX = Math.max(p.x-x,0,x-p.x-p.w), outsideY = Math.max(p.y-y,0,y-p.y-p.h);
            clearance = Math.hypot(outsideX,outsideY)-7;
            if (clearance <= 0) clearance -= Math.min(x-p.x,p.x+p.w-x,y-p.y,p.y+p.h-y);
          } else {
            if (p.harmless) continue;
            clearance = Math.hypot(x-p.x-p.vx*t,y-p.y-p.vy*t)-p.r-7;
          }
          const activation = (p.zone || p.cells) && p.age+t < p.warn ? .6 : 1;
          cost += activation * (clearance < 0 ? 500-clearance*12 : 24/(clearance+3)) / (t+.3);
        }
        cost += .001 * Math.hypot(x-(box.x+box.w/2),y-(box.y+box.h/2));
      }
      if (cost < min) { min=cost; best=index; }
    });
    const [dx,dy] = directions[best];
    return [...(dx<0?['ArrowLeft']:dx>0?['ArrowRight']:[]),...(dy<0?['ArrowUp']:dy>0?['ArrowDown']:[])];
  });
  await keys(choice);
}
try {
  await enter();
  const initial = await snapshot();
  check('encounter starts with Baron HP100, ordinary modes, Black Knife key', initial.hp === 100 && initial.maxHp === 100 && initial.bgm === 'baron_battle' && initial.modes.attack === 'rush' && initial.modes.enemy === 'bullets', initial);
  await capture('baron_01_menu');
  let lastRound = -1;
  const deadline = Date.now() + 360000;
  while (Date.now() < deadline) {
    const s = await snapshot();
    if (!s || s.state === 'win' || s.state === 'lose') break;
    if (s.state === 'menu' || s.state === 'target') {
      await keys([]);
      if (s.state === 'menu' && s.pattern !== lastRound) { lastRound=s.pattern; rounds.push(s); console.log(`ROUND ${s.pattern} Baron=${s.hp} party=${s.members.map(m=>m.hp)} hits=${s.hits}`); }
      await page.keyboard.press('KeyC');
      await page.waitForTimeout(110);
    } else if (s.state === 'bullets') {
      const index = (s.pattern-1)%6;
      await dodge();
      if (!patterns.has(index) && s.t > 1.35 && s.bullets) { await capture(`baron_pattern_${index+1}`); patterns.add(index); }
      await page.waitForTimeout(100);
    } else { await keys([]); await page.waitForTimeout(90); }
  }
  await keys([]);
  const victory = await snapshot();
  check('ordinary keyboard attacks defeat full HP100 Baron', victory?.state === 'win' && victory.hp === 0, victory);
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
  check('retry restores same Baron HP100, modes and Black Knife BGM', retry.hp === 100 && retry.bgm === 'baron_battle' && retry.cfg.bg === initial.cfg.bg && JSON.stringify(retry.modes) === JSON.stringify(initial.modes) && retry.members.every(m=>!m.down && m.hp===m.maxHp), retry);
  await capture('baron_forced_retry');
} catch (error) { check('playtest completes', false, error.stack); }
finally {
  check('no browser page errors', errors.length === 0, errors);
  fs.writeFileSync(path.join(shots,'baron-report.json'), JSON.stringify({ base, checks, rounds, failures }, null, 2));
  await browser.close();
}
console.log(`fails=${failures}`);
process.exitCode = failures ? 1 : 0;
