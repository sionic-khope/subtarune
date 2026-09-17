// 변신 영클 전투 인트로(BUILD214 사용자 브리핑): ① 적 턴 모드 `tvform_intro` — “편집노조의 힘을 얕보지마라” 뒤 편집노조 넷(비데·파크가디언·뚜울라·도트마리오)이 각자 색의 유령(하체 없음·잔상)으로
//   거대하게 나타나 빙글빙글 돌며 작아져 영클 TV 얼굴로 빨려 들어감 → 띠리리리링(snd_power) + 오라 링 휘이잉(snd_wing) + 에너지 입자(great_shine) ≈ 6초 → “공격도 하지마라.”
//   ② 막간(support.afterEnemyPhase) `createMenuIntro` — 행동 창([공격하기][아이템])이 뜨고 0.9초 뒤 영클이 땅을 내리쳐(진동·baron_slam) [공격하기]가 떨어져 사라짐 → “ㅋㅋ 대신 이거드림.”
//   → VS 로고 [승부하기] 버튼이 영클에게서 포물선으로 날아와 패널 자리에 안착(thud·튕김) → 옆에 [코인벌기]가 뿅 → 나레이션 두 줄 → 본 메뉴.
import { TVFORM_BATTLE as C } from '../../data/youngcle-tvform-battle.js';
import { createTalk } from '../support/talk.js';
import L from '../../data/locale/ko.js';
const TAU = Math.PI * 2;
const loadImg = (src) => new Promise(r => { if (typeof Image === 'undefined') return r(null); const im = new Image(); im.onload = () => r(im); im.onerror = () => r(null); im.src = src; });
const TINT = new Map();
/** 정면 셀의 윗부분(하체 없음)을 그 캐릭터 색으로 물들인 유령 그림(캐시) */
function ghostFrame(img, sheet, color) {
  const key = img; if (TINT.has(key)) return TINT.get(key);
  const fw = sheet ? Math.floor(img.width / 4) : img.width, fh = sheet ? Math.floor(img.height / 4) : img.height, keepH = Math.round(fh * 0.62);
  const c = document.createElement('canvas'); c.width = fw; c.height = keepH; const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  g.drawImage(img, 0, 0, fw, keepH, 0, 0, fw, keepH);
  g.globalCompositeOperation = 'source-atop'; g.fillStyle = color; g.globalAlpha = 0.62; g.fillRect(0, 0, fw, keepH);
  g.globalCompositeOperation = 'destination-out'; g.globalAlpha = 1; const grad = g.createLinearGradient(0, keepH * 0.55, 0, keepH); grad.addColorStop(0, 'rgba(0,0,0,0)'); grad.addColorStop(1, 'rgba(0,0,0,1)'); g.fillStyle = grad; g.fillRect(0, 0, fw, keepH);   // 아래로 갈수록 사라지는 하체
  TINT.set(key, c); return c;
}
const facePos = (yc) => ({ x: yc.x - 6, y: yc.y - 176 });   // TV 화면 가운데(발 y 에서 176 위)

export function createTvformIntro(battle, { enemy }) {
  const I = C.intro, S = I.spin, yc = enemy, sprites = I.spirits.map(s => ({ ...s, img: null, trail: [], done: false, lastTrail: -1 }));
  for (const s of sprites) loadImg(s.sheet || s.still).then(i => { s.img = i; });
  let phase = 'spin', t = 0, pt = 0, disposed = false, talk = null, rings = [], particles = [], flash = 0, powered = false, shineAt = -1;
  const setPhase = (p) => { phase = p; pt = 0; };
  battle.board.setTarget(440, 72, 240, 282);
  return {
    get snapshot() { return { phase, t, spirits: sprites.map(s => ({ id: s.id, k: Math.max(0, Math.min(1, (t - s.at) / S.time)), done: s.done })), rings: rings.length, particles: particles.length, powered }; },
    update(dt, input) {
      if (disposed) return true;
      t += dt; pt += dt; if (flash > 0) flash -= dt;
      if (phase === 'spin') {
        for (const s of sprites) {
          const k = (t - s.at) / S.time;
          if (k < 0 || s.done) continue;
          if (!s.started) { s.started = true; battle.sfx('wing', { volume: 0.6 }); }
          if (t - s.lastTrail >= S.trailGap) { s.lastTrail = t; s.trail.push({ ...s.pos || {}, t }); if (s.trail.length > S.trail) s.trail.shift(); }
          if (k >= 1) { s.done = true; flash = 0.18; battle.game.shake = { time: 0.12, amp: 2 }; }
        }
        if (sprites.every(s => s.done)) { setPhase('charge'); battle.sfx('power', { volume: 1 }); powered = true; yc.patternPose = { x: yc.x, y: yc.y }; }
        return false;
      }
      if (phase === 'charge') {                                 // 띠리리리링 → 오라 링이 휘이잉 퍼지고 에너지 입자가 얼굴로 모인다, 영클은 부르르
        const K = I.charge, f = facePos(yc);
        if (pt < K.time && rings.length < K.rings && pt >= rings.length * (K.time / K.rings)) { rings.push({ t: 0 }); battle.sfx('wing', { volume: 0.5 }); }
        if (shineAt < 0) { shineAt = pt; battle.sfx('great_shine', { volume: 0.8 }); }
        for (const r of rings) r.t += dt;
        if (particles.length < K.particles && pt < K.time - 0.5) for (let i = 0; i < 2; i++) { const a = battle.rnd() * TAU, d = 120 + battle.rnd() * 80; particles.push({ x: f.x + Math.cos(a) * d, y: f.y + Math.sin(a) * d * 0.7, t: 0, life: 0.7 + battle.rnd() * 0.4 }); }
        for (const p of particles) p.t += dt; particles = particles.filter(p => p.t < p.life);
        yc.patternPose = { x: yc.x + (Math.floor(pt * 30) % 2 ? 2 : -2), y: yc.y - Math.min(6, pt * 6) };
        if (pt >= K.time) { yc.patternPose = null; battle.game.shake = { time: 0.35, amp: 5 }; flash = 0.3; setPhase('after'); talk = createTalk(battle, [I.afterLine]); }
        return false;
      }
      if (phase === 'after') { if (talk.update(dt, input)) { setPhase('done'); } return false; }
      if (phase === 'done') return pt > 0.2;
      return false;
    },
    draw(ctx) {
      const f = facePos(yc);
      if (phase === 'spin' || phase === 'charge') {
        for (const s of sprites) {
          if (!s.img) continue;
          const k = Math.max(0, Math.min(1, (t - s.at) / S.time)); if (t < s.at || s.done) continue;
          const e = k * k, sc = S.startScale * (1 - e) + 0.15 * e, ang = k * S.turns * TAU;
          const cx = 240 + (f.x - 240) * e, cy = 150 + (f.y - 150) * e; s.pos = { x: cx, y: cy, sc, ang };
          const g = ghostFrame(s.img, !!s.sheet, s.color);
          const drawGhost = (x, y, scale, rot, alpha) => { ctx.save(); ctx.globalAlpha = alpha; ctx.imageSmoothingEnabled = false; ctx.translate(Math.round(x), Math.round(y)); ctx.rotate(rot); const w = g.width * scale, h = g.height * scale; ctx.drawImage(g, -w / 2, -h * 0.55, w, h); ctx.restore(); };
          s.trail.forEach((tr, i) => { if (tr.x === undefined) return; drawGhost(tr.x, tr.y, tr.sc, tr.ang, 0.12 + 0.28 * (i / s.trail.length)); });   // 잔상
          drawGhost(cx, cy, sc, ang, 0.92);
        }
      }
      if (phase === 'charge') {
        for (const r of rings) { const k = r.t / 1.1; if (k > 1) continue; ctx.save(); ctx.globalAlpha = 1 - k; ctx.strokeStyle = '#9ff0ff'; ctx.lineWidth = 4 - 3 * k; ctx.beginPath(); ctx.ellipse(f.x, f.y + 60, 30 + 170 * k, 22 + 120 * k, 0, 0, TAU); ctx.stroke(); ctx.restore(); }
        for (const p of particles) { const k = p.t / p.life, e = k * k; const x = p.x + (f.x - p.x) * e, y = p.y + (f.y - p.y) * e; ctx.fillStyle = k > 0.7 ? '#fff' : '#ffe066'; ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 3); }
        ctx.save(); ctx.globalAlpha = 0.25 + 0.25 * Math.sin(pt * 12); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(f.x, f.y, 26 + pt * 10, 0, TAU); ctx.fill(); ctx.restore();
      }
      if (flash > 0) { ctx.fillStyle = `rgba(255,255,255,${Math.min(1, flash * 2.5)})`; ctx.fillRect(0, 0, 480, 360); }
      battle.drawTextBox(ctx);
    },
    dispose() { disposed = true; yc.patternPose = null; },
  };
}

/** 첫 행동 창 막간: 패널을 그대로 흉내 내 그리다가 영클이 땅을 내리쳐 [공격하기]를 없애고 VS [승부하기]를 던져 넣는다 */
export function createMenuIntro(battle, support) {
  const I = C.intro, yc = battle.enemies[0], m = battle.members[0];
  let phase = 'menu', pt = 0, talk = null, fightDrop = null, vs = null, coinsPop = 0, done = false;
  const setPhase = (p) => { phase = p; pt = 0; };
  const buttonsX = (ctx) => 36 + Math.ceil(ctx.measureText(m.name).width) + 16;
  const drawButton = (ctx, x, y, label, sel, opts = {}) => {
    const bw = Math.ceil(ctx.measureText(label).width) + (opts.vs ? 44 : 30), bh = 20;
    ctx.save(); if (opts.alpha !== undefined) ctx.globalAlpha = opts.alpha; if (opts.scale && opts.scale !== 1) { ctx.translate(x + bw / 2, y + bh / 2); ctx.scale(opts.scale, opts.scale); ctx.translate(-(x + bw / 2), -(y + bh / 2)); }
    if (opts.rot) { ctx.translate(x + bw / 2, y + bh / 2); ctx.rotate(opts.rot); ctx.translate(-(x + bw / 2), -(y + bh / 2)); }
    ctx.fillStyle = sel ? '#3a3000' : '#000'; ctx.fillRect(x, y, bw, bh); ctx.strokeStyle = sel ? '#ffe066' : '#9a9ab0'; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, bw - 2, bh - 2);
    if (opts.vs) battle.drawVsBadge(ctx, x + 6, y + 3);
    ctx.fillStyle = sel ? '#ffe066' : '#fff'; ctx.fillText(label, x + (opts.vs ? 32 : 18), y + 2); if (sel) battle.heart(ctx, x + 6, y + 6);
    ctx.restore(); return bw;
  };
  return {
    get snapshot() { return { phase, pt: Math.round(pt * 100) / 100, fightDrop: !!fightDrop, vs: vs ? { x: Math.round(vs.x), y: Math.round(vs.y), landed: vs.k >= 1 } : null, coinsPop: Math.round(coinsPop * 100) / 100, done }; },
    update(dt, input) {
      pt += dt;
      if (phase === 'menu') { if (pt >= I.slam.wait) { setPhase('slam'); yc.patternPose = { x: yc.x, y: yc.y - 34 }; } return false; }
      if (phase === 'slam') {                                   // 0.14초 떴다가 쾅 → 진동 → [공격하기]가 떨어져 사라진다
        if (pt < 0.14) return false;
        if (!fightDrop) { fightDrop = { t: 0 }; yc.patternPose = { x: yc.x, y: yc.y + 4 }; battle.sfx('baron_slam'); battle.game.shake = { time: I.slam.shake, amp: I.slam.amp }; }
        fightDrop.t += dt; if (fightDrop.t > 0.3) yc.patternPose = null;
        if (fightDrop.t > 0.9) { setPhase('give'); talk = createTalk(battle, [I.giveLine]); }
        return false;
      }
      if (phase === 'give') { if (talk.update(dt, input)) { setPhase('throw'); vs = { k: 0, x: yc.x - 20, y: yc.y - 150, landed: false }; battle.sfx('wing', { volume: 0.6 }); } return false; }
      if (phase === 'throw') {
        vs.k = Math.min(1, pt / I.throwTime);
        if (vs.k >= 1 && !vs.landed) { vs.landed = true; battle.sfx('thud', { volume: 0.7 }); battle.game.shake = { time: 0.12, amp: 2 }; }
        if (vs.landed) { coinsPop = Math.min(1, (pt - I.throwTime - 0.25) / 0.25); if (coinsPop < 0) coinsPop = 0; if (coinsPop > 0 && !vs.popped) { vs.popped = true; battle.sfx('pop'); } }
        if (pt >= I.throwTime + 0.9) { setPhase('made'); talk = createTalk(battle, I.made); }
        return false;
      }
      if (phase === 'made') { if (talk.update(dt, input)) { done = true; support.menuReady = true; return true; } return false; }
      return done;
    },
    draw(ctx) {
      if (phase === 'give' || phase === 'made') { battle.drawTextBox(ctx); return; }
      battle.box(ctx, 20, 246, 440, 72); ctx.textAlign = 'left'; ctx.fillStyle = '#fff';
      const by = 292; ctx.fillStyle = '#ffe066'; ctx.fillText(m.name, 36, by + 2);
      let bx = buttonsX(ctx);
      if (phase === 'menu' || (phase === 'slam' && !fightDrop)) { bx += drawButton(ctx, bx, by, L.battle_fight, true) + 8; drawButton(ctx, bx, by, L.battle_item, false); }
      else if (phase === 'slam') {                              // [공격하기]가 떨어지며 사라진다
        const k = Math.min(1, fightDrop.t / 0.45); if (k < 1) drawButton(ctx, bx, by + 70 * k * k, L.battle_fight, false, { alpha: 1 - k, rot: 0.5 * k });
        const w = Math.ceil(ctx.measureText(L.battle_fight).width) + 30; drawButton(ctx, bx + w + 8, by, L.battle_item, false);
      } else if (phase === 'throw') {                           // VS 버튼이 날아와 안착, 옆에 [코인벌기] 뿅
        const wDuel = Math.ceil(ctx.measureText(L.battle_duel).width) + 44, wCoin = Math.ceil(ctx.measureText(L.battle_coins).width) + 30;
        const k = vs.k, e = k * k * (3 - 2 * k), x = vs.x + (bx - vs.x) * e, y = vs.y + (by - vs.y) * e - 90 * Math.sin(Math.PI * k), rot = vs.landed ? 0 : k * TAU * 1.5, sc = vs.landed ? 1 + 0.18 * Math.max(0, 0.3 - (pt - I.throwTime)) / 0.3 : 1.15 - 0.15 * k;
        if (coinsPop > 0) drawButton(ctx, bx + wDuel + 8, by, L.battle_coins, false, { scale: 0.3 + 0.7 * coinsPop, alpha: coinsPop });
        drawButton(ctx, bx + wDuel + 8 + wCoin + 8, by, L.battle_item, false);
        drawButton(ctx, x, y, L.battle_duel, true, { vs: true, rot, scale: sc });
      }
    },
  };
}
