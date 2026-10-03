// BUILD445(사용자 윈도우 콘솔 “arc … radius (-0.16) is negative”): 고주사율 모니터(짧은 dt)에서 강제퇴장 파동의 안쪽 고리 반지름이 음수가 되어
// arc 가 예외 → save()·clip() 이 풀리지 않아 전투 화면이 상자 안만 갱신됐다. 모든 청소년 패턴을 짧은 dt 로 돌리며 그려 본다.
import test from 'node:test';
import assert from 'node:assert/strict';
import { TEEN_PATTERNS } from '../../src/battle/teen-patterns.js';
import { Bullet } from '../../src/battle/bullets.js';

function mockCtx() {
  const state = { depth: 0 };
  const gradient = { addColorStop() {} };
  const checkRadius = (name, ...r) => { for (const v of r) if (v < 0) throw new Error(`${name} radius ${v} is negative`); };
  const ctx = new Proxy({}, {
    get(target, key) {
      if (key in target) return target[key];
      if (key === 'save') return () => { state.depth++; };
      if (key === 'restore') return () => { state.depth--; };
      if (key === 'arc') return (x, y, r) => checkRadius('arc', r);
      if (key === 'ellipse') return (x, y, rx, ry) => checkRadius('ellipse', rx, ry);
      if (key === 'measureText') return () => ({ width: 0 });
      if (/^create/.test(String(key))) return () => gradient;
      return () => {};
    },
    set(target, key, value) { target[key] = value; return true; },
  });
  return { ctx, state };
}

for (const fps of [60, 144, 180, 240]) {
  test(`every teen pattern draws without canvas errors and balanced save/restore at ${fps}Hz`, () => {
    const dt = 1 / fps, failures = [];
    for (const [name, make] of Object.entries(TEEN_PATTERNS)) {
      const bullets = [], box = { x: 140, y: 150, w: 200, h: 150 }, soul = { x: 240, y: 225, r: 6, hits: 0 };
      let seed = 1;
      const api = new Proxy({ box, soul, rnd: () => ((seed = (seed * 16807) % 2147483647) / 2147483647), emit: (o) => { const b = new Bullet(o); bullets.push(b); return b; } }, {
        get(target, key) { return key in target ? target[key] : () => {}; },
      });
      const { ctx, state } = mockCtx();
      try {
        const p = make();
        for (let t = 0; t < Math.min(p.duration ?? 8, 12); t += dt) {
          p.update(t, dt, api);
          // 실제 전투처럼 새로 나온 탄은 첫 프레임에 그려진다(이번 프레임 update 전)
          for (const b of bullets) { b.draw(ctx); assert.equal(state.depth, 0, `${name} leaves save() open`); b.update(dt); }
        }
      } catch (error) { failures.push(`${name}: ${error.message}`); }
    }
    assert.deepEqual(failures, []);
  });
}
