import test from 'node:test';
import assert from 'node:assert/strict';
import { TextBox, ScriptRunner, layout, parseText } from '../../src/ui/dialogue.js';
import { IllustratedNarration, ILLUSTRATED_NARRATION } from '../../src/ui/illustrated-narration.js';
import { CAPTAIN_MEMORIES, captainMemoryImage, preloadCaptainMemories } from '../../src/data/captain-memories.js';

const measure = { measureText: ch => ({ width: ch === ' ' ? 8 : 16 }) };
const idle = { just: () => false };
const confirm = { just: action => action === 'confirm' };
const cancel = { just: action => action === 'cancel' };
const pictures = Object.fromEntries(Object.keys(CAPTAIN_MEMORIES).map(id => [id, { id }]));
const node = (image, text = '옛날 어느 날, 이야기가 시작되었다.') => ({ style: 'illustrated', image, voice: 'narrator', text });

function makeBox() {
  const blips = [];
  const box = new TextBox({ blip: voice => blips.push(voice), sfx() {} }, {});
  box.illustration = new IllustratedNarration(id => pictures[id]);
  return { box, blips };
}

function drawingContext() {
  const images = [], text = [], fills = [];
  return {
    ...measure, images, text, fills, globalAlpha: 1, imageSmoothingEnabled: true,
    save() { this.saved = [this.globalAlpha, this.imageSmoothingEnabled]; },
    restore() { [this.globalAlpha, this.imageSmoothingEnabled] = this.saved; },
    drawImage(...args) { images.push({ args, alpha: this.globalAlpha, smoothing: this.imageSmoothingEnabled }); },
    fillRect(...args) { fills.push({ args, color: this.fillStyle }); },
    fillText(...args) { text.push(args); },
  };
}

test('test_illustrated_preload_is_atomic_deduplicated_and_retries_failure', async () => {
  assert.throws(() => captainMemoryImage('origin'), /not preloaded/);
  await assert.rejects(preloadCaptainMemories(async src => {
    if (src === CAPTAIN_MEMORIES.demon) throw new Error('network');
    return { src };
  }), /network/);
  assert.throws(() => captainMemoryImage('origin'), /not preloaded/);
  const requests = [];
  const loading = preloadCaptainMemories(async src => { requests.push(src); return { src }; });
  assert.equal(preloadCaptainMemories(), loading);
  await loading;
  assert.deepEqual(requests, Object.values(CAPTAIN_MEMORIES));
  for (const [id, src] of Object.entries(CAPTAIN_MEMORIES)) assert.equal(captainMemoryImage(id).src, src);
  assert.throws(() => captainMemoryImage('missing'), /not preloaded/);
});

test('test_illustrated_pages_keep_three_lines_and_do_not_change_standard_layout', () => {
  const { box } = makeBox();
  box.show(node('origin', '첫 번째 줄{n}두 번째 줄{n}세 번째 줄{n}네 번째 줄{n}다섯 번째 줄'), measure);
  assert.equal(box.fullscreen, true);
  assert.deepEqual(box.pages.map(page => page.length), [3, 2]);
  assert.deepEqual(layout(measure, parseText(box.node.text), 384).map(page => page.length), [4, 1]);
  box.show(node('origin', '길게이어지는한글문자열'.repeat(12)), measure);
  assert.ok(box.pages.length > 1);
  assert.ok(box.pages.every(page => page.length <= 3));
  assert.ok(box.pages.flat().every(line => line.reduce((width, token) => width + token.w, 0) <= 384));
});

test('test_illustrated_first_fade_blocks_input_typing_and_blips_until_fully_visible', () => {
  const { box, blips } = makeBox();
  box.show({ ...node('origin'), auto: 0.1, cut: 3 }, measure);
  box.update(0.35, confirm);
  assert.equal(box.revealed, 0);
  assert.equal(box.cutTimer, 0);
  const ctx = drawingContext();
  box.draw(ctx);
  assert.equal(ctx.images[0].alpha, 0.5);
  assert.deepEqual(ctx.images[0].args.slice(1), [48, 14, 384, 208]);
  assert.equal(ctx.images[0].smoothing, false);
  assert.deepEqual(ctx.fills[0], { args: [0, 0, 480, 360], color: '#000' });
  assert.equal(ctx.text.length, 0);
  assert.equal(ctx.globalAlpha, 1);
  assert.equal(ctx.imageSmoothingEnabled, true);
  box.update(0.35, cancel);
  assert.equal(box.illustration.transitioning, false);
  assert.equal(box.revealed, 0);
  assert.deepEqual(blips, []);
  box.update(0.01, idle);
  assert.equal(box.revealed, 1);
  assert.deepEqual(blips, ['narrator']);
});

test('test_illustrated_same_card_persists_through_pages_and_successive_script_nodes', () => {
  const { box } = makeBox();
  const runner = new ScriptRunner(box, { ctx: measure });
  runner.start([node('origin', '하나{n}둘{n}셋{n}넷'), node('origin', '계속되는 회상'), node('split')]);
  box.update(ILLUSTRATED_NARRATION.firstFade, idle);
  box.update(0, confirm);
  box.update(0, confirm);
  assert.equal(box.page, 1);
  assert.equal(box.illustration.transitioning, false);
  box.update(0, confirm);
  box.update(0, confirm);
  assert.equal(box.node.text, '계속되는 회상');
  assert.equal(box.illustration.image, pictures.origin);
  assert.equal(box.illustration.transitioning, false);
  box.update(0, confirm);
  const ctx = drawingContext();
  box.draw(ctx);
  assert.deepEqual(ctx.text[0], ['계', 48, 240]);
  box.update(0, confirm);
  assert.equal(box.illustration.previous, pictures.origin);
  box.update(0.275, confirm);
  const outgoing = drawingContext();
  box.draw(outgoing);
  assert.equal(outgoing.images[0].args[0], pictures.origin);
  assert.equal(outgoing.images[0].alpha, 0.5);
  box.update(0.275, confirm);
  const midpoint = drawingContext();
  box.draw(midpoint);
  assert.equal(midpoint.images[0].alpha, 0);
  assert.equal(midpoint.text.length, 0);
  box.update(0.275, confirm);
  const incoming = drawingContext();
  box.draw(incoming);
  assert.equal(incoming.images[0].args[0], pictures.split);
  assert.ok(Math.abs(incoming.images[0].alpha - 0.5) < 0.00001);
  box.update(0.275, confirm);
  assert.equal(box.revealed, 0);
  assert.equal(box.illustration.transitioning, false);
  box.update(0, confirm);
  box.update(0, confirm);
  assert.equal(runner.running, false);
  assert.equal(box.isOpen, false);
  assert.equal(box.illustration.image, null);
});

test('test_illustrated_close_and_other_styles_clear_image_and_transition', () => {
  const { box } = makeBox();
  box.show(node('origin'), measure);
  box.update(0.3, idle);
  box.close();
  assert.equal(box.fullscreen, false);
  assert.equal(box.illustration.image, null);
  assert.equal(box.illustration.transitioning, false);
  box.show(node('origin'), measure);
  assert.equal(box.illustration.elapsed, 0);
  box.show({ text: '일반 대화' }, measure);
  assert.equal(box.illustration.image, null);
  assert.equal(box.fullscreen, false);
  box.update(0, confirm);
  assert.equal(box.state, 'waiting');
  box.show({ style: 'narration', text: '기존 나레이션' }, measure);
  assert.equal(box.fullscreen, true);
  box.update(0, confirm);
  assert.equal(box.state, 'waiting');
});

test('test_illustrated_final_card_fades_to_a_black_frame_before_next_node', () => {
  const { box } = makeBox();
  const runner = new ScriptRunner(box, { ctx: measure });
  runner.start([{ ...node('hack'), imageExit: true }, { text: '선장실로 돌아왔다.' }]);
  box.update(0.7, idle);
  box.update(0, confirm);
  box.update(0, confirm);
  assert.equal(box.fullscreen, true);
  assert.equal(box.illustration.exiting, true);
  box.update(0.275, confirm);
  const halfway = drawingContext();
  box.draw(halfway);
  assert.equal(halfway.images[0].args[0], pictures.hack);
  assert.equal(halfway.images[0].alpha, 0.5);
  assert.equal(halfway.text.length, 0);
  box.update(0.275, cancel);
  assert.equal(box.fullscreen, true);
  assert.equal(box.node.image, 'hack');
  const black = drawingContext();
  box.draw(black);
  assert.equal(black.images[0].alpha, 0);
  assert.deepEqual(black.fills[0], { args: [0, 0, 480, 360], color: '#000' });
  assert.equal(black.text.length, 0);
  box.update(0.01, confirm);
  assert.equal(box.node.text, '선장실로 돌아왔다.');
  assert.equal(box.fullscreen, false);
  assert.equal(box.revealed, 0);
  assert.equal(box.illustration.image, null);
  assert.equal(box.illustration.exiting, false);
});

test('test_illustrated_final_fade_interruption_does_not_invoke_completion', () => {
  const { box } = makeBox();
  let completed = 0;
  box.show({ ...node('hack'), imageExit: true }, measure, () => completed++);
  box.update(0.7, idle);
  box.update(0, confirm);
  box.update(0, confirm);
  box.update(0.2, idle);
  box.close();
  box.update(1, confirm);
  assert.equal(completed, 0);
  assert.equal(box.isOpen, false);
  assert.equal(box.illustration.exiting, false);
  box.show(node('hack'), measure);
  assert.equal(box.illustration.duration, 0.7);
});
