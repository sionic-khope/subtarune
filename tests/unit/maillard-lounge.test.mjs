import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { QA_POINTS } from '../../src/core/story.js';
import { SCRIPTS } from '../../src/data/scripts.js';

const readMap = (id) => {
  const path = `assets/maps/${id}.json`;
  assert.ok(fs.existsSync(path), `${id} must exist`);
  return JSON.parse(fs.readFileSync(path, 'utf8'));
};
const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

test('lounge provides a broad enclosed ship floor at the shorter room height', () => {
  const map = readMap('maillard_lounge');
  assert.equal(map.rows.length, 20);
  assert.equal(map.rows[0].length, 48);
  assert.equal(map.backdrop, undefined);
  assert.equal(map.sunrise, undefined);
  assert.equal(map.bgm, 'maillard_lounge');
  assert.equal(map.dim, 0.08);
  assert.equal([...map.rows.join('')].filter((tile) => tile === 'M').length, 598);
  assert.ok(map.rows[0].trim().length === 0 && map.rows.at(-1).trim().length === 0);
  assert.ok(map.rows.every((row) => row[0] === ' ' && row.at(-1) === ' '));
  assert.equal(map.entities.filter((entity) => entity.type === 'door').length, 2);
  assert.equal(map.entities.filter((entity) => entity.type === 'npc').length, 4);
  const spring = map.entities.find((entity) => entity.id === 'lounge_spring');
  assert.equal(spring.image, 'assets/props/blue_buff.png');
  assert.deepEqual(spring.anim, { cols: 3, fps: 4 });
  assert.equal(map.enter, undefined);
});

test('lounge decor reuses furniture and Junhee art without blocking event or arrival positions', () => {
  const map = readMap('maillard_lounge');
  const benches = map.entities.filter(e => e.id.startsWith('lounge_bench_'));
  const rugs = map.entities.filter(e => e.id.startsWith('lounge_rug_'));
  const portrait = map.entities.find(e => e.id === 'lounge_junhee_portrait');
  const frame = map.entities.find(e => e.id === 'lounge_junhee_frame');
  assert.equal(benches.length, 2);
  assert.equal(rugs.length, 2);
  assert.equal(portrait.image, 'assets/portraits/junhee.png');
  assert.ok(portrait.x >= frame.x && portrait.y >= frame.y && portrait.x + portrait.w <= frame.x + frame.w && portrait.y + portrait.h <= frame.y + frame.h);
  assert.ok(frame.y + frame.h <= 160);
  for (const decor of [...benches, ...rugs, frame, portrait]) {
    assert.ok(fs.existsSync(decor.image));
    assert.equal(decor.script, undefined);
  }
  for (const rug of rugs) {
    assert.equal(rug.solid, false);
    assert.ok(rug.w >= 256 && rug.h >= 176 && rug.sortY < 0);
  }
  const reserved = [
    { x: 760, y: 320, w: 280, h: 150 },
    ...Object.values(map.spawns).map(s => ({ ...s, w: 24, h: 16 })),
    ...map.entities.filter(e => e.type === 'door' || e.type === 'sign'),
    ...map.entities.filter(e => e.type === 'npc').map(e => ({ x: e.x - e.wander * 2, y: e.y - e.wander * 2, w: 24 + e.wander * 4, h: 16 + e.wander * 4 })),
  ];
  for (const bench of benches) {
    assert.equal(bench.solid, true);
    assert.ok(reserved.every(area => !overlaps(bench, area)));
  }
});

test('three distinct wooden Junhee statues have one-line interactions without actor movement', () => {
  const map = readMap('maillard_lounge');
  const statues = map.entities.filter((entity) => entity.id.startsWith('lounge_statue_'));
  assert.equal(statues.length, 3);
  assert.equal(new Set(statues.map((entity) => entity.image)).size, 3);
  for (const statue of statues) {
    assert.match(statue.image, /statue_junhee_(arms_crossed|laugh|gesture)\.png$/);
    assert.ok(statue.y + statue.h <= 256);
    assert.equal(SCRIPTS[statue.script].length, 1);
    assert.equal(typeof SCRIPTS[statue.script][0].text, 'string');
    assert.equal(SCRIPTS[statue.script][0].move, undefined);
  }
});

test('spring interactions repeatedly restore every current party member before showing the result', () => {
  const spring = readMap('maillard_lounge').entities.find((entity) => entity.id === 'lounge_spring');
  const script = SCRIPTS[spring.script];
  assert.ok(script);
  const game = { party: ['gyeongsub', 'ppaman'], partyHp: {}, maxHpOf: (id) => id === 'ppaman' ? 180 : 140 };
  for (let attempt = 0; attempt < 2; attempt++) {
    game.partyHp = { hyungsub: 1, gyeongsub: 0, ppaman: 20 };
    for (const node of script) {
      if (node.text) break;
      node.action?.(game);
    }
    assert.deepEqual(game.partyHp, { hyungsub: 140, gyeongsub: 140, ppaman: 180 });
  }
  assert.ok(script.some((node) => node.sfx === 'heal'));
  assert.equal(script.filter((node) => node.text).length, 1);
  assert.ok(script.every((node) => !node.move && !node.face && !node.set && !node.if));
});

test('the shop opens from the reachable front door without automatic entry', () => {
  const map = readMap('maillard_lounge');
  const shop = map.entities.find((entity) => entity.id === 'lounge_shop');
  const entrance = map.entities.find((entity) => entity.script === 'maillard_shop');
  assert.ok(shop && entrance);
  assert.equal(shop.image, 'assets/props/yongjun-shop.png');
  assert.equal(shop.solid, true);
  assert.equal(shop.script, undefined);
  assert.equal(entrance.type, 'sign');
  assert.equal(entrance.solid, false);
  assert.ok(entrance.x >= shop.x && entrance.x + entrance.w <= shop.x + shop.w);
  const stand = { x: entrance.x + 12, y: shop.y + shop.h + 2, w: 24, h: 16 };
  assert.equal(overlaps(stand, shop), false);
  assert.equal(overlaps({ ...stand, y: stand.y - 19.2 }, entrance), true);
  let opened = 0;
  SCRIPTS.maillard_shop[0].action({ openShop() { opened++; } });
  assert.equal(opened, 1);
  assert.equal(SCRIPTS.maillard_shop.silent, true);
});

test('walking right from the final deck reaches the lounge and returns outside either portal', () => {
  const path = readMap('maillard_path');
  const lounge = readMap('maillard_lounge');
  const entrance = path.entities.find((entity) => entity.to === lounge.id);
  const exit = lounge.entities.find((entity) => entity.to === path.id);
  assert.ok(entrance && exit);
  assert.equal(entrance.interact, false);
  assert.equal(exit.interact, false);
  assert.ok(entrance.x > 7424);
  assert.deepEqual([entrance.x, entrance.y, entrance.w, entrance.h], [7720, 144, 40, 64]);
  for (let x = 7424; x < entrance.x + 24; x += 8) {
    assert.equal(path.rows[5][Math.floor(x / 32)], 'M');
  }
  const inside = lounge.spawns[entrance.spawn];
  const outside = path.spawns[exit.spawn];
  assert.equal(inside.facing, 'right');
  assert.equal(outside.facing, 'left');
  assert.equal(overlaps({ ...inside, w: 24, h: 16 }, exit), false);
  assert.equal(overlaps({ ...outside, w: 24, h: 16 }, entrance), false);
  assert.ok(inside.x - exit.x - exit.w >= 64);
  assert.ok(entrance.x - outside.x - 24 >= 64);
  assert.equal(path.rows[8][240], 'M');
  assert.equal(path.rows[5][244], '!');
});

test('lounge QA starts at map entry with the completed cart state and existing party', () => {
  const qa = QA_POINTS.filter((point) => point.map === 'maillard_lounge');
  assert.equal(qa.length, 1);
  assert.equal(qa[0].spawn, 'from_path');
  assert.equal(qa[0].flags.maillard_cart_done, true);
  assert.equal(qa[0].flags.maillard_sunrise_seen, true);
  assert.deepEqual(qa[0].party, ['gyeongsub', 'ppaman']);
});
