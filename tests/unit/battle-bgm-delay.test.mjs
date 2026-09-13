import test from 'node:test';
import assert from 'node:assert/strict';
import { Battle } from '../../src/battle/battle.js';
import { Board, Soul } from '../../src/battle/bullets.js';
import { ENEMIES } from '../../src/data/enemies.js';

let imageId = 0;
function fixture(def = ENEMIES.mankatsuki_junhee) {
  const played = [], fades = [];
  const battle = Object.assign(Object.create(Battle.prototype), {
    cfg: { bgm: 'fixture_bgm' }, state: 'load', t: 0, members: [], fx: [], patterns: [],
    board: new Board(), soul: new Soul(), text: '', shown: 0, textT: 0,
    enemies: [{ name: 'fixture', hp: 100, maxHp: 100, def: { ...def,
      image: `bgm_fixture_${++imageId}`, sheet: undefined, actions: {}, projectiles: {} } }],
    loadEnemyImage: async () => ({}),
    game: { partyHp: {}, fadeTo: (...args) => fades.push(args), sound: {
      playBgm: (...args) => played.push(args), blip() {}, sfx() {}, preloadBgm() {},
    } },
  });
  return { battle, played, fades };
}
const input = { just: () => false, down: () => false };

test('test_mankatsuki_music_starts_once_at_point_four_seconds_after_loaded_screen', async () => {
  const { battle, played } = fixture();
  await battle.load();
  assert.equal(battle.bgmWait, 0.4);
  battle.update(0.39, input);
  assert.deepEqual(played, []);
  battle.update(0.01, input);
  assert.deepEqual(played, [['fixture_bgm', { volume: 0.5, fadeIn: 0 }]]);
  battle.update(0.1, input);
  assert.equal(played.length, 1);
});

test('test_unconfigured_enemy_music_still_starts_on_first_loaded_update', async () => {
  const { battle, played } = fixture({});
  await battle.load();
  assert.equal(battle.bgmWait, 0);
  battle.update(0, input);
  assert.equal(played.length, 1);
});

test('test_exit_cancels_pending_music_before_delayed_start', async () => {
  const { battle, played } = fixture();
  await battle.load();
  battle.update(0.39, input);
  battle.finish(false);
  battle.update(0.5, input);
  assert.deepEqual(played, []);
  assert.equal(battle.state, 'ending');
});

test('test_title_or_QA_cancellation_during_loading_cannot_rearm_music_or_fade', async () => {
  const { battle, played, fades } = fixture();
  let finishLoading;
  battle.support = { load: () => new Promise(resolve => { finishLoading = resolve; }) };
  const loading = battle.load();
  battle.cancelPendingBgm();
  finishLoading();
  await loading;
  battle.update(0.5, input);
  assert.deepEqual(played, []);
  assert.deepEqual(fades, []);
  assert.equal(battle.bgmWait, undefined);
});

test('test_retry_cancels_old_delay_then_new_load_gets_its_own_point_four_seconds', async () => {
  const { battle, played } = fixture();
  await battle.load();
  battle.update(0.39, input);
  battle.beginRetry();
  battle.update(0.01, input);
  assert.deepEqual(played, []);
  await battle.load();
  battle.update(0.39, input);
  assert.deepEqual(played, []);
  battle.update(0.01, input);
  assert.equal(played.length, 1);
});
