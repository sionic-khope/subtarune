import fs from 'node:fs';
import path from 'node:path';
import { runScenario } from './lib/harness.mjs';
import { escToTitle } from './lib/esc.mjs';

const ASSET_WAIT_MS = 15000;
const REPEAT_WAIT_MS = 12000;

const round = value => Number.isFinite(value) ? Math.round(value * 10) / 10 : null;

function resourceSummary(resources) {
  const rows = resources.map(entry => ({
    name: entry.name,
    initiatorType: entry.initiatorType,
    durationMs: round(entry.duration),
    transferSize: Number(entry.transferSize) || 0,
    encodedBodySize: Number(entry.encodedBodySize) || 0,
    decodedBodySize: Number(entry.decodedBodySize) || 0,
  }));
  return {
    count: rows.length,
    transferBytes: rows.reduce((sum, row) => sum + row.transferSize, 0),
    encodedBytes: rows.reduce((sum, row) => sum + row.encodedBodySize, 0),
    decodedBytes: rows.reduce((sum, row) => sum + row.decodedBodySize, 0),
    rows,
  };
}

async function readCanvasPixel(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('#screen');
    if (!canvas || !canvas.width || !canvas.height) return null;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] || data[i + 1] || data[i + 2]) return { r: data[i], g: data[i + 1], b: data[i + 2], a: data[i + 3] };
    }
    return { r: 0, g: 0, b: 0, a: 0 };
  });
}

async function collectMetrics(page, network, extra = {}) {
  const networkStart = extra.networkStart || { requests: 0, responses: 0, failures: 0 };
  const pageState = await page.evaluate(() => {
    const g = window.game;
    const resources = performance.getEntriesByType('resource').map(entry => ({
      name: entry.name,
      initiatorType: entry.initiatorType,
      duration: entry.duration,
      transferSize: entry.transferSize,
      encodedBodySize: entry.encodedBodySize,
      decodedBodySize: entry.decodedBodySize,
    }));
    return {
      now: performance.now(),
      title: !!g?.title,
      gameReady: !!(g?.title && g?.textbox && g?.camera),
      state: g?.state ?? null,
      mapId: g?.mapId ?? null,
      transitioning: !!g?.transitioning,
      battleState: g?.battle?.state ?? null,
      enemyImages: g?.battle?.enemies?.map(enemy => ({ id: enemy.id, loaded: !!enemy.img })) ?? [],
      resources,
    };
  });
  return {
    ...extra,
    at: round(pageState.now),
    state: pageState,
    canvasPixel: await readCanvasPixel(page),
    resources: resourceSummary(pageState.resources),
    requestCount: network.requests.length - networkStart.requests,
    requestCountCumulative: network.requests.length,
    requestFailures: network.failures.slice(networkStart.failures),
    httpErrors: network.responses.slice(networkStart.responses).filter(row => row.status >= 400),
    pendingAtSample: [...network.pending.values()].map(row => ({ url: row.url, type: row.type })),
  };
}

function installNetworkProbe(page) {
  const network = { requests: [], responses: [], failures: [], pending: new Map() };
  network.mark = () => ({ requests: network.requests.length, responses: network.responses.length, failures: network.failures.length });
  page.on('request', request => {
    const row = { url: request.url(), type: request.resourceType(), startedAt: Date.now() };
    network.requests.push(row);
    network.pending.set(request, row);
  });
  page.on('response', response => {
    const row = { url: response.url(), status: response.status(), type: response.request().resourceType() };
    network.responses.push(row);
  });
  page.on('requestfailed', request => {
    network.failures.push({ url: request.url(), type: request.resourceType(), failure: request.failure()?.errorText ?? 'unknown' });
    network.pending.delete(request);
  });
  page.on('requestfinished', request => network.pending.delete(request));
  return network;
}

async function waitForBoot(page, timeout = ASSET_WAIT_MS) {
  const firstVisible = await page.waitForFunction(() => {
    const canvas = document.querySelector('#screen');
    if (!canvas || !window.game) return false;
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    for (let i = 0; i < data.length; i += 4) if (data[i] || data[i + 1] || data[i + 2]) return performance.now();
    return false;
  }, undefined, { timeout, polling: 20 }).then(handle => handle.jsonValue()).catch(() => null);
  const gameReady = await page.waitForFunction(() => window.game?.title && window.game?.textbox && window.game?.camera ? performance.now() : false, undefined, { timeout, polling: 20 }).then(handle => handle.jsonValue()).catch(() => null);
  return { firstVisible: round(firstVisible), gameReady: round(gameReady) };
}

async function loadAndMeasure(page, network, url, timeout = ASSET_WAIT_MS) {
  const wallStarted = Date.now();
  const networkStart = network.mark();
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  const marks = await waitForBoot(page, timeout);
  await page.waitForTimeout(500);
  const measured = await collectMetrics(page, network, { url, wallElapsedMs: Date.now() - wallStarted, firstVisible: marks.firstVisible, gameReady: marks.gameReady, networkStart });
  return measured;
}

await runScenario({ name: 'loading-performance' }, async ({ page, check, until, press, open, shot, fixture }) => {
  const network = installNetworkProbe(page);
  // Playwright routing disables the browser HTTP cache, so every navigation below
  // is a genuine cold network measurement; repeat timings are still a separate
  // navigation and are reported independently.
  await page.route('**/*', route => route.continue());
  const base = new URL(process.env.QA_BASE_URL);
  const bootUrl = new URL('index.html', base); bootUrl.searchParams.set('loadingQa', 'measure');
  const chinUrl = new URL('index.html', base); chinUrl.searchParams.set('qa', 'jjajang_chin1_chin'); chinUrl.searchParams.set('loadingQa', 'measure');
  const artifactDir = process.env.SHOT_DIR ? path.dirname(process.env.SHOT_DIR) : process.cwd();
  const metrics = [];

  // Arrange: a map JSON from a distant destination is intentionally held for 3.5s.
  // Act: boot the title while this unrelated request is delayed.
  // Assert: title visibility/ready must not wait for this request. A zero hit count is
  // also valid evidence of deferral, and is recorded rather than hidden.
  let unrelatedHits = 0;
  await page.route('**/assets/maps/obj4.json*', async route => {
    unrelatedHits += 1;
    await page.waitForTimeout(3500);
    await route.continue();
  });
  const delayedUnrelated = await loadAndMeasure(page, network, bootUrl.href, ASSET_WAIT_MS).catch(error => ({ routeError: error.message }));
  await page.unroute('**/assets/maps/obj4.json*');
  metrics.push({ scenario: 'delayed-unrelated-title', unrelatedHits, ...delayedUnrelated });
  await shot('delayed-unrelated-title');
  check('title reaches gameReady under a delayed unrelated map request', delayedUnrelated.gameReady !== null && delayedUnrelated.gameReady < 3000, JSON.stringify({ unrelatedHits, firstVisible: delayedUnrelated.firstVisible, gameReady: delayedUnrelated.gameReady }));

  let blockedCdnHits = 0;
  await page.route('**/cdn.jsdelivr.net/**', async route => {
    blockedCdnHits += 1;
    await route.abort('blockedbyclient');
  });
  const blockedCdnBoot = await loadAndMeasure(page, network, bootUrl.href, ASSET_WAIT_MS).catch(error => ({ routeError: error.message }));
  await page.unroute('**/cdn.jsdelivr.net/**');
  metrics.push({ scenario: 'blocked-font-cdn-title', blockedCdnHits, ...blockedCdnBoot });
  await shot('blocked-font-cdn-title');
  check('title reaches gameReady with jsDelivr blocked', blockedCdnBoot.gameReady !== null, JSON.stringify({ blockedCdnHits, firstVisible: blockedCdnBoot.firstVisible, gameReady: blockedCdnBoot.gameReady, failures: blockedCdnBoot.requestFailures }));

  const coldBoot = await loadAndMeasure(page, network, bootUrl.href);
  metrics.push({ scenario: 'cold-title', ...coldBoot });
  await shot('cold-title');
  check('cold title produces a visible canvas frame', coldBoot.firstVisible !== null, JSON.stringify({ firstVisible: coldBoot.firstVisible }));
  check('cold title reaches gameReady', coldBoot.gameReady !== null, JSON.stringify({ gameReady: coldBoot.gameReady }));
  check('cold title remains on title surface', coldBoot.state.state === 'title', JSON.stringify(coldBoot.state));

  const repeat = await loadAndMeasure(page, network, bootUrl.href, REPEAT_WAIT_MS);
  metrics.push({ scenario: 'repeat-title', ...repeat });
  await shot('repeat-title');
  check('repeat title reaches visible and ready states', repeat.firstVisible !== null && repeat.gameReady !== null, JSON.stringify({ firstVisible: repeat.firstVisible, gameReady: repeat.gameReady }));

  let mapGateHits = 0;
  await page.route('**/assets/props/jjajang_pine_1.png*', async route => {
    mapGateHits += 1;
    await page.waitForTimeout(3500);
    await route.continue();
  });
  const chinNetworkStart = network.mark();
  await page.goto(chinUrl.href, { waitUntil: 'domcontentloaded' });
  for (let i = 0; i < 20 && mapGateHits === 0; i += 1) await page.waitForTimeout(100);
  const duringMapGate = await page.evaluate(() => ({
    loadingMap: window.game?.loadingMap ?? null,
    mapId: window.game?.mapId ?? null,
    transitioning: !!window.game?.transitioning,
    titleReady: !!window.game?.title,
  }));
  const chinMarks = await waitForBoot(page);
  const beforeEntry = await page.waitForFunction(() => window.game?.mapId === 'jjajang_chin1' && !window.game?.dialogue?.running && !window.game?.battle && !window.game?.transitioning, undefined, { timeout: ASSET_WAIT_MS, polling: 30 }).then(() => true).catch(() => false);
  await page.unroute('**/assets/props/jjajang_pine_1.png*');
  const chinBoot = await collectMetrics(page, network, { url: chinUrl.href, firstVisible: chinMarks.firstVisible, gameReady: chinMarks.gameReady, destinationReady: beforeEntry, mapGateHits, duringMapGate, networkStart: chinNetworkStart });
  metrics.push({ scenario: 'cold-chinchilla-destination', ...chinBoot });
  await shot('chinchilla-before-entry');
  check('delayed map destination request is exercised', mapGateHits > 0, JSON.stringify({ mapGateHits, duringMapGate }));
  check('destination stays unpublished while its asset is delayed', mapGateHits > 0 && (duringMapGate.loadingMap === 'jjajang_chin1' || duringMapGate.mapId !== 'jjajang_chin1'), JSON.stringify(duringMapGate));
  check('cold Chinchilla QA reaches visible and ready states after map gate', chinMarks.firstVisible !== null && chinMarks.gameReady !== null, JSON.stringify(chinMarks));
  check('cold Chinchilla QA destination gate resolves to jjajang_chin1', beforeEntry, JSON.stringify(chinBoot.state));

  const entryNetworkStart = network.mark();
  const entryStarted = await page.evaluate(() => performance.now());
  await page.keyboard.down('ArrowRight');
  const intro = await page.waitForFunction(() => window.game?.battle?.state === 'intro', undefined, { timeout: ASSET_WAIT_MS, polling: 30 }).then(handle => handle.jsonValue()).catch(() => null);
  await page.keyboard.up('ArrowRight');
  const introState = await page.evaluate(() => ({ at: performance.now(), battle: window.game?.battle?.state ?? null, enemies: window.game?.battle?.enemies?.map(e => ({ id: e.id, loaded: !!e.img })) ?? [] }));
  const entry = await collectMetrics(page, network, { scenario: 'entry-intro', entryStart: round(entryStarted), entryIntro: round(introState.at), introSeen: intro !== null, introState, networkStart: entryNetworkStart });
  metrics.push(entry);
  await shot('chinchilla-entry-intro');
  check('real ArrowRight entry reaches battle intro', intro !== null, JSON.stringify(introState));
  check('battle intro has enemy art loaded', introState.enemies.length > 0 && introState.enemies.every(enemy => enemy.loaded), JSON.stringify(introState));

  const escapeNetworkStart = network.mark();
  await escToTitle(page);
  const escaped = await page.waitForFunction(() => !window.game?.battle && !window.game?.transitioning, undefined, { timeout: 6000, polling: 30 }).then(() => true).catch(() => false);
  const postEscape = await collectMetrics(page, network, { scenario: 'post-entry-escape', networkStart: escapeNetworkStart });
  metrics.push(postEscape);
  check('entry cleanup does not leave an active battle after Escape', escaped && postEscape.state.battleState === null && !postEscape.state.transitioning, JSON.stringify({ escaped, state: postEscape.state }));

  const repeatNetworkStart = network.mark();
  await page.goto(chinUrl.href, { waitUntil: 'domcontentloaded' });
  const repeatChinMarks = await waitForBoot(page);
  const repeatDestination = await page.waitForFunction(() => window.game?.mapId === 'jjajang_chin1' && !window.game?.dialogue?.running && !window.game?.transitioning, undefined, { timeout: ASSET_WAIT_MS, polling: 30 }).then(() => true).catch(() => false);
  await page.keyboard.down('ArrowRight');
  const repeatIntro = await page.waitForFunction(() => window.game?.battle?.state === 'intro', undefined, { timeout: ASSET_WAIT_MS, polling: 30 }).then(handle => handle.jsonValue()).catch(() => null);
  await page.keyboard.up('ArrowRight');
  const repeatIntroState = await page.evaluate(() => ({ at: performance.now(), battle: window.game?.battle?.state ?? null, enemies: window.game?.battle?.enemies?.map(e => ({ id: e.id, loaded: !!e.img })) ?? [] }));
  const repeatBattle = await collectMetrics(page, network, { scenario: 'repeat-entry-intro', firstVisible: repeatChinMarks.firstVisible, gameReady: repeatChinMarks.gameReady, destinationReady: repeatDestination, introSeen: repeatIntro !== null, introState: repeatIntroState, networkStart: repeatNetworkStart });
  metrics.push(repeatBattle);
  await shot('chinchilla-repeat-entry-intro');
  check('repeat Chinchilla QA destination resolves', repeatDestination, JSON.stringify({ repeatChinMarks, repeatDestination }));
  check('repeat ArrowRight entry reaches battle intro with enemy art', repeatIntro !== null && repeatIntroState.enemies.length > 0 && repeatIntroState.enemies.every(enemy => enemy.loaded), JSON.stringify(repeatIntroState));

  // User path 1: title -> New Game -> opening dialogue. Save deletion is only a
  // fixture; the title sequence and C input remain real browser actions.
  await open({ params: { loadingQa: 'measure' } });
  await waitForBoot(page);
  await fixture('newgame-clean-save', 'Remove the existing save so the title confirm selects New Game.', () => localStorage.removeItem('subtarune.save.v1'));
  await page.waitForTimeout(300);
  await press('Space');
  await page.waitForFunction(() => window.game?.title?.phase === 'zoom', undefined, { timeout: 6000 });
  await press('KeyC');
  await page.waitForFunction(() => window.game?.title?.phase === 'locked', undefined, { timeout: 6000 });
  await page.waitForTimeout(3300);
  await press('KeyC');
  const newGameOpening = await page.waitForFunction(() => window.game?.state === 'field' && window.game?.dialogue?.running, undefined, { timeout: 10000 }).then(() => true).catch(() => false);
  const newGameState = await page.evaluate(() => ({ state: window.game?.state, mapId: window.game?.mapId, dialogue: !!window.game?.dialogue?.running, bgm: window.game?.sound?.bgmName ?? null }));
  await shot('newgame-opening');
  check('title New Game opens the real opening dialogue', newGameOpening, JSON.stringify(newGameState));

  // User path 2: field menu -> item -> target -> field. HP/inventory setup is a
  // fixture; menu navigation, item confirmation, target selection, and cancel are real.
  await open({ qa: 'teal4' });
  await waitForBoot(page);
  await page.waitForFunction(() => window.game?.mapId === 'teal_east' && window.game?.player, undefined, { timeout: ASSET_WAIT_MS });
  await press('KeyX');
  await page.waitForTimeout(300);
  await fixture('menu-item-state', 'Set the documented menu regression state: Hyungsub HP 50 and Dust plus Banana.', () => {
    window.game.partyHp.hyungsub = 50;
    window.game.inventory = ['먼지', '바나나'];
  });
  await press('KeyV');
  await page.waitForFunction(() => window.game?.state === 'menu', undefined, { timeout: 4000 });
  await press('KeyC'); await page.waitForTimeout(150); await press('KeyC'); await page.waitForTimeout(150);
  const targetPicker = await page.evaluate(() => ({ sub: window.game?.menu?.sub, pick: window.game?.menu?.pick }));
  check('field menu opens item target picker', targetPicker.sub === 0 && targetPicker.pick === 0, JSON.stringify(targetPicker));
  await press('KeyC');
  const itemApplied = await page.waitForFunction(() => window.game?.hpOf('hyungsub') === 51 && !window.game.inventory.includes('먼지'), undefined, { timeout: 4000 }).then(() => true).catch(() => false);
  for (let i = 0; i < 6 && await page.evaluate(() => window.game?.state !== 'field'); i += 1) { await press('KeyX'); await page.waitForTimeout(200); }
  const menuReturn = await page.waitForFunction(() => window.game?.state === 'field', undefined, { timeout: 4000 }).then(() => true).catch(() => false);
  const menuState = await page.evaluate(() => ({ hp: window.game?.hpOf('hyungsub'), inventory: [...(window.game?.inventory || [])], state: window.game?.state }));
  await shot('menu-item-return');
  check('menu item applies Dust once and X returns to field', itemApplied && menuReturn && menuState.hp === 51 && menuState.inventory.includes('바나나'), JSON.stringify({ targetPicker, menuState }));

  // User path 3: checkpoint -> autosave -> title -> Continue. Save creation is a
  // fixture; title/Continue and follower restoration are real browser actions.
  await open({ qa: 'teal3' });
  await waitForBoot(page);
  await page.waitForFunction(() => window.game?.mapId === 'teal3' && window.game?.player, undefined, { timeout: ASSET_WAIT_MS });
  await fixture('continue-save', 'Persist the QA checkpoint through the game autosave path before returning to title.', () => window.game.autosave());
  const savedCheckpoint = await page.evaluate(() => JSON.parse(localStorage.getItem('subtarune.save.v1')));
  await open({ params: { loadingQa: 'measure' } });
  await waitForBoot(page);
  await page.waitForTimeout(300); await press('Space');
  await page.waitForFunction(() => window.game?.title?.phase === 'zoom', undefined, { timeout: 6000 });
  await press('KeyC');
  await page.waitForFunction(() => window.game?.title?.phase === 'locked', undefined, { timeout: 6000 });
  await page.waitForTimeout(3300); await press('KeyC');
  const continued = await page.waitForFunction(() => window.game?.state === 'field' && window.game?.mapId === 'teal3' && !window.game?.dialogue?.running, undefined, { timeout: 12000 }).then(() => true).catch(() => false);
  const continueState = await page.evaluate(() => {
    const g = window.game; const p = g?.player;
    const followers = (g?.entities || []).filter(entity => entity.def?.type === 'follower' && !entity.dead).map(entity => Math.round(Math.hypot(entity.x - p.x, entity.y - p.y)));
    return { state: g?.state, mapId: g?.mapId, party: [...(g?.party || [])], followers, hp: g?.hpOf('hyungsub') ?? null };
  });
  await shot('continue-teal3');
  check('Continue restores teal3 with both followers beside the player', continued && continueState.party.join() === 'gyeongsub,ppaman' && continueState.followers.length === 2 && continueState.followers.every(distance => distance <= 96), JSON.stringify({ saved: { map: savedCheckpoint?.map, party: savedCheckpoint?.party }, continueState }));

  const unexpectedPending = metrics.flatMap(row => (row.pendingAtSample || []).map(request => ({ scenario: row.scenario, ...request })))
    .filter(request => !/\/assets\/audio\//.test(request.url));
  check('network samples have no unexpected pending requests (runtime audio preload is allowed)', unexpectedPending.length === 0, JSON.stringify(unexpectedPending));

  await fs.promises.mkdir(artifactDir, { recursive: true });
  await fs.promises.writeFile(path.join(artifactDir, 'loading-performance-metrics.json'), JSON.stringify({
    generatedAt: new Date().toISOString(),
    baseUrl: base.href,
    measurementLimits: { cpu: 'not measured: Playwright exposes no browser-process CPU counter; no CPU claim is made' },
    metrics,
  }, null, 2) + '\n');
  console.log(JSON.stringify({ baseUrl: base.href, measurementLimits: { cpu: 'not measured' }, metrics: metrics.map(row => ({ scenario: row.scenario, wallElapsedMs: row.wallElapsedMs, firstVisible: row.firstVisible, gameReady: row.gameReady, destinationReady: row.destinationReady, introSeen: row.introSeen, resources: row.resources, requestFailures: row.requestFailures, pendingAtSample: row.pendingAtSample.length })) }, null, 2));
});
