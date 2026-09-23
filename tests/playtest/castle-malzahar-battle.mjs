import assert from 'node:assert/strict';
import { runScenario } from './lib/harness.mjs';

await runScenario({ name: 'castle-malzahar-battle', launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] } }, async ({ page, open, until, press, shot, fixture, check }) => {
  const requiredFailures = [];
  page.on('response', response => {
    if (response.status() >= 400 && /malzahar-|malzahar_|castle_battle|castle_right/.test(response.url())) requiredFailures.push({ url: response.url(), status: response.status() });
  });
  await page.addInitScript(() => {
    window.qaAudio = [];
    window.qaDrawText = new Set();
    window.qaHpText = {};
    const fillText = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (text, ...args) {
      if (/말자하|[0-5]\s*\/\s*5|승리/.test(String(text))) window.qaDrawText.add(String(text));
      const enemy = window.game?.battle?.enemies[0];
      if (enemy?.id === 'malzahar_sub' && /[0-5]\s*\/\s*5/.test(String(text))) window.qaHpText[enemy.hp] = String(text);
      return fillText.call(this, text, ...args);
    };
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function (...args) {
      const entry = { src: this.currentSrc || this.src, start: this.currentTime, wall: performance.now(), elapsed: window.game?.battle?.gimmick?.snapshot.elapsed, resolved: false };
      window.qaAudio.push(entry);
      const result = play.apply(this, args);
      result?.then(() => { entry.resolved = true; }, error => { entry.error = error.message; });
      setTimeout(() => { entry.later = this.currentTime; entry.mediaError = this.error?.message; }, 180);
      return result;
    };
  });
  const field = () => until(() => window.game?.state === 'field' && !game.battle && !game.dialogue.running && !game.transitioning && game.fade.alpha < 0.01, 30000);
  const snap = () => page.evaluate(() => ({ state: game.state, map: game.mapId, party: game.party, attack: game.attack, hpBonus: game.hpBonus,
    bgm: game.sound.bgmName, bgmTime: game.sound.bgm?.currentTime, bgmPaused: game.sound.bgm?.paused,
    battle: game.battle && { state: game.battle.state, text: game.battle.text, mode: game.battle.gimmick?.snapshot, fullscreen: game.battle.gimmick?.fullscreen,
      hp: game.battle.enemies[0].hp, enemy: game.battle.enemies[0].id,
      members: game.battle.members.map(member => ({ hp: member.hp, maxHp: member.maxHp, down: member.down })) } }));
  async function enter(prefix = '') {
    await open({ qa: 'malzahar_torii' }); assert.ok(await field());
    await shot(`${prefix}torii-before-entry`);
    await page.keyboard.down('ArrowRight');
    try { assert.ok(await until(() => !!game.runner, 6000), 'right movement starts the field runner'); }
    finally { await page.keyboard.up('ArrowRight'); }
    assert.ok(await until(() => game.runner?.core.phase === 'run', 3000));
    const fieldStarted = Date.now();
    await shot(`${prefix}field-running`);
    assert.ok(await until(() => !!game.battle?.gimmick?.fullscreen, 12000));
    const state = await snap();
    check('field run lasts three seconds before seamless fullscreen battle', Date.now() - fieldStarted >= 2700 && Date.now() - fieldStarted < 7000, String(Date.now() - fieldStarted));
    check('solo battle uses malzahar_sub and checkpoint attack5 maxHP180', state.party.length === 0 && state.attack === 5 && state.battle.enemy === 'malzahar_sub'
      && state.battle.members.length === 1 && state.battle.members[0].maxHp === 180 && state.battle.hp === 5, JSON.stringify(state));
    await shot(`${prefix}battle-entry-left`);
    return state;
  }

  await enter();
  const assets = await page.evaluate(() => {
    const enemy = game.battle.enemies[0];
    return { actions: Object.fromEntries(Object.entries(enemy.actionImages || {}).map(([key, image]) => [key, image?.naturalWidth || 0])),
      voidling: enemy.projectiles?.voidling?.naturalWidth || 0,
      sounds: ['malzahar_q', 'malzahar_w', 'malzahar_dash'].map(key => ({ key, ready: game.sound.files[key]?.readyState, src: game.sound.files[key]?.src })) };
  });
  check('four boss action sheets and voidling decode without fallback', ['hover', 'cast', 'dash', 'hit'].every(key => assets.actions[key] > 0) && assets.voidling > 0, JSON.stringify(assets));
  check('all three requested SFX files are loaded', assets.sounds.every(sound => sound.ready >= 2 && sound.src?.includes(sound.key)), JSON.stringify(assets.sounds));
  const start = Date.now(), captured = new Set(), counters = [], hpChanges = [], stopping = [], soundsBefore = await page.evaluate(() => qaAudio.length);
  let jumpCycle = -1, dashCycle = -1, lastCounter = 0, lastHp = 180, lastState, qPairs = 0, wSlashes = 0;
  while (Date.now() - start < 100000) {
    const state = await snap(), mode = state.battle?.mode;
    if (!mode) break;
    lastState = state;
    if (state.battle.state === 'lose') break;
    const capture = async (name, condition) => { if (condition && !captured.has(name)) { captured.add(name); await shot(name); } };
    await capture('entry-middle', mode.phase === 'enter' && mode.elapsed > 2.2);
    await capture('body-dim-heart', mode.phase === 'hover' && mode.elapsed > 5.1);
    await capture('q-summon-warning', mode.chargingOrbs?.length === 2);
    await capture('q-two-projectiles', mode.hazards.filter(hazard => hazard.kind === 'q').length === 2);
    const q = mode.hazards.filter(hazard => hazard.kind === 'q');
    if (q.length === 2 && jumpCycle !== mode.cycle && Math.min(...q.map(hazard => hazard.x)) <= 205) {
      jumpCycle = mode.cycle; qPairs++; await press('KeyX', { delay: 35 });
    }
    await capture('q-real-x-jump', mode.runner.airY > 60 && q.length === 2);
    const w = mode.hazards.find(hazard => hazard.kind === 'w' && hazard.x <= 226 && hazard.x > mode.player.x);
    if (w && !mode.runner.attack && mode.runner.grounded && mode.runner.landT <= 0) { wSlashes++; await press('KeyC', { delay: 35 }); }
    await capture('w-real-c-slash', mode.runner.attack?.kind === 'slash' && mode.hazards.some(hazard => hazard.kind === 'w'));
    await capture('boss-warning', mode.phase === 'warn' && mode.phaseTime > 0.4);
    await capture('boss-dash', mode.phase === 'dash' && mode.boss.x > 260);
    if (mode.phase === 'dash' && mode.boss.x <= 235 && dashCycle !== mode.cycle && !mode.runner.attack) {
      dashCycle = mode.cycle; await press('KeyC', { delay: 35 });
    }
    if (mode.counters > lastCounter) {
      counters.push({ count: mode.counters, hp: state.battle.hp, elapsed: mode.elapsed, wallMs: Date.now() - start, particles: mode.particles, flash: mode.flash });
      lastCounter = mode.counters;
      await capture(`counter-${mode.counters}`, true);
    }
    await capture('counter-first-hp-trailing-bar', mode.counters === 1 && mode.phase === 'recoil' && mode.phaseTime >= 0.15 && mode.phaseTime < 0.32);
    if (state.battle.members[0].hp !== lastHp) { lastHp = state.battle.members[0].hp; hpChanges.push({ hp: lastHp, elapsed: mode.elapsed }); }
    if (mode.phase === 'stopping' || mode.phase === 'done') {
      stopping.push({ phase: mode.phase, runner: mode.runner.phase, vx: mode.runner.vx, grounded: mode.runner.grounded, elapsed: mode.elapsed });
      await capture('victory-runner-braking', mode.runner.phase === 'brake' && mode.runner.vx < 330);
      await capture('victory-runner-stopped', mode.runner.vx === 0);
    }
    for (const [actor, at] of [['ppaman', 10], ['warm-bidet', 25], ['mini-mario', 40], ['gyeongsub', 55]]) {
      await capture(`distant-${actor}-approach`, mode.elapsed >= at + 0.7 && mode.elapsed < at + 1.2);
      await capture(`distant-${actor}-strike`, mode.elapsed >= at + 1.7 && mode.elapsed < at + 2.15);
    }
    await page.waitForTimeout(25);
  }
  check('five real-input counters each remove exactly one boss HP', counters.length === 5 && counters.every((entry, index) => entry.count === index + 1 && entry.hp === 4 - index), JSON.stringify(counters));
  check('counter feedback includes a bright flash and particle burst', counters.length === 5 && counters.every(entry => entry.particles >= 20) && counters.some(entry => entry.flash > 0), JSON.stringify(counters));
  check('five Q pairs jumped and fifteen W summons slashed with real keys', qPairs === 5 && wSlashes === 15 && hpChanges.length === 0, JSON.stringify({ qPairs, wSlashes, hpChanges }));
  check('natural fight runs in real time for the five attack cycles', counters.at(-1)?.elapsed > 76 && counters.at(-1)?.elapsed < 81 && counters.at(-1)?.wallMs > 74000, JSON.stringify(counters.at(-1)));
  check('battle BGM clock advances through the real-time fight', lastState?.bgm === 'castle_battle' && !lastState.bgmPaused && lastState.bgmTime > 74, JSON.stringify({ bgm: lastState?.bgm, time: lastState?.bgmTime }));
  check('victory visibly decelerates to a grounded stop before leaving the battle', stopping.some(sample => sample.runner === 'brake' && sample.vx > 0 && sample.vx < 330)
    && stopping.some(sample => sample.vx === 0 && sample.grounded), JSON.stringify(stopping));
  check('all four distant ally scenes captured during normal combat', ['ppaman', 'warm-bidet', 'mini-mario', 'gyeongsub'].every(actor => captured.has(`distant-${actor}-approach`) && captured.has(`distant-${actor}-strike`)));
  assert.ok(await until(() => game.battle?.state === 'ending' && game.fade.alpha > 0.2, 1000), 'stopped runner enters the production fade');
  await shot('victory-stopped-fade');
  assert.ok(await field(), JSON.stringify(lastState));
  const drawnText = await page.evaluate(() => ({ all: [...qaDrawText], hp: qaHpText }));
  check('fight renders remaining boss HP from five to zero without victory notification', [5, 4, 3, 2, 1, 0].every(hp => new RegExp(`${hp}\\s*/\\s*5`).test(drawnText.hp[hp]))
    && drawnText.all.every(text => !text.includes('승리')), JSON.stringify(drawnText));
  const arrival = await snap();
  check('natural victory reaches north-door map solo with castle_right music', arrival.map === 'gajaeman_torii_end' && arrival.party.length === 0 && arrival.bgm === 'castle_right' && !arrival.bgmPaused, JSON.stringify(arrival));
  check('victory state and runner are cleaned up', await page.evaluate(() => game.lastBattle?.win && game.flags.castle_malzahar_won && !game.runner && !game.battle && !game.camera.locked));
  await shot('natural-victory-arrival');
  await page.waitForTimeout(500);
  check('arrival BGM playback clock advances', (await snap()).bgmTime > arrival.bgmTime + 0.3);
  const audio = await page.evaluate(() => qaAudio);
  const combatAudio = audio.slice(soundsBefore).filter(entry => /malzahar_(q|w|dash)\.mp3/.test(entry.src));
  check('Q W and dash cues really play at all five cycles', ['q', 'w', 'dash'].every(key => combatAudio.filter(entry => entry.src.includes(`malzahar_${key}.mp3`) && entry.resolved && entry.later > entry.start).length === 5), JSON.stringify(combatAudio));
  check('audio playback has no swallowed rejection or media errors', audio.filter(entry => /malzahar_|castle_battle|castle_right/.test(entry.src)).every(entry => !entry.error && !entry.mediaError), JSON.stringify(audio.filter(entry => entry.error || entry.mediaError)));
  await page.keyboard.down('ArrowUp');
  try { assert.ok(await until(() => game.player.probe()?.id === 'castle_torii_end_door', 12000)); }
  finally { await page.keyboard.up('ArrowUp'); }
  await press('KeyC', { delay: 45 });
  assert.ok(await until(() => game.textbox.isOpen && game.textbox.state === 'waiting', 5000));
  check('north door responds after natural victory', await page.evaluate(() => game.textbox.node.text === '* 문이 잠겨 있다.' && game.mapId === 'gajaeman_torii_end'));
  await shot('natural-arrival-north-door'); await press('KeyC', { delay: 45 });
  await press('Escape', { delay: 45 });
  assert.ok(await until(() => game.state === 'title' && !game.transitioning, 5000));
  await press('KeyC', { delay: 45 });
  assert.ok(await until(() => game.title.phase === 'locked' && game.title.time > 3.1, 10000));
  await press('KeyC', { delay: 45 }); assert.ok(await field());
  check('natural victory persists through real title continue', await page.evaluate(() => game.mapId === 'gajaeman_torii_end' && game.flags.castle_malzahar_won
    && game.party.length === 0 && game.attack === 5 && game.hpBonus === 80 && !game.battle && !game.runner && game.sound.bgmName === 'castle_right'));
  await shot('continued-natural-arrival');

  await enter('retry-fixture-');
  assert.ok(await until(() => game.battle?.gimmick?.snapshot.phase === 'dash' && game.battle.gimmick.snapshot.boss.x <= 235, 22000));
  await press('KeyC', { delay: 35 });
  assert.ok(await until(() => game.battle?.gimmick?.snapshot.counters === 1, 2000));
  check('defeat boundary begins after a real counter has reduced boss HP', (await snap()).battle.hp === 4);
  await fixture('defeat-boundary-only', 'After a separate normal entry, apply lethal damage through the production hurtParty API to test loss/retry cleanup. This is not part of the natural five-counter victory above.', () => {
    window.qaOldMode = game.battle.gimmick; game.battle.hurtParty(999);
  });
  assert.ok(await until(() => game.battle?.state === 'lose' && game.battle.t > 2.5, 5000));
  check('loss disposes fullscreen mode and stops battle BGM', await page.evaluate(() => qaOldMode.snapshot.disposed && !game.battle.gimmick && !game.sound.bgmName));
  await shot('loss-retry-menu'); await press('KeyC', { delay: 45 });
  assert.ok(await until(() => game.battle?.gimmick?.fullscreen && game.battle.gimmick.snapshot.elapsed > 0.05, 6000));
  const retry = await snap();
  check('C retry starts fresh with five counters remaining and full HP', retry.battle.hp === 5 && retry.battle.mode.counters === 0 && retry.battle.mode.cycle === 0
    && retry.battle.mode.phase === 'enter' && retry.battle.members[0].hp === 180 && retry.bgm === 'castle_battle', JSON.stringify(retry));
  await shot('retry-fresh-entry');
  await page.evaluate(() => { window.qaRetryMode = game.battle.gimmick; });
  await press('Escape', { delay: 45 });
  assert.ok(await until(() => game.state === 'title' && !game.transitioning, 5000));
  check('Escape cleans runner battle camera and retry resources', await page.evaluate(() => qaRetryMode.snapshot.disposed && !game.battle && !game.runner && !game.camera.locked && !game.sound.bgmName));
  await shot('escape-title');
  await press('KeyC', { delay: 45 });
  assert.ok(await until(() => game.title.phase === 'locked' && game.title.time > 3.1, 10000));
  await press('KeyC', { delay: 45 }); assert.ok(await field());
  check('real title C continue restores solo torii checkpoint and upgrades', await page.evaluate(() => game.mapId === 'gajaeman_castle_fork' && game.party.length === 0 && game.attack === 5 && game.hpBonus === 80
    && !game.battle && !game.runner && !game.camera.locked && game.sound.bgmName === 'castle_right'));
  await shot('continued-torii-checkpoint');
  check('required assets have no failed HTTP responses', requiredFailures.length === 0, JSON.stringify(requiredFailures));
});
