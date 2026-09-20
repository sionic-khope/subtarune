import test from 'node:test';
import assert from 'node:assert/strict';
import { SCRIPTS } from '../../src/data/scripts.js';
import { CHARACTERS } from '../../src/data/characters.js';
import { CHARACTER_MOTIONS } from '../../src/data/character-motions.js';
import { readFileSync } from 'node:fs';
import { makeWaiter } from '../../src/ui/cutscene.js';
import { drumDevilThrowWaiter, INTRO_THROW } from '../../src/scenes/drum-devil-intro.js';
import { DRUM_DEVIL } from '../../src/data/drum-devil.js';

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
  assert.equal(flat.filter(node => node.sfx === 'baron_roar').length, 3);
  const narration = flat.findIndex(node => node.text === '* 드럼통의 악마인 것 같다.');
  assert.equal(flat.slice(0, narration).filter(node => node.sfx === 'baron_roar').length, 2);
  assert.equal(flat.find(node => node.bgm === 'baron_intro').volume, 0.55);
  assert.deepEqual(flat.filter(node => node.speaker === '???').map(node => node.text), [
    '* 조사받.. 고 가..냐 이년아.', '* 니 친정엄마 ㅆ 2발년아.',
  ]);
  assert.deepEqual(flat.filter(node => node.text).slice(-6).map(node => node.text), [
    '* 드럼통의 악마인 것 같다.', '* 압도적인 포스에 몸이 떨려온다.', '* 죽음의 공포가 나를 감싼다.', '* 그럼에도 나는 포기할 수 없다.',
    '* 쓰러트려야할 것 같다.', '* 나는 자세를 고쳐잡았다',
  ]);
  assert.deepEqual(flat.find(node => node.battle).battle.enemies, ['drum_devil']);
  assert.equal(flat.find(node => node.battle).battle.bgm, 'drum_devil_battle');
  assert.equal(flat.find(node => node.battle).battle.bg, 'drum_nest');
  const fieldPng = readFileSync(new URL(`../../${CHARACTERS.drum_devil.still}`, import.meta.url));
  assert.deepEqual([fieldPng.readUInt32BE(16), fieldPng.readUInt32BE(20)], [272, 232]);
  const fieldHeight = fieldPng.readUInt32BE(20) * CHARACTERS.drum_devil.stillScale * 1.43;
  assert.equal(Math.round(fieldHeight), 220);
  assert.ok(fieldHeight <= 230);
  assert.deepEqual(CHARACTERS.drum_devil.stillPivot, [142, 226]);
  assert.equal(CHARACTERS.drum_devil.stillScale, 220 / (232 * 1.43));
  assert.ok(CHARACTER_MOTIONS.drum_devil.roar.frames.every(frame => frame.rect[2] === 272 && frame.rect[3] === 232 && frame.pivot.join() === '142,226'));
  assert.equal(CHARACTER_MOTIONS.drum_devil.roar.scale, CHARACTERS.drum_devil.stillScale);
  assert.equal(CHARACTER_MOTIONS.drum_devil.throw.scale, CHARACTERS.drum_devil.stillScale);
  assert.ok(flat.every(node => !node.join && !node.stage && !node.set && !node.map));
});

test('test_drum_field_geometry_keeps_220px_artwork_above_the_dialogue', () => {
  const drum = { id: 'jjajang_nest_drum', x: 500, y: 400, w: 32, h: 32 };
  const game = { entities: [drum], camera: {} };
  const frameBarrel = nodes.find((node, index) => typeof node.action === 'function' && nodes[index + 1]?.hide === 'jjajang_nest_drum');
  frameBarrel.action(game);
  const scale = CHARACTERS.drum_devil.stillScale * 1.43;
  const root = [drum.x + drum.w / 2 - game.camera.x, drum.y + drum.h - game.camera.y];
  const bounds = {
    left: root[0] - CHARACTERS.drum_devil.stillPivot[0] * scale,
    top: root[1] - CHARACTERS.drum_devil.stillPivot[1] * scale,
    right: root[0] + (272 - CHARACTERS.drum_devil.stillPivot[0]) * scale,
    bottom: root[1] + (232 - CHARACTERS.drum_devil.stillPivot[1]) * scale,
  };
  assert.equal(game.camera.y, drum.y + drum.h - 222);
  assert.equal(Math.round(bounds.bottom - bounds.top), 220);
  assert.ok(bounds.left >= 0 && bounds.top >= 0 && bounds.right <= 480 && bounds.bottom <= 230, JSON.stringify(bounds));
});

test('test_intro_throws_exactly_one_barrel_from_registered_hand_and_waits_for_impact', () => {
  const boss = { id: 'drum_devil', x: 500, y: 400, w: 24, h: 16, def: {} };
  const sounds = [], props = [];
  const game = { entities: [boss], player: { x: 300, y: 400, w: 24, h: 16, motion: {} },
    characterMotions: { drum_devil: { throw: { scale: 0.6, frames: [{ duration: 1 }, { duration: 1 }] } } },
    propImages: { 'assets/props/jjajang_drum.png': { width: 33, height: 56 } },
    sound: { sfx: name => sounds.push(name) }, spawn(def) { const prop = { ...def, def }; props.push(prop); return prop; } };
  const waiter = drumDevilThrowWaiter(game);
  assert.equal(waiter.update(INTRO_THROW.windup), false);
  assert.equal(props.length, 1);
  assert.equal(props[0].x, Math.round(512 + DRUM_DEVIL.hand[0] * 0.6 * 1.43 - props[0].w / 2));
  assert.equal(props[0].y, Math.round(416 + DRUM_DEVIL.hand[1] * 0.6 * 1.43 - props[0].h / 2));
  assert.deepEqual(sounds, ['drum_throw']);
  assert.equal(waiter.update(INTRO_THROW.flight / 2), false);
  assert.equal(props.length, 1);
  assert.equal(waiter.update(INTRO_THROW.flight / 2), false);
  assert.deepEqual(sounds, ['drum_throw', 'drum_impact']);
  assert.equal(props[0].dead, undefined);
  assert.equal(waiter.update(INTRO_THROW.impactHold + 0.001), true);
  assert.equal(props[0].dead, true);
  assert.equal(game.player.motion, null);
  const flat = flatten(nodes);
  const throwIndex = flat.findIndex(node => node.drumDevilThrow);
  assert.ok(throwIndex > flat.findIndex(node => node.text === '* 나는 자세를 고쳐잡았다'));
  assert.ok(throwIndex < flat.findIndex(node => node.sfx === 'battle_start'));
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
