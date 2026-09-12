// Focused real-input QA. The first player/enemy round is natural; later charge,
// HP restoration, defeat and exit setup are explicit fixtures, never a full fight.
import fs from 'node:fs';
import path from 'node:path';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const base = process.env.BASE_URL || 'http://localhost:8000';
const shots = process.env.SHOT_DIR || new URL('./shots/baron-cannon/', import.meta.url).pathname;
fs.mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const checks = [], errors = [], resources = [], captures = [], fixtures = [], introLines = [], phases = [];
let failures = 0;
const started = Date.now();
page.on('pageerror', e => errors.push(e.message));
page.on('response', r => { if (r.status() >= 400) resources.push({ url: r.url(), status: r.status() }); });
const check = (name, ok, detail) => {
  checks.push({ name, ok: !!ok, detail });
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${JSON.stringify(detail ?? '')}`);
};
const until = (fn, timeout = 20000) => page.waitForFunction(fn, null, { timeout, polling: 30 });
const press = async key => { await page.keyboard.press(key, { delay: 40 }); await page.waitForTimeout(40); };
const snap = () => page.evaluate(() => {
  const b = game.battle;
  return b && { state: b.state, t: b.t, text: b.text, typed: b.typed, hp: b.enemies[0].hp,
    maxHp: b.enemies[0].maxHp, damage: b.enemies[0].def.damage, memberIdx: b.memberIdx,
    menuIdx: b.menuIdx, plans: b.plans.map(p => p.type), unlocked: b.support?.unlocked,
    charge: b.support?.charge, ready: b.support?.ready, interlude: b.interlude?.snapshot,
    mode: b.gimmick?.snapshot, members: b.members.map(m => ({ hp: m.hp, maxHp: m.maxHp, down: m.down })),
    patternIdx: b.enemies[0].patternIdx, bullets: b.bullets.length };
});
async function capture(name) {
  const filename = `${name}.png`;
  await page.screenshot({ path: path.join(shots, filename) });
  captures.push({ filename, viewport: page.viewportSize(), snapshot: await snap() });
}
async function sizes(name) {
  await until(() => !game.battle || game.battle.typed);
  for (const width of [1280, 375, 768]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(180);
    check(`${name} canvas fits ${width}`, await page.evaluate(() => {
      const r = game.canvas.getBoundingClientRect();
      return r.x >= 0 && r.y >= 0 && r.right <= innerWidth && r.bottom <= innerHeight;
    }));
    await capture(`${name}_${width}`);
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.waitForTimeout(180);
}
async function fillCharge(label) {
  fixtures.push(`${label}: 12 direct ordinary hitEnemy calls of damage1, party HP restored; no battle timer or guard state altered.`);
  await page.evaluate(() => {
    const b = game.battle;
    for (const m of b.members) { m.hp = m.maxHp; m.down = false; }
    for (let i = 0; i < 12; i++) b.hitEnemy(b.enemies[0], b.members[0], 1);
  });
  check(`${label} charge caps at9`, (await snap()).charge === 9, await snap());
}
async function chooseCannon(label) {
  await until(() => game.battle?.state === 'menu');
  while ((await snap()).menuIdx !== 2) await press('ArrowRight');
  await press('KeyC');
  await until(() => game.battle?.gimmick?.fullscreen);
  const s = await snap();
  check('button consumes full party action and resets charge', s.charge === 0 && s.plans.length === 1 && s.plans[0] === 'support', s);
  await capture(`${label}_enter_start`);
  await page.waitForTimeout(250);
  await capture(`${label}_enter_mid`);
  await until(() => game.battle?.gimmick?.snapshot.phase === 'charge-dialogue' && game.battle.typed);
  check('charge dialogue exact', (await snap()).text === '* 형 차지 할게요 12초정도 걸려요 지 지켜주세요 !!', (await snap()).text);
}
async function waitReturn() {
  await until(() => ['enemy-prep', 'bullets'].includes(game.battle?.state));
  check('mode disposed before ordinary enemy turn', await page.evaluate(() => !game.battle.gimmick && game.battle.support.charge === 0));
  await until(() => game.battle?.state === 'menu');
  check('return does not repeat support introduction', !(await snap()).interlude && (await snap()).unlocked);
}

try {
  await page.goto(`${base}/index.html?qa=obj4_battle`);
  await until(() => !!window.game?.player);
  await press('KeyX');
  await until(() => !game.transitioning && game.fade.alpha < 0.1);
  await page.waitForTimeout(500);
  await page.keyboard.down('ArrowUp');
  try { await until(() => !!game.battle); } finally { await page.keyboard.up('ArrowUp'); }
  await until(() => game.battle?.state === 'menu');
  let s = await snap();
  check('Baron starts HP250 damage12 with cannon locked', s.hp === 250 && s.maxHp === 250 && s.damage === 12 && !s.unlocked && s.charge === 0, s);
  await sizes('pre_intro_menu');
  while (['menu', 'target'].includes((await snap()).state)) await press('KeyC');
  await until(() => game.battle?.state === 'bullets');
  s = await snap();
  check('first ordinary player turn dealt damage without charging', s.hp < 250 && s.charge === 0 && !s.unlocked, s);
  await capture('first_natural_enemy_turn');
  await until(() => game.battle?.interlude?.snapshot.phase === 'enter');
  await capture('intro_enter_start');
  await page.waitForTimeout(1400);
  await capture('intro_enter_mid');
  await until(() => game.battle?.interlude?.snapshot.phase === 'talk' && game.battle.typed);
  check('intro follows completed enemy turn', (await snap()).patternIdx === 1, await snap());
  await page.evaluate(() => {
    window.cannonEvidence = { damage: [], sounds: [] };
    const b = game.battle, hit = b.applyCannonDamage.bind(b), sound = b.sfx.bind(b);
    b.applyCannonDamage = (...args) => { const amount = hit(...args); cannonEvidence.damage.push(amount); return amount; };
    b.sfx = name => { cannonEvidence.sounds.push(name); return sound(name); };
  });
  for (let i = 0; i < 9; i++) {
    await until(() => game.battle.typed);
    s = await snap(); introLines.push(s.text);
    await capture(`intro_line_${i + 1}`);
    await press('KeyC');
  }
  const expected = await page.evaluate(async () => (await import('/src/data/baron-cannon.js')).BARON_CANNON.introLines.map(l => l.text));
  check('all nine exact intro lines shown in order', JSON.stringify(introLines) === JSON.stringify(expected), introLines);
  await until(() => game.battle?.state === 'menu');
  await press('ArrowLeft');
  await press('KeyC');
  s = await snap();
  check('unlocked zero-charge button remains disabled', s.state === 'menu' && s.menuIdx === 2 && s.charge === 0 && !s.ready, s);
  await until(() => game.battle.typed);
  await sizes('cannon_locked');
  await fillCharge('success setup');
  await sizes('cannon_ready');
  const beforeSuccess = (await snap()).hp;
  await chooseCannon('success');
  await sizes('mode_charge_dialogue');
  await press('KeyC');
  const guardStarted = Date.now(), captured = new Set();
  while (Date.now() - guardStarted < 25000) {
    s = await snap();
    if (!s.mode || !['guard', 'focus', 'fire'].includes(s.mode.phase)) break;
    if (phases.at(-1)?.phase !== s.mode.phase) phases.push({ phase: s.mode.phase, elapsed: s.mode.elapsed, wallMs: Date.now() - guardStarted });
    if (['guard', 'focus'].includes(s.mode.phase)) {
      // Only react to warnings already visible on screen; use real Up/Down keys.
      const visible = s.mode.breaths.find(b => !b.resolved && s.mode.elapsed >= b.at);
      if (visible) {
        for (let i = 0; i < Math.abs(visible.lane - s.mode.lane); i++) await press(visible.lane < s.mode.lane ? 'ArrowUp' : 'ArrowDown');
      }
    }
    if (!captured.has(s.mode.phase) && (s.mode.phase === 'guard' ? s.mode.elapsed > 2 : s.mode.phaseTime > 0.5)) {
      captured.add(s.mode.phase); await capture(`mode_${s.mode.phase}`);
    }
    await page.waitForTimeout(25);
  }
  await until(() => game.battle?.gimmick?.snapshot.phase === 'success-dialogue' && game.battle.typed, 5000);
  s = await snap();
  check('all14 visible breaths blocked with real keys', s.mode.blocked === 14 && s.mode.breaths.every(b => b.blocked), s.mode);
  check('guard12 focus3 fire3 timing', phases[1]?.elapsed >= 12 && phases[1]?.elapsed < 12.2 && phases[2]?.elapsed >= 15 && phases[2]?.elapsed < 15.2 && s.mode.phaseTime < 2 && Date.now() - guardStarted >= 18000, phases);
  check('success applies exactly50 once and exact dialogue', beforeSuccess - s.hp === 50 && s.text === '* 하하 맛이 어떠냐! 형 정비하고 올게요' && JSON.stringify(await page.evaluate(() => cannonEvidence.damage)) === '[50]', s);
  await sizes('mode_success');
  await press('KeyC');
  await page.waitForTimeout(220); await capture('mode_success_leave');
  await waitReturn();
  await sizes('success_return');
  await fillCharge('failure setup');
  const beforeFailure = (await snap()).hp;
  await chooseCannon('failure');
  await press('KeyC');
  await press('ArrowUp');
  await until(() => game.battle?.gimmick?.snapshot.phase === 'failure-dialogue' && game.battle.typed);
  s = await snap();
  check('one wrong lane immediately fails without damage', s.mode.blocked === 0 && s.mode.breaths.filter(b => b.resolved).length === 1 && s.hp === beforeFailure && s.text === '* 아 씨발', s);
  await sizes('mode_failure');
  await press('KeyC');
  await page.waitForTimeout(210); await capture('mode_failure_fling');
  await waitReturn();
  await until(() => game.battle.typed);
  await capture('failure_return');
  await fillCharge('post-failure recharge');
  fixtures.push('Retry setup: hurtParty(999) for each living member; retry confirmed through actual C key.');
  await page.evaluate(() => { while (game.battle.alive().length) game.battle.hurtParty(999); });
  await until(() => game.battle?.state === 'lose' && game.battle.t > 2.5);
  await press('KeyC');
  await until(() => game.battle?.state === 'menu');
  s = await snap();
  check('retry resets HP250, support lock, charge and transient mode', s.hp === 250 && !s.unlocked && s.charge === 0 && !s.mode && !s.interlude && s.members.every(m => m.hp === m.maxHp && !m.down), s);
  await until(() => game.battle.typed);
  await capture('retry_menu');
  fixtures.push('Exit cleanup setup: finish(false) at clean retry menu; no full victory claim.');
  await page.evaluate(() => { window.exitedBattle = game.battle; game.battle.finish(false); });
  await until(() => !game.battle);
  check('exit clears mode and interlude', await page.evaluate(() => !exitedBattle.gimmick && !exitedBattle.interlude));
  check('charge and fire cues played', await page.evaluate(() => cannonEvidence.sounds.includes('cannon_guard_charge') && cannonEvidence.sounds.includes('cannon_guard_fire')));
} catch (error) {
  check('focused playtest completes', false, error.stack);
  await capture('failure_debug').catch(() => {});
} finally {
  check('no page errors', errors.length === 0, errors);
  const requiredAssetFailures = resources.filter(r => /cannon-guard|cannon_guard|assets\/sprites\/yongjun\.png/.test(r.url));
  check('new required assets have no failed requests', requiredAssetFailures.length === 0, requiredAssetFailures);
  fs.writeFileSync(path.join(shots, 'baron-cannon-report.json'), JSON.stringify({ base, elapsedMs: Date.now() - started, checks, failures, fixtures, introLines, phases, captures, resources }, null, 2));
  await browser.close();
}
console.log(`fails=${failures}`);
process.exitCode = failures ? 1 : 0;
