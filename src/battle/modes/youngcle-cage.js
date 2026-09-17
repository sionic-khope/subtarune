// 영클 적 턴 모드 'youngcle_cage'(BUILD207~210 사용자 브리핑): 하트를 철창에 가두고 8초 레이저 차징. ←→ 를 번갈아 연타하면 철창이 점점 깨지고(35번),
//   적당히 빠르게(초당 5~6번) 누르면 2초쯤 남기고 부서진다. 부수고 나면 레이저 범위(철창 높이의 가로 띠) 밖(위·아래)으로 나가야 한다. 8초에 레이저 발사 — 3초 동안 이어지며 띠 안에 있으면 계속 피해.
//   흐름(BUILD210 “좀 더 자연스럽게”): 철창이 위에서 떨어져 내려와(‘!’, “철창이 내려온다!”) 철컥 잠김(불꽃·흔들림) → 아래에 “좌우로 연타해라!” 가 페이드인했다 사라진다 → 연타 안내(◀ 연타 ▶·진행 막대)가 페이드인 → 차징(구슬·빨려드는 입자·빛살·포드→구슬 에너지 선, 막판 틱)
//   → 발사 직전 구슬이 부풀었다 수축 → 3초 빔(외곽광·흰 심·불꽃·섬광·흔들림·포드 반동, 끝나며 가늘어짐) → 구슬 꺼지고 연기 → 영클이 제자리로 미끄러져 돌아온다.
//   소리(델타룬): 잠김 snd_locker, 차징 snd_chargeshot_charge(잠길 때·발사 1.3초 전), 빔 = snd_chargeshot_fire + snd_dtrans_drone 을 하나로 이어 붙인 laser_beam(끊김 없음), 틱 snd_spearappear.
import L from '../../data/locale/ko.js';
import { FONT } from '../../ui/font.js';

// required: 좌우 번갈아 누르는 횟수(BUILD212 사용자 “좌우 카운트를 높여서 난이도를 올려” 35 → 50; 연타 창 7.7초 = 초당 6.5회)
// 빔은 갇힌 자리의 띠(band 60px) 한 영역에만 고정으로 쏜다 — BUILD210 의 상하 스윕은 “움직이면 절대 못 피한다”(사용자 2026-09-17) 로 제거
// prompt: “좌우로 연타해라!” 가 보이는 시간(연타는 페이드인 0.3초 뒤부터 센다)
export const YOUNGCLE_CAGE = { drop: 0.9, prompt: 1.3, charge: 8.0, required: 50, band: 60, cage: 56, fire: 3.0, after: 0.9, stand: [394, 148], orbGap: 26 };

export function createYoungcleCage(battle, { enemy }) {
  const C = YOUNGCLE_CAGE, board = battle.board, soul = battle.soul, TAU = Math.PI * 2;
  const [bw, bh] = battle.boardSize(); board.setTarget(bw, bh, 240, 214); board.snap(); soul.center(board.rect); soul.invuln = 0;
  const yc = battle.enemies.find(e => e.id === 'youngcle_hover' && !e.dead) || enemy;
  const cage = { x: soul.x, y: soul.y }, home = { x: yc.x, y: yc.y };
  let t = 0, progress = 0, last = null, locked = false, broken = false, brokeAt = 0, fired = false, hit = false, done = false, ticks = -1, disposed = false, chargeSfx = false, flash = 0, sparks = [], smoke = [], recoil = 0;
  const lockAt = C.drop, mashAt = lockAt + 0.3, fireAt = lockAt + C.charge, endAt = fireAt + C.fire;
  const chargeT = () => Math.max(0, t - lockAt);
  // 띠 중심 = 갇힌 자리(고정). 부수고 띠 밖으로 나가면 안 맞는다
  const bandY = () => cage.y;
  battle.sfx('locker', { volume: 0.9 });
  return {
    get snapshot() { return { t, progress, locked, bandY: Math.round(bandY()), mashOpen: locked && t >= mashAt, broken, brokeAt, fired, hit, done, soul: { x: soul.x, y: soul.y }, cage: { ...cage }, band: C.band, beamLeft: fired ? Math.max(0, endAt - t) : null, ycPose: yc.patternPose ? [Math.round(yc.patternPose.x), Math.round(yc.patternPose.y)] : null }; },
    update(dt, input) {
      if (disposed) return true;
      t += dt; if (flash > 0) flash -= dt; if (recoil > 0) recoil -= dt;
      // 영클: 대기 자리에서 살짝 떠 있고(호버), 발사 순간 뒤로 반동, 끝나면 제자리로 미끄러져 돌아온다
      const bob = Math.sin(t * 2.4) * 3, kick = recoil > 0 ? 10 * (recoil / 0.3) : 0;
      if (t < endAt) yc.patternPose = { x: C.stand[0] + kick, y: C.stand[1] + bob };
      else { const k = Math.min(1, (t - endAt) / C.after); yc.patternPose = { x: C.stand[0] + (home.x - C.stand[0]) * k, y: C.stand[1] + (home.y - C.stand[1]) * k }; }
      if (!locked && t >= lockAt) { locked = true; battle.sfx('laser_charge', { volume: 0.8 }); battle.game.shake = { time: 0.14, amp: 2 }; for (let i = 0; i < 10; i++) sparks.push({ x: cage.x - 24 + Math.random() * 48, y: cage.y + C.cage / 2 - 4, vy: -40 - Math.random() * 60, vx: (Math.random() - 0.5) * 80, life: 0.3 + Math.random() * 0.2 }); }
      if (locked && !broken && t >= mashAt) {
        const key = input.just('left') ? 'left' : input.just('right') ? 'right' : null;
        if (key && key !== last) {                          // 같은 키 연타는 안 센다 — 좌우좌우
          last = key; progress = Math.min(1, progress + 1 / C.required); battle.sfx('menumove', { volume: 0.35 });
          if (progress >= 1) { broken = true; brokeAt = t; battle.sfx('pop'); battle.game.shake = { time: 0.15, amp: 2 }; }
        }
      } else if (broken) soul.update(dt, input, board);
      const ct = chargeT(), tick = Math.floor(ct * 2);
      if (locked && ct >= C.charge - 3.0 && ct < C.charge && tick !== ticks) { ticks = tick; battle.sfx('spearappear', { volume: 0.4 }); }
      if (locked && !chargeSfx && ct >= C.charge - 1.3) { chargeSfx = true; battle.sfx('laser_charge', { volume: 1 }); }
      if (!fired && t >= fireAt) { fired = true; flash = 0.35; recoil = 0.3; battle.sfx('laser_beam', { volume: 1 }); battle.game.shake = { time: 0.6, amp: 9 }; }
      if (fired && t < endAt) {                             // 3초 동안 빔이 이어진다: 띠 안이면 계속 피해(무적 시간 뒤 다시)
        if (soul.invuln <= 0 && Math.abs(soul.y - bandY()) <= C.band / 2 + soul.r - 2) { hit = true; battle.hurtParty(yc.def.damage ?? 14); }
        if (Math.random() < 0.5) sparks.push({ x: board.rect.x + Math.random() * board.rect.w, y: bandY() + (Math.random() < 0.5 ? -1 : 1) * (C.band / 2 + 2), vx: 0, vy: (Math.random() - 0.5) * 60, life: 0.35 });
        if (Math.floor(t * 30) % 10 === 0) battle.game.shake = { time: 0.08, amp: 3 };
      }
      if (fired && t >= endAt && t < endAt + 0.5 && Math.random() < 0.4) smoke.push({ x: board.rect.x + board.rect.w + C.orbGap + (Math.random() - 0.5) * 20, y: cage.y - 10, vy: -30 - Math.random() * 20, life: 0.8, r: 4 + Math.random() * 5 });
      for (const s of sparks) { s.x += (s.vx || 0) * dt; s.y += s.vy * dt; s.life -= dt; } sparks = sparks.filter(s => s.life > 0);
      for (const s of smoke) { s.y += s.vy * dt; s.life -= dt; } smoke = smoke.filter(s => s.life > 0);
      if (fired && t >= endAt + C.after) { done = true; yc.patternPose = null; }
      return done;
    },
    draw(ctx) {
      const r = board.rect; board.draw(ctx);
      ctx.save(); ctx.beginPath(); ctx.rect(r.x + 3, r.y + 3, r.w - 6, r.h - 6); ctx.clip();
      const cyB = bandY(), by = Math.round(cyB - C.band / 2), charge = Math.min(1, chargeT() / C.charge), beaming = fired && t < endAt;
      const beamK = beaming ? Math.min(1, (t - fireAt) / 0.12) * Math.min(1, (endAt - t) / 0.35) : 0;   // 켜질 때 0.12초 굵어지고 끝나기 0.35초 전부터 가늘어진다
      if (beaming) {                                        // 굵은 빔: 바깥 빛무리 → 붉은 몸통 → 흰 심 + 가장자리 깜빡임
        const fl = Math.floor(t * 24) % 2, hw = C.band / 2 * beamK;
        ctx.fillStyle = 'rgba(255,80,80,0.35)'; ctx.fillRect(r.x, cyB - hw - 14 * beamK, r.w, (hw + 14 * beamK) * 2);
        ctx.fillStyle = 'rgba(255,90,90,0.95)'; ctx.fillRect(r.x, cyB - hw, r.w, hw * 2);
        ctx.fillStyle = fl ? '#fff' : '#ffe8e8'; ctx.fillRect(r.x, cyB - Math.max(0, hw - 10), r.w, Math.max(0, hw - 10) * 2);
        ctx.fillStyle = '#fff'; for (const s of sparks) ctx.fillRect(Math.round(s.x), Math.round(s.y), 3, 3);
      } else if (!fired) {                                  // 레이저 범위 띠: 차징 중 점점 붉어지고 깜빡임
        ctx.fillStyle = `rgba(255,50,50,${0.12 + 0.3 * charge})`; ctx.fillRect(r.x, by, r.w, C.band);
        if (Math.floor(t * (4 + charge * 10)) % 2 === 0) { ctx.strokeStyle = '#ff5050'; ctx.lineWidth = 2; ctx.strokeRect(r.x + 1, by + 1, r.w - 2, C.band - 2); }
        ctx.fillStyle = '#ffd27a'; for (const s of sparks) ctx.fillRect(Math.round(s.x), Math.round(s.y), 2, 2);
      }
      if (!broken || t - brokeAt < 0.35) {                   // 철창: 위에서 떨어져 내려와 잠긴다 → 강철 위·아래판 + 청록 살 다섯, 진행에 따라 금이 간다 → 부서지면 살이 흩어진다
        const k = broken ? (t - brokeAt) / 0.35 : 0, dropK = Math.min(1, t / lockAt), drop = locked ? 0 : Math.round((1 - dropK * dropK) * (cage.y - r.y + C.cage)), cx = Math.round(cage.x), cy = Math.round(cage.y) - drop, half = C.cage / 2;
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
      // 구슬(띠 높이·상자 오른쪽 바깥) + 포드 → 구슬 에너지 선 + 빨려드는 입자·빛살. 발사 직전 0.25초 부풀었다 수축, 끝나면 꺼지며 연기
      const pose = yc.patternPose || home, gx = r.x + r.w + C.orbGap, gy = Math.round(cyB), px = pose.x - 22, py = pose.y - 26;
      const pre = !fired && t >= fireAt - 0.25 ? (t - (fireAt - 0.25)) / 0.25 : 0, post = fired && t >= endAt ? Math.min(1, (t - endAt) / 0.4) : 0;
      const gr = fired ? 24 * (1 - post) : (4 + 16 * charge) * (1 + 0.8 * Math.sin(pre * Math.PI));
      if (locked && t < endAt + 0.2) { ctx.save(); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(gx, gy); ctx.strokeStyle = fired ? 'rgba(255,90,90,0.9)' : `rgba(255,90,90,${0.25 + 0.5 * charge})`; ctx.lineWidth = fired ? 6 : 2 + 2 * charge + 3 * pre; ctx.stroke(); if (fired) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke(); } ctx.restore(); }
      if (locked && !fired) { for (let i = 0; i < 8; i++) { const a = t * 2.6 + i * TAU / 8, d = 40 - ((t * 60 + i * 9) % 40); ctx.fillStyle = 'rgba(255,120,120,0.85)'; ctx.fillRect(Math.round(gx + Math.cos(a) * d) - 1, Math.round(gy + Math.sin(a) * d) - 1, 3, 3); }
        ctx.strokeStyle = `rgba(255,90,90,${0.3 + 0.5 * charge})`; ctx.lineWidth = 1.5; for (let i = 0; i < 6; i++) { const a = -t * 3 + i * TAU / 6; ctx.beginPath(); ctx.moveTo(gx + Math.cos(a) * gr, gy + Math.sin(a) * gr); ctx.lineTo(gx + Math.cos(a) * (gr + 8 + 10 * charge), gy + Math.sin(a) * (gr + 8 + 10 * charge)); ctx.stroke(); } }
      if (gr > 0.5) { ctx.fillStyle = `rgba(255,70,70,${fired ? 1 - post : 0.55 + 0.35 * (Math.floor(t * 10) % 2)})`; ctx.beginPath(); ctx.arc(gx, gy, gr, 0, TAU); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(gx, gy, Math.max(1, gr * 0.45), 0, TAU); ctx.fill(); }
      for (const s of smoke) { ctx.fillStyle = `rgba(160,160,170,${Math.max(0, s.life) * 0.6})`; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.fill(); }
      if (beaming) { const x0 = r.x + r.w - 3, w = gx - x0, hw = C.band / 2 * beamK; ctx.fillStyle = 'rgba(255,80,80,0.35)'; ctx.fillRect(x0, cyB - hw - 14 * beamK, w, (hw + 14 * beamK) * 2); ctx.fillStyle = 'rgba(255,90,90,0.95)'; ctx.fillRect(x0, cyB - hw, w, hw * 2); ctx.fillStyle = '#fff'; ctx.fillRect(x0, cyB - Math.max(0, hw - 10), w, Math.max(0, hw - 10) * 2); }   // 구슬 → 띠 오른쪽 끝: 수평 빔
      if (flash > 0) { ctx.fillStyle = `rgba(255,255,255,${Math.min(0.85, flash * 2.4)})`; ctx.fillRect(0, 0, 480, 360); }
      // 상자 아래 안내: 잠기기 전 “철창이 내려온다!” → 잠기면 “좌우로 연타해라!” 가 페이드인했다 사라지고 → ◀ 연타 ▶ + 진행 막대가 페이드인
      if (!broken) {
        const hy = r.y + r.h + 6, on = Math.floor(t * 5) % 2 === 0, since = t - lockAt;
        ctx.font = FONT; ctx.textBaseline = 'top'; ctx.textAlign = 'center';
        if (!locked) { ctx.fillStyle = '#ffe066'; ctx.fillText(L.battle_cage_incoming, 240, hy); }
        else {
          const pa = since < 0.3 ? since / 0.3 : since < C.prompt - 0.4 ? 1 : Math.max(0, (C.prompt - since) / 0.4);   // 페이드인 0.3 → 유지 → 페이드아웃 0.4
          if (pa > 0) { ctx.save(); ctx.globalAlpha = pa; ctx.fillStyle = '#ffe066'; ctx.fillText(L.battle_cage_prompt, 240, hy); ctx.restore(); }
          const ma = Math.max(0, Math.min(1, (since - (C.prompt - 0.4)) / 0.4));
          if (ma > 0) { ctx.save(); ctx.globalAlpha = ma; ctx.fillStyle = on ? '#ffe066' : '#6b6b6b'; ctx.fillText('◀', 208, hy); ctx.fillStyle = on ? '#6b6b6b' : '#ffe066'; ctx.fillText('▶', 272, hy); ctx.fillStyle = '#fff'; ctx.fillText(L.battle_cage_mash, 240, hy);
            ctx.fillStyle = '#333'; ctx.fillRect(180, hy + 20, 120, 5); ctx.fillStyle = '#60f4e0'; ctx.fillRect(180, hy + 20, Math.round(120 * progress), 5); ctx.restore(); }
        }
        ctx.textAlign = 'left';
      }
    },
    dispose() { disposed = true; yc.patternPose = null; battle.board.setTarget(440, 72, 240, 282); },
  };
}
