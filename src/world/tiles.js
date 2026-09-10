// ─────────────────────────────────────────────────────────────
// 타일 레지스트리. 맵 문자열의 글자 하나 = 타일 하나.
// 새 타일 추가: registerTile('기호', { name, solid, draw | art })
// assets/tiles/<name>.png 가 있으면 그 이미지가 우선 적용된다.
// ─────────────────────────────────────────────────────────────
import { artToCanvas, makeCanvas, mulberry32, loadImageOptional } from '../core/gfx.js';
import { TILE_ART } from '../data/art.js';

export const TILE = 32;        // 월드 타일 크기(논리 px)
export const ART_PX = 16;      // 타일 도트 아트 원본 크기 (TILE 로 정수배 확대)

const registry = new Map();
const cache = new Map();     // name → canvas[] (variants)

export function registerTile(char, def) {
  if (registry.has(char)) console.warn(`[tiles] '${char}' 타일 덮어씀`);
  registry.set(char, { char, variants: 1, ...def });
}
export function getTile(char) { return registry.get(char) || registry.get(' '); }
export function allTiles() { return [...registry.values()]; }

/** 타일 이미지(변형 index) 반환. 처음 호출 시 굽고 캐시. */
export function tileCanvas(def, variant = 0) {
  let list = cache.get(def.name);
  if (!list) {
    list = [];
    for (let v = 0; v < def.variants; v++) {
      if (def.override) {
        list.push(def.override);
      } else if (def.art) {
        list.push(artToCanvas(def.art.art, def.art.palette));
      } else {
        const c = makeCanvas(ART_PX, ART_PX);
        def.draw(c.getContext('2d'), mulberry32(def.name.length * 7919 + v * 104729));
        list.push(c);
      }
    }
    cache.set(def.name, list);
  }
  return list[variant % list.length];
}

/** assets/tiles/*.png 오버라이드 로드 (없으면 조용히 통과) */
export async function loadTileOverrides() {
  await Promise.all(allTiles().map(async (def) => {
    const img = await loadImageOptional(`assets/tiles/${def.name}.png`);
    if (img) { def.override = img; cache.delete(def.name); }
  }));
}

// ── 프로시저럴 타일 그리기 도우미 ─────────────────────────────
function fillNoise(ctx, base, specks, rng, count) {
  ctx.fillStyle = base; ctx.fillRect(0, 0, ART_PX, ART_PX);
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = specks[Math.floor(rng() * specks.length)];
    ctx.fillRect(Math.floor(rng() * ART_PX), Math.floor(rng() * ART_PX), 1 + Math.floor(rng() * 2), 1);
  }
}

// ── 기본 타일 ────────────────────────────────────────────────
registerTile(' ', { name: 'void', solid: true, draw: (ctx) => { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, ART_PX, ART_PX); } });

registerTile(',', {
  name: 'grass', solid: false, variants: 4,
  draw: (ctx, rng) => fillNoise(ctx, '#2f6b3e', ['#3a7d4a', '#28593a', '#4b8f55'], rng, 14),
});
registerTile("'", {
  name: 'grass_flower', solid: false, variants: 3,
  draw: (ctx, rng) => {
    fillNoise(ctx, '#2f6b3e', ['#3a7d4a', '#28593a'], rng, 10);
    for (let i = 0; i < 2; i++) {
      const x = 2 + Math.floor(rng() * 11), y = 2 + Math.floor(rng() * 11);
      ctx.fillStyle = ['#ffe066', '#ff8ad0', '#ffffff'][Math.floor(rng() * 3)];
      ctx.fillRect(x, y, 2, 2);
      ctx.fillStyle = '#28593a'; ctx.fillRect(x, y + 2, 1, 2);
    }
  },
});
registerTile('_', {
  name: 'path', solid: false, variants: 3,
  draw: (ctx, rng) => fillNoise(ctx, '#8a6f4e', ['#9c7f5c', '#7a6144', '#a88a66'], rng, 12),
});
registerTile('~', {
  name: 'water', solid: true, variants: 2,
  draw: (ctx, rng) => {
    fillNoise(ctx, '#244a8a', ['#2c5aa6', '#1d3d73'], rng, 8);
    ctx.fillStyle = '#5c8fd6';
    for (let i = 0; i < 3; i++) ctx.fillRect(Math.floor(rng() * 12), Math.floor(rng() * 15), 3 + Math.floor(rng() * 3), 1);
  },
});
registerTile('.', {
  name: 'floor', solid: false, variants: 2,
  draw: (ctx, rng) => {
    ctx.fillStyle = '#5a4a5c'; ctx.fillRect(0, 0, ART_PX, ART_PX);
    ctx.fillStyle = '#4e404f';
    for (let y = 0; y < ART_PX; y += 8) for (let x = ((y / 8) % 2) * 8; x < ART_PX; x += 16) ctx.fillRect(x, y, 8, 8);
    ctx.fillStyle = '#6b596c';
    for (let i = 0; i < 4; i++) ctx.fillRect(Math.floor(rng() * ART_PX), Math.floor(rng() * ART_PX), 1, 1);
  },
});
registerTile('=', {
  name: 'rug', solid: false,
  draw: (ctx) => {
    ctx.fillStyle = '#7a2b3a'; ctx.fillRect(0, 0, ART_PX, ART_PX);
    ctx.fillStyle = '#a03a4c'; ctx.fillRect(2, 2, 12, 12);
    ctx.fillStyle = '#c9a15a'; ctx.fillRect(4, 4, 8, 8);
    ctx.fillStyle = '#a03a4c'; ctx.fillRect(6, 6, 4, 4);
  },
});
registerTile('#', { name: 'wall', solid: true, art: TILE_ART.wall });
registerTile('T', { name: 'tree', solid: true, art: TILE_ART.tree, drawOver: ',' });
registerTile('D', { name: 'door', solid: false, art: TILE_ART.door });
registerTile('S', { name: 'sign', solid: true, art: TILE_ART.sign, drawOver: ',' });
registerTile('C', { name: 'chest', solid: true, art: TILE_ART.chest, drawOver: '.' });
registerTile('B', { name: 'bed', solid: false, art: TILE_ART.bed, drawOver: '.' });   // 침대 위로 올라갈 수 있음(눕기 연출)
registerTile('K', { name: 'desk', solid: true, art: TILE_ART.desk, drawOver: '.' });
registerTile('W', { name: 'window', solid: true, art: TILE_ART.window });
// ── 직접 그린 32px 세트 (assets/tiles/<name>.png 가 본체. 없으면 단색 폴백) ──
const flat = (col) => (ctx) => { ctx.fillStyle = col; ctx.fillRect(0, 0, ART_PX, ART_PX); };
registerTile('p', { name: 'wallpaper', solid: true, draw: flat('#e9d8a6') });
registerTile('q', { name: 'wallpaper_base', solid: true, draw: flat('#8a5a3c') });
registerTile('e', { name: 'wall_edge', solid: true, draw: flat('#6b4229') });   // 측면/하단 벽
registerTile('f', { name: 'floor_vinyl', solid: false, draw: flat('#c9a26a') });
registerTile('g', { name: 'floor_vinyl2', solid: false, draw: flat('#c9a26a') });
// 거실/부엌 세트 (tools/art/living_set.py)
registerTile('P', { name: 'wallpaper2', solid: true, draw: flat('#e6d6c4') });
registerTile('Q', { name: 'wallpaper2_base', solid: true, draw: flat('#8a5a3c') });
registerTile('h', { name: 'floor_plank', solid: false, draw: flat('#b98c5e') });
registerTile('i', { name: 'floor_plank2', solid: false, draw: flat('#b98c5e') });
registerTile('k', { name: 'floor_kitchen', solid: false, draw: flat('#d8d2c4') });
registerTile('l', { name: 'floor_kitchen2', solid: false, draw: flat('#d8d2c4') });
// 허공의 보라색 땅 (tools/art/void_set.py)
registerTile('x', { name: 'ground_purple', solid: false, draw: flat('#4a2578') });
registerTile('X', { name: 'ground_purple2', solid: false, draw: flat('#4a2578') });
registerTile('z', { name: 'flower_purple', solid: false, draw: flat('#4a2578') });
registerTile('Z', { name: 'ground_purple_solid', solid: true, draw: flat('#4a2578') });   // 땅처럼 보이지만 막힘 — 맵 가장자리 밖으로 이어지는 길(컷신 NPC 가 걸어 나가는 바닥, void10 출구). 맵 규칙 '사방 막힘' 을 지키면서 공중부양을 막는다 (2026-09-10)
registerTile('y', { name: 'cliff_purple', solid: true, draw: flat('#2a1240') });
// 청록숲 (tools/art/teal_set.py, 2026-09-10): 검은 배경 + 청록 땅. t/u 땅 체커, w 잔풀 땅, v 절벽면(막힘)
registerTile('t', { name: 'ground_teal', solid: false, draw: flat('#1f6b66') });
registerTile('u', { name: 'ground_teal2', solid: false, draw: flat('#1f6b66') });
registerTile('w', { name: 'grass_teal', solid: false, draw: flat('#1f6b66') });   // ('g' 는 방 바닥 floor_vinyl2 — 2026-09-10 잘못 덮어썼다가 되돌림)
registerTile('v', { name: 'cliff_teal', solid: true, draw: flat('#0f3a38') });
registerTile('n', { name: 'leaves_teal', solid: false, draw: flat('#1f6b66') });   // 낙엽 깔린 땅 (청록숲 3)
registerTile('o', { name: 'water_blue', solid: true, draw: flat('#2f4fa8') });    // 파란 물길 (뗏목으로만 건넌다)
registerTile('O', { name: 'water_blue2', solid: true, draw: flat('#2f4fa8') });
registerTile('b', { name: 'bridge_purple', solid: false, draw: flat('#8a6238') });   // 레버로 내려오는 다리 (tileSwaps 로 ' ' → 'b')
registerTile('s', { name: 'stairs_purple', solid: false, draw: flat('#5e2f98') });   // 위 발판으로 오르는 계단
