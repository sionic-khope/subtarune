import test from 'node:test';
import assert from 'node:assert/strict';
import { makeWaiter } from '../../src/ui/cutscene.js';

for (const bgm of [false, true, undefined]) {
  test(`test_map_node_bgm_${bgm}_changes_map_and_waits_for_load_without_standalone_music`, async () => {
    const calls = [];
    const loaded = Promise.withResolvers();
    const game = {
      changeMap(...args) { calls.push(['map', ...args]); return loaded.promise; },
      sound: { playBgm(...args) { calls.push(['play', ...args]); }, stopBgm(...args) { calls.push(['stop', ...args]); } },
    };
    const node = { map: 'ship_lounge', spawn: 'from_rescue', enter: true, ...(bgm === undefined ? {} : { bgm }) };
    const waiter = makeWaiter(game, node);
    assert.deepEqual(calls, [['map', 'ship_lounge', 'from_rescue', true, { bgm: bgm !== false }]]);
    assert.equal(game.pendingMapEnter, 'ship_lounge');
    assert.equal(waiter.update(1), false);
    loaded.resolve();
    await loaded.promise;
    assert.equal(waiter.update(0), true);
    assert.equal(calls.length, 1);
  });
}

test('test_standalone_bgm_play_keeps_volume_fade_and_loop_options', () => {
  const calls = [];
  const game = { sound: { playBgm(...args) { calls.push(args); } } };
  const waiter = makeWaiter(game, { bgm: 'vs_lancer', volume: 0.42, fadeIn: 0, loopEnd: 30, loopFade: 0.4 });
  assert.deepEqual(calls, [['vs_lancer', { volume: 0.42, fadeIn: 0, loopEnd: 30, loopFade: 0.4 }]]);
  assert.equal(waiter.update(0), true);
});

for (const bgm of [null, false]) {
  test(`test_standalone_bgm_${bgm}_still_stops_with_requested_fade`, () => {
    const calls = [];
    const game = { sound: { stopBgm(value) { calls.push(value); } } };
    const waiter = makeWaiter(game, { bgm, fadeOut: 1.2 });
    assert.deepEqual(calls, [1.2]);
    assert.equal(waiter.update(0), true);
  });
}
