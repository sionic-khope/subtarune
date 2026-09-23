import test from 'node:test';
import assert from 'node:assert/strict';
import { drawChoimisSkyBackground } from '../../src/battle/choimis-sky-background.js';

const SKY = { id: 'sea' };
const DOLPHIN = { id: 'dolphin', width: 128, height: 32 };

function render(time, battleSky = true, dolphin = DOLPHIN, stateTime = time) {
  const calls = [];
  const ctx = {
    globalAlpha: 1,
    drawImage: (...args) => calls.push(['image', ...args]),
    fillRect: (...args) => calls.push(['paint', ...args]),
    save() {}, restore() {}, beginPath() {},
    rect: (...args) => calls.push(['clipRect', ...args]), clip() {},
  };
  drawChoimisSkyBackground(ctx, {
    cfg: battleSky ? { bg: 'choimis_sky' } : undefined,
    t: stateTime, members: [],
    game: { time, propImages: {
      'assets/backdrops/jjajang_night_sea.png': SKY,
      'assets/props/choimis-dolphin-breach.png': dolphin,
    } },
  });
  return calls;
}

test('test_choimis_sky_accelerates_sea_wind_and_petals_without_moving_the_moon', () => {
  const battle = render(2, true, null), rescue = render(3, false, null);
  const withoutFoam = calls => calls.filter(call => call[0] !== 'clipRect'
    && !(call[0] === 'paint' && [219, 225, 231, 237].includes(call[2])));
  assert.deepEqual(withoutFoam(battle), withoutFoam(rescue), 'two battle seconds match three original seconds');
  assert.deepEqual(battle[1], ['image', SKY, 0, 0, 480, 360, 0, 0, 480, 360]);
  const longBattle = render(1200), clip = longBattle.findIndex(call => call[0] === 'clipRect');
  assert.ok(longBattle.slice(clip + 1, clip + 13).every(call => call[1] >= -20 && call[1] < 500), 'foam keeps wrapping during a long battle');
});

test('test_choimis_sky_dolphin_breach_is_brief_ocean_clipped_and_battle_only', () => {
  const dolphinCalls = calls => calls.filter(call => call[0] === 'image' && call[1] === DOLPHIN);
  for (const time of [0, 4.99, 6.4, 9, 13.59, 15]) assert.equal(dolphinCalls(render(time)).length, 0);
  for (const time of [5.1, 5.5, 5.8, 6.2, 13.8]) {
    const calls = render(time), dolphin = dolphinCalls(calls);
    assert.equal(dolphin.length, 1);
    assert.ok(calls.some(call => call[0] === 'clipRect' && call.slice(1).join(',') === '0,216,480,30'));
    assert.ok(dolphin[0][2] >= 0 && dolphin[0][2] <= 96, 'frame stays inside the four-frame strip');
    assert.ok(dolphin[0][7] >= 216 && dolphin[0][7] <= 246, 'breach stays at ocean depth');
    assert.deepEqual(dolphin[0].slice(8), [24, 24]);
  }
  assert.equal(dolphinCalls(render(5.5, false)).length, 0, 'rescue rendering keeps its existing atmosphere');
  assert.deepEqual(dolphinCalls(render(5.5, true, DOLPHIN, 0)), dolphinCalls(render(5.5)), 'a turn transition cannot restart or cut off a breach');
  assert.equal(dolphinCalls(render(5.5, true, null)).length, 0, 'an unavailable real sprite has no drawn substitute');
});
