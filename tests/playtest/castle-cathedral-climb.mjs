import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { runScenario } from './lib/harness.mjs';
import { escToTitle } from './lib/esc.mjs';

// BUILD323: 대성당 입장 연출(무음 입장 → 가재맨 등장 → 상승 → 바람 → 검 생성) 과 3열 검 회피 오르기.
await runScenario({ name: 'castle-cathedral-climb', launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] } }, async ({ page, open, until, press, shot, fixture, check }) => {
  const obs = { lines: [], beats: {}, hits: [], volleys: [], bgm: [] };
  const key = async code => { await press(code, { delay: 40 }); await page.waitForTimeout(90); };
  const snap = () => page.evaluate(() => ({ map: game.mapId, xy: [game.player.x, game.player.y], state: game.state,
    dialogue: game.dialogue.running, text: game.textbox.isOpen ? game.textbox.node?.text : null,
    hp: ['hyungsub', ...game.party].map(id => game.hpOf(id)), bgm: game.sound.bgmName,
    camera: [Math.round(game.camera.x), Math.round(game.camera.y)], zoom: game.zoom.s,
    scene: game.castleCathedral?.snapshot || null,
    gajaeman: (() => { const e = game.entities.find(x => x.id === 'cathedral_gajaeman'); return e && { xy: [e.x, e.y], visible: e.visible !== false && !e.hidden }; })(),
    followers: game.entities.filter(e => e.def?.type === 'follower').map(e => [Math.round(e.x), Math.round(e.y)]) }));
  const waitLine = async (text, timeout = 20000) => {
    const ok = await page.waitForFunction(t => game.textbox.isOpen && game.textbox.state === 'waiting' && game.textbox.node?.text === t, text, { timeout, polling: 80 }).then(() => true, () => false);
    if (!ok) await shot(`fail-${obs.lines.length}`);
    assert.ok(ok, `line ${text}: ${JSON.stringify(await snap())}`);
  };
  await page.setViewportSize({ width: 1280, height: 900 });
  await open({ qa: 'castle_cathedral_intro' });
  assert.ok(await until(() => window.game?.mapId === 'gajaeman_castle_cathedral' && !game.transitioning, 30000));
  await fixture('read-only-sampler', 'Record positions, camera and scene phases every draw; nothing is injected.', () => {
    const q = window.__climbQA = { samples: [] }, draw = game.draw.bind(game);
    game.draw = (...args) => {
      const r = draw(...args), s = game.castleCathedral?.snapshot;
      if (!q.samples.length || performance.now() - q.samples.at(-1).at > 50) q.samples.push({ at: performance.now(), y: game.player?.y,
        cam: game.camera.y, fade: game.fade.alpha, dialogue: game.dialogue.running, beat: s?.beat, wind: s?.wind, swords: s?.swords?.length || 0 });
      return r;
    };
  });
  await page.waitForTimeout(1500); await shot('01-walk-in');
  obs.beats.walk = await snap();
  check('entry is silent (no BGM before the laugh)', !obs.beats.walk.bgm, obs.beats.walk.bgm);
  await waitLine('* 여긴 어딜까요'); await shot('02-first-line'); obs.beats.stand = await snap();
  const [px, py] = obs.beats.stand.xy;
  check('party reached the landing on foot', py < 7800 && obs.beats.stand.followers.length === 2, JSON.stringify(obs.beats.stand));
  await key('KeyC');
  await waitLine('* 후후후'); await shot('03-laugh');
  obs.beats.cut = await page.evaluate(() => window.__climbQA.samples.length);
  await key('KeyC');
  assert.ok(await until(() => game.castleCathedral?.beat === 'descend', 8000)); await page.waitForTimeout(900); await shot('04-descend-mid');
  obs.beats.descend = await snap();
  check('intense theme starts with the descent', obs.beats.descend.bgm === 'castle_gajaeman', obs.beats.descend.bgm);
  await waitLine('* 용캐 여기까지 지나왔구나.'); await shot('05-gajaeman-arrived'); obs.beats.arrived = await snap();
  for (const text of ['* 용캐 여기까지 지나왔구나.', '* 씨발년', '* 그래 너희들의 능력은 인정해주지', '* 한번 붙어보자고', '* 물론', '* 날 잡는다면 말이지']) {
    await waitLine(text); obs.lines.push(text); await key('KeyC');
  }
  assert.ok(await until(() => game.castleCathedral?.beat === 'rise', 5000)); await page.waitForTimeout(350); await shot('06-rise'); obs.beats.rise = await snap();
  assert.ok(await until(() => game.castleCathedral?.snapshot.wind > 0.3, 10000)); await page.waitForTimeout(200); await shot('07-wind-hit');
  obs.beats.wind = await snap();
  await waitLine('* 으윽..'); await shot('08-wind-hold'); obs.beats.hold = await snap();
  check('party pushed back from the chase peak', obs.beats.hold.xy[1] > obs.beats.wind.xy[1] - 1, JSON.stringify([obs.beats.wind.xy, obs.beats.hold.xy]));
  await key('KeyC'); await waitLine('* 어떻게든 뚫고가야해'); await key('KeyC');
  assert.ok(await until(() => game.castleCathedral?.beat === 'arrive', 8000)); await page.waitForTimeout(700); await shot('09a-arrive-mid');
  assert.ok(await until(() => game.castleCathedral?.beat === 'forge', 8000)); await page.waitForTimeout(1600); await shot('09-forge-mid');
  assert.ok(await until(() => game.castleCathedral?.beat === 'idle' && game.camera.y < 200, 6000)); await shot('10-forge-done'); obs.beats.forge = await snap();
  assert.ok(await until(() => game.state === 'field' && !game.dialogue.running && game.castleCathedral?.climbing, 10000));
  await page.waitForTimeout(300); await shot('11-climb-start'); obs.beats.climb = await snap();
  check('climb arms heart, drag and the specified track', obs.beats.climb.scene.heart && obs.beats.climb.bgm === 'cathedral_climb', JSON.stringify(obs.beats.climb));
  {
    const y0 = await page.evaluate(() => game.player.y); await page.keyboard.down('ArrowUp'); await page.waitForTimeout(1000); await page.keyboard.up('ArrowUp');
    const moved = y0 - await page.evaluate(() => game.player.y);
    check('climb walk is forced to the X slow-walk speed (~124.8px/s)', await page.evaluate(() => !!game.windWalk) && moved > 90 && moved < 150, String(moved));
  }
  check('stage saved at climb start', await page.evaluate(() => !!game.flags.castle_cathedral_climb && JSON.parse(localStorage.getItem(game.constructor.SAVE_KEY)).flags.castle_cathedral_climb));
  const hp0 = obs.beats.climb.hp;
  // 회피 없이 위로만: 검 예고·발사·피격을 실제 경로에서 관찰한다.
  await page.keyboard.down('ArrowUp');
  let charged = false, fell = false, hit = false;
  const t0 = Date.now();
  try {
    while (Date.now() - t0 < 25000 && !(charged && fell && hit)) {
      const s = await snap();
      if (!charged && s.scene.swords.some(w => w.phase === 'charge')) { await page.waitForTimeout(500); await shot('12-charge'); charged = true; }
      if (!fell && s.scene.swords.some(w => w.phase === 'fall')) { await shot('13-fall'); fell = true; }
      if (!hit && s.hp[0] < hp0[0]) { await shot('14-hit'); hit = true; obs.hits.push(s); }
      await page.waitForTimeout(40);
    }
  } finally { await page.keyboard.up('ArrowUp'); }
  const afterHit = await snap();
  check('sword charges at the top then falls', charged && fell);
  check('a sword hit takes 15 from every member once', hit && afterHit.hp.every((v, i) => (hp0[i] - v) % 15 === 0 && v < hp0[i]), JSON.stringify([hp0, afterHit.hp]));
  // 난도 기록: 진행도별 동시 검 수
  await page.keyboard.down('ArrowUp');
  try {
    const t1 = Date.now();
    while (Date.now() - t1 < 70000) {
      const s = await snap();
      obs.volleys.push({ p: +s.scene.progress.toFixed(2), charging: s.scene.swords.filter(w => w.phase === 'charge').length, y: Math.round(s.xy[1]) });
      if (s.scene.progress > 0.55 && !fs.existsSync(path.join(process.env.SHOT_DIR, '15-late.png')) && s.scene.swords.filter(w => w.phase === 'charge').length === 2) await shot('15-late');
      if (s.xy[1] < 600) break;
      await page.waitForTimeout(120);
    }
  } finally { await page.keyboard.up('ArrowUp'); }
  await page.waitForTimeout(600); await shot('16-top'); obs.beats.top = await snap();
  const doubles = obs.volleys.filter(v => v.charging === 2);
  check('doubles appear only after the early section', doubles.length > 0 && doubles.every(v => v.p >= 0.3), JSON.stringify(doubles.slice(0, 5)));
  // 이어하기: 오르기가 저장 상태에서 다시 무장된다.
  await escToTitle(page); assert.ok(await until(() => game.state === 'title' && game.title.phase === 'wait', 10000));
  await key('Space'); assert.ok(await until(() => game.title.phase === 'zoom', 5000));
  await key('KeyC'); assert.ok(await until(() => game.title.phase === 'locked' && game.title.time > 3.05, 5000));
  await key('KeyC'); assert.ok(await until(() => game.state === 'field' && !game.transitioning, 20000));
  await page.waitForTimeout(1500); obs.beats.continued = await snap(); await shot('17-continue');
  check('continued climb keeps the lowered camera focus (sword warning room)', await page.evaluate(() => game.camera.target === game.castleCathedral?.focus));
  check('continue resumes the armed climb without replaying the intro', obs.beats.continued.scene?.climbing && !obs.beats.continued.dialogue && obs.beats.continued.bgm === 'cathedral_climb', JSON.stringify(obs.beats.continued));
  obs.samples = await page.evaluate(() => window.__climbQA.samples.length);
  fs.writeFileSync(path.join(process.env.SHOT_DIR, 'observations.json'), JSON.stringify(obs, null, 2));
});
