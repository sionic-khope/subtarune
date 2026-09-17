// 변신 영클 전투 인트로(BUILD214 사용자 브리핑): 적 턴 모드 `tvform_intro` — “편집노조의 힘을 얕보지마라” 뒤 편집노조 넷(비데·파크가디언·뚜울라·도트마리오)이 각자 색의 유령(하체 없음·잔상)으로
//   거대하게 나타나 빙글빙글 돌며 작아져 영클 TV 얼굴로 빨려 들어감 → 띠리리리링(snd_power) + 오라 링 휘이잉(snd_wing) + 에너지 입자(great_shine) ≈ 6초 → 보통 행동 창.
//   (BUILD214 의 “공격도 하지마라 → 땅 내리침 → 승부하기 던지기” 막간은 BUILD215 사용자 “승부 지우고 공격만” 으로 제거)
import { TVFORM_BATTLE as C } from '../../data/youngcle-tvform-battle.js';
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
  let phase = 'spin', t = 0, pt = 0, disposed = false, rings = [], particles = [], flash = 0, powered = false, shineAt = -1;
  const setPhase = (p) => { phase = p; pt = 0; };
  battle.board.setTarget(440, 72, 240, 282);
  return {
    get snapshot() { return { phase, t, spirits: sprites.map(s => ({ id: s.id, k: Math.max(0, Math.min(1, (t - s.at) / S.time)), done: s.done })), rings: rings.length, particles: particles.length, powered }; },
    update(dt) {
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
        if (pt >= K.time) { yc.patternPose = null; battle.game.shake = { time: 0.35, amp: 5 }; flash = 0.3; setPhase('done'); }
        return false;
      }
      if (phase === 'done') return pt > 0.5;
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
