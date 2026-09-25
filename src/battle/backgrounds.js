import { TEEN_BATTLE } from '../data/teen-battle.js';
// ─────────────────────────────────────────────────────────────
// 전투 배경 레지스트리 (2026-09-11, 사용자 "전투맵을 색다르게 — 기믹 확장성"): 전투 cfg.bg 이름 → 그리기 함수 (ctx, battle).
//   registerBattleBg('name', fn) 로 새 배경을 끼운다. 맵 JSON `battleBg` 또는 컷신 { battle:{ bg } } 로 고른다. 없는 이름은 검정.
//   teal   : 청록숲 — 위쪽에 흐릿한 잎 뭉치(살짝 흔들림)
//   temple : 고대 사원 광장(델타룬 왕 전투 참고) — 어두운 기둥·아치 실루엣 + 둥근 판석 무대(원근 줄눈) + 가운데 신성한 오브젝트 문양(빛나는 테). 한 번 그려 캐시
// ─────────────────────────────────────────────────────────────
import { makeCanvas } from '../core/gfx.js';
import { getTile, tileCanvas } from '../world/tiles.js';
import { drawMankatsukiBackground } from './mankatsuki-background.js';
import { drawParkGuardianBackground } from './park-guardian-background.js';
import { drawChoimisSkyBackground } from './choimis-sky-background.js';
import { drawCastleMemoryBackground } from './castle-memory-background.js';
export const BATTLE_BGS = {};
/** 새 전투 배경 등록: fn(ctx, battle) — 480×360, 패널(y 246~)·HP 띠는 위에 덮인다 */
export function registerBattleBg(name, fn) { BATTLE_BGS[name] = fn; }

registerBattleBg('mankatsuki_vortex', drawMankatsukiBackground);
registerBattleBg('editor_union_stage', drawParkGuardianBackground);
registerBattleBg('choimis_sky', drawChoimisSkyBackground);
registerBattleBg('castle_memory', drawCastleMemoryBackground);

// BUILD339 청소년전: 꼭대기 끝길 그대로(부서진 끝 조각 왼쪽 절반을 화면에) — 사용자 “맵은 그냥 거기서 바로 진행”
registerBattleBg('castle_summit', (ctx, battle) => {
  // BUILD342: 필드 대치 화면 그대로(같은 카메라의 끝길 그림 + 뒤 연기) — 전투로 넘어가도 배경이 바뀌지 않는다(사용자 “전투화면과 일반화면이 이질감없게”)
  const [cx, cy] = TEEN_BATTLE.view.cam, images = battle.game.propImages;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 480, 360);
  for (let i = 0; i < 2; i++) { const img = images[`assets/props/summit336_chunk_${i}.png`]; if (img) ctx.drawImage(img, i * 1152 - cx, -cy); }
  battle.support?.smoke?.draw(ctx, { x: cx, y: cy }, 'back');
});

const drumNestCaches = new WeakMap();
registerBattleBg('drum_nest', (ctx, battle) => {
  let canvas = drumNestCaches.get(battle.game);
  if (!canvas) {
    canvas = makeCanvas(480, 360);
    const g = canvas.getContext('2d'); g.imageSmoothingEnabled = false;
    g.fillStyle = g.createPattern(tileCanvas(getTile('@')), 'repeat'); g.fillRect(0, 0, 480, 360);
    g.fillStyle = g.createPattern(tileCanvas(getTile('$')), 'repeat');
    g.beginPath(); g.ellipse(240, 228, 300, 178, 0, 0, Math.PI * 2); g.fill();
    const big = battle.game.propImages['assets/props/jjajang_drum_pile_big.png'];
    const small = battle.game.propImages['assets/props/jjajang_drum_pile_small.png'];
    if (big) for (const [x, y, w] of [[-18, 24, 140], [99, 5, 142], [229, 3, 140], [356, 22, 142]]) {
      g.drawImage(big, x, y, w, Math.round(w * big.height / big.width));
    }
    // 왼쪽 아래 작은 더미([-24, 121])는 뺐다 — 요플래 바로 옆이라 답답해 보임(사용자 2026-09-20 "요플래 옆에있는 왼쪽 드럼통은 치우고")
    if (small) for (const [x, y, w] of [[397, 123, 110]]) {
      g.drawImage(small, x, y, w, Math.round(w * small.height / small.width));
    }
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, 0, 480, 360);
    drumNestCaches.set(battle.game, canvas);
  }
  ctx.drawImage(canvas, 0, 0);
});

let factoryCache = null, bridgeCache = null;
registerBattleBg('youngcle_factory', (ctx, battle) => {
  if (!factoryCache) {
    factoryCache = makeCanvas(480, 360);
    const g = factoryCache.getContext('2d');
    g.imageSmoothingEnabled = false;
    const factory = battle.game.propImages['assets/backdrops/youngcle_factory.png'];
    if (factory) g.drawImage(factory, 0, 0, 480, 176, 0, 0, 480, 88);
    g.fillStyle = g.createPattern(tileCanvas(getTile('I')), 'repeat');
    g.fillRect(0, 88, 480, 272);
    g.fillStyle = 'rgba(0,0,0,0.40)'; g.fillRect(0, 0, 480, 360);
  }
  ctx.drawImage(factoryCache, 0, 0);
});

/** 조종실 전투 배경(BUILD210 사용자 “배경 더 웅장하게, 맵 가운데 영클 얼굴 발판, 바닥도”): gpt-image-2.5-sunburst 로 만든 앞 벽(케이블 다발·플라즈마 배관·대형 레이더 모니터, assets/backdrops/ship_battle_wall.png 480×320 의 윗부분)
 *  + 조종실 철판 바닥(youngcle_iron_blue 타일) 가운데에 영클 얼굴 강철 로고(맵과 같은 ship_floor_logo.png) + 벽·바닥 이음새 케이블을 따라 흐르는 플라즈마 구슬 + 바닥 가장자리 어둡게 */
registerBattleBg('youngcle_bridge', (ctx, battle) => {
  const FLOOR = 100, WALL_Y = -40;
  if (!bridgeCache) {
    bridgeCache = makeCanvas(480, 360);
    const g = bridgeCache.getContext('2d'); g.imageSmoothingEnabled = false;
    const wall = battle.game.propImages['assets/backdrops/ship_battle_wall.png'], tile = battle.game.propImages['assets/tiles/youngcle_iron_blue.png'], logo = battle.game.propImages['assets/props/ship_floor_logo.png'];
    g.fillStyle = '#0b0f16'; g.fillRect(0, 0, 480, 360);
    if (wall) { g.save(); g.beginPath(); g.rect(0, 0, 480, FLOOR); g.clip(); g.drawImage(wall, 0, WALL_Y, 480, 320); g.restore(); }
    if (tile) { g.fillStyle = g.createPattern(tile, 'repeat'); g.fillRect(0, FLOOR, 480, 360 - FLOOR); } else { g.fillStyle = '#232a36'; g.fillRect(0, FLOOR, 480, 360 - FLOOR); }
    g.fillStyle = 'rgba(0,0,0,0.30)'; g.fillRect(0, FLOOR, 480, 360 - FLOOR);
    if (logo) { g.save(); g.globalAlpha = 0.92; g.drawImage(logo, 240 - 78, 150, 156, 156); g.restore(); }   // 가운데 영클 얼굴 발판
    const vg = g.createLinearGradient(0, FLOOR, 0, 360); vg.addColorStop(0, 'rgba(0,0,0,0.35)'); vg.addColorStop(0.25, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.35)'); g.fillStyle = vg; g.fillRect(0, FLOOR, 480, 360 - FLOOR);   // 벽 밑 그늘·아래 어둡게
    g.fillStyle = '#0d1219'; g.fillRect(0, FLOOR - 3, 480, 6); g.fillStyle = '#2a3442'; g.fillRect(0, FLOOR - 1, 480, 2);   // 이음새 케이블
    for (const x of [24, 456]) { g.fillStyle = '#0d1219'; g.fillRect(x - 3, FLOOR, 6, 260); g.fillStyle = '#2a3442'; g.fillRect(x - 1, FLOOR, 2, 260); }   // 바닥 양옆 케이블
    factoryCache = factoryCache || null;
  }
  ctx.drawImage(bridgeCache, 0, 0);
  const t = battle.t;
  ctx.save();
  for (let i = 0; i < 5; i++) { const x = ((t * 80 + i * 100) % 500) - 10; for (let k = 3; k >= 0; k--) { ctx.fillStyle = k ? 'rgba(96,244,224,0.35)' : '#60f4e0'; ctx.fillRect(Math.round(x - k * 6) - 2, FLOOR - 2, 4, 4); } }   // 이음새를 따라 흐르는 플라즈마
  for (const x of [24, 456]) { const y = FLOOR + ((t * 60 + x) % 260); for (let k = 3; k >= 0; k--) { ctx.fillStyle = k ? 'rgba(201,166,255,0.35)' : '#c9a6ff'; ctx.fillRect(x - 2, Math.round(y - k * 6), 4, 4); } }      // 양옆 케이블은 보라 구슬
  ctx.restore();
});

registerBattleBg('teal', (ctx, b) => {
  ctx.save(); ctx.globalAlpha = 0.16;
  const blobs = [[30, 8, 58], [120, -6, 70], [220, 10, 62], [330, -4, 74], [430, 12, 60], [70, 40, 34], [280, 44, 38], [400, 46, 30]];
  for (const [x, y, r] of blobs) { ctx.fillStyle = '#1c6e66'; ctx.beginPath(); ctx.arc(x + Math.sin(b.t * 0.3 + x) * 2, y, r, 0, Math.PI * 2); ctx.fill(); }
  ctx.globalAlpha = 0.1; ctx.fillStyle = '#2c9a8f';
  for (const [x, y, r] of blobs) { ctx.beginPath(); ctx.arc(x + 10, y - 8, r * 0.55, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
});

let templeCache = null;
function buildTemple() {
  const c = makeCanvas(480, 360), g = c.getContext('2d');
  // 뒷벽: 위가 더 어두운 청록 돌
  const wall = g.createLinearGradient(0, 0, 0, 140); wall.addColorStop(0, '#040e0d'); wall.addColorStop(1, '#0f2a28'); g.fillStyle = wall; g.fillRect(0, 0, 480, 140);
  // 기둥 실루엣(뒤) + 가운데 아치
  g.fillStyle = '#081b1a';
  for (const [x, w, top] of [[28, 20, 26], [92, 16, 40], [160, 22, 18], [300, 22, 18], [372, 16, 40], [432, 20, 26]]) { g.fillRect(x, top, w, 140 - top); g.fillRect(x - 4, top, w + 8, 8); g.fillRect(x - 3, 128, w + 6, 8); }
  g.fillStyle = '#06201e'; g.beginPath(); g.moveTo(190, 140); g.lineTo(190, 60); g.quadraticCurveTo(240, 10, 290, 60); g.lineTo(290, 140); g.closePath(); g.fill();
  g.strokeStyle = '#1d4b47'; g.lineWidth = 3; g.beginPath(); g.moveTo(192, 140); g.lineTo(192, 62); g.quadraticCurveTo(240, 14, 288, 62); g.lineTo(288, 140); g.stroke();
  g.fillStyle = 'rgba(255,217,138,0.18)'; g.fillRect(230, 78, 20, 30); g.fillStyle = 'rgba(255,217,138,0.45)'; g.fillRect(236, 86, 8, 14);   // 아치 안 희미한 빛
  // 둥근 판석 무대
  const rr = (x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r); g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h); g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r); g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y); g.closePath(); };
  rr(18, 92, 444, 176, 30); g.fillStyle = '#1b3332'; g.fill();                                   // 테두리(어두운 돌)
  rr(26, 98, 428, 166, 26); g.fillStyle = '#2f4a49'; g.fill();                                   // 바닥
  g.save(); rr(26, 98, 428, 166, 26); g.clip();
  g.strokeStyle = 'rgba(22,48,47,0.75)'; g.lineWidth = 2;
  for (let y = 112; y < 264; y += 22) { g.beginPath(); g.moveTo(0, y); g.lineTo(480, y); g.stroke(); }                                  // 가로 줄눈
  for (let xb = -48; xb <= 528; xb += 48) { const xt = 240 + (xb - 240) * 0.82; g.beginPath(); g.moveTo(xt, 98); g.lineTo(xb, 264); g.stroke(); }   // 세로 줄눈(살짝 원근)
  g.strokeStyle = 'rgba(90,128,125,0.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(40, 101); g.lineTo(440, 101); g.stroke();          // 윗변 하이라이트
  // 가운데 신성한 오브젝트 문양: 큰 마름모 + 원 + 빛나는 테
  g.fillStyle = '#1c3634'; g.beginPath(); g.moveTo(240, 108); g.lineTo(316, 180); g.lineTo(240, 252); g.lineTo(164, 180); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(90,128,125,0.55)'; g.lineWidth = 3; g.stroke();
  g.fillStyle = '#0d2321'; g.beginPath(); g.arc(240, 180, 24, 0, Math.PI * 2); g.fill();
  g.strokeStyle = 'rgba(255,217,138,0.28)'; g.lineWidth = 4; g.beginPath(); g.arc(240, 180, 30, 0, Math.PI * 2); g.stroke();
  g.fillStyle = 'rgba(255,217,138,0.5)'; g.fillRect(236, 176, 8, 8);
  g.restore();
  // 좌우 비네트
  const vl = g.createLinearGradient(0, 0, 90, 0); vl.addColorStop(0, 'rgba(0,0,0,0.55)'); vl.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = vl; g.fillRect(0, 0, 90, 360);
  const vr = g.createLinearGradient(480, 0, 390, 0); vr.addColorStop(0, 'rgba(0,0,0,0.55)'); vr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = vr; g.fillRect(390, 0, 90, 360);
  return c;
}
registerBattleBg('temple', (ctx) => { if (!templeCache) templeCache = buildTemple(); ctx.drawImage(templeCache, 0, 0); });

let nestCache = null;
// 벚꽃 숲 전투 배경(BUILD266): 검은 밤 + 양옆 벚꽃 나무 판(맵이 미리 적재한 assets/props/jjajang_sakura_N.png) + 떨어지는 분홍 꽃잎 점
registerBattleBg('sakura', (ctx, battle) => {
  // 나무는 멀리 뒤(위쪽 띠)에만, 밑동이 y 120 위에서 끝나게 — 캐릭터 발(y 144~246) 아래에 나무가 깔리면 “나무 위에 서 있는” 것처럼 보였다(사용자 2026-09-20). 바닥은 어두운 분홍 땅 띠
  const imgs = battle.game?.propImages || {};
  ctx.save();
  ctx.fillStyle = '#0a0608'; ctx.fillRect(0, 0, 480, 246);
  const H = 96;   // 지평선: 맨 위 동료(발 y ≈ 144)보다 위 — 세 명 모두 땅 띠 위에 선다
  ctx.globalAlpha = 0.3;
  for (const [file, x, s] of [['assets/props/jjajang_sakura_1.png', -16, 0.5], ['assets/props/jjajang_sakura_2.png', 84, 0.46], ['assets/props/jjajang_sakura_3.png', 176, 0.42], ['assets/props/jjajang_sakura_4.png', 256, 0.5], ['assets/props/jjajang_sakura_2.png', 352, 0.46], ['assets/props/jjajang_sakura_3.png', 428, 0.42]]) {
    const im = imgs[file]; if (!im) continue; const w = Math.round(im.width * s), h = Math.round(im.height * s); ctx.drawImage(im, x, H - h, w, h);
  }
  ctx.globalAlpha = 1;
  const ground = ctx.createLinearGradient(0, H, 0, 246); ground.addColorStop(0, '#2a1224'); ground.addColorStop(0.3, '#1a0b17'); ground.addColorStop(1, '#0a0608');
  ctx.fillStyle = ground; ctx.fillRect(0, H, 480, 246 - H);
  ctx.fillStyle = '#3a1830'; ctx.fillRect(0, H, 480, 2);
  ctx.globalAlpha = 0.85;
  for (let i = 0; i < 26; i++) { const ph = (battle.t * (14 + (i % 5) * 4) + i * 37) % 300, x = (i * 71 + Math.sin(battle.t * 1.3 + i) * 14) % 480; ctx.fillStyle = i % 3 ? '#ff8ad0' : '#ffc2e0'; ctx.fillRect(Math.round(x), Math.round(ph - 20), 2, 2); }
  ctx.restore();
});
registerBattleBg('baron_nest', (ctx, battle) => {
  if (!nestCache) {
    nestCache = makeCanvas(480, 360);
    const g = nestCache.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.fillStyle = g.createPattern(tileCanvas(getTile('a')), 'repeat');
    g.fillRect(0, 0, 480, 360);
    g.fillStyle = g.createPattern(tileCanvas(getTile('E')), 'repeat');
    g.beginPath(); g.ellipse(240, 214, 290, 164, 0, 0, Math.PI * 2); g.fill();
    const thorns = battle.game.propImages['assets/props/baron_thorns.png'];
    if (thorns) for (let x = -32; x < 480; x += 48) g.drawImage(thorns, x, -26 + Math.round(Math.abs(x - 240) / 12), 80, 80);
    g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(0, 0, 480, 360);
  }
  ctx.drawImage(nestCache, 0, 0);
});
