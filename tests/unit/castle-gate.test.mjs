import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CASTLE_GATE as G, prepareCastleGate, openCastleGate, walkIntoCastleGate,
  updateCastleGate, finishCastleGate, drawCastleGate } from '../../src/scenes/castle-gate.js';
import { castle_gate_reunion, castle_gate_enter, castle_dark_path_intro, placeCastleGateParty, GATE_ALLIES } from '../../src/data/cutscenes/castle_gate.js';
import { castle_left_orb_return } from '../../src/data/cutscenes/castle_orb.js';
import { partyFromFlags, QA_POINTS, storyBgm } from '../../src/core/story.js';
import { drawCastleOrbWorld } from '../../src/scenes/castle-orb.js';
import { TileMap, CHAR_SCALE } from '../../src/world/world.js';
import { CHARACTERS } from '../../src/data/characters.js';
import { makeWaiter } from '../../src/ui/cutscene.js';

const def = JSON.parse(readFileSync(new URL('../../assets/maps/gajaeman_castle_lobby.json', import.meta.url)));
function setup(open = false) {
  const cues = [], handles = [];
  const entity = source => ({ ...source, def: source, w: source.w ?? 24, h: source.h ?? 16,
    drawX: source.ix, drawY: source.iy, visible: !source.hidden, solid: source.solid ?? true });
  const game = { mapId: G.map, map: { def, rows: [...def.rows], bake() {} },
    flags: { castle_left_seal_active: true, castle_right_seal_active: true, castle_gate_open: open },
    dialogue: { script: castle_gate_reunion }, entities: def.entities.filter(d => d.id !== (open ? G.closed : G.open)).map(entity),
    propImages: {}, requestPropImage: async () => {}, setFlag(key, value = true) { this.flags[key] = value; },
    applyTiles(key) { this.tiles = key; }, spawn(source) { this.entities.push(entity(source)); },
    sound: { loadSfxFiles: async () => {}, sfx(key) { cues.push(key); const handle = { pause() { this.paused = true; } }; handles.push(handle); return handle; } } };
  game.player = entity({ id: 'player', x: 628, y: 800 });
  game.entities.push(...['gyeongsub', 'ppaman'].map(id => entity({ id, x: 628, y: 840 })));
  return { game, cues, handles };
}

test('gate318_opening_commits_at_visible_completion_and_matches_map_open_prop', async () => {
  const { game, cues } = setup(); await prepareCastleGate(game);
  let ended = false; const pending = openCastleGate(game).then(() => { ended = true; });
  updateCastleGate(game, 0.8);
  assert.equal(game.flags.castle_gate_open, false);
  assert.ok(game.castleGate.progress > 0);
  assert.equal(game.entities.find(e => e.id === G.closed).visible, false);
  updateCastleGate(game, 0.9); await pending;
  assert.equal(ended, true); assert.equal(game.flags.castle_gate_open, true);
  assert.equal(game.tiles, G.flag);
  assert.equal(game.entities.filter(e => e.id === G.open && !e.dead).length, 1);
  assert.deepEqual(cues, ['locker', 'rumble']);
});

test('gate318_abort_rolls_back_only_uncommitted_opening_and_releases_waiter', async () => {
  const { game, handles } = setup(); await prepareCastleGate(game);
  const pending = openCastleGate(game); updateCastleGate(game, 1.7); await pending;
  finishCastleGate(game, true);
  assert.equal(game.castleGate, null); assert.equal(game.flags.castle_gate_open, false);
  assert.equal(game.flags.castle_gate_reunion_done, undefined);
  assert.equal(game.entities.filter(e => e.id === G.closed && !e.dead).length, 1);
  assert.equal(game.entities.find(e => e.id === G.closed && !e.dead).visible, true);
  assert.ok(handles.every(h => h.paused));
});

test('gate318_reentry_does_not_close_an_already_committed_gate', async () => {
  const { game, cues } = setup(true); await prepareCastleGate(game);
  await openCastleGate(game); finishCastleGate(game, true);
  assert.equal(game.flags.castle_gate_open, true); assert.deepEqual(cues, []);
});

test('gate318_passage_clips_walkers_and_cancellation_clears_transient_offsets', async () => {
  const { game } = setup(true); await prepareCastleGate(game);
  const actor = game.entities.find(e => e.id === 'gate_junhee'); actor.x = 628; actor.y = 384;
  const pending = walkIntoCastleGate(game, actor.id); updateCastleGate(game, 0.5);
  assert.ok(actor.doorTransit.offsetY < 0); assert.equal(actor.moving, true);
  game.dialogue.script = []; updateCastleGate(game, 0.1); await pending;
  assert.equal(actor.doorTransit, null); assert.equal(actor.driven, false);
  assert.equal(actor.visible, true); assert.equal(game.castleGate, null);
});

test('gate318_completed_passage_hides_actor_without_reopening_or_resounding_door', async () => {
  const { game, cues } = setup(true); await prepareCastleGate(game);
  const actor = game.entities.find(e => e.id === 'gate_mario');
  const pending = walkIntoCastleGate(game, actor.id); updateCastleGate(game, 1.1); await pending;
  assert.equal(actor.visible, false); assert.equal(actor.doorTransit, null); assert.deepEqual(cues, []);
});

test('gate318_party_placement_preserves_collision_and_uses_map_owned_anchors', () => {
  const { game } = setup(); placeCastleGateParty(game);
  assert.equal(game.player.x, def.meta.gate.entrance[0]); assert.equal(game.player.solid, true);
  assert.ok(GATE_ALLIES.every(id => game.entities.find(e => e.id === id).visible));
});

test('gate319_return_stays_black_until_all_nine_actors_and_camera_are_prepared', () => {
  const arrival = castle_left_orb_return.findIndex(node => node.map === G.map);
  const end = castle_left_orb_return.findIndex((node, i) => i > arrival && node.end);
  assert.equal(castle_left_orb_return.slice(arrival, end).some(node => node.fade === 'in'), false);
  const reveal = castle_gate_reunion.findIndex(node => node.fade === 'in');
  const placement = castle_gate_reunion.findIndex(node => node.action === placeCastleGateParty);
  const preload = castle_gate_reunion.findIndex(node => node.action === prepareCastleGate);
  assert.ok(reveal > placement && reveal > preload);
  assert.ok(castle_gate_reunion.slice(0, placement).some(node => node.fade === 'out'));
  assert.ok(castle_gate_reunion.slice(placement, reveal).some(node => node.camera && node.duration === 0));
  assert.ok(castle_gate_reunion.findIndex(node => node.parallel?.some(child => child.move)) > reveal);
});

test('gate319_all_nine_keep_canonical_sizes_and_safe_feet_through_entry_assembly_and_door_approaches', () => {
  const { game } = setup(true); game.map = new TileMap(def);
  placeCastleGateParty(game);
  const actors = [game.player, ...['gyeongsub', 'ppaman', ...GATE_ALLIES].map(id => game.entities.find(e => e.id === id))];
  const check = () => {
    for (const actor of actors) {
      const original = def.entities.find(e => e.id === actor.id);
      assert.equal(actor.visualScale, original?.visualScale);
      assert.equal(game.map.solidRect(actor.x, actor.y, actor.w, actor.h), false, `${actor.id} collision at ${actor.x},${actor.y}`);
      const pivot = CHARACTERS[actor.sprite]?.stillPivot?.[0] ?? 16;
      const halfWidth = pivot * CHAR_SCALE * (actor.visualScale ?? 1) / 2;
      const center = actor.x + actor.w / 2;
      assert.ok(center - halfWidth >= 480 && center + halfWidth <= 800, `${actor.id} overlaps side railing at ${actor.x},${actor.y}`);
    }
  };
  check();
  const moves = nodes => nodes.flatMap(node => Array.isArray(node) ? moves(node) : node.parallel ? moves(node.parallel) : node.move ? [node] : []);
  for (const node of moves(castle_gate_reunion)) {
    const waiter = makeWaiter(game, node);
    let ended = false;
    for (let frame = 0; frame < 600 && !ended; frame++) { ended = waiter.update(1 / 60); check(); }
    assert.equal(ended, true, `${node.move} reaches its waypoint`);
  }
});

test('gate318_narrative_preserves_exact_lines_mosaic_only_no_and_completion_order', () => {
  const text = castle_gate_reunion.filter(n => n.text).map(n => n.text.slice(2));
  assert.deepEqual(text, ['흠..', '이제 들어가면 되는거같음', '저기 뒤엔 뭐가있을까', '열어볼게.', '오 시발.',
    'ㅈㄴ소름끼치게 생김', '오...', '일단 편집노조들 같이 ㄱㄱ', '나도 같이가', 'ㅇㅇ', '...',
    '쓰으으으으으으읍 미스', '뭐해 빠맨아?', '긴장풀기요', 'ㅋㅋㅋ..', '가요 형.']);
  assert.deepEqual(castle_gate_reunion.find(n => n.mosaic).mosaic, { text: '노', block: 2 });
  assert.equal(castle_gate_reunion.filter(n => n.speaker === '영클').every(n => n.portrait === 'youngcle_tv_smirk'), true);
  assert.ok(castle_gate_reunion.findIndex(n => n.stage) > castle_gate_reunion.findIndex(n => n.text === '* 가요 형.'));
  assert.equal(castle_gate_enter.find(n => n.map).enter, true);
  assert.deepEqual(castle_dark_path_intro.filter(n => n.text).map(n => n.text.slice(2)), ['...', '아무것도 안보여요', '다른애들은 어디로간거지?', '일단 앞으로 가봐요..']);
});

test('gate318_active_left_return_requires_both_seals_and_restores_playable_party_after_completion', () => {
  const guard = castle_left_orb_return.find(n => n.if && n.goto === 'left-return-end');
  assert.equal(guard.if({ castle_left_seal_active: true }), true);
  assert.equal(guard.if({ castle_left_seal_active: true, castle_right_seal_active: true }), undefined);
  assert.deepEqual(partyFromFlags({ castle_boulder_done: true }), []);
  assert.deepEqual(partyFromFlags({ castle_boulder_done: true, castle_gate_reunion_done: true }), ['gyeongsub', 'ppaman']);
  for (const id of ['castle_gate_reunion', 'castle_gate_after', 'castle_dark_path']) assert.ok(QA_POINTS.some(q => q.id === id));
  assert.equal(storyBgm('gajaeman_castle_dark_path', { castle_dark_path_seen: true }), 'castle_dark_path');
});

test('gate318_completed_left_orb_return_bypasses_boulder_guard_without_repeating_reunion', () => {
  const route = flags => {
    const nodes = [], labels = new Map(castle_left_orb_return.map((node, i) => [node.label, i]));
    for (let i = 0; i < castle_left_orb_return.length; i++) {
      const node = castle_left_orb_return[i];
      if (node.if && node.if(flags)) { i = labels.get(node.goto); continue; }
      if (node.end) break;
      nodes.push(node);
    }
    return nodes;
  };
  const completedFlags = { castle_left_seal_active: true, castle_right_seal_active: true, castle_gate_open: true, castle_gate_reunion_done: true };
  const repeat = route(completedFlags);
  assert.deepEqual(repeat.filter(n => n.map).map(n => [n.map, n.spawn]), [['gajaeman_castle_lobby', 'from_dark']]);
  assert.deepEqual(repeat.filter(n => n.join).map(n => n.join), ['gyeongsub', 'ppaman']);
  assert.equal(repeat.some(n => n.text || n.set || n.stage), false);
  assert.ok(repeat.some(n => n.camera === 'player') && repeat.some(n => n.regroup));
  assert.equal(completedFlags.castle_gate_open, true);
  const first = route({ castle_left_seal_active: true, castle_right_seal_active: true });
  assert.deepEqual(first.filter(n => n.map).map(n => n.map), ['gajaeman_castle_boulder', 'gajaeman_castle_lobby']);
  assert.deepEqual(first.filter(n => n.text).map(n => n.text), ['* 다 됐노?', '* 이제 빨리 다시 그 문앞으로 가볼까', '* ㅇㅋ요']);
});

test('gate318_open_or_moving_door_has_no_floating_closed_seal_overlay', () => {
  const { game } = setup(true);
  const ctx = { save() { assert.fail('closed seal overlay must not draw over an opened gate'); } };
  drawCastleOrbWorld(ctx, game, { x: 0, y: 0 });
  game.flags.castle_gate_open = false; game.castleGate = { progress: 0.5 };
  drawCastleOrbWorld(ctx, game, { x: 0, y: 0 });
});

test('gate318_opening_keeps_frame_stationary_and_slides_two_leaves_under_arch_clip', async () => {
  const { game } = setup(); await prepareCastleGate(game);
  const open = {}, closed = {}; game.propImages[G.image] = open;
  game.entities.find(e => e.id === G.closed).image = closed;
  const pending = openCastleGate(game); updateCastleGate(game, 0.85);
  const draws = [], curves = [];
  const ctx = { save() {}, restore() {}, translate() {}, scale() {}, beginPath() {}, moveTo() {}, lineTo() {},
    closePath() {}, clip() {}, quadraticCurveTo(...args) { curves.push(args); },
    drawImage(...args) { draws.push(args); }, fillRect() {}, createRadialGradient() { return { addColorStop() {} }; } };
  drawCastleGate(ctx, game, { x: 0, y: 0 });
  assert.deepEqual(draws[0], [open, 0, 0]);
  assert.equal(curves.length, 2);
  assert.deepEqual(draws[1], [closed, 72, 94, 88, 282, 28, 94, 88, 282]);
  assert.deepEqual(draws[2], [closed, 160, 94, 88, 282, 204, 94, 88, 282]);
  finishCastleGate(game, true); await pending;
});
