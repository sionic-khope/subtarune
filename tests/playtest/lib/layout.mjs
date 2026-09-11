// 플레이테스트 공용 레이아웃 도우미 (2026-09-11 레이아웃 포스트모텀): 화면에 그려지는 사각형을 재서 "잘림·겹침·가림" 을 숫자로 검사한다.
//   run.sh 가 tests/playtest/lib/ 를 PW_DIR/lib 로 복사한다. import { rectsOf, inside, overlap, DIALOGUE_VISIBLE_H } from './lib/layout.mjs'
export const SCREEN_W = 480, SCREEN_H = 360;
export const DIALOGUE_VISIBLE_H = 230;   // 대화창 위 보이는 높이 (src/core/layout.js 와 같아야 한다 — layout.test 가 코드 리터럴과 대조)
export const BATTLE_PANEL_TOP = 246;
export const inside = (r, box) => r.x >= box.x && r.y >= box.y && r.x + r.w <= box.x + box.w && r.y + r.h <= box.y + box.h;
export const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
/** 필드 엔티티들의 그려지는 사각형(월드 좌표) + 카메라 뷰. ids: 'player' 또는 엔티티 id */
export async function rectsOf(page, ids) {
  return page.evaluate(async (ids) => {
    const { CHAR_SCALE } = await import('/src/world/world.js');
    const rect = (e) => { if (!e || !e.sprite) return null; const w = Math.round(e.sprite.fw / e.sprite.px * CHAR_SCALE), h = Math.round(e.sprite.fh / e.sprite.px * CHAR_SCALE); return { x: Math.round(e.x + e.w / 2 - w / 2), y: Math.round(e.y + e.h - h), w, h }; };
    const g = (id) => id === 'player' ? game.player : game.entities.find((k) => k.id === id && !k.dead);
    const out = { cam: { x: Math.round(game.camera.x), y: Math.round(game.camera.y), w: 480, h: 360 }, view: { x: Math.round(game.camera.x), y: Math.round(game.camera.y), w: 480, h: 230 } };
    for (const id of ids) out[id] = rect(g(id));
    return out;
  }, ids);
}
/** 전투 적 그림 사각형(화면 좌표) — 단일 PNG / 격자 시트 / 레거시 한 줄 시트 모두 */
export async function enemyRects(page) {
  return page.evaluate(() => game.battle.enemies.map((e) => { const sh = e.def.sheet, s0 = e.def.scale ?? 1; let fw, fh, s;
    if (sh && sh.count) { fw = e.img.width / sh.cols; fh = e.img.height / (sh.rows || 1); s = s0 / (sh.px || 1); }
    else if (sh) { fw = e.img.width / sh.cols; fh = e.img.height / sh.rows; s = s0 / 2; const dw = fw * s, dh = fh * s; return { id: e.id, x: Math.round(e.x - dw / 2), y: Math.round(e.y - dh), w: Math.round(dw), h: Math.round(dh) }; }
    else { fw = e.img.width; fh = e.img.height; s = s0; }
    const [pvx, pvy] = e.def.pivot || [fw / 2, fh]; return { id: e.id, x: Math.round(e.x - pvx * s), y: Math.round(e.y - pvy * s), w: Math.round(fw * s), h: Math.round(fh * s) }; }));
}
