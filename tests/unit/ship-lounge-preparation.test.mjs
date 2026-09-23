import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ScriptRunner } from '../../src/ui/dialogue.js';
import { shipLoungeScripts } from '../../src/data/cutscenes/ship_lounge.js';
import { QA_POINTS, Story, storyBgm } from '../../src/core/story.js';

const map = JSON.parse(readFileSync('assets/maps/ship_lounge.json', 'utf8'));
const visible = flags => map.entities.filter(e => !(e.unless && flags[e.unless]) && !(e.requires && !flags[e.requires]));

test('briefed lounge preserves a local shop and sealed actor across stage restoration', () => {
  const flags = { choimis_lounge_sealed: true }; const story = new Story(flags);
  story.advance('ship_lounge_briefed');
  const current = visible(flags);
  assert.ok(current.some(e => e.id === 'ship_lounge_shop' && e.image === 'assets/props/yongjun-shop.png'));
  assert.ok(current.some(e => e.id === 'ship_lounge_shop_door' && e.script === 'maillard_shop'));
  assert.ok(current.some(e => e.id === 'lounge_choimis_sealed'));
  assert.ok(!current.some(e => e.id === 'lounge_return_yongjun'));
  assert.ok(!visible({ ship_ending_done: true }).some(e => e.id === 'ship_lounge_shop'));
  assert.equal(map.enter.script, 'ship_lounge_briefing');
  assert.equal(map.enter.flag, undefined);
  assert.equal(storyBgm('ship_lounge', flags), 'storage_show');
  assert.equal(storyBgm('ship_lounge', {}), undefined);
});

test('rescued ladder refuses old route before presenting a travel choice', () => {
  let node;
  new ScriptRunner({ show: n => { node = n; } }, { flags: { choimis_rescued: true } }).start(shipLoungeScripts.ship_lounge_return);
  assert.ok(node.text); assert.equal(node.choice, undefined);
});

for (const selected of [0, 1, null]) test(`Youngcle readiness choice ${selected} never starts an unspecified scene`, () => {
  const flags = { choimis_rescued: true, ship_lounge_briefed: true };
  let shown, advance;
  const runner = new ScriptRunner({ show: (n, _ctx, next) => { shown = n; advance = next; }, close() {} }, {
    flags, setFlag: (key, value) => { flags[key] = value; },
  });
  runner.start(shipLoungeScripts.ship_lounge_youngcle);
  assert.equal(shown.choice.delay, 0.6);
  assert.deepEqual(shown.choice.options.map(o => o.label), ['네', '아니요']);
  assert.equal(shown.choice.cancel, 1);
  advance(selected);
  assert.equal(flags.ship_invasion_ready, selected === 0 ? true : undefined);
  assert.equal(runner.running, false);
});

test('QA separates pending briefing from completed preparation', () => {
  const pending = QA_POINTS.find(p => p.id === 'choimis_lounge_briefing');
  const ready = QA_POINTS.find(p => p.id === 'choimis_return');
  assert.equal(pending.flags.choimis_rescued, true);
  assert.ok(!pending.flags.ship_lounge_briefed);
  assert.equal(ready.stage, 'ship_lounge_briefed');
  assert.equal(ready.flags.choimis_lounge_sealed, true);
});

test('briefed NPC reactions reuse registered motion and stationary hops without rearranging the party', () => {
  const junhee = shipLoungeScripts.ship_lounge_junhee;
  assert.ok(junhee.some(n => n.motion === 'lounge_return_junhee' && n.name === 'laugh' && n.sfx === 'laugh_junhee'));
  assert.ok(junhee.some(n => n.bubble === 'lounge_return_junhee' && n.dots === 3));
  for (const id of ['ttuulla', 'park_guardian']) {
    const hops = shipLoungeScripts[`ship_lounge_${id}`].filter(n => n.hop);
    assert.ok(hops.length >= 1);
    assert.ok(hops.every(n => n.by[0] === 0 && n.by[1] === 0 && n.keep));
  }
});
