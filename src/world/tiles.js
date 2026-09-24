// ─────────────────────────────────────────────────────────────
// 타일 레지스트리. 맵 문자열의 글자 하나 = 타일 하나.
// 새 타일 추가: registerTile('기호', { name, solid, draw | art })
// assets/tiles/<name>.png 가 있으면 그 이미지가 우선 적용된다.
// ─────────────────────────────────────────────────────────────
import { artToCanvas, makeCanvas, mulberry32, loadImageOptional } from '../core/gfx.js';
import { TILE_ART } from '../data/art.js';
import { WATER_WALK } from '../data/footsteps.js';

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
export async function loadTileOverrides(chars = null) {
  await Promise.all(allTiles().filter((def) => !chars || chars.has(def.char)).map(async (def) => {
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
registerTile('!', { name: 'backdrop_void', solid: true, draw: () => {} });

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
registerTile('M', { name: 'maillard_deck', solid: false,
  draw: (ctx) => { ctx.fillStyle = '#785132'; ctx.fillRect(0, 0, ART_PX, ART_PX); } });
for (const [char, solid] of [['I', false], ['J', true]]) {
  registerTile(char, { name: 'youngcle_iron', solid,
    stepSfx: { sounds: ['iron_step_1', 'iron_step_2'], volume: 0.35, distance: 24 },
    draw: (ctx) => { ctx.fillStyle = '#52647b'; ctx.fillRect(0, 0, ART_PX, ART_PX); } });
}
// 용광로 구역(BUILD188): 차콜 철 + 파란 기운 바닥/벽(assets/tiles/youngcle_iron_blue.png), 용암(뗏목으로만 건넌다)
registerTile('F', { name: 'youngcle_iron_blue', solid: false,
  stepSfx: { sounds: ['iron_step_1', 'iron_step_2'], volume: 0.35, distance: 24 },
  draw: (ctx) => { ctx.fillStyle = '#2f3a4a'; ctx.fillRect(0, 0, ART_PX, ART_PX); } });
// 벽은 바닥과 다른 그림(어두운 판) — 같은 그림이면 용암 위아래 띠가 길처럼 보인다(BUILD191 사용자)
registerTile('G', { name: 'youngcle_iron_blue_wall', solid: true, draw: (ctx) => { ctx.fillStyle = '#151a22'; ctx.fillRect(0, 0, ART_PX, ART_PX); } });
// 가장자리 출입구 칸: 바닥과 같은 그림이고 **걷는다** — 맵 밖은 tileAt() 이 ' '(막힘)를 돌려주므로 떨어질 수 없다. 문 트리거는 이 칸의 맵 끝 쪽 10px 에 두어 끝까지 걸어가야 넘어간다
// (BUILD192 “포탈이 벽 블럭으로 막혀 있으면” → BUILD194 “포탈을 끝으로 둬야지, 다 도달하기 전에 이동되게 한 블럭 당기냐”: 막힌 칸이던 때는 그 앞 칸에서 이동돼 한 칸 일찍 넘어가는 것으로 보였다)
registerTile('H', { name: 'youngcle_iron_blue_solid', solid: false,
  stepSfx: { sounds: ['iron_step_1', 'iron_step_2'], volume: 0.35, distance: 24 },
  draw: (ctx) => { ctx.fillStyle = '#2f3a4a'; ctx.fillRect(0, 0, ART_PX, ART_PX); } });
registerTile('L', { name: 'lava', solid: true, draw: (ctx) => { ctx.fillStyle = '#7a1a08'; ctx.fillRect(0, 0, ART_PX, ART_PX); } });
// 엄청대박인배 다리길(BUILD201, youngcle19): 용암 위 다리 바닥(걷는다) — 용광로 바닥 + 위아래 쇠 테두리·리벳(tools/art/ship_bridge_set.py). 광장 다리 판과 같은 무늬
registerTile('N', { name: 'youngcle_bridge_deck', solid: false,
  stepSfx: { sounds: ['iron_step_1', 'iron_step_2'], volume: 0.35, distance: 24 },
  draw: (ctx) => { ctx.fillStyle = '#2f3a4a'; ctx.fillRect(0, 0, ART_PX, ART_PX); } });
registerTile('S', { name: 'sign', solid: true, art: TILE_ART.sign, drawOver: ',' });
registerTile('C', { name: 'chest', solid: true, art: TILE_ART.chest, drawOver: '.' });
registerTile('B', { name: 'bed', solid: false, art: TILE_ART.bed, drawOver: '.' });   // 침대 위로 올라갈 수 있음(눕기 연출)
registerTile('K', { name: 'desk', solid: true, art: TILE_ART.desk, drawOver: '.' });
registerTile('W', { name: 'window', solid: true, art: TILE_ART.window });
// ── 직접 그린 32px 세트 (assets/tiles/<name>.png 가 본체. 없으면 단색 폴백) ──
const flat = (col) => (ctx) => { ctx.fillStyle = col; ctx.fillRect(0, 0, ART_PX, ART_PX); };
registerTile('░', { name: 'castle321_floor', solid: false, draw: flat('#442052') });
registerTile('▱', { name: 'castle321_steps', solid: false, draw: flat('#6b2d85') });
registerTile('╞', { name: 'castle321_edge_left', solid: true, draw: flat('#442052') });
registerTile('╡', { name: 'castle321_edge_right', solid: true, draw: flat('#442052') });
// BUILD327 남색 오르막(샘 회랑): castle321 모양 그대로 남색으로 칠한 세트(tools/art/castle327_spire_set.py)
registerTile('▒', { name: 'castle327_floor', solid: false, draw: flat('#1b2350') });
registerTile('╟', { name: 'castle327_edge_left', solid: true, draw: flat('#1b2350') });
registerTile('╢', { name: 'castle327_edge_right', solid: true, draw: flat('#1b2350') });
registerTile('⌂', { name: 'gajaeman_castle_floor', solid: false, draw: flat('#30283e') });
registerTile('⌁', { name: 'gajaeman_castle_cracked', solid: false, draw: flat('#30283e') });
registerTile('▥', { name: 'gajaeman_castle_wall', solid: true, draw: flat('#171421') });
registerTile('▦', { name: 'castle308_wall', solid: true, draw: flat('#15151c') });
registerTile('♜', { name: 'castle306_floor', solid: false, draw: flat('#282430') });
registerTile('♠', { name: 'castle306_moss', solid: false, draw: flat('#322739') });
registerTile('♣', { name: 'castle306_cracked', solid: false, draw: flat('#282430') });
registerTile('♦', { name: 'castle306_moss_dense', solid: false, draw: flat('#392d45') });
const CASTLE_STEP = { ...WATER_WALK, ripple: false };
registerTile('♤', { name: 'castle307_floor', solid: false, step: CASTLE_STEP, draw: flat('#17141e') });
registerTile('♧', { name: 'castle307_moss', solid: false, step: CASTLE_STEP, draw: flat('#251d30') });
registerTile('♨', { name: 'castle307_lava', solid: true, draw: flat('#8725bb') });
registerTile('♩', { name: 'castle307_lava_dark', solid: true, draw: flat('#45165d') });
registerTile('≈', { name: 'night_coast_rock', solid: false, draw: flat('#424b60') });
registerTile('≋', { name: 'night_coast_edge', solid: true, draw: flat('#242c40') });
registerTile(':', { name: 'ship_lounge_floor', solid: false, draw: flat('#333746') });
registerTile(';', { name: 'ship_lounge_floor_alt', solid: false, draw: flat('#39394a') });
registerTile('/', { name: 'ship_lounge_runner', solid: false, draw: flat('#49305d') });
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
registerTile('r', { name: 'stone_teal', solid: false, draw: flat('#3b5957') });        // 고대 사원 판석(걸을 수 있음) — 청록숲9 (2026-09-11, tools/art/temple_set.py)
registerTile('R', { name: 'stone_teal_moss', solid: false, draw: flat('#3b5957') });   // 이끼·금 간 판석
registerTile('m', { name: 'forest_floor_teal', solid: true, draw: flat('#154844') });
registerTile('d', { name: 'ground_teal_shade', solid: false, draw: flat('#061412') });   // 그늘 진 땅(걸을 수 있음): 나무 뒤 숨는 공간 (청록숲7, 2026-09-11)   // 숲 바닥(막힘): 길 밖 나무들이 서는 어두운 땅 — 허공에 뜬 나무 방지 (2026-09-11 사용자)
registerTile('o', { name: 'water_blue', solid: true, draw: flat('#2f4fa8') });    // 파란 물길 (뗏목으로만 건넌다)
registerTile('O', { name: 'water_blue2', solid: true, draw: flat('#2f4fa8') });
// 옵젝영역(obj0~, tools/art/obj_set.py, 2026-09-11): 얕은 물 바닥(걸을 수 있음, 밟으면 step 효과음 + 물결 고리 — Player.footstep) / 수련잎 / 초록·보라 숲 바닥(막힘) / 절벽면
// `step`: 그 타일을 밟을 때 나는 **걸음 소리**. 이름 하나 또는 이름 배열(걸음마다 하나를 골라 쓴다).
//   물걸음 사운드 = 델타룬 walking 효과음 영상을 그대로 이어 트는 루프(WATER_WALK, src/data/footsteps.js · design/audio/references.md). Player 가 걷는 동안 Sound.walk 로 튼다
const WATER_STEP = WATER_WALK;
registerTile('a', { name: 'water_shallow', solid: false, step: WATER_STEP, draw: flat('#1a5561') });
registerTile('A', { name: 'water_shallow2', solid: false, step: WATER_STEP, draw: flat('#1a5561') });
registerTile('j', { name: 'water_shallow_pad', solid: false, step: WATER_STEP, draw: flat('#1a5561') });
registerTile('E', { name: 'baron_nest_wet', solid: false, step: WATER_STEP, draw: flat('#263e43') });
registerTile('c', { name: 'forest_floor_obj', solid: true, draw: flat('#0f2f18') });
registerTile('Y', { name: 'water_shallow_edge', solid: true, draw: flat('#1a5561') });   // 물처럼 보이지만 막힘 — 맵 가장자리 밖으로 이어지는 물길(컷신 NPC 가 달려 나가는 바닥, Z 의 물 판). 옵젝영역1 오른쪽 끝
registerTile('V', { name: 'cliff_obj', solid: true, draw: flat('#0b2412') });
registerTile('b', { name: 'bridge_purple', solid: false, draw: flat('#8a6238') });   // 레버로 내려오는 다리 (tileSwaps 로 ' ' → 'b')
registerTile('s', { name: 'stairs_purple', solid: false, draw: flat('#5e2f98') });   // 위 발판으로 오르는 계단
registerTile('@', { name: 'jjajang_forest_black', solid: true, draw: flat('#060707') });
registerTile('%', { name: 'jjajang_path_black', solid: false, draw: flat('#242726') });
// 짜장섬 길의 가장자리 출입구 칸(용광로 H 와 같은 역할): 그림은 길과 같고, 맵 끝 10px 문을 밟아 다음 맵으로(BUILD225 해안 ↔ 짜장숲)
registerTile('&', { name: 'jjajang_path_edge', solid: false, draw: flat('#242726') });
// 짜장숲부터의 길(BUILD226 사용자 “그 숲부터는 발소리도 오브제맵 발소리 써줄 수 있나”): 그림은 해안 길과 같고 발소리만 옵젝영역0 얕은 물의 에코 걸음 루프(WATER_WALK).
// 물이 아니라 검은 흙길이라 물결 고리는 내지 않는다(ripple false — Character.footstep). 해안('%')은 그대로 무음
const FOREST_STEP = { ...WATER_WALK, ripple: false };
registerTile('$', { name: 'jjajang_path_echo', solid: false, step: FOREST_STEP, draw: flat('#242726') });
registerTile('U', { name: 'jjajang_deep_path', solid: false, step: FOREST_STEP, draw: flat('#1f2221') });   // 깊은숲 입구(jjajang_deep, BUILD254): 짜장 길(#242726)보다 조금 어두운 길, 발소리는 같은 숲 에코 ('I' 는 조종실 철판). #161918 은 사용자 화면에서 아무것도 안 보였다(BUILD255)
registerTile('^', { name: 'jjajang_deep_edge', solid: false, step: FOREST_STEP, draw: flat('#1f2221') });   // 깊은숲 입구 길 가장자리 출입구 칸(문이 덮는다) — '&' 와 같은 역할, 어두운 색
// 짜장 소나무 숲 공터의 풀숲(BUILD226 사용자 “거기 중간에 풀숲하고 적당히 정사각형의 공간”): 길 바닥 위에 어두운 풀잎 다발, 걸을 수 있고 발소리는 길과 같다
// 더 울창하게(BUILD227 사용자 “가운데 풀숲 더 울창하게”): 칸마다 다른 풀잎 14~18개가 두 겹으로, 아래는 어두운 덤불 띠. variants 3 으로 칸마다 모양이 다르다
const thicket = (ctx, rng) => {
  ctx.fillStyle = '#1b2a1e'; ctx.fillRect(0, 0, ART_PX, ART_PX);
  const count = 14 + Math.floor(rng() * 5);
  for (let i = 0; i < count; i++) {
    const x = Math.floor(rng() * ART_PX), h = 5 + Math.floor(rng() * 9), y = ART_PX - h - Math.floor(rng() * 3), w = 1 + Math.floor(rng() * 2);
    ctx.fillStyle = i % 3 === 0 ? '#2c5230' : i % 3 === 1 ? '#1e3a22' : '#356338'; ctx.fillRect(x, y, w, h);
  }
  ctx.fillStyle = '#122016'; ctx.fillRect(0, ART_PX - 2, ART_PX, 2);
  for (let i = 0; i < 4; i++) { const x = Math.floor(rng() * ART_PX); ctx.fillStyle = '#3f7a44'; ctx.fillRect(x, 2 + Math.floor(rng() * 6), 1, 2); }
};
registerTile('"', { name: 'jjajang_thicket', solid: false, step: FOREST_STEP, variants: 3, draw: thicket });
registerTile('?', { name: 'jjajang_sand', solid: false, draw: flat('#b08e59') });
// 벚꽃 숲(jjajang_sakura, BUILD261 사용자 “검은색 풀숲의 땅 타일을 만들어서 좀 구분되게 … 땅이 분홍색 꽃들로 다 바뀌는 … 벚꽃맵부터는 발소리 안나게”):
//   '(' 검은 풀숲 땅 — 깊은숲 길(#1f2221)보다 초록기가 도는 검은 풀밭에 짧은 풀잎, ')' 분홍 꽃잎 땅 — 짙은 분홍 바탕에 밝은 꽃잎 점. 둘 다 step 없음(걸음 소리 무음)
const darkMeadow = (ctx, rng) => {
  fillNoise(ctx, '#131a15', ['#1a2519', '#0d120e', '#213024'], rng, 10);
  const blades = 5 + Math.floor(rng() * 4);
  for (let i = 0; i < blades; i++) { const x = Math.floor(rng() * ART_PX), h = 2 + Math.floor(rng() * 3); ctx.fillStyle = i % 2 ? '#22331f' : '#1b2a1e'; ctx.fillRect(x, ART_PX - h - Math.floor(rng() * 6), 1, h); }
};
const petalMeadow = (ctx, rng) => {
  fillNoise(ctx, '#8e3a6f', ['#a8478a', '#6e2a55', '#c05a9c'], rng, 12);
  const petals = 4 + Math.floor(rng() * 3);
  for (let i = 0; i < petals; i++) { const x = Math.floor(rng() * (ART_PX - 1)), y = Math.floor(rng() * (ART_PX - 1)); ctx.fillStyle = i % 3 === 0 ? '#ffc2e0' : i % 3 === 1 ? '#ff8ad0' : '#f4a6d6'; ctx.fillRect(x, y, 2, i % 2 ? 1 : 2); }
};
registerTile('(', { name: 'sakura_dark_meadow', solid: false, variants: 4, draw: darkMeadow });
// 벚꽃 숲 3(jjajang_sakura3, BUILD264 “뗏목 오른쪽으로 파란물 길”): 파란 물길 — 뗏목으로만 건넌다(막힘). 짙은 파랑에 옅은 물비늘 몇 줄과 떠 있는 분홍 꽃잎 한두 점
const sakuraWater = (ctx, rng) => {
  fillNoise(ctx, '#27439a', ['#2f52b4', '#1f367e', '#3a5fc4'], rng, 8);
  for (let i = 0; i < 2; i++) { const x = Math.floor(rng() * 10), y = 2 + Math.floor(rng() * 12); ctx.fillStyle = '#5d7fd6'; ctx.fillRect(x, y, 4 + Math.floor(rng() * 4), 1); }
  if (rng() < 0.5) { ctx.fillStyle = rng() < 0.5 ? '#ffc2e0' : '#ff8ad0'; ctx.fillRect(Math.floor(rng() * 14), Math.floor(rng() * 14), 2, 1); }
};
registerTile('[', { name: 'sakura_water', solid: true, variants: 4, draw: sakuraWater });
registerTile(')', { name: 'sakura_petal_meadow', solid: false, variants: 4, draw: petalMeadow });
// 벚꽃 숲 11 나무 정상(jjajang_sakura11, BUILD283 “나무 정상같은 느낌의 나뭇바닥과 벚꽃들”): 가로 널빤지 두 장(이음매 8px), 세로 이음은 엇갈리게, 옅은 결, 분홍 꽃잎 한 점. 발소리 없음(벚꽃 맵 규칙)
const sakuraDeck = (ctx, rng) => {
  fillNoise(ctx, '#7a4a35', ['#85533b', '#6c4030', '#8f5a42'], rng, 10);
  ctx.fillStyle = '#4a2a1e';
  for (let y = 0; y < ART_PX; y += 8) ctx.fillRect(0, y, ART_PX, 1);
  for (let i = 0; i < 2; i++) { const jx = Math.floor(rng() * ART_PX); ctx.fillRect(jx, i * 8 + 1, 1, 7); }
  ctx.fillStyle = '#96614a';
  for (let i = 0; i < 3; i++) { const y = 2 + Math.floor(rng() * 5) + (i % 2) * 8, x = Math.floor(rng() * 8); ctx.fillRect(x, y, 4 + Math.floor(rng() * 6), 1); }
  if (rng() < 0.6) { ctx.fillStyle = rng() < 0.5 ? '#ffc2e0' : '#ff8ad0'; ctx.fillRect(Math.floor(rng() * 14), Math.floor(rng() * 14), 2, rng() < 0.5 ? 1 : 2); }
};
registerTile('-', { name: 'sakura_deck', solid: false, variants: 4, draw: sakuraDeck });
// 벚꽃 숲 5(jjajang_sakura5, BUILD271 “나무다리 3초정도 걷고”): 파란 물 위 나무다리 바닥 — 걷는 방향(가로)과 직각으로 놓인 널빤지(세로 이음매 8px 마다), 옅은 결·못 자국. 발소리 없음(벚꽃 맵 규칙)
const sakuraBridgeDeck = (ctx, rng) => {
  fillNoise(ctx, '#a0703f', ['#b07d48', '#8f6236', '#b9885a'], rng, 10);
  for (let x = 0; x < ART_PX; x += 8) { ctx.fillStyle = '#5a3a1e'; ctx.fillRect(x, 0, 1, ART_PX); ctx.fillStyle = '#c99a66'; ctx.fillRect(x + 1, 0, 1, ART_PX); }
  const grains = 3 + Math.floor(rng() * 3);
  for (let i = 0; i < grains; i++) { const x = 2 + Math.floor(rng() * (ART_PX - 3)), y = Math.floor(rng() * (ART_PX - 6)); ctx.fillStyle = i % 2 ? '#8a5c33' : '#c08a56'; ctx.fillRect(x, y, 1, 3 + Math.floor(rng() * 4)); }
  if (rng() < 0.6) { const x = 3 + 8 * Math.floor(rng() * 4), y = 3 + Math.floor(rng() * (ART_PX - 6)); ctx.fillStyle = '#3d2814'; ctx.fillRect(x, y, 2, 2); ctx.fillStyle = '#d8b088'; ctx.fillRect(x, y, 1, 1); }
};
registerTile(']', { name: 'sakura_bridge_deck', solid: false, variants: 4, draw: sakuraBridgeDeck });
// 파란 토리이 길(jjajang_run, BUILD230 사용자 “검은 바닥인데 물 깔린 전제라 한 발자국 할 때마다 동그란 파장이 타다다닥”): 거의 검은 물 위에 옅은 물비늘 몇 줄, 걸을 수 있고 발소리는 물걸음 루프 + 물결 고리(ripple)
const blackWater = (ctx, rng) => {
  ctx.fillStyle = '#06080c'; ctx.fillRect(0, 0, ART_PX, ART_PX);
  for (let i = 0; i < 3; i++) { ctx.fillStyle = i === 0 ? '#182634' : '#101820'; ctx.fillRect(Math.floor(rng() * ART_PX), Math.floor(rng() * ART_PX), 2 + Math.floor(rng() * 4), 1); }
};
registerTile('*', { name: 'jjajang_black_water', solid: false, step: WATER_STEP, variants: 3, draw: blackWater });
// 검은 물길의 가장자리 출입구 칸('&' 와 같은 역할, 그림만 검은 물) — 회색 길 가장자리 그림이 검은 물 위에 상자로 보이던 것
registerTile('+', { name: 'jjajang_black_water_edge', solid: false, step: WATER_STEP, variants: 3, draw: blackWater });
