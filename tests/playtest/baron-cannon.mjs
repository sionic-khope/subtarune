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
const checks = [], errors = [], resources = [], captures = [], fixtures = [], introLines = [], phases = [], projectileSamples = [];
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
  check(`${label} entrance begins with border alone`, s.mode.entryStage === 'frame' && s.mode.phaseTime < 0.65, s.mode);
  await capture(`${label}_border_alone`);
  await until(() => game.battle.gimmick.snapshot.entryStage === 'helpers' && game.battle.gimmick.snapshot.phaseTime > 1.35);
  await capture(`${label}_helpers_moving`);
  await until(() => game.battle.gimmick.snapshot.entryStage === 'baron');
  check(`${label} helpers settle before Baron entry`, (await snap()).mode.phaseTime >= 2.65, (await snap()).mode);
  await capture(`${label}_helpers_settled_baron_start`);
  await until(() => game.battle.gimmick.snapshot.phaseTime > 3.25);
  await capture(`${label}_baron_middle`);
  await until(() => game.battle?.gimmick?.snapshot.phase === 'charge-dialogue' && game.battle.typed);
  check('charge dialogue exact', (await snap()).text === '* 형 차징 좀 할게요 12초정도 걸려요 지 지켜주세요 !!', (await snap()).text);
  await capture(`${label}_both_settled_page1`);
}
async function controlsPage(label) {
  await press('KeyC');
  await until(() => game.battle.gimmick.snapshot.phase === 'controls-dialogue' && game.battle.typed);
  check('controls dialogue is separate exact page', (await snap()).text === '* 위 아래 방향키로 막을 수 있어요', (await snap()).text);
  await capture(`${label}_controls_page2`);
}
async function remainingCopy(n) {
  if ((await snap()).menuIdx === 2) await press('ArrowLeft');
  while ((await snap()).menuIdx !== 2) await press('ArrowRight');
  await until(() => game.battle.typed);
  const text = (await snap()).text;
  check(`remaining ${n} copy starts new line`, text === `* 바론을 좀 패고 있으면 용준이가 올 것 같다.\n${n}대 남았다.`, text);
  await capture(`remaining_${n}`);
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
  const introStart = await snap();
  await capture('intro_enter_start');
  await page.waitForTimeout(1000);
  const introMid = await snap();
  check('briefing entrance moves at78px per second', Math.abs((introMid.interlude.y - introStart.interlude.y) / (introMid.t - introStart.t) - 78) < 0.1, { start: introStart.interlude, middle: introMid.interlude });
  await capture('intro_enter_mid');
  await until(() => game.battle?.interlude?.snapshot.phase === 'talk' && game.battle.typed);
  check('intro follows completed enemy turn', (await snap()).patternIdx === 1, await snap());
  await page.evaluate(() => {
    window.cannonEvidence = { damage: [], sounds: [] };
    const b = game.battle, hit = b.applyCannonDamage.bind(b), sound = b.sfx.bind(b);
    b.applyCannonDamage = (...args) => { const mode = b.gimmick?.snapshot; const amount = hit(...args); cannonEvidence.damage.push({ amount, elapsed: mode?.elapsed, phaseTime: mode?.phaseTime, arrived: mode?.projectile?.arrived }); return amount; };
    b.sfx = name => { const mode = b.gimmick?.snapshot; cannonEvidence.sounds.push({ name, elapsed: mode?.elapsed, phaseTime: mode?.phaseTime }); return sound(name); };
  });
  for (let i = 0; i < 9; i++) {
    await until(() => game.battle.typed);
    s = await snap(); introLines.push(s.text);
    await capture(`intro_line_${i + 1}`);
    await press('KeyC');
  }
  const expected = await page.evaluate(async () => (await import('/src/data/baron-cannon.js')).BARON_CANNON.introLines.map(l => l.text));
  check('all nine exact intro lines shown in order', JSON.stringify(introLines) === JSON.stringify(expected), introLines);
  const exitStart = await snap();
  await page.waitForTimeout(600);
  const exitMid = await snap();
  check('briefing exit keeps65px per second', exitStart.interlude?.phase === 'exit' && exitMid.interlude?.phase === 'exit' && Math.abs((exitStart.interlude.y - exitMid.interlude.y) / (exitMid.t - exitStart.t) - 65) < 0.1, { start: exitStart.interlude, middle: exitMid.interlude });
  await until(() => game.battle?.state === 'menu');
  await press('ArrowLeft');
  await press('KeyC');
  s = await snap();
  check('unlocked zero-charge button remains disabled', s.state === 'menu' && s.menuIdx === 2 && s.charge === 0 && !s.ready, s);
  await until(() => game.battle.typed);
  await sizes('cannon_locked');
  await remainingCopy(9);
  fixtures.push('Copy4 setup: five direct ordinary damage1 hits; no battle or guard timer changes.');
  await page.evaluate(() => { const b = game.battle; for (let i = 0; i < 5; i++) b.hitEnemy(b.enemies[0], b.members[0], 1); });
  await remainingCopy(4);
  await fillCharge('success setup');
  await remainingCopy(0);
  await sizes('cannon_ready');
  const beforeSuccess = (await snap()).hp;
  await chooseCannon('success');
  const arena = await page.evaluate(async () => { const m = await import('/src/battle/modes/cannon-guard.js'); return { board: m.GUARD_BOARD, lanes: m.GUARD_LANES }; });
  check('arena spans full width with three rows', arena.board.x <= 10 && arena.board.w >= 460 && arena.board.h >= 300 && arena.lanes.length === 3, arena);
  await sizes('mode_charge_dialogue');
  await controlsPage('success');
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
    const states = [
      ['charge_start_12seconds', s.mode.phase === 'guard' && s.mode.elapsed < 0.5],
      ['breath_far', s.mode.phase === 'guard' && s.mode.elapsed > 0.8],
      ['breath_first_block', s.mode.blocked === 1],
      ['charge_early_3seconds', s.mode.phase === 'guard' && s.mode.elapsed > 3],
      ['charge_last_9seconds', s.mode.phase === 'focus' && s.mode.elapsed > 9.2],
      ['projectile_midflight', s.mode.phase === 'fire' && s.mode.phaseTime > 0.6 && !s.mode.damageApplied],
      ['projectile_impact', s.mode.phase === 'fire' && s.mode.damageApplied],
      ['damage_ui', s.mode.phase === 'fire' && s.mode.damageApplied && s.typed],
    ];
    for (const [name, active] of states) if (active && !captured.has(name)) { captured.add(name); await capture(name); }
    if (s.mode.phase === 'fire') {
      projectileSamples.push({ phaseTime: s.mode.phaseTime, projectile: s.mode.projectile, hp: s.hp, damageApplied: s.mode.damageApplied });
    }
    await page.waitForTimeout(25);
  }
  await until(() => game.battle?.gimmick?.snapshot.phase === 'success-dialogue' && game.battle.typed, 5000);
  s = await snap();
  check('all12 slow breaths blocked with real keys', s.mode.blocked === 12 && s.mode.breaths.every(b => b.blocked && b.travel === 1.1), s.mode);
  const events = await page.evaluate(() => cannonEvidence);
  const chargeCue = events.sounds.find(e => e.name === 'cannon_guard_charge'), fireCue = events.sounds.find(e => e.name === 'cannon_guard_fire');
  check('full12-second charge with sound at9 and shot at12', chargeCue?.elapsed >= 9 && chargeCue.elapsed < 9.1 && fireCue?.elapsed >= 12 && fireCue.elapsed < 12.1 && phases[2]?.elapsed >= 12 && phases[2]?.elapsed < 12.2, { phases, chargeCue, fireCue });
  check('single shot travels1.4seconds before any damage', projectileSamples.filter(p => p.phaseTime < 1.4).length > 5 && projectileSamples.filter(p => p.phaseTime < 1.4).every(p => p.hp === beforeSuccess && !p.damageApplied && !p.projectile.arrived) && events.damage.length === 1 && events.damage[0].phaseTime >= 1.4 && events.damage[0].phaseTime < 1.5 && events.damage[0].arrived, { projectileSamples, damage: events.damage });
  check('damage UI shown before success', captures.some(c => c.filename === 'damage_ui.png' && c.snapshot.text === '* 바론에게 60 데미지를 입혔다.' && c.snapshot.typed));
  check('success applies exactly60 once and exact dialogue', beforeSuccess - s.hp === 60 && s.text === '* 하하 맛이 어떠냐! 형 정비하고 올게요' && events.damage.length === 1 && events.damage[0].amount === 60, s);
  await sizes('mode_success');
  await press('KeyC');
  await page.waitForTimeout(220); await capture('mode_success_leave');
  await waitReturn();
  await sizes('success_return');
  await fillCharge('failure setup');
  const beforeFailure = (await snap()).hp;
  await chooseCannon('failure');
  await controlsPage('failure');
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
  check('charge and fire cues played', await page.evaluate(() => cannonEvidence.sounds.some(e => e.name === 'cannon_guard_charge') && cannonEvidence.sounds.some(e => e.name === 'cannon_guard_fire')));
} catch (error) {
  check('focused playtest completes', false, error.stack);
  await capture('failure_debug').catch(() => {});
} finally {
  check('no page errors', errors.length === 0, errors);
  const requiredAssetFailures = resources.filter(r => /cannon-guard|cannon_guard|assets\/sprites\/yongjun\.png/.test(r.url));
  check('new required assets have no failed requests', requiredAssetFailures.length === 0, requiredAssetFailures);
  const events = await page.evaluate(() => window.cannonEvidence || null).catch(() => null);
  fs.writeFileSync(path.join(shots, 'baron-cannon-report.json'), JSON.stringify({ base, elapsedMs: Date.now() - started, checks, failures, fixtures, introLines, phases, projectileSamples, events, captures, resources }, null, 2));
  await browser.close();
}
console.log(`fails=${failures}`);
process.exitCode = failures ? 1 : 0;
