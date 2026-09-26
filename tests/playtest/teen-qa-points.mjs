import assert from 'node:assert/strict';
import { runScenario } from './lib/harness.mjs';

// BUILD353: 청소년전 QA 지점 네 곳이 각각 제자리에서 시작하는지.
await runScenario({ name: 'teen-qa-points', launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] } }, async ({ page, open, until, shot, check }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const at = async qa => { await open({ qa }); assert.ok(await until(() => window.game?.mapId === 'gajaeman_castle_summit' && !game.transitioning, 30000), qa); };
  await at('castle_teen_battle');
  check('castle_teen_battle opens the phase-1 battle', await until(() => game.battle?.support?.snapshot?.phase === 'guard', 20000));
  await page.waitForTimeout(1200); await shot('qa-battle');
  await at('castle_teen_p2');
  check('castle_teen_p2 opens straight into phase 2 (가재맨)', await until(() => game.battle?.support?.snapshot?.phase === 'p2' && game.battle.enemies[0].name === '가재맨', 20000));
  await page.waitForTimeout(1200); await shot('qa-p2');
  await at('castle_teen_finale');
  check('castle_teen_finale starts the finale', await until(() => game.castleSummit?.form === 'p2' && /말..말도안돼/.test(game.textbox.node?.text || ''), 20000));
  await shot('qa-finale');
  await at('castle_teen_after');
  check('castle_teen_after: field, no giant, no battle', await until(() => game.state === 'field' && !game.battle && !game.castleSummit?.giant, 20000));
  await shot('qa-after');
});
