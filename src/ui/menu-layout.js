import { F } from './font.js';

/** Fixed logical-pixel budget for every field-menu panel (DESIGN.md). */
export const MENU_LAYOUT = Object.freeze({
  x: 116, y: 8, width: 356, height: 344,
  inset: 8, listY: 44, listRows: 12, footerY: 286,
  memberY: 44, memberHeight: 64, memberRows: 4,
  targetY: 90, targetRows: 3,
});

/** Keep a selected row inside a bounded window, including wrap-around navigation. */
export function menuWindow(length, selected, capacity) {
  const start = Math.max(0, Math.min(selected - Math.floor(capacity / 2), length - capacity));
  return { start, end: Math.min(length, start + capacity) };
}

/** Preserve inventory identity and order while adding non-selectable category headings. */
export function menuInventoryRows(plain, keys, labels) {
  const rows = [];
  let index = 0;
  for (const [items, title, empty] of [[plain, labels.menu_plain_items, labels.menu_no_plain], [keys, labels.menu_key_items, labels.menu_no_key]]) {
    rows.push({ label: title, index: null });
    if (!items.length) rows.push({ label: empty, index: null });
    for (const item of items) rows.push({ label: item, index: index++ });
  }
  return rows;
}

/** Wrap at measured glyph widths; truncate only the final bounded line. */
export function menuTextLines(ctx, text, width, maxLines = 1) {
  const lines = [];
  let remaining = String(text ?? '');
  while (lines.length < maxLines) {
    let end = 0;
    for (const glyph of remaining) {
      if (glyph === '\n' || ctx.measureText(remaining.slice(0, end) + glyph).width > width) break;
      end += glyph.length;
    }
    if (end === remaining.length) { lines.push(remaining); break; }
    if (lines.length === maxLines - 1 || (end === 0 && remaining[0] !== '\n')) {
      let last = remaining.slice(0, end).trimEnd();
      while (last && ctx.measureText(last + '…').width > width) last = [...last].slice(0, -1).join('');
      lines.push(last + (ctx.measureText('…').width <= width ? '…' : ''));
      break;
    }
    if (remaining[end] === '\n') {
      lines.push(remaining.slice(0, end));
      remaining = remaining.slice(end + 1);
    } else {
      const boundary = remaining.slice(0, end).search(/\s+\S*$/);
      if (boundary > 0 && !/\s/.test(remaining[end])) end = boundary;
      lines.push(remaining.slice(0, end).trimEnd());
      remaining = remaining.slice(end).replace(/^[^\S\n]+/, '');
    }
  }
  return lines;
}

/** Draw text without shrinking the pixel font or spilling into another column. */
export function drawMenuText(ctx, text, x, y, width, maxLines = 1) {
  for (const [i, line] of menuTextLines(ctx, text, width, maxLines).entries()) ctx.fillText(line, x, y + i * F.lineH);
}
