// 맵 레이아웃 감사 (2026-09-11 레이아웃 포스트모텀): 이번 세션에 실제로 터진 것들을 데이터에서 잡는다.
//   1) 대사 있는 소품은 C 프로브로 닿는 자리가 있어야 한다(석등이 길 아래 너무 멀리 있던 것)
//   2) 나무 밑동 히트박스는 길 타일 위에 없어야 한다(2줄 길이 막히던 것)
//   3) 컷신 자리(meta.stage/hide)는 캐릭터 히트박스가 통째로 걷는 타일 위에 있어야 한다(freeSpot 이 밀어 올려 정렬이 깨지던 것)
//   4) 필드 NPC 정지 그림(still × stillScale × CHAR_SCALE)은 대화 중 보이는 높이(230px) 안에 들어와야 한다(2.6배 문지기가 잘리던 것)
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CHARACTERS } from '../../src/data/characters.js';
import { TILE, PROBE_RANGE, CHAR_BOX, DIALOGUE_VISIBLE_H } from '../../src/core/layout.js';

const root = new URL('../../', import.meta.url).pathname;
const CHAR_SCALE = Number(fs.readFileSync(root + 'src/world/world.js', 'utf-8').match(/export const CHAR_SCALE = ([\d.]+)/)[1]);
const ROAD = new Set(['t', 'u', 'w', 'n', 'r', 'R', 'a', 'A', 'j', 'E', 'x', 'X', 'z', 'b', 's', '.', ',', 'f', 'g', 'h', 'i', 'k', 'l', 'D', 'B', 'M', 'I', ':', ';', '/', '%', '?', '$', '"', '*', 'U', '(', ')', ']']);   // ] = 벚꽃 숲 5 나무다리(BUILD271)   // $ " = 짜장숲부터의 에코 길·공터 풀숲(BUILD226~227), U = 깊은숲 입구 어두운 길(BUILD254)
const WALK = new Set([...ROAD, 'd', 'F', 'H', 'N', '&', '+', '^', '-']);   // - = 벚꽃 숲 11·12 나무 정상 널빤지 바닥(BUILD288)   // ^: 깊은숲 입구 길 가장자리 출입구(BUILD254)   // F: 용광로 구역 바닥(BUILD189), H: 가장자리 출입구 칸(BUILD194, 걷는다), N: 용암 위 다리 바닥(BUILD201)
const pngH = (p) => fs.readFileSync(root + p).readUInt32BE(20);
const maps = JSON.parse(fs.readFileSync(root + 'assets/maps/index.json', 'utf-8')).maps.map((id) => JSON.parse(fs.readFileSync(root + `assets/maps/${id}.json`, 'utf-8'))).filter((m) => m.rows);

const tileAt = (m, x, y) => { const r = Math.floor(y / TILE), c = Math.floor(x / TILE); return (m.rows[r] || '')[c] ?? ' '; };
const boxOn = (m, x, y, w, h, set) => [[x, y], [x + w - 1, y], [x, y + h - 1], [x + w - 1, y + h - 1]].every(([px, py]) => set.has(tileAt(m, px, py)));
const solids = (m) => (m.entities || []).filter((e) => e.type === 'prop' && e.solid !== false).map((e) => ({ x: e.x, y: e.y, w: e.w ?? 32, h: e.h ?? 12 }));
const hits = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

for (const m of maps) {
  test(`${m.id}: 대사 있는 소품은 C 로 닿는 자리가 있다`, () => {
    const sol = solids(m);
    for (const e of (m.entities || []).filter((p) => p.type === 'prop' && p.script)) {
      const hb = { x: e.x, y: e.y, w: e.w ?? 32, h: e.h ?? 12 }; let ok = false;
      const cands = [];
      for (const dy of [0, 8, 16]) for (const dx of [-16, -8, 0, 8, 16, hb.w - 24, hb.w - 12]) {
        cands.push({ x: hb.x + dx, y: hb.y + hb.h + dy, f: 'up' }, { x: hb.x + dx, y: hb.y - CHAR_BOX.h - dy, f: 'down' });   // 아래에서 위를 보고 / 위에서 아래를 보고
        cands.push({ x: hb.x + hb.w + dy, y: hb.y + dx, f: 'left' }, { x: hb.x - CHAR_BOX.w - dy, y: hb.y + dx, f: 'right' });
      }
      for (const c of cands) {
        const box = { x: c.x, y: c.y, w: CHAR_BOX.w, h: CHAR_BOX.h };
        if (!boxOn(m, box.x, box.y, box.w, box.h, WALK) || sol.some((s) => hits(box, s))) continue;
        const d = c.f === 'up' ? [0, -1] : c.f === 'down' ? [0, 1] : c.f === 'left' ? [-1, 0] : [1, 0];
        const probe = { x: box.x + d[0] * PROBE_RANGE, y: box.y + d[1] * PROBE_RANGE, w: box.w, h: box.h };
        if (hits(probe, hb)) { ok = true; break; }
      }
      assert.ok(ok, `${m.id}.${e.id}(${e.script}): 걷는 칸에서 프로브(${PROBE_RANGE}px)로 닿는 자리가 없다 — 히트박스를 길 가장자리로`);
    }
  });
  test(`${m.id}: 나무 밑동은 길 타일 위에 없다`, () => {
    for (const e of (m.entities || []).filter((p) => p.type === 'prop' && p.solid !== false && /tree_/.test(p.image || '') && /^(jt|st|ot)\d/.test(p.id || ''))) {   // 생성기가 자동으로 뿌린 숲 나무만(손으로 둔 나무는 개별 검토)
      const hb = { x: e.x, y: e.y, w: e.w ?? 32, h: e.h ?? 12 };
      const onRoad = [[hb.x, hb.y], [hb.x + hb.w - 1, hb.y], [hb.x, hb.y + hb.h - 1], [hb.x + hb.w - 1, hb.y + hb.h - 1]].some(([px, py]) => ROAD.has(tileAt(m, px, py)));
      assert.ok(!onRoad, `${m.id}.${e.id}: 나무 밑동(${hb.x},${hb.y})이 길 위에 있다 — 생성기에서 한 칸 올린다(teal9.py 참고)`);
    }
  });
  test(`${m.id}: 컷신 자리(meta.stage/hide)는 히트박스가 통째로 걷는 타일 위`, () => {
    for (const key of ['stage', 'hide']) {
      const pts = m.meta?.[key]; if (!pts || typeof pts !== 'object') continue;
      for (const [name, v] of Object.entries(pts)) {
        if (!Array.isArray(v) || v.length !== 2 || /edge/.test(name)) continue;   // edge: 맵 밖으로 나가는 자리
        assert.ok(boxOn(m, v[0], v[1], CHAR_BOX.w, CHAR_BOX.h, WALK), `${m.id}.meta.${key}.${name} (${v}) 히트박스가 막힌 타일에 걸린다 — freeSpot 이 자리를 밀어 정렬이 깨진다`);
      }
    }
  });
  test(`${m.id}: 필드 NPC 정지 그림은 대화 중 보이는 높이 안`, () => {
    for (const e of (m.entities || []).filter((p) => p.type === 'npc')) {
      const ch = CHARACTERS[e.sprite]; if (!ch?.still) continue;
      const h = Math.round(pngH(ch.still) * (ch.stillScale || 1) * CHAR_SCALE);
      assert.ok(h <= DIALOGUE_VISIBLE_H, `${m.id}.${e.id}: 그림 높이 ${h}px > 보이는 높이 ${DIALOGUE_VISIBLE_H}px — stillScale 을 내리거나 카메라를 화자별로`);
    }
  });
}
