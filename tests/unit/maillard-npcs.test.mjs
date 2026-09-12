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
  const show = box.show.bind(box);
  box.show = (node, ctx, next) => {
    events.push({ node, tick: game.tick, camera: { ...game.camera },
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
    runner.start(script);
    while (runner.running && game.tick < 2000) {
      game.tick++;
      runner.update(0.05, { just: () => script !== SCRIPTS.maillard_wemix });
      const wemix = game.entities.find((e) => e.id === 'wemix');
      if (wemix?.hopY < -100 && !wemix.dead) events.push({ falling: true });
    }
    assert.equal(runner.running, false, 'scene completes without field input');
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

test('test_maillard_conversation_staging_keeps_every_actor_separate_and_visible', () => {
  for (const [script, actorIds] of [
    [SCRIPTS.maillard_chakgeom, ['chakgeom', 'player', 'gyeongsub', 'ppaman']],
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
  assert.equal(ITEMS['에그타르트'].kind, 'plain');
  assert.equal(ITEMS['에그타르트'].heal, 100);
  const saved = sceneState(state.game.flags, []);
  saved.run(SCRIPTS.maillard_tarts);
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
  assert.equal(sound.tick, opening.tick, 'remix begins in the same update as the line');
  assert.ok(state.events.some((e) => e.falling), 'actor visibly falls before being removed');
  assert.ok(state.events.filter((e) => e.node).every((e) => e.node.cut > 0));
  assert.equal(state.game.flags.maillard_wemix_gone, true);
  assert.equal(sceneState(state.game.flags).game.entities.some((e) => e.id === 'wemix'), false);
});
