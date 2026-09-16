// 영클 적 턴 모드 'youngcle_cage'(BUILD207~209 사용자 브리핑): 하트를 철창에 가두고 8초 레이저 차징. ←→ 를 번갈아 연타하면 철창이 점점 깨지고(35번),
//   적당히 빠르게(초당 5~6번) 누르면 2초쯤 남기고 부서진다. 부수고 나면 레이저 범위(철창 높이의 가로 띠) 밖(위·아래)으로 나가야 한다. 8초에 레이저 발사 — 3초 동안 이어지며 띠 안에 있으면 계속 피해.
//   BUILD209: ① 갇히기 전 예고(위에서 철창이 떨어져 내려와 철컥 잠김 0.9초, 하트 위 ‘!’) — 준비할 시간. ② 발사가 ‘뿅’ 하고 끝나지 않고 3초 지속(사용자). ③ 소리는 델타룬 재사용: 잠김 snd_locker(locker), 차징 snd_chargeshot_charge(laser_charge),
//   발사 snd_chargeshot_fire(laser_blast) + 지속 snd_dtrans_drone(laser_beam), 막판 틱 snd_spearappear. ④ 차징 구슬에 빨려드는 입자·빛살, 발사 때 흰 섬광·흔들림·굵은 빔·불꽃.
import L from '../../data/locale/ko.js';
import { FONT } from '../../ui/font.js';

export const YOUNGCLE_CAGE = { drop: 0.9, charge: 8.0, required: 35, band: 60, cage: 56, fire: 3.0, after: 0.8, stand: [394, 148], orbGap: 26 };   // stand: 나람과 안 겹치는 상자 오른쪽 위, orbGap: 구슬은 띠 높이·상자 오른쪽 바깥(빔이 수평으로 이어진다)

export function createYoungcleCage(battle, { enemy }) {
  const C = YOUNGCLE_CAGE, board = battle.board, soul = battle.soul, TAU = Math.PI * 2;
  const [bw, bh] = battle.boardSize(); board.setTarget(bw, bh, 240, 214); board.snap(); soul.center(board.rect); soul.invuln = 0;
  const yc = battle.enemies.find(e => e.id === 'youngcle_hover' && !e.dead) || enemy;
  const cage = { x: soul.x, y: soul.y };
  let t = 0, progress = 0, last = null, locked = false, broken = false, brokeAt = 0, fired = false, hit = false, done = false, ticks = -1, disposed = false, chargeSfx = false, flash = 0, sparks = [];
  const chargeT = () => Math.max(0, t - C.drop);                       // 잠긴 뒤부터 8초
  const lockAt = C.drop, fireAt = C.drop + C.charge, endAt = fireAt + C.fire;
  battle.sfx('locker', { volume: 0.9 });
  return {
    get snapshot() { return { t, progress, locked, broken, brokeAt, fired, hit, done, soul: { x: soul.x, y: soul.y }, cage: { ...cage }, band: C.band, beamLeft: fired ? Math.max(0, endAt - t) : null }; },
    update(dt, input) {
      if (disposed) return true;
      t += dt; yc.patternPose = { x: C.stand[0], y: C.stand[1] }; if (flash > 0) flash -= dt;
      if (!locked && t >= lockAt) { locked = true; battle.sfx('laser_charge', { volume: 0.8 }); battle.game.shake = { time: 0.12, amp: 2 }; }
      if (locked && !broken) {
        const key = input.just('left') ? 'left' : input.just('right') ? 'right' : null;
        if (key && key !== last) {                          // 같은 키 연타는 안 센다 — 좌우좌우
          last = key; progress = Math.min(1, progress + 1 / C.required); battle.sfx('menumove', { volume: 0.35 });
          if (progress >= 1) { broken = true; brokeAt = t; battle.sfx('pop'); battle.game.shake = { time: 0.15, amp: 2 }; }
        }
      } else if (broken) soul.update(dt, input, board);
      const ct = chargeT(), tick = Math.floor(ct * 2);
      if (locked && ct >= C.charge - 3.0 && ct < C.charge && tick !== ticks) { ticks = tick; battle.sfx('spearappear', { volume: 0.4 }); }
      if (locked && !chargeSfx && ct >= C.charge - 1.3) { chargeSfx = true; battle.sfx('laser_charge', { volume: 1 }); }
      if (!fired && t >= fireAt) { fired = true; flash = 0.35; battle.sfx('laser_blast', { volume: 1 }); battle.sfx('laser_beam', { volume: 0.9 }); battle.game.shake = { time: 0.6, amp: 9 }; }
      if (fired && t < endAt) {                             // 3초 동안 빔이 이어진다: 띠 안이면 계속 피해(무적 시간 뒤 다시)
        if (soul.invuln <= 0 && Math.abs(soul.y - cage.y) <= C.band / 2 + soul.r - 2) { hit = true; battle.hurtParty(yc.def.damage ?? 14); }
        if (Math.random() < 0.5) sparks.push({ x: board.rect.x + Math.random() * board.rect.w, y: cage.y + (Math.random() < 0.5 ? -1 : 1) * (C.band / 2 + 2), vy: (Math.random() - 0.5) * 60, life: 0.35 });
        if (Math.floor(t * 30) % 10 === 0) battle.game.shake = { time: 0.08, amp: 3 };
      }
      for (const s of sparks) { s.y += s.vy * dt; s.life -= dt; } sparks = sparks.filter(s => s.life > 0);
      if (fired && t >= endAt + C.after) done = true;
      return done;
    },
    draw(ctx) {
      const r = board.rect; board.draw(ctx);
      ctx.save(); ctx.beginPath(); ctx.rect(r.x + 3, r.y + 3, r.w - 6, r.h - 6); ctx.clip();
      const by = Math.round(cage.y - C.band / 2), charge = Math.min(1, chargeT() / C.charge), beaming = fired && t < endAt;
      if (beaming) {                                        // 굵은 빔: 바깥 빛무리 → 붉은 몸통 → 흰 심 + 가장자리 깜빡임
        const fl = Math.floor(t * 24) % 2, k = Math.min(1, (t - fireAt) / 0.12);
        ctx.fillStyle = 'rgba(255,80,80,0.35)'; ctx.fillRect(r.x, by - 14 * k, r.w, (C.band + 28) * k);
        ctx.fillStyle = 'rgba(255,90,90,0.95)'; ctx.fillRect(r.x, by, r.w, C.band * k);
        ctx.fillStyle = fl ? '#fff' : '#ffe8e8'; ctx.fillRect(r.x, by + 10, r.w, Math.max(0, (C.band - 20) * k));
        ctx.fillStyle = '#fff'; for (const s of sparks) ctx.fillRect(Math.round(s.x), Math.round(s.y), 3, 3);
      } else if (!fired) {                                  // 레이저 범위 띠: 차징 중 점점 붉어지고 깜빡임
        ctx.fillStyle = `rgba(255,50,50,${0.12 + 0.3 * charge})`; ctx.fillRect(r.x, by, r.w, C.band);
        if (Math.floor(t * (4 + charge * 10)) % 2 === 0) { ctx.strokeStyle = '#ff5050'; ctx.lineWidth = 2; ctx.strokeRect(r.x + 1, by + 1, r.w - 2, C.band - 2); }
      }
      if (!broken || t - brokeAt < 0.35) {                   // 철창: 위에서 떨어져 내려와 잠긴다 → 강철 위·아래판 + 청록 살 다섯, 진행에 따라 금이 간다 → 부서지면 살이 흩어진다
        const k = broken ? (t - brokeAt) / 0.35 : 0, drop = locked ? 0 : Math.round((1 - Math.min(1, t / lockAt)) * (cage.y - r.y + C.cage)), cx = Math.round(cage.x), cy = Math.round(cage.y) - drop, half = C.cage / 2;
        ctx.globalAlpha = 1 - k;
        ctx.fillStyle = '#3a4556'; ctx.fillRect(cx - half, cy - half, C.cage, 7); ctx.fillRect(cx - half, cy + half - 7, C.cage, 7);
        ctx.fillStyle = '#8fa0b6'; ctx.fillRect(cx - half, cy - half, C.cage, 2);
        for (let i = 0; i < 5; i++) { const bx = cx - half + 6 + i * 11 + (broken ? (i - 2) * 26 * k : 0); ctx.fillStyle = '#60f4e0'; ctx.fillRect(bx, cy - half + 7 + (broken ? 30 * k : 0), 3, C.cage - 14); }
        const cracks = Math.floor(progress * 6); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
        for (let i = 0; i < cracks; i++) { const sx = cx - half + 8 + ((i * 37) % (C.cage - 16)), sy = cy - half + 8 + ((i * 23) % (C.cage - 16)); ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + 6, sy + 5); ctx.lineTo(sx + 4, sy + 11); ctx.lineTo(sx + 10, sy + 16); ctx.stroke(); }
        ctx.globalAlpha = 1;
      }
      soul.draw(ctx);
      if (!locked) { ctx.font = FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillStyle = Math.floor(t * 8) % 2 ? '#ffe066' : '#fff'; ctx.fillText('!', Math.round(soul.x), Math.round(soul.y) - 44); ctx.textAlign = 'left'; }
      ctx.restore();
      // 영클 앞 붉은 차징 구슬(포드 왼쪽): 빛살이 돌고 입자가 빨려든다 → 발사 때 띠로 이어진다
      const gx = r.x + r.w + C.orbGap, gy = Math.round(cage.y), gr = fired ? 24 : 4 + 16 * charge, px = C.stand[0] - 22, py = C.stand[1] - 26;   // 구슬 · 포드 아래(에너지 선 출발점)
      if (locked) { ctx.save(); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(gx, gy); ctx.strokeStyle = fired ? 'rgba(255,90,90,0.9)' : `rgba(255,90,90,${0.25 + 0.5 * charge})`; ctx.lineWidth = fired ? 6 : 2 + 2 * charge; ctx.stroke(); if (fired) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke(); } ctx.restore(); }   // 포드 → 구슬 에너지 선
      if (locked && !fired) { for (let i = 0; i < 8; i++) { const a = t * 2.6 + i * TAU / 8, d = 40 - ((t * 60 + i * 9) % 40); ctx.fillStyle = 'rgba(255,120,120,0.85)'; ctx.fillRect(Math.round(gx + Math.cos(a) * d) - 1, Math.round(gy + Math.sin(a) * d) - 1, 3, 3); }
        ctx.strokeStyle = `rgba(255,90,90,${0.3 + 0.5 * charge})`; ctx.lineWidth = 1.5; for (let i = 0; i < 6; i++) { const a = -t * 3 + i * TAU / 6; ctx.beginPath(); ctx.moveTo(gx + Math.cos(a) * gr, gy + Math.sin(a) * gr); ctx.lineTo(gx + Math.cos(a) * (gr + 8 + 10 * charge), gy + Math.sin(a) * (gr + 8 + 10 * charge)); ctx.stroke(); } }
      ctx.fillStyle = `rgba(255,70,70,${fired ? 1 : 0.55 + 0.35 * (Math.floor(t * 10) % 2)})`; ctx.beginPath(); ctx.arc(gx, gy, gr, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(gx, gy, Math.max(1, gr * 0.45), 0, TAU); ctx.fill();
      if (beaming) { const x0 = r.x + r.w - 3, w = gx - x0; ctx.fillStyle = 'rgba(255,80,80,0.35)'; ctx.fillRect(x0, by - 14, w, C.band + 28); ctx.fillStyle = 'rgba(255,90,90,0.95)'; ctx.fillRect(x0, by, w, C.band); ctx.fillStyle = '#fff'; ctx.fillRect(x0, by + 10, w, C.band - 20); }   // 구슬 → 띠 오른쪽 끝: 수평 빔
      if (flash > 0) { ctx.fillStyle = `rgba(255,255,255,${Math.min(0.85, flash * 2.4)})`; ctx.fillRect(0, 0, 480, 360); }
      // ←→ 연타 안내(상자 아래): 화살표가 번갈아 밝아지고 진행 막대. 잠기기 전엔 “갇힌다!”
      if (!broken) {
        const hy = r.y + r.h + 6, on = Math.floor(t * 5) % 2 === 0;
        ctx.font = FONT; ctx.textBaseline = 'top'; ctx.textAlign = 'center';
        if (locked) { ctx.fillStyle = on ? '#ffe066' : '#6b6b6b'; ctx.fillText('◀', 208, hy); ctx.fillStyle = on ? '#6b6b6b' : '#ffe066'; ctx.fillText('▶', 272, hy); ctx.fillStyle = '#fff'; ctx.fillText(L.battle_cage_mash, 240, hy);
          ctx.fillStyle = '#333'; ctx.fillRect(180, hy + 20, 120, 5); ctx.fillStyle = '#60f4e0'; ctx.fillRect(180, hy + 20, Math.round(120 * progress), 5); }
        else { ctx.fillStyle = '#ffe066'; ctx.fillText(L.battle_cage_incoming, 240, hy); }
        ctx.textAlign = 'left';
      }
    },
    dispose() { disposed = true; yc.patternPose = null; battle.board.setTarget(440, 72, 240, 282); },
  };
}
