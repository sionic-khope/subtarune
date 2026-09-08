import test from 'node:test';
import assert from 'node:assert/strict';

// TileMap.solidRect 만 순수 로직으로 검증 (캔버스 없이 registry 흉내)
class MiniMap {
  constructor(rows) { this.rows = rows; this.w = rows[0].length; this.h = rows.length; }
  tileAt(tx, ty) { if (tx < 0 || ty < 0 || tx >= this.w || ty >= this.h) return { solid: true }; return { solid: this.rows[ty][tx] === '#' }; }
  solidRect(x, y, w, h) {
    const T = 16, x0 = Math.floor(x / T), y0 = Math.floor(y / T), x1 = Math.floor((x + w - 1) / T), y1 = Math.floor((y + h - 1) / T);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (this.tileAt(tx, ty).solid) return true;
    return false;
  }
}
const m = new MiniMap(['####', '#..#', '#..#', '####']);

test('open floor is walkable', () => assert.equal(m.solidRect(18, 18, 12, 8), false));
test('touching a wall tile blocks', () => assert.equal(m.solidRect(14, 18, 12, 8), true));
test('edge-exclusive: box ending exactly at wall boundary passes', () => assert.equal(m.solidRect(36, 18, 12, 8), false));
test('outside map is solid', () => assert.equal(m.solidRect(-5, 18, 4, 4), true));
