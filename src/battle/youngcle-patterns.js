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

  /** 영클: 비행 장치로 상자 둘레를 시계 방향으로 빙글빙글 돌며 소울을 겨눈 레이저 볼트 — 조준선(빨간 점선) 0.22초 뒤 발사, 두 번째·세 번째 연발은 3갈래. 삐용 / 후후후. 피하는 법 = 조준선이 뜨면 옆으로 */
  youngcle_orbit_laser: (o = {}) => {
    const dur = o.duration ?? 10.8, speed = o.speed ?? 290, rev = o.rev ?? 0.55, aimT = o.aim ?? 0.2;   // BUILD210 난도 2배: 20발(3·5갈래 섞음), 볼트 290, 더 빨리 돈다
    const shots = o.shots ?? [0.7, 1.0, 1.3, 1.6, 2.9, 3.2, 3.5, 4.6, 4.9, 5.2, 5.5, 6.6, 6.9, 7.2, 8.1, 8.4, 8.7, 9.0, 9.3, 9.6], laughs = o.laughs ?? [2.1, 4.1, 6.1, 7.8];
    let si = 0, li = 0, aim = null;
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
        const [sx, sy] = start(aim.ux, aim.uy);
        api.emit({ x: sx, y: sy, r: 0, harmless: true, life: aimT, shape: 'aim', ex: sx + aim.ux * 400, ey: sy + aim.uy * 400, box: { ...b },
          drawShape: (ctx, q) => { ctx.save(); clipBox(ctx, q.box); ctx.strokeStyle = 'rgba(255,90,90,0.9)'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 5]); ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.ex, q.ey); ctx.stroke(); ctx.setLineDash([]); ctx.restore(); } });
      }
      while (si < shots.length && t >= shots[si]) {
        const idx = si; si++; api.sfx?.('laser_zap', { volume: 0.8 });
        const base = aim || (() => { const dx = api.soul.x - x, dy = api.soul.y - y, d = Math.hypot(dx, dy) || 1; return { ux: dx / d, uy: dy / d }; })(); aim = null;
        const angles = idx % 4 === 3 ? [-0.5, -0.25, 0, 0.25, 0.5] : idx % 2 === 1 ? [-0.3, 0, 0.3] : [0];
        for (const da of angles) { const a0 = Math.atan2(base.uy, base.ux) + da, ux = Math.cos(a0), uy = Math.sin(a0); const [sx, sy] = start(ux, uy);
          api.emit({ x: sx, y: sy, vx: ux * speed, vy: uy * speed, r: 4, kind: 'red', shape: 'bolt', drawShape: boltDraw }); }
      }
    } };
  },
};
