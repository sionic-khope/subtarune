import test from 'node:test';
import assert from 'node:assert/strict';
import { Story, STAGES, QA_POINTS, partyFromFlags, stateFromFlags, storyBgm } from '../../src/core/story.js';
import { MAP_RUNTIME_ASSETS } from '../../src/data/map-runtime-assets.js';

const stages = ['ship_invasion_started', 'ship_rally_done', 'ship_deck_bond_done', 'ship_invasion_arrived'];
const points = ['ship_invasion_ready', 'ship_invasion_deck', 'ship_invasion_sailing', 'gajaeman_castle_entry'];
const effective = point => {
  const flags = { ...point.flags };
  new Story(flags).advance(point.stage);
  return flags;
};

test('invasion checkpoints append in order and restore only completed earlier beats', () => {
  const start = STAGES.findIndex(stage => stage.id === stages[0]);
  assert.ok(start > STAGES.findIndex(stage => stage.id === 'ship_lounge_briefed'));
  assert.deepEqual(STAGES.slice(start, start + stages.length).map(stage => stage.id), stages);
  for (const [index, id] of stages.entries()) {
    const restored = {}, story = new Story(restored);
    story.load({ stage: id });
    assert.equal(restored.ship_lounge_briefed, true);
    for (const [otherIndex, other] of stages.entries()) assert.equal(!!restored[other], otherIndex <= index);
    assert.deepEqual(partyFromFlags(restored), ['gyeongsub', 'ppaman']);
    story.advance('ship_lounge_briefed');
    assert.equal(story.stage, id);
  }
});

test('invasion QA preserves earned state and separates ready, intermediate, and completed entry', () => {
  const baseline = QA_POINTS.find(point => point.id === 'choimis_return');
  for (const id of points) {
    const point = QA_POINTS.find(item => item.id === id);
    assert.ok(point, id);
    assert.deepEqual(stateFromFlags(effective(point)), stateFromFlags(effective(baseline)), id);
    assert.deepEqual(point.party, ['gyeongsub', 'ppaman']);
  }
  const [ready, deck, sailing, arrived] = points.map(id => QA_POINTS.find(point => point.id === id));
  assert.equal(ready.script, undefined);
  assert.equal(effective(ready).ship_invasion_started, undefined);
  assert.equal(deck.script, 'ship_invasion');
  assert.equal(effective(deck).ship_rally_done, true);
  assert.equal(effective(deck).ship_deck_bond_done, undefined);
  assert.equal(sailing.script, 'ship_invasion');
  assert.equal(effective(sailing).ship_deck_bond_done, true);
  assert.equal(effective(sailing).ship_invasion_arrived, undefined);
  assert.equal(arrived.map, 'gajaeman_castle_entry');
  assert.equal(arrived.script, undefined);
  assert.equal(effective(arrived).ship_invasion_arrived, true);
});

test('completed lounge returns to lounge music without overriding the silent castle entry', () => {
  assert.equal(storyBgm('ship_lounge', { ship_lounge_briefed: true }), 'ship_lounge');
  assert.equal(storyBgm('ship_lounge', {}), undefined);
  assert.equal(storyBgm('gajaeman_castle_entry', { ship_invasion_arrived: true }), undefined);
});

test('deck poses and the accepted hover sprite are prepared for their destination maps', () => {
  const deck = MAP_RUNTIME_ASSETS.ship_night_deck;
  for (const id of ['hyungsub', 'gyeongsub', 'ppaman']) {
    assert.ok(deck.sprites.includes(id));
    assert.ok(deck.images.includes(`assets/sprites/${id}-deck-fist.png`));
  }
  const entry = MAP_RUNTIME_ASSETS.gajaeman_castle_entry;
  assert.ok(entry.sprites.includes('youngcle_hover'));
  for (const id of ['youngcle', 'junhee', 'gyeongsub', 'ppaman']) assert.ok(entry.portraits.includes(id));
});
