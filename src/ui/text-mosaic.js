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

/**
 * “편집노조”의 ‘노’는 어느 대사에서든 모자이크(BUILD450 사용자 “편집노조 언급되는 모든 대사 … 다 쳐지게, 편집노조에서만”).
 * 글자가 하나씩 찍히는 중이면 ‘편집노’ 까지만 보여도 가린다. 다른 단어의 ‘노’(노랑 등)는 그대로.
 */
export const UNION_MOSAIC = Object.freeze({ before: '편집', ch: '노', after: '조', block: 2 });
const isUnionNo = (text, i) => text[i] === UNION_MOSAIC.ch && text.slice(i - 2, i) === UNION_MOSAIC.before && (i === text.length - 1 || text[i + 1] === UNION_MOSAIC.after);

/** 토큰 열에서 “편집노조”의 ‘노’ 토큰에 모자이크 블록을 붙인다(이미 지정된 모자이크는 그대로) */
export function markUnionMosaic(tokens) {
  const text = tokens.map(t => t.ch).join('');
  let at = 0;
  for (const token of tokens) {
    if (token.ch && !token.mosaic && token.ch.length === 1 && text.slice(at, at + 1) === UNION_MOSAIC.ch && text.slice(at - 2, at) === UNION_MOSAIC.before && text.slice(at + 1, at + 2) === UNION_MOSAIC.after) token.mosaic = UNION_MOSAIC.block;
    at += token.ch.length;
  }
}

/** 한 줄을 그리되 “편집노조”의 ‘노’만 모자이크(left/top 기준). 없으면 fillText 그대로 */
export function fillTextUnionMosaic(ctx, line, x, y) {
  if (!line || !line.includes(UNION_MOSAIC.before + UNION_MOSAIC.ch)) { ctx.fillText(line, x, y); return; }
  let from = 0, cx = x;
  for (let i = 0; i < line.length; i++) {
    if (!isUnionNo(line, i)) continue;
    const head = line.slice(from, i);
    ctx.fillText(head, cx, y); cx += ctx.measureText(head).width;
    drawMosaicText(ctx, UNION_MOSAIC.ch, cx, y, UNION_MOSAIC.block); cx += ctx.measureText(UNION_MOSAIC.ch).width;
    from = i + 1;
  }
  ctx.fillText(line.slice(from), cx, y);
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
