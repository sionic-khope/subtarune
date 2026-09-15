import test from 'node:test';
import assert from 'node:assert/strict';
import { editor_union_stage, editor_union_stage_wait } from '../../src/data/cutscenes/editor_union_stage.js';
import { beginEditorUnionStage, clearEditorUnionStage, editorUnionWaiter, drawEditorUnionLight, drawEditorUnionWorld } from '../../src/scenes/editor-union-effects.js';
import { CHARACTERS } from '../../src/data/characters.js';

const flatten = nodes => nodes.flatMap(node => [node, ...flatten(node.parallel || []), ...flatten(Array.isArray(node.async) ? node.async : [])]);
const fixture = () => ({ entities: [{ id: 'park', x: 740, y: 416, w: 24, h: 16, visible: false,
  def: { sprite: 'park_guardian_costume', visualScale: 2.66 },
  sprite: { fh: 64, px: 2, down: [{ width: 64, height: 64, getContext: () => ({ getImageData: () => ({ data: new Uint8ClampedArray(64 * 64 * 4).fill(255) }) }) }] } }],
  player: { x: 400, y: 504, w: 24, h: 16 },
  sound: { sfx() {} }, propImages: {}, zoomTo() {}, dialogue: {}, textbox: { close() {} }, background: [] });

test('test_ttuulla_keeps_the_registered_mouse_sheet_after_burrow_ends', () => {
  assert.equal(CHARACTERS.ttuulla?.sheet, 'assets/sprites/ttuulla.png');
  assert.equal(CHARACTERS.ttuulla?.voice, 'ttuulla');
  assert.deepEqual(CHARACTERS.ttuulla?.stillPivot, [32, 60]);
});

test('test_glyph_closeup_keeps_the_right_map_edge_outside_the_view', () => {
  const game = fixture(); beginEditorUnionStage(game);
  game.map = { pxW: 1024, pxH: 640 };
  game.entities[0].x = 884;
  let focus;
  game.zoomTo = (zoom, point) => { focus = point; };
  editorUnionWaiter(game, { kind: 'glyph', actor: 'park', index: 3, duration: 0.7 });
  assert.ok(focus[0] + 480 / 2.05 / 2 <= 1024);
});

test('test_all_four_head_labels_survive_their_closeup_cues_until_thanks', () => {
  const game = fixture(); beginEditorUnionStage(game);
  game.map = { pxW: 1216, pxH: 640 };
  const zooms = [];
  game.zoomTo = zoom => zooms.push(zoom);
  for (let index = 0; index < 4; index++) {
    const cue = editorUnionWaiter(game, { kind: 'glyph', actor: 'park', index, duration: 0.7 });
    cue.update(0.3); cue.update(0.4);
  }
  assert.equal(game.editorUnionStage.glyph, null);
  assert.deepEqual(game.editorUnionStage.glyphs.map(glyph => glyph.index), [0, 1, 2, 3]);
  assert.ok(game.editorUnionStage.glyphs.every(glyph => glyph.actor === game.entities[0] && glyph.t === 1));
  assert.deepEqual(zooms, [2.15, 2.05, 2.15, 2.05, 2.15, 2.05, 2.15, 2.05]);
  const thanks = editor_union_stage.findIndex(node => node.text === '* 감사합니다 감사합니다 감사합니다.');
  const bubble = editor_union_stage.findIndex(node => Array.isArray(node.bubble));
  assert.ok(bubble > thanks);
  assert.deepEqual(editor_union_stage[bubble].bubble, ['player', 'gyeongsub', 'ppaman']);
});

test('test_no_label_mosaic_uses_a_ten_pixel_buffer_without_clear_overlay', () => {
  const game = fixture(); beginEditorUnionStage(game);
  game.map = { pxW: 1216, pxH: 640 };
  game.propImages['assets/props/editor-union-glyphs.png'] = { width: 256, height: 64 };
  const original = globalThis.document;
  globalThis.document = { createElement: () => ({ getContext: () => ({ drawImage() {} }) }) };
  try {
    editorUnionWaiter(game, { kind: 'glyph', actor: 'park', index: 2, duration: 0.7 });
    assert.equal(game.editorUnionStage.glyph.mosaic.width, 10);
    assert.equal(game.editorUnionStage.glyph.mosaic.height, 10);
  } finally { globalThis.document = original; }
});

test('test_stage_party_feet_clear_the_speaker_nameplate', () => {
  const moves = flatten(editor_union_stage).filter(node => node.rel === 'stage_center' && ['player', 'gyeongsub', 'ppaman'].includes(node.move));
  assert.ok(moves.every(node => node.by[1] <= 72));
});

test('test_stage_camera_reveal_never_spawns_or_shows_the_existing_audience', () => {
  assert.ok(!flatten(editor_union_stage).some(node => node.show === 'stage_audience' || node.spawn?.id === 'stage_audience'));
});

test('test_stage_thanks_restarts_the_designated_music_after_the_editor_entrance_silence', () => {
  const thanks = editor_union_stage.findIndex(node => node.text === '* 감사합니다 감사합니다 감사합니다.');
  assert.equal(editor_union_stage[thanks - 1].bgm, 'editor_union_stage');
  assert.ok(editor_union_stage.slice(0, thanks).some(node => node.bgm === null));
});

test('test_crowd_reveal_fits_the_entire_stands_and_party_above_dialogue', () => {
  const reveal = editor_union_stage.find(node => node.parallel?.some(part => part.editorUnion?.reveal === 1)).parallel;
  const camera = reveal.find(node => node.camera).camera;
  const zoom = reveal.find(node => node.zoom).zoom;
  const cameraY = camera[1] * 32 + 16 - 180;
  const screenY = worldY => (worldY - cameraY) * zoom + 180 * (1 - zoom);
  const entryMoves = editor_union_stage.find(node => node.parallel?.some(part => part.move === 'player')).parallel;
  const feet = entryMoves.map(node => 432 + 1 + node.by[1]);
  assert.ok(screenY(80) >= 0, 'whole stand frame begins inside the view');
  assert.ok(screenY(288) <= 222, 'whole stand frame ends above the speaker plaque');
  assert.ok(feet.every(y => screenY(y) <= 222), 'all three full bodies must clear the dialogue plaque');
});

test('test_front_facing_boss_introduction_keeps_trio_feet_above_dialogue', () => {
  const introduction = editor_union_stage.findIndex(node => node.text === '* 바로 여기 저희의 적 악덕 사장님들까지!!');
  const cameraIndex = editor_union_stage.findIndex((node, index) => index > introduction && node.parallel?.some(part => part.zoom > 1));
  const zoom = editor_union_stage[cameraIndex].parallel.find(node => node.zoom);
  const faces = editor_union_stage.slice(introduction, cameraIndex).filter(node => node.face);
  assert.deepEqual(faces.map(node => [node.face, node.dir]), [['player', 'down'], ['gyeongsub', 'down'], ['ppaman', 'down']]);
  assert.equal(zoom.at, 'player');
  const entryMoves = editor_union_stage.find(node => node.parallel?.some(part => part.move === 'player')).parallel;
  const feet = entryMoves.map(node => 432 + 1 + node.by[1]);
  const playerFeet = 432 + 1 + entryMoves.find(node => node.move === 'player').by[1];
  const focusY = playerFeet - 16 / 2 + zoom.offset[1];
  assert.ok(feet.every(y => 180 + (y - focusY) * zoom.zoom <= 222), 'front-facing full bodies must clear the dialogue plaque after the closeup settles');
});

test('test_stage_long_taunt_has_phrase_breaks_without_changing_words', () => {
  const text = editor_union_stage.find(node => node.text?.startsWith('* 너디진따진짜')).text;
  assert.ok(text.includes('{n}'));
  assert.equal(text.replaceAll('{n}', ''), '* 너디진따진짜ㅋㅋ형섭아나도사랑해줘짜ㅋㅋ형섭아나도사랑해줘짜ㅋㅋ형섭아나도사랑해줘짜ㅋㅋ형섭아나도사랑해줘');
});

test('test_stage_preserves_user_dialogue_and_enters_requested_battle', () => {
  const nodes = flatten(editor_union_stage);
  const text = nodes.filter(node => node.text).map(node => node.text);
  assert.equal(text[0], '* ㅁ..뭐지 여긴?');
  // 2026-09-15: 전투 뒤 승리 후 연출이 이어지므로 마지막 대사는 억빠맨의 ‘일단 가보시죠’, 전투 진입 대사는 그 앞에 있다
  assert.equal(text.at(-1), '* 뭐가 꿍꿍이가 있는것같지만 일단 가보시죠');
  assert.ok(text.includes('* 첫번째 시련!! 파크가디언을 이겨라!!! 들어와 ㅅㅂ새끼들아.'));
  assert.ok(text.indexOf('* 헉.. 헉.. 이.. 이럴수가 말.. 말도안돼...') > text.indexOf('* 첫번째 시련!! 파크가디언을 이겨라!!! 들어와 ㅅㅂ새끼들아.'));
  for (const expected of ['* 반갑습니다 형님들~~~~~~~~', '* 인 면 견 ~{w=0.7}{n}...{w=0.55} ...{w=0.55} ...', '* 편집노조다!', '* ㅋㅋ뒤졌다', '* 이따봐요 악덕사장']) assert.ok(text.includes(expected));
  // 2026-09-15: 점 세 개는 별도 상자가 아니라 '인 면 견 ~' 상자 안에 이어 뜨고, 바로 다음 노드가 그 상자를 날린다
  const nameIndex = nodes.findIndex(node => node.text?.startsWith('* 인 면 견 ~'));
  assert.equal(nodes[nameIndex + 1].parallel?.some(child => child.editorUnion?.kind === 'box'), true);
  assert.deepEqual(nodes.find(node => node.battle).battle, { enemies: ['park_guardian'], bgm: 'park_guardian', bg: 'editor_union_stage', flag: 'park_guardian_won' });
  assert.equal(editor_union_stage_wait.find(node => node.text).text, '* 첫번째 시련!! 파크가디언을 이겨라!!! 들어와 ㅅㅂ새끼들아.');
  const glyphs = nodes.filter(node => node.editorUnion?.kind === 'glyph').map(node => node.editorUnion);
  assert.deepEqual(glyphs.map(node => [node.index, node.duration]), [[0, 0.7], [1, 0.7], [2, 0.7], [3, 0.7]]);
  assert.ok(editor_union_stage.findIndex(node => node.set?.editor_union_stage_done) > editor_union_stage.findIndex(node => node.text === '* 첫번째 시련!! 파크가디언을 이겨라!!! 들어와 ㅅㅂ새끼들아.'));
});

test('test_stage_drop_moves_the_visible_sprite_from_above_to_exact_ground', () => {
  const game = fixture(); beginEditorUnionStage(game);
  const actor = game.entities[0];
  const waiter = editorUnionWaiter(game, { kind: 'drop', actor: 'park', height: 420, duration: 1 });
  assert.equal(actor.visible, true);
  assert.equal(actor.flyY, -420);
  assert.equal(waiter.update(0.5), false);
  assert.ok(actor.flyY > -420 && actor.flyY < 0);
  assert.equal(waiter.update(0.5), true);
  assert.deepEqual([actor.x, actor.y, actor.flyY], [740, 416, 0]);
});

test('test_stage_dialogue_blast_captures_the_existing_closed_but_retained_box', () => {
  const game = fixture(); beginEditorUnionStage(game);
  let capturedState = null;
  const original = globalThis.document;
  globalThis.document = { createElement: () => ({ getContext: () => ({}) }) };
  game.textbox = { state: 'closed', layoutRect: () => ({ x: 12, y: 248, w: 456, h: 104 }),
    draw() { capturedState = this.state; }, close() { this.state = 'closed'; } };
  try {
    const waiter = editorUnionWaiter(game, { kind: 'box', duration: 0.78 });
    assert.equal(capturedState, 'waiting');
    assert.ok(game.editorUnionStage.box.image);
    assert.equal(game.textbox.state, 'closed');
    assert.equal(waiter.update(0.39), false);
    assert.equal(game.editorUnionStage.box.t, 0.5);
    assert.equal(waiter.update(0.39), true);
    assert.equal(game.editorUnionStage.box, null);
  } finally { globalThis.document = original; }
});

test('test_stage_abort_clears_active_waiter_and_does_not_mutate_old_actor_again', () => {
  const game = fixture(); beginEditorUnionStage(game);
  const waiter = editorUnionWaiter(game, { kind: 'drop', actor: 'park', height: 420, duration: 1 });
  waiter.update(0.3);
  const offset = game.entities[0].flyY;
  clearEditorUnionStage(game, true);
  assert.equal(game.editorUnionStage, null);
  assert.equal(game.dialogue.script, null);
  assert.equal(game.dialogue.wait, null);
  assert.equal(game.zoom.s, 1);
  assert.equal(waiter.update(0.7), true);
  assert.equal(game.entities[0].flyY, offset);
});

test('test_stage_completed_entry_keeps_dark_periphery_and_other_maps_keep_their_lighting', () => {
  const game = fixture(); game.mapId = 'youngcle7'; game.has = () => true;
  game.map = { pxW: 1216, pxH: 640 };
  const original = globalThis.document;
  const shade = { clearRect() {}, fillRect() {} };
  globalThis.document = { createElement: () => ({ getContext: () => shade }) };
  try {
    const ctx = { drawImage() {} };
    assert.equal(drawEditorUnionLight(ctx, game, { x: 0, y: 0 }), true);
    assert.equal(shade.fillStyle, 'rgba(0,0,0,0.68)');
    assert.equal(game.editorUnionLightMask.key, '0.680:1.000:1.000');
    game.mapId = 'youngcle6';
    assert.equal(drawEditorUnionLight(ctx, game, { x: 0, y: 0 }), false);
  } finally { globalThis.document = original; }
});

test('test_stage_light_feathers_both_axes_and_adds_warm_yellow_after_clearing_shade', () => {
  const cue = editor_union_stage.find(node => node.editorUnion?.kind === 'light');
  assert.equal(cue.editorUnion.spotlight, 1);
  assert.ok(cue.editorUnion.duration >= 0.8);

  const game = fixture();
  game.mapId = 'youngcle7'; game.has = () => true;
  game.map = { pxW: 1216, pxH: 640 };
  game.entities.push(
    { id: 'stage_center', x: 400, y: 432 },
    { id: 'stage_audience', x: 224, y: 96 },
  );
  const draws = [], gradients = [];
  const shade = {
    clearRect() {}, fillRect() {},
    drawImage(...args) { draws.push({ args, mode: this.globalCompositeOperation, alpha: this.globalAlpha }); },
    createLinearGradient(...args) {
      const gradient = { args, stops: [], addColorStop(...stop) { this.stops.push(stop); } };
      gradients.push(gradient);
      return gradient;
    },
  };
  const original = globalThis.document;
  globalThis.document = { createElement: () => {
    const context = { ...shade };
    return { getContext: () => context };
  } };
  try {
    drawEditorUnionLight({ drawImage() {} }, game, { x: 0, y: 0 });
    assert.deepEqual(gradients.map(gradient => gradient.args), [[0, 0, 720, 0], [0, 0, 0, 400], [0, 0, 896, 0], [0, 0, 0, 352]]);
    for (const gradient of gradients) {
      assert.deepEqual(gradient.stops[0], [0, 'rgba(255,220,112,0)']);
      assert.deepEqual(gradient.stops.at(-1), [1, 'rgba(255,220,112,0)']);
      assert.ok(gradient.stops.some(([, color]) => color === 'rgba(255,220,112,1)'));
    }
    assert.deepEqual(draws.map(draw => draw.mode), ['destination-out', 'destination-out', 'source-over']);
    assert.equal(draws.at(-1).alpha, 0.38);
    assert.equal(game.editorUnionLightMask.canvas.getContext('2d').globalAlpha, 1);
    drawEditorUnionLight({ drawImage() {} }, game, { x: 20, y: 10 });
    assert.equal(gradients.length, 4, 'camera movement reuses world-space feathered washes');
  } finally { globalThis.document = original; }
});

test('test_crowd_cheers_move_only_the_48_atlas_busts_and_keep_their_source_frames', () => {
  const game = fixture(); beginEditorUnionStage(game);
  game.mapId = 'youngcle7'; game.time = 0;
  game.entities.push({ id: 'stage_audience', x: 224, y: 96, visible: true });
  game.propImages['assets/props/editor-union-crowd.png'] = { width: 256, height: 256 };
  game.propImages['assets/props/editor_union_audience.png'] = { width: 672, height: 176 };
  const initial = [], cheering = [];
  drawEditorUnionWorld({ drawImage: (...args) => initial.push(args) }, game, { x: 0, y: 0 });
  game.time = 0.2; game.editorUnionStage.cheerUntil = 3;
  drawEditorUnionWorld({ drawImage: (...args) => cheering.push(args) }, game, { x: 0, y: 0 });
  assert.equal(initial.length, 51);
  assert.equal(cheering.length, 51);
  assert.deepEqual(initial.map(args => args.slice(0, 5)), cheering.map(args => args.slice(0, 5)));
  assert.ok(cheering.some((args, index) => args[5] !== initial[index][5] || args[6] !== initial[index][6]));
  assert.deepEqual(initial.slice(48), cheering.slice(48));
  assert.deepEqual(initial.slice(48).map(args => args.slice(2, 5)), [[62, 672, 10], [101, 672, 10], [145, 672, 11]]);
  assert.deepEqual([initial[0][6], initial[16][6], initial[32][6]], [124, 163, 208]);
});

test('test_park_aftermath_enter_script_is_noop_unless_only_the_win_is_saved_and_shows_the_grate', async () => {
  const { park_guardian_aftermath_enter, park_guardian_aftermath } = await import('../../src/data/cutscenes/editor_union_stage.js');
  const guard = park_guardian_aftermath_enter[0];
  assert.equal(guard.goto, 'aftermath_end');
  assert.equal(guard.if({ park_guardian_won: false }), true, '승리 전엔 아무것도 안 함');
  assert.equal(guard.if({ park_guardian_won: true, park_guardian_aftermath_done: true }), true, '연출 뒤엔 아무것도 안 함');
  assert.equal(guard.if({ park_guardian_won: true }), false, '승리만 저장됐으면 연출');
  assert.ok(park_guardian_aftermath_enter.some(node => node.label === 'aftermath_end'));
  // 박치기 직후 바로 날아가고(같은 parallel 에 흔들림), 소리는 whoosh 가 아니다
  const dashIndex = park_guardian_aftermath.findIndex(node => node.move === 'ppaman' && node.dash);
  const flingNode = park_guardian_aftermath.slice(dashIndex, dashIndex + 3).find(node => node.parallel?.some(part => part.fling));
  assert.ok(flingNode, '대시 뒤 2노드 안에 fling');
  const fling = flingNode.parallel.find(part => part.fling);
  assert.equal(fling.sfx, 'wing', '날리기는 델타룬 공식 snd_wing');
  assert.ok(flingNode.parallel.some(part => part.shake));
  // 철창이 내려오는 동안 카메라가 위 통로(x928~1056)를 잡는다
  const slideIndex = park_guardian_aftermath.findIndex(node => node.slide === 'youngcle7_grate');
  const cam = park_guardian_aftermath.slice(0, slideIndex).reverse().find(node => node.parallel?.some(part => Array.isArray(part.camera)));
  const camera = cam.parallel.find(part => Array.isArray(part.camera)).camera;
  assert.ok(camera[0] * 32 >= 928 && camera[0] * 32 <= 1056, `카메라 x ${camera[0] * 32} 가 통로 위`);
  assert.ok(camera[1] * 32 <= 288, '카메라 y 가 철창 도착 높이 안');
  const backIndex = park_guardian_aftermath.findIndex((node, i) => i > slideIndex && node.parallel?.some(part => part.camera === 'player'));
  assert.ok(backIndex > slideIndex, '쾅 뒤 카메라가 일행으로 돌아온다');
});
