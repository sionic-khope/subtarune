import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { SCRIPTS } from '../../src/data/scripts.js';
import { ENEMIES } from '../../src/data/enemies.js';
import { QA_POINTS, stateFromFlags, storyBgm } from '../../src/core/story.js';
import { ScriptRunner, TextBox } from '../../src/ui/dialogue.js';
import { Camera, Character, Entity, TileMap } from '../../src/world/world.js';
import { CHARACTER_MOTIONS } from '../../src/data/character-motions.js';
import { darkSmokeWaiter, drawDarkSmoke } from '../../src/ui/dark-smoke.js';
import { makeWaiter } from '../../src/ui/cutscene.js';
import { CAPTAIN_MEMORY_TIMING } from '../../src/data/cutscenes/captain_aftermath.js';
import { ILLUSTRATED_NARRATION } from '../../src/ui/illustrated-narration.js';

const room = JSON.parse(fs.readFileSync('assets/maps/maillard_captain.json', 'utf8'));

test('test_captain_aftermath_pending_victory_keeps_transformed_actor_until_completion', () => {
  const present = flags => room.entities.filter(entity => !(entity.unless && flags[entity.unless]) && !(entity.requires && !flags[entity.requires]));
  const pending = present({ captain_reveal_done: true, captain_mankatsuki_defeated: true });
  assert.equal(pending.find(entity => entity.id === 'captain_mankatsuki')?.sprite, 'junhee_mankatsuki');
  const completed = present({ captain_reveal_done: true, captain_mankatsuki_defeated: true, captain_aftermath_done: true });
  assert.equal(completed.some(entity => entity.id === 'captain_mankatsuki'), false);
  assert.equal(completed.find(entity => entity.id === 'captain_junhee_restored')?.sprite, 'junhee');
});

test('test_captain_aftermath_qa_derives_single_reward_and_both_shop_upgrades', () => {
  const point = QA_POINTS.find(point => point.id === 'captain_aftermath');
  assert.ok(point);
  assert.equal(point.flags.captain_mankatsuki_defeated, true);
  assert.equal(point.flags.captain_aftermath_done, undefined);
  assert.equal(point.flags.shop_yongjun_cialis, true);
  assert.equal(point.flags.shop_yongjun_vaseline, true);
  assert.equal(ENEMIES.mankatsuki_junhee.money, 500);
  const derive = flags => stateFromFlags(flags, { enemyMoney: id => ENEMIES[id].money });
  const won = derive(point.flags);
  const before = derive({ ...point.flags, captain_mankatsuki_defeated: false });
  assert.equal(won.money - before.money, 500);
  assert.deepEqual(derive({ ...point.flags, captain_aftermath_done: true }), won);
  assert.equal(won.attack, 3);
  assert.equal(won.hpBonus, 40);
});

test('test_captain_aftermath_has_four_still_card_groups_and_no_extra_battle_or_join', () => {
  const nodes = SCRIPTS.captain_aftermath;
  assert.ok(nodes);
  assert.deepEqual(nodes.filter(node => node.style === 'illustrated').map(node => node.image),
    ['origin', 'origin', 'split', 'split', 'demon', 'demon', 'demon', 'demon', 'hack', 'hack', 'hack']);
  assert.equal(nodes.some(node => node.battle || node.join || node.map), false);
  assert.equal(nodes.filter(node => node.set?.captain_aftermath_done).length, 1);
  assert.equal(nodes.find(node => node.darkSmoke?.mode === 'dissipate')?.darkSmoke.duration, 3);
  assert.equal(nodes.find(node => node.darkSmoke?.mode === 'dissipate')?.darkSmoke.from, 'captain_mankatsuki');
  assert.ok(nodes.some(node => node.motion === 'captain_mankatsuki' && node.name === 'laugh' && node.sfx === 'laugh_junhee'));
  assert.equal(storyBgm(room.id, { captain_mankatsuki_defeated: true }), null);
  assert.equal(storyBgm(room.id, { captain_aftermath_done: true }), null);
});

function aftermathGame(flags) {
  const events = { sounds: [], music: [], scenes: [], text: [], fades: [] };
  const game = {
    time: 0, flags: { ...flags }, background: [], money: 1140, party: ['gyeongsub', 'ppaman'],
    ctx: { measureText: text => ({ width: [...text].length * 16 }) },
    sound: { sfx: id => events.sounds.push(id), playBgm: id => events.music.push(id),
      stopBgm: () => events.music.push(null), preloadBgm() {}, blip() {} },
    setFlag(key, value = true) { this.flags[key] = value; },
    runScript(key) { events.scenes.push(key); },
    fadeTo(alpha, duration, callback) { events.fades.push([alpha, duration]); callback(); },
    zoomTo(scale, focus, duration, callback) { callback(); },
    characterMotions: CHARACTER_MOTIONS,
  };
  game.map = new TileMap(room);
  game.entities = room.entities.filter(def => !(def.unless && flags[def.unless]) && !(def.requires && !flags[def.requires]))
    .map(def => new Entity({ ...def }, game));
  game.player = new Entity({ id: 'player', sprite: 'hyungsub', ...room.spawns.start }, game);
  game.entities.push(game.player, ...['ppaman', 'gyeongsub'].map((id, index) =>
    new Entity({ type: 'follower', id, x: 420, y: 424 + index * 48, solid: false }, game)));
  for (const entity of game.entities) {
    entity.faceToward = Character.prototype.faceToward;
    entity.setSprite = sprite => { entity.def.sprite = sprite; };
  }
  game.camera = new Camera(); game.camera.map = game.map; game.camera.target = game.player; game.camera.snap();
  game.textbox = new TextBox(game.sound, {});
  game.textbox.illustration.getImage = id => ({ id });
  game.dialogue = new ScriptRunner(game.textbox, game);
  return { game, events };
}

test('test_captain_memory_entry_waits_for_black_before_music_and_picture_typing', () => {
  const { game } = aftermathGame({ captain_reveal_done: true, captain_mankatsuki_defeated: true });
  const nodes = SCRIPTS.captain_aftermath;
  const firstPicture = nodes.findIndex(node => node.style === 'illustrated');
  const entry = nodes.findLastIndex((node, index) => index < firstPicture && node.fade === 'out');
  const music = [], blips = [];
  let activeFade = null;
  game.fade = { alpha: 0 };
  game.fadeTo = (alpha, duration, callback) => {
    activeFade = { from: game.fade.alpha, to: alpha, duration, start: game.time, callback };
  };
  game.sound.playBgm = (id, options) => music.push({ id, options, time: game.time, alpha: game.fade.alpha, curtain: game.curtain });
  game.sound.blip = () => blips.push(game.time);
  game.dialogue.start(nodes.slice(entry, firstPicture + 1));
  const delay = CAPTAIN_MEMORY_TIMING.enterFade + CAPTAIN_MEMORY_TIMING.blackHold;
  assert.ok(CAPTAIN_MEMORY_TIMING.enterFade >= 2.5);
  assert.ok(CAPTAIN_MEMORY_TIMING.blackHold >= 1);
  assert.ok(ILLUSTRATED_NARRATION.firstFade >= 2.5);
  for (let tick = 0; tick < 400 && !blips.length; tick++) {
    game.time += 0.025;
    if (activeFade) {
      const progress = activeFade.duration ? Math.min(1, (game.time - activeFade.start) / activeFade.duration) : 1;
      game.fade.alpha = activeFade.from + (activeFade.to - activeFade.from) * progress;
      if (progress === 1) {
        const callback = activeFade.callback;
        activeFade = null;
        callback();
      }
    }
    game.dialogue.update(0.025, { just: () => false });
    if (game.time < delay) assert.equal(music.length, 0);
  }
  assert.equal(music.length, 1);
  assert.equal(music[0].id, 'captain_memories');
  assert.equal(music[0].options.fadeIn, CAPTAIN_MEMORY_TIMING.musicFadeIn);
  assert.equal(music[0].alpha, 1);
  assert.equal(music[0].curtain, 'black');
  assert.ok(music[0].time >= delay && music[0].time < delay + 0.1);
  assert.ok(blips[0] >= music[0].time + ILLUSTRATED_NARRATION.firstFade);
  assert.equal(game.textbox.illustration.transitioning, false);
  assert.equal(nodes.filter(node => node.bgm === 'captain_memories').length, 1);
  const exit = nodes.findIndex(node => node.imageExit);
  const returnFade = nodes.findIndex((node, index) => index > exit && node.fade === 'in');
  const returning = nodes.slice(exit + 1, returnFade + 1);
  assert.equal(returning.find(node => 'bgm' in node).fadeOut, CAPTAIN_MEMORY_TIMING.musicFadeOut);
  assert.equal(returning.find(node => 'wait' in node).wait, CAPTAIN_MEMORY_TIMING.returnHold);
  assert.equal(returning.at(-1).duration, CAPTAIN_MEMORY_TIMING.returnFade);
});

test('test_cutscene_bgm_preserves_default_fade_and_forwards_explicit_fade', () => {
  const calls = [];
  const game = { sound: { playBgm: (...args) => calls.push(args) } };
  makeWaiter(game, { bgm: 'captain_memories' });
  makeWaiter(game, { bgm: 'captain_memories', fadeIn: CAPTAIN_MEMORY_TIMING.musicFadeIn });
  makeWaiter(game, { bgm: 'captain_memories', volume: 0.2, fadeIn: 0 });
  assert.deepEqual(calls, [
    ['captain_memories', { volume: 0.6, fadeIn: 0.5 }],
    ['captain_memories', { volume: 0.6, fadeIn: CAPTAIN_MEMORY_TIMING.musicFadeIn }],
    ['captain_memories', { volume: 0.2, fadeIn: 0 }],
  ]);
});

test('test_captain_aftermath_runner_restores_junhee_and_finishes_without_repeated_reward', () => {
  const { game, events } = aftermathGame({ captain_reveal_done: true, captain_mankatsuki_defeated: true });
  const player = game.player;
  const seen = new Set();
  const smoke = [];
  game.dialogue.start(SCRIPTS.captain_aftermath);
  for (let tick = 0; tick < 18000 && game.dialogue.running; tick++) {
    game.time += 0.025;
    game.background = game.background.filter(waiter => !waiter.update(0.025, {}));
    game.dialogue.update(0.025, { just: key => key === 'confirm' && tick % 5 === 0 });
    game.camera.follow(0.05);
    if (game.darkSmoke?.mode === 'dissipate') smoke.push(game.darkSmoke.veil);
    if (game.textbox.isOpen) {
      seen.add(game.textbox.node);
      for (const id of ['player', 'ppaman', 'gyeongsub', 'captain_mankatsuki']) {
        const entity = game.entities.find(entity => entity.id === id);
        assert.equal(game.map.solidRect(entity.x, entity.y, entity.w, entity.h), false, id);
        assert.equal(game.entities.some(prop => prop.def.type === 'prop' && prop.solid && prop.overlaps(entity.rect)), false, id);
      }
    }
  }
  assert.equal(game.dialogue.running, false);
  assert.equal(seen.size, SCRIPTS.captain_aftermath.filter(node => node.text).length);
  assert.equal(game.flags.captain_aftermath_done, true);
  assert.equal(game.darkSmoke, null);
  assert.equal(game.curtain, null);
  assert.equal(game.player, player);
  assert.equal(game.entities.find(entity => entity.id === 'captain_junhee_restored').def.sprite, 'junhee');
  assert.equal(game.entities.find(entity => entity.id === 'captain_junhee_restored').def.visualScale, 1);
  assert.deepEqual(events.music, [null, 'captain_memories', null]);
  assert.equal(events.sounds.filter(id => id === 'laugh_junhee').length, 1);
  assert.equal(game.money, 1140);
  assert.deepEqual(game.party, ['gyeongsub', 'ppaman']);
  assert.ok(smoke.length >= 115);
  assert.ok(smoke[0] > smoke.at(-1));
  assert.equal(game.entities.find(entity => entity.id === 'gyeongsub').x - player.x, 64);
  assert.equal(player.x - game.entities.find(entity => entity.id === 'ppaman').x, 64);
  const before = structuredClone(events);
  game.dialogue.start(SCRIPTS.captain_aftermath);
  assert.equal(game.dialogue.running, false);
  assert.deepEqual(events, before);
  assert.equal(game.money, 1140);
});

test('test_captain_aftermath_victory_entry_routes_pending_without_starting_battle_again', () => {
  const { game, events } = aftermathGame({ captain_reveal_done: true, captain_mankatsuki_defeated: true });
  let ended = 0;
  game.dialogue.start(SCRIPTS.captain_mankatsuki, () => { ended++; });
  assert.equal(game.dialogue.running, false);
  assert.deepEqual(events.scenes, ['captain_aftermath']);
  assert.equal(ended, 1);
  assert.equal(game.money, 1140);
});

test('test_captain_aftermath_dissipation_halves_visible_smoke_and_aura_then_clears', () => {
  const actor = { id: 'captain_mankatsuki', x: 420, y: 270, w: 24, h: 16, def: { visualScale: 1.5 } };
  const game = { time: 0, entities: [actor] };
  darkSmokeWaiter(game, { mode: 'veil', veil: 0.4, duration: 0.01,
    aura: { at: actor.id, colors: ['#52228c'] } }).update(0.01);
  game.time = 3;
  const node = SCRIPTS.captain_aftermath.find(node => node.darkSmoke?.mode === 'dissipate');
  const waiter = darkSmokeWaiter(game, node.darkSmoke);
  const drawAlpha = () => {
    const alpha = new Map();
    drawDarkSmoke({ save() {}, restore() {}, fillRect() {
      alpha.set(this.fillStyle, Math.max(alpha.get(this.fillStyle) || 0, this.globalAlpha));
    } }, game, { x: 0, y: 0 });
    return alpha;
  };
  assert.deepEqual(game.darkSmoke.source, { x: 432, y: 256 });
  const before = drawAlpha();
  assert.equal(waiter.update(1.5), false);
  game.time += 1.5;
  const midpoint = drawAlpha();
  for (const color of ['#030207', '#000', '#52228c']) {
    assert.ok(before.get(color) > 0, color);
    assert.equal(midpoint.get(color), before.get(color) / 2, color);
  }
  assert.equal(waiter.update(1.5), true);
  game.time += 1.5;
  const end = drawAlpha();
  for (const color of ['#030207', '#000', '#52228c']) assert.equal(end.get(color), 0, color);
  darkSmokeWaiter(game, null);
  assert.equal(game.darkSmoke, null);
});
