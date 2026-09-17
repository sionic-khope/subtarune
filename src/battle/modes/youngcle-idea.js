// 억빠맨 아이디어(BUILD208 사용자 브리핑, 공격 모드 'youngcle_idea'): 아이디어 버튼(억빠맨 얼굴+전구, 영클을 9대 때릴 때마다 한 번)으로 발동.
//   1 나람 볼: 억빠맨이 상자로 들어가 보라색 공(얼굴)으로 변신 → 나람이 구르기로 들어옴 → 미끄러지는 조작(펭이 놀이: 관성, C 돌진) 으로 5번 맞히면 쿠왕!! 나람볼이 영클에게 날아가 펑! → 끼엑(퀸 소리) + 3 피해
//   2 오방순 퀴즈: 상자 위에 문제, 아래 좌우 넓은 칸 중 정답에 하트를 두고 C. 4문제 다 맞히면 억빠맨 폭언 → 브금 끔 → 모두 ... → 오방순 클로즈업 정적 → 발작(점프·좌우·불) → 영클과 충돌 3 피해 → 오방순 탈주(이후 안 나옴). 틀리면 스택 9→6
//   3 보지: 대사만(지 모자이크) → 영클이 오 소리와 함께 뒤를 봄(방심) → 다음 턴 바로 넘어간다(공격 3대 × 1 피해)
import { YOUNGCLE_BATTLE as C } from '../../data/youngcle-battle.js';
import { createTalk } from '../support/talk.js';
import { FONT } from '../../ui/font.js';
import { whiteSprite } from '../youngcle-patterns.js';
import { BATTLE_BGS } from '../backgrounds.js';
import { DotBubble } from '../../ui/bubble.js';

const TAU = Math.PI * 2;
const loadImg = (src) => new Promise(r => { if (typeof Image === 'undefined') return r(null); const im = new Image(); im.onload = () => r(im); im.onerror = () => r(null); im.src = src; });
const drawBall = (ctx, img, frame, x, y, size) => { if (!img) { ctx.fillStyle = '#8a5cf5'; ctx.beginPath(); ctx.arc(x, y, size / 2, 0, TAU); ctx.fill(); return; } const fw = img.width / 2; ctx.save(); ctx.imageSmoothingEnabled = false; ctx.drawImage(img, frame * fw, 0, fw, img.height, Math.round(x - size / 2), Math.round(y - size / 2), size, size); ctx.restore(); };
const drawNaramBall = (ctx, img, x, y, r, rot) => { ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.rotate(rot); if (img) { const fw = img.width / 4, fh = img.height / 4, w = r * 2.1; ctx.imageSmoothingEnabled = false; ctx.drawImage(img, 0, 0, fw, fh, -w / 2, -w / 2, w, w); } else { ctx.fillStyle = '#7a8a5a'; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill(); } ctx.restore(); };
const drawScene = (battle, ctx) => { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 480, 360); BATTLE_BGS[battle.cfg.bg]?.(ctx, battle); ctx.font = FONT; ctx.textBaseline = 'top'; for (const e of battle.enemies) battle.drawEnemy(ctx, e); for (const m of battle.members) battle.drawMember(ctx, m); };

export function createYoungcleIdea(battle, { plan, member, target }) {
  const idea = plan?.idea ?? 1;
  const yc = battle.enemies.find(e => e.id === 'youngcle_hover') || target;
  if (idea === 1) return ideaBall(battle, member, yc);
  if (idea === 2) return ideaQuiz(battle, member, yc);
  return ideaLook(battle, member, yc);
}

/** 아이디어 1: 나람 볼 튕기기 — 타원 경기장(BUILD210 사용자: 상자보다 1.5배 넓게·동그라미). “잠시만요!” 뒤 억빠맨이 천천히 걸어 들어가 공으로 변신 → 나람이 굴러 들어와 멈춤 → 조작 설명 → 게임.
 *  C 돌진은 팽이처럼 잠깐 돌고 원래대로. 2대 맞히면 영클 말풍선 “가만히 둘가보냐” + 경기장 둘레를 돌며 2초마다 삐용 긴 레이저(맞으면 억빠맨 15).
 *  5대째: 경기장이 닫히면서 억빠맨 공이 자동으로 뛰어올라 덤블링하며 제자리로 돌아와 변신 해제(exit) → 쿠왕!! → 무거운 소리(furnace_blast) + 나람 볼이 높은 포물선으로 천천히 날아가 영클에게 펑!(경기장이 없어 피격이 보인다, 사용자 2026-09-17) */
function ideaBall(battle, member, yc) {
  const K = C.idea1, A = K.arena, T = K.taunt, S = K.spin, naram = battle.enemies.find(e => e.id === 'naram_giant' && !e.dead);
  let phase = 'talk', talk = createTalk(battle, K.before), t = 0, pt = 0, disposed = false, hits = 0, dashT = 0, cool = 0, gameT = 0, flash = 0, fxT = 0, shout = '', open = 0, spinT = 0, taunted = false, orbitT = 0, shotT = 0, aim = null, lasers = [], hurtCool = 0, ycFrozen = null, ycFrom = null, jumpFrom = null, landed = false, ballDone = false;
  let ballImg = null, naramImg = null; loadImg('assets/sprites/ppaman_ball.png').then(i => { ballImg = i; }); loadImg('assets/sprites/naram_giant.png').then(i => { naramImg = i; });
  const ENTRY = { x: A.cx - A.rx * 0.45, y: A.cy };
  const P = { x: member.home[0], y: member.home[1], vx: 0, vy: 0, r: K.ball.r, morph: 0, rot: 0 }, N = { x: 0, y: 0, vx: 0, vy: 0, r: K.naram.r, rot: 0, on: false };
  const action = { mode: 'idle', position: [...member.home], hidden: false, elapsed: 0, update() {} };
  member.action = action;
  const setPhase = (p) => { phase = p; pt = 0; };
  const ycPos = () => (yc.patternPose && yc.patternPose.x !== undefined) ? { x: yc.patternPose.x, y: yc.patternPose.y } : { x: yc.x, y: yc.y };
  const bounce = (o) => {                                   // 타원 경계: 밖으로 나가면 경계로 되돌리고 법선으로 반사
    const a = A.rx - o.r, b = A.ry - o.r, u = (o.x - A.cx) / a, v = (o.y - A.cy) / b, d = Math.hypot(u, v); if (d <= 1) return false;
    o.x = A.cx + (u / d) * a; o.y = A.cy + (v / d) * b; const nx = u / a, ny = v / b, nl = Math.hypot(nx, ny) || 1, ux = nx / nl, uy = ny / nl; const dot = o.vx * ux + o.vy * uy; if (dot > 0) { o.vx -= 2 * dot * ux; o.vy -= 2 * dot * uy; } return true; };
  const arenaPath = (ctx, k = 1) => { ctx.beginPath(); ctx.ellipse(A.cx, A.cy, Math.max(1, A.rx * k), Math.max(1, A.ry * k), 0, 0, TAU); };
  const say = (text) => { battle.bubble = { enemy: yc, text, shown: 0, t: 0, voice: yc.def.voice || 'narrator', patternHold: 2.2 }; };
  const tickBubble = (dt) => { const b = battle.bubble; if (!b || b.enemy !== yc) return; b.t += dt; const n = Math.min(b.text.length, Math.floor(b.t / 0.03)); for (let i = b.shown; i < n; i++) if (b.text[i] !== ' ') battle.game.sound.blip(b.voice); b.shown = n; if (b.t > b.text.length * 0.03 + b.patternHold) battle.bubble = null; };
  const distSeg = (px, py, ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1, k = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2)); return Math.hypot(px - (ax + dx * k), py - (ay + dy * k)); };
  const finishHit = () => { battle.sfx(C.sfx.kieek); battle.sfx(C.sfx.punch, { volume: 0.9 }); battle.game.shake = { time: 0.5, amp: 7 }; battle.hitEnemy(yc, member, C.ideaDamage, { source: 'idea', sound: false }); yc.patternPose = { ...ycFrozen, sheet: 'surprise', frame: 1 }; shout = '펑!'; };
  return {
    get snapshot() { return { phase, hits, open: Math.round(open * 100) / 100, ballDone, ball: { x: Math.round(P.x), y: Math.round(P.y), vx: Math.round(P.vx), vy: Math.round(P.vy), rot: Math.round(P.rot * 10) / 10 }, naram: { x: Math.round(N.x), y: Math.round(N.y), on: N.on }, dash: dashT > 0, spinning: spinT > 0, taunted, lasers: lasers.length, arena: { ...A }, ycHp: yc.hp, ppamanHp: member.hp }; },
    update(dt, input) {
      if (disposed) return true; t += dt; pt += dt; if (cool > 0) cool -= dt; if (flash > 0) flash -= dt; if (fxT > 0) fxT -= dt; if (hurtCool > 0) hurtCool -= dt; tickBubble(dt);
      if (phase === 'talk') { if (talk.update(dt, input)) { setPhase('enter'); battle.setText(''); action.mode = 'approach'; action.hidden = true; } return false; }
      if (phase === 'enter') {                                  // 경기장이 열리고(0.5s) 억빠맨이 천천히 걸어 들어간다(1.6s, 달리기 프레임을 느리게)
        open = Math.min(1, pt / 0.5); const k = Math.min(1, Math.max(0, (pt - 0.2) / 1.6)); const e = k * k * (3 - 2 * k);
        action.position = [member.home[0] + (ENTRY.x - member.home[0]) * e, member.home[1] + (ENTRY.y + 20 - member.home[1]) * e]; action.elapsed += dt * 0.55;
        if (pt >= 1.9) { P.x = ENTRY.x; P.y = ENTRY.y; action.mode = 'idle'; setPhase('morph'); battle.sfx('wing', { volume: 0.6 }); } return false; }
      if (phase === 'morph') { P.morph = Math.min(1, pt / 0.7); if (pt >= 0.9) { battle.sfx('pop'); setPhase('talk2'); talk = createTalk(battle, K.tada); } return false; }
      if (phase === 'talk2') { if (talk.update(dt, input)) { setPhase('come'); battle.setText(''); N.x = A.cx + A.rx + 30; N.y = A.cy - 24; N.vx = -K.naram.speed; N.vy = 0; N.on = true; if (naram) naram.patternPose = { hidden: true }; battle.sfx('jump', { volume: 0.5 }); } return false; }
      if (phase === 'come') { N.x += N.vx * dt; N.rot -= 6 * dt; if (N.x <= A.cx + A.rx * 0.55) { N.vx = 0; setPhase('ready'); talk = createTalk(battle, K.ready); } return false; }   // 나람이 굴러 들어와 멈춤
      if (phase === 'ready') { if (talk.update(dt, input)) { setPhase('game'); battle.setText(''); N.vx = -K.naram.speed; N.vy = K.naram.speed * 0.45; } return false; }   // 조작 설명 뒤 게임
      if (phase === 'game') {
        gameT += dt;
        // 억빠맨 공: 관성 조작(펭이 놀이) — 방향키는 가속, 가만두면 미끄러지다 서서히 멈춤, C 는 가던 방향으로 돌진(팽이처럼 잠깐 돌고 원래대로)
        let ax = 0, ay = 0; if (input.down('left')) ax -= 1; if (input.down('right')) ax += 1; if (input.down('up')) ay -= 1; if (input.down('down')) ay += 1;
        P.vx += ax * K.ball.accel * dt; P.vy += ay * K.ball.accel * dt;
        const f = Math.max(0, 1 - K.ball.friction * dt); P.vx *= f; P.vy *= f;
        const sp = Math.hypot(P.vx, P.vy); if (sp > K.ball.maxSpeed && dashT <= 0) { P.vx *= K.ball.maxSpeed / sp; P.vy *= K.ball.maxSpeed / sp; }
        if (input.just('confirm') && sp > 8 && dashT <= 0) { P.vx = P.vx / sp * K.ball.dash; P.vy = P.vy / sp * K.ball.dash; dashT = K.ball.dashTime; spinT = S.time; battle.sfx('heavyswing', { volume: 0.5 }); }
        if (dashT > 0) dashT -= dt;
        if (spinT > 0) { spinT -= dt; P.rot += S.rate * dt; } else if (P.rot !== 0) { const target = Math.round(P.rot / TAU) * TAU; P.rot += (target - P.rot) * Math.min(1, 10 * dt); if (Math.abs(P.rot - target) < 0.02) P.rot = 0; }
        P.x += P.vx * dt; P.y += P.vy * dt; bounce(P);
        // 나람 볼: 굴러다니며 경계에 튕긴다(속도 유지)
        N.x += N.vx * dt; N.y += N.vy * dt; N.rot += (N.vx >= 0 ? 1 : -1) * 6 * dt; bounce(N);
        const nsp = Math.hypot(N.vx, N.vy); if (nsp > 1) { const want = K.naram.speed + Math.max(0, nsp - K.naram.speed) * Math.max(0, 1 - 1.4 * dt); N.vx *= want / nsp; N.vy *= want / nsp; }
        const dx = N.x - P.x, dy = N.y - P.y, d = Math.hypot(dx, dy) || 1;
        if (d < N.r + P.r) {
          const ux = dx / d, uy = dy / d;
          if (dashT > 0 && cool <= 0) { hits++; cool = 0.45; flash = 0.2; battle.sfx('impact', { volume: 0.8 }); battle.game.shake = { time: 0.12, amp: 3 }; N.vx = ux * K.naram.knock; N.vy = uy * K.naram.knock; P.vx = -ux * 140; P.vy = -uy * 140; dashT = 0;
            if (hits === T.at && !taunted) { taunted = true; say(T.text); orbitT = 0; shotT = 0; }
            if (hits >= K.hits) { setPhase('exit'); battle.sfx('jump', { volume: 0.7 }); jumpFrom = { x: P.x, y: P.y }; N.vx = 0; N.vy = 0; dashT = 0; spinT = 0; ycFrom = ycPos(); ycFrozen = { x: yc.x, y: yc.y }; lasers = []; aim = null; battle.bubble = null; } }
          else { P.x = N.x - ux * (N.r + P.r + 1); P.y = N.y - uy * (N.r + P.r + 1); P.vx = -ux * 90; P.vy = -uy * 90; }
        }
        // 영클: 2대 뒤 경기장 둘레를 돌며 2초마다 조준선 → 긴 레이저(삐용). 맞으면 억빠맨 15
        if (taunted && phase === 'game') {
          orbitT += dt; const a = -Math.PI / 2 + orbitT * T.rev * TAU, ox = A.cx + Math.cos(a) * (A.rx - 10), oy = A.cy + Math.sin(a) * A.ry; yc.patternPose = { x: ox, y: oy + 44 };   // 경기장 가장자리를 따라(화면 밖으로 안 나감)
          shotT += dt;
          if (!aim && shotT >= T.every - T.aim) { const ddx = P.x - ox, ddy = P.y - oy, dd = Math.hypot(ddx, ddy) || 1; aim = { x: ox, y: oy, ux: ddx / dd, uy: ddy / dd }; }
          if (shotT >= T.every) { shotT = 0; battle.sfx('laser_zap', { volume: 0.8 }); const g = aim || { x: ox, y: oy, ux: (P.x - ox) / (Math.hypot(P.x - ox, P.y - oy) || 1), uy: (P.y - oy) / (Math.hypot(P.x - ox, P.y - oy) || 1) }; lasers.push({ x: g.x, y: g.y, ux: g.ux, uy: g.uy, life: 2.2 }); aim = null; }
          for (const L of lasers) { L.x += L.ux * T.speed * dt; L.y += L.uy * T.speed * dt; L.life -= dt;
            if (hurtCool <= 0 && distSeg(P.x, P.y, L.x, L.y, L.x - L.ux * T.len, L.y - L.uy * T.len) <= P.r + 2) { hurtCool = 0.75; battle.applyPartyDamage([member], T.damage); flash = 0.15; } }
          lasers = lasers.filter(L => L.life > 0);
        }
        if (gameT > K.maxSeconds) { setPhase('revert'); if (naram) naram.patternPose = null; N.on = false; yc.patternPose = null; battle.bubble = null; }
        return false;
      }
      if (phase === 'exit') {                                   // 5대째: 영클은 0.5초 동안 제자리로, 경기장은 닫히고, 억빠맨 공은 자동으로 뛰어올라 덤블링하며 제자리(발 20px 위)로 → 착지(thud) → 변신 해제 → 잠깐 숨 고르고 쿠왕
        if (ycFrom) { const kk = Math.min(1, pt / 0.5); yc.patternPose = { x: ycFrom.x + (ycFrozen.x - ycFrom.x) * kk, y: ycFrom.y + (ycFrozen.y - ycFrom.y) * kk }; if (kk >= 1) { ycFrom = null; yc.patternPose = { ...ycFrozen }; } }
        const J = K.exitJump, k = Math.min(1, pt / J.time), e = k * k * (3 - 2 * k);
        if (!landed) { P.x = jumpFrom.x + (member.home[0] - jumpFrom.x) * e; P.y = jumpFrom.y + (member.home[1] - 20 - jumpFrom.y) * e - J.height * Math.sin(Math.PI * k); P.rot += J.spin * dt; }
        N.rot -= 2 * dt; open = Math.max(0, 1 - Math.max(0, pt - 0.15) / 0.5);
        if (k >= 1 && !landed) { landed = true; P.rot = 0; P.x = member.home[0]; P.y = member.home[1] - 20; battle.sfx('thud', { volume: 0.5 }); }
        if (landed) P.morph = Math.max(0, 1 - (pt - J.time) / J.morph);
        if (landed && P.morph <= 0 && !ballDone) { ballDone = true; action.hidden = false; member.action = null; }
        if (pt >= J.time + J.morph + J.pause) { setPhase('launch'); shout = '쿠왕!!'; battle.sfx(C.sfx.boom, { volume: 1 }); battle.game.shake = { time: 0.6, amp: 8 }; N.from = { x: N.x, y: N.y }; }
        return false; }
      if (phase === 'launch') {                                 // 무게감: 1.6초 동안 높은 포물선으로 천천히 날아가 영클에게(경기장은 이미 닫혀 있어 피격이 보인다)
        if (ycFrom) { const kk = Math.min(1, pt / 0.5); yc.patternPose = { x: ycFrom.x + (ycFrozen.x - ycFrom.x) * kk, y: ycFrom.y + (ycFrozen.y - ycFrom.y) * kk }; if (kk >= 1) { ycFrom = null; yc.patternPose = { ...ycFrozen }; } }
        const k = Math.min(1, pt / 1.6), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; const g = ycFrozen || ycPos(); const tx = g.x - 20, ty = g.y - 56;
        const arcH = Math.max(40, Math.min(150, (N.from.y + ty) / 2 - 36));   // 포물선 꼭대기가 화면 위로 안 나가게
        N.x = N.from.x + (tx - N.from.x) * e; N.y = N.from.y + (ty - N.from.y) * e - arcH * Math.sin(Math.PI * e); N.rot += 9 * dt;
        if (k >= 1) { setPhase('impact'); finishHit(); fxT = 0.6; } return false; }
      if (phase === 'impact') { if (pt > 1.2) { N.on = false; if (naram) naram.patternPose = null; yc.patternPose = null; if (ballDone) setPhase('done'); else setPhase('revert'); } return false; }   // 억빠맨은 exit 에서 이미 제자리 — 바로 끝(revert 는 시간 초과 때 걸어 돌아오는 길)
      if (phase === 'revert') { P.morph = Math.max(0, 1 - pt / 0.5); if (pt > 0.5 && action.mode !== 'return') { action.mode = 'return'; action.elapsed = 0; yc.patternPose = null; }
        if (action.mode === 'return') { const k = Math.min(1, (pt - 0.5) / 1.1); action.position = [P.x + (member.home[0] - P.x) * k, P.y + 20 + (member.home[1] - P.y - 20) * k]; action.elapsed += dt * 0.55; open = Math.max(0, 1 - Math.max(0, pt - 0.6) / 0.4); }
        if (pt > 1.7) { action.hidden = false; member.action = null; setPhase('done'); } return false; }
      if (phase === 'done') return pt > 0.3;
      return false;
    },
    draw(ctx) {
      const drawArena = () => { if (open <= 0) return; ctx.save(); arenaPath(ctx, open); ctx.fillStyle = '#000'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#fff'; ctx.stroke(); ctx.restore(); };
      const walker = () => { if (action.mode === 'approach' || action.mode === 'return') { action.hidden = false; battle.drawMember(ctx, member); action.hidden = true; } };
      if (phase === 'talk') { battle.drawTextBox(ctx); return; }
      if (phase === 'talk2' || phase === 'ready') { drawArena(); ctx.save(); arenaPath(ctx); ctx.clip(); if (N.on) drawNaramBall(ctx, whiteSprite(naramImg), N.x, N.y, N.r, N.rot); drawBall(ctx, ballImg, 1, P.x, P.y, P.r * 2 + 10); ctx.restore(); battle.drawTextBox(ctx); return; }
      if (['enter', 'morph', 'come', 'game', 'exit', 'launch', 'impact', 'revert'].includes(phase)) {
        drawArena();
        ctx.save(); arenaPath(ctx); ctx.clip();
        if (N.on && (phase === 'game' || phase === 'come')) drawNaramBall(ctx, whiteSprite(naramImg), N.x, N.y, N.r, N.rot);
        if (phase !== 'enter' && phase !== 'exit' && !ballDone && !(phase === 'revert' && P.morph <= 0)) { ctx.save(); ctx.translate(Math.round(P.x), Math.round(P.y)); ctx.rotate(P.rot); drawBall(ctx, ballImg, P.morph < 0.5 ? 0 : 1, 0, 0, P.r * 2 + 10); ctx.restore(); }
        if (dashT > 0 || spinT > 0) { ctx.strokeStyle = 'rgba(200,170,255,0.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(P.x, P.y, P.r + 6, 0, TAU); ctx.stroke(); }
        if (aim) { ctx.save(); ctx.strokeStyle = 'rgba(255,90,90,0.9)'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 5]); ctx.beginPath(); ctx.moveTo(aim.x, aim.y); ctx.lineTo(aim.x + aim.ux * 520, aim.y + aim.uy * 520); ctx.stroke(); ctx.restore(); }
        for (const L of lasers) { ctx.save(); ctx.translate(Math.round(L.x), Math.round(L.y)); ctx.rotate(Math.atan2(L.uy, L.ux)); ctx.fillStyle = 'rgba(255,80,80,0.4)'; ctx.fillRect(-T.len - 4, -6, T.len + 8, 12); ctx.fillStyle = '#ff4a4a'; ctx.fillRect(-T.len, -3, T.len, 6); ctx.fillStyle = '#fff'; ctx.fillRect(-T.len + 6, -1, T.len - 10, 2); ctx.restore(); }
        if (flash > 0) { ctx.fillStyle = `rgba(255,255,255,${flash * 3})`; ctx.fillRect(0, 0, 480, 360); }
        ctx.restore();
        walker();
        if (phase === 'exit') {                                 // 경기장 밖(닫히는 중): 멈춘 나람(원색), 덤블링하며 돌아오는 억빠맨 공, 제자리로 돌아오는 영클은 경기장 앞에
          if (N.on) drawNaramBall(ctx, naramImg, N.x, N.y, N.r, N.rot);
          if (!ballDone) { ctx.save(); ctx.translate(Math.round(P.x), Math.round(P.y)); ctx.rotate(P.rot); drawBall(ctx, ballImg, P.morph < 0.5 ? 0 : 1, 0, 0, P.r * 2 + 10); ctx.restore(); }
          battle.drawEnemy(ctx, yc);
        }
        if (taunted && phase === 'game') battle.drawEnemy(ctx, yc);   // 선회 중엔 경기장 앞에
        if (phase === 'launch' || phase === 'impact') { if (phase === 'launch') drawNaramBall(ctx, naramImg, N.x, N.y, N.r, N.rot); if (fxT > 0) { const k = 1 - fxT / 0.6, g = ycFrozen || ycPos(); ctx.strokeStyle = `rgba(255,220,120,${1 - k})`; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(g.x - 20, g.y - 56, 14 + k * 60, 0, TAU); ctx.stroke(); } }
        ctx.font = FONT; ctx.textBaseline = 'top'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff';
        if (phase === 'game') { ctx.fillText(`${hits} / ${K.hits}`, 240, A.cy - A.ry - 30); ctx.font = FONT.replace(/^\d+px/, '12px'); ctx.fillStyle = '#c9c9d9'; ctx.fillText('방향키: 미끄러지기 · C: 돌진', 240, A.cy - A.ry - 14); }
        if (shout && (phase === 'launch' || phase === 'impact')) { ctx.font = FONT.replace(/^\d+px/, '28px'); ctx.fillStyle = '#ffe066'; ctx.fillText(shout, 240, 40); }
        ctx.textAlign = 'left'; ctx.font = FONT;
        return;
      }
      battle.drawTextBox(ctx);
    },
    dispose() { disposed = true; member.action = null; if (naram) naram.patternPose = null; yc.patternPose = null; if (battle.bubble?.enemy === yc) battle.bubble = null; battle.board.setTarget(440, 72, 240, 282); },
  };
}

/** 아이디어 2: 오방순 트라우마 퀴즈 → 발작 → 영클 충돌 → 탈주 */
function ideaQuiz(battle, member, yc) {
  const K = C.idea2, board = battle.board, soul = battle.soul, ob = battle.enemies.find(e => e.id === 'obangsun' && !e.dead);
  let phase = 'talk', talk = createTalk(battle, K.before), pt = 0, q = 0, qT = 0, qShown = 0, disposed = false, zoom = 1, flames = [], berserkTalk = null, obPose = null, hitDone = false;
  const dots = new DotBubble();   // 맵 컷신 {bubble} 과 같은 ‘...’ 말풍선(재사용)
  const dotTargets = () => K.dots.map(id => { const m = battle.members.find(x => x.id === id), e = battle.enemies.find(x => x.id === id && !x.dead); if (m) return { x: m.home[0] - 6, w: 24, y: m.home[1] - 62 + 48, h: 0 }; if (e) return { x: e.x - 22, w: 24, y: e.y - 96 + 48, h: 0 }; return null; }).filter(Boolean);
  const QW = 320, QH = 214, REVEAL = 0.75;   // 퀴즈 상자 폭(문제 한 줄이 들어가게) · 문제/답 칸이 다 나타나는 시간(그 전엔 고를 수 없다)
  const setPhase = (p) => { phase = p; pt = 0; };
  const zones = () => { const r = board.rect; return [{ x: r.x + 6, y: r.y + r.h - 46, w: r.w / 2 - 9, h: 40 }, { x: r.x + r.w / 2 + 3, y: r.y + r.h - 46, w: r.w / 2 - 9, h: 40 }]; };
  const wrapLines = (ctx, text, maxW) => { if (ctx.measureText(text).width <= maxW) return [text]; const words = text.split(' '); const lines = []; let cur = ''; for (const w of words) { const next = cur ? cur + ' ' + w : w; if (ctx.measureText(next).width > maxW && cur) { lines.push(cur); cur = w; } else cur = next; } if (cur) lines.push(cur); return lines; };
  const inZone = (z) => soul.x >= z.x && soul.x <= z.x + z.w && soul.y >= z.y && soul.y <= z.y + z.h;
  return {
    fullscreen: true,
    get snapshot() { return { phase, q, qT: Math.round(qT * 100) / 100, revealed: qT >= REVEAL, zones: phase === 'quiz' ? zones() : null, soul: { x: Math.round(soul.x), y: Math.round(soul.y) }, obangsunGone: !ob || ob.dead, ycHp: yc.hp }; },
    update(dt, input) {
      if (disposed) return true; pt += dt;
      if (phase === 'talk') { if (talk.update(dt, input)) { setPhase('open'); board.setTarget(QW, QH, 240, 214); battle.setText(''); } return false; }
      if (phase === 'open') { if (pt > 0.5) { setPhase('quiz'); qT = 0; soul.center(board.rect); } return false; }   // 상자가 펼쳐진 뒤 문제가 나타난다(‘뿅’ 금지)
      if (phase === 'quiz') {
        qT += dt; soul.update(dt, input, board);
        const typed = Math.min(K.quiz[q].q.length, Math.floor(Math.min(1, qT / REVEAL) * 1.6 * K.quiz[q].q.length)); for (let i = qShown; i < typed; i++) if (K.quiz[q].q[i] !== ' ') battle.game.sound.blip('narrator'); qShown = typed;   // 문제 타자에 나레이션 보이스폰트
        if (input.just('confirm') && qT >= REVEAL) { const zs = zones(); const pick = zs.findIndex(inZone);
          if (pick >= 0) { if (pick === K.quiz[q].answer) { battle.sfx('confirm'); q++; qT = 0; qShown = 0; if (q >= K.quiz.length) { setPhase('insult'); board.setTarget(440, 72, 240, 282); talk = createTalk(battle, K.insult); } }
            else { battle.sfx('error'); battle.support.rollback?.(); setPhase('fail'); board.setTarget(440, 72, 240, 282); battle.setText('* 오방순이 코웃음 친다.'); } } }
        return false;
      }
      if (phase === 'fail') return pt > 1.2;
      if (phase === 'insult') { if (talk.update(dt, input)) { battle.game.sound.stopBgm(1.4); setPhase('dots'); battle.setText(''); dots.start(dotTargets(), { dots: 3, gap: 0.4, hold: 1.2 }); } return false; }   // 브금은 천천히 페이드아웃
      if (phase === 'dots') { dots.update(dt); if (dots.done) setPhase('closeup'); return false; }   // 억빠맨 빼고 모두 머리 위 ‘...’ 말풍선(맵 컷신과 같은 DotBubble)
      if (phase === 'closeup') { zoom = 1 + Math.min(1, pt / 0.8) * 1.2; if (pt > 2.2) { setPhase('berserk'); berserkTalk = createTalk(battle, K.berserk); zoom = 1; battle.sfx('jump', { volume: 0.6 }); } return false; }
      if (phase === 'berserk') {
        if (ob) { const hop = Math.abs(Math.sin(pt * 7)) * 26, sway = Math.sin(pt * 9) * 18; obPose = { x: ob.x + sway, y: ob.y - hop }; ob.patternPose = obPose;
          if (Math.floor(pt * 12) % 3 === 0 && flames.length < 24) flames.push({ x: obPose.x - 30, y: obPose.y - 70, vx: (Math.sin(pt * 9) > 0 ? 1 : -1) * (120 + Math.random() * 60), vy: -20 + Math.random() * 40, life: 0.6 }); }
        for (const f of flames) { f.x += f.vx * dt; f.y += f.vy * dt; f.life -= dt; } flames = flames.filter(f => f.life > 0);
        if (berserkTalk.update(dt, input) && pt > 2.4) { setPhase('leap'); battle.sfx('jump', { volume: 0.9 }); if (ob) ob.leapFrom = { ...obPose }; }
        return false;
      }
      if (phase === 'leap') { if (ob) { const k = Math.min(1, pt / 0.45); ob.patternPose = { x: ob.leapFrom.x + (yc.x + 10 - ob.leapFrom.x) * k, y: ob.leapFrom.y + (yc.y - 10 - ob.leapFrom.y) * k - 70 * k * (1 - k) }; if (k >= 1 && !hitDone) { hitDone = true; battle.sfx(C.sfx.kieek); battle.sfx(C.sfx.punch, { volume: 0.9 }); yc.patternPose = { sheet: 'surprise', frame: 1 }; battle.game.shake = { time: 0.4, amp: 6 }; battle.hitEnemy(yc, member, C.ideaDamage, { source: 'idea', sound: false }); setPhase('flee'); } } else setPhase('flee'); return false; }
      if (phase === 'flee') { if (ob) { const k = Math.min(1, pt / 0.5); ob.patternPose = { x: yc.x + 10 + 240 * k, y: yc.y - 10 - 40 * k }; if (k >= 1) { ob.dead = true; ob.dying = 0; ob.patternPose = null; battle.support.obangsunLeft?.(); } } if (pt > 0.8) { setPhase('after'); yc.patternPose = null; talk = createTalk(battle, K.after); } return false; }
      if (phase === 'after') { if (talk.update(dt, input)) { if (battle.cfg.bgm) battle.game.sound.playBgm(battle.cfg.bgm, { volume: 0.5, fadeIn: 0.8 }); setPhase('done'); } return false; }
      return pt > 0.2;
    },
    draw(ctx) {
      ctx.save();
      if (phase === 'closeup' && ob) { const hw = 240 / zoom, hh = 180 / zoom, fx = Math.max(hw, Math.min(480 - hw, ob.x)), fy = Math.max(hh, Math.min(360 - hh, ob.y - 50)); ctx.translate(240, 180); ctx.scale(zoom, zoom); ctx.translate(-fx, -fy); }
      drawScene(battle, ctx);
      for (const f of flames) { ctx.fillStyle = '#ff6a2b'; ctx.beginPath(); ctx.arc(f.x, f.y, 6, 0, TAU); ctx.fill(); ctx.fillStyle = '#ffd24a'; ctx.beginPath(); ctx.arc(f.x, f.y, 3, 0, TAU); ctx.fill(); }
      ctx.restore();
      ctx.font = FONT; ctx.textBaseline = 'top'; ctx.textAlign = 'left';
      if (phase === 'open') { board.draw(ctx); }
      if (phase === 'quiz') {
        board.draw(ctx); const r = board.rect, item = K.quiz[q], zs = zones(), k = Math.min(1, qT / REVEAL);
        ctx.save(); ctx.beginPath(); ctx.rect(r.x + 3, r.y + 3, r.w - 6, r.h - 6); ctx.clip();
        ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; const qLines = wrapLines(ctx, item.q, r.w - 20); const shown = Math.floor(k * 1.6 * item.q.length); let used = 0;   // 문제는 타자 치듯 나타난다
        qLines.forEach((line, i) => { const part = line.slice(0, Math.max(0, shown - used)); used += line.length + 1; ctx.fillText(part, 240, r.y + 10 + i * 18); });
        zs.forEach((z, i) => { const rise = Math.round((1 - k) * 36); const zy = z.y + rise; ctx.globalAlpha = k; const on = k >= 1 && inZone(z); ctx.fillStyle = on ? '#3a3000' : '#111'; ctx.fillRect(z.x, zy, z.w, z.h); ctx.strokeStyle = on ? '#ffe066' : '#9a9ab0'; ctx.lineWidth = 2; ctx.strokeRect(z.x + 1, zy + 1, z.w - 2, z.h - 2); ctx.fillStyle = on ? '#ffe066' : '#fff'; ctx.font = FONT.replace(/^\d+px/, '13px'); if (ctx.measureText(item.a[i]).width > z.w - 10) ctx.font = FONT.replace(/^\d+px/, '11px'); ctx.fillText(item.a[i], z.x + z.w / 2, zy + 13); ctx.font = FONT; ctx.globalAlpha = 1; });   // 답 칸은 아래에서 떠오른다
        ctx.restore();
        ctx.fillStyle = '#c9c9d9'; ctx.font = FONT.replace(/^\d+px/, '12px'); ctx.fillText('칸에 들어가서 C', 240, r.y - 16); ctx.font = FONT; ctx.textAlign = 'left';   // 안내는 상자 위(아래는 HP 띠)
        soul.draw(ctx);
      }
      if (phase === 'dots') dots.draw(ctx, { x: 0, y: 0 }); else if (['talk', 'fail', 'insult', 'berserk', 'after'].includes(phase)) battle.drawTextBox(ctx);
      battle.drawHpStrip(ctx);
    },
    dispose() { disposed = true; if (ob && !ob.dead) ob.patternPose = null; yc.patternPose = null; battle.board.setTarget(440, 72, 240, 282); },
  };
}

/** 아이디어 3: 보지 — 영클이 뒤를 본다(방심). 이 모드가 끝나면 지원 모듈이 다음 적 턴을 건너뛴다 */
function ideaLook(battle, member, yc) {
  const K = C.idea3;
  let phase = 'talk', talk = createTalk(battle, K.lines), pt = 0, disposed = false;
  return {
    get snapshot() { return { phase, distracted: !!battle.support?.distracted }; },
    update(dt, input) {
      if (disposed) return true; pt += dt;
      if (phase === 'talk') { if (talk.update(dt, input)) { phase = 'oh'; pt = 0; battle.game.sound.blip('youngcle'); setTimeout(() => battle.game.sound.blip('youngcle'), 120); yc.patternPose = { sheet: 'surprise', frame: 0 }; } return false; }
      if (phase === 'oh') { if (pt > 0.5) { phase = 'look'; talk = createTalk(battle, [K.look]); } return false; }
      if (phase === 'look') { if (talk.update(dt, input)) { phase = 'done'; pt = 0; battle.support.setDistracted?.(true); } return false; }
      return pt > 0.2;
    },
    draw(ctx) { battle.drawTextBox(ctx); },
    dispose() { disposed = true; },
  };
}
