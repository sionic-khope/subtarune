// 청소부 히든 보스(BUILD468) 탄막 — 델타룬 4장 거슨전 공격을 거의 그대로 옮긴 셋 + 응용 하나. BUILD469: 한 번씩 휭 퍽(janitor_stomp_cross)·멸공 파동(janitor_wave) 추가(아래 4·5).
//   사용자: “피하는칸 열리면 그거 발로 까버리고 … 망치던지는 패턴 … 던지는걸 붉은 깃발로 … 거의 정확히 똑같아야해”,
//           “위에서 눌러서 길게만들고 … 순간이동해서 여러개 빨라서 있는것처럼 찍는거”, “꼭 맵을 안찌그려도 … 영역 스캔하고 그뒤에 그쪽 빨게 찍는 … 응용버전”,
//           “거북이 등껍질 하나 보내고 회전하면서 순간이동해서 쳐내고 … 등껍질 대신에 드럼통”, “칠때마다 맵이 살짝 진동”, “효과음도 델타룬 공식 자산”
//   원본 값: 4장 디컴파일 GML(Wryyyong/DELTARUNE-Data-GML-Archive@90db624, chapter4) obj_box_throw_controller·obj_gerson_squishes_box·obj_gerson_swing_down·
//            obj_gerson_growtangle_telegraph·obj_gerson_shell_kick_controller·obj_gerson_shell_pinball 을 사용자 영상(hjIyeUT_mXc)과 프레임 대조(assets/source/janitor-hidden).
//   환산: 원작 30fps 프레임 → 초(F), 640×480 → 480×360 은 0.75배(S), 속도 px/프레임 → px/초 ×22.5(V), 가속 px/프레임² → px/초² ×675(G).
//   [동작 → 실루엣 → 예고 → 회피]
//     janitor_kick_flags: 청소부가 상자 오른쪽으로 순간이동해 발로 차 상자가 밀리며 마름모로(135°) → 붉은 깃발을 서너 개씩 포물선으로 16번(상자를 겨눔, 3프레임마다 40° 계단 회전)
//                         → 큰 깃발 25개(목표가 좌우로 쓸림) → 뛰어올라 거대 깃발(정점에서 멈췄다 떨어져 상자를 찍음). 깃발이 날아오는 게 보임 → 떨어지는 자리 피하기
//     janitor_stomp: 위로 솟구쳤다 떨어져 상자를 짓눌러 길쭉하게 → 순간이동한 분신이 떠올라 하얀 칸(경고)을 띄우고 내리찍음 53번(왼→오, 오→왼, 동시 무리 여섯) → 칸 밖으로
//     janitor_stomp_scan(응용): 상자는 그대로, 흰 훑기 줄이 지나가며 칸을 회색으로 표시 → 그 칸이 빨갛게 → 분신이 그 칸을 내리찍음. 네 판, 판마다 안전한 칸이 바뀐다
//     janitor_drum: 드럼통을 쳐 하트로(흰 초승달) → 지나간 자리에 흰 별(잠시 남아 맞음) → 상자 위·아래에서 튕기고, 상자 밖으로 나가면 청소부가 회오리로 그 앞에 나타나 다시 쳐 냄(빨라짐)
//                   → 마지막엔 드럼통을 들어 내리꽂아 바닥에서 폭발, 별 분수
//   그림: 깃발 janitor-hero-flag(드럼통 악마전), 드럼통 jjajang_drum, 발차기·회오리·초승달·별 gpt(assets/source/janitor-hidden). 소리: gerson_*(원작 파일) + impact·jump·rudebuster_swing.
const TAU = Math.PI * 2, DEG = Math.PI / 180;
const F = f => f / 30, S = px => px * 0.75, V = v => v * 22.5, G = a => a * 675;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const blink = (self, hz = 10) => Math.floor(self.age * hz) % 2 === 0;
const easeOut = k => 1 - (1 - k) * (1 - k);
const keep = (api, o) => { const made = api.emit(o); return made && typeof made === 'object' ? made : o; };
const SHEETS = Object.freeze({ whirl: [4, 1], slash: [3, 1], star: [1, 1], drum: [1, 1], flag: [1, 1], wave: [2, 2] });

export const KICK = Object.freeze({
  board: Object.freeze([112, 112]), center: Object.freeze([240, 176]),
  vanish: F(15), appear: F(19), windup: F(23), kick: F(31), slide: F(10), spin: F(12), slideX: S(-80), turn: 135 * DEG, standAt: Object.freeze([S(80), S(-20)]), shake0: S(10),
  throwFirst: F(46), throwEvery: F(10), throws: 16, launchY: S(115), aimSide: S(30), aimFrames: 45, spreadX: 2, spreadY: 1, vy: -14, g: 0.6, vmax: 11, spinStep: 40 * DEG, spinEvery: F(3), fadeBelow: S(120),
  hopEvery: Object.freeze([F(30), F(42)]), hop: F(24), hopH: Object.freeze([S(70), S(100)]), hopX: Object.freeze([S(30), S(60)]), hopY: S(20),
  big: Object.freeze({ after: F(15), count: 25, every: F(3), group: 5, pause: F(7), scale: 1.5, sweep: S(80), freq: 0.325 }),
  giant: Object.freeze({ after: F(20), jump: F(32), jumpH: S(80), throwAt: F(8), vy: -16, spin: 60 * DEG, holdAngle: 202.5 * DEG, hold: F(12), scale: 4, push: S(30) }),
  flag: 26, r: 7, duration: F(403),
});
export const STOMP = Object.freeze({
  board: Object.freeze([112, 112]), center: Object.freeze([240, 180]), strip: Object.freeze([S(450), S(75)]), stripX: S(322.5),
  rise: F(14), fall: F(5), squash: F(15), keys: Object.freeze([[0, 112, 112], [0.45, S(520), S(55)], [0.75, S(435), S(76)], [1, S(450), S(75)]]),
  cloneAt: F(4), cloneRise: S(60), flashAt: F(14), slowFlashAt: F(24), stompAt: F(29), slowStompAt: F(39), hit: F(7), landAt: F(4),
  col: Object.freeze([S(-28), S(45)]), colRight: Object.freeze([S(-44), S(29)]), telegraphDelay: 0.271, duration: F(400),
  // 원작 순서(T 프레임, 640 기준 x): 왼→오 8(5f) · 오→왼 8(8f) · 동시 무리 여섯(1f 차, 3·4 는 느린 형)
  waves: Object.freeze([
    { at: 35, step: 5, xs: [100, 150, 200, 250, 300, 350, 400, 450] },
    { at: 110, step: 8, xs: [550, 500, 450, 400, 350, 300, 250, 200] },
    { at: 201, step: 1, xs: [110, 185, 335, 410, 485, 545] },
    { at: 218, step: 1, xs: [110, 260, 335, 410, 485, 545] },
    { at: 243, step: 1, slow: true, xs: [110, 165, 220, 330, 385, 440, 495, 545] },
    { at: 285, step: 1, slow: true, xs: [110, 165, 220, 275, 385, 440, 545] },
    { at: 326, step: 1, xs: [110, 260, 410, 545] },
    { at: 341, step: 1, xs: [185, 260, 335, 410, 485, 545] },
  ].map(Object.freeze)),
});
export const SCAN = Object.freeze({ duration: 7.4, first: 0.4, every: 1.65, rounds: 4, slots: 6, safe: 2, sweep: 0.55, red: 0.28, stompGap: 0.07, hit: F(7), clone: 46 });
export const DRUM = Object.freeze({
  board: Object.freeze([112, 112]), center: Object.freeze([240, 200]),
  enterSlide: S(48), enter: F(12), windup: F(4), vanishAfter: F(8), speeds: Object.freeze([V(12), V(13.5), V(15)]), returns: 8, bounceMax: 8,
  squash: F(6), push: S(10), starEvery: F(4), starLife: F(26), starShrink: F(22), starSpin: 15 * DEG, starSize: 16, starR: 6,
  whirlAt: F(1), swingAt: F(5), hitAt: F(7), goneAt: F(15), predict: F(6), drumH: 30, drumR: 11,
  finale: Object.freeze({ rise: F(30), spin: 270 * DEG, heroRise: S(240), fall: V(30), stars: 28, starSpeed: Object.freeze([V(12), V(15.75)]), starG: Object.freeze([G(0.43), G(0.535)]), grey: F(11), smoke: 11, tail: F(80) }),
  duration: 16,
});
// 한 번씩 휭 퍽(BUILD469): 휘두름 12번(왼→오·오→왼·위→아래·아래→위 차례), 간격 every[0]→[1], 예고 warn[0]→[1], 줄 두께 band
export const CROSS = Object.freeze({
  board: Object.freeze([150, 150]), center: Object.freeze([262, 186]), dirs: Object.freeze(['lr', 'rl', 'tb', 'bt']), strikes: 12, first: 0.45,
  every: Object.freeze([0.9, 0.62]), warn: Object.freeze([0.5, 0.36]), sweep: 0.13, linger: F(5), band: 44, side: 30, feetBelow: 20, above: 4, belowFeet: 4,
});
// 멸공 파동(BUILD469): 다섯 줄, 1단계 겨누기 6발 → 2단계 한 줄 빈 벽 6번(빈 줄이 1~shift 칸씩 옮겨 감) → 3단계 홀·짝 번갈아 6번. 파동 330px/초, 예고 0.34초
export const WAVE = Object.freeze({
  board: Object.freeze([200, 130]), center: Object.freeze([318, 196]), lanes: 5, side: 34, feetBelow: 20, appear: 0.3, warn: 0.34, speed: 330, swingHold: 0.14, exitAfter: 0.75,
  size: 60, hitDx: 5, hitW: 9, hitH: 12, trail: 2, trailGap: 9,
  aimed: Object.freeze({ at: 0.75, count: 6, every: 0.32 }), walls: Object.freeze({ at: 2.85, count: 6, every: 0.66, shift: 2 }), weave: Object.freeze({ at: 7.0, count: 6, every: 0.44 }),
  duration: 10.6,
});

// ── 그림 ──
const CELLS = new WeakMap();
function cell(img, key, index = 0) {
  if (!img || !img.width || typeof document === 'undefined') return null;
  let list = CELLS.get(img); if (!list) { list = []; CELLS.set(img, list); }
  if (list[index] !== undefined) return list[index];
  const [cols, rows] = SHEETS[key] || [1, 1], fw = Math.floor(img.width / cols), fh = Math.floor(img.height / rows);
  let out = null;
  try { const c = document.createElement('canvas'); c.width = fw; c.height = fh; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(img, (index % cols) * fw, Math.floor(index / cols) * fh, fw, fh, 0, 0, fw, fh); out = c; } catch { out = null; }
  list[index] = out; return out;
}
function art(ctx, img, key, frame, x, y, w, h = null, rot = 0, alpha = 1, flip = false) {
  const c = cell(img, key, frame); if (!c || !c.width) return false;
  const dh = h ?? w * c.height / c.width;
  ctx.save(); ctx.translate(Math.round(x), Math.round(y)); if (rot) ctx.rotate(rot); if (flip) ctx.scale(-1, 1); ctx.globalAlpha *= alpha; ctx.imageSmoothingEnabled = false;
  ctx.drawImage(c, -Math.round(w / 2), -Math.round(dh / 2), Math.round(w), Math.round(dh)); ctx.restore();
  return true;
}
function drawFlag(ctx, img, x, y, size, rot = 0, alpha = 1) {
  if (art(ctx, img, 'flag', 0, x, y, size, size, rot, alpha, true)) return;
  ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.rotate(rot); ctx.globalAlpha *= alpha;
  ctx.fillStyle = '#7a4a22'; ctx.fillRect(-size / 2, -1, size, 3); ctx.fillStyle = '#e8261f'; ctx.fillRect(-size * 0.4, 0, size * 0.35, size * 0.3); ctx.restore();
}
function drawStar(ctx, img, x, y, size, rot, alpha = 1) {
  if (art(ctx, img, 'star', 0, x, y, size, size, rot, alpha)) return;
  ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.rotate(rot); ctx.globalAlpha *= alpha; ctx.fillStyle = '#fff';
  ctx.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? size * 0.22 : size / 2, a = i * Math.PI / 5 - Math.PI / 2; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); ctx.fill(); ctx.restore();
}
/** 분신(청소부 공격 시트 한 칸)을 발 (x, y) 에, 흰 섬광이면 하얗게 */
const ATK = Object.freeze({ cols: 2, rows: 3, pivot: Object.freeze([164, 236]) });
function drawClone(ctx, api, x, y, frame, alpha = 1, white = false, flip = true) {
  const img = api.images?.atk, sh = ATK; if (!img || !img.width) { ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = white ? '#fff' : '#d22'; ctx.fillRect(x - 12, y - 48, 24, 48); ctx.restore(); return; }
  const fw = Math.floor(img.width / sh.cols), fh = Math.floor(img.height / sh.rows), s = api.actor?.scale ?? 0.736, [px, py] = sh.pivot;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.imageSmoothingEnabled = false; ctx.translate(Math.round(x), Math.round(y)); if (flip) ctx.scale(-1, 1);
  if (white) ctx.filter = 'brightness(0) invert(1)';
  ctx.drawImage(img, (frame % sh.cols) * fw, Math.floor(frame / sh.cols) * fh, fw, fh, -Math.round(px * s), -Math.round(py * s), Math.round(fw * s), Math.round(fh * s));
  ctx.restore();
}

// ── 1. 발차기 → 마름모 상자 → 붉은 깃발 ──
function kickFlags(o = {}) {
  const C = { ...KICK, ...o }, B = C.big, Gi = C.giant;
  const p1End = C.throwFirst + (C.throws - 1) * C.throwEvery, p2Start = p1End + B.after;
  const groupLen = (B.group - 1) * B.every + B.pause, p2End = p2Start + Math.ceil(B.count / B.group) * groupLen;
  const p3Start = p2End + Gi.after;
  let stand = null, base = null, kicked = false, thrown = 0, big = 0, hop = null, nextHop = 0, giant = null, gone = false, ghost = false;
  const throwFlag = (api, ox, oy, tx, scale, rate) => {
    const vx = (-Math.abs(ox - tx) / C.aimFrames + (api.rnd() * 2 - 1) * C.spreadX + (api.rnd() < 0.5 ? -0.5 : 0.5)) * 22.5;
    const vy = (C.vy + (api.rnd() * 2 - 1) * C.spreadY + (api.rnd() < 0.5 ? -1 : 1)) * 22.5;
    return { x: ox, y: oy, vx, vy, scale, rate };
  };
  const launch = (api, b, list, groupAge) => {
    for (const f of list) {
      api.emit({ x: f.x, y: f.y, r: C.r * f.scale, kind: 'white', shape: 'flag', free: true, life: 4, vx: f.vx, vy: f.vy, group: groupAge, alpha: 1,
        steer(self, dt) {
          self.vy = Math.min(V(C.vmax), self.vy + G(C.g) * dt);
          if (self.y < -S(20)) { self.x += 22.5 * dt; self.y += 45 * dt; }
          self.rot = Math.floor(self.age / C.spinEvery) * C.spinStep;
          if (self.y > b.y + b.h + C.fadeBelow) { self.alpha -= 9 * dt; if (self.alpha <= 0) self.life = Math.min(self.life, self.age); }
        },
        out() { return this.age >= this.life; },
        hitShape(self, soul) { return self.alpha > 0.5 && Math.hypot(soul.x - self.x, soul.y - self.y) <= self.r + soul.r - 2; },
        drawShape(ctx, self) { drawFlag(ctx, api.images?.flag, self.x, self.y, C.flag * f.scale, self.rot, self.alpha); } });
    }
  };
  return { duration: C.duration, board: C.board, center: C.center, update(t, dt, api) {
    const b = api.box, cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    if (!base) { base = { cx, cy }; stand = [cx + C.standAt[0], cy + C.standAt[1]]; }
    // 웃음소리는 말풍선 “멸공!” 때(패턴 설정 laugh, 지원 모듈) — 순간이동 전까지 웃음 그림(BUILD469 사용자 “멸공하고 웃을때 웃음스프라이트가 안나와”)
    if (!gone && t < C.vanish) api.present?.({ sheet: 'laugh', frame: 0 });
    if (!gone && t >= C.vanish) { gone = true; api.present?.({ hidden: true }); }
    if (gone && t >= C.appear && t < C.windup) { if (!ghost) { ghost = true; api.sfx?.('gerson_motor_swing_down', { volume: 0.6, rate: 1.4, pitch: true }); } api.present?.({ sheet: 'kick', frame: 0, x: stand[0], y: stand[1] }); }
    if (t >= C.windup && t < C.kick) { if (ghost !== 'wind') { ghost = 'wind'; api.sfx?.('gerson_motor_upper_quick_mid', { volume: 0.6 }); } api.present?.({ sheet: 'kick', frame: 0, x: stand[0], y: stand[1] }); }
    if (t >= C.kick && !kicked) {
      kicked = true; api.sfx?.('gerson_queen_punched_lower', { volume: 0.8 }); api.shake?.(0.15, 2);
      api.emit({ x: 0, y: 0, r: 0, harmless: true, free: true, life: F(10), shape: 'box_ghost',
        drawShape(ctx, self) { const k = clamp(self.age / F(10), 0, 1); ctx.save(); ctx.globalAlpha = 0.45 * (1 - k); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.translate(Math.round(base.cx + C.slideX * easeOut(k) * 0.5), Math.round(base.cy)); ctx.rotate(C.turn * easeOut(k) * 0.5); ctx.strokeRect(-56, -56, 112, 112); ctx.restore(); } });
    }
    if (kicked) {
      const ks = clamp((t - C.kick) / C.slide, 0, 1), kr = clamp((t - C.kick) / C.spin, 0, 1);
      if (kr < 1 || ks < 1) { api.setBoard?.(base.cx + C.slideX * easeOut(ks), base.cy); api.rotateBoard?.(C.turn * easeOut(kr)); }
      const shakeX = Math.max(0, C.shake0 - (t - C.kick) * S(2) * 30) * (Math.floor((t - C.kick) * 30) % 2 ? -1 : 1);
      if (t < C.throwFirst) api.present?.({ sheet: 'kick', frame: 1, x: stand[0] + shakeX, y: stand[1] });
    }
    // 1단계: 서너 개씩 16번(상자 좌우 30 을 겨눔), 사이사이 청소부가 점프해 자리를 옮긴다
    if (t >= C.throwFirst && t < p2Start) {
      if (!hop && t >= nextHop) {
        const dx = (C.hopX[0] + api.rnd() * (C.hopX[1] - C.hopX[0])) * (api.rnd() < 0.5 ? -1 : 1), dy = (api.rnd() * 2 - 1) * C.hopY;
        hop = { from: [...stand], to: [clamp(stand[0] + dx, b.x + b.w + 10, 470), clamp(stand[1] + dy, 60, 230)], at: t, h: C.hopH[0] + api.rnd() * (C.hopH[1] - C.hopH[0]) };
        api.sfx?.('jump', { volume: 0.4, rate: 2, pitch: true });
        nextHop = t + C.hop + C.hopEvery[0] + api.rnd() * (C.hopEvery[1] - C.hopEvery[0]);
      }
      let px = stand[0], py = stand[1];
      if (hop) { const k = clamp((t - hop.at) / C.hop, 0, 1); px = hop.from[0] + (hop.to[0] - hop.from[0]) * k; py = hop.from[1] + (hop.to[1] - hop.from[1]) * k - Math.sin(k * Math.PI) * hop.h; if (k >= 1) { stand = hop.to; hop = null; } }
      const throwing = thrown > 0 && t - (C.throwFirst + (thrown - 1) * C.throwEvery) < F(4);
      api.present?.({ sheet: 'attack', frame: throwing ? 3 : 1, x: px, y: py });
      while (thrown < C.throws && t >= C.throwFirst + thrown * C.throwEvery) {
        const ox = px - 6, oy = Math.min(py - 50, C.launchY), n = api.rnd() < 0.5 ? 3 : 4, list = [];
        for (let i = 0; i < n; i++) list.push(throwFlag(api, ox, oy, b.x + b.w / 2 + (api.rnd() < 0.5 ? -C.aimSide : C.aimSide), 1, 1));
        launch(api, b, list); api.sfx?.('gerson_smallswing', { volume: 0.6, rate: 1 + api.rnd() * 0.3, pitch: true }); thrown++;
      }
    }
    // 2단계: 큰 깃발 25개, 3프레임 간격·다섯 개마다 쉼, 목표가 사인으로 좌우를 쓴다
    if (t >= p2Start && t < p3Start) {
      api.present?.({ sheet: 'attack', frame: 3, x: stand[0], y: stand[1] });
      while (big < B.count) {
        const at = p2Start + Math.floor(big / B.group) * groupLen + (big % B.group) * B.every; if (t < at) break;
        const tx = b.x + b.w / 2 + Math.sin(at * 30 * B.freq) * B.sweep;
        launch(api, b, [throwFlag(api, stand[0] - 6, Math.min(stand[1] - 50, C.launchY), tx, B.scale, 1)]);
        api.sfx?.('gerson_smallswing', { volume: 0.6, rate: 0.75 + api.rnd() * 0.3, pitch: true }); big++;
      }
    }
    // 3단계: 뛰어올라 거대 깃발 — 정점에서 202.5° 로 멈췄다 떨어져 상자를 30 눌러 찍는다
    if (t >= p3Start) {
      const k = clamp((t - p3Start) / Gi.jump, 0, 1);
      api.present?.({ sheet: 'attack', frame: 2, x: stand[0], y: stand[1] - Math.sin(k * Math.PI) * Gi.jumpH });
      if (!giant && t >= p3Start + Gi.throwAt) {
        api.sfx?.('jump', { volume: 0.5, rate: 2, pitch: true }); api.sfx?.('gerson_boost', { volume: 0.6 }); api.sfx?.('gerson_smallswing', { volume: 0.7, rate: 0.5, pitch: true });
        const tx = b.x + b.w / 2, ox = stand[0] - 10, oy = stand[1] - 60, vy0 = V(Gi.vy), apex = -vy0 / G(C.g);
        giant = keep(api, { x: ox, y: oy, r: 0, kind: 'white', shape: 'giant_flag', free: true, life: 6, vx: (tx - ox) / apex, vy: vy0, phase: 'up', holdT: 0, slammed: false, gone: false,
          steer(self, dt2) {
            if (self.phase === 'up') { self.vy += G(C.g) * dt2; self.rot = (self.rot || 0) + Gi.spin * 30 * dt2; if (self.vy >= 0) { self.phase = 'hold'; self.vx = 0; self.vy = 0; self.rot = Gi.holdAngle; } }
            else if (self.phase === 'hold') { self.vx = 0; self.vy = 0; self.holdT += dt2; if (self.holdT >= Gi.hold) { self.phase = 'fall'; api.sfx?.('gerson_fall', { volume: 0.6, rate: 2, pitch: true }); } }
            else {
              self.vy = Math.min(V(18), self.vy + G(C.g) * 2 * dt2);
              const top = api.box.y;
              if (!self.slammed && self.y + 30 >= top) { self.slammed = true; api.sfx?.('impact', { volume: 0.9 }); api.sfx?.('gerson_metal_hit_reverb', { volume: 0.7 }); api.shake?.(0.3, 4); const bb = api.box; api.setBoard?.(bb.x + bb.w / 2, bb.y + bb.h / 2 + Gi.push); }
              if (!self.gone && self.y > 380) { self.gone = true; api.sfx?.('gerson_glassbreak', { volume: 0.74, rate: 0.5, pitch: true }); api.sfx?.('gerson_explosion_firework', { volume: 0.6, rate: 0.75, pitch: true }); api.shake?.(0.3, 4); self.life = Math.min(self.life, self.age + 0.05); }
            }
          },
          hitShape(self, soul) { return self.phase === 'fall' && Math.abs(soul.x - self.x) <= 24 + soul.r - 3 && Math.abs(soul.y - self.y) <= 40 + soul.r - 3; },
          drawShape(ctx, self) { drawFlag(ctx, api.images?.flag, self.x, self.y, C.flag * Gi.scale, self.rot || 0); } });
      }
    }
  } };
}

// ── 2. 짓누르기 → 순간이동 내려찍기(원작 그대로) ──
/** 분신 하나: T 에 순간이동 → 떠오름 → 흰 섬광·하얀 칸(경고) → 내리찍기(연보라 궤적) → 착지. stripTop/Bottom 사이 칸이 맞는 자리 */
function spawnStomp(api, C, x, at, slow, stripTop, stripBottom, red = false) {
  const flash = slow ? C.slowFlashAt : C.flashAt, stomp = slow ? C.slowStompAt : C.stompAt, mid = 240;
  const [l, r] = x < mid ? C.col : C.colRight, x0 = x + l, x1 = x + r;
  const sounds = { tp: false, eye: false, mid: false, down: false, land: false };
  api.emit({ x, y: stripTop, r: 0, kind: 'white', shape: 'stomp', free: true, life: stomp + C.hit + 0.35, age: 0,
    steer(self) {
      const a = self.age;
      if (!sounds.tp) { sounds.tp = true; api.sfx?.('gerson_motor_swing_down', { volume: 0.35, rate: 1.4, pitch: true }); }
      if (!sounds.eye && a >= flash + C.telegraphDelay) { sounds.eye = true; api.sfx?.('gerson_eye_telegraph', { volume: 0.4 }); }
      if (!sounds.mid && a >= stomp - F(2)) { sounds.mid = true; api.sfx?.('gerson_motor_upper_quick_mid', { volume: 0.35 }); }
      if (!sounds.down && a >= stomp) { sounds.down = true; api.sfx?.('gerson_motor_swing_down', { volume: 0.45 }); }
      if (!sounds.land && a >= stomp + C.landAt) { sounds.land = true; api.sfx?.('impact', { volume: 0.5 }); api.shake?.(0.08, 1.5); }
    },
    hitShape(self, soul) { const a = self.age - stomp; return a >= 0 && a <= C.hit && soul.x + soul.r - 3 > x0 && soul.x - soul.r + 3 < x1 && soul.y + soul.r - 3 > stripTop && soul.y - soul.r + 3 < stripBottom; },
    drawShape(ctx, self) {
      const a = self.age, feet = stripBottom;
      // 경고 칸: 흰색이 0→1(5f)→0(5f), 응용판은 빨강으로 남는다
      if (a >= flash && a < stomp + C.hit) {
        const w = a - flash, al = red ? (a < stomp ? 0.35 + 0.35 * blink(self, 12) : 0.85) : w < F(5) ? w / F(5) : Math.max(0, 1 - (w - F(5)) / F(5));
        if (al > 0) { ctx.save(); ctx.fillStyle = red ? `rgba(255,40,40,${al})` : `rgba(255,255,255,${al})`; ctx.fillRect(Math.round(x0), Math.round(stripTop), Math.round(x1 - x0), Math.round(stripBottom - stripTop)); ctx.restore(); }
      }
      if (a < C.cloneAt) return;
      if (a < stomp) {
        const k = clamp((a - C.cloneAt) / F(10), 0, 1), lift = C.cloneRise * easeOut(k), white = a >= flash && a < flash + F(3);
        drawClone(ctx, api, x + 6, stripTop - 6 - lift, 2, 0.85, white);
        if (a >= flash && a < flash + F(15)) { const s = (a - flash) * 75, al = 0.6 * (1 - (a - flash) / F(15)); for (const [dx, dy] of [[s, 0], [-s, 0], [0, s], [0, -s]]) drawClone(ctx, api, x + 6 + dx, stripTop - 6 - lift + dy, 2, al, true); }
      } else if (a < stomp + C.hit + 0.3) {
        const k = clamp((a - stomp) / F(3), 0, 1), y = stripTop - 6 - C.cloneRise + (feet - stripTop + 6 + C.cloneRise) * easeOut(k);
        art(ctx, api.images?.slash, 'slash', 1, x + 4, y - 30, 70, null, Math.PI / 2, 0.55 * (1 - k * 0.5));
        drawClone(ctx, api, x + 6, y, 3, 1 - clamp((a - stomp - C.hit) / 0.3, 0, 1));
      }
    } });
}
function stomp(o = {}) {
  const C = { ...STOMP, ...o };
  let started = false, base = null, landed = false, wave = 0;
  const waves = C.waves.map(w => ({ ...w, made: 0 }));
  return { duration: C.duration, board: C.board, center: C.center, update(t, dt, api) {
    const b = api.box;
    if (!base) base = { cx: b.x + b.w / 2, cy: b.y + b.h / 2 };
    if (!started) { started = true; api.sfx?.('jump', { volume: 0.5 }); api.sfx?.('gerson_rocket', { volume: 0.5 }); api.sfx?.('gerson_screenshake', { volume: 0.5 }); api.shake?.(0.2, 2); }
    // 솟구침(잔상) → 화면 위에서 상자 위로 떨어짐 → 짓눌러 길쭉하게
    if (t < C.rise) { const k = t / C.rise; api.present?.({ sheet: 'attack', frame: 2, y: (api.actor?.y ?? 200) - 260 * easeOut(k) }); }
    else if (t < C.rise + C.fall) { const k = (t - C.rise) / C.fall; api.present?.({ sheet: 'attack', frame: 3, x: base.cx, y: -40 + (b.y + 4 + 40) * k }); }
    else if (t < C.rise + C.fall + C.squash) {
      if (!landed) { landed = true; api.sfx?.('gerson_screenshake', { volume: 0.5 }); api.shake?.(0.15, 2); }
      const k = (t - C.rise - C.fall) / C.squash; let w = C.keys[0][1], h = C.keys[0][2];
      for (let i = 1; i < C.keys.length; i++) { const [k0, w0, h0] = C.keys[i - 1], [k1, w1, h1] = C.keys[i]; if (k <= k1) { const u = (k - k0) / (k1 - k0); w = w0 + (w1 - w0) * u; h = h0 + (h1 - h0) * u; break; } w = w1; h = h1; }
      const bottom = base.cy + 56; api.setBoard?.(C.stripX, bottom - h / 2, w, h);
      api.present?.({ sheet: 'attack', frame: 3, x: C.stripX, y: bottom - h + 4 });
    } else api.present?.({ hidden: true });
    const T0 = C.rise + C.fall + C.squash - F(34);
    for (const w of waves) {
      while (w.made < w.xs.length && t >= T0 + F(w.at + w.made * w.step)) {
        const bb = api.box; spawnStomp(api, C, S(w.xs[w.made]), 0, !!w.slow, bb.y, bb.y + bb.h); w.made++; wave++;
      }
    }
  } };
}

// ── 2'. 응용: 상자는 그대로, 흰 훑기 줄이 지나가며 칸을 표시 → 빨갛게 → 분신이 찍는다 ──
function stompScan(o = {}) {
  const C = { ...STOMP, ...SCAN, ...o };
  let round = 0, lastSafe = -1;
  return { duration: C.duration, update(t, dt, api) {
    const b = api.box;
    while (round < C.rounds && t >= C.first + round * C.every) {
      const dir = round % 2 ? -1 : 1, slotW = b.w / C.slots, at = C.first + round * C.every;
      let safe; do { safe = Math.floor(api.rnd() * (C.slots - C.safe + 1)); } while (safe === lastSafe && C.slots > C.safe + 1);
      lastSafe = safe;
      const cols = [...Array(C.slots).keys()].filter(i => i < safe || i >= safe + C.safe);
      api.sfx?.('gerson_eye_telegraph', { volume: 0.5 });
      api.emit({ x: b.x, y: b.y, r: 0, harmless: true, life: C.sweep, shape: 'scan_bar',
        drawShape(ctx, self) {
          const k = clamp(self.age / C.sweep, 0, 1), sx = dir > 0 ? b.x + b.w * k : b.x + b.w * (1 - k);
          ctx.save(); ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fillRect(Math.round(sx) - 1, Math.round(b.y + 2), 3, Math.round(b.h - 4));
          ctx.fillStyle = 'rgba(200,200,200,0.28)';
          for (const i of cols) { const cx0 = b.x + i * slotW, passed = dir > 0 ? sx >= cx0 : sx <= cx0 + slotW; if (passed) ctx.fillRect(Math.round(cx0 + 1), Math.round(b.y + 2), Math.round(slotW - 2), Math.round(b.h - 4)); }
          ctx.restore();
        } });
      const order = dir > 0 ? cols : [...cols].reverse();
      order.forEach((i, n) => {
        const x = b.x + (i + 0.5) * slotW;
        api.emit({ x, y: b.y, r: 0, harmless: true, free: true, life: C.sweep + n * C.stompGap, shape: 'scan_wait', fired: false,
          steer(self) { if (!self.fired && self.age >= self.life - 0.01) { self.fired = true; spawnScanStomp(api, C, x, slotW, b); } }, drawShape() {} });
      });
      round++;
    }
  } };
}
function spawnScanStomp(api, C, x, slotW, b) {
  const x0 = x - slotW / 2 + 1, x1 = x + slotW / 2 - 1, red = C.red, sound = { down: false, land: false };
  api.emit({ x, y: b.y, r: 0, kind: 'white', shape: 'scan_stomp', free: true, life: red + C.hit + 0.3,
    steer(self) {
      if (!sound.down && self.age >= red) { sound.down = true; api.sfx?.('gerson_motor_swing_down', { volume: 0.45 }); }
      if (!sound.land && self.age >= red + F(3)) { sound.land = true; api.sfx?.('impact', { volume: 0.5 }); api.shake?.(0.08, 2); }
    },
    hitShape(self, soul) { const a = self.age - red; return a >= 0 && a <= C.hit && soul.x + soul.r - 3 > x0 && soul.x - soul.r + 3 < x1; },
    drawShape(ctx, self) {
      const a = self.age;
      ctx.save(); ctx.beginPath(); ctx.rect(b.x + 2, b.y + 2, b.w - 4, b.h - 4); ctx.clip();
      ctx.fillStyle = a < red ? `rgba(255,40,40,${blink(self, 14) ? 0.55 : 0.3})` : `rgba(255,40,40,${Math.max(0, 0.85 - (a - red) * 2.5)})`;
      ctx.fillRect(Math.round(x0), Math.round(b.y + 2), Math.round(x1 - x0), Math.round(b.h - 4));
      ctx.restore();
      if (a >= red - 0.12) { const k = clamp((a - red + 0.12) / 0.15, 0, 1); drawClone(ctx, api, x + 6, b.y - 40 + (b.h + 36) * easeOut(k), 3, 1 - clamp((a - red - C.hit) / 0.3, 0, 1)); }
    } });
}

// ── 3. 드럼통 핑퐁(원작 등껍질) ──
function drum(o = {}) {
  const C = { ...DRUM, ...o }, Fi = C.finale;
  let ball = null, phase = 'enter', bounces = 0, returns = 0, speed = 0, hitT = 0, actorAt = null, finaleT = 0, fin = null, ended = false, starT = 0, lastExit = 0, vanished = false, endAt = null;
  const heroAt = (api, x, y, sheet, frame, flip) => api.present?.({ sheet, frame, x, y, flipX: flip });
  const whirl = (api, x, y) => {
    api.sfx?.('gerson_motor_swing_down', { volume: 0.55, rate: 1.4, pitch: true });
    api.emit({ x, y, r: 0, harmless: true, free: true, life: 0.36, shape: 'whirl', drawShape(ctx, self) { art(ctx, api.images?.whirl, 'whirl', Math.min(3, Math.floor(self.age / 0.09)), self.x, self.y, 64); } });
  };
  const slash = (api, x, y, flip) => api.emit({ x, y, r: 0, harmless: true, free: true, life: 0.2, shape: 'slash', drawShape(ctx, self) { art(ctx, api.images?.slash, 'slash', Math.min(2, Math.floor(self.age / 0.07)), self.x, self.y, 80, null, 0, 1, flip); } });
  const aim = (api, b, fromX, fromY) => {
    let tx = api.soul.x, ty = api.soul.y;
    if (api.rnd() < 0.5) ty = ty < b.y + b.h / 2 ? 2 * (b.y + C.drumR) - ty : 2 * (b.y + b.h - C.drumR) - ty;
    const a = Math.atan2(ty - fromY, tx - fromX); return [Math.cos(a) * speed, Math.sin(a) * speed];
  };
  const starTrail = (api, x, y) => api.emit({ x, y, r: C.starR, kind: 'white', shape: 'star', free: true, life: C.starLife,
    hitShape(self, soul) { return Math.hypot(soul.x - self.x, soul.y - self.y) <= self.r * (self.age < C.starShrink ? 1 : 0.5) + soul.r - 2; },
    drawShape(ctx, self) { const k = self.age < C.starShrink ? 1 : 1 - (self.age - C.starShrink) / (C.starLife - C.starShrink); drawStar(ctx, api.images?.star, self.x, self.y, C.starSize * Math.max(0.05, k), self.age * C.starSpin * 30); } });
  return { get duration() { return endAt ?? C.duration; }, board: C.board, center: C.center, update(t, dt, api) {
    const b = api.box, cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    if (phase === 'enter') {
      if (!actorAt) { actorAt = [b.x + b.w + 70, cy + 20]; api.sfx?.('gerson_boost', { volume: 0.6 }); }
      const k = clamp(t / C.enter, 0, 1); heroAt(api, actorAt[0] - C.enterSlide * easeOut(k), actorAt[1], 'attack', 0, true);
      if (t >= C.enter && phase === 'enter') { phase = 'windup'; hitT = t; api.sfx?.('gerson_motor_upper_quick_mid', { volume: 0.6 }); }
      return;
    }
    if (phase === 'windup') {
      heroAt(api, actorAt[0] - C.enterSlide, actorAt[1], 'attack', 1, true);
      if (t - hitT >= C.windup) {
        phase = 'fly'; speed = C.speeds[0]; const sx = actorAt[0] - C.enterSlide - 30, sy = actorAt[1] - 40;
        api.sfx?.('rudebuster_swing', { volume: 0.7 }); api.shake?.(0.12, 2); slash(api, sx + 6, sy, true);
        const [vx, vy] = aim(api, b, sx, sy);
        ball = keep(api, { x: sx, y: sy, r: C.drumR, kind: 'white', shape: 'drum', free: true, life: 999, vx, vy, squash: 0, hold: 0, out() { return this.life <= this.age; },
          hitShape(self, soul) { return Math.hypot(soul.x - self.x, soul.y - self.y) <= C.drumR + soul.r - 2; },
          drawShape(ctx, self) {
            const img = api.images?.drum, h = C.drumH, w = img?.width ? h * img.width / img.height : h * 0.6, sq = self.hold > 0 ? [1.5, 0.5] : [1, 1];
            ctx.save(); ctx.translate(Math.round(self.x), Math.round(self.y)); ctx.rotate(self.rot || 0); ctx.scale(sq[0], sq[1]); ctx.imageSmoothingEnabled = false;
            if (img?.width) ctx.drawImage(img, -Math.round(w / 2), -Math.round(h / 2), Math.round(w), Math.round(h)); else { ctx.fillStyle = '#3b6fd6'; ctx.fillRect(-w / 2, -h / 2, w, h); }
            ctx.restore();
          } });
        hitT = t; starT = t; vanished = false;
      }
      return;
    }
    if (!ball) return;
    if (phase === 'fly' || phase === 'swing') {
      // 쳐 낸 뒤 8f 에 청소부가 회오리로 사라진다
      if (actorAt && !vanished && t - hitT >= C.vanishAfter) { vanished = true; whirl(api, actorAt[0], actorAt[1] - 40); }
      if (t - hitT >= C.vanishAfter) api.present?.({ hidden: true });
      else if (actorAt) heroAt(api, actorAt[0], actorAt[1], 'attack', 3, actorAt[2] ?? true);
      if (ball.hold > 0) { ball.hold -= dt; ball.vx = ball.vx || 0; if (ball.hold <= 0) { ball.vx = ball.saved[0]; ball.vy = -ball.saved[1]; } else { ball.vx = 0; ball.vy = 0; } }
      else {
        ball.rot = (ball.rot || 0) + dt * 10;
        while (t - starT >= C.starEvery) { starT += C.starEvery; starTrail(api, ball.x, ball.y); }
        const inside = ball.x > b.x && ball.x < b.x + b.w;
        if (inside && bounces < C.bounceMax && ((ball.vy < 0 && ball.y - C.drumR <= b.y) || (ball.vy > 0 && ball.y + C.drumR >= b.y + b.h))) {
          bounces++; ball.saved = [ball.vx, ball.vy]; ball.hold = C.squash; ball.vx = 0; ball.vy = 0; ball.y = clamp(ball.y, b.y + C.drumR, b.y + b.h - C.drumR);
          api.sfx?.('gerson_parry_fast_nodelay', { volume: 0.6 }); api.shake?.(0.08, 1.5);
          const push = ball.saved[1] > 0 ? C.push : -C.push; api.setBoard?.(cx, cy + push); api.emit({ x: 0, y: 0, r: 0, harmless: true, free: true, life: C.squash, shape: 'box_back', fired: false, steer(self) { if (!self.fired && self.age >= C.squash - 0.01) { self.fired = true; const bb = api.box; api.setBoard?.(bb.x + bb.w / 2, bb.y + bb.h / 2 - push); } }, drawShape() {} });
        }
      }
      const outside = ball.x < b.x - 14 || ball.x > b.x + b.w + 14;
      if (phase === 'fly' && outside && t - lastExit > 0.3) {
        if (returns >= C.returns) { phase = 'finale'; finaleT = t; return; }
        phase = 'swing'; lastExit = t; hitT = t;
        const px = ball.x + ball.vx * C.predict, py = ball.y + ball.vy * C.predict, side = ball.x < cx ? -1 : 1;
        actorAt = [px + side * 26, py + 40, side < 0 ? false : true]; ball.exitAt = t;
        api.emit({ x: px, y: py, r: 0, harmless: true, free: true, life: C.whirlAt + 0.01, shape: 'whirl_wait', fired: false, steer(self) { if (!self.fired && self.age >= C.whirlAt) { self.fired = true; whirl(api, actorAt[0], actorAt[1] - 40); } }, drawShape() {} });
      }
      if (phase === 'swing') {
        const a = t - ball.exitAt;
        if (a >= C.whirlAt) heroAt(api, actorAt[0], actorAt[1], 'attack', a >= C.swingAt ? 3 : 1, actorAt[2]);
        if (a >= C.hitAt) {
          returns++; speed = C.speeds[Math.min(C.speeds.length - 1, Math.floor(returns / 3))];
          ball.x = actorAt[0] - (actorAt[2] ? 26 : -26); ball.y = actorAt[1] - 40;
          const [vx, vy] = aim(api, b, ball.x, ball.y); ball.vx = vx; ball.vy = vy;
          api.sfx?.('gerson_queen_punched_lower', { volume: 0.7 }); api.shake?.(0.12, 2); slash(api, ball.x + (actorAt[2] ? 8 : -8), ball.y, actorAt[2]);
          phase = 'fly'; hitT = t; starT = t; vanished = false;
        }
      }
      return;
    }
    // 마무리: 드럼통이 상자 위로 돌며 오르고, 청소부가 뒤에서 솟아 내리꽂는다 → 바닥에서 폭발, 별 분수
    if (phase === 'finale') {
      const a = t - finaleT;
      if (!fin) {
        fin = { from: [ball.x, ball.y], to: [cx, b.y - 40], hero: [cx + 10, b.y + b.h + 30], slammed: false, boomed: false };
        ball.hitShape = () => false; api.sfx?.('jump', { volume: 0.5 });
      }
      if (!fin.slammed) {
        const k = clamp(a / Fi.rise, 0, 1);
        ball.x = fin.from[0] + (fin.to[0] - fin.from[0]) * easeOut(k); ball.y = fin.from[1] + (fin.to[1] - fin.from[1]) * easeOut(k); ball.rot = Fi.spin * k; ball.vx = 0; ball.vy = 0;
        heroAt(api, fin.hero[0], fin.hero[1] - Fi.heroRise * easeOut(k), 'attack', 2, true);
        if (k >= 1) {
          fin.slammed = true; api.sfx?.('gerson_queen_punched_lower_heavy', { volume: 0.8 }); api.sfx?.('rudebuster_swing', { volume: 0.6 }); api.shake?.(0.3, 4);
          ball.vy = Fi.fall; ball.hitShape = (self, soul) => Math.hypot(soul.x - self.x, soul.y - self.y) <= C.drumR + soul.r - 2;
          for (const d of [0, 0.08]) api.emit({ x: ball.x, y: ball.y, r: 0, harmless: true, free: true, life: 0.4 + d, ring: d, shape: 'sonic', drawShape(ctx, self) { const k2 = clamp((self.age - self.ring) / 0.4, 0, 1); if (self.age < self.ring) return; ctx.save(); ctx.strokeStyle = `rgba(255,255,255,${1 - k2})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(self.x, self.y, Math.max(1, 10 + 60 * k2), Math.max(1, 4 + 20 * k2), 0, 0, TAU); ctx.stroke(); ctx.restore(); } });
        }
      } else {
        api.present?.({ hidden: true });
        const floor = b.y + b.h - C.drumR;
        if (!fin.boomed && ball.y >= floor) {
          fin.boomed = true; ball.life = Math.min(ball.life, ball.age); ball.vy = 0; api.shake?.(0.3, 4);
          api.sfx?.('gerson_explosion_firework', { volume: 0.6 }); api.sfx?.('gerson_stardrop', { volume: 0.3, rate: 0.75, pitch: true });
          for (let i = 0; i < Fi.smoke; i++) { const ang = i / Fi.smoke * TAU; api.emit({ x: ball.x, y: floor, r: 0, harmless: true, free: true, life: 0.6, vx: Math.cos(ang) * 60, vy: Math.sin(ang) * 40 - 30, shape: 'smoke', drawShape(ctx, self) { ctx.save(); ctx.globalAlpha = 0.6 * (1 - self.age / 0.6); ctx.fillStyle = '#c9ccd2'; ctx.beginPath(); ctx.arc(self.x, self.y, Math.max(1, 6 + self.age * 14), 0, TAU); ctx.fill(); ctx.restore(); } }); }
          for (let i = 0; i < Fi.stars; i++) {
            const ang = -Math.PI / 2 + (api.rnd() * 2 - 1) * 1.1, sp = Fi.starSpeed[0] + api.rnd() * (Fi.starSpeed[1] - Fi.starSpeed[0]), g = Fi.starG[0] + api.rnd() * (Fi.starG[1] - Fi.starG[0]);
            api.emit({ x: ball.x, y: floor, r: C.starR, kind: 'white', shape: 'star_fountain', free: true, life: 2.6, vx: Math.cos(ang) * sp * 0.6, vy: Math.sin(ang) * sp, ay: g,
              out() { return this.age >= this.life || this.y > 400; },
              hitShape(self, soul) { return self.age >= Fi.grey && Math.hypot(soul.x - self.x, soul.y - self.y) <= C.starR + soul.r - 2; },
              drawShape(ctx, self) { drawStar(ctx, api.images?.star, self.x, self.y, C.starSize, self.age * C.starSpin * 30, self.age < Fi.grey ? 0.45 : 1); } });
          }
          finaleT = t;
        }
        if (fin.boomed && !ended && t - finaleT >= Fi.tail) { ended = true; endAt = t; }
      }
    }
  } };
}

/** 회오리 순간이동(사라지거나 나타나는 자리) + 소리 */
function whirlAt(api, x, y) {
  api.sfx?.('gerson_motor_swing_down', { volume: 0.4, rate: 1.4, pitch: true });
  api.emit({ x, y, r: 0, harmless: true, free: true, life: 0.36, shape: 'whirl', drawShape(ctx, self) { art(ctx, api.images?.whirl, 'whirl', Math.min(3, Math.floor(self.age / 0.09)), self.x, self.y, 64); } });
}

// ── 4. 한 번씩 휭 퍽(BUILD469) ──
// 사용자: “청소부 내려찍는패턴 그냥 일반 피하는 사각형 내에서 한번씩 휭 퍽 휭퍽 왼쪽에서 오른쪽 오른쪽에서 왼쪽 위에서아래 아래서 위 이렇게 전환되면서 하는 패턴도”, “지금은 너무 연속되게만 하는듯?”
//   [동작 → 실루엣 → 예고 → 회피] 회오리로 상자 바깥(왼·오·위·아래 모서리)에 나타나 깃발을 젖힘 → 하트가 있던 줄(가로)·칸(세로)이 하얗게 깜빡임
//   → 휭(휘두름, 흰 초승달이 그 줄을 훑음) → 퍽(끝에 닿아 상자가 흔들림). 한 번에 한 줄만, 사이에 숨 돌릴 틈. 갈수록 조금 빨라진다
/** 방향별 휘두르는 자리: 청소부 발 위치·좌우 반전·[젖힘, 휘두름] 공격 시트 칸(2 머리 위로 듦·3 아래로 내리침·4 앞으로 내지름 — 시트는 오른쪽을 본다), 초승달 회전, 줄의 시작→끝 축 */
export function crossStrike(dir, b, at, C = CROSS) {
  const half = C.band / 2, cx = b.x + b.w / 2, cy = b.y + b.h / 2;
  const across = dir === 'lr' || dir === 'rl' ? clamp(at, b.y + half, b.y + b.h - half) : clamp(at, b.x + half, b.x + b.w - half);
  if (dir === 'lr') return { dir, band: [b.x, across - half, b.w, C.band], from: b.x, to: b.x + b.w, axis: 'x', rot: 0, hero: [b.x - C.side, across + C.feetBelow], flip: false, frames: [2, 4] };
  if (dir === 'rl') return { dir, band: [b.x, across - half, b.w, C.band], from: b.x + b.w, to: b.x, axis: 'x', rot: Math.PI, hero: [b.x + b.w + C.side, across + C.feetBelow], flip: true, frames: [2, 4] };
  if (dir === 'tb') return { dir, band: [across - half, b.y, C.band, b.h], from: b.y, to: b.y + b.h, axis: 'y', rot: Math.PI / 2, hero: [across, b.y - C.above], flip: across > cx, frames: [2, 3] };
  return { dir, band: [across - half, b.y, C.band, b.h], from: b.y + b.h, to: b.y, axis: 'y', rot: -Math.PI / 2, hero: [across < cx ? b.x - C.side : b.x + b.w + C.side, b.y + b.h + C.belowFeet], flip: across >= cx, frames: [3, 2] };
}
/** i 번째 휘두름 시각(초): 간격이 every[0] 에서 every[1] 로 줄어든다 */
export function crossStrikeTimes(C = CROSS) {
  const out = []; let t = C.first;
  for (let i = 0; i < C.strikes; i++) { out.push(t); const k = C.strikes > 1 ? i / (C.strikes - 1) : 0; t += C.every[0] + (C.every[1] - C.every[0]) * k; }
  return out;
}
function stompCross(o = {}) {
  const C = { ...CROSS, ...o }, times = crossStrikeTimes(C);
  const duration = times.at(-1) + C.warn[1] + C.sweep + C.linger + 0.35;
  let made = 0, current = null, left = false;
  return { duration, board: C.board, center: C.center, update(t, dt, api) {
    const b = api.box;
    if (!left) { left = true; whirlAt(api, (api.actor?.x ?? 400), (api.actor?.y ?? 220) - 40); }
    if (t < times[0]) api.present?.({ hidden: true });
    while (made < times.length && t >= times[made]) {
      const k = times.length > 1 ? made / (times.length - 1) : 0, warn = C.warn[0] + (C.warn[1] - C.warn[0]) * k;
      const dir = C.dirs[made % C.dirs.length], s = crossStrike(dir, b, dir === 'lr' || dir === 'rl' ? api.soul.y : api.soul.x, C);
      current = { s, at: times[made], warn };
      spawnCrossStrike(api, C, s, warn);
      made++;
    }
    if (!current) return;
    const a = t - current.at, s = current.s;
    if (a < current.warn) api.present?.({ sheet: 'attack', frame: s.frames[0], x: s.hero[0], y: s.hero[1], flipX: s.flip });
    else if (a < current.warn + C.sweep + C.linger) api.present?.({ sheet: 'attack', frame: s.frames[1], x: s.hero[0], y: s.hero[1], flipX: s.flip });
    else api.present?.({ hidden: true });
  } };
}
function spawnCrossStrike(api, C, s, warn) {
  const [bx, by, bw, bh] = s.band, sound = { swing: false, hit: false }, end = warn + C.sweep + C.linger;
  const front = age => { const k = clamp((age - warn) / C.sweep, 0, 1); return s.from + (s.to - s.from) * k; };
  const swept = age => {
    if (age < warn) return null;
    const f = front(age), lo = Math.min(s.from, f), hi = Math.max(s.from, f);
    return s.axis === 'x' ? [lo, by, hi - lo, bh] : [bx, lo, bw, hi - lo];
  };
  whirlAt(api, s.hero[0], s.hero[1] - 40);
  api.emit({ x: bx, y: by, r: 0, kind: 'white', shape: 'cross_strike', free: true, life: end + 0.2,
    steer(self) {
      if (!sound.swing && self.age >= warn) { sound.swing = true; api.sfx?.('gerson_motor_swing_down', { volume: 0.65 }); api.sfx?.('gerson_smallswing', { volume: 0.5, rate: 0.8, pitch: true }); }
      if (!sound.hit && self.age >= warn + C.sweep) { sound.hit = true; api.sfx?.('gerson_queen_punched_lower', { volume: 0.75 }); api.shake?.(0.12, 2.5); }
    },
    hitShape(self, soul) {
      const r = self.age <= end ? swept(self.age) : null; if (!r) return false;
      return soul.x + soul.r - 3 > r[0] && soul.x - soul.r + 3 < r[0] + r[2] && soul.y + soul.r - 3 > r[1] && soul.y - soul.r + 3 < r[1] + r[3];
    },
    drawShape(ctx, self) {
      const a = self.age;
      ctx.save();
      if (a < warn) {
        // 예고: 하얀 줄이 깜빡이며 점점 진해진다
        const al = (0.18 + 0.32 * clamp(a / warn, 0, 1)) * (blink(self, 12) ? 1 : 0.55);
        ctx.fillStyle = `rgba(255,255,255,${al})`; ctx.fillRect(Math.round(bx), Math.round(by), Math.round(bw), Math.round(bh));
        ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 1; ctx.strokeRect(Math.round(bx) + 0.5, Math.round(by) + 0.5, Math.round(bw) - 1, Math.round(bh) - 1);
      } else {
        const r = swept(a), fade = a > warn + C.sweep ? Math.max(0, 1 - (a - warn - C.sweep) / (C.linger + 0.2)) : 1;
        ctx.fillStyle = `rgba(255,255,255,${0.75 * fade})`; ctx.fillRect(Math.round(r[0]), Math.round(r[1]), Math.round(r[2]), Math.round(r[3]));
        const f = front(Math.min(a, warn + C.sweep)), mid = s.axis === 'x' ? [f, by + bh / 2] : [bx + bw / 2, f];
        art(ctx, api.images?.slash, 'slash', a < warn + C.sweep * 0.5 ? 1 : 2, mid[0], mid[1], C.band * 1.4, null, s.rot, fade);
      }
      ctx.restore();
    } });
}

// ── 5. 멸공 파동(BUILD469) ──
// 사용자: “멸공을 외치며 청소부 공격시 나가는 파동으로 쏴서 왼쪽에서 오른쪽으로 나가는것 여러개 피해야하는 패턴 난이도는 꽤나 어려운 보스전임”
//   [동작 → 실루엣 → 예고 → 회피] 회오리로 상자 왼쪽에 나타나 깃발을 휘두를 때마다 붉은 3겹 파동(청소부 공격 그림 janitor-red-triple)이 줄을 따라 오른쪽으로
//   → 쏘기 전 그 줄에 붉은 점선 예고 → 1단계 하트 줄 겨누기 연사, 2단계 한 줄만 비운 벽(빈 줄이 매번 옮겨 감), 3단계 홀·짝 줄 번갈아(줄 사이를 계속 갈아타야 함)
/** 단계별 발사 목록 [{ at, lanes, aim }] — aim 이면 쏠 때 하트가 있는 줄 */
export function waveVolleys(C = WAVE, rnd = Math.random) {
  const out = [], L = C.lanes;
  for (let i = 0; i < C.aimed.count; i++) out.push({ at: C.aimed.at + i * C.aimed.every, lanes: null, aim: true });
  let gap = Math.floor(rnd() * L);
  for (let i = 0; i < C.walls.count; i++) {
    let next; do { next = clamp(gap + (rnd() < 0.5 ? -1 : 1) * (1 + Math.floor(rnd() * C.walls.shift)), 0, L - 1); } while (next === gap);
    gap = next;
    out.push({ at: C.walls.at + i * C.walls.every, lanes: [...Array(L).keys()].filter(lane => lane !== gap), aim: false });
  }
  for (let i = 0; i < C.weave.count; i++) out.push({ at: C.weave.at + i * C.weave.every, lanes: [...Array(L).keys()].filter(lane => lane % 2 === i % 2), aim: false });
  return out;
}
function wave(o = {}) {
  const C = { ...WAVE, ...o };
  let volleys = null, fired = 0, warned = 0, spot = null, swingAt = -9, outAt = null;
  return { duration: C.duration, board: C.board, center: C.center, update(t, dt, api) {
    const b = api.box, laneH = b.h / C.lanes;
    if (!volleys) {
      volleys = waveVolleys(C, api.rnd);
      spot = [b.x - C.side, b.y + b.h / 2 + C.feetBelow];
      whirlAt(api, api.actor?.x ?? 400, (api.actor?.y ?? 220) - 40);
    }
    const laneOf = y => clamp(Math.floor((y - b.y) / laneH), 0, C.lanes - 1);
    // 예고: 쏘기 warn 초 전에 그 줄에 붉은 점선
    while (warned < volleys.length && t >= volleys[warned].at - C.warn) {
      const v = volleys[warned]; if (v.aim) v.lanes = [laneOf(api.soul.y)];
      for (const lane of v.lanes) {
        const y = b.y + (lane + 0.5) * laneH;
        api.emit({ x: b.x, y, r: 0, harmless: true, free: true, life: C.warn, shape: 'wave_warn',
          drawShape(ctx, self) {
            const k = clamp(self.age / C.warn, 0, 1); ctx.save(); ctx.fillStyle = `rgba(255,48,48,${0.35 + 0.5 * k})`;
            for (let x = b.x + 4 + Math.floor(self.age * 120) % 10; x < b.x + b.w - 4; x += 10) ctx.fillRect(Math.round(x), Math.round(self.y) - 1, 5, 2);
            ctx.restore();
          } });
      }
      warned++;
    }
    while (fired < volleys.length && t >= volleys[fired].at) {
      const v = volleys[fired];
      for (const lane of v.lanes) spawnWave(api, C, b, b.y + (lane + 0.5) * laneH);
      api.sfx?.('rudebuster_swing', { volume: 0.55, rate: 0.95 + api.rnd() * 0.15, pitch: true }); api.shake?.(0.06, 1.5);
      swingAt = t; fired++;
    }
    if (t < C.appear) { api.present?.({ hidden: true }); return; }
    if (!spot.shown) { spot.shown = true; whirlAt(api, spot[0], spot[1] - 40); }
    if (outAt === null && fired >= volleys.length && t >= volleys.at(-1).at + C.exitAfter) {
      outAt = t; whirlAt(api, spot[0], spot[1] - 40);
    }
    if (outAt !== null) { api.present?.({ hidden: true }); return; }
    const swinging = t - swingAt < C.swingHold;
    // 머리 위로 든 깃발(2)을 쏠 때마다 앞으로 내지른다(4)
    api.present?.({ sheet: 'attack', frame: swinging ? 4 : 2, x: spot[0], y: spot[1], flipX: false });
  } };
}
function spawnWave(api, C, b, y) {
  api.emit({ x: b.x - 6, y, r: 0, kind: 'white', shape: 'red_wave', free: true, life: (b.w + 40) / C.speed, vx: C.speed, vy: 0,
    hitShape(self, soul) { return Math.abs(soul.x - (self.x + C.hitDx)) <= C.hitW + soul.r - 2 && Math.abs(soul.y - self.y) <= C.hitH + soul.r - 3; },
    drawShape(ctx, self) {
      const frame = Math.floor(self.age * 16) % 4;
      ctx.save(); ctx.beginPath(); ctx.rect(b.x + 1, b.y + 1, b.w - 2, b.h - 2); ctx.clip();
      for (let i = C.trail; i >= 1; i--) art(ctx, api.images?.wave, 'wave', frame, self.x - i * C.trailGap, self.y, C.size, C.size, 0, 0.35 / i);
      if (!art(ctx, api.images?.wave, 'wave', frame, self.x, self.y, C.size, C.size)) { ctx.fillStyle = '#e8261f'; ctx.fillRect(Math.round(self.x - 4), Math.round(self.y - 12), 10, 24); }
      ctx.restore();
    } });
}

export const JANITOR_PATTERNS = { janitor_kick_flags: kickFlags, janitor_stomp: stomp, janitor_drum: drum, janitor_stomp_scan: stompScan, janitor_stomp_cross: stompCross, janitor_wave: wave };
