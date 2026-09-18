// 특별 패턴 4 — 팽이 배틀(BUILD216 브리핑 + BUILD218 사용자 '너무 쉽다 · 10대는 때려야 · 경기장은 화면 전체'):
//   억빠맨 공(ppaman_ball) vs 거대한 영클 공(youngcle_ball, 흰 도트). 경기장 타원은 화면 전체(가로 480, y 28~316) — 파티 HP 띠(322~)는 비워 둔다.
//   영클은 빠르게 따라오다 1.2~2초마다 짧은 예고(0.26초) 뒤 돌진한다: 페인트(가짜 짧은 돌진) · 연속 돌진 · 벽에 튕겨 한 번 더 파고들기가 섞인다.
//   둘 다 돌진 중에 맞부딪히면 팅!(피해 없음) + 1초 티이잉 비비기(불꽃). 영클이 무방비(돌진 아님)일 때 C 돌진으로 맞히면 히트 —
//   10히트면 쿠왕!!(furnace_blast) 영클 10 피해로 끝. 영클 돌진에 맞으면 파티 15 피해. 50초가 지나면 피해 없이 끝난다.
import { whiteSprite } from '../youngcle-patterns.js';
const TAU = Math.PI * 2, FONT = '14px "Galmuri11", sans-serif';
const px = (n) => FONT.replace(/^\d+px/, n + 'px');
const loadImg = (src) => new Promise(r => { if (typeof Image === 'undefined') return r(null); const im = new Image(); im.onload = () => r(im); im.onerror = () => r(null); im.src = src; });

/** 팽이 배틀 한 판. 부모(tvform-special)가 CRT 전원 연출로 첫 프레임을 보여 주므로 0프레임부터 경기장이 다 그려져 있다.
 *  계약: { get snapshot, update(dt, input) -> 끝났으면 true, draw(ctx), dispose() } */
export function createBallDuel(battle, yc, K) {
  const A = K.arena, member = battle.members.find(m => m.id === 'ppaman') || battle.members[0];
  let ballImg = null, ycImg = null;
  loadImg('assets/sprites/ppaman_ball.png').then(i => { ballImg = i; });
  loadImg(K.yc.image).then(i => { ycImg = i; });
  const P = { x: A.cx - 150, y: A.cy + 40, vx: 0, vy: 0, r: K.ball.r, rot: 0 };
  const Y = { x: A.cx + 150, y: A.cy - 30, vx: 0, vy: 0, r: K.yc.r, rot: 0, dashT: 0, tele: 0, teleMax: K.yc.telegraph, nextDash: K.yc.dashEvery[0], dir: { x: -1, y: 0 }, feint: false, ric: false, combo: 0 };
  let t = 0, phase = 'enter', pt = 0, hits = 0, dashes = 0, clashes = 0;
  let dashT = 0, spinT = 0, cool = 0, clash = null, shout = '', shoutT = 0, flash = 0, disposed = false, damaged = false, pendingFeint = false;
  let sparks = [], trailP = [], trailY = [];
  const hidden = { mode: 'idle', position: [...member.home], hidden: true, elapsed: 0, update() {} };
  member.action = hidden;
  const setPhase = (p) => { phase = p; pt = 0; };
  const say = (s, life = 0.9) => { shout = s; shoutT = life; };
  // 타원 경계: 밖으로 나가면 경계로 되돌리고 법선으로 반사
  const bounce = (o) => {
    const a = A.rx - o.r, b = A.ry - o.r, u = (o.x - A.cx) / a, v = (o.y - A.cy) / b, d = Math.hypot(u, v);
    if (d <= 1) return false;
    o.x = A.cx + (u / d) * a; o.y = A.cy + (v / d) * b;
    const nx = u / a, ny = v / b, nl = Math.hypot(nx, ny) || 1, ux = nx / nl, uy = ny / nl, dot = o.vx * ux + o.vy * uy;
    if (dot > 0) { o.vx -= 2 * dot * ux; o.vy -= 2 * dot * uy; }
    return true;
  };
  const arenaPath = (ctx, k = 1) => { ctx.beginPath(); ctx.ellipse(A.cx, A.cy, Math.max(1, A.rx * k), Math.max(1, A.ry * k), 0, 0, TAU); };
  // ── 영클 공 AI: 예고 → 돌진. 가만히 서 있으면 반드시 맞도록 간격이 짧고 변화를 준다
  // 맞을수록 화가 난다: 히트가 쌓이면 돌진 간격이 줄고 쫓아오는 속도가 오른다(마지막 몇 대가 제일 어렵다)
  const rage = () => hits / K.hits;
  const schedule = () => { Y.nextDash = (K.yc.dashEvery[0] + battle.rnd() * (K.yc.dashEvery[1] - K.yc.dashEvery[0])) * (1 - K.yc.rageGap * rage()); Y.combo = 0; pendingFeint = false; };
  const arm = (tele) => { Y.tele = tele; Y.teleMax = tele; battle.sfx(K.sfx.warn, { volume: 0.32 }); };
  const fire = (feint) => {
    const dx = P.x - Y.x, dy = P.y - Y.y, d = Math.hypot(dx, dy) || 1;
    Y.dir = { x: dx / d, y: dy / d };
    const sp = K.yc.dashSpeed * (feint ? K.yc.feint.speed : 1);
    Y.vx = Y.dir.x * sp; Y.vy = Y.dir.y * sp;
    Y.dashT = feint ? K.yc.feint.time : K.yc.dashTime; Y.feint = feint; Y.ric = false; dashes += 1;
    battle.sfx(K.sfx.ycDash, { volume: feint ? 0.45 : 0.85 });
  };
  // 돌진이 끝났다: 페인트였으면 곧바로 진짜 예고, 연속 돌진이 남았으면 짧은 예고, 아니면 다음 차례를 잡는다
  const endDash = () => {
    Y.dashT = 0; Y.vx *= 0.25; Y.vy *= 0.25;
    if (Y.feint) { Y.feint = false; arm(K.yc.feint.tele); }
    else if (Y.combo > 0) { Y.combo -= 1; arm(K.yc.comboTele); }
    else schedule();
  };
  const calm = (delay) => { Y.dashT = 0; Y.tele = 0; Y.feint = false; Y.combo = 0; pendingFeint = false; Y.nextDash = delay; };
  const burst = (x, y, n, sp) => { for (let i = 0; i < n; i++) { const a = battle.rnd() * TAU; sparks.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.35 }); } };
  return {
    get snapshot() {
      return { kind: 'ball', phase, t: Math.round(t * 100) / 100, hits, need: K.hits, dashes, clashes,
        ball: { x: Math.round(P.x), y: Math.round(P.y), dashing: dashT > 0 },
        yc: { x: Math.round(Y.x), y: Math.round(Y.y), dashing: Y.dashT > 0, tele: Y.tele > 0, feint: Y.feint },
        clash: !!clash, damaged };
    },
    update(dt, input) {
      if (disposed) return true;
      t += dt; pt += dt;
      if (flash > 0) flash -= dt;
      if (shoutT > 0) { shoutT -= dt; if (shoutT <= 0) shout = ''; }
      cool = Math.max(0, cool - dt);
      for (const s of sparks) { s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt; }
      sparks = sparks.filter(s => s.life > 0);
      for (const s of trailP) s.life -= dt;
      for (const s of trailY) s.life -= dt;
      trailP = trailP.filter(s => s.life > 0); trailY = trailY.filter(s => s.life > 0);
      // 등장: 경기장은 처음부터 다 보이고 0.6초 뒤 시작
      if (phase === 'enter') { if (pt >= 0.6) { setPhase('game'); battle.sfx('pop'); say('시작!', 0.7); } return false; }
      if (phase === 'game') {
        const B = K.ball;
        let ax = 0, ay = 0;
        if (input.down('left')) ax -= 1;
        if (input.down('right')) ax += 1;
        if (input.down('up')) ay -= 1;
        if (input.down('down')) ay += 1;
        if (ax && ay) { ax *= 0.7071; ay *= 0.7071; }
        if (!clash) {
          // 억빠맨 공: 관성 조작, C 돌진(팽이 회전)
          if (input.just('confirm') && dashT <= 0 && cool <= 0.2) {
            const d = Math.hypot(P.vx, P.vy);
            const ux = d > 20 ? P.vx / d : (ax || ay ? ax : 1), uy = d > 20 ? P.vy / d : ay, l = Math.hypot(ux, uy) || 1;
            P.vx = ux / l * B.dash; P.vy = uy / l * B.dash; dashT = B.dashTime; spinT = 0.45;
            battle.sfx('heavyswing', { volume: 0.6 });
          }
          if (dashT > 0) { dashT -= dt; trailP.push({ x: P.x, y: P.y, life: 0.2 }); }
          else {
            P.vx += ax * B.accel * dt; P.vy += ay * B.accel * dt;
            P.vx *= Math.pow(B.friction, dt); P.vy *= Math.pow(B.friction, dt);
            const sp = Math.hypot(P.vx, P.vy);
            if (sp > B.maxSpeed) { P.vx *= B.maxSpeed / sp; P.vy *= B.maxSpeed / sp; }
          }
          P.x += P.vx * dt; P.y += P.vy * dt;
          P.rot += (spinT > 0 ? 24 : Math.hypot(P.vx, P.vy) / 40) * dt;
          if (spinT > 0) spinT -= dt;
          bounce(P);
          // 영클 공: 돌진 중 / 예고 중 / 쫓아오는 중
          if (Y.dashT > 0) {
            Y.dashT -= dt; Y.x += Y.vx * dt; Y.y += Y.vy * dt; Y.rot += 16 * dt;
            trailY.push({ x: Y.x, y: Y.y, life: 0.22 });
            if (bounce(Y)) {
              const d = Math.hypot(Y.vx, Y.vy) || 1; Y.dir = { x: Y.vx / d, y: Y.vy / d };
              // 벽에 튕기면 한 번은 그대로 파고든다(리코셰)
              if (!Y.feint && !Y.ric) { Y.ric = true; Y.dashT = Math.max(Y.dashT, K.yc.ricochet); battle.sfx(K.sfx.ric, { volume: 0.5 }); battle.game.shake = { time: 0.12, amp: 3 }; }
              else Y.dashT = Math.min(Y.dashT, 0.06);
            }
            if (Y.dashT <= 0) endDash();
          } else if (Y.tele > 0) {
            Y.tele -= dt; Y.x += Y.vx * dt; Y.y += Y.vy * dt;
            Y.vx *= Math.pow(0.02, dt); Y.vy *= Math.pow(0.02, dt); Y.rot += 9 * dt; bounce(Y);
            if (Y.tele <= 0) { fire(pendingFeint); pendingFeint = false; }
          } else {
            Y.nextDash -= dt;
            const dx = P.x - Y.x, dy = P.y - Y.y, d = Math.hypot(dx, dy) || 1;
            const chase = K.yc.speed * (1 + K.yc.rageSpeed * rage());
            Y.x += (dx / d * chase + Y.vx) * dt; Y.y += (dy / d * chase + Y.vy) * dt;
            Y.vx *= Math.pow(0.02, dt); Y.vy *= Math.pow(0.02, dt); Y.rot += 2.4 * dt; bounce(Y);
            if (Y.nextDash <= 0) { pendingFeint = battle.rnd() < K.yc.feint.chance; Y.combo = battle.rnd() < K.yc.doubleChance ? 1 : 0; arm(K.yc.telegraph); }
          }
          // 충돌
          const dx = P.x - Y.x, dy = P.y - Y.y, d = Math.hypot(dx, dy) || 1;
          if (d < P.r + Y.r && cool <= 0) {
            const ux = dx / d, uy = dy / d, pDash = dashT > 0, yDash = Y.dashT > 0;
            if (pDash && yDash) {
              // 팅! 맞부딪힘 → 1초 티이잉 비빔
              clash = { t: 0 }; clashes += 1; say('팅!', K.clash.time); dashT = 0; Y.dashT = 0; P.vx = P.vy = 0; Y.vx = Y.vy = 0; Y.feint = false;
              battle.sfx(K.sfx.clash, { volume: 0.9 }); battle.sfx(K.sfx.grind, { volume: 0.4 });
              battle.game.shake = { time: 0.25, amp: 4 }; flash = 0.15; cool = K.clash.time + 0.4;
            } else if (pDash) {
              // 무방비 영클을 맞힘
              hits += 1; say(`${hits}!`, 0.7); flash = 0.12; cool = 0.42; dashT = 0;
              battle.sfx(K.sfx.hit, { volume: 0.9 }); battle.game.shake = { time: 0.15, amp: 4 };
              Y.x += -ux * 10; Y.vx = -ux * K.hitKnock; Y.vy = -uy * K.hitKnock; P.vx = ux * 160; P.vy = uy * 160;
              calm(K.yc.hitPause * (1 - 0.4 * rage()));
              burst(Y.x + ux * Y.r, Y.y + uy * Y.r, 12, 120);
              if (hits >= K.hits) {
                setPhase('finish'); say('쿠왕!!', 1.6); battle.sfx(K.sfx.done, { volume: 1 });
                battle.game.shake = { time: 0.6, amp: 8 }; damaged = true;
                battle.hitEnemy(yc, null, K.damage, { source: 'special', sound: true });
              }
            } else if (yDash) {
              // 영클 돌진에 맞음
              battle.hurtParty(K.ycHitDamage); P.vx = ux * 320; P.vy = uy * 320;
              Y.vx *= 0.2; Y.vy *= 0.2; Y.feint = false; Y.dashT = 0; schedule();
              burst(P.x - ux * P.r, P.y - uy * P.r, 10, 150);
              cool = 0.7; flash = 0.12;
            } else { P.x = Y.x + ux * (P.r + Y.r + 1); P.y = Y.y + uy * (P.r + Y.r + 1); P.vx = ux * 90; P.vy = uy * 90; }
          }
        } else {
          // 티이잉: 서로 밀며 불꽃
          clash.t += dt;
          const dx = P.x - Y.x, dy = P.y - Y.y, d = Math.hypot(dx, dy) || 1;
          P.x += dx / d * K.clash.push * dt * 0.5; Y.x -= dx / d * K.clash.push * dt * 0.5; P.rot += 30 * dt; Y.rot -= 30 * dt;
          if (battle.rnd() < 0.8) sparks.push({ x: (P.x + Y.x) / 2, y: (P.y + Y.y) / 2, vx: (battle.rnd() - 0.5) * 220, vy: (battle.rnd() - 0.5) * 220, life: 0.3 });
          if (clash.t >= K.clash.time) { clash = null; shout = ''; shoutT = 0; P.vx = dx / d * 200; P.vy = dy / d * 200; calm(0.5); }
        }
        if (t >= K.maxSeconds && phase === 'game') { setPhase('finish'); say('시간 끝', 1.4); }
        return false;
      }
      if (phase === 'finish') { if (pt >= 1.4) setPhase('done'); return false; }
      return phase === 'done';
    },
    draw(ctx) {
      ctx.save(); ctx.imageSmoothingEnabled = false; ctx.font = FONT; ctx.textBaseline = 'top';
      ctx.fillStyle = '#05040c'; ctx.fillRect(0, 0, 480, 360);
      arenaPath(ctx); ctx.fillStyle = '#0b0a18'; ctx.fill();
      ctx.save(); arenaPath(ctx); ctx.clip();
      // 접시 무늬
      ctx.strokeStyle = 'rgba(255,255,255,0.09)'; ctx.lineWidth = 2;
      for (const k of [0.76, 0.52, 0.28]) { arenaPath(ctx, k); ctx.stroke(); }
      ctx.fillStyle = 'rgba(255,255,255,0.09)';
      ctx.fillRect(A.cx - 18, A.cy - 1, 36, 2); ctx.fillRect(A.cx - 1, A.cy - 18, 2, 36);
      // 잔상
      for (const s of trailY) { ctx.fillStyle = `rgba(255,110,110,${(0.42 * s.life / 0.22).toFixed(3)})`; ctx.beginPath(); ctx.arc(Math.round(s.x), Math.round(s.y), Y.r * 0.8, 0, TAU); ctx.fill(); }
      for (const s of trailP) { ctx.fillStyle = `rgba(200,170,255,${(0.5 * s.life / 0.2).toFixed(3)})`; ctx.beginPath(); ctx.arc(Math.round(s.x), Math.round(s.y), P.r * 0.85, 0, TAU); ctx.fill(); }
      // 예고: 조준선 + 조여드는 붉은 링
      if (Y.tele > 0) {
        const k = 1 - Y.tele / Math.max(0.01, Y.teleMax), dx = P.x - Y.x, dy = P.y - Y.y, d = Math.hypot(dx, dy) || 1;
        ctx.save(); ctx.setLineDash([7, 7]); ctx.strokeStyle = `rgba(255,70,70,${(0.35 + 0.5 * k).toFixed(3)})`; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(Math.round(Y.x), Math.round(Y.y)); ctx.lineTo(Math.round(Y.x + dx / d * 300), Math.round(Y.y + dy / d * 300)); ctx.stroke();
        ctx.restore();
        ctx.strokeStyle = '#ff5050'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(Math.round(Y.x), Math.round(Y.y), Y.r + 16 - 12 * k, 0, TAU); ctx.stroke();
      }
      // 영클 공(흰 도트)
      const yi = whiteSprite(ycImg, 0.42);
      ctx.save(); ctx.translate(Math.round(Y.x), Math.round(Y.y)); ctx.rotate(Y.rot);
      if (Y.dashT > 0) { ctx.strokeStyle = 'rgba(255,120,120,0.85)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, Y.r + 8, 0, TAU); ctx.stroke(); }
      if (yi) ctx.drawImage(yi, -Y.r, -Y.r, Y.r * 2, Y.r * 2);
      else { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, Y.r, 0, TAU); ctx.fill(); }
      ctx.restore();
      if (Y.tele > 0) { ctx.fillStyle = '#ff5050'; ctx.font = px(20); ctx.textAlign = 'center'; ctx.fillText('!', Math.round(Y.x), Math.round(Y.y) - Y.r - 46); ctx.font = FONT; ctx.textAlign = 'left'; }
      // 억빠맨 공
      ctx.save(); ctx.translate(Math.round(P.x), Math.round(P.y)); ctx.rotate(P.rot);
      if (ballImg) { const fw = ballImg.width / 2, fh = ballImg.height, s = (P.r * 2 + 10) / Math.max(fw, fh); ctx.drawImage(ballImg, fw, 0, fw, fh, -fw * s / 2, -fh * s / 2, fw * s, fh * s); }
      else { ctx.fillStyle = '#c9a3ff'; ctx.beginPath(); ctx.arc(0, 0, P.r, 0, TAU); ctx.fill(); }
      ctx.restore();
      if (dashT > 0 || spinT > 0) { ctx.strokeStyle = 'rgba(200,170,255,0.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(Math.round(P.x), Math.round(P.y), P.r + 6, 0, TAU); ctx.stroke(); }
      for (const s of sparks) { ctx.fillStyle = s.life > 0.15 ? '#ffe066' : '#fff'; ctx.fillRect(Math.round(s.x) - 1, Math.round(s.y) - 1, 3, 3); }
      if (clash) {
        const mx = (P.x + Y.x) / 2, my = Math.max(A.cy - A.ry + 40, (P.y + Y.y) / 2 - 52);
        ctx.fillStyle = '#ffe066'; ctx.font = px(18); ctx.textAlign = 'center';
        ctx.fillText('티이잉', Math.round(mx + Math.sin(t * 40) * 3), Math.round(my)); ctx.font = FONT; ctx.textAlign = 'left';
      }
      if (flash > 0) { ctx.fillStyle = `rgba(255,255,255,${Math.min(1, flash * 3).toFixed(3)})`; ctx.fillRect(0, 0, 480, 360); }
      ctx.restore();
      arenaPath(ctx); ctx.lineWidth = 3; ctx.strokeStyle = '#fff'; ctx.stroke();
      // 머리글: 남은 시간 막대(경기장 위 검은 띠) + 히트 수·조작 안내(어두운 패널). HP 띠(322~)에는 아무것도 그리지 않는다
      const leftK = Math.max(0, K.maxSeconds - t) / K.maxSeconds;
      ctx.fillStyle = 'rgba(255,255,255,0.16)'; ctx.fillRect(20, 6, 440, 4);
      ctx.fillStyle = leftK > 0.25 ? '#6ad1ff' : '#ff6b6b'; ctx.fillRect(20, 6, Math.round(440 * leftK), 4);
      const count = `${hits} / ${K.hits}`, hint = '방향키 이동 · C 돌진 — 무방비일 때 받아쳐라';
      ctx.font = px(16); const w1 = ctx.measureText(count).width;
      ctx.font = px(12); const w2 = ctx.measureText(hint).width;
      const showHint = phase !== 'finish';
      const bw = Math.ceil(showHint ? Math.max(w1, w2) : w1) + 28, bx = Math.round(240 - bw / 2), bh = showHint ? 38 : 24;
      ctx.fillStyle = 'rgba(3,2,10,0.82)'; ctx.fillRect(bx, 18, bw, bh);
      ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.lineWidth = 1; ctx.strokeRect(bx + 0.5, 18.5, bw - 1, bh - 1);
      ctx.textAlign = 'center';
      ctx.font = px(16); ctx.fillStyle = '#ffe066'; ctx.fillText(count, 240, 20);
      if (showHint) { ctx.font = px(12); ctx.fillStyle = '#c9c9d9'; ctx.fillText(hint, 240, 40); }
      if (phase === 'enter') { ctx.font = px(26); ctx.fillStyle = '#fff'; ctx.fillText('팽이 배틀', 240, A.cy - 22); }
      if (shout && shoutT > 0) { ctx.font = px(28); ctx.fillStyle = '#ffe066'; ctx.fillText(shout, 240, 62); }
      ctx.font = FONT; ctx.textAlign = 'left';
      ctx.restore();
      // 파티 HP 띠(322~)는 battle 이 이어서 그린다(gimmick.hpStrip) — 전체 화면 모드라 폰트·기준선을 여기서 넘겨준다
      ctx.font = FONT; ctx.textBaseline = 'top'; ctx.textAlign = 'left';
    },
    dispose() { disposed = true; if (member.action === hidden) member.action = null; },
  };
}
