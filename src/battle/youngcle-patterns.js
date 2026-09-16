// 엄청대박인배 조종실 전투(BUILD207 사용자 브리핑) 탄막 — 오방순 얼굴 광선·불, 나람 점프 내려찍기, 영클 비행 장치 선회 레이저.
//   철창에 가두고 레이저 차징(좌우 연타)은 적 턴 모드 modes/youngcle-cage.js. 지원 모듈 support/youngcle-ship.js 가 턴마다 하나를 고른다(쉬는 적은 patternsFor 가 [] → 탄막 없음).
//   오방순·나람은 공격 전용(때릴 수 없음, hp 무의미), 영클(hp 40)은 맞으면 뒤로 물러나 피한다(지금은 피해 없음 — 기믹은 다음 명령).
const TAU = Math.PI * 2;
const distToSegment = (px, py, ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay; const l2 = dx * dx + dy * dy || 1; const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2)); return Math.hypot(px - (ax + dx * t), py - (ay + dy * t)); };
const keep = (api, o) => { const made = api.emit(o); return made instanceof Object ? made : o; };   // emit 이 탄 객체를 돌려주면 그걸 붙잡는다(테스트 가짜 api 는 숫자를 돌려준다)
const clipBox = (ctx, box) => { ctx.beginPath(); ctx.rect(box.x + 3, box.y + 3, box.w - 6, box.h - 6); ctx.clip(); };
const drawFlame = (ctx, f) => { const x = Math.round(f.x), y = Math.round(f.y), r = f.r; const flick = Math.floor(f.age * 14) % 2;
  ctx.fillStyle = '#ff6a2b'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  ctx.fillStyle = '#ffd24a'; ctx.beginPath(); ctx.arc(x - 1, y + 1, r * 0.55, 0, TAU); ctx.fill();
  ctx.fillStyle = '#ff9a3b'; ctx.fillRect(x - 2, y - r - 3 - flick, 4, 4); };

export const YOUNGCLE_PATTERNS = {
  /** 오방순: 상자 가운데 큰 얼굴 → 흐어어어~ 하며 입을 벌리고 머리 장식 여덟 개 중 셋에서 빨간 광선(예고 점선 → 빔), 불덩이 넷이 사방으로. 피하는 법 = 예고선 밖 + 불덩이 사이 */
  obangsun_rays: (o = {}) => {
    const dur = o.duration ?? 7.4, every = o.every ?? 1.55, warn = o.warn ?? 0.5, first = o.first ?? 1.0, faceR = o.faceR ?? 44, open = o.open ?? 0.8;
    const ORN = [-160, -130, -100, -80, -50, -20, 180, 0].map(a => a * Math.PI / 180);   // 장식 각도(머리 위쪽 여섯 + 양옆)
    let next = first, face = null, openUntil = -1;
    return { duration: dur, update(t, dt, api) {
      const b = api.box, cx = b.x + b.w / 2, cy = b.y + b.h / 2;
      if (!face) {
        face = { x: cx, y: cy, r: 0, harmless: true, life: dur + 0.2, shape: 'obangsun_face', open: false, images: api.images, box: { ...b },
          drawShape: (ctx, f) => { const img = f.images?.[f.open ? 'face_open' : 'face_closed']; ctx.save(); clipBox(ctx, f.box); ctx.imageSmoothingEnabled = false;
            if (img) { const s = (faceR * 2) / Math.max(img.width, img.height); const w = Math.round(img.width * s), h = Math.round(img.height * s); ctx.drawImage(img, Math.round(f.x - w / 2), Math.round(f.y - h / 2), w, h); }
            else { ctx.fillStyle = '#c0304a'; ctx.beginPath(); ctx.arc(f.x, f.y, faceR, 0, TAU); ctx.fill(); }
            ctx.restore(); } };
        face = keep(api, face);
      }
      face.open = t < openUntil;
      if (t >= next && t < dur - 1.3) {
        next += every; openUntil = t + open; api.say?.('흐어어어~', 0.45); api.sfx?.('laser_fire');
        const picks = [...ORN].sort(() => api.rnd() - 0.5).slice(0, 3);
        for (const a of picks) {
          const ox = cx + Math.cos(a) * (faceR + 2), oy = cy + Math.sin(a) * (faceR + 2), ex = ox + Math.cos(a) * 420, ey = oy + Math.sin(a) * 420;
          api.emit({ x: ox, y: oy, r: 0, life: warn + 0.45, warn, ex, ey, shape: 'ray', kind: 'red', box: { ...b },
            hitShape: (ray, soul) => ray.age >= ray.warn && distToSegment(soul.x, soul.y, ray.x, ray.y, ray.ex, ray.ey) <= soul.r + 3,
            drawShape: (ctx, ray) => { ctx.save(); clipBox(ctx, ray.box); ctx.lineCap = 'round';
              if (ray.age < ray.warn) { if (Math.floor(ray.age * 12) % 2 === 0) { ctx.strokeStyle = '#ff6a6a'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(ray.x, ray.y); ctx.lineTo(ray.ex, ray.ey); ctx.stroke(); ctx.setLineDash([]); } }
              else { const k = 1 - (ray.age - ray.warn) / 0.45; ctx.strokeStyle = 'rgba(255,60,60,0.92)'; ctx.lineWidth = 2 + 8 * k; ctx.beginPath(); ctx.moveTo(ray.x, ray.y); ctx.lineTo(ray.ex, ray.ey); ctx.stroke(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke(); }
              ctx.restore(); } });
        }
        for (let i = 0; i < 4; i++) { const a = api.rnd() * TAU; api.emit({ x: cx + Math.cos(a) * (faceR + 10), y: cy + Math.sin(a) * (faceR + 10), vx: Math.cos(a) * 60, vy: Math.sin(a) * 60, r: 6, kind: 'orange', shape: 'flame', drawShape: drawFlame }); }
      }
    } };
  },

  /** 나람: 상자 오른쪽 밖에서 천천히 걸어 들어와(왼쪽 보며) 점프(소리) → 공중에서 공처럼 두 바퀴 반 → 쾅 내려찍기(진동·소리) → 위에서 잔해가 떨어진다 → 오른쪽으로 걸어 나감. 피하는 법 = 착지 자리 밖 + 떨어지는 잔해 사이 */
  naram_slam: (o = {}) => {
    const walk = o.walk ?? 2.4, rise = 0.55, hang = 0.75, fall = 0.28, debris = o.debris ?? 12, dur = o.duration ?? 8.4, scale = o.scale ?? 1.5;
    const tJump = walk, tTop = tJump + rise, tHang = tTop + hang, tLand = tHang + fall;
    let body = null, landed = false, jumped = false, debrisLeft = debris, nextDebris = 0, landX = 0, startX = 0;
    return { duration: dur, update(t, dt, api) {
      const b = api.box, floor = b.y + b.h - 4, img = api.images?.naram;
      if (!body) {
        startX = b.x + b.w + 34; landX = b.x + b.w * 0.6;   // 상자 밖 40px 너머는 바로 지워진다
        body = { x: startX, y: floor, r: 26, harmless: true, life: dur + 0.2, shape: 'naram', rot: 0, frame: 0, box: { ...b },
          drawShape: (ctx, n) => { ctx.save(); clipBox(ctx, n.box); ctx.imageSmoothingEnabled = false;
            if (img) { const fw = img.width / 4, fh = img.height / 4, w = Math.round(fw / 2 * scale), h = Math.round(fh / 2 * scale);
              if (n.rot) { ctx.translate(Math.round(n.x), Math.round(n.y - h / 2)); ctx.rotate(n.rot); ctx.drawImage(img, 0, 0, fw, fh, -w / 2, -h / 2, w, h); }   // 공처럼: 정면 그림을 통째로 회전
              else ctx.drawImage(img, n.frame * fw, 2 * fh, fw, fh, Math.round(n.x - w / 2), Math.round(n.y - h), w, h); }   // 왼쪽 보는 걷기 줄(row 2)
            else { ctx.fillStyle = '#7a8a5a'; ctx.fillRect(n.x - 20, n.y - 48, 40, 48); }
            ctx.restore(); } };
        body = keep(api, body);
      }
      if (t < tJump) { body.x = startX + (landX - startX) * (t / walk); body.y = floor; body.frame = Math.floor(t * 5) % 4; body.rot = 0; body.harmless = true; }
      else if (t < tTop) { if (!jumped) { jumped = true; api.sfx?.('jump'); } const k = (t - tJump) / rise; body.x = landX; body.y = floor - 100 * (1 - (1 - k) * (1 - k)); body.rot = k * Math.PI; body.harmless = true; }
      else if (t < tHang) { const k = (t - tTop) / hang; body.y = floor - 100; body.rot = Math.PI + k * TAU * 2.5; body.harmless = true; }
      else if (t < tLand) { const k = (t - tHang) / fall; body.y = floor - 100 + 100 * k * k; body.rot = Math.PI * 6 + k * Math.PI; body.r = 30; body.harmless = false; }
      else {
        if (!landed) { landed = true; body.rot = 0; body.y = floor; body.frame = 0; api.sfx?.('baron_slam'); api.shake?.(0.45, 7); nextDebris = t + 0.2; }
        body.rot = 0; body.harmless = t > tLand + 0.35;
        if (debrisLeft > 0 && t >= nextDebris) { debrisLeft--; nextDebris = t + 0.17; const x = b.x + 10 + api.rnd() * (b.w - 20);
          api.emit({ x, y: b.y + 4, vy: 30 + api.rnd() * 50, ay: 250, r: 4 + api.rnd() * 4, shape: 'rock', kind: 'white', spin: (api.rnd() - 0.5) * 6 }); }
        if (t > tLand + 1.9) { body.x += 72 * dt; body.frame = Math.floor(t * 5) % 4; }
      }
    } };
  },

  /** 영클: 비행 장치로 상자 둘레를 시계 방향으로 빙글빙글 돌며 소울을 겨눈 레이저 볼트 — 삐용 삐용 / 후후후 / 삐용 / 후후후 / 삐용삐용. 피하는 법 = 볼트 옆으로 */
  youngcle_orbit_laser: (o = {}) => {
    const dur = o.duration ?? 9.6, speed = o.speed ?? 170, rev = o.rev ?? 0.4, shots = o.shots ?? [0.9, 1.35, 4.0, 6.6, 7.05], laughs = o.laughs ?? [2.3, 5.0];
    let si = 0, li = 0;
    return { duration: dur, update(t, dt, api) {
      const b = api.box, cx = b.x + b.w / 2, cy = b.y + b.h / 2, rx = b.w / 2 + 54, ry = b.h / 2 + 30;
      const a = -Math.PI / 2 + t * rev * TAU, x = cx + Math.cos(a) * rx, y = cy + Math.sin(a) * ry;
      if (t < dur - 0.3) api.present?.({ x, y: y + 44 }); else api.present?.(null);
      while (li < laughs.length && t >= laughs[li]) { li++; api.say?.('후후후', 0.4); }
      while (si < shots.length && t >= shots[si]) {
        si++; api.sfx?.('laser_pew');
        const dx = api.soul.x - x, dy = api.soul.y - y, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
        let sx = x, sy = y;                                    // 상자 안쪽까지 끌어당겨 출발(상자 밖 40px 너머의 탄은 바로 지워진다)
        for (let k = 0; k < 80 && (sx < b.x + 6 || sx > b.x + b.w - 6 || sy < b.y + 6 || sy > b.y + b.h - 6); k++) { sx += ux * 4; sy += uy * 4; }
        api.emit({ x: sx, y: sy, vx: ux * speed, vy: uy * speed, r: 4, kind: 'red', shape: 'bolt',
          drawShape: (ctx, q) => { ctx.save(); ctx.translate(Math.round(q.x), Math.round(q.y)); ctx.rotate(Math.atan2(q.vy, q.vx)); ctx.fillStyle = '#ff4a4a'; ctx.fillRect(-10, -2, 20, 4); ctx.fillStyle = '#fff'; ctx.fillRect(-6, -1, 12, 2); ctx.restore(); } });
      }
    } };
  },
};
