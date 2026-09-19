// 맵 전환 쿨다운 감사 (BUILD246): 맵을 바꾸면 main.js 가 모든 트리거에 0.6초 쿨다운을 준다(문 위에서 스폰될 때 바로 되돌아가지 않도록).
//   그 사이 달려서(220px/s) 지나칠 수 있는 자리에 한 번짜리 트리거가 있으면 영영 안 밟힌다 — 굽이 길 입구 청소부 연출이 그랬다(사용자 2026-09-19 “청소부가 이따보새 하고 사라지는 거 추가하라고”).
//   문으로 들어오는 스폰(from_*, start)만 본다. QA 전용 스폰(before_*)은 점프 직후 바로 달리지 않으므로 제외.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

export const ENTRY_COOLDOWN = 0.6;      // main.js changeMap: e.cooldown = 0.6
export const RUN_SPEED = 220;           // X 달리기(px/s)
const NEED = ENTRY_COOLDOWN * RUN_SPEED;
const PLAYER_W = 24;
const dir = new URL('../../assets/maps/', import.meta.url);

test('test_once_triggers_are_out_of_reach_of_the_map_entry_cooldown', () => {
  const risky = [];
  for (const file of readdirSync(dir).filter(f => f.endsWith('.json') && f !== 'index.json')) {
    const map = JSON.parse(readFileSync(new URL(file, dir), 'utf8'));
    const triggers = (map.entities || []).filter(e => e.type === 'trigger' && e.once);
    for (const [name, spawn] of Object.entries(map.spawns || {})) {
      if (!/^(from_|start$)/.test(name)) continue;
      for (const t of triggers) {
        if (!(t.y < spawn.y + PLAYER_W && t.y + t.h > spawn.y)) continue;
        const facing = spawn.facing || 'right';
        const gap = facing === 'right' ? t.x - (spawn.x + PLAYER_W) : facing === 'left' ? spawn.x - (t.x + t.w) : null;
        if (gap !== null && gap >= 0 && gap < NEED) risky.push(`${map.id}: 스폰 ${name} → ${t.id || t.script} 까지 ${Math.round(gap)}px (달려 들어오면 쿨다운 ${ENTRY_COOLDOWN}s 안에 지나침, ${NEED}px 이상 필요)`);
      }
    }
  }
  assert.deepEqual(risky, [], risky.join('\n'));
});
