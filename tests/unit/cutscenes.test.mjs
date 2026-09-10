// 컷신 ↔ 맵 정합성 감사 (2026-09-10 "억빠맨이 하늘로 걸어가서 수영" — 옛 물길 높이의 px 를 그대로 둔 채 맵을 계단식으로 바꿔 생긴 버그).
//   맵이 부르는 스크립트(entities.script/onBoard/onArrive/stops[].script/emptyScript/lockedScript, enter.script)를 따라가며
//   {move px} · {spawn x,y} 목표가 그 맵 안쪽(가장자리 1타일 제외 — 맵 밖으로 걸어 나가는 연출은 허용)의 허공(' ') 타일이 아니어야 하고(소품 이동은 제외),
//   {move rel:'id'} · {emote/hop/fling… id} 가 그 맵(또는 파티·주인공·스폰·스크립트가 spawn 한 id)에 있어야 한다. {map:'x'} 노드 뒤로는 그 맵 기준(청록숲3 → 청록숲2 동상).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { SCRIPTS } from '../../src/data/scripts.js';
import { CHARACTERS } from '../../src/data/characters.js';

const ROOT = path.resolve(new URL('.', import.meta.url).pathname, '../..');
const idx = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/maps/index.json'), 'utf8')).maps;
const maps = Object.fromEntries(idx.map((id) => [id, JSON.parse(fs.readFileSync(path.join(ROOT, `assets/maps/${id}.json`), 'utf8'))]));
const scriptsOf = (m) => { const out = new Set(); if (m.enter?.script) out.add(m.enter.script);
  for (const e of m.entities || []) { for (const k of ['script', 'onBoard', 'onArrive', 'emptyScript', 'lockedScript']) if (typeof e[k] === 'string') out.add(e[k]); for (const s of e.stops || []) if (s.script) out.add(s.script); }
  return [...out]; };
const walk = (nodes, fn, seen = new Set()) => { for (const n of nodes || []) { if (!n || typeof n !== 'object') continue; fn(n); for (const k of ['parallel', 'async']) if (Array.isArray(n[k])) walk(n[k], fn, seen); } };
const tileAt = (m, x, y) => { const r = Math.floor(y / 32), c = Math.floor(x / 32); return (m.rows?.[r] || '')[c] ?? ' '; };

test('test_cutscenes_bound_to_maps_target_real_ground_and_existing_ids', () => {
  const problems = [];
  const swimIds = (m) => (m.entities || []).flatMap((e) => (Array.isArray(e.swim) ? e.swim : e.swim ? [e.swim] : []).map((id) => `${id}_swim`));   // 뗏목 헤엄 동료(다른 스크립트가 물에 넣어도 같은 맵이면 유효)
  const idsOf = (m) => new Set([...(m.entities || []).map((e) => e.id).filter(Boolean), 'player', ...Object.keys(CHARACTERS), ...Object.keys(m.spawns || {}), ...swimIds(m)]);
  const interiorVoid = (m, x, y) => { const W = (m.rows[0] || '').length * 32, H = m.rows.length * 32; if (x < 32 || y < 32 || x >= W - 32 || y >= H - 32) return false; return tileAt(m, x, y) === ' '; };
  const isProp = (m, id) => (m.entities || []).some((e) => e.id === id && (e.type === 'prop' || e.type === 'raft'));
  for (const [mid, m0] of Object.entries(maps)) {
    if (!m0.rows) continue;                                            // 이미지 맵(방·거실)은 walkable 사각형이라 생략
    for (const name of scriptsOf(m0)) {
      const script = SCRIPTS[name]; if (!script) { problems.push(`${mid}: 맵이 부르는 스크립트 '${name}' 가 SCRIPTS 에 없음`); continue; }
      const dynamic = new Set(), dynProps = new Set();                  // 스크립트 안에서 spawn 한 id 도 유효 (소품이면 허공 이동 허용 — 떨어지는 다리 등)
      walk(script, (n) => { if (n.spawn?.id) { dynamic.add(n.spawn.id); if (n.spawn.type === 'prop') dynProps.add(n.spawn.id); } if (n.raft && n.swim) dynamic.add(`${n.swim}_swim`); });
      let m = m0, cur = mid;
      const visit = (n) => {
        if (typeof n.map === 'string' && maps[n.map]?.rows) { m = maps[n.map]; cur = n.map; return; }
        const ids = idsOf(m);
        if (typeof n.move === 'string' && Array.isArray(n.px) && !isProp(m, n.move) && !dynProps.has(n.move)) { const [x, y] = n.px; if (interiorVoid(m, x, y)) problems.push(`${cur}/${name}: move ${n.move} px [${x},${y}] 가 맵 안쪽 허공(' ') 타일 — 옛 좌표? (rel: 기준 이동 권장)`); }
        if (n.spawn && typeof n.spawn.x === 'number' && typeof n.spawn.y === 'number' && n.spawn.type !== 'prop' && interiorVoid(m, n.spawn.x, n.spawn.y)) problems.push(`${cur}/${name}: spawn ${n.spawn.id} [${n.spawn.x},${n.spawn.y}] 가 맵 안쪽 허공`);
        for (const k of ['rel', 'emote', 'hop', 'tremble', 'remove', 'hide', 'show', 'raft', 'fling']) { const v = n[k]; const list = Array.isArray(v) ? v : typeof v === 'string' ? [v] : [];
          for (const id of list) if (!ids.has(id) && !dynamic.has(id)) problems.push(`${cur}/${name}: ${k}:'${id}' 가 맵에 없음`); }
        if (typeof n.move === 'string' && !ids.has(n.move) && !dynamic.has(n.move)) problems.push(`${cur}/${name}: move:'${n.move}' 가 맵에 없음`);
      };
      for (const n of script) { if (!n || typeof n !== 'object') continue; visit(n); for (const k of ['parallel', 'async']) if (Array.isArray(n[k])) walk(n[k], visit); }
    }
  }
  assert.deepEqual(problems, [], problems.join('\n'));
});
test('test_cutscenes_every_map_script_reference_resolves', () => {
  for (const [mid, m] of Object.entries(maps)) for (const name of scriptsOf(m)) assert.ok(SCRIPTS[name], `${mid}: '${name}'`);
});
