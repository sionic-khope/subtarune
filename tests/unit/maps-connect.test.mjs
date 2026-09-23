// 맵 연결성 감사 + **막아야 하는 길 감사**(meta.blocked: 동상 벽 같은 것이 정말로 빈틈없이 막는지 — 2026-09-12 '다 안 막히고 뚫린다'): meta.connected 인 타일맵은 start 스폰에서 모든 스폰·문·적·트리거까지 걸어서 닿아야 한다(막힌 주머니·끊긴 길 방지, 2026-09-11 정글).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(new URL('.', import.meta.url).pathname, '../..');
const idx = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/maps/index.json'), 'utf8')).maps;
// unless 소품(이기면 사라지는 거대한 문 등)은 길을 영구히 막지 않으므로 막힘에서 뺀다
const WALK = new Set(['t', 'u', 'w', 'n', 'd', 'r', 'R', 'a', 'A', 'j', 'E', 'x', 'X', 'z', 'b', 's', '.', ',', 'f', 'g', 'h', 'i', 'k', 'l', 'D', 'B', 'M', 'I', 'H', 'F', 'N', ':', ';', '/', '%', '?', '&', '$', '"', '*', '+', 'U', '^', '(', ')', ']', '-']);   // ] = 벚꽃 숲 5 나무다리(BUILD271)   // U ^: 깊은숲 입구 어두운 길·가장자리(BUILD254)
WALK.add('≈');
WALK.add('⌂');
WALK.add('⌁');
for (const id of idx) {
  const m = JSON.parse(fs.readFileSync(path.join(ROOT, `assets/maps/${id}.json`), 'utf8'));
  if (!m.rows) continue;
  const reachable = (flag) => {
    const H = m.rows.length, W = m.rows[0].length; const solid = new Set();
    const rows = m.rows.map((row, i) => m.tileSwaps?.[flag]?.rows[i] ?? row);
    for (const e of m.entities || []) if (e.solid !== false && !e.unless && (e.type === 'prop' || e.type === 'raft')) { const x0 = Math.floor(e.x / 32), y0 = Math.floor(e.y / 32), x1 = Math.floor((e.x + (e.w || 32) - 1) / 32), y1 = Math.floor((e.y + (e.h || 32) - 1) / 32); for (let r = y0; r <= y1; r++) for (let c = x0; c <= x1; c++) solid.add(`${r},${c}`); }
    const ok = (r, c) => r >= 0 && c >= 0 && r < H && c < W && WALK.has(rows[r][c]) && !solid.has(`${r},${c}`);
    const s = m.spawns.start || Object.values(m.spawns)[0]; const start = [Math.floor(s.y / 32), Math.floor(s.x / 32)];
    const stations = (m.entities || []).filter(e => e.type === 'raft' && e.route?.length).map(e =>
      [[e.x, e.y], ...e.route].flatMap(([x, y]) => {
        const row = Math.floor((y + (e.h || 40) * 0.68) / 32), cx = Math.floor((x + (e.w || 56) / 2) / 32);
        // 가로 물길: 뗏목 좌우 / 세로 물길(용암 수로 BUILD189): 뗏목 위아래로 내린다
        return [[row, Math.floor(x / 32) - 1], [row, Math.ceil((x + (e.w || 56)) / 32)], [Math.floor(y / 32) - 1, cx], [Math.ceil((y + (e.h || 40)) / 32), cx]];
      }).filter(([r, c]) => ok(r, c)));
    const seen = new Set([start.join(',')]); const q = [start];
    while (q.length) {
      const [r, c] = q.shift();
      const next = [[r + 1, c], [r - 1, c], [r, c + 1], [r, c - 1]];
      for (const stops of stations) if (stops.some(([sr, sc]) => sr === r && sc === c)) next.push(...stops);
      for (const [nr, nc] of next) if (ok(nr, nc) && !seen.has(`${nr},${nc}`)) { seen.add(`${nr},${nc}`); q.push([nr, nc]); }
    }
    return seen;
  };
  // 막아야 하는 길: **타일이 아니라 실제 히트박스로** 재야 한다 — 타일 단위 BFS 는 12px 틈(동상 받침만 막던 것)을 못 본다 (2026-09-12)
  const barrierStates = [{ flags: {}, cleared: false }];
  if (m.meta?.blockedClearedBy) barrierStates.push({ flags: { [m.meta.blockedClearedBy]: true }, cleared: true });
  for (const { flags, cleared } of barrierStates) if (m.meta?.blocked) test(`${id}: 장애물 ${cleared ? '제거 후 통과' : '제거 전 차단'}(플레이어 24×16)`, () => {
    const PW = 24, PH = 16, STEP = 4;                                  // 플레이어 히트박스와 탐색 간격(px)
    const rects = (m.entities || []).filter((e) => e.solid !== false && !(e.unless && flags[e.unless]) && !(e.requires && !flags[e.requires]) && (e.type === 'prop' || e.type === 'raft')).map((e) => ({ x: e.x, y: e.y, w: e.w ?? 32, h: e.h ?? 32 }));
    const tileOk = (x, y) => { const r = Math.floor(y / 32), c = Math.floor(x / 32); return r >= 0 && c >= 0 && r < m.rows.length && c < m.rows[0].length && WALK.has(m.rows[r][c]); };
    const free = (x, y) => [[x, y], [x + PW - 1, y], [x, y + PH - 1], [x + PW - 1, y + PH - 1]].every(([px, py]) => tileOk(px, py))
      && !rects.some((s) => x < s.x + s.w && x + PW > s.x && y < s.y + s.h && y + PH > s.y);
    const key = (x, y) => `${x},${y}`;
    for (const [[fc, fr], [tc, tr]] of Array.isArray(m.meta.blocked[0][0]) ? m.meta.blocked : [m.meta.blocked]) {
      const sx = Math.round((fc * 32 + 4) / STEP) * STEP, sy = Math.round((fr * 32 + 8) / STEP) * STEP;
      assert.ok(free(sx, sy), `${id}: 출발 자리(${fc},${fr})에 설 수 없다 — 감사 좌표를 확인`);
      const seen = new Set([key(sx, sy)]); const q = [[sx, sy]];
      while (q.length) { const [x, y] = q.shift();
        for (const [dx, dy] of [[STEP, 0], [-STEP, 0], [0, STEP], [0, -STEP]]) { const nx = x + dx, ny = y + dy;
          if (!seen.has(key(nx, ny)) && free(nx, ny)) { seen.add(key(nx, ny)); q.push([nx, ny]); } } }
      const inTarget = [...seen].some((k) => { const [x, y] = k.split(',').map(Number); return Math.floor(x / 32) === tc && Math.floor(y / 32) === tr; });
      assert.equal(inTarget, cleared, `${id}: (${tc},${tr}) 도달 여부가 장애물 제거 상태(${cleared})와 다르다`);
    }
  });
  if (!m.meta?.connected) continue;
  test(`${id}: start 스폰에서 보행·탈것으로 모든 스폰·문·적에 닿는다`, () => {
    const seen = reachable();
    // tileSwaps 로 열리는 길(용광로 광장: 연출이 놓는 다리 → 위 통로·문, BUILD201) 뒤의 스폰·문은 그 플래그 상태에서 닿으면 된다
    const swapStates = Object.keys(m.tileSwaps || {}).map((flag) => reachable(flag));
    const reachIn = (sets, x, y) => sets.some((s) => s.has(`${Math.floor(y / 32)},${Math.floor(x / 32)}`));
    const reach = (x, y) => reachIn([seen, ...swapStates], x, y);
    const bad = [];
    for (const [name, sp] of Object.entries(m.spawns)) if (!reach(sp.x, sp.y)) bad.push(`spawn ${name}`);
    for (const e of m.entities || []) {
      // hidden npc 는 연출 전용 배우(용광로 광장의 철창 속 쥰희·용준처럼 용암 위) — 걸어서 닿을 필요 없다
      if (e.type === 'enemy' || (e.type === 'npc' && !e.hidden)) {
        if (!reach(e.x, e.y)) bad.push(`${e.type} ${e.id}`);
      }
      if (e.type === 'door') {
        const doorSets = e.requires ? [reachable(e.requires)] : [seen, ...swapStates];
        const cy = e.y + (e.h || 32) / 2, cx = e.x + (e.w || 8) / 2;
        if (![cx - 20, cx, cx + 20].some(x => reachIn(doorSets, x, cy))) bad.push(`door→${e.to}`);
      }
    }
    assert.deepEqual(bad, [], `닿지 않음: ${bad.join(', ')}`);
  });
}
