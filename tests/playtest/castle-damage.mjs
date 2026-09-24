import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { runScenario } from './lib/harness.mjs';
import { escToTitle } from './lib/esc.mjs';

const ENCOUNTERS = [
  { id: 'seobruto', qa: 'memory_seobruto', direction: 'ArrowRight', ids: ['seobruto'], prefixes: ['memory_'] },
  { id: 'syndrasub', qa: 'castle_regret_syndra', direction: 'ArrowLeft', ids: ['syndrasub'], prefixes: ['regret_dark_sphere'] },
  { id: 'duo', qa: 'castle_regret_duo', direction: 'ArrowRight', ids: ['taliyahsub', 'aurelionsub'], prefixes: ['taliyah_', 'aurelion_'] },
];

await runScenario({ name: 'castle-damage' }, async ({ page, open, until, press, shot, fixture, check }) => {
  const sourceRoot = process.env.QA_RESULT_FILE
    ? JSON.parse(fs.readFileSync(path.join(path.dirname(process.env.QA_RESULT_FILE), '..', 'summary.json'), 'utf8')).cwd
    : process.cwd();
  for (const file of ['src/data/enemies.js', 'src/battle/battle.js', 'src/battle/bullets.js']) {
    const local = fs.readFileSync(path.join(sourceRoot, file));
    const response = await fetch(new URL(file, process.env.QA_BASE_URL));
    const served = Buffer.from(await response.arrayBuffer());
    const hash = data => createHash('sha256').update(data).digest('hex');
    check(`served source identity ${file}`, response.ok && hash(local) === hash(served), hash(served));
  }
  const key = async code => { await press(code, { delay: 45 }); await page.waitForTimeout(100); };
  for (const config of ENCOUNTERS) {
    await open({ qa: config.qa });
    assert.ok(await until(() => window.game?.state === 'field' && !game.transitioning && !game.dialogue.running && game.fade.alpha < 0.01, 25000));
    await page.keyboard.down(config.direction);
    try { assert.ok(await until(() => !!game.battle, 10000), `${config.id} physical encounter`); }
    finally { await page.keyboard.up(config.direction); }
    assert.ok(await until(() => game.battle?.state === 'intro' && game.battle.enemies.every(e => e.img), 25000));
    while (await page.evaluate(() => game.battle?.state === 'intro')) {
      if (await page.evaluate(() => game.battle.typed && game.battle.t > 0.65)) await key('KeyC');
      else await page.waitForTimeout(80);
    }
    assert.ok(await until(() => game.battle?.state === 'menu', 5000));
    const roster = await page.evaluate(() => game.battle.enemies.map(e => ({ id: e.id, damage: e.def.damage, damageStep: e.def.damageStep })));
    check(`${config.id} production roster uses fixed25 damage`, JSON.stringify(roster.map(e => e.id)) === JSON.stringify(config.ids) && roster.every(e => e.damage === 25 && e.damageStep === 0), JSON.stringify(roster));
    for (let i = 0; i < 3; i++) {
      await key('KeyC'); assert.equal(await page.evaluate(() => game.battle.state), 'target'); await key('KeyC');
    }
    assert.ok(await until(() => game.battle?.state === 'enemy-prep', 12000));
    await shot(`${config.id}-before`);
    await fixture(`${config.id}-read-only-collision-observer`, 'Install a browser-local requestAnimationFrame observer of naturally emitted bullets and party HP. It changes no damage, HP, bullet, heart position, invulnerability, pattern or clock. No movement is pressed during the attack.', () => {
      const b = game.battle;
      const hp = () => b.members.map(m => ({ id: m.id, hp: m.hp }));
      const trace = { before: hp(), hits: [], emissions: {}, done: false };
      window.castleDamageTrace = trace;
      let previous = hp();
      const observe = () => {
        if (game.battle !== b) { trace.done = true; return; }
        for (const bullet of b.bullets) trace.emissions[bullet.shape] = bullet.dmg;
        const current = hp();
        const delta = previous.reduce((sum, m, i) => sum + m.hp - current[i].hp, 0);
        if (delta > 0) trace.hits.push({ delta, before: previous, after: current, soulHits: b.soul.hits,
          bullets: b.bullets.map(p => ({ shape: p.shape, dmg: p.dmg, age: p.age, warn: p.warn })) });
        previous = current;
        if (['menu', 'lose', 'win'].includes(b.state)) { trace.done = true; return; }
        requestAnimationFrame(observe);
      };
      requestAnimationFrame(observe);
    });
    assert.ok(await until(() => game.battle?.state === 'bullets', 8000));
    if (config.ids.length === 1) {
      assert.ok(await until(() => window.castleDamageTrace.hits.length >= 2 || window.castleDamageTrace.done, 10000));
      const trace = await page.evaluate(() => window.castleDamageTrace);
      check(`${config.id} two real stationary projectile collisions each remove25 HP`, trace.hits.length >= 2 && trace.hits.slice(0, 2).every(hit => hit.delta === 25), JSON.stringify(trace));
      await shot(`${config.id}-after-two-hits`);
    } else {
      assert.ok(await until(() => Object.keys(window.castleDamageTrace.emissions).some(s => s.startsWith('aurelion_')), 8000));
      await shot('duo-both-emit');
    }
    await fixture(`${config.id}-post-measurement-protection`, 'Only after measured collision/emission evidence, protect the soul so the remainder of this unchanged attack can finish and return to the menu. This does not count as human avoidance.', () => { game.battle.soul.invuln = 999; });
    assert.ok(await until(() => game.battle?.state === 'menu', 12000));
    const trace = await page.evaluate(() => window.castleDamageTrace);
    for (const prefix of config.prefixes) {
      const bullets = Object.entries(trace.emissions).filter(([shape]) => shape.startsWith(prefix));
      check(`${config.id} ${prefix} actual emitted projectiles inherit25`, bullets.length > 0 && bullets.every(([, damage]) => damage === 25), JSON.stringify(bullets));
    }
    check(`${config.id} natural enemy phase returns to menu`, trace.done && await page.evaluate(() => game.battle.bullets.length === 0));
    await shot(`${config.id}-returned-menu`);
    await escToTitle(page);
    assert.ok(await until(() => game.state === 'title', 5000));
  }
});
