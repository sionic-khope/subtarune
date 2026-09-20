import { runScenario } from './lib/harness.mjs';

await runScenario({ name: 'battle-preload' }, async ({ page, check }) => {
  const requests = [];
  await page.route('**/assets/**', async route => {
    requests.push(new URL(route.request().url()).pathname);
    await route.continue();
  });
  await page.goto(new URL('robots.txt', process.env.QA_BASE_URL).href);
  const state = await page.evaluate(async () => {
    const { Battle } = await import('/src/battle/battle.js');
    const game = { party: [], partyHp: {}, fadeTo() {}, sound: { playBgm() {}, preloadBgm() {} } };
    const first = Battle.preload(game, ['chinchilla']);
    const duplicate = Battle.preload(game, ['chinchilla']);
    const promiseReturned = typeof first?.then === 'function' && typeof duplicate?.then === 'function';
    const battle = new Battle(game, { enemies: ['chinchilla'], bgm: 'rude_buster' });
    const before = battle.state;
    await Promise.all([first, duplicate]);
    await new Promise(resolve => setTimeout(resolve, 0));
    const after = battle.state;
    const cancelled = new Battle(game, { enemies: ['chinchilla'], bgm: 'rude_buster' });
    cancelled.cancelPendingBgm();
    await new Promise(resolve => setTimeout(resolve, 0));
    return {
      before, after, promiseReturned, cancelled: cancelled.state,
      members: battle.members.map(member => ({ id: member.id, frames: Boolean(member.frames), down: Boolean(member.downImg) })),
      enemies: battle.enemies.map(enemy => ({ id: enemy.id, image: Boolean(enemy.img) })),
    };
  });
  check('cold encounter waits for required images', state.before === 'load', JSON.stringify(state));
  check('preload exposes an awaitable completion boundary', state.promiseReturned, JSON.stringify(state));
  check('cached assets open first battle', state.after === 'intro' && state.members[0]?.frames && state.enemies[0]?.image, JSON.stringify(state));
  check('solo party loads only hyungsub', state.members.length === 1 && state.members[0].id === 'hyungsub', JSON.stringify(state.members));
  check('cancelled load cannot reopen battle', state.cancelled === 'load', JSON.stringify(state));
  const expected = [
    '/assets/battle/hyungsub-runtime.png',
    '/assets/battle/hyungsub-run-runtime.png',
    '/assets/battle/down/hyungsub.png',
    '/assets/enemies/chinchilla-idle.png',
  ];
  check('preload deduplicates in-flight requests', expected.every(path => requests.filter(request => request === path).length === 1), JSON.stringify(requests));
});
