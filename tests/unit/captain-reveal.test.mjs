import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { SCRIPTS } from '../../src/data/scripts.js';
import { storyBgm, QA_POINTS } from '../../src/core/story.js';
import { ScriptRunner, TextBox } from '../../src/ui/dialogue.js';
import { Camera, Character, Entity, TileMap } from '../../src/world/world.js';
import { darkSmokeWaiter, drawDarkSmoke } from '../../src/ui/dark-smoke.js';
import { CHARACTER_MOTIONS } from '../../src/data/character-motions.js';
import { makeWaiter } from '../../src/ui/cutscene.js';

const room = JSON.parse(fs.readFileSync('assets/maps/maillard_captain.json', 'utf8'));

test('captain arrival starts the reveal once and preserves a separate transformed resident', () => {
  assert.equal(room.enter?.script, 'captain_reveal');
  assert.equal(room.enter.flag, 'captain_reveal_started');
  const ordinary = room.entities.find(entity => entity.id === 'captain_junhee');
  const transformed = room.entities.find(entity => entity.id === 'captain_mankatsuki');
  assert.equal(ordinary.unless, 'captain_reveal_done');
  assert.equal(ordinary.facing, 'right');
  assert.equal(transformed.requires, 'captain_reveal_done');
  assert.equal(transformed.sprite, 'junhee_mankatsuki');
  assert.deepEqual(QA_POINTS.filter(point => point.map === room.id).map(point => point.id), ['maillard_captain', 'captain_aftermath']);
  assert.equal(storyBgm(room.id, { captain_reveal_done: true }), 'captain_mankatsuki');
});

test('captain reveal leaves the player intact and stops at the transformed standoff', () => {
  const script = SCRIPTS.captain_reveal;
  assert.ok(script);
  const nodes = script.flatMap(node => [node, ...(node.parallel || []), ...(Array.isArray(node.async) ? node.async : [])]);
  assert.equal(nodes.some(node => node.battle), false);
  assert.equal(nodes.some(node => node.hide === 'player' || node.remove === 'player'), false);
  assert.ok(nodes.some(node => node.show === 'captain_shadow'));
  assert.ok(nodes.some(node => node.darkSmoke?.mode === 'gather' && node.darkSmoke.duration === 3));
  assert.ok(nodes.some(node => node.darkSmoke?.mode === 'transfer' && node.darkSmoke.duration >= 4.5));
  assert.ok(nodes.some(node => node.pose === 'player' && node.to === 'lying'));
  assert.ok(nodes.some(node => node.pose === 'player' && node.to === 'stand'));
  assert.ok(nodes.some(node => node.set?.captain_reveal_done));
  assert.ok(nodes.some(node => node.remove === 'captain_shadow'));
});

test('test_captain_reveal_first_nod_waits_for_narration_before_music_and_smoke', () => {
  const nodes = SCRIPTS.captain_reveal;
  const nodIndex = nodes.findIndex(node => node.nod === 'player');
  assert.ok(nodIndex >= 0);
  assert.equal(nodes[nodIndex].duration, 1.8);
  assert.deepEqual(nodes[nodIndex + 1], { voice: 'narrator', text: '* 용케 알아차렸구나 잘 하셨습니다.' });
  assert.deepEqual(nodes[nodIndex + 2], { bgm: 'captain_reveal' });
  assert.equal(nodes[nodIndex + 3].darkSmoke.mode, 'swell');
});

test('real reveal runner completes without moving a character into furnishings or retaining temporary offsets', () => {
  const sounds = [], music = [], seen = new Set();
  const queuedScripts = [], attackFrames = new Set(), departingShadow = [];
  const game = {
    time: 0, flags: {}, background: [], ctx: { measureText: text => ({ width: [...text].length * 16 }) },
    sound: { sfx: id => sounds.push(id), playBgm: id => music.push(id), stopBgm() {}, preloadBgm() {}, blip() {} },
    setFlag(key, value = true) { this.flags[key] = value; },
    runScript(key) { queuedScripts.push(key); },
    fadeTo(alpha, duration, callback) { callback(); },
    characterMotions: CHARACTER_MOTIONS,
  };
  game.map = new TileMap(room);
  game.entities = room.entities.filter(def => !def.requires).map(def => new Entity({ ...def }, game));
  game.player = new Entity({ id: 'player', sprite: 'hyungsub', ...room.spawns.start }, game);
  game.entities.push(game.player, ...['ppaman', 'gyeongsub'].map((id, index) => new Entity({ type: 'follower', id, x: 420, y: 424 + index * 48, solid: false }, game)));
  for (const entity of game.entities) {
    entity.faceToward = Character.prototype.faceToward;
    entity.setSprite = sprite => { entity.def.sprite = sprite; };
  }
  game.camera = new Camera(); game.camera.map = game.map; game.camera.target = game.player; game.camera.snap();
  game.textbox = new TextBox(game.sound, {});
  game.dialogue = new ScriptRunner(game.textbox, game);
  const player = game.player;
  game.dialogue.start(SCRIPTS.captain_reveal);
  for (let tick = 0; tick < 20000 && game.dialogue.running; tick++) {
    game.time += 0.025;
    game.background = game.background.filter(waiter => !waiter.update(0.025, {}));
    game.dialogue.update(0.025, { just: key => key === 'confirm' && tick % 5 === 0 });
    game.camera.follow(0.05);
    game.entities = game.entities.filter(entity => !entity.dead);
    if (player.motion) attackFrames.add(player.motion.index);
    const shadow = game.entities.find(entity => entity.id === 'captain_shadow');
    if (player.pose === 'lying' && shadow?.visible) departingShadow.push({ x: shadow.x, cameraX: game.camera.x });
    if (game.textbox.isOpen) {
      seen.add(game.textbox.node);
      for (const entity of game.entities.filter(item => ['player', 'ppaman', 'gyeongsub', 'captain_junhee'].includes(item.id))) {
        assert.equal(game.map.solidRect(entity.x, entity.y, entity.w, entity.h), false, entity.id);
        assert.equal(game.entities.some(prop => prop.def.type === 'prop' && prop.solid && prop.overlaps(entity.rect)), false, entity.id);
      }
    }
    assert.equal(game.player, player);
    assert.equal(player.visible, true);
  }
  assert.equal(game.dialogue.running, false);
  assert.equal(seen.size, SCRIPTS.captain_reveal.filter(node => node.text).length);
  assert.equal(game.flags.captain_reveal_done, true);
  assert.deepEqual(queuedScripts, ['captain_mankatsuki']);
  assert.equal(game.darkSmoke.mode, 'veil');
  assert.equal(game.darkSmoke.veil, 0.4);
  assert.equal(game.darkSmoke.aura.actor.id, 'captain_mankatsuki');
  assert.deepEqual([...attackFrames], [0, 1, 2, 3]);
  assert.ok(departingShadow.length > 100);
  assert.ok(departingShadow.at(-1).x - departingShadow[0].x > 200);
  assert.ok(departingShadow.at(-1).x - departingShadow.at(-1).cameraX > 480 + 50);
  assert.equal(player.pose, null);
  assert.equal(player.spin || 0, 0);
  assert.equal(player.flyY || 0, 0);
  assert.equal(game.entities.some(entity => entity.id === 'captain_shadow'), false);
  assert.equal(game.entities.find(entity => entity.id === 'captain_mankatsuki').def.sprite, 'junhee_mankatsuki');
  assert.deepEqual(music, ['captain_reveal', 'captain_mankatsuki']);
  assert.equal(sounds.filter(id => id === 'captain_thunder').length, 1);
  assert.equal(sounds.filter(id => id === 'captain_transform').length, 1);
});

test('possession aura follows its actor through movement, sprite rename, and white-fade veil change', () => {
  const actor = { id: 'junhee', x: 320, y: 280, w: 24, h: 16 };
  const game = { time: 0, entities: [actor] };
  darkSmokeWaiter(game, { mode: 'cloak', from: 'junhee', duration: 3.6, veil: 0.4,
    aura: { at: 'junhee', colors: ['#52228c', '#9145d0', '#c17aff'] } }).update(3.6);
  const aura = game.darkSmoke.aura;
  actor.id = 'mankatsuki'; actor.x += 20; game.time = 5;
  darkSmokeWaiter(game, { mode: 'veil', duration: 0.01, veil: 0.4 }).update(0.01);
  assert.equal(game.darkSmoke.aura, aura);
  const pigment = new Set();
  drawDarkSmoke({ save() {}, restore() {}, fillRect() { pigment.add(this.fillStyle); } }, game, { x: 0, y: 0 });
  for (const color of aura.colors) assert.ok(pigment.has(color));
  darkSmokeWaiter(game, null);
  assert.equal(game.darkSmoke, null);
});

test('captain formation uses the new animated sheet for eight seconds before standard battle entry', () => {
  const nodes = SCRIPTS.captain_mankatsuki;
  const formationIndex = nodes.findIndex(node => node.parallel?.some(child => child.boom));
  const formation = nodes[formationIndex].parallel.find(node => node.boom);
  assert.equal(formation.boom.sheet, 'assets/fx/mankatsuki-vortex.png');
  assert.equal(nodes.slice(0, formationIndex).some(node => node.vortex), false);
  const calls = [];
  const game = { entities: [{ id: 'captain_mankatsuki', x: 420, y: 270, w: 24, h: 16 }],
    sound: { sfx() {} }, playBoom: value => calls.push(value) };
  const waiter = makeWaiter(game, formation);
  assert.equal(waiter.update(5.8), false);
  assert.equal(waiter.update(2.19), false);
  assert.equal(waiter.update(0.02), true);
  assert.equal(calls[0].duration, 8);
  assert.equal(calls[0].grow, 5.8);
  assert.ok(calls[0].endScale > calls[0].scale * 6);
  const cleanup = nodes.findIndex(node => node.darkSmoke === null);
  assert.ok(cleanup > nodes.findIndex(node => node.fade === 'out'));
  assert.ok(cleanup < nodes.findIndex(node => node.battle));
});

test('dark clouds take the specified time, render opaque pigment rather than sparks, and release explicitly', () => {
  const game = { time: 0, player: { x: 400, y: 350, w: 24, h: 16 }, entities: [{ id: 'host', x: 320, y: 280, w: 24, h: 16 }] };
  const waiter = darkSmokeWaiter(game, { mode: 'transfer', from: 'player', to: 'host', duration: 3, veil: 0.4 });
  assert.equal(waiter.update(2.9), false);
  assert.equal(waiter.update(0.1), true);
  const pigment = new Set();
  const ctx = { save() {}, restore() {}, fillRect() { pigment.add(this.fillStyle); } };
  drawDarkSmoke(ctx, game, { x: 0, y: 0 });
  assert.ok(pigment.has('#000'));
  assert.equal(pigment.has('#fff'), false);
  darkSmokeWaiter(game, null);
  assert.equal(game.darkSmoke, null);
});
