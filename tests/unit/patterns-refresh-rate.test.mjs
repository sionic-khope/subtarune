// BUILD445(사용자 윈도우 콘솔 “arc … radius (-0.16) is negative”): 고주사율 모니터(짧은 dt)에서 강제퇴장 파동의 안쪽 고리 반지름이 음수가 되어
// arc 가 예외 → save()·clip() 이 풀리지 않아 전투 화면이 상자 안만 갱신됐다.
// BUILD446: 청소년만이 아니라 모든 적의 패턴 설정(+기본 설정)을 여러 주사율로, 실제 전투 순서(패턴 update → 탄 update → 그리기)로 돌려 본다.
import test from 'node:test';
import assert from 'node:assert/strict';
import { PATTERNS, Bullet } from '../../src/battle/bullets.js';
import { ENEMIES } from '../../src/data/enemies.js';

function mockCtx() {
  const state = { depth: 0 };
  const gradient = { addColorStop() {} };
  const negative = (name, ...radii) => { for (const v of radii) if (v < 0) throw new Error(`${name} radius ${v} is negative`); };
  const finite = (name, values) => { for (const v of values) if (!Number.isFinite(v)) throw new Error(`${name} got ${v}`); };
  const ctx = new Proxy({}, {
    get(target, key) {
      if (key in target) return target[key];
      if (key === 'save') return () => { state.depth++; };
      if (key === 'restore') return () => { state.depth--; };
      if (key === 'arc') return (x, y, r) => negative('arc', r);
      if (key === 'arcTo') return (x1, y1, x2, y2, r) => negative('arcTo', r);
      if (key === 'ellipse') return (x, y, rx, ry) => negative('ellipse', rx, ry);
      if (key === 'createRadialGradient') return (...a) => { finite('createRadialGradient', a); negative('createRadialGradient', a[2], a[5]); return gradient; };
      if (key === 'createLinearGradient') return (...a) => { finite('createLinearGradient', a); return gradient; };
      if (key === 'measureText') return () => ({ width: 0 });
      if (key === 'getImageData') return () => ({ data: new Uint8ClampedArray(4) });
      if (/^create/.test(String(key))) return () => gradient;
      return () => {};
    },
    set(target, key, value) { target[key] = value; return true; },
  });
  return { ctx, state };
}

// 탄 그림을 보라로 물들이는 등 오프스크린 캔버스를 쓰는 패턴용
globalThis.document ??= { createElement: () => ({ width: 32, height: 32, getContext: () => mockCtx().ctx }) };
const FAKE_IMAGE = { width: 32, height: 32, naturalWidth: 32, complete: true };

const configs = new Map();
for (const [id, def] of Object.entries(ENEMIES)) {
  for (const c of [...(def.patterns || []), ...(def.enragedPatterns || [])]) if (c?.type && PATTERNS[c.type]) configs.set(`${id}:${c.type}:${JSON.stringify(c)}`, c);
}
for (const type of Object.keys(PATTERNS)) if (![...configs.values()].some((c) => c.type === type)) configs.set(`default:${type}`, { type });

function run(cfg, fps) {
  const dt = 1 / fps, bullets = [], box = { x: 140, y: 150, w: 200, h: 150 }, soul = { x: 240, y: 225, r: 6, hits: 0, invuln: 0 };
  let seed = 7;
  const api = {
    box, soul, rnd: () => ((seed = (seed * 16807) % 2147483647) / 2147483647), actor: { x: 360, y: 120, scale: 1 },
    images: new Proxy({}, { get: () => FAKE_IMAGE }),
    emit: (o) => { const b = new Bullet(o); bullets.push(b); return b; },
    penalty: () => { bullets.length = 0; }, clearHazards: () => { bullets.length = 0; },
    flash() {}, shake() {}, present() {}, sfx() {}, say() {}, trackProjectile() {}, vacuum() {},
    startRapVideo: () => null, stopRapVideo() {}, syncRapVideo() {}, interceptionActive: () => false, just: () => false,
  };
  const { ctx, state } = mockCtx();
  const p = PATTERNS[cfg.type](cfg);
  const end = Math.min(p.duration ?? 8, 14);
  for (let t = 0; t < end; t += dt) {
    p.update(t, dt, api);
    for (const b of bullets) b.update(dt, { rect: box });
    for (const b of bullets) { b.draw(ctx); if (state.depth !== 0) throw new Error(`save/restore off by ${state.depth}`); }
  }
}

for (const fps of [60, 144, 180, 240, 360]) {
  test(`every enemy pattern draws without canvas errors and with balanced save/restore at ${fps}Hz`, () => {
    const failures = [];
    for (const [key, cfg] of configs) { try { run(cfg, fps); } catch (error) { failures.push(`${key.slice(0, 80)}: ${error.message}`); } }
    assert.deepEqual(failures, []);
  });
}
