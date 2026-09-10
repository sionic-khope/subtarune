// 맵 연결성 감사: meta.connected 인 타일맵은 start 스폰에서 모든 스폰·문·적·트리거까지 걸어서 닿아야 한다(막힌 주머니·끊긴 길 방지, 2026-09-11 정글).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(new URL('.', import.meta.url).pathname, '../..');
const idx = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/maps/index.json'), 'utf8')).maps;
const WALK = new Set(['t', 'u', 'w', 'n', 'x', 'X', 'z', 'b', 's', '.', ',', 'f', 'g', 'h', 'i', 'k', 'l', 'D', 'B']);
for (const id of idx) {
  const m = JSON.parse(fs.readFileSync(path.join(ROOT, `assets/maps/${id}.json`), 'utf8'));
  if (!m.rows || !m.meta?.connected) continue;
  test(`${id}: start 스폰에서 모든 스폰·문·적이 걸어서 닿는다`, () => {
    const H = m.rows.length, W = m.rows[0].length; const solid = new Set();
    for (const e of m.entities || []) if (e.solid !== false && (e.type === 'prop' || e.type === 'raft')) { const x0 = Math.floor(e.x / 32), y0 = Math.floor(e.y / 32), x1 = Math.floor((e.x + (e.w || 32) - 1) / 32), y1 = Math.floor((e.y + (e.h || 32) - 1) / 32); for (let r = y0; r <= y1; r++) for (let c = x0; c <= x1; c++) solid.add(`${r},${c}`); }
    const ok = (r, c) => r >= 0 && c >= 0 && r < H && c < W && WALK.has(m.rows[r][c]) && !solid.has(`${r},${c}`);
    const s = m.spawns.start || Object.values(m.spawns)[0]; const start = [Math.floor(s.y / 32), Math.floor(s.x / 32)];
    const seen = new Set([start.join(',')]); const q = [start];
    while (q.length) { const [r, c] = q.shift(); for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nr = r + dr, nc = c + dc; if (ok(nr, nc) && !seen.has(`${nr},${nc}`)) { seen.add(`${nr},${nc}`); q.push([nr, nc]); } } }
    const reach = (x, y) => seen.has(`${Math.floor(y / 32)},${Math.floor(x / 32)}`);
    const bad = [];
    for (const [name, sp] of Object.entries(m.spawns)) if (!reach(sp.x, sp.y)) bad.push(`spawn ${name}`);
    for (const e of m.entities || []) { if (e.type === 'enemy' || e.type === 'npc') { if (!reach(e.x, e.y)) bad.push(`${e.type} ${e.id}`); } if (e.type === 'door') { const cy = e.y + (e.h || 32) / 2, cx = e.x + (e.w || 8) / 2; if (![cx - 20, cx, cx + 20].some((x) => reach(x, cy))) bad.push(`door→${e.to}`); } }   // 문 자체는 가장자리 띠라 양옆 한 칸도 본다
    assert.deepEqual(bad, [], `닿지 않음: ${bad.join(', ')}`);
  });
}
