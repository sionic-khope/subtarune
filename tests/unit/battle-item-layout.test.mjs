import test from 'node:test';
import assert from 'node:assert/strict';
import { Battle } from '../../src/battle/battle.js';
import { F } from '../../src/ui/font.js';

for (const itemName of ['핫도그', '기름떡볶이']) test(`${itemName} target panel keeps three names, HP values and selection geometry unobstructed`, () => {
  const text = [], bars = [], hearts = [], arrows = [];
  const measure = value => [...value].reduce((width, c) => width + (c.charCodeAt(0) > 127 ? F.size : F.size / 2), 0);
  const ctx = {
    textAlign: 'left', fillStyle: '',
    fillText(value, x, y) { const w = measure(value); text.push({ value, x: x - (this.textAlign === 'right' ? w : 0), y, w, h: F.size }); },
    beginPath() {}, moveTo(x, y) { arrows.push([x, y]); }, lineTo() {}, closePath() {}, fill() {},
  };
  const members = ['요플래', '경섭', '억빠맨'].map((name, i) => ({ name, hp: 1 + i, maxHp: 160 + i * 20, home: [84, 104 + i * 60], down: false }));
  const battle = Object.assign(Object.create(Battle.prototype), {
    state: 'item-target', members, memberIdx: 1, itemTargetIdx: 1, itemName,
    box() {}, hpColor: () => '#fff', heart: (_ctx, x, y) => hearts.push([x, y]),
    hpBar: (_ctx, x, y, w, hp, maxHp) => bars.push({ x, y, w, hp, maxHp }),
  });
  battle.drawPanel(ctx);
  for (const [i, member] of members.entries()) {
    const name = text.find(t => t.value === member.name);
    const hp = text.find(t => t.value === `${member.hp}/${member.maxHp}`);
    assert.deepEqual([name.x, name.y, hp.x, hp.y], [54, 254 + i * 18, 350, 254 + i * 18]);
    assert.deepEqual(bars[i], { x: 250, y: 258 + i * 18, w: 90, hp: member.hp, maxHp: member.maxHp });
    for (const other of text.filter(t => t !== hp)) {
      assert.ok(!(hp.x < other.x + other.w && hp.x + hp.w > other.x && hp.y < other.y + other.h && hp.y + hp.h > other.y), `HP ${hp.value} overlaps ${other.value}`);
    }
  }
  const selected = itemName === '기름떡볶이' ? [0, 1, 2] : [1];
  assert.deepEqual(hearts, selected.map(i => [38, 259 + i * 18]));
  assert.deepEqual(arrows, selected.map(i => [77, 12 + i * 60]));
});
