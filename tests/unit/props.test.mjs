// 소품 검사 (2026-09-10 회고: 나무 크기 키를 잘못 써서 그림과 히트박스가 어긋났는데 검증이 못 잡았다)
//  - 소품 def 의 키는 엔진이 아는 것만 (imageScale 같은 오타 금지)
//  - 그림 위치(ix/iy·scale)가 있는 소품은 그림 밑변이 히트박스 밑변보다 아래로 내려가면 안 되고(10px 여유; 벽걸이처럼 위에 있는 건 허용), 히트박스가 그림 가로 범위 안에 있어야 한다
//  - 타일 등록 충돌(같은 글자 두 번) 금지
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const KNOWN = new Set(['type', 'id', 'image', 'x', 'y', 'w', 'h', 'ix', 'iy', 'scale', 'solid', 'script', 'sortY', 'unless', 'requires', 'obstacle', 'oscillate', 'interact', 'flag', 'emptyScript', 'lockedScript', 'to', 'spawn', 'sfx', 'sprite', 'facing', 'wander', 'route', 'speed', 'jump', 'swim', 'onBoard', 'onArrive', 'stops', 'checkpoints', 'swimAt', 'clear', 'sweep', 'period', 'offset', 'range', 'ground', 'top', 'warn', 'fall', 'rest', 'raft', 'slot', 'once', 'dir', 'name', 'text', 'items', 'tiles', 'when', 'lanes', 'tileSwaps', 'visible', 'hidden', 'cooldown', 'noFace', 'walkable', 'auto', 'from', 'stage', 'label', 'motion', 'lift']);
const pngSize = (path) => { const b = fs.readFileSync(path); assert.equal(b.toString('ascii', 1, 4), 'PNG', `${path} 는 PNG 가 아님`); return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) }; };
const index = JSON.parse(fs.readFileSync('assets/maps/index.json', 'utf8'));
for (const id of index.maps) {
  const m = JSON.parse(fs.readFileSync(`assets/maps/${id}.json`, 'utf8'));
  const props = (m.entities || []).filter((e) => e.type === 'prop');
  if (!props.length) continue;
  test(`${id}: 소품 키는 엔진이 아는 것만`, () => {
    for (const e of props) for (const k of Object.keys(e)) assert.ok(KNOWN.has(k), `${id}.${e.id || e.image}: 모르는 키 '${k}' (scale 대신 imageScale 같은 오타?)`);
  });
  test(`${id}: 소품 그림과 히트박스가 맞물림`, () => {
    for (const e of props) {
      if (e.ix === undefined || e.w === undefined || !e.image || !e.solid) continue;   // 막는 소품만(깔개·발판은 그림이 히트박스보다 커도 됨)
      assert.ok(fs.existsSync(e.image), `${id}.${e.id}: 그림 없음 ${e.image}`);
      const sz = pngSize(e.image), sc = e.scale ?? 1, iw = sz.w * sc, ih = sz.h * sc;
      const imgBottom = e.iy + ih, boxBottom = e.y + e.h;
      if (e.sortY === undefined) assert.ok(imgBottom - boxBottom <= 10, `${id}.${e.id || e.image}: 그림 밑변(${imgBottom})이 히트박스 밑변(${boxBottom})보다 아래 — 보이는 밑동이 막히지 않는다 (벽걸이처럼 그림이 위에 있는 건 허용)`);
      assert.ok(e.x >= e.ix - 2 && e.x + e.w <= e.ix + iw + 2, `${id}.${e.id}: 히트박스 x(${e.x}~${e.x + e.w}) 가 그림 x(${e.ix}~${e.ix + iw}) 밖`);
    }
  });
}
test('타일 글자 등록 충돌 없음', async () => {
  const src = fs.readFileSync('src/world/tiles.js', 'utf8');
  const chars = [...src.matchAll(/registerTile\('(.)'/g)].map((m) => m[1]);
  const dup = chars.filter((c, i) => chars.indexOf(c) !== i);
  assert.deepEqual(dup, [], `같은 글자를 두 번 등록: ${dup.join(',')}`);
});
