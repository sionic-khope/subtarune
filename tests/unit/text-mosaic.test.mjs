import test from 'node:test';
import assert from 'node:assert/strict';
import { TextBox, parseText, layout } from '../../src/ui/dialogue.js';
import { drawMosaicText, markTextMosaic } from '../../src/ui/text-mosaic.js';
import { Battle } from '../../src/battle/battle.js';
import { ENEMIES } from '../../src/data/enemies.js';
import { storage_viewer } from '../../src/data/cutscenes/storage_viewer.js';

const measure = { measureText: text => ({ width: Array.from(text).length * 16 }) };

test('test_text_mosaic_intro_masks_only_names_and_preserves_layout', () => {
  const node = storage_viewer.find(node => node.mosaic);
  assert.equal(storage_viewer.filter(node => node.mosaic).length, 1);
  assert.equal(node.text, '* ' + 'ㅋ'.repeat(10) + '페이커'.repeat(14));
  const box = new TextBox({ blip() {} }, {});
  box.show(node, measure);
  const plainPages = layout(measure, parseText(node.text), box.textWidth());
  assert.deepEqual(box.pages.map(page => page.map(line => line.map(({ mosaic, mosaicDetail, ...token }) => token))), plainPages);
  assert.equal(box.tokens.filter(token => token.mosaic === 2).length, 42);
  assert.equal(box.tokens.filter(token => token.mosaicDetail === 0.45).length, 42);
  assert.ok(box.tokens.filter(token => !'페이커'.includes(token.ch)).every(token => token.mosaic === undefined));
  box.update(0.1, { just: () => false });
  assert.ok(box.revealed > 0 && box.revealed < box.tokens.length);
  box.show({ text: '페이커 ㅋㅋ' }, measure);
  assert.ok(box.tokens.every(token => token.mosaic === undefined && token.mosaicDetail === undefined));
});

test('test_text_mosaic_unicode_and_tags_preserve_original_tokens', () => {
  const tokens = parseText('😀ㅋ{c=red}페{w=0.3}이커{/c}ㅋ');
  const original = structuredClone(tokens);
  markTextMosaic(tokens, { text: '페이커', block: 2 });
  assert.deepEqual(tokens.map(({ mosaic, ...token }) => token), original);
  assert.equal(tokens.filter(token => token.mosaic).map(token => token.ch).join(''), '페이커');
  assert.equal(tokens.find(token => token.wait).mosaic, undefined);
});

test('test_text_mosaic_enemy_exact_line_resets_on_next_taunt', () => {
  const def = ENEMIES.expelled_viewer;
  assert.deepEqual(def.lines.speakMosaic, { '노': 4 });
  let selected = def.lines.speak.indexOf('노');
  const battle = {
    living: () => [{ def }], rnd: () => (selected + 0.1) / def.lines.speak.length,
    modes: { enemy: 'bullets' }, board: { setTarget() {} }, soul: { center() {} },
    boardSize: () => def.board, setText() {},
  };
  Battle.prototype.beginEnemyTurn.call(battle);
  assert.equal(battle.bubble.text, '노');
  assert.equal(battle.bubble.mosaic, 4);
  assert.equal(battle.bubble.shown, 0);
  selected = 0;
  Battle.prototype.beginEnemyTurn.call(battle);
  assert.equal(battle.bubble.text, def.lines.speak[0]);
  assert.equal(battle.bubble.mosaic, undefined);
});

test('test_text_mosaic_cached_render_restores_smoothing_and_detail_opacity', t => {
  const created = [], draws = [], plain = [], alphas = [];
  const document = { fonts: { check: () => true }, createElement() {
    const canvas = { width: 0, height: 0, getContext: () => ({ fillText() {}, drawImage() {} }) };
    created.push(canvas);
    return canvas;
  } };
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'document');
  globalThis.document = document;
  t.after(() => {
    if (previous) Object.defineProperty(globalThis, 'document', previous);
    else delete globalThis.document;
  });
  const ctx = {
    font: '12px monospace', fillStyle: '#000', imageSmoothingEnabled: true, globalAlpha: 0.8,
    measureText: () => ({ width: 12 }),
    fillText(...args) { plain.push(args); alphas.push(this.globalAlpha); },
    save() { this.saved = [this.imageSmoothingEnabled, this.globalAlpha]; },
    restore() { [this.imageSmoothingEnabled, this.globalAlpha] = this.saved; },
    drawImage(...args) { draws.push({ args, smoothing: this.imageSmoothingEnabled }); },
  };
  drawMosaicText(ctx, '노', 20, 30, 4);
  drawMosaicText(ctx, '노', 20, 30, 4);
  drawMosaicText(ctx, 'ㅋ', 32, 30);
  assert.equal(created.length, 2);
  assert.deepEqual([created[1].width, created[1].height], [3, 5]);
  assert.ok(draws.every(draw => draw.smoothing === false));
  assert.equal(draws[0].args[0], draws[1].args[0]);
  assert.equal(ctx.imageSmoothingEnabled, true);
  assert.deepEqual(plain, [['ㅋ', 32, 30]]);
  drawMosaicText(ctx, '페', 48, 30, 2, 0.45);
  assert.deepEqual(plain[1], ['페', 48, 30]);
  assert.equal(alphas[1], 0.8 * 0.45);
  assert.equal(ctx.globalAlpha, 0.8);
  assert.equal(ctx.imageSmoothingEnabled, true);
});
