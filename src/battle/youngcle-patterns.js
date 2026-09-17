// 엄청대박인배 조종실 전투(BUILD207~209 사용자 브리핑) 탄막 — 오방순 얼굴 광선·불, 나람 점프 내려찍기, 영클 비행 장치 선회 레이저.
//   철창에 가두고 레이저 차징(좌우 연타)은 적 턴 모드 modes/youngcle-cage.js. 지원 모듈 support/youngcle-ship.js 가 턴마다 하나를 고른다(쉬는 적은 patternsFor 가 [] → 탄막 없음).
//   오방순·나람은 공격 전용(때릴 수 없음), 영클(hp 10)은 평타를 뒤로 물러나 피한다.
//   BUILD209(사용자 지적 “공격칸에 들어오는 방순·나람은 흰색으로 간소화된 도트” — 여러 번 지적): 상자 안에 들어오는 캐릭터 그림은 전부 흰/검 2톤(gfx.monoPortrait, 검정은 상자 바닥에 녹아 흰 실루엣만 남는다).
//   난이도 상향(“전반적으로 너무 쉬워”): 광선 4·불덩이 6·간격 짧게, 나람 착지 예고 + 좌우 충격파 + 잔해 18, 선회 레이저 12발(3갈래 섞음)·조준선 예고 0.22초.
import { monoPortrait } from '../core/gfx.js';
const TAU = Math.PI * 2;
const distToSegment = (px, py, ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay; const l2 = dx * dx + dy * dy || 1; const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2)); return Math.hypot(px - (ax + dx * t), py - (ay + dy * t)); };
const keep = (api, o) => { const made = api.emit(o); return made instanceof Object ? made : o; };   // emit 이 탄 객체를 돌려주면 그걸 붙잡는다(테스트 가짜 api 는 숫자를 돌려준다)
const clipBox = (ctx, box) => { ctx.beginPath(); ctx.rect(box.x + 3, box.y + 3, box.w - 6, box.h - 6); ctx.clip(); };
const WHITE = new WeakMap();
/** 상자 안 캐릭터 그림 → 흰색 간소화 도트(원본은 그대로, 변환본을 캐시) */
export const whiteSprite = (img, threshold = 0.5) => { if (!img) return null; let c = WHITE.get(img); if (!c) { try { c = monoPortrait(img, { scale: 1, threshold }); } catch { c = img; } WHITE.set(img, c); } return c; };
const drawFlame = (ctx, f) => { const x = Math.round(f.x), y = Math.round(f.y), r = f.r; const flick = Math.floor(f.age * 14) % 2;
  ctx.fillStyle = '#ff6a2b'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  ctx.fillStyle = '#ffd24a'; ctx.beginPath(); ctx.arc(x - 1, y + 1, r * 0.55, 0, TAU); ctx.fill();
  ctx.fillStyle = '#ff9a3b'; ctx.fillRect(x - 2, y - r - 3 - flick, 4, 4); };

export const YOUNGCLE_PATTERNS = {
  /** 오방순: 상자 가운데 큰 얼굴(흰색 도트) → 흐어어어~(사용자 지정 목소리 클립) 하며 입을 벌리고 머리 장식 여덟 개 중 넷에서 빨간 광선(예고 점선 → 빔), 불덩이 여섯이 사방으로. 피하는 법 = 예고선 밖 + 불덩이 사이 */
  obangsun_rays: (o = {}) => {
    const dur = o.duration ?? 8.6, every = o.every ?? 1.05, warn = o.warn ?? 0.4, first = o.first ?? 1.3, faceR = o.faceR ?? 44, open = o.open ?? 0.8, rays = o.rays ?? 5, flames = o.flames ?? 9, flameSpeed = o.flameSpeed ?? 120, grow = o.grow ?? 0.7;   // BUILD210 난도 2배: 광선 5·불덩이 9·간격 1.05s·불덩이 속도 120. grow: 얼굴이 가운데에서 점점 커지며 등장하는 시간
    const ORN = [-160, -130, -100, -80, -50, -20, 180, 0].map(a => a * Math.PI / 180);   // 장식 각도(머리 위쪽 여섯 + 양옆)
    let next = first, face = null, openUntil = -1;
    return { duration: dur, update(t, dt, api) {
      const b = api.box, cx = b.x + b.w / 2, cy = b.y + b.h / 2;
      if (!face) {
        face = { x: cx, y: cy, r: 0, harmless: true, life: dur + 0.2, shape: 'obangsun_face', open: false, images: api.images, box: { ...b },
          drawShape: (ctx, f) => { const img = whiteSprite(f.images?.[f.open ? 'face_open' : 'face_closed']); ctx.save(); clipBox(ctx, f.box); ctx.imageSmoothingEnabled = false;
            const k = Math.min(1, f.age / grow), ease = 1 - Math.pow(1 - k, 3), pop = k < 1 ? 1 + 0.18 * Math.sin(k * Math.PI) : 1, sc = ease * pop;   // 등장신: 가운데 점에서 점점 커지며(살짝 넘쳤다 제자리)
            if (k < 1 && Math.floor(f.age * 20) % 2 === 0) { ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(f.x, f.y, faceR * sc + 10, 0, TAU); ctx.stroke(); }
            if (img) { const s = (faceR * 2) / Math.max(img.width, img.height) * sc; const w = Math.round(img.width * s), h = Math.round(img.height * s); if (w > 0 && h > 0) ctx.drawImage(img, Math.round(f.x - w / 2), Math.round(f.y - h / 2), w, h); }
            else { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(f.x, f.y, faceR, 0, TAU); ctx.stroke(); }
            ctx.restore(); } };
        face = keep(api, face); api.sfx?.('obangsun_wail', { volume: 0.7 });
      }
      face.open = t < openUntil;
      if (t >= next && t < dur - 1.3) {
        next += every; openUntil = t + open; api.say?.('흐어어어~', 0.5); api.sfx?.('obangsun_wail', { volume: 0.9 });
        const picks = [...ORN].sort(() => api.rnd() - 0.5).slice(0, rays);
        for (const a of picks) {
          const ox = cx + Math.cos(a) * (faceR + 2), oy = cy + Math.sin(a) * (faceR + 2), ex = ox + Math.cos(a) * 420, ey = oy + Math.sin(a) * 420;
          api.emit({ x: ox, y: oy, r: 0, life: warn + 0.45, warn, ex, ey, shape: 'ray', kind: 'red', box: { ...b },
            hitShape: (ray, soul) => ray.age >= ray.warn && distToSegment(soul.x, soul.y, ray.x, ray.y, ray.ex, ray.ey) <= soul.r + 3,
            drawShape: (ctx, ray) => { ctx.save(); clipBox(ctx, ray.box); ctx.lineCap = 'round';
              if (ray.age < ray.warn) { if (Math.floor(ray.age * 12) % 2 === 0) { ctx.strokeStyle = '#ff6a6a'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(ray.x, ray.y); ctx.lineTo(ray.ex, ray.ey); ctx.stroke(); ctx.setLineDash([]); } }
              else { const k = 1 - (ray.age - ray.warn) / 0.45; ctx.strokeStyle = 'rgba(255,60,60,0.35)'; ctx.lineWidth = 8 + 14 * k; ctx.beginPath(); ctx.moveTo(ray.x, ray.y); ctx.lineTo(ray.ex, ray.ey); ctx.stroke(); ctx.strokeStyle = 'rgba(255,60,60,0.95)'; ctx.lineWidth = 2 + 8 * k; ctx.stroke(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke(); }
              ctx.restore(); } });
        }
        for (let i = 0; i < flames; i++) { const a = api.rnd() * TAU; api.emit({ x: cx + Math.cos(a) * (faceR + 10), y: cy + Math.sin(a) * (faceR + 10), vx: Math.cos(a) * flameSpeed, vy: Math.sin(a) * flameSpeed, r: 6, kind: 'orange', shape: 'flame', drawShape: drawFlame }); }
      }
    } };
  },

  /** 나람(흰색 도트): 상자 오른쪽 밖에서 걸어 들어와 → 착지 자리에 예고 표식(깜빡이는 원) → 점프(소리) → 공중에서 공처럼 두 바퀴 반 → 쾅 내려찍기(진동·소리) → 바닥 좌우로 충격파 + 위에서 잔해 18 → 걸어 나감.
   *  피하는 법 = 예고 원 밖 + 충격파는 위로 피하고 + 잔해 사이 */
  naram_slam: (o = {}) => {
    const walk = o.walk ?? 1.9, rise = 0.5, hang = 0.7, fall = 0.26, debris = o.debris ?? 26, dur = o.duration ?? 10.2, scale = o.scale ?? 1.5, waveSpeed = o.waveSpeed ?? 220, second = o.second ?? 1.5;   // BUILD210 난도 2배: 두 번 내려찍기(첫 착지 1.5s 뒤 반대편으로), 충격파 220, 잔해 26
    const tJump = walk, tTop = tJump + rise, tHang = tTop + hang, tLand = tHang + fall;
    let body = null, mark = null, landed = false, jumped = false, debrisLeft = debris, nextDebris = 0, landX = 0, startX = 0, slam2 = null, landX2 = 0;
    return { duration: dur, update(t, dt, api) {
      const b = api.box, floor = b.y + b.h - 4, img = whiteSprite(api.images?.naram);
      if (!body) {
        startX = b.x + b.w + 34; landX = b.x + b.w * 0.58;   // 상자 밖 40px 너머는 바로 지워진다
        body = { x: startX, y: floor, r: 26, harmless: true, life: dur + 0.2, shape: 'naram', rot: 0, frame: 0, box: { ...b },
          drawShape: (ctx, n) => { ctx.save(); clipBox(ctx, n.box); ctx.imageSmoothingEnabled = false;
            if (img) { const fw = img.width / 4, fh = img.height / 4, w = Math.round(fw / 2 * scale), h = Math.round(fh / 2 * scale);
              if (n.rot) { ctx.translate(Math.round(n.x), Math.round(n.y - h / 2)); ctx.rotate(n.rot); ctx.drawImage(img, 0, 0, fw, fh, -w / 2, -h / 2, w, h); }   // 공처럼: 정면 그림을 통째로 회전
              else ctx.drawImage(img, n.frame * fw, 2 * fh, fw, fh, Math.round(n.x - w / 2), Math.round(n.y - h), w, h); }   // 왼쪽 보는 걷기 줄(row 2)
            else { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(n.x - 20, n.y - 48, 40, 48); }
            ctx.restore(); } };
        body = keep(api, body);
        mark = keep(api, { x: landX, y: floor - 2, r: 0, harmless: true, life: tLand + 0.05, shape: 'mark', box: { ...b },
          drawShape: (ctx, m) => { if (m.age < 0.6) return; ctx.save(); clipBox(ctx, m.box); const on = Math.floor(m.age * 6) % 2 === 0; ctx.strokeStyle = on ? '#ff5050' : '#ffb0b0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(m.x, m.y, 34, 9, 0, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.ellipse(m.x, m.y, 14, 4, 0, 0, TAU); ctx.stroke(); ctx.restore(); } });
      }
      if (t < tJump) { body.x = startX + (landX - startX) * (t / walk); body.y = floor; body.frame = Math.floor(t * 5) % 4; body.rot = 0; body.harmless = true; }
      else if (t < tTop) { if (!jumped) { jumped = true; api.sfx?.('jump'); } const k = (t - tJump) / rise; body.x = landX; body.y = floor - 104 * (1 - (1 - k) * (1 - k)); body.rot = k * Math.PI; body.harmless = true; }
      else if (t < tHang) { const k = (t - tTop) / hang; body.y = floor - 104; body.rot = Math.PI + k * TAU * 2.5; body.harmless = true; }
      else if (t < tLand) { const k = (t - tHang) / fall; body.y = floor - 104 + 104 * k * k; body.rot = Math.PI * 6 + k * Math.PI; body.r = 30; body.harmless = false; }
      else if (slam2 && t >= slam2.at) {                          // 두 번째: 반대편으로 다시 점프 → 내려찍기(예고 원은 첫 착지 때 미리 뜬다)
        const u = t - slam2.at;
        if (u < rise) { body.x = landX + (landX2 - landX) * (u / rise); body.y = floor - 96 * (1 - (1 - u / rise) * (1 - u / rise)); body.rot = (u / rise) * Math.PI; body.harmless = true; if (!slam2.jumped) { slam2.jumped = true; api.sfx?.('jump'); } }
        else if (u < rise + 0.45) { body.x = landX2; body.y = floor - 96; body.rot = Math.PI + ((u - rise) / 0.45) * TAU * 1.5; body.harmless = true; }
        else if (u < rise + 0.45 + fall) { const k = (u - rise - 0.45) / fall; body.x = landX2; body.y = floor - 96 + 96 * k * k; body.rot = Math.PI * 4 + k * Math.PI; body.r = 30; body.harmless = false; }
        else {
          if (!slam2.landed) { slam2.landed = true; body.rot = 0; body.y = floor; body.frame = 0; api.sfx?.('baron_slam'); api.shake?.(0.5, 8); debrisLeft += 10; nextDebris = t + 0.1;
            for (const dir of [-1, 1]) api.emit({ x: landX2 + dir * 30, y: floor - 9, vx: dir * waveSpeed, vy: 0, r: 9, kind: 'white', shape: 'wave', life: 3, box: { ...b }, drawShape: body.waveDraw }); }
          body.rot = 0; body.harmless = u > rise + 0.45 + fall + 0.35;
          if (debrisLeft > 0 && t >= nextDebris) { debrisLeft--; nextDebris = t + 0.1; const x = b.x + 10 + api.rnd() * (b.w - 20); api.emit({ x, y: b.y + 4, vy: 60 + api.rnd() * 80, ay: 320, r: 4 + api.rnd() * 4, shape: 'rock', kind: 'white', spin: (api.rnd() - 0.5) * 6 }); }
          if (u > rise + 0.45 + fall + 1.6) { body.x += 90 * dt; body.frame = Math.floor(t * 5) % 4; }
        }
      }
      else {
        if (!landed) { landed = true; body.rot = 0; body.y = floor; body.frame = 0; api.sfx?.('baron_slam'); api.shake?.(0.5, 8); nextDebris = t + 0.15; landX2 = b.x + b.w * 0.22; slam2 = { at: t + second, jumped: false, landed: false };
          api.emit({ x: landX2, y: floor - 2, r: 0, harmless: true, life: second + rise + 0.45 + fall + 0.05, shape: 'mark', box: { ...b }, drawShape: mark.drawShape });
          body.waveDraw = (ctx, w) => { ctx.save(); clipBox(ctx, w.box); const x = Math.round(w.x), y = Math.round(w.y); ctx.fillStyle = '#fff'; ctx.fillRect(x - 7, y - 9, 14, 18); ctx.fillStyle = '#000'; ctx.fillRect(x - 4, y - 5, 8, 10); ctx.fillStyle = '#fff'; ctx.fillRect(x - 2, y - 2, 4, 4); ctx.restore(); };
          for (const dir of [-1, 1]) api.emit({ x: landX + dir * 30, y: floor - 9, vx: dir * waveSpeed, vy: 0, r: 9, kind: 'white', shape: 'wave', life: 3, box: { ...b }, drawShape: body.waveDraw }); }
        body.rot = 0; body.harmless = t > tLand + 0.35;
        if (debrisLeft > 0 && t >= nextDebris) { debrisLeft--; nextDebris = t + 0.1; const x = b.x + 10 + api.rnd() * (b.w - 20);
          api.emit({ x, y: b.y + 4, vy: 60 + api.rnd() * 80, ay: 320, r: 4 + api.rnd() * 4, shape: 'rock', kind: 'white', spin: (api.rnd() - 0.5) * 6 }); }
      }
    } };
  },

  /** 영클: 비행 장치로 상자 둘레를 시계 방향으로 빙글빙글 돌며 소울을 겨눈 레이저 볼트 — 조준선(빨간 점선) 0.2초 뒤 **조준선 그대로** 발사(BUILD212: 전엔 조준 뒤에도 계속 돌아 발사 위치가 최대 100px 어긋났다 — “이상하게 날아가서 너무 쉽다”), 같은 줄로 0.22초 뒤 한 발 더(더블 탭). 3·5갈래 섞음. 삐용 / 후후후. 피하는 법 = 조준선이 뜨면 옆으로, 바로 되돌아오지 말 것 */
  youngcle_orbit_laser: (o = {}) => {
    const dur = o.duration ?? 10.8, speed = o.speed ?? 330, rev = o.rev ?? 0.55, aimT = o.aim ?? 0.2, dbl = o.double ?? 0.22;   // BUILD210 난도 2배: 20발(3·5갈래 섞음), 더 빨리 돈다. BUILD212: 볼트 330, 볼리마다 같은 줄로 두 번(더블 탭)
    const shots = o.shots ?? [0.7, 1.0, 1.3, 1.6, 2.9, 3.2, 3.5, 4.6, 4.9, 5.2, 5.5, 6.6, 6.9, 7.2, 8.1, 8.4, 8.7, 9.0, 9.3, 9.6], laughs = o.laughs ?? [2.1, 4.1, 6.1, 7.8];
    let si = 0, li = 0, aim = null, pending = [];
    const boltDraw = (ctx, q) => { ctx.save(); ctx.translate(Math.round(q.x), Math.round(q.y)); ctx.rotate(Math.atan2(q.vy, q.vx));
      for (let i = 3; i >= 1; i--) { ctx.fillStyle = `rgba(255,70,70,${0.12 * (4 - i)})`; ctx.fillRect(-12 - i * 9, -3, 12, 6); }   // 꼬리
      ctx.fillStyle = 'rgba(255,80,80,0.45)'; ctx.fillRect(-14, -6, 28, 12);                                                     // 후광
      ctx.fillStyle = '#ff4a4a'; ctx.fillRect(-12, -3, 24, 6); ctx.fillStyle = '#fff'; ctx.fillRect(-8, -1, 16, 2); ctx.fillStyle = '#ffe0e0'; ctx.fillRect(9, -2, 4, 4);
      ctx.restore(); };
    return { duration: dur, update(t, dt, api) {
      const b = api.box, cx = b.x + b.w / 2, cy = b.y + b.h / 2, rx = b.w / 2 + 54, ry = b.h / 2 + 30;
      const a = -Math.PI / 2 + t * rev * TAU, x = cx + Math.cos(a) * rx, y = cy + Math.sin(a) * ry;
      if (t < dur - 0.3) api.present?.({ x, y: y + 44 }); else api.present?.(null);
      while (li < laughs.length && t >= laughs[li]) { li++; api.say?.('후후후', 0.4); }
      const inside = (sx, sy) => sx >= b.x + 6 && sx <= b.x + b.w - 6 && sy >= b.y + 6 && sy <= b.y + b.h - 6;
      const start = (ux, uy) => { let sx = x, sy = y; for (let k = 0; k < 80 && !inside(sx, sy); k++) { sx += ux * 4; sy += uy * 4; } return [sx, sy]; };   // 상자 안쪽까지 끌어당겨 출발(상자 밖 40px 너머의 탄은 바로 지워진다)
      if (!aim && si < shots.length && t >= shots[si] - aimT) {
        const dx = api.soul.x - x, dy = api.soul.y - y, d = Math.hypot(dx, dy) || 1; aim = { ux: dx / d, uy: dy / d };
        const [sx, sy] = start(aim.ux, aim.uy); aim.sx = sx; aim.sy = sy;   // 볼트는 이 조준선(출발점 포함)을 그대로 따라간다
        api.emit({ x: sx, y: sy, r: 0, harmless: true, life: aimT, shape: 'aim', ex: sx + aim.ux * 400, ey: sy + aim.uy * 400, box: { ...b },
          drawShape: (ctx, q) => { ctx.save(); clipBox(ctx, q.box); ctx.strokeStyle = 'rgba(255,90,90,0.9)'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 5]); ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.ex, q.ey); ctx.stroke(); ctx.setLineDash([]); ctx.restore(); } });
      }
      while (si < shots.length && t >= shots[si]) {
        const idx = si; si++; api.sfx?.('laser_zap', { volume: 0.8 });
        const base = aim || (() => { const dx = api.soul.x - x, dy = api.soul.y - y, d = Math.hypot(dx, dy) || 1; const [sx, sy] = start(dx / d, dy / d); return { ux: dx / d, uy: dy / d, sx, sy }; })(); aim = null;
        const angles = idx % 4 === 3 ? [-0.5, -0.25, 0, 0.25, 0.5] : idx % 2 === 1 ? [-0.3, 0, 0.3] : [0];
        const bolts = angles.map(da => { const a0 = Math.atan2(base.uy, base.ux) + da; return { ux: Math.cos(a0), uy: Math.sin(a0) }; });
        const da0 = v => Math.abs(v.ux - base.ux) < 1e-6 && Math.abs(v.uy - base.uy) < 1e-6;   // 가운데 볼트는 조준선 출발점 그대로, 갈래는 같은 각도로 상자 안쪽에서
        const fire = () => { for (const v of bolts) { const [sx, sy] = da0(v) ? [base.sx, base.sy] : start(v.ux, v.uy); api.emit({ x: sx, y: sy, vx: v.ux * speed, vy: v.uy * speed, r: 4, kind: 'red', shape: 'bolt', drawShape: boltDraw }); } };
        fire(); pending.push({ at: t + dbl, fire });
      }
      pending = pending.filter(q => { if (t < q.at) return true; api.sfx?.('laser_zap', { volume: 0.5 }); q.fire(); return false; });   // 더블 탭: 같은 줄로 한 발 더
    } };
  },

  /** 오방순(BUILD213 사용자 “파크가디언 라즈마마냥 흐어어어어 빔”): 상자 위쪽 가운데로 흰 얼굴이 내려오고, 입에서 소울을 겨눈 굵은 빔 — 조준 점선 0.6초(laser_charge) → 흐어어어어어(사용자 목소리) + 빔(laser_zap, 0.7초).
   *  둘째·넷째 빔은 3초 동안 소울을 천천히(34°/s) 따라 도는 스윕(laser_beam). 피하는 법 = 점선 밖으로, 스윕은 계속 돌아 따돌리기(빔 회전보다 소울이 빠르다) */
  obangsun_beam: (o = {}) => {
    const dur = o.duration ?? 11.6, faceR = o.faceR ?? 34, warn = o.warn ?? 0.6, fire = o.fire ?? 0.7, sweepFire = o.sweepFire ?? 3.0, turn = (o.turnDeg ?? 34) * Math.PI / 180, width = o.width ?? 18, sweepWidth = o.sweepWidth ?? 22, extend = o.extend ?? 780;
    const shots = o.shots ?? [{ at: 1.2 }, { at: 3.1, sweep: true }, { at: 6.8 }, { at: 8.4, sweep: true }];
    let face = null, beams = [], si = 0;
    return { duration: dur, update(t, dt, api) {
      const b = api.box, fx = b.x + b.w / 2, fy = b.y + 6 + faceR, mx = fx, my = fy + faceR * 0.55;   // 얼굴은 상자 위쪽 가운데, 빔은 입에서
      if (!face) {
        face = keep(api, { x: fx, y: fy, r: 0, harmless: true, life: dur + 0.2, shape: 'obangsun_face', open: false, images: api.images, box: { ...b },
          drawShape: (ctx, f) => { const img = whiteSprite(f.images?.[f.open ? 'face_open' : 'face_closed']); ctx.save(); clipBox(ctx, f.box); ctx.imageSmoothingEnabled = false;
            const k = Math.min(1, f.age / 0.6), ease = 1 - Math.pow(1 - k, 3), yy = f.y - (1 - ease) * (faceR * 2 + 12);   // 등장: 위에서 내려온다
            if (img) { const s = (faceR * 2) / Math.max(img.width, img.height), w = Math.round(img.width * s), h = Math.round(img.height * s); ctx.drawImage(img, Math.round(f.x - w / 2), Math.round(yy - h / 2), w, h); }
            else { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(f.x, yy, faceR, 0, TAU); ctx.stroke(); }
            ctx.restore(); } });
        api.sfx?.('obangsun_wail', { volume: 0.6 });
      }
      while (si < shots.length && t >= shots[si].at) {
        const sh = shots[si++], ang = Math.atan2(api.soul.y - my, api.soul.x - mx);
        const bm = keep(api, { x: mx, y: my, r: 0, kind: 'red', shape: 'obeam', life: warn + (sh.sweep ? sweepFire : fire) + 0.05, angle: ang, len: 0, width: sh.sweep ? sweepWidth : width, warn, sweep: !!sh.sweep, fired: false, box: { ...b },
          hitShape: (q, soul) => q.fired && distToSegment(soul.x, soul.y, q.x, q.y, q.x + Math.cos(q.angle) * q.len, q.y + Math.sin(q.angle) * q.len) <= q.width / 2 + soul.r - 2,
          drawShape: (ctx, q) => { ctx.save(); clipBox(ctx, q.box); ctx.lineCap = 'round'; const L = q.fired ? q.len : 520, ex = q.x + Math.cos(q.angle) * L, ey = q.y + Math.sin(q.angle) * L;
            if (!q.fired) { if (Math.floor(q.age * 12) % 2 === 0) { ctx.strokeStyle = '#ff6a6a'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(ex, ey); ctx.stroke(); ctx.setLineDash([]); } }
            else { const wob = 1 + 0.12 * Math.sin(q.age * 40); ctx.strokeStyle = 'rgba(255,60,60,0.35)'; ctx.lineWidth = q.width + 14; ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(ex, ey); ctx.stroke(); ctx.strokeStyle = 'rgba(255,60,60,0.95)'; ctx.lineWidth = q.width * wob; ctx.stroke(); ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(2, q.width * 0.35); ctx.stroke(); }
            ctx.restore(); } });
        beams.push(bm); api.sfx?.('laser_charge', { volume: 0.5 });
      }
      for (const q of beams) {
        if (!q.fired && q.age >= warn) { q.fired = true; api.say?.('흐어어어어어', 0.6); api.sfx?.('obangsun_wail', { volume: 1 }); api.sfx?.(q.sweep ? 'laser_beam' : 'laser_zap', { volume: q.sweep ? 0.7 : 0.8 }); }
        if (q.fired) { q.len = Math.min(520, q.len + extend * dt); if (q.sweep) { const want = Math.atan2(api.soul.y - q.y, api.soul.x - q.x); let da = want - q.angle; while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU; q.angle += Math.max(-turn * dt, Math.min(turn * dt, da)); } }
      }
      beams = beams.filter(q => q.age < q.life);
      face.open = beams.some(q => q.fired);
    } };
  },

  /** 나람(BUILD213 사용자 “탱크 몰고 와서 뭔가 쏘고 그걸 피하는 패턴”): 흰 탱크(gpt naram-tank-v1, 탄 사이에 나람이 포탑에 앉음)가 오른쪽에서 굴러 들어와 멈추고 8발 —
   *  홀수 발은 포물선 포탄(소울 자리에 고리 예고 → 0.8초 뒤 폭발(explosion) + 파편 6), 짝수 발은 소울 높이에 예고선 0.4초 → 바닥과 나란히 빠른 직사 포탄. 다 쏘면 굴러 나간다. 피하는 법 = 고리에서 멀리 + 예고선 위아래로 */
  naram_tank: (o = {}) => {
    const dur = o.duration ?? 11.2, roll = o.roll ?? 1.8, scale = o.scale ?? 0.9, shots = o.shots ?? [2.4, 3.3, 4.2, 5.1, 6.0, 6.9, 7.8, 8.7], leave = o.leave ?? 9.5, flight = o.flight ?? 0.8, frags = o.frags ?? 6, fragSpeed = o.fragSpeed ?? 150, shellSpeed = o.shellSpeed ?? 420, lineWarn = o.lineWarn ?? 0.4;
    let tank = null, si = 0, stopX = 0, startX = 0, fireT = -1, pending = [];
    const shellDraw = (ctx, q) => { ctx.save(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(Math.round(q.x), Math.round(q.y), 9, 5, q.tilt || 0, 0, TAU); ctx.fill(); ctx.restore(); };
    return { duration: dur, update(t, dt, api) {
      const b = api.box, floor = b.y + b.h - 4, img = whiteSprite(api.images?.tank);
      if (!tank) {
        startX = b.x + b.w + 34; stopX = b.x + b.w * 0.7;   // 상자 밖 40px 너머의 탄은 바로 지워진다(엔진) — 34 에서 출발
        tank = keep(api, { x: startX, y: floor, r: 0, harmless: true, life: dur + 0.2, shape: 'tank', frame: 0, box: { ...b },
          drawShape: (ctx, n) => { ctx.save(); clipBox(ctx, n.box); ctx.imageSmoothingEnabled = false;
            if (img) { const fw = img.width / 2, fh = img.height / 2, w = Math.round(fw * scale), h = Math.round(fh * scale); ctx.drawImage(img, (n.frame % 2) * fw, Math.floor(n.frame / 2) * fh, fw, fh, Math.round(n.x - w / 2), Math.round(n.y - h), w, h); }
            else { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(n.x - 30, n.y - 30, 60, 30); }
            ctx.restore(); } });
        api.sfx?.('scrape', { volume: 0.35 });
      }
      const barrel = () => ({ x: tank.x - 40 * scale, y: tank.y - 40 * scale });   // 포구(왼쪽)
      if (t < roll) { tank.x = startX + (stopX - startX) * (t / roll); tank.frame = Math.floor(t * 6) % 2; }
      else if (t < leave) { tank.x = stopX; tank.frame = fireT >= 0 && t - fireT < 0.15 ? 2 : fireT >= 0 && t - fireT < 0.4 ? 3 : 0; }
      else { const k = Math.min(1, (t - leave) / 1.4); tank.x = stopX + (startX + 4 - stopX) * k; tank.frame = Math.floor(t * 6) % 2; }   // 상자 밖(클립)으로 굴러 나가 안 보인다
      while (si < shots.length && t >= shots[si]) {
        const idx = si++, bp = barrel(); fireT = t; api.sfx?.('cannon_guard_fire', { volume: 0.7 }); api.shake?.(0.12, 2);
        if (idx % 2 === 0) {                                     // 포물선 포탄: 소울 자리(상자 안)에 고리 예고, flight 뒤 폭발
          const tx = Math.max(b.x + 24, Math.min(b.x + b.w - 24, api.soul.x)), ty = Math.max(b.y + 24, Math.min(b.y + b.h - 12, api.soul.y));
          api.emit({ x: tx, y: ty, r: 0, harmless: true, life: flight, shape: 'mark', box: { ...b }, drawShape: (ctx, m) => { ctx.save(); clipBox(ctx, m.box); const on = Math.floor(m.age * 8) % 2 === 0; ctx.strokeStyle = on ? '#ff5050' : '#ffb0b0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(m.x, m.y, 20, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.moveTo(m.x - 6, m.y); ctx.lineTo(m.x + 6, m.y); ctx.moveTo(m.x, m.y - 6); ctx.lineTo(m.x, m.y + 6); ctx.stroke(); ctx.restore(); } });
          api.emit({ x: bp.x, y: bp.y, r: 5, harmless: true, life: flight, shape: 'shell', kind: 'white', from: { ...bp }, to: { x: tx, y: ty }, tilt: Math.atan2(ty - bp.y, tx - bp.x),
            steer: (q) => { const k = Math.min(1, q.age / flight); q.x = q.from.x + (q.to.x - q.from.x) * k; q.y = q.from.y + (q.to.y - q.from.y) * k - 70 * Math.sin(Math.PI * k); }, drawShape: shellDraw });
          pending.push({ at: t + flight, x: tx, y: ty });
        } else {                                                 // 직사: 소울 높이에 예고선 → 바닥과 나란히 빠른 포탄
          const y = Math.max(b.y + 10, Math.min(b.y + b.h - 10, api.soul.y));
          api.emit({ x: b.x + 4, y, shape: 'hline', len: b.w - 8, harmless: true, life: lineWarn, r: 1 });
          pending.push({ at: t + lineWarn, line: true, y, x: Math.min(bp.x, b.x + b.w - 8) });
        }
      }
      pending = pending.filter(q => { if (t < q.at) return true;
        if (q.line) api.emit({ x: q.x, y: q.y, vx: -shellSpeed, vy: 0, r: 6, kind: 'white', shape: 'shell', drawShape: shellDraw });
        else { api.sfx?.('explosion', { volume: 0.7 }); api.shake?.(0.2, 4);
          api.emit({ x: q.x, y: q.y, r: 20, kind: 'orange', shape: 'blast', life: 0.28, drawShape: (ctx, s) => { const k = s.age / 0.28; ctx.save(); ctx.fillStyle = `rgba(255,150,60,${0.8 * (1 - k)})`; ctx.beginPath(); ctx.arc(Math.round(s.x), Math.round(s.y), 8 + 18 * k, 0, TAU); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore(); } });
          for (let i = 0; i < frags; i++) { const a = i / frags * TAU + api.rnd() * 0.4; api.emit({ x: q.x, y: q.y, vx: Math.cos(a) * fragSpeed, vy: Math.sin(a) * fragSpeed, r: 4, kind: 'orange', shape: 'flame', drawShape: drawFlame }); } }
        return false; });
    } };
  },

  /** 영클(BUILD213 사용자 “함선을 날려서 함선이 주인공 따라다니는(유도탄, 부딪히면 피해) + 안 따라다니는 고정 지점 레이저”): 영클이 상자 오른쪽 위에 떠서 엄청대박인배(흰 도트 `props/youngcle-warship.png`, wing 소리)를 날린다 —
   *  함선은 소울을 천천히(85px/s, 1.7rad/s) 따라오며 부딪히면 피해, 6초 뒤 사라짐(마지막 0.3초 무해·반투명). 5.2초에 두 번째. 그 사이 1.4초마다 고정 자리 십자 레이저(가로+세로 띠, 예고 0.7초 → 0.3초, laser_charge/laser_zap). 피하는 법 = 함선을 계속 따돌리며 예고 띠 밖으로 */
  youngcle_ship: (o = {}) => {
    const dur = o.duration ?? 10.8, speed = o.speed ?? 85, turn = o.turn ?? 1.7, life = o.life ?? 6.0, launches = o.launches ?? [0.9, 5.2], beams = o.beams ?? [1.6, 3.0, 4.4, 5.8, 7.2, 8.6], warn = o.warn ?? 0.7, hit = o.hit ?? 0.3, thick = o.thick ?? 24, shipW = o.shipW ?? 72;
    let li = 0, bi = 0, pending = [];
    return { duration: dur, update(t, dt, api) {
      const b = api.box, hx = b.x + b.w + 40, hy = b.y - 6 + Math.sin(t * 2.4) * 3;
      if (t < dur - 0.3) api.present?.({ x: hx, y: hy + 44 }); else api.present?.(null);
      const img = whiteSprite(api.images?.warship, 0.32);   // 함선은 어두운 남색이라 문턱을 낮춰 흰 면이 남게
      while (li < launches.length && t >= launches[li]) {
        li++; api.sfx?.('wing', { volume: 0.9 }); api.say?.('후후후', 0.4);
        const sx = b.x + b.w - 12, sy = b.y + 22, dx = api.soul.x - sx, dy = api.soul.y - sy, d = Math.hypot(dx, dy) || 1;
        api.emit({ x: sx, y: sy, vx: dx / d * speed, vy: dy / d * speed, r: 13, kind: 'white', shape: 'warship', life, box: { ...b },
          steer: (q, dt2) => { const ang = Math.atan2(q.vy, q.vx), want = Math.atan2(api.soul.y - q.y, api.soul.x - q.x); let da = want - ang; while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU; const na = ang + Math.max(-turn * dt2, Math.min(turn * dt2, da)); q.vx = Math.cos(na) * speed; q.vy = Math.sin(na) * speed; if (q.age > life - 0.3) q.harmless = true; },
          drawShape: (ctx, q) => { ctx.save(); clipBox(ctx, q.box); ctx.imageSmoothingEnabled = false; ctx.translate(Math.round(q.x), Math.round(q.y)); const a = Math.atan2(q.vy, q.vx);
            if (Math.cos(a) < 0) { ctx.scale(-1, 1); ctx.rotate(Math.PI - a); } else ctx.rotate(a);   // 그림은 오른쪽을 보는 함선 — 왼쪽으로 갈 땐 뒤집는다
            ctx.globalAlpha = q.harmless ? 0.5 : 1;
            if (img) { const s = shipW / img.width, w = Math.round(img.width * s), h = Math.round(img.height * s); ctx.drawImage(img, -w / 2, -h / 2, w, h); } else { ctx.fillStyle = '#fff'; ctx.fillRect(-30, -10, 60, 20); }
            if (Math.floor(q.age * 10) % 2 === 0) { ctx.fillStyle = '#ffb0b0'; ctx.fillRect(-shipW / 2 - 10, -2, 8, 4); }   // 엔진 불
            ctx.restore(); } });
      }
      while (bi < beams.length && t >= beams[bi]) {
        bi++; api.sfx?.('laser_charge', { volume: 0.4 }); pending.push(t + warn);
        const x = b.x + 8 + api.rnd() * Math.max(1, b.w - 16 - thick), y = b.y + 8 + api.rnd() * Math.max(1, b.h - 16 - thick);
        api.emit({ zone: true, shape: 'beam', x: b.x + 2, y, w: b.w - 4, h: thick, warn, life: warn + hit, r: 0, kind: 'red' });
        api.emit({ zone: true, shape: 'beam', x, y: b.y + 2, w: thick, h: b.h - 4, warn, life: warn + hit, r: 0, kind: 'red' });
      }
      pending = pending.filter(at => { if (t < at) return true; api.sfx?.('laser_zap', { volume: 0.7 }); return false; });
    } };
  },
};
