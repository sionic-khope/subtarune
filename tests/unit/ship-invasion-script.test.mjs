import test from 'node:test';
import assert from 'node:assert/strict';
import { TextBox, ScriptRunner } from '../../src/ui/dialogue.js';
import { shipLoungeScripts } from '../../src/data/cutscenes/ship_lounge.js';
import { SHIP_LOUNGE_BRIEFING_NODES } from '../../src/data/cutscenes/ship_lounge_briefing.js';
import { SHIP_INVASION_NODES, INVASION_EXTRA_GUESTS, armInvasionInterruption, waitInvasionBeat, placeInvasionActors } from '../../src/data/cutscenes/ship_invasion.js';
import { CHARACTERS } from '../../src/data/characters.js';
import { prepareShipDeckPoses, setShipDeckFist, clearShipDeckPoses } from '../../src/scenes/ship-deck-poses.js';

const input = { just: () => false };
const ctx = { measureText: text => ({ width: text.length * 8 }) };
const sound = { blip() {}, sfx() {} };

test('test_invasion_ready_no_ends_without_world_music_or_progress_changes', () => {
  const flags = { ship_lounge_briefed: true }, effects = [];
  const box = new TextBox(sound, {});
  const game = { flags, ctx, setFlag: (...args) => effects.push(args), sound };
  const runner = new ScriptRunner(box, game);
  runner.start(shipLoungeScripts.ship_lounge_youngcle);
  assert.equal(box.node.text, '* 준비됨?');
  assert.equal(box.choice.delay, 0.6);
  assert.equal(box.choice.options[0].goto, 'invasion_yes');
  box._done(1);
  assert.equal(runner.running, false);
  assert.deepEqual(effects, []);
});

test('test_invasion_final_ㅎ_interrupts_at_visible_glyph_even_with_confirm_held', () => {
  const line = SHIP_INVASION_NODES.find(node => node.text?.includes('출발ㅎ'));
  const box = new TextBox(sound, {}), background = [];
  const game = { textbox: box, background, dialogue: { script: [] } };
  let completed = 0, lastVisible = '';
  armInvasionInterruption(game, line.text, 'ㅎ');
  box.show(line, ctx, () => { completed++; });
  for (let frame = 0; frame < 1000 && !completed; frame++) {
    box.update(0.01, { just: () => true });
    lastVisible = box._pageTokens().slice(0, box.revealed).map(token => token.ch).join('');
    background[0].update();
  }
  assert.equal(completed, 1);
  assert.ok(lastVisible.endsWith('ㅎ'), lastVisible);
  assert.ok(!lastVisible.endsWith('ㅎ..'));
});

test('test_invasion_interruption_ignores_unrevealed_suffix_and_cancels_with_script', () => {
  const box = new TextBox(sound, {}), background = [];
  const game = { textbox: box, background, dialogue: { script: [] } };
  const text = '* 출발ㅎ..';
  let completed = 0;
  armInvasionInterruption(game, text, 'ㅎ');
  box.show({ text, cut: 999 }, ctx, () => { completed++; });
  box.update(0.01, input);
  assert.equal(background[0].update(), false);
  assert.equal(completed, 0);
  game.dialogue.script = null;
  assert.equal(background[0].update(), true);
  assert.equal(completed, 0);
});

test('test_invasion_scene_wait_uses_completion_and_releases_on_abort', async () => {
  const background = [], scene = { done: false, disposed: false };
  const game = { background, shipInvasion: scene, dialogue: { script: [] } };
  let resolved = false;
  const waiting = waitInvasionBeat(game).then(() => { resolved = true; });
  assert.equal(background[0].update(), false);
  await Promise.resolve();
  assert.equal(resolved, false);
  scene.disposed = true;
  assert.equal(background[0].update(), true);
  await waiting;
  assert.equal(resolved, true);
});

test('test_invasion_anchor_staging_resets_transient_pose_without_changing_stats', () => {
  const player = { x: 0, y: 0, hp: 101, trail: [1], motion: {}, flyX: 70, spin: 3 };
  const game = { player, entities: [{ id: 'castle_player', x: 228, y: 440 }] };
  placeInvasionActors(game, [['player', 'castle_player', 'right', true, 'lying']]);
  assert.equal(player.x, 228); assert.equal(player.y, 440);
  assert.equal(player.pose, 'lying'); assert.equal(player.hp, 101);
  assert.equal(player.motion, null); assert.equal(player.flyX, 0);
  assert.deepEqual(player.trail, []);
});

test('test_invasion_narrative_preserves_masks_photo_and_final_endpoint', () => {
  const nodes = SHIP_INVASION_NODES;
  assert.deepEqual(nodes.find(node => node.text === '* 보지임신?').mosaic, { text: '보지', block: 2 });
  assert.deepEqual(nodes.find(node => node.text?.startsWith('* 편집노조애들')).mosaic, { text: '노', block: 2 });
  assert.equal(nodes.findLast(node => node.text)?.text, '* 가자 애들아.');
  assert.equal(nodes.findLast(node => node.stage)?.stage, 'ship_invasion_arrived');
  const photograph = nodes.findIndex(node => node.text === '* 기념샷');
  assert.equal(nodes[photograph + 2].sfx, 'photo_shutter');
  assert.equal(nodes[photograph + 3].fade, 'white');
  assert.ok(nodes.filter(node => node.bubble).every(node => node.dots === 3));
  assert.ok(nodes.filter(node => node.text).every(node => node.text.length < 120));
});

test('test_lounge_briefing_restores_lounge_bgm_only_after_completion', () => {
  const nodes = SHIP_LOUNGE_BRIEFING_NODES;
  const complete = nodes.findIndex(node => node.stage === 'ship_lounge_briefed');
  assert.equal(nodes[complete + 1].bgm, 'ship_lounge');
  assert.equal(nodes[complete + 1].fadeIn, 1.2);
  assert.equal(nodes[complete + 2].label, 'briefing_end');
});

test('test_invasion_day_title_releases_cover_in_same_step_and_recovers_cover_before_ocean_load', () => {
  const index = SHIP_INVASION_NODES.findIndex(node => node.text === '그리고, 결전의 날.');
  const box = new TextBox(sound, {});
  const game = { textbox: box, fade: { alpha: 1 }, ctx, fadeTo(alpha) { this.fade.alpha = alpha; } };
  const runner = new ScriptRunner(box, game);
  runner.start(SHIP_INVASION_NODES.slice(index - 1, index + 3));
  assert.equal(game.fade.alpha, 0);
  assert.equal(box.fullscreen, true);
  assert.equal(box.style, 'narration');
  box.update(0.01, input);
  assert.equal(box.revealed, 1);
  assert.equal(game.fade.alpha, 0);
  box._done(null);
  assert.equal(game.fade.alpha, 1);
  assert.equal(box.isOpen, false);
});

test('test_invasion_photo_prop_descends_without_empty_viewport_pan_and_retracts', () => {
  const start = SHIP_INVASION_NODES.findIndex(node => node.text === '* 아 맞다');
  const end = SHIP_INVASION_NODES.findIndex(node => node.text === '* ㅋㅋ');
  const photo = SHIP_INVASION_NODES.slice(start, end);
  const prop = photo.find(node => node.spawn)?.spawn;
  assert.equal(prop.image, 'assets/props/ship-photo-camera.png');
  assert.equal(prop.w, undefined);
  assert.equal(prop.h, undefined);
  assert.equal(photo.some(node => node.camera), false);
  assert.deepEqual(photo.filter(node => node.slide).map(node => node.by[1]), [126, 84, -210]);
  assert.equal(photo.at(-2).remove, prop.id);
});

test('test_invasion_adds_six_registered_png_guests_to_both_rallies_formation_and_jump', () => {
  assert.equal(INVASION_EXTRA_GUESTS.length, 6);
  assert.ok(INVASION_EXTRA_GUESTS.includes('expelled_viewer'));
  assert.ok(INVASION_EXTRA_GUESTS.includes('eunbyeol'));
  const flat = nodes => nodes.flatMap(node => Array.isArray(node) ? flat(node) : [node, ...flat(node.parallel || [])]);
  const nodes = flat(SHIP_INVASION_NODES);
  for (const sprite of INVASION_EXTRA_GUESTS) {
    assert.ok(CHARACTERS[sprite].sheet || CHARACTERS[sprite].still);
    const id = `invasion_guest_${sprite}`;
    assert.equal(nodes.filter(node => node.spawn?.id === id).length, 2);
    assert.equal(nodes.filter(node => node.move === id).length, 1);
    assert.equal(nodes.filter(node => node.hop === id).length, 1);
  }
});

test('test_invasion_deck_entry_walks_faster_and_day_title_never_reveals_lounge', () => {
  const nodes = SHIP_INVASION_NODES;
  const entry = nodes.find(node => node.parallel?.some(child => child.move === 'ppaman' && child.rel === 'deck_ppaman_near'));
  assert.equal(entry.parallel[0].speed, 50);
  assert.equal(entry.parallel[1][1].speed, 50);
  assert.equal(entry.parallel[0].run, undefined);
  const fistApproach = nodes.find(node => node.parallel?.some(child => child.move === 'ppaman' && child.rel === 'deck_lookout'));
  assert.ok(fistApproach.parallel.every(node => node.speed === 20));
  const done = nodes.findIndex(node => node.stage === 'ship_deck_bond_done');
  assert.deepEqual(nodes[done - 2], { fade: 'out', duration: 2.5 });
  const title = nodes.findIndex(node => node.text === '그리고, 결전의 날.');
  assert.equal(nodes.slice(done, title).some(node => node.fade === 'in'), false);
  const interruption = nodes.findIndex(node => node.text?.endsWith('출발ㅎ..'));
  assert.equal(nodes[interruption + 2].parallel[0].invasionBeat, 'room-impact');
});

const poseGame = () => ({
  mapId: 'ship_night_deck', dialogue: { script: [] }, background: [], player: {},
  entities: [{ id: 'ppaman' }, { id: 'gyeongsub' }],
  characterMotions: Object.fromEntries(['hyungsub', 'ppaman', 'gyeongsub'].map(name => [name, {
    deck_fist: { frames: [0.22, 0.3, 0.38, 1].map(duration => ({ duration })), scale: 0.5 },
  }])),
});

test('test_deck_fist_advances_then_holds_last_pose_until_its_owner_clears', async () => {
  const game = poseGame();
  await prepareShipDeckPoses(game);
  setShipDeckFist(game, 'player');
  game.background[0].update(0.4);
  assert.equal(game.player.motion.index, 1);
  game.background[0].update(6);
  assert.equal(game.player.motion.index, 3);
  assert.equal(game.player.motion.loop, false);
  clearShipDeckPoses(game);
  assert.equal(game.player.motion, null);
  assert.equal(game.background[0].update(0.1), true);
});

test('test_deck_fist_script_cancel_does_not_clear_another_scenes_motion', async () => {
  const game = poseGame();
  await prepareShipDeckPoses(game);
  setShipDeckFist(game, 'player'); setShipDeckFist(game, 'ppaman');
  const replacement = { index: 2 };
  game.player.motion = replacement;
  game.dialogue.script = [];
  assert.equal(game.background[0].update(0.1), true);
  assert.equal(game.player.motion, replacement);
  assert.equal(game.entities[0].motion, null);
  assert.equal(game.shipDeckPoses, null);
});
