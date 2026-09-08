// UI 표현 규칙: 맵은 화면(480x360)보다 작으면 안 되고(검은 띠), 타일맵은 사방이 막힌 타일이어야 한다.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const SCREEN_W = 480, SCREEN_H = 360, TILE = 32;
const SOLID_CHARS = new Set(['#', 'p', 'q', 'e', 'T', '~', 'W', ' ']);
const index = JSON.parse(fs.readFileSync('assets/maps/index.json', 'utf8'));
for (const id of index.maps) {
  const m = JSON.parse(fs.readFileSync(`assets/maps/${id}.json`, 'utf8'));
  if (m.rows) {
    test(`${id}: 타일맵은 화면 이상 크기`, () => {
      assert.ok(m.rows[0].length * TILE >= SCREEN_W, `가로 ${m.rows[0].length * TILE} < ${SCREEN_W}`);
      assert.ok(m.rows.length * TILE >= SCREEN_H, `세로 ${m.rows.length * TILE} < ${SCREEN_H}`);
    });
    test(`${id}: 타일맵 사방이 막힘`, () => {
      const top = m.rows[0], bottom = m.rows[m.rows.length - 1];
      assert.ok([...top].every((c) => SOLID_CHARS.has(c)), '윗줄 뚫림');
      assert.ok([...bottom].every((c) => SOLID_CHARS.has(c)), '아랫줄 뚫림');
      assert.ok(m.rows.every((r) => SOLID_CHARS.has(r[0]) && SOLID_CHARS.has(r[r.length - 1])), '옆줄 뚫림');
    });
  }
}
