import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { Entity, Character, Camera, TileMap } from '../../src/world/world.js';
import { TextBox, ScriptRunner } from '../../src/ui/dialogue.js';
import { makeWaiter } from '../../src/ui/cutscene.js';
import { DotBubble } from '../../src/ui/bubble.js';
import { TvBroadcast } from '../../src/world/tv-broadcast.js';
import { YOUNGCLE_TV as TV } from '../../src/data/youngcle-tv.js';
import { youngcle_intro, youngcle_tv_off } from '../../src/data/cutscenes/youngcle_intro.js';
import { QA_POINTS, stateFromFlags, storyBgm } from '../../src/core/story.js';
import { clearEditorUnionStage } from '../../src/scenes/editor-union-effects.js';

const main = readFileSync(new URL('../../src/main.js', import.meta.url), 'utf8');
const Game = runInNewContext(main.slice(main.indexOf('class Game {'), main.indexOf('// ── 부트')) + '\nGame;', {
  clearEditorUnionStage,
  Input: { poll() {}, just: () => false }, TEXT_SPEEDS: { normal: { delay: 0.045 } },
});
const room = JSON.parse(readFileSync(new URL('../../assets/maps/youngcle1.json', import.meta.url)));
function fixture() {
  const sounds = [], music = [];
  const game = { flags: {}, time: 0, party: ['gyeongsub', 'ppaman'], money: 1140, inventory: ['바나나'],
    map: new TileMap(room), camera: new Camera(), zoom: { s: 1 }, background: [], propImages: {}, bubble: new DotBubble(),
    ctx: { measureText: text => ({ width: [...text].length * 16 }) },
    sound: { sfx: name => sounds.push(name), playBgm: name => music.push(name), preloadBgm() {}, blip() {} },
    setFlag(key, value) { this.flags[key] = value; },
    zoomTo(scale, focus, duration, done) { this.zoom.s = scale; done(); },
    fadeTo(target, duration, done) { done?.(); },
    finishTvBroadcast: Game.prototype.finishTvBroadcast,
  };
  game.entities = room.entities.map(def => new Entity(def, game));
  game.player = new Entity({ id: 'player', ...room.spawns.start, solid: true }, game);
  game.entities.push(game.player);
  for (const [i, id] of game.party.entries()) game.entities.push(new Entity({ id, type: 'follower',
    x: game.player.x, y: game.player.y + (i + 1) * 48, solid: false }, game));
  for (const entity of game.entities) { entity.faceToward = Character.prototype.faceToward; entity.snapBehind = () => {}; }
  game.camera.map = game.map; game.camera.target = game.player; game.camera.snap();
  game.textbox = new TextBox(game.sound, {}); game.dialogue = new ScriptRunner(game.textbox, game);
  return { game, sounds, music };
}

test('test_youngcle_intro_waits_for_full_fade_after_entry_continue_and_QA_initialization', () => {
  for (const duration of [0.25, 0.5, null]) {
    const { game } = fixture();
    let transitionFinished = false;
    Object.assign(game, {
      fade: { alpha: duration === null ? 0 : 1, color: '0,0,0' },
      fadeTo: Game.prototype.fadeTo,
      state: 'title', settings: { textSpeed: 'normal', sound: true },
      sunrise: { update() {} }, title: { update() {} },
    });
    game.dialogue.start(youngcle_intro);
    if (duration !== null) game.fadeTo(0, duration, () => { transitionFinished = true; });
    const input = { just: () => true };
    const tick = () => {
      Game.prototype.update.call(game, 0.01);
      game.dialogue.update(0.01, input);
    };

    tick(); tick(); tick();
    assert.equal(game.fade.alpha, 1, `entry ${duration}: restore full black after camera placement`);
    assert.equal(game.textbox.isOpen, false);
    assert.equal(game.entities.find(actor => actor.id === 'youngcle_junhee').facing, 'right');
    assert.equal(game.entities.find(actor => actor.id === 'youngcle_yongjun').facing, 'left');
    if (duration !== null) assert.equal(transitionFinished, true);
    tick();
    assert.equal(game.fade.target, 0);
    assert.equal(game.fade.speed, 1 / 1.25);
    for (let step = 0; step < 124; step++) {
      tick();
      assert.equal(game.textbox.isOpen, false, `entry ${duration}: dialogue must wait for the fade`);
      assert.equal(game.player.visible, false);
      if (step === 61) assert.ok(game.fade.alpha > 0.49 && game.fade.alpha < 0.51);
    }
    assert.ok(game.fade.alpha > 0);
    for (let step = 0; step < 5 && !game.textbox.isOpen; step++) tick();
    assert.equal(game.fade.alpha, 0);
    assert.equal(game.textbox.isOpen, true);
    assert.equal(game.textbox.node.text, '* 어딨어 이자식들');
  }
});

test('test_youngcle_intro_runs_all_lines_with_delayed_party_entry_matched_TV_poses_and_one_shot_exit', () => {
  const { game, sounds, music } = fixture();
  const shown = new Set(), phases = new Set();
  game.dialogue.start(youngcle_intro);
  for (let tick = 0; tick < 12000 && game.dialogue.running; tick++) {
    game.time += 0.025; game.tvBroadcast?.update(0.025); game.bubble.update(0.025);
    if (game.tvBroadcast) phases.add(game.tvBroadcast.phase);
    game.dialogue.update(0.025, { just: key => key === 'confirm' && tick % 5 === 0 });
    if (!game.textbox.isOpen) continue;
    const node = game.textbox.node;
    if (shown.has(node)) continue;
    shown.add(node);
    if (shown.size <= 2) assert.equal(game.player.visible, false);
    else assert.equal(game.player.visible, true);
    if (node.speaker === '영클') {
      assert.equal(game.tvBroadcast.phase, 'on');
      assert.equal(node.portrait, `youngcle_tv_${game.tvBroadcast.expression}`);
      assert.equal(music.at(-1), 'storage_show');
    }
  }
  assert.equal(game.dialogue.running, false);
  assert.deepEqual([...shown], youngcle_intro.filter(node => node.text));
  assert.deepEqual([...phases], ['off', 'powering', 'on', 'shutting']);
  assert.equal(sounds.filter(name => name === 'youngcle_tv_on').length, 1);
  assert.equal(sounds.filter(name => name === 'door').length, 2);
  assert.deepEqual(music, ['storage_show']);
  assert.equal(game.flags.youngcle_intro_done, true);
  assert.equal(game.tvBroadcast, null);
  assert.equal(game.zoom.s, 1);
  assert.equal(game.camera.target, game.player);
  assert.equal(game.player.solid, true);
  for (const id of ['youngcle_junhee', 'youngcle_yongjun']) {
    const npc = game.entities.find(entity => entity.id === id);
    assert.equal(npc.dead, true);
    assert.deepEqual([npc.x, npc.y], [1212, 196]);
  }
  assert.deepEqual([game.party, game.money, game.inventory], [['gyeongsub', 'ppaman'], 1140, ['바나나']]);
  game.dialogue.start(youngcle_intro);
  assert.equal(game.dialogue.running, false);
  assert.equal(game.tvBroadcast, null);
  assert.equal(sounds.filter(name => name === 'youngcle_tv_on').length, 1);
});

test('test_youngcle_intro_parallel_reactions_target_two_dots_then_all_five_exclamations', () => {
  const dots = youngcle_intro.find(node => node.bubble);
  assert.deepEqual(dots.bubble, ['youngcle_junhee', 'gyeongsub']);
  assert.equal(dots.dots, 3);
  assert.equal(youngcle_intro.some(node => node.parallel?.some(child => child.kind === 'stamp')), false);
  const reaction = youngcle_intro.find(node => node.parallel?.some(child => child.kind === '!'));
  assert.deepEqual(reaction.parallel.map(node => node.emote), ['player', 'gyeongsub', 'ppaman', 'youngcle_junhee', 'youngcle_yongjun']);
  assert.equal(youngcle_intro.some(node => node.battle || node.join || node.map), false);
});

test('test_youngcle_departure_is_sequential_and_new_expressions_match_exact_lines', () => {
  const entries = youngcle_intro.filter(node => node.doorTransit);
  assert.deepEqual(entries.map(node => node.doorTransit.actor), ['youngcle_junhee', 'youngcle_yongjun']);
  const first = youngcle_intro.indexOf(entries[0]), second = youngcle_intro.indexOf(entries[1]);
  assert.equal(youngcle_intro[first + 1].remove, 'youngcle_junhee');
  assert.equal(youngcle_intro[first + 2].wait, 0.3);
  assert.equal(youngcle_intro[second + 1].remove, 'youngcle_yongjun');
  assert.equal(entries[1].doorTransit.closeAfter, true);
  for (const [text, pose] of [['긁혔나보노 ㅋㅋ', 'taunt'], ['그냥 ㅈㄴ부시고싶게 생겨서?', 'taunt'],
    ['어 그건..', 'shrug'], ['ㅇㅇ', 'yes'], ['ㅂㅇ', 'bye'], ['오', 'oh'], ['경섭이형도 계셨네요 ㅎㅇㅎㅇ', 'greet']]) {
    assert.equal(youngcle_intro.find(node => node.text === '* ' + text).portrait, 'youngcle_tv_' + pose);
  }
  assert.ok(TV.expressions.surprise);
  assert.equal(youngcle_intro.some(node => node.portrait === 'youngcle_tv_surprise'), false);
});

test('test_TV_power_expands_then_draws_matching_pose_only_in_inset_and_restores_caller_clip', () => {
  const { game, sounds } = fixture();
  const image = { width: 192, height: 192 };
  game.propImages[TV.expressions.laugh] = image;
  const tv = new TvBroadcast(game, TV), draws = [], clips = [];
  const ctx = { stack: [], activeClip: null, globalAlpha: 0.4,
    save() { this.stack.push({ activeClip: this.activeClip, globalAlpha: this.globalAlpha }); },
    restore() { Object.assign(this, this.stack.pop()); },
    beginPath() {}, rect(...args) { this.pendingClip = args; }, clip() { this.activeClip = this.pendingClip; clips.push(this.activeClip); },
    fillRect() {}, drawImage(...args) { draws.push({ args, clip: this.activeClip }); },
  };
  tv.draw(ctx, { x: 448, y: 68 }); assert.equal(clips.length, 0);
  tv.power(true); tv.update(TV.powerTime / 2); tv.draw(ctx, { x: 448, y: 68 });
  assert.equal(draws.length, 0);
  assert.ok(clips[0][3] > 2 && clips[0][3] < TV.inset[3]);
  tv.update(TV.powerTime / 2); tv.setExpression('laugh'); tv.draw(ctx, { x: 448, y: 68 });
  assert.equal(draws[0].args[0], image);
  assert.deepEqual(draws[0].clip, [95, -7, 258, 119]);
  assert.equal(ctx.activeClip, null); assert.equal(ctx.globalAlpha, 0.4); assert.equal(ctx.stack.length, 0);
  tv.power(false); tv.update(TV.shutdownTime); tv.draw(ctx, { x: 448, y: 68 });
  assert.equal(tv.phase, 'off'); assert.equal(draws.length, 1);
  assert.deepEqual(sounds, ['youngcle_tv_on']);
});

test('test_TV_QA_or_title_abort_disposes_renderer_runner_and_zoom_without_marking_intro_done', () => {
  const { game } = fixture();
  game.dialogue.start(youngcle_intro);
  const tv = game.tvBroadcast;
  tv.power(true); tv.update(0.2);
  game.finishTvBroadcast(true);
  tv.update(5);
  assert.equal(tv.disposed, true); assert.equal(tv.phase, 'off');
  assert.equal(game.dialogue.running, false); assert.equal(game.dialogue.wait, null);
  assert.equal(game.tvBroadcast, null); assert.equal(game.zoom.s, 1);
  assert.equal(game.flags.youngcle_intro_done, undefined);
});

test('test_youngcle_Q_inherits_bridge_state_and_music_follows_first_appearance_completion', () => {
  const point = QA_POINTS.find(point => point.id === 'youngcle1');
  const bridge = QA_POINTS.find(point => point.id === 'youngcle_bridge');
  assert.deepEqual(point.flags, bridge.flags); assert.deepEqual(point.party, bridge.party);
  assert.deepEqual(stateFromFlags(point.flags), stateFromFlags(bridge.flags));
  assert.equal(point.flags.youngcle_intro_done, undefined);
  assert.equal(storyBgm('youngcle1', point.flags), null);
  assert.equal(storyBgm('youngcle1', { ...point.flags, youngcle_intro_done: true }), 'storage_show');
});

test('test_youngcle_door_pan_keeps_zoomed_view_inside_room_and_door_visible', () => {
  const { game } = fixture();
  const door = room.entities.find(entity => entity.id === 'youngcle_right_door_image');
  const pan = youngcle_intro.find(node => Array.isArray(node.camera) && node.camera[0] > 25);
  const zoom = youngcle_intro.flatMap(node => node.parallel || []).find(node => node.zoom < 1).zoom;
  const waiter = makeWaiter(game, pan);
  waiter.update(pan.duration);
  const left = game.camera.x + 240 - 240 / zoom;
  const right = game.camera.x + 240 + 240 / zoom;
  assert.ok(left >= 0);
  assert.ok(right <= game.map.pxW, `zoomed right edge ${right} exceeds room ${game.map.pxW}`);
  assert.ok(door.x >= left && door.x + door.w <= right);
});

test('test_youngcle_off_TV_reinteraction_reacts_then_retreats_before_book_and_stays_short_on_repeat', () => {
  const { game, sounds } = fixture();
  game.flags.youngcle_intro_done = true;
  const actors = ['player', ...game.party].map(id => game.entities.find(entity => entity.id === id));
  const positions = actors.map((actor, index) => [660 + [0, -64, 64][index], 284]);
  actors.forEach((actor, index) => { actor.x = positions[index][0]; actor.y = 224; });
  const powerIndex = youngcle_tv_off.findIndex(node => node.wait === TV.powerTime);
  assert.deepEqual(youngcle_tv_off[powerIndex + 1].parallel.map(node => [node.emote, node.kind]),
    ['player', ...game.party].map(id => [id, '!']));
  assert.ok(youngcle_tv_off[powerIndex + 2].parallel.every(node => node.run));
  const shown = [], expressions = [], seenExpressions = new Set(), visibleExpressions = new Set(), phases = new Set();
  game.dialogue.start(youngcle_tv_off);
  for (let tick = 0; tick < 2000 && game.dialogue.running; tick++) {
    game.time += 0.025; game.tvBroadcast?.update(0.025);
    if (game.tvBroadcast) {
      seenExpressions.add(game.tvBroadcast.expression); phases.add(game.tvBroadcast.phase);
      if (game.tvBroadcast.phase !== 'off') visibleExpressions.add(game.tvBroadcast.expression);
    }
    game.dialogue.update(0.025, { just: key => key === 'confirm' && tick % 5 === 0 });
    if (game.textbox.isOpen && shown.at(-1) !== game.textbox.node.text) {
      shown.push(game.textbox.node.text);
      expressions.push(game.tvBroadcast?.expression);
      assert.deepEqual(actors.map(actor => [actor.x, actor.y]), positions);
      assert.ok(actors.every(actor => actor.facing === 'up'));
      assert.equal(game.zoom.s, 0.72);
    }
  }
  assert.deepEqual(shown, ['* ..오..', '* 뭐 뭐노?!']);
  assert.deepEqual(expressions, ['read', 'shock']);
  assert.deepEqual([...seenExpressions], ['smirk', 'read', 'shock', 'hide']);
  assert.deepEqual([...visibleExpressions], ['read', 'shock', 'hide']);
  assert.deepEqual([...phases], ['off', 'powering', 'on', 'shutting']);
  assert.equal(game.flags.youngcle_tv_gag_done, true);
  assert.equal(game.tvBroadcast, null);
  assert.equal(game.zoom.s, 1);
  assert.equal(game.camera.target, game.player);
  assert.equal(sounds.filter(name => name === 'youngcle_tv_on').length, 1);
  assert.deepEqual(actors.map(actor => [actor.x, actor.y]), positions);

  shown.length = 0;
  game.dialogue.start(youngcle_tv_off);
  for (let tick = 0; tick < 500 && game.dialogue.running; tick++) {
    game.dialogue.update(0.025, { just: key => key === 'confirm' && tick % 5 === 0 });
    if (game.textbox.isOpen && shown.at(-1) !== game.textbox.node.text) shown.push(game.textbox.node.text);
  }
  assert.deepEqual(shown, ['* TV는 꺼져 있다.']);
  assert.equal(game.tvBroadcast, null);
  assert.equal(sounds.filter(name => name === 'youngcle_tv_on').length, 1);
  assert.deepEqual(actors.map(actor => [actor.x, actor.y]), positions);
  assert.equal(youngcle_tv_off.some(node => node.map), false);
});
