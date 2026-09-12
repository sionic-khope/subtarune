import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { SCRIPTS } from '../../src/data/scripts.js';
import { CHARACTERS } from '../../src/data/characters.js';
import { ITEMS } from '../../src/data/items.js';
import { stateFromFlags } from '../../src/core/story.js';
import { ScriptRunner, TextBox } from '../../src/ui/dialogue.js';
import { Character, Entity, Follower, TileMap, CHAR_SCALE, RENDER_SCALE } from '../../src/world/world.js';

const map = JSON.parse(fs.readFileSync(new URL('../../assets/maps/maillard_path.json', import.meta.url), 'utf8'));
const ids = ['chakgeom', 'parang', 'norang', 'wemix'];

function visualRect(entity) {
  const def = CHARACTERS[entity.def.sprite];
  const png = fs.readFileSync(def.still || def.sheet || `assets/sprites/${entity.def.sprite}.png`);
  const scale = def.still ? (def.stillScale || 1) : 1 / (4 * RENDER_SCALE);
  const w = Math.round(png.readUInt32BE(16) * scale * CHAR_SCALE);
  const h = Math.round(png.readUInt32BE(20) * scale * CHAR_SCALE);
  return { x: Math.round(entity.cx - w / 2), y: Math.round(entity.y + entity.h - h), w, h };
}

function sceneState(flags = {}, inventory = []) {
  const events = [];
  const game = {
    flags: { ...flags }, inventory: [...inventory],
    camera: { x: 7072, y: 92 }, map: new TileMap(map),
    sound: { sfx: (id) => events.push({ sound: id, tick: game.tick }), blip() {} },
    ctx: { measureText: (text) => ({ width: text.length * 8 }) },
    setFlag(key, value) { this.flags[key] = value; }, tick: 0,
  };
  game.player = new Entity({ id: 'player', sprite: 'hyungsub', ...map.spawns.wemix }, game);
  game.entities = map.entities.filter((e) => e.type === 'npc' && !flags[e.unless]).map((e) => new Entity(e, game));
  for (const [slot, id] of ['gyeongsub', 'ppaman'].entries()) {
    const follower = new Entity({ id, sprite: id, type: 'follower', solid: false }, game);
    follower.gap = 48 * (slot + 1);
    follower.snapBehind = Follower.prototype.snapBehind;
    game.entities.push(follower);
  }
  for (const actor of [game.player, ...game.entities]) {
    actor.animate = Character.prototype.animate;
    actor.faceToward = Character.prototype.faceToward;
    actor.animPhase = 0;
  }
  const box = new TextBox(game.sound, {});
  const positions = () => Object.fromEntries([game.player, ...game.entities]
    .map((e) => [e.id, { x: e.x, y: e.y, facing: e.facing }]));
  const show = box.show.bind(box);
  box.show = (node, ctx, next) => {
    events.push({ node, tick: game.tick, camera: { ...game.camera }, positions: positions(),
      rects: Object.fromEntries([game.player, ...game.entities].map((e) => [e.id, visualRect(e)])) });
    show(node, ctx, next);
  };
  const runner = new ScriptRunner(box, game);
  return { game, events, run(script) {
    assert.ok(script, 'NPC script must be registered');
    if (game.tick === 0) {
      const spawn = script === SCRIPTS.maillard_chakgeom ? 'chakgeom' : script === SCRIPTS.maillard_tarts ? 'tarts' : 'wemix';
      Object.assign(game.player, map.spawns[spawn]);
      for (const actor of game.entities.filter((e) => e.def.type === 'follower')) actor.snapBehind();
    }
    const before = { positions: positions(), camera: { ...game.camera } };
    runner.start(script);
    while (runner.running && game.tick < 2000) {
      game.tick++;
      runner.update(0.05, { just: () => true });
      const wemix = game.entities.find((e) => e.id === 'wemix');
      if (wemix?.hopY < -100 && !wemix.dead) events.push({ falling: true });
    }
    assert.equal(runner.running, false, 'scene completes with dialogue confirmation');
    return { before, after: { positions: positions(), camera: { ...game.camera } } };
  } };
}

test('test_maillard_npcs_registered_and_reachable_in_three_post_cart_pockets', () => {
  const actors = map.entities.filter((e) => e.type === 'npc');
  assert.deepEqual(actors.map((e) => e.id), ids);
  for (const actor of actors) {
    assert.ok(SCRIPTS[actor.script]);
    assert.equal(actor.solid, false);
    assert.equal(actor.wander, 0);
    assert.equal(map.rows[Math.floor((actor.y + 24) / 32)][Math.floor((actor.x + 12) / 32)], 'M');
    assert.ok(CHARACTERS[actor.sprite]);
  }
  assert.equal(CHARACTERS.chakgeom.name, '착검하고검사로살기');
  assert.equal(CHARACTERS.chakgeom.sheet, 'assets/sprites/chakgeom.png');
  assert.equal(CHARACTERS.wemix.sheet, 'assets/sprites/wemix.png');
  assert.equal(CHARACTERS.parang.still, 'assets/props/parang.png');
  assert.equal(CHARACTERS.norang.still, 'assets/props/norang.png');
  assert.equal(CHARACTERS.parang.voice, 'narrator');
  assert.equal(CHARACTERS.norang.voice, 'narrator');
  assert.equal(actors[1].script, actors[2].script);
});

test('test_maillard_chakgeom_conversation_preserves_party_positions_and_frames_dialogue', () => {
  const state = sceneState();
  for (let visit = 0; visit < 2; visit++) {
    const eventStart = state.events.length;
    const { before, after } = state.run(SCRIPTS.maillard_chakgeom);
    const lines = state.events.slice(eventStart).filter((event) => event.node);
    for (const frame of [...lines, after]) {
      for (const id of ['player', 'gyeongsub', 'ppaman']) {
        assert.deepEqual(frame.positions[id], before.positions[id], `${id} stays where the conversation began`);
      }
      assert.equal(frame.positions.chakgeom.x, before.positions.chakgeom.x);
      assert.equal(frame.positions.chakgeom.y, before.positions.chakgeom.y);
    }
    for (const frame of lines) {
      for (const id of ['chakgeom', 'player', 'gyeongsub', 'ppaman']) {
        const rect = frame.rects[id];
        assert.ok(rect.y >= frame.camera.y && rect.y + rect.h <= frame.camera.y + 230,
          `${id} remains above the dialogue box`);
      }
    }
    assert.equal(after.camera.target, state.game.player, 'camera returns to the player');
    assert.equal(after.camera.locked, false);
    if (visit === 0) {
      assert.deepEqual(lines.map((event) => event.node.text), [
        '* 안녕하세요 형님들.',
        '* 해 지면 퇴근하라고 하셔서요.{w=0.3} 어제부터 지키고 있습니다.',
        '* 야 이 씨발 좆같은 태양 새끼야 안 내려가냐?',
        '* 아 씨발 진짜 애미 씨발창새끼 찢어버리고 싶네.',
        '* 아 죄송합니다 형님들 기분이 안 좋아서',
      ]);
    } else {
      assert.deepEqual(lines.map((event) => event.node.text), [
        '* 눈 감고 있는 거 아닙니다.{w=0.3} 눈꺼풀 안쪽 경계 중입니다.',
      ]);
    }
  }
  assert.equal(state.game.flags.maillard_chakgeom_seen, true);
});

test('test_maillard_chakgeom_saved_repeat_has_no_event_or_facing_changes', () => {
  const state = sceneState({ maillard_chakgeom_seen: true });
  const actor = state.game.entities.find((e) => e.id === 'chakgeom');
  actor.facing = 'left';
  const facings = [];
  let facing = actor.facing;
  Object.defineProperty(actor, 'facing', {
    get: () => facing,
    set(value) { facings.push(value); facing = value; },
  });
  state.run(SCRIPTS.maillard_chakgeom);
  assert.deepEqual(facings, [], 'repeat does not turn toward the player or the sky');
  assert.equal(actor.emote, undefined, 'repeat does not trigger an emote');
  assert.equal(state.events.length, 1, 'only one repeat line and no sound event');
  assert.equal(state.events[0].node.text,
    '* 눈 감고 있는 거 아닙니다.{w=0.3} 눈꺼풀 안쪽 경계 중입니다.');
});

test('test_maillard_tarts_conversation_staging_keeps_every_actor_separate_and_visible', () => {
  for (const [script, actorIds] of [
    [SCRIPTS.maillard_tarts, ['parang', 'norang', 'player', 'gyeongsub', 'ppaman']],
  ]) {
    const state = sceneState();
    state.run(script);
    state.run(script);
    for (const frame of state.events.filter((event) => event.node)) {
      const rects = actorIds.map((id) => frame.rects[id]);
      for (const [index, a] of rects.entries()) {
        assert.ok(a.x >= frame.camera.x && a.y >= frame.camera.y &&
          a.x + a.w <= frame.camera.x + 480 && a.y + a.h <= frame.camera.y + 230);
        for (const b of rects.slice(index + 1)) {
          assert.equal(a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y, false,
            `conversation actor rectangles overlap: ${JSON.stringify({ a, b })}`);
        }
      }
    }
    for (const actor of [state.game.player, ...state.game.entities.filter((e) => actorIds.includes(e.id))]) {
      assert.equal(state.game.map.solidRect(actor.x, actor.y, actor.w, actor.h), false);
    }
    assert.equal(state.game.camera.target, state.game.player);
    assert.equal(state.game.camera.locked, false);
  }
});

test('test_maillard_tarts_shared_gift_is_two_consumables_and_never_repeats', () => {
  const state = sceneState();
  state.run(SCRIPTS.maillard_tarts);
  state.run(SCRIPTS.maillard_tarts);
  assert.deepEqual(state.game.inventory, ['에그타르트', '에그타르트']);
  assert.equal(state.game.flags.maillard_tarts_given, true);
  assert.equal(state.events.filter((event) => event.sound === 'item').length, 1);
  assert.equal(state.events.filter((event) => event.node?.text.includes('{c=yellow}에그타르트{/c}')).length, 1);
  assert.equal(ITEMS['에그타르트'].kind, 'plain');
  assert.equal(ITEMS['에그타르트'].heal, 100);
  const saved = sceneState(state.game.flags, []);
  saved.run(SCRIPTS.maillard_tarts);
  assert.equal(saved.events.some((event) => event.sound === 'item'), false);
  assert.deepEqual(saved.game.inventory, [], 'consumed items are not replenished after restoring a save');
  const qa = stateFromFlags(state.game.flags);
  const rebuilt = sceneState(state.game.flags, qa.inventory);
  rebuilt.run(SCRIPTS.maillard_tarts);
  assert.deepEqual(rebuilt.game.inventory, ['에그타르트', '에그타르트']);
});

test('test_maillard_wemix_audio_text_fall_and_persistent_exit', () => {
  const state = sceneState();
  state.run(SCRIPTS.maillard_wemix);
  const sound = state.events.find((e) => e.sound === 'wemix_remix');
  const opening = state.events.find((e) => e.node?.speaker === '위믹스');
  const lines = state.events.filter((e) => e.node);
  assert.deepEqual(lines.map((e) => e.node.text), [
    '* ...{w=0.4} ...{w=0.4} ...',
    '* 어 이거 위믹스네요',
    '* 위믹스~',
    '* 어 위믹스 어 떨어졌네',
    '* 씨발',
  ]);
  assert.equal(lines[0].node.voice, 'none');
  assert.ok(sound.tick > lines[1].tick, 'remix waits until after the recognition line');
  assert.equal(sound.tick, opening.tick, 'remix begins in the same update as the line');
  assert.ok(state.events.some((e) => e.falling), 'actor visibly falls before being removed');
  assert.ok(lines.slice(2).every((e) => e.node.cut > 0), 'fall and reactions retain their timing');
  for (const frame of lines.slice(0, 3)) {
    const rects = ['player', 'gyeongsub', 'ppaman', 'wemix'].map((id) => frame.rects[id]);
    for (const [index, a] of rects.entries()) {
      assert.ok(a.x >= frame.camera.x && a.y >= frame.camera.y &&
        a.x + a.w <= frame.camera.x + 480 && a.y + a.h <= frame.camera.y + 230,
      'each actor is visible above the dialogue box');
      for (const b of rects.slice(index + 1)) {
        assert.equal(a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y, false,
          `Wemix conversation rectangles overlap: ${JSON.stringify({ a, b })}`);
      }
    }
  }
  for (const actor of [state.game.player, ...state.game.entities.filter((e) => e.def.type === 'follower')]) {
    assert.equal(state.game.map.solidRect(actor.x, actor.y, actor.w, actor.h), false);
  }
  assert.equal(state.game.flags.maillard_wemix_gone, true);
  assert.equal(sceneState(state.game.flags).game.entities.some((e) => e.id === 'wemix'), false);
});
