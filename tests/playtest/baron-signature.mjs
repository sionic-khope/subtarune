import fs from 'node:fs';
import path from 'node:path';
import { enemyRects, inside } from './lib/layout.mjs';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const base = process.env.BASE_URL || 'http://localhost:8000';
const selectedPattern = process.env.SIGNATURE_PATTERN_INDEX === undefined ? null : Number(process.env.SIGNATURE_PATTERN_INDEX);
const contextChecks = process.env.SIGNATURE_CONTEXT_CHECKS === '1';
if (selectedPattern !== null && (!Number.isInteger(selectedPattern) || selectedPattern < 0 || selectedPattern > 5)) throw new Error('SIGNATURE_PATTERN_INDEX must be 0 through 5');
const shots = process.env.SHOT_DIR || new URL('./shots/baron-signature/', import.meta.url).pathname;
fs.mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true });
const page = await browser.newPage({ viewport: { width: 1000, height: 780 } });
const checks = [], errors = [], patterns = [], resourceFailures = [];
let failures = 0;
const started = Date.now();
const check = (name, ok, detail) => {
  checks.push({ name, ok: !!ok, detail });
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${JSON.stringify(detail ?? '')}`);
};
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => {
  if (message.type() === 'error' && !message.text().includes('404')) errors.push(message.text());
});
page.on('response', response => {
  if (response.status() >= 400) resourceFailures.push({ url: response.url(), status: response.status() });
});
const until = async (predicate, timeout = 15000) => {
  await page.waitForFunction(predicate, null, { timeout, polling: 30 });
};
const capture = name => page.screenshot({ path: path.join(shots, `${name}.png`) });

async function titleSelection() {
  await page.goto(`${base}/`);
  await until(() => !!window.game?.title);
  await page.keyboard.press('KeyX');
  await until(() => ['zoom', 'locked'].includes(game.title.phase));
  if (await page.evaluate(() => game.title.phase === 'zoom')) await page.keyboard.press('KeyC');
  await until(() => game.title.phase === 'locked');
  await page.keyboard.press('KeyQ');
  await until(() => !!game.title.qa);
  const index = await page.evaluate(async () => {
    const { QA_POINTS } = await import('/src/core/story.js');
    return QA_POINTS.findIndex(point => point.id === 'obj4');
  });
  if (index < 0) throw new Error('obj4 Q-menu entry missing');
  for (let i = 0; i < index; i++) {
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(35);
  }
  check('normal root Q menu selects obj4 with real keys', await page.evaluate(i => game.title.qa.i === i, index), { index });
  await capture('q_obj4_selected');
  await page.keyboard.press('KeyC');
  await until(() => game.state === 'field' && game.mapId === 'obj4');
  const entry = await page.evaluate(() => ({ map: game.mapId, battle: !!game.battle,
    seen: !!game.flags.obj4_baron_seen, done: !!game.flags.obj4_baron_done, won: !!game.flags.obj4_baron_won }));
  check('Q obj4 retains full intro flags and does not start immediate battle', !entry.battle && !entry.seen && !entry.done && !entry.won, entry);
  await page.waitForTimeout(400);
  await capture('q_obj4_field');
}

async function enterBattle() {
  await page.goto(`${base}/index.html?qa=obj4_battle`);
  await until(() => !!window.game?.player);
  await page.keyboard.press('KeyX');
  await until(() => !game.transitioning && game.fade.alpha < 0.1);
  await page.waitForTimeout(500);
  await page.keyboard.down('ArrowUp');
  try { await until(() => !!game.battle, 18000); }
  finally { await page.keyboard.up('ArrowUp'); }
  await until(() => game.battle?.state === 'menu');
  const initial = await page.evaluate(() => {
    const b = game.battle;
    return { hp: b.enemies[0].hp, maxHp: b.enemies[0].maxHp, damage: b.enemies[0].def.damage,
      modes: b.modes, bgm: game.sound.bgmName, types: b.enemies[0].def.patterns.map(p => p.type) };
  });
  check('HP100 native attack and defense modes and selected BGM retained', initial.hp === 100 && initial.maxHp === 100 && initial.modes.attack === 'rush' && initial.modes.enemy === 'bullets' && initial.bgm === 'baron_battle', initial);
  check('six dedicated Baron patterns with damage12', initial.damage === 12 && initial.types.length === 6 && new Set(initial.types).size === 6 && initial.types.every(type => type.startsWith('baron_')), initial);
  await page.evaluate(() => {
    window.signatureEvidence = { sounds: [], hits: [], motion: [] };
    const tracked = new WeakMap();
    const observeMotion = () => {
      const b = game.battle;
      if (b?.state === 'bullets') for (const bullet of b.bullets) {
        if (bullet.harmless || bullet.age < bullet.warn || bullet.age >= bullet.life) continue;
        let trace = tracked.get(bullet);
        const position = { t: b.t, age: bullet.age, x: bullet.x, y: bullet.y };
        if (!trace) {
          trace = { id: signatureEvidence.motion.length, pattern: b.enemies[0].patternIdx - 1,
            shape: bullet.shape, damage: bullet.dmg, first: position, last: position, frames: 0,
            path: 0, displacement: 0, samples: [position] };
          tracked.set(bullet, trace);
          signatureEvidence.motion.push(trace);
        }
        trace.path += Math.hypot(position.x - trace.last.x, position.y - trace.last.y);
        trace.displacement = Math.max(trace.displacement, Math.hypot(position.x - trace.first.x, position.y - trace.first.y));
        trace.last = position;
        trace.frames++;
        if (position.age - trace.samples.at(-1).age >= 0.15) trace.samples.push(position);
      }
      requestAnimationFrame(observeMotion);
    };
    requestAnimationFrame(observeMotion);
    const sound = game.sound.sfx.bind(game.sound);
    game.sound.sfx = (name, options) => {
      const b = game.battle;
      const cue = { name, pattern: b?.enemies[0].patternIdx - 1, state: b?.state, t: b?.t };
      signatureEvidence.sounds.push(cue);
      // Sample after the current update: windup sound can precede its glyph
      // emission inside the same synchronous timeline event loop.
      queueMicrotask(() => {
        const hazards = b?.bullets.filter(bullet => !bullet.harmless) || [];
        cue.activationDistance = hazards.length ? Math.min(...hazards.map(bullet => Math.abs(bullet.age - bullet.warn))) : null;
        cue.newestWarningAge = hazards.some(bullet => bullet.age < bullet.warn) ? Math.min(...hazards.filter(bullet => bullet.age < bullet.warn).map(bullet => bullet.age)) : null;
      });
      return sound(name, options);
    };
    const b = game.battle, hurt = b.hurtParty.bind(b);
    b.hurtParty = damage => {
      const before = b.members.reduce((sum, m) => sum + m.hp, 0);
      hurt(damage);
      signatureEvidence.hits.push({ damage, lostHp: before - b.members.reduce((sum, m) => sum + m.hp, 0), t: b.t, pattern: b.enemies[0].patternIdx - 1 });
      // Fixture keeps later screenshots alive after the first real collision.
      b.soul.invuln = 1000;
    };
  });
}

async function patternFixture(index) {
  console.log(`FIXTURE pattern ${index + 1}: select patternIdx, restore party, begin enemy preparation; no timer advancement or victory claim.`);
  await page.evaluate(index => {
    const b = game.battle;
    for (const m of b.members) { m.hp = m.maxHp; m.down = false; m.downTurns = 0; }
    b.enemies[0].patternIdx = index;
    b.beginEnemyTurn();
  }, index);
  await until(() => game.battle.state === 'enemy-prep' && game.battle.t > 0.6);
  if (index === 0) {
    const before = await page.evaluate(() => game.battle.soul.x);
    await page.keyboard.down('ArrowLeft');
    await page.waitForTimeout(240);
    await page.keyboard.up('ArrowLeft');
    check('real arrow input moves soul', await page.evaluate(x => game.battle.soul.x < x - 10, before), { before, after: await page.evaluate(() => game.battle.soul.x) });
  }
  await until(() => game.battle.state === 'bullets' && game.battle.bullets.some(b => !b.harmless && b.age < b.warn));
  const warning = await page.evaluate(() => ({ t: game.battle.t, hazards: game.battle.bullets.filter(b => !b.harmless).map(b => ({ shape: b.shape, age: b.age, warn: b.warn, cells: b.cells?.length, damage: b.dmg })) }));
  check(`pattern ${index + 1} visible signature warnings precede damage`, warning.hazards.length > 0 && warning.hazards.every(b => b.shape.startsWith('baron_') && b.warn >= 0.3 && b.damage === 12 && b.cells > 0), warning);
  await capture(`pattern_${index + 1}_warning`);
  await until(() => game.battle.bullets.some(b => !b.harmless && b.age >= b.warn));
  const attack = await page.evaluate(() => {
    const b = game.battle, box = b.board.rect;
    const hazards = b.bullets.filter(p => !p.harmless && p.age >= p.warn);
    return { t: b.t, shapes: [...new Set(hazards.map(p => p.shape))], count: hazards.length,
      cells: hazards.reduce((sum, p) => sum + p.cells.length, 0),
      inBounds: hazards.every(p => p.cells.every(c => p.x + c.x >= box.x && p.y + c.y >= box.y && p.x + c.x + c.w <= box.x + box.w && p.y + c.y + c.h <= box.y + box.h)) };
  });
  check(`pattern ${index + 1} active geometry is visible inside board`, attack.count > 0 && attack.cells > 0 && attack.inBounds, attack);
  // Explicit collision fixture: move onto a currently visible active cell; the
  // browser's next ordinary frame performs collision and damage processing.
  await page.evaluate(() => {
    const b = game.battle, hazard = b.bullets.find(p => !p.harmless && p.age >= p.warn);
    if (!hazard || signatureEvidence.hits.some(hit => hit.pattern === b.enemies[0].patternIdx - 1)) return;
    const box = b.board.rect;
    const cell = hazard.cells.find(c => hazard.x + c.x + c.w / 2 >= box.x + 10 && hazard.x + c.x + c.w / 2 <= box.x + box.w - 10 && hazard.y + c.y + c.h / 2 >= box.y + 10 && hazard.y + c.y + c.h / 2 <= box.y + box.h - 10) || hazard.cells[0];
    b.soul.x = hazard.x + cell.x + cell.w / 2;
    b.soul.y = hazard.y + cell.y + cell.h / 2;
    b.soul.invuln = 0;
  });
  const activeFrames = [];
  for (const [label, time] of [['mid_active', 2.5], ['late_active', 5.4]]) {
    await page.waitForFunction(time => game.battle.state === 'bullets' && game.battle.t >= time && game.battle.bullets.some(b => !b.harmless && b.age >= b.warn && b.age < b.life), time, { timeout: 10000, polling: 30 });
    activeFrames.push(await page.evaluate(label => ({ label, t: game.battle.t,
      hazards: game.battle.bullets.filter(b => !b.harmless && b.age >= b.warn && b.age < b.life).map(b => ({ shape: b.shape, x: b.x, y: b.y, age: b.age, warn: b.warn })) }), label));
    await capture(`pattern_${index + 1}_${label}`);
  }
  await until(() => game.battle.state === 'menu', 15000);
  const result = await page.evaluate(index => ({
    hp: game.battle.enemies[0].hp, bullets: game.battle.bullets.length, bubble: game.battle.bubble,
    sounds: signatureEvidence.sounds.filter(sound => sound.pattern === index),
    hits: signatureEvidence.hits.filter(hit => hit.pattern === index),
    motion: signatureEvidence.motion.filter(trace => trace.pattern === index).sort((a, b) => b.path - a.path).slice(0, 6),
    bgm: game.sound.bgmName,
  }), index);
  check(`pattern ${index + 1} same harmful glyph moves after activation`, result.motion.some(trace => trace.damage === 12 && trace.frames >= 3 && trace.path > 15 && trace.displacement > 15), result.motion);
  check(`pattern ${index + 1} collision deals12 through ordinary hurtParty`, result.hits.length > 0 && result.hits.every(hit => hit.damage === 12 && hit.lostHp === 12), result.hits);
  const bossSounds = result.sounds.filter(sound => sound.name.startsWith('baron_'));
  check(`pattern ${index + 1} gesture sounds use boss files without party hit sound`, bossSounds.length > 0 && bossSounds.every(sound => ['baron_slam', 'baron_eruption', 'baron_roar'].includes(sound.name) && sound.state === 'bullets') && !result.sounds.some(sound => ['hit', 'damage'].includes(sound.name)), bossSounds);
  check(`pattern ${index + 1} boss sounds align with windup or activation`, bossSounds.every(sound => sound.name === 'baron_roar' ? sound.newestWarningAge !== null && sound.newestWarningAge < 0.1 : sound.activationDistance !== null && sound.activationDistance < 0.1), bossSounds);
  check(`pattern ${index + 1} natural phase completion clears hazards`, result.bullets === 0 && result.bubble === null && result.hp === 100 && result.bgm === 'baron_battle', result);
  patterns.push({ index, warning, attack, activeFrames, ...result });
}

async function viewportChecks() {
  for (const width of [375, 768, 1280]) {
    await page.setViewportSize({ width, height: 800 });
    await page.waitForTimeout(200);
    const canvas = await page.locator('canvas').first().boundingBox();
    const rects = await enemyRects(page);
    check(`same battle fits ${width}px viewport`, canvas && canvas.x >= -1 && canvas.y >= -1 && canvas.x + canvas.width <= width + 1 && canvas.y + canvas.height <= 801 && rects.every(rect => inside(rect, { x: 0, y: 0, w: 480, h: 246 })), { canvas, rects });
    await capture(`battle_viewport_${width}`);
  }
}

try {
  if (contextChecks && selectedPattern === null) await titleSelection();
  await enterBattle();
  for (const index of selectedPattern === null ? [0, 1, 2, 3, 4, 5] : [selectedPattern]) await patternFixture(index);
  if (contextChecks && selectedPattern === null) await viewportChecks();
} catch (error) {
  check('focused signature playtest completes', false, error.stack);
  await capture('failure').catch(() => {});
} finally {
  check('no browser errors', errors.length === 0, errors);
  const requiredFailures = resourceFailures.filter(resource => /\/(baron-patterns\.js|baron-battle-idle\.png|baron_(slam|eruption|roar|battle)\.mp3)(\?|$)/.test(resource.url));
  check('required Baron resources load', requiredFailures.length === 0, requiredFailures);
  fs.writeFileSync(path.join(shots, 'baron-signature-report.json'), JSON.stringify({ base, elapsedMs: Date.now() - started, contextChecks, fixture: 'Pattern selection / party restoration / explicit active-cell collision / invulnerability after first collision; natural browser timers, WeakMap identity tracks the same harmful glyph only while active, and natural phase completion. No full victory replay or human difficulty verdict.', checks, patterns, resourceFailures, failures }, null, 2));
  await browser.close();
}
console.log(`fails=${failures}`);
process.exitCode = failures ? 1 : 0;
