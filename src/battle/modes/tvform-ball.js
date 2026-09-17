// 특별 패턴 4 — 팽이 배틀(BUILD216 사용자 브리핑): 억빠맨 공(ppaman_ball) vs 거대한 영클 공(gpt youngcle_ball.png, 흰 도트). 타원 경기장(아이디어 1 과 같은 값).
//   영클은 천천히 따라오다 2~3초에 한 번 예고(빨간 테두리·!) 뒤 돌진. 둘 다 돌진 중에 맞부딪히면 팅!(피해 없음) + 1초 티이잉 비비기(불꽃). 영클이 무방비(돌진 아님)일 때 C 돌진으로 맞히면 히트 —
//   5히트면 쿠왕!!(furnace_blast) 영클 10 피해로 끝. 영클 돌진에 맞으면 파티 15 피해. 40초가 지나면 그냥 끝.
import { whiteSprite } from '../youngcle-patterns.js';
const TAU = Math.PI * 2, FONT = '14px "Galmuri11", sans-serif';
const loadImg = (src) => new Promise(r => { if (typeof Image === 'undefined') return r(null); const im = new Image(); im.onload = () => r(im); im.onerror = () => r(null); im.src = src; });

export function createBallDuel(battle, yc, K) {
  const A = K.arena, member = battle.members.find(m => m.id === 'ppaman') || battle.members[0];
  let ballImg = null, ycImg = null; loadImg('assets/sprites/ppaman_ball.png').then(i => { ballImg = i; }); loadImg(K.yc.image).then(i => { ycImg = i; });
  const P = { x: A.cx - 70, y: A.cy, vx: 0, vy: 0, r: K.ball.r, rot: 0 };
  const Y = { x: A.cx + 70, y: A.cy, vx: 0, vy: 0, r: K.yc.r, rot: 0, dashT: 0, tele: 0, nextDash: K.yc.dashEvery[0], dir: null };
  let t = 0, phase = 'enter', pt = 0, open = 0, hits = 0, dashT = 0, spinT = 0, cool = 0, clash = null, shout = '', flash = 0, disposed = false, sparks = [], damaged = false;
  const hidden = { mode: 'idle', position: [...member.home], hidden: true, elapsed: 0, update() {} }; member.action = hidden;
  const setPhase = (p) => { phase = p; pt = 0; };
  const bounce = (o) => {                                   // 타원 경계: 밖으로 나가면 경계로 되돌리고 법선으로 반사
    const a = A.rx - o.r, b = A.ry - o.r, u = (o.x - A.cx) / a, v = (o.y - A.cy) / b, d = Math.hypot(u, v); if (d <= 1) return false;
    o.x = A.cx + (u / d) * a; o.y = A.cy + (v / d) * b; const nx = u / a, ny = v / b, nl = Math.hypot(nx, ny) || 1, ux = nx / nl, uy = ny / nl; const dot = o.vx * ux + o.vy * uy; if (dot > 0) { o.vx -= 2 * dot * ux; o.vy -= 2 * dot * uy; } return true; };
  const arenaPath = (ctx, k = 1) => { ctx.beginPath(); ctx.ellipse(A.cx, A.cy, Math.max(1, A.rx * k), Math.max(1, A.ry * k), 0, 0, TAU); };
  return {
    get snapshot() { return { kind: 'ball', phase, t: Math.round(t * 100) / 100, hits, ball: { x: Math.round(P.x), y: Math.round(P.y), dashing: dashT > 0 }, yc: { x: Math.round(Y.x), y: Math.round(Y.y), dashing: Y.dashT > 0, tele: Y.tele > 0 }, clash: !!clash, damaged }; },
    update(dt, input) {
      if (disposed) return true;
      t += dt; pt += dt; if (flash > 0) flash -= dt; cool = Math.max(0, cool - dt);
      for (const s of sparks) { s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt; } sparks = sparks.filter(s => s.life > 0);
      if (phase === 'enter') { open = Math.min(1, pt / 0.5); if (pt >= 0.7) { setPhase('game'); battle.sfx('pop'); } return false; }
      if (phase === 'game') {
        // 억빠맨 공: 관성 조작, C 돌진(팽이 회전)
        const B = K.ball; let ax = 0, ay = 0; if (input.down('left')) ax -= 1; if (input.down('right')) ax += 1; if (input.down('up')) ay -= 1; if (input.down('down')) ay += 1;
        if (ax && ay) { ax *= 0.7071; ay *= 0.7071; }
        if (!clash) {
          if (input.just('confirm') && dashT <= 0 && cool <= 0.2) { const d = Math.hypot(P.vx, P.vy); const ux = d > 20 ? P.vx / d : (ax || ay ? ax : 1), uy = d > 20 ? P.vy / d : ay; const l = Math.hypot(ux, uy) || 1; P.vx = ux / l * B.dash; P.vy = uy / l * B.dash; dashT = B.dashTime; spinT = 0.45; battle.sfx('heavyswing', { volume: 0.6 }); }
          if (dashT > 0) dashT -= dt; else { P.vx += ax * B.accel * dt; P.vy += ay * B.accel * dt; P.vx *= Math.pow(B.friction, dt); P.vy *= Math.pow(B.friction, dt); const sp = Math.hypot(P.vx, P.vy); if (sp > B.maxSpeed) { P.vx *= B.maxSpeed / sp; P.vy *= B.maxSpeed / sp; } }
          P.x += P.vx * dt; P.y += P.vy * dt; P.rot += (spinT > 0 ? 24 : Math.hypot(P.vx, P.vy) / 40) * dt; if (spinT > 0) spinT -= dt; bounce(P);
          // 영클 공: 천천히 따라오다 예고 → 돌진
          if (Y.dashT > 0) { Y.dashT -= dt; Y.x += Y.dir.x * K.yc.dashSpeed * dt; Y.y += Y.dir.y * K.yc.dashSpeed * dt; Y.rot += 14 * dt; if (bounce(Y)) Y.dashT = Math.min(Y.dashT, 0.08); }
          else if (Y.tele > 0) { Y.tele -= dt; if (Y.tele <= 0) { const dx = P.x - Y.x, dy = P.y - Y.y, d = Math.hypot(dx, dy) || 1; Y.dir = { x: dx / d, y: dy / d }; Y.dashT = K.yc.dashTime; battle.sfx(K.sfx.ycDash, { volume: 0.8 }); } }
          else { Y.nextDash -= dt; const dx = P.x - Y.x, dy = P.y - Y.y, d = Math.hypot(dx, dy) || 1; Y.x += dx / d * K.yc.speed * dt; Y.y += dy / d * K.yc.speed * dt; Y.rot += 2 * dt; bounce(Y);
            if (Y.nextDash <= 0) { Y.tele = K.yc.telegraph; Y.nextDash = K.yc.dashEvery[0] + battle.rnd() * (K.yc.dashEvery[1] - K.yc.dashEvery[0]) + K.yc.telegraph + K.yc.dashTime; battle.sfx('laser_charge', { volume: 0.4 }); } }
          // 충돌
          const dx = P.x - Y.x, dy = P.y - Y.y, d = Math.hypot(dx, dy) || 1;
          if (d < P.r + Y.r && cool <= 0) {
            const ux = dx / d, uy = dy / d, pDash = dashT > 0, yDash = Y.dashT > 0;
            if (pDash && yDash) {                                 // 팅! 맞부딪힘 → 1초 티이잉 비빔
              clash = { t: 0 }; shout = '팅!'; dashT = 0; Y.dashT = 0; P.vx = P.vy = 0; battle.sfx(K.sfx.clash, { volume: 0.9 }); battle.sfx(K.sfx.grind, { volume: 0.4 }); battle.game.shake = { time: 0.25, amp: 4 }; flash = 0.15; cool = K.clash.time + 0.4;
            } else if (pDash) {                                    // 무방비 영클을 맞힘
              hits++; shout = `${hits}!`; flash = 0.12; cool = 0.5; dashT = 0; battle.sfx(K.sfx.hit, { volume: 0.9 }); battle.game.shake = { time: 0.15, amp: 4 };
              Y.x += -ux * 10; Y.vx = -ux * K.hitKnock; Y.vy = -uy * K.hitKnock; P.vx = ux * 160; P.vy = uy * 160; Y.tele = 0; Y.nextDash = Math.max(Y.nextDash, 0.9);
              for (let i = 0; i < 12; i++) { const a = battle.rnd() * TAU; sparks.push({ x: Y.x + ux * Y.r, y: Y.y + uy * Y.r, vx: Math.cos(a) * 120, vy: Math.sin(a) * 120, life: 0.35 }); }
              if (hits >= K.hits) { setPhase('finish'); shout = '쿠왕!!'; battle.sfx(K.sfx.done, { volume: 1 }); battle.game.shake = { time: 0.6, amp: 8 }; damaged = true; battle.hitEnemy(yc, null, K.damage, { source: 'special', sound: true }); }
            } else if (yDash) {                                    // 영클 돌진에 맞음
              battle.hurtParty(K.ycHitDamage); P.vx = ux * 320; P.vy = uy * 320; Y.dashT = 0; cool = 0.6; flash = 0.1;
            } else { P.x = Y.x + ux * (P.r + Y.r + 1); P.y = Y.y + uy * (P.r + Y.r + 1); P.vx = ux * 90; P.vy = uy * 90; }
          }
          // 영클 되튐 감속
          if (Y.dashT <= 0) { Y.x += (Y.vx || 0) * dt; Y.y += (Y.vy || 0) * dt; Y.vx = (Y.vx || 0) * Math.pow(0.02, dt); Y.vy = (Y.vy || 0) * Math.pow(0.02, dt); bounce(Y); }
        } else {                                                   // 티이잉: 서로 밀며 불꽃
          clash.t += dt; const dx = P.x - Y.x, dy = P.y - Y.y, d = Math.hypot(dx, dy) || 1;
          P.x += dx / d * K.clash.push * dt * 0.5; Y.x -= dx / d * K.clash.push * dt * 0.5; P.rot += 30 * dt; Y.rot -= 30 * dt;
          if (battle.rnd() < 0.8) sparks.push({ x: (P.x + Y.x) / 2, y: (P.y + Y.y) / 2, vx: (battle.rnd() - 0.5) * 220, vy: (battle.rnd() - 0.5) * 220, life: 0.3 });
          if (clash.t >= K.clash.time) { clash = null; shout = ''; P.vx = dx / d * 200; P.vy = dy / d * 200; }
        }
        if (t >= K.maxSeconds) setPhase('finish');
        return false;
      }
      if (phase === 'finish') { if (pt >= 1.4) setPhase('done'); return false; }
      return phase === 'done';
    },
    draw(ctx) {
      ctx.save(); ctx.imageSmoothingEnabled = false; ctx.font = FONT; ctx.textBaseline = 'top';
      ctx.fillStyle = '#05040c'; ctx.fillRect(0, 0, 480, 360);
      arenaPath(ctx, open); ctx.fillStyle = '#000'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#fff'; ctx.stroke();
      ctx.save(); arenaPath(ctx); ctx.clip();
      // 영클 공(흰 도트)
      const yi = whiteSprite(ycImg, 0.42);
      ctx.save(); ctx.translate(Math.round(Y.x), Math.round(Y.y)); ctx.rotate(Y.rot);
      if (Y.tele > 0 && Math.floor(t * 16) % 2 === 0) { ctx.strokeStyle = '#ff5050'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, Y.r + 6, 0, TAU); ctx.stroke(); }
      if (Y.dashT > 0) { ctx.strokeStyle = 'rgba(255,120,120,0.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, Y.r + 8, 0, TAU); ctx.stroke(); }
      if (yi) ctx.drawImage(yi, -Y.r, -Y.r, Y.r * 2, Y.r * 2); else { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, Y.r, 0, TAU); ctx.fill(); }
      ctx.restore();
      if (Y.tele > 0) { ctx.fillStyle = '#ff5050'; ctx.font = FONT.replace(/^\d+px/, '20px'); ctx.textAlign = 'center'; ctx.fillText('!', Math.round(Y.x), Math.round(Y.y) - Y.r - 26); ctx.font = FONT; ctx.textAlign = 'left'; }
      // 억빠맨 공
      ctx.save(); ctx.translate(Math.round(P.x), Math.round(P.y)); ctx.rotate(P.rot);
      if (ballImg) { const fw = ballImg.width / 2, fh = ballImg.height; const s = (P.r * 2 + 10) / Math.max(fw, fh); ctx.drawImage(ballImg, fw, 0, fw, fh, -fw * s / 2, -fh * s / 2, fw * s, fh * s); } else { ctx.fillStyle = '#c9a3ff'; ctx.beginPath(); ctx.arc(0, 0, P.r, 0, TAU); ctx.fill(); }
      ctx.restore();
      if (dashT > 0 || spinT > 0) { ctx.strokeStyle = 'rgba(200,170,255,0.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(P.x, P.y, P.r + 6, 0, TAU); ctx.stroke(); }
      for (const s of sparks) { ctx.fillStyle = s.life > 0.15 ? '#ffe066' : '#fff'; ctx.fillRect(Math.round(s.x) - 1, Math.round(s.y) - 1, 3, 3); }
      if (clash) { const mx = (P.x + Y.x) / 2, my = (P.y + Y.y) / 2; ctx.fillStyle = '#ffe066'; ctx.font = FONT.replace(/^\d+px/, '18px'); ctx.textAlign = 'center'; ctx.fillText('티이잉', Math.round(mx + Math.sin(t * 40) * 3), Math.round(my) - 50); ctx.font = FONT; ctx.textAlign = 'left'; }
      if (flash > 0) { ctx.fillStyle = `rgba(255,255,255,${flash * 3})`; ctx.fillRect(0, 0, 480, 360); }
      ctx.restore();
      ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText(`${hits} / ${K.hits}`, 240, A.cy - A.ry - 30); ctx.fillStyle = '#c9c9d9'; ctx.font = FONT.replace(/^\d+px/, '12px'); ctx.fillText('방향키: 미끄러지기 · C: 돌진 · 영클이 무방비일 때 맞혀라', 240, A.cy - A.ry - 14); ctx.font = FONT;
      if (shout) { ctx.fillStyle = '#ffe066'; ctx.font = FONT.replace(/^\d+px/, '28px'); ctx.fillText(shout, 240, 40); ctx.font = FONT; }
      ctx.textAlign = 'left';
      ctx.restore();
    },
    dispose() { disposed = true; if (member.action === hidden) member.action = null; },
  };
}
