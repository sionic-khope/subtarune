import { runScenario } from './lib/harness.mjs';

await runScenario({ name: 'loading-map-race' }, async ({ page, check, until, open, shot, fixture }) => {
  let delayed = false;
  await page.route('**/assets/maps/void2.json*', async route => {
    delayed = true;
    await new Promise(resolve => setTimeout(resolve, 1400));
    await route.continue();
  });
  await page.route('**/assets/maps/test.json*', async route => {
    await new Promise(resolve => setTimeout(resolve, 700));
    await route.continue();
  });
  await open();
  const title = await until(() => window.game?.state === 'title' && !!game.mapAssets, 10000);
  check('title appears before a cold destination is requested', !!title);
  await fixture('overlapping-cold-map-requests', 'Delay void2 JSON, then request test room; the later destination must win.', () => {
    void game.changeMap('void2', 'start', true, { enter: false });
    void game.changeMap('test', 'start', true, { enter: false });
  });
  await shot('loading-pending');
  const status = await page.evaluate(() => ({ text: document.getElementById('loading-status')?.textContent, hidden: document.getElementById('loading-status')?.hidden }));
  check('map preparation status stays hidden while waiting (BUILD254: 사용자 “맵로딩중 텍스트는 굳이 안떠도될듯”)', status.hidden !== false, JSON.stringify(status));
  const second = await until(() => game.mapId === 'test' && !game.transitioning, 10000);
  check('later cold destination commits first', !!second);
  await page.waitForTimeout(1700);
  const state = await page.evaluate(() => ({ map: game.mapId, loading: game.loadingMap, transitioning: game.transitioning, statusHidden: document.getElementById('loading-status')?.hidden }));
  check('late first request cannot replace the active map', delayed && state.map === 'test', JSON.stringify(state));
  check('map gate and loading status clean up', !state.loading && !state.transitioning && state.statusHidden, JSON.stringify(state));
  await page.evaluate(() => { game.state = 'field'; });
  await shot('later-map-wins');
});
