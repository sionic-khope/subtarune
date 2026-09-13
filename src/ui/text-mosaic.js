const glyphs = new Map();
const CACHE_LIMIT = 128;

/** 원문 토큰 중 지정 부분 문자열에만 표시용 블록 크기를 붙인다. */
export function markTextMosaic(tokens, mosaic) {
  if (!mosaic?.text || !(mosaic.block > 1)) return;
  const text = tokens.map(t => t.ch).join('');
  const ranges = [];
  for (let at = text.indexOf(mosaic.text); at !== -1; at = text.indexOf(mosaic.text, at + mosaic.text.length)) {
    ranges.push([at, at + mosaic.text.length]);
  }
  let at = 0;
  for (const token of tokens) {
    if (token.ch && ranges.some(([start, end]) => at >= start && at < end)) {
      token.mosaic = mosaic.block;
      if (mosaic.detail) token.mosaicDetail = mosaic.detail;
    }
    at += token.ch.length;
  }
}

/** left/top 기준 글자를 원래 위치에 표시한다. block이 없으면 기존 fillText 그대로다. */
export function drawMosaicText(ctx, text, x, y, block, detail = 0) {
  if (!(block > 1) || !text) { ctx.fillText(text, x, y); return; }
  const key = JSON.stringify([ctx.font, ctx.fillStyle, text, block]);
  let glyph = glyphs.get(key);
  if (!glyph) {
    const source = document.createElement('canvas');
    const size = parseFloat(ctx.font);
    source.width = Math.ceil(ctx.measureText(text).width / block) * block;
    source.height = Math.ceil((size + block * 2) / block) * block;
    const ink = source.getContext('2d');
    ink.font = ctx.font; ink.fillStyle = ctx.fillStyle; ink.textBaseline = 'top';
    ink.fillText(text, 0, block);
    glyph = document.createElement('canvas');
    glyph.width = source.width / block; glyph.height = source.height / block;
    const small = glyph.getContext('2d');
    small.imageSmoothingEnabled = true;
    small.drawImage(source, 0, 0, glyph.width, glyph.height);
    if (!document.fonts || document.fonts.check(ctx.font, text)) {
      if (glyphs.size >= CACHE_LIMIT) glyphs.delete(glyphs.keys().next().value);
      glyphs.set(key, glyph);
    }
  }
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(glyph, Math.round(x), Math.round(y - block), glyph.width * block, glyph.height * block);
  if (detail > 0) {
    ctx.globalAlpha *= detail;
    ctx.fillText(text, x, y);
  }
  ctx.restore();
}
