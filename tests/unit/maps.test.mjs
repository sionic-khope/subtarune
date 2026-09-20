// UI 표현 규칙: 맵은 화면(480x360)보다 작으면 안 되고(검은 띠), 타일맵은 사방이 막힌 타일이어야 한다.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const SCREEN_W = 480, SCREEN_H = 360, TILE = 32;
const SOLID_CHARS = new Set(['#', 'p', 'q', 'e', 'P', 'Q', 'T', '~', 'W', ' ', 'y', 'Z', 'v', 'm', 'c', 'V', 'Y', 'o', 'O', '!', 'J', 'G', 'L', '@']);
// 가장자리 출입구 칸(H, BUILD194): 걷는 바닥이지만 맵 밖은 엔진이 막는다(tileAt 밖 = ' '). 테두리에 있어도 '뚫림'이 아니다 — 대신 그 칸을 덮는 문 트리거가 맵 끝에 닿아야 한다(아래 검사)
const EDGE_OPEN = new Set(['H', '&', '+', '^']);   // & = 짜장섬 길 가장자리 출입구(BUILD225), ^ = 깊은숲 입구(BUILD254)
const index = JSON.parse(fs.readFileSync('assets/maps/index.json', 'utf8'));
const PW = 24, PH = 16;   // 주인공 히트박스 (스폰 x,y = 히트박스 왼쪽 위)
const solidAt = (m, x, y) => { const c = Math.floor(x / TILE), r = Math.floor(y / TILE); if (r < 0 || r >= m.rows.length || c < 0 || c >= m.rows[0].length) return true; return SOLID_CHARS.has(m.rows[r][c]); };
const onProp = (m, x, y) => (m.entities || []).some((e) => e.type === 'prop' && e.w !== undefined && x < e.x + e.w && x + PW > e.x && y < e.y + e.h && y + PH > e.y);   // 발판 소품(void4 기둥) 위는 허용
const onGround = (m, x, y) => { if (onProp(m, x, y)) return true; for (const px of [x, x + PW - 1]) for (const py of [y, y + PH - 1]) if (solidAt(m, px, py)) return false; return true; };
const ALL = Object.fromEntries(index.maps.map((id) => [id, JSON.parse(fs.readFileSync(`assets/maps/${id}.json`, 'utf8'))]));
for (const id of index.maps) {
  const m = JSON.parse(fs.readFileSync(`assets/maps/${id}.json`, 'utf8'));
  if (m.rows) {
    test(`${id}: 타일맵은 화면 이상 크기`, () => {
      assert.ok(m.rows[0].length * TILE >= SCREEN_W, `가로 ${m.rows[0].length * TILE} < ${SCREEN_W}`);
      assert.ok(m.rows.length * TILE >= SCREEN_H, `세로 ${m.rows.length * TILE} < ${SCREEN_H}`);
    });
    test(`${id}: 모든 스폰이 땅 위(허공·벽 아님)`, () => {   // 2026-09-10 "허공을 걷는 느낌" — 스폰이 막힌 타일 위면 동료·주인공이 허공에 선다
      for (const [name, sp] of Object.entries(m.spawns || {})) if (!sp.platform) assert.ok(onGround(m, sp.x, sp.y), `스폰 ${name} (${sp.x},${sp.y}) 가 땅 위가 아님`);   // platform:true = 발판 소품 위(void4 기둥 QA)
    });
    test(`${id}: 문이 가리키는 맵·스폰이 존재`, () => {
      for (const e of (m.entities || []).filter((e) => e.type === 'door' && e.to)) {
        assert.ok(ALL[e.to], `문 → ${e.to} 맵 없음`);
        assert.ok(!e.spawn || (ALL[e.to].spawns && ALL[e.to].spawns[e.spawn]), `문 → ${e.to}.${e.spawn} 스폰 없음`);
      }
    });
    test(`${id}: 타일맵 사방이 막힘`, () => {
      const top = m.rows[0], bottom = m.rows[m.rows.length - 1];
      assert.ok([...top].every((c) => SOLID_CHARS.has(c) || EDGE_OPEN.has(c)), '윗줄 뚫림');
      assert.ok([...bottom].every((c) => SOLID_CHARS.has(c) || EDGE_OPEN.has(c)), '아랫줄 뚫림');
      assert.ok(m.rows.every((r) => (SOLID_CHARS.has(r[0]) || EDGE_OPEN.has(r[0])) && (SOLID_CHARS.has(r[r.length - 1]) || EDGE_OPEN.has(r[r.length - 1]))), '옆줄 뚫림');
    });
    // 완전히 검은 입구 그림자 아래 문은 그늘에 들어서는 순간 넘어간다(BUILD226 사용자 “여기서 다음 짜장맵 가져야 되는 거 아니냐”) — 캄캄한 구간을 더 걷게 하지 않는다. 맵 끝에 닿아야 하는 규칙은 그대로
    const SHADED_DOORS = new Set(['shore_forest_door']);
    test(`${id}: 가장자리 출입구(H)를 덮는 문은 맵 끝에 닿는다 — 끝까지 걸어가야 넘어간다(BUILD194 사용자 “포탈을 끝으로”)`, () => {
      const W = m.rows[0].length * TILE, Hpx = m.rows.length * TILE;
      for (const e of (m.entities || []).filter((e) => e.type === 'door' && e.interact !== true)) {
        const c0 = Math.floor(e.x / TILE), c1 = Math.floor((e.x + (e.w || 32) - 1) / TILE), r0 = Math.floor(e.y / TILE), r1 = Math.floor((e.y + (e.h || 32) - 1) / TILE);
        let onEdgeOpen = false;
        for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (EDGE_OPEN.has(m.rows[r]?.[c])) onEdgeOpen = true;
        if (!onEdgeOpen) continue;
        const side = e.x === 0 || e.x + (e.w || 32) === W, vert = e.y === 0 || e.y + (e.h || 32) === Hpx;
        assert.ok(side || vert, `문 ${e.id} 이 가장자리 출입구 칸 위인데 맵 끝(x 0/${W} 또는 y 0/${Hpx})에 닿지 않음: ${e.x},${e.y} ${e.w}×${e.h}`);
        if (SHADED_DOORS.has(e.id)) continue;
        assert.ok(side ? (e.w || 32) <= 16 : (e.h || 32) <= 16, `문 ${e.id} 은 끝 쪽 10~16px 만 — 그 앞 칸에서 미리 넘어가지 않게`);
      }
    });
  }
}

// ── 상호작용 무결성: 문 핑퐁 / 스폰 위치 / 트리거 겹침 ──
const maps = Object.fromEntries(index.maps.map((id) => [id, JSON.parse(fs.readFileSync(`assets/maps/${id}.json`, 'utf8'))]));
const rectOf = (e) => [e.x, e.y, e.w ?? 24, e.h ?? 24];
const hit = (a, b) => a[0] < b[0] + b[2] && a[0] + a[2] > b[0] && a[1] < b[1] + b[3] && a[1] + a[3] > b[1];
const PLAYER = [24, 16];   // 플레이어 히트박스 (TILE*0.75, TILE*0.5)
for (const [id, m] of Object.entries(maps)) {
  const ents = m.entities || [];
  test(`${id}: 문의 목적지 스폰이 존재하고, 도착 즉시 다른 문을 밟지 않는다(핑퐁 방지)`, () => {
    for (const d of ents.filter((e) => e.type === 'door')) {
      const target = maps[d.to];
      assert.ok(target, `문 → 없는 맵 ${d.to}`);
      const sp = target.spawns?.[d.spawn];
      assert.ok(sp, `문 → ${d.to} 에 스폰 ${d.spawn} 없음`);
      const pr = [sp.x, sp.y, ...PLAYER];
      for (const d2 of (target.entities || []).filter((e) => e.type === 'door' || e.type === 'trigger')) assert.ok(!hit(pr, rectOf(d2)), `${d.to}.${d.spawn} 이 문/트리거 위에 있음 → 도착하자마자 발동`);
    }
  });
  test(`${id}: 스폰이 막힘/소품/트리거 안에 없다`, () => {
    for (const [name, sp] of Object.entries(m.spawns || {})) {
      if (name === 'bed') continue;   // 침대 위 눕기 연출은 예외
      const pr = [sp.x, sp.y, ...PLAYER];
      for (const z of ents.filter((e) => e.type === 'trigger' || e.type === 'door')) assert.ok(!hit(pr, rectOf(z)), `스폰 ${name} 이 트리거/문 위`);
      for (const r of (m.solids || [])) assert.ok(!hit(pr, r), `스폰 ${name} 이 막힘 안`);
      for (const e of ents.filter((e) => e.type === 'prop' && e.solid !== false && e.w !== undefined)) assert.ok(!hit(pr, rectOf(e)), `스폰 ${name} 이 소품 ${e.image} 안`);
    }
  });
  test(`${id}: 트리거/문끼리 겹치지 않는다`, () => {
    const zones = ents.filter((e) => e.type === 'trigger' || e.type === 'door');
    for (let i = 0; i < zones.length; i++) for (let j = i + 1; j < zones.length; j++) assert.ok(!hit(rectOf(zones[i]), rectOf(zones[j])), `영역 겹침: ${zones[i].script || zones[i].to} / ${zones[j].script || zones[j].to}`);
  });
}

// ── 스크립트 키 존재: 맵이 가리키는 script / lockedScript / enter.script 가 SCRIPTS 에 있어야 한다 (오타 → 아무 일도 안 일어남 방지) ──
const { SCRIPTS } = await import('../../src/data/scripts.js');
for (const [id, m] of Object.entries(maps)) {
  test(`${id}: 참조하는 스크립트 키가 모두 존재`, () => {
    const keys = [];
    for (const e of (m.entities || [])) { if (typeof e.script === 'string') keys.push(e.script); if (e.lockedScript) keys.push(e.lockedScript); }
    if (m.enter?.script) keys.push(m.enter.script);
    for (const k of keys) assert.ok(SCRIPTS[k], `${id}: 스크립트 없음 '${k}'`);
  });
  test(`${id}: 소품 이미지 파일이 존재`, () => {
    for (const e of (m.entities || []).filter((e) => e.type === 'prop' && e.image)) assert.ok(fs.existsSync(e.image), `${id}: 이미지 없음 ${e.image}`);
  });
  test(`${id}: 잠긴 문은 lockedScript 가 있고, 문/트리거는 대상 스폰이 있다`, () => {
    for (const d of (m.entities || []).filter((e) => e.type === 'door')) {
      if (d.requires) assert.ok(d.lockedScript, `${id}: requires 있는 문에 lockedScript 없음`);
    }
  });
}

// ── 스토리 단계: 스토리 맵은 stage 를 선언하고, 그 id 는 STAGES 에 있어야 한다 (개발용 ?map= 이 단계를 채우는 근거) ──
const { STAGES } = await import('../../src/core/story.js');
const STAGE_IDS = new Set(STAGES.map((s) => s.id));
for (const [id, m] of Object.entries(maps)) {
  test(`${id}: stage 선언이 STAGES 에 존재`, () => {
    assert.ok(m.stage, `${id}: stage 없음 (스토리 맵은 최소 도달 단계를 선언)`);
    assert.ok(STAGE_IDS.has(m.stage), `${id}: 모르는 stage '${m.stage}'`);
  });
}
test('STAGES 의 map/spawn 이 실제로 존재', () => {
  for (const st of STAGES) { const m = maps[st.map]; assert.ok(m, `${st.id}: 맵 ${st.map} 없음`); assert.ok(m.spawns?.[st.spawn], `${st.id}: 스폰 ${st.map}.${st.spawn} 없음`); }
});

// ── QA 바로가기 지점의 맵/스폰 존재 ──
const { QA_POINTS } = await import('../../src/core/story.js');
test('QA_POINTS 의 map/spawn 이 실제로 존재', () => {
  for (const q of QA_POINTS) { const m = maps[q.map]; assert.ok(m, `${q.id}: 맵 ${q.map} 없음`); assert.ok(m.spawns?.[q.spawn], `${q.id}: 스폰 ${q.map}.${q.spawn} 없음`); }
});
// ── tileSwaps 행 길이는 원본 행과 같아야 한다 ──
for (const [id, m] of Object.entries(maps)) if (m.tileSwaps) test(`${id}: tileSwaps 행 길이 일치`, () => {
  for (const sw of Object.values(m.tileSwaps)) for (const [r, str] of Object.entries(sw.rows || {})) assert.equal(str.length, m.rows[+r].length, `${id} tileSwaps 행 ${r}`);
});
