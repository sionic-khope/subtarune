// 영클 적 턴 모드 'youngcle_cage'(BUILD207 사용자 브리핑): 하트를 철창에 가두고 8초 레이저 차징. ←→ 를 번갈아 연타하면 철창이 점점 깨지고(30번),
//   적당히 빠르게(초당 5번) 누르면 2초쯤 남기고 부서진다. 부수고 나면 레이저 범위(철창 높이의 가로 띠) 밖(위·아래)으로 나가야 한다. 8초에 레이저 발사 — 띠 안에 있으면 피해.
//   상자 아래에 ←→ 연타 안내(화살표가 번갈아 깜빡임).
import L from '../../data/locale/ko.js';
import { FONT } from '../../ui/font.js';

export const YOUNGCLE_CAGE = { charge: 8.0, required: 30, band: 60, cage: 56, fire: 0.5, after: 1.0, stand: [432, 254] };

export function createYoungcleCage(battle, { enemy }) {
  const C = YOUNGCLE_CAGE, board = battle.board, soul = battle.soul;
  const [bw, bh] = battle.boardSize(); board.setTarget(bw, bh, 240, 214); board.snap(); soul.center(board.rect); soul.invuln = 0;
  const yc = battle.enemies.find(e => e.id === 'youngcle_hover' && !e.dead) || enemy;
  const cage = { x: soul.x, y: soul.y };
  let t = 0, progress = 0, last = null, broken = false, brokeAt = 0, fired = false, hit = false, done = false, ticks = -1, disposed = false;
  battle.sfx('cannon_charge', { volume: 0.8 });
  return {
    get snapshot() { return { t, progress, broken, brokeAt, fired, hit, done, soul: { x: soul.x, y: soul.y }, cage: { ...cage }, band: C.band }; },
    update(dt, input) {
      if (disposed) return true;
      t += dt; yc.patternPose = { x: C.stand[0], y: C.stand[1] };
      if (!broken) {
        const key = input.just('left') ? 'left' : input.just('right') ? 'right' : null;
        if (key && key !== last) {                          // 같은 키 연타는 안 센다 — 좌우좌우
          last = key; progress = Math.min(1, progress + 1 / C.required); battle.sfx('menumove', { volume: 0.35 });
          if (progress >= 1) { broken = true; brokeAt = t; battle.sfx('pop'); battle.game.shake = { time: 0.15, amp: 2 }; }
        }
      } else if (!fired) soul.update(dt, input, board);
      const tick = Math.floor(t * 2);
      if (t >= C.charge - 3.2 && t < C.charge && tick !== ticks) { ticks = tick; battle.sfx('laser_charge_tick', { volume: 0.45 }); }
      if (!fired && t >= C.charge) {
        fired = true; battle.sfx('laser_fire'); battle.game.shake = { time: 0.45, amp: 6 };
        if (Math.abs(soul.y - cage.y) <= C.band / 2 + soul.r - 2) { hit = true; battle.hurtParty(yc.def.damage ?? 14); }
      }
      if (fired && t >= C.charge + C.fire + C.after) done = true;
      return done;
    },
    draw(ctx) {
      const r = board.rect; board.draw(ctx);
      ctx.save(); ctx.beginPath(); ctx.rect(r.x + 3, r.y + 3, r.w - 6, r.h - 6); ctx.clip();
      const by = Math.round(cage.y - C.band / 2), charge = Math.min(1, t / C.charge);
      if (!fired || t < C.charge + C.fire) {                // 레이저 범위 띠: 차징 중 점점 붉어지고 깜빡임 → 발사 때 밝게
        if (fired) { ctx.fillStyle = 'rgba(255,90,90,0.95)'; ctx.fillRect(r.x, by, r.w, C.band); ctx.fillStyle = '#fff'; ctx.fillRect(r.x, by + 10, r.w, C.band - 20); }
        else { ctx.fillStyle = `rgba(255,50,50,${0.12 + 0.3 * charge})`; ctx.fillRect(r.x, by, r.w, C.band); if (Math.floor(t * (4 + charge * 10)) % 2 === 0) { ctx.strokeStyle = '#ff5050'; ctx.lineWidth = 2; ctx.strokeRect(r.x + 1, by + 1, r.w - 2, C.band - 2); } }
      }
      if (!broken || t - brokeAt < 0.35) {                   // 철창: 강철 위·아래판 + 청록 살 다섯, 진행에 따라 금이 간다. 부서지면 살이 흩어진다
        const k = broken ? (t - brokeAt) / 0.35 : 0, cx = Math.round(cage.x), cy = Math.round(cage.y), half = C.cage / 2;
        ctx.globalAlpha = 1 - k;
        ctx.fillStyle = '#3a4556'; ctx.fillRect(cx - half, cy - half, C.cage, 7); ctx.fillRect(cx - half, cy + half - 7, C.cage, 7);
        ctx.fillStyle = '#8fa0b6'; ctx.fillRect(cx - half, cy - half, C.cage, 2);
        for (let i = 0; i < 5; i++) { const bx = cx - half + 6 + i * 11 + (broken ? (i - 2) * 26 * k : 0); ctx.fillStyle = '#60f4e0'; ctx.fillRect(bx, cy - half + 7 + (broken ? 30 * k : 0), 3, C.cage - 14); }
        const cracks = Math.floor(progress * 6); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
        for (let i = 0; i < cracks; i++) { const sx = cx - half + 8 + ((i * 37) % (C.cage - 16)), sy = cy - half + 8 + ((i * 23) % (C.cage - 16)); ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + 6, sy + 5); ctx.lineTo(sx + 4, sy + 11); ctx.lineTo(sx + 10, sy + 16); ctx.stroke(); }
        ctx.globalAlpha = 1;
      }
      soul.draw(ctx);
      ctx.restore();
      // 영클 앞 붉은 차징 구슬(포드 왼쪽) — 커지며 깜빡이다 발사 때 띠로 이어진다
      const gx = C.stand[0] - 62, gy = C.stand[1] - 58, gr = fired ? 22 : 4 + 16 * charge;
      ctx.fillStyle = `rgba(255,70,70,${fired ? 1 : 0.55 + 0.35 * (Math.floor(t * 10) % 2)})`; ctx.beginPath(); ctx.arc(gx, gy, gr, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(gx, gy, Math.max(1, gr * 0.4), 0, Math.PI * 2); ctx.fill();
      if (fired && t < C.charge + C.fire) { ctx.fillStyle = 'rgba(255,90,90,0.95)'; ctx.fillRect(r.x + r.w - 3, by, gx - (r.x + r.w), C.band); ctx.fillStyle = '#fff'; ctx.fillRect(r.x + r.w - 3, by + 10, gx - (r.x + r.w), C.band - 20); }
      // ←→ 연타 안내(상자 아래): 화살표가 번갈아 밝아지고 진행 막대
      if (!broken) {
        const hy = r.y + r.h + 6, on = Math.floor(t * 5) % 2 === 0;
        ctx.font = FONT; ctx.textBaseline = 'top'; ctx.textAlign = 'center';
        ctx.fillStyle = on ? '#ffe066' : '#6b6b6b'; ctx.fillText('◀', 208, hy); ctx.fillStyle = on ? '#6b6b6b' : '#ffe066'; ctx.fillText('▶', 272, hy);
        ctx.fillStyle = '#fff'; ctx.fillText(L.battle_cage_mash, 240, hy);
        ctx.fillStyle = '#333'; ctx.fillRect(180, hy + 20, 120, 5); ctx.fillStyle = '#60f4e0'; ctx.fillRect(180, hy + 20, Math.round(120 * progress), 5);
        ctx.textAlign = 'left';
      }
    },
    dispose() { disposed = true; yc.patternPose = null; battle.board.setTarget(440, 72, 240, 282); },
  };
}
