import { CHAR_SCALE, SCREEN_W, SCREEN_H } from '../world/world.js';
import { CHARACTERS } from '../data/characters.js';

export const EDITOR_UNION_ART = {
  glyphs: 'assets/props/editor-union-glyphs.png',
  mushroom: 'assets/props/editor-union-mushroom.png',
  crowd: 'assets/props/editor-union-crowd.png',
  audience: 'assets/props/editor_union_audience.png',
};
export const EDITOR_UNION_CROWD_ROWS = [
  { top: 28, railY: 62, railH: 10 },
  { top: 67, railY: 101, railH: 10 },
  { top: 112, railY: 145, railH: 11 },
];
const actorOf = (game, id) => id === 'player' ? game.player : game.entities.find(actor => actor.id === id);
const neutralTops = new WeakMap();

function headPoint(actor) {
  const sprite = actor.sprite, image = sprite.down[0];
  if (!neutralTops.has(image)) {
    let ctx = image.getContext?.('2d');
    if (!ctx) {
      const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
      ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0);
    }
    const pixels = ctx.getImageData(0, 0, image.width, image.height).data;
    let top = 0;
    for (let i = 3; i < pixels.length; i += 4) if (pixels[i] > 16) { top = Math.floor(i / 4 / image.width); break; }
    neutralTops.set(image, top);
  }
  const pivot = CHARACTERS[actor.def.sprite]?.stillPivot?.[1] ?? sprite.fh;
  const scale = CHAR_SCALE * (actor.def.visualScale || 1) / sprite.px;
  return [actor.x + actor.w / 2, actor.y + actor.h - (pivot - neutralTops.get(image)) * scale];
}

/** Scene-local presentation state; gameplay and rewards remain script commands. */
export function beginEditorUnionStage(game) {
  game.editorUnionStage = { dim: 0.78, spotlight: 0, reveal: 0, cheerUntil: 0, glyph: null, glyphs: [], box: null, mushroom: null, dirt: null };
}

/** Called before map, title, and QA reconstruction so a waiter never owns stale actors. */
export function clearEditorUnionStage(game, abort = false) {
  game.editorUnionLightMask = null;
  if (!game.editorUnionStage) return;
  game.editorUnionStage = null;
  if (abort) {
    game.dialogue.script = null; game.dialogue.wait = null; game.dialogue.onEnd = null;
    game.textbox.close(); game.background = [];
    game.zoom = { s: 1, fx: 0, fy: 0, smax: 1, tween: null };
  }
}

/** Only stage-specific presentation that cannot be expressed with the existing DSL. */
export function editorUnionWaiter(game, node) {
  const stage = game.editorUnionStage;
  if (!stage) return { update: () => true };
  const duration = node.duration ?? 1;
  let elapsed = 0;
  let recoiled = false;
  const actor = node.actor ? actorOf(game, node.actor) : null;
  const from = { dim: stage.dim, spotlight: stage.spotlight, reveal: stage.reveal };
  if (node.kind === 'drop') { actor.visible = true; actor.flyY = -(node.height ?? 340); }
  if (node.kind === 'dirt') stage.dirt = { x: actor.x + actor.w / 2, y: actor.y + actor.h, t: 0 };
  if (node.kind === 'box') {
    const rect = game.textbox.layoutRect();
    const capture = document.createElement('canvas');
    capture.width = SCREEN_W; capture.height = SCREEN_H;
    const state = game.textbox.state;
    game.textbox.state = 'waiting';
    game.textbox.draw(capture.getContext('2d'));
    game.textbox.state = state;
    stage.box = { image: capture, rect, t: 0 };
    game.textbox.close();
  }
  if (node.kind === 'glyph') {
    stage.glyph = { index: node.index, actor, t: 0 };
    const image = game.propImages[EDITOR_UNION_ART.glyphs];
    if (node.index === 2 && image) {
      const tiny = document.createElement('canvas'); tiny.width = 10; tiny.height = 10;
      const ctx = tiny.getContext('2d'); ctx.imageSmoothingEnabled = false;
      ctx.drawImage(image, image.width / 2, 0, image.width / 4, image.height, 0, 0, 10, 10);
      stage.glyph.mosaic = tiny;
    }
    stage.glyphs.push(stage.glyph);
    const [headX, headY] = headPoint(actor), halfView = SCREEN_W / 2.05 / 2;
    const focusX = Math.max(halfView, Math.min(game.map.pxW - halfView, headX));
    stage.glyph.focus = [focusX, headY + 6];
    game.zoomTo(2.15, stage.glyph.focus, 0.14);
    game.shake = { time: 0.18, amp: 4 };
    game.sound.sfx('editor_union_bam', { volume: 0.7 });
  }
  if (node.kind === 'mushroom') {
    const target = actorOf(game, node.to || 'player');
    stage.mushroom = { x0: actor.x + actor.w / 2, y0: actor.y - 18, x1: target.x + target.w / 2, y1: target.y - 32, t: 0 };
  }
  return { update(dt) {
    if (game.editorUnionStage !== stage) return true;
    elapsed += dt;
    const p = Math.min(1, elapsed / duration), eased = p * p * (3 - 2 * p);
    if (node.kind === 'light') {
      for (const key of ['dim', 'spotlight', 'reveal']) if (node[key] !== undefined) stage[key] = from[key] + (node[key] - from[key]) * eased;
    }
    if (node.kind === 'drop') actor.flyY = -Math.round((node.height ?? 340) * (1 - p * p * p));
    if (node.kind === 'dirt') stage.dirt.t = p;
    if (node.kind === 'box') stage.box.t = p;
    if (node.kind === 'glyph') {
      stage.glyph.t = p;
      if (!recoiled && p >= 0.36) {
        recoiled = true;
        game.zoomTo(2.05, stage.glyph.focus, 0.25);
      }
    }
    if (node.kind === 'mushroom') stage.mushroom.t = p;
    if (p < 1) return false;
    if (node.kind === 'drop') actor.flyY = 0;
    if (node.kind === 'dirt') stage.dirt = null;
    if (node.kind === 'box') stage.box = null;
    if (node.kind === 'glyph') stage.glyph = null;
    if (node.kind === 'mushroom') stage.mushroom = null;
    return true;
  } };
}

/** World-space props share the exact actor camera and zoom transform. */
export function drawEditorUnionWorld(ctx, game, cam) {
  const audience = game.entities.find(actor => (actor.id === 'stage_audience' || actor.id === 'stage_audience_ready') && actor.visible);
  const crowd = game.propImages[EDITOR_UNION_ART.crowd];
  if (game.mapId === 'youngcle7' && audience && crowd) {
    const cheering = (game.editorUnionStage?.cheerUntil ?? 0) > game.time;
    for (let row = 0; row < 3; row++) for (let col = 0; col < 16; col++) {
      const index = (row * 7 + col * 5) % 16;
      const beat = game.time * (cheering ? 9 : 1.7) + col * 0.85 + row * 1.2;
      const dx = Math.round(Math.sin(beat) * (cheering ? 2 : 1));
      const dy = cheering ? -Math.round(Math.abs(Math.sin(beat)) * 3) : 0;
      const x = Math.round(audience.x + 12 + col * 40 + row % 2 * 8 - cam.x + dx);
      const y = Math.round(audience.y + EDITOR_UNION_CROWD_ROWS[row].top - cam.y + dy);
      ctx.drawImage(crowd, index % 4 * crowd.width / 4, Math.floor(index / 4) * crowd.height / 4,
        crowd.width / 4, crowd.height / 4, x, y, 36, 42);
    }
    const base = game.propImages[EDITOR_UNION_ART.audience];
    if (base) for (const row of EDITOR_UNION_CROWD_ROWS) {
      ctx.drawImage(base, 0, row.railY, 672, row.railH,
        Math.round(audience.x - cam.x), Math.round(audience.y + row.railY - cam.y), 672, row.railH);
    }
  }
  const stage = game.editorUnionStage;
  if (!stage) return;
  if (stage.dirt) {
    const { x, y, t } = stage.dirt;
    ctx.fillStyle = '#101014';
    ctx.beginPath(); ctx.ellipse(x - cam.x, y - cam.y, 27, 7, 0, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 16; i++) {
      const a = i * 2.399;
      const dx = Math.cos(a) * (10 + t * 55), dy = -Math.sin(Math.PI * t) * (20 + i % 4 * 8) + t * 14;
      ctx.fillStyle = i % 2 ? '#796956' : '#b19970';
      ctx.fillRect(Math.round(x + dx - cam.x), Math.round(y + dy - cam.y), 4 + i % 3, 4);
    }
  }
  if (stage.mushroom) {
    const m = stage.mushroom, p = m.t;
    const image = game.propImages[EDITOR_UNION_ART.mushroom];
    const x = m.x0 + (m.x1 - m.x0) * p, y = m.y0 + (m.y1 - m.y0) * p - Math.sin(Math.PI * p) * 58;
    if (image) ctx.drawImage(image, Math.round(x - cam.x - 14), Math.round(y - cam.y - 14), 28, 28);
  }
}

/** Lighting replaces this map's base dim layer, leaving dialogue and HUD untouched. */
export function drawEditorUnionLight(ctx, game, cam) {
  if (game.mapId !== 'youngcle7') return false;
  const stage = game.editorUnionStage;
  const dim = stage?.dim ?? (game.has('editor_union_stage_done') ? 0.68 : 0.78);
  const strength = stage?.spotlight ?? (game.has('editor_union_stage_done') ? 1 : 0);
  const reveal = stage?.reveal ?? (game.has('editor_union_stage_done') ? 1 : 0);
  const anchor = actorOf(game, 'stage_center');
  const audience = actorOf(game, 'stage_audience') || actorOf(game, 'stage_audience_ready');
  const key = [dim.toFixed(3), strength.toFixed(3), reveal.toFixed(3)].join(':');
  let mask = game.editorUnionLightMask;
  if (!mask) {
    const canvas = document.createElement('canvas'); canvas.width = game.map.pxW; canvas.height = game.map.pxH;
    mask = game.editorUnionLightMask = { canvas, key: null };
  }
  if (mask.key !== key) {
    const shade = mask.canvas.getContext('2d');
    shade.clearRect(0, 0, mask.canvas.width, mask.canvas.height);
    shade.globalCompositeOperation = 'source-over';
    shade.fillStyle = `rgba(0,0,0,${dim})`;
    shade.fillRect(0, 0, mask.canvas.width, mask.canvas.height);
    shade.globalCompositeOperation = 'destination-out';
    if (strength && anchor) {
      const x = anchor.x, y = anchor.y + 32;
      const wash = shade.createLinearGradient(x - 304, 0, x + 304, 0);
      wash.addColorStop(0, 'rgba(255,255,255,0)');
      wash.addColorStop(0.12, `rgba(255,255,255,${strength * 0.72})`);
      wash.addColorStop(0.24, `rgba(255,255,255,${strength * 0.94})`);
      wash.addColorStop(0.76, `rgba(255,255,255,${strength * 0.94})`);
      wash.addColorStop(0.88, `rgba(255,255,255,${strength * 0.72})`);
      wash.addColorStop(1, 'rgba(255,255,255,0)');
      shade.fillStyle = wash;
      shade.fillRect(x - 304, y - 208, 608, 240);
    }
    if (reveal && audience) {
      shade.fillStyle = `rgba(255,255,255,${reveal * 0.82})`;
      shade.fillRect(audience.x - 16, audience.y - 8, 704, 192);
    }
    shade.globalCompositeOperation = 'source-over';
    mask.key = key;
  }
  ctx.drawImage(mask.canvas, -cam.x, -cam.y);
  return true;
}

/** Labels share each actor's world position and neutral opaque head bounds, not screen coordinates. */
export function drawEditorUnionLabels(ctx, game, cam) {
  const stage = game.editorUnionStage, image = game.propImages[EDITOR_UNION_ART.glyphs];
  if (!stage || !image) return;
  for (const glyph of stage.glyphs) {
    if (!glyph.actor.visible) continue;
    const [cx, top] = headPoint(glyph.actor);
    const size = Math.round(44 + 14 * Math.max(0, 1 - glyph.t * 5));
    const x = Math.round(cx - cam.x - size / 2), y = Math.round(top - cam.y - 12 - size);
    if (glyph.mosaic) ctx.drawImage(glyph.mosaic, x, y, size, size);
    else ctx.drawImage(image, glyph.index * image.width / 4, 0, image.width / 4, image.height, x, y, size, size);
  }
}

/** The captured dialogue box flies in screen space, independent of world camera and zoom. */
export function drawEditorUnionOverlay(ctx, game) {
  const stage = game.editorUnionStage;
  if (!stage) return;
  if (stage.box) {
    const { image, rect, t } = stage.box;
    ctx.save();
    ctx.translate(rect.x + rect.w / 2 + t * 650, rect.y + rect.h / 2 - Math.sin(t * Math.PI / 2) * 420);
    ctx.rotate(t * Math.PI * 2.7);
    ctx.drawImage(image, rect.x, rect.y, rect.w, rect.h, -rect.w / 2, -rect.h / 2, rect.w, rect.h);
    ctx.restore();
  }
}
