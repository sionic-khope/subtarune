import test from 'node:test';
import assert from 'node:assert/strict';
import { SCRIPTS } from '../../src/data/scripts.js';
import { CHARACTERS } from '../../src/data/characters.js';
import { CHARACTER_MOTIONS } from '../../src/data/character-motions.js';
import { readFileSync } from 'node:fs';
import { makeWaiter } from '../../src/ui/cutscene.js';

const nodes = SCRIPTS.jjajang_nest_drum;
const flatten = list => list.flatMap(node => [node, ...flatten(node.parallel || [])]);

test('test_drum_choice_no_and_cancel_end_before_any_world_side_effect', () => {
  assert.deepEqual(nodes.slice(0, 3).map(node => node.text), ['* ....', '* 드럼통이다.', '* 드럼통을 두드려볼까?']);
  const choice = nodes[2].choice;
  assert.equal(choice.cancel, 1);
  assert.equal(choice.options[1].goto, 'done');
  assert.equal(nodes.at(-1).label, 'done');
  assert.ok(nodes.slice(0, 3).every(node => !node.action && !node.set && !node.bgm && !node.move));
});

test('test_drum_devil_reveal_occurs_behind_white_before_two_roars_and_narration', () => {
  const flat = flatten(nodes);
  const white = flat.findIndex(node => node.fade === 'white');
  const emerge = flat.findIndex(node => node.emerge === 'drum_devil');
  const clear = flat.findIndex(node => node.fade === 'in');
  assert.ok(white < emerge && emerge < clear);
  assert.ok(flat[white].duration >= 2);
  assert.equal(flat.filter(node => node.sfx === 'baron_roar').length, 2);
  assert.equal(flat.find(node => node.bgm === 'baron_intro').volume, 0.55);
  assert.deepEqual(flat.filter(node => node.speaker === '???').map(node => node.text), [
    '* 조사받.. 고 가..냐 이년아.', '* 니 친정엄마 ㅆ 2발년아.',
  ]);
  assert.deepEqual(flat.filter(node => node.text).slice(-4).map(node => node.text), [
    '* 드럼통의 악마인 것 같다.', '* 압도적인 포스에 몸이 떨려온다.', '* 죽음의 공포가 나를 감싼다.', '* 그럼에도 나는 포기할 수 없다.',
  ]);
  assert.deepEqual(flat.find(node => node.battle).battle.enemies, ['drum_devil']);
  assert.equal(flat.find(node => node.battle).battle.bgm, 'drum_devil_battle');
  assert.equal(flat.find(node => node.battle).battle.bg, 'drum_nest');
  const fieldPng = readFileSync(new URL(`../../${CHARACTERS.drum_devil.still}`, import.meta.url));
  assert.ok(fieldPng.readUInt32BE(20) * CHARACTERS.drum_devil.stillScale * 1.43 <= 230);
  assert.deepEqual(CHARACTERS.drum_devil.stillPivot, [144, 234]);
  assert.ok(CHARACTER_MOTIONS.drum_devil.roar.frames.every(frame => frame.rect[2] === 272 && frame.rect[3] === 240 && frame.pivot.join() === '144,234'));
  assert.ok(flat.every(node => !node.join && !node.stage && !node.set && !node.map));
});

test('test_move_explicit_facing_keeps_backstep_looking_at_barrel_and_default_still_turns', () => {
  for (const facing of [undefined, 'right']) {
    const player = { x: 100, y: 100, w: 24, h: 16, facing: 'right', animate() {} };
    const game = { player, entities: [] };
    const waiter = makeWaiter(game, { move: 'player', by: [-32, 0], speed: 16, exact: true, facing });
    waiter.update(0.5);
    assert.equal(player.x, 84);
    assert.equal(player.facing, facing || 'left');
    assert.equal(player.moving, true);
    waiter.update(2);
    assert.equal(waiter.update(0.01), true);
    assert.equal(player.x, 36);
    assert.equal(player.moving, false);
  }
});
