// 특별 패턴 1 섭리오 — 두 판(BUILD216 + 2026-09-18 사용자 보정·추가 브리핑). variant 'a' 는 첫 방문, 'b' 는 두 번째 방문.
//   공통: 원작 섭리오(scenes/subrio.js)처럼 요플래(판테온)·경섭(질리언)·억빠맨(브랜드) 셋이 0.55초 간격으로 하늘에서 떨어지고,
//   대장이 착지한 뒤 1.9초를 기다렸다가 조작이 열린다. 조작은 요플래만, 나머지 둘은 followerIntent 로 늦게 따라온다.
//   도트 영클(subrio_youngcle.png — 시트가 이미 왼쪽을 본다. scale(-1,1) 로 뒤집으면 등지고 쏜다)은 걸어 들어오지 않고 하늘에서 쿵 떨어진다.
//   쓰러지면(‘공격해라!’) 7초 동안 요플래의 창·밟기와 억빠맨의 불·경섭의 시계가 같은 카운터로 쌓여 5대마다 1 피해(최대 10).
//   A 정사각 맵(480×352, 발판 2단) + 레이저: 점선 예고 → 영클 손끝의 총구 섬광과 함께 0.12초 동안 왼쪽 벽까지 뻗는다. 12초 뒤 과부하로 쓰러진다.
//   B 가로로 긴 치지직(1-2 teal) 맵 + 내려찍기: 원작 따듯한비데의 사라짐→영역 표시→낙하→내려찍기를 그대로 옮겨 여러 번 하고,
//     마지막 착지에서 발을 헛디뎌 넘어진다(사용자 “그러다가 발헛딛여서 공격할타이밍”). 카메라는 원작처럼 요플래를 따라 옆으로 흐른다.
//   규칙(이동·점프·창·추종·불·시계)은 전부 scenes/subrio-core.js(순수) 를 그대로 쓴다.
import { TILE, SOLID, ATLAS_COLUMN, makeActor, stepActor, updateSpears, updateProjectiles, frameOf, rectsOverlap, hurtActor,
  followerIntent, brandThink, zileanThink, landingY, NO_INTENT, SPEAR, FIRE, CLOCK } from '../../scenes/subrio-core.js';

const CELL = 64, FEET = 60, OX = 0, OY = 4, VIEW = 480;
// A 판 색(원작 1-1 보라). B 판은 data 의 theme(1-2 치지직 teal)을 쓴다
const PURPLE = { tiles: 'assets/props/subrio_tiles.png', sky: ['#0c0416', '#2a1048', '#120620', '#05020a'], wave: 'rgba(98,44,170,0.45)', fallback: ['#3e1c6e', '#6030a0'] };
// 원작 직업 배정(scenes/subrio.js PLAYERS): 요플래=판테온(창), 경섭=질리언(시계), 억빠맨=브랜드(불). 떨어지는 순서도 이 순서다
const PARTY = [
  { id: 'hyungsub', classId: 'pantheon', sheet: 'assets/sprites/subrio_pantheon.png', color: '#d9a441' },
  { id: 'gyeongsub', classId: 'zilean', sheet: 'assets/sprites/subrio_zilean.png', color: '#ffd166' },
  { id: 'ppaman', classId: 'brand', sheet: 'assets/sprites/subrio_brand.png', color: '#ff7a3d' },
];
const loadImg = (src) => new Promise(r => { if (typeof Image === 'undefined') return r(null); const im = new Image(); im.onload = () => r(im); im.onerror = () => r(null); im.src = src; });

export function createSubrioGame(battle, yc, K, { variant = 'a' } = {}) {
  const B = variant === 'b' ? K.b : null;
  const rows = B ? B.rows : K.rows, cols = rows[0].length, TH = B ? B.theme : PURPLE;
  const level = { cols, rows: rows.length, tiles: rows, width: cols * TILE, height: rows.length * TILE, goal: null, spawnX: B ? B.heroSpawn : K.heroSpawn, enemies: [], springs: [], arena: null,
    solidAt: (tx, ty) => (ty < 0 || ty >= rows.length || tx < 0 || tx >= cols) ? false : SOLID.has(rows[ty][tx]) };
  // 바닥(벽 사이가 전부 '=' 인 첫 줄)
  const groundY = rows.findIndex(r => /^#=+#$/.test(r)) * TILE;
  const SC = K.yc.scale;
  const actors = PARTY.map((p, i) => {
    const a = makeActor(p.id, level.spawnX + i * K.drop.spacing, K.drop.from, 1);
    a.classId = p.classId; a.delay = i * K.drop.delay; a.active = false; a.dropped = false; a.blockedT = 0;
    return a;
  });
  const hero = actors[0];
  const imgs = { yc: null, tiles: null, spear: null, sheets: {} };
  let baked = null;
  for (const p of PARTY) loadImg(p.sheet).then(i => { imgs.sheets[p.classId] = i; });
  loadImg('assets/sprites/subrio_youngcle.png').then(i => { imgs.yc = i; });
  loadImg(TH.tiles).then(i => { imgs.tiles = i; baked = null; });
  loadImg('assets/props/subrio_spear.png').then(i => { imgs.spear = i; });
  let t = 0, phase = 'drop', pt = 0, spears = [], fires = [], clocks = [], lasers = [], nextLaser = K.lasers.first;
  let hits = 0, damageDealt = 0, hitCool = 0, disposed = false, sparks = [], ycFrame = 0, flash = 0;
  let trail = [], leaderLandT = 0, ycY = K.ycDrop.from, ycVy = 0, ycDropped = false, ycLandT = 0;
  let ycX = B ? B.ycEnterX : K.ycStand, ycFacing = -1, ycVisible = true, cam = 0;
  let slams = 0, marker = null, slamHit = false;
  const setPhase = (p) => { phase = p; pt = 0; };
  // B 판: 지지직 하며 사라진다(원작 비데 vanish 를 TV 답게 static_burst 로)
  const startVanish = () => { setPhase('vanish'); battle.sfx(B.vanishSfx, { volume: 0.8 }); puff(ycX, ycY, 12, '#9ad8ff', 50); };
  // 총구(주먹) 위치 — A 판 레이저가 여기서 나간다
  const originX = () => ycX - K.yc.muzzleDx;
  // 카메라: 원작 cameraX 와 같은 규칙(주인공이 화면 40% 자리)이되 전체 화면 480 기준. A 판은 맵이 480 이라 항상 0
  const camX = () => Math.max(0, Math.min(level.width - VIEW, Math.round(hero.x + hero.w / 2 - VIEW * 0.4)));
  const sx = (x) => Math.round(x - cam) + OX;
  const bake = () => {
    const c = document.createElement('canvas'); c.width = level.width; c.height = level.height; const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    for (let r = 0; r < level.rows; r++) for (let x = 0; x < cols; x++) { const ch = rows[r][x]; if (ch === '.') continue; const col = ATLAS_COLUMN[ch] ?? 0;
      if (imgs.tiles) g.drawImage(imgs.tiles, col * TILE, 0, TILE, TILE, x * TILE, r * TILE, TILE, TILE); else { g.fillStyle = ch === '#' ? TH.fallback[0] : TH.fallback[1]; g.fillRect(x * TILE, r * TILE, TILE, TILE); } }
    baked = c;
  };
  // 쓰러진 영클의 몸통(시트 4번 프레임 내용 범위를 배율만큼 키운 것)
  const downRect = () => ({ x: ycX - K.yc.bodyDx * SC, y: ycY - K.yc.bodyDy * SC, w: K.yc.bodyDx * 2 * SC, h: K.yc.bodyDy * SC });
  const hitOnce = () => {
    hits++; hitCool = K.down.hitCooldown; flash = 0.08; battle.sfx(K.hitSfx, { volume: 0.5 });
    if (hits % K.down.hitsPerDamage === 0 && damageDealt < K.down.maxDamage) { damageDealt++; battle.hitEnemy(yc, null, 1, { source: 'special', sound: true }); }
  };
  // 맞음: 방패로 그쪽을 막고 있거나 무적이면 hurtActor 가 false — 그때는 파티 피해도 없다
  const hitActor = (a, fromX, dmg) => { if (hurtActor(a, fromX, []) && a === hero) battle.hurtParty(dmg); };
  // 레이저가 지금 뻗어 있는 구간(총구 → 왼쪽). fire 초 동안 왼쪽으로 자라고 그 뒤로는 벽까지 유지된다
  const beamRect = (l) => {
    const o = originX(), k = Math.min(1, (l.age - K.lasers.warn) / K.lasers.fire), x1 = o - (o - TILE) * k;
    return { x: x1, y: l.y - K.lasers.thick / 2, w: o - x1, h: K.lasers.thick };
  };
  const puff = (x, y, n, color, spread = 70) => { for (let i = 0; i < n; i++) sparks.push({ x: x + (battle.rnd() - 0.5) * spread, y: y - battle.rnd() * 14, vy: -30 - battle.rnd() * 70, life: 0.35 + battle.rnd() * 0.3, color }); };
  // B 판 내려찍기 영역: 요플래가 선 면 위에 slamW 폭. 표시 동안 앞쪽은 따라오다 lock 뒤 굳는다(가만히 서 있으면 맞는다)
  const aimMarker = () => {
    const feetY = hero.grounded ? hero.y + hero.h : landingY(level, hero.x, hero.x + hero.w);
    const half = B.slamW / 2, cx = Math.max(TILE + half, Math.min(level.width - TILE - half, hero.x + hero.w / 2));
    return { x: cx - half, w: B.slamW, y: feetY, cx };
  };
  return {
    get snapshot() {
      return { kind: 'subrio', variant, phase, t: Math.round(t * 100) / 100, hits, damageDealt, slams, ycVisible, cam,
        hero: { x: Math.round(hero.x), y: Math.round(hero.y), grounded: hero.grounded, invuln: hero.invuln > 0 },
        party: actors.map(a => ({ id: a.id, x: Math.round(a.x), y: Math.round(a.y), dropped: !!a.dropped })),
        yc: { x: Math.round(ycX), y: Math.round(ycY), frame: ycFrame, facing: ycFacing }, ycDropped,
        marker: marker ? { x: Math.round(marker.cx), y: Math.round(marker.y) } : null,
        lasers: lasers.map(l => ({ y: Math.round(l.y), fired: l.fired, x1: Math.round(l.fired ? beamRect(l).x : originX()), x2: Math.round(originX()) })),
        spears: spears.length, fires: fires.length, clocks: clocks.length, down: downRect() };
    },
    update(dt, input) {
      if (disposed) return true;
      t += dt; pt += dt; if (flash > 0) flash -= dt; hitCool = Math.max(0, hitCool - dt);
      // 낙하 중에는 아무도 조작하지 않는다(원작: 대장 착지 + dropWait 뒤에 control 이 열린다)
      const control = phase !== 'drop';
      const events = [];
      for (const [i, a] of actors.entries()) {
        if (!a.active) { if (t >= a.delay) a.active = true; else continue; }
        let intent = NO_INTENT;
        if (i === 0) {
          if (control) intent = { left: input.down('left'), right: input.down('right'), jump: input.just('up'), jumpHeld: input.down('up'), crouch: input.down('down'), attack: input.just('confirm'), attackHeld: input.down('confirm'), guard: input.down('cancel') };
        } else if (control) {
          intent = followerIntent(a, trail, t, { reaction: K.follow.reaction * i + K.follow.base, spacing: K.follow.spacing * i, level });
          // 목표가 벽 너머면(대장이 왼쪽 끝에 서 있으면 뒷사람 자리는 벽 안쪽이다) 밀지 않는다 — 막힌 채 계속 뛰어오르던 문제
          const wall = (intent.left && a.x <= TILE + 4) || (intent.right && a.x + a.w >= level.width - TILE - 4);
          if (wall) { intent.left = false; intent.right = false; intent.jump = false; intent.jumpHeld = !a.grounded && a.vy < 0; }
          const wants = intent.left || intent.right;
          a.blockedT = wants && a.grounded && Math.abs(a.vx) < 6 ? (a.blockedT || 0) + dt : 0;
        }
        const before = events.length;
        stepActor(level, a, intent, dt, events);
        if (i === 0) trail.push({ t, x: a.x, y: a.y, facing: a.facing, jumped: events.slice(before).some(e => e.type === 'jump') });
      }
      if (trail.length > 400) trail.splice(0, trail.length - 400);
      cam = camX();
      // 쓰러진 동안은 연타가 먹히게 창 쿨을 줄인다
      if (phase === 'down') hero.cooldown = Math.min(hero.cooldown, K.down.hitCooldown);
      // 동료 공격은 영클이 쓰러져 있을 때만(패턴 중의 영클은 무적이라 때릴 것이 없다)
      if (phase === 'down') {
        const targets = [{ ...downRect(), vx: 0, dead: false }];
        const brand = actors.find(a => a.classId === 'brand'), zil = actors.find(a => a.classId === 'zilean');
        if (brand && brand.active) brandThink(brand, targets, dt, events);
        if (zil && zil.active) zileanThink(zil, targets, dt, events);
      }
      for (const e of events) {
        if (e.type === 'land') { const a = actors.find(x => x.id === e.id); if (a && !a.dropped) { a.dropped = true; if (a === hero) leaderLandT = t; battle.sfx(K.drop.sfx, { volume: 0.7 }); } }
        else if (e.type === 'attack' && e.id === hero.id) { spears.push({ x: e.x, y: e.y, vx: e.facing * (e.charged ? SPEAR.chargedSpeed : SPEAR.speed), life: e.charged ? SPEAR.chargedLife : SPEAR.life, facing: e.facing, charged: e.charged }); battle.sfx('weaponpull', { volume: 0.35 }); }
        else if (e.type === 'jump' && e.id === hero.id) battle.sfx('jump', { volume: 0.45 });
        else if (e.type === 'fire') { fires.push({ x: e.x, y: e.y, vx: e.vx, life: FIRE.life, facing: e.facing, t: 0 }); battle.sfx(K.mateSfx.fire, { volume: 0.55 }); }
        else if (e.type === 'clock') { clocks.push({ x: e.x, y: e.y, vx: e.vx, vy: e.vy, life: 2.2, t: 0 }); if (e.index === 0) battle.sfx(K.mateSfx.clock, { volume: 0.5 }); }
      }
      spears = updateSpears(level, spears, dt);
      fires = updateProjectiles(level, fires, dt, FIRE.w, FIRE.h);
      clocks = updateProjectiles(level, clocks, dt, CLOCK.w, CLOCK.h, CLOCK.gravity);
      for (const p of fires) p.t += dt;
      for (const p of clocks) p.t += dt;
      // 영클은 늘 요플래 쪽을 본다(시트는 왼쪽이 기본이라 오른쪽을 볼 때만 뒤집는다)
      if (B && ycDropped && (phase === 'ycdrop' || phase === 'vanish')) ycFacing = hero.x + hero.w / 2 > ycX ? 1 : -1;
      if (phase === 'drop') {
        ycFrame = 1;
        if (hero.dropped && actors.every(a => a.dropped) && t >= leaderLandT + K.drop.wait) setPhase('ycdrop');
      }
      else if (phase === 'ycdrop') {
        // 맵을 뚫고 밖에서 들어오는 기분: 하늘에서 그대로 떨어져 쿵
        if (!ycDropped) {
          ycVy += K.ycDrop.gravity * dt; ycY += ycVy * dt; ycFrame = 1;
          if (ycY >= groundY) {
            ycY = groundY; ycVy = 0; ycDropped = true; ycLandT = t; ycFrame = 0;
            battle.sfx(K.ycDrop.sfx, { volume: 0.9 }); battle.game.shake = { time: K.ycDrop.shake.time, amp: K.ycDrop.shake.amp };
            puff(ycX, groundY, 16, '#cdbde8');
          }
        } else if (t >= ycLandT + K.ycDrop.wait) { if (B) startVanish(); else { setPhase('lasers'); nextLaser = K.lasers.first; } }
      }
      else if (phase === 'lasers') {
        if (pt >= nextLaser && pt < K.lasers.until) { nextLaser += K.lasers.every; const h = K.lasers.heights[Math.floor(battle.rnd() * K.lasers.heights.length)]; lasers.push({ y: groundY - h, age: 0, fired: false }); battle.sfx(K.laserSfx.warn, { volume: 0.5 }); }
        for (const l of lasers) { l.age += dt; if (!l.fired && l.age >= K.lasers.warn) { l.fired = true; battle.sfx(K.laserSfx.fire, { volume: 0.8 }); puff(originX(), l.y + 8, 4, '#ffb3b3'); } }
        ycFrame = lasers.some(l => l.age >= K.lasers.warn - 0.15 && l.age < K.lasers.warn + K.lasers.beam) ? 2 : 0;
        for (const l of lasers) if (l.fired && l.age < K.lasers.warn + K.lasers.beam) {
          const beam = beamRect(l);
          for (const a of actors) {
            if (!a.active || a.invuln > 0) continue;
            if (!rectsOverlap({ x: a.x, y: a.y, w: a.w, h: a.h }, beam)) continue;
            hitActor(a, ycX, K.lasers.damage);
          }
        }
        lasers = lasers.filter(l => l.age < K.lasers.warn + K.lasers.beam);
        if (pt >= K.overload.at) { setPhase('overload'); ycFrame = 3; battle.sfx(K.overloadSfx); battle.game.shake = { time: 0.3, amp: 3 }; }
      }
      else if (phase === 'vanish') {
        ycFrame = 0;
        if (pt >= B.vanish) { ycVisible = false; marker = aimMarker(); setPhase('marker'); battle.sfx(B.markerSfx, { volume: 0.85 }); }
      }
      else if (phase === 'marker') {
        // 영역 표시: 앞쪽 track 초는 요플래를 따라오다 굳는다 → 가만히 서 있으면 그대로 맞는다
        if (pt < B.markerTrack) marker = aimMarker();
        if (pt >= B.marker) {
          ycX = marker.cx; ycY = -CELL * SC; ycVisible = true; slamHit = false; ycFrame = 1;
          ycFacing = hero.x + hero.w / 2 > ycX ? 1 : -1;
          setPhase('dive'); battle.sfx(B.diveSfx, { volume: 0.9 });
        }
      }
      else if (phase === 'dive') {
        ycFrame = 1; ycY += B.diveSpeed * dt;
        if (ycY >= marker.y) {
          ycY = marker.y; slams++; setPhase('slam');
          battle.sfx(B.slamSfx, { volume: 0.9 }); battle.game.shake = { time: B.shake.time, amp: B.shake.amp };
          puff(ycX, ycY, 18, '#d8d8e8', B.slamW);
        }
      }
      else if (phase === 'slam') {
        ycFrame = pt < B.slamPose ? 5 : 0;
        // 착지 순간(hitWindow) 동안 그 띠의 착지면 위에 있으면 맞는다 — 한 번의 내려찍기에 한 번만
        if (!slamHit && pt < B.hitWindow) {
          for (const a of actors) {
            if (!a.active) continue;
            const acx = a.x + a.w / 2;
            if (acx < marker.x || acx > marker.x + marker.w) continue;
            if (Math.abs(a.y + a.h - marker.y) > B.surface) continue;
            if (a === hero) slamHit = true;
            hitActor(a, ycX, B.slamDamage);
          }
        }
        if (pt >= B.slam) {
          marker = null;
          if (slams >= B.slams) { setPhase('stumble'); battle.sfx(B.stumbleSfx, { volume: 0.8 }); }
          else startVanish();
        }
      }
      else if (phase === 'stumble') {
        // 발을 헛디뎌 비틀거리다 넘어진다(사용자 “그러다가 발헛딛여서”)
        ycFrame = pt < B.stumble * 0.6 ? 0 : 5;
        if (battle.rnd() < 0.25) puff(ycX, ycY, 1, '#ffe066', 40);
        if (pt >= B.stumble) { setPhase('down'); ycFrame = 4; battle.sfx(K.downSfx); battle.game.shake = { time: 0.35, amp: 5 }; puff(ycX, ycY, 12, '#cdbde8'); }
      }
      else if (phase === 'overload') {
        ycFrame = 3;
        if (battle.rnd() < 0.6) sparks.push({ x: ycX + (battle.rnd() - 0.5) * 50 * SC, y: groundY - 56 * SC + battle.rnd() * 40 * SC, vy: -40 - battle.rnd() * 60, life: 0.4, color: null });
        if (pt >= K.overload.sparks) { setPhase('down'); ycFrame = 4; battle.sfx(K.downSfx); battle.game.shake = { time: 0.35, amp: 5 }; puff(ycX, groundY, 10, '#cdbde8'); }
      }
      else if (phase === 'down') {
        ycFrame = 4;
        const body = downRect();
        for (const sp of spears) if (!sp.dead && rectsOverlap({ x: sp.x, y: sp.y, w: SPEAR.w, h: SPEAR.h }, body)) { sp.dead = true; hitOnce(); }
        for (const f of fires) if (!f.dead && rectsOverlap({ x: f.x, y: f.y, w: FIRE.w, h: FIRE.h }, body)) { f.dead = true; hitOnce(); }
        for (const c of clocks) if (!c.dead && rectsOverlap({ x: c.x, y: c.y, w: CLOCK.w, h: CLOCK.h }, body)) { c.dead = true; hitOnce(); }
        spears = spears.filter(sp => !sp.dead); fires = fires.filter(f => !f.dead); clocks = clocks.filter(c => !c.dead);
        if (hero.vy > 0 && hitCool <= 0 && rectsOverlap({ x: hero.x, y: hero.y + hero.h - 6, w: hero.w, h: 10 }, body)) { hero.vy = -300; hitOnce(); }
        if (pt >= K.down.seconds) { setPhase('getup'); ycFrame = 5; battle.sfx(K.getupSfx, { volume: 0.7 }); }
      }
      else if (phase === 'getup') { ycFrame = 5; if (pt >= K.getup) setPhase('done'); }
      for (const s of sparks) { s.y += s.vy * dt; s.life -= dt; }
      sparks = sparks.filter(s => s.life > 0);
      return phase === 'done';
    },
    draw(ctx) {
      ctx.save(); ctx.imageSmoothingEnabled = false;
      const g = ctx.createLinearGradient(0, 0, 0, 360); g.addColorStop(0, TH.sky[0]); g.addColorStop(0.3, TH.sky[1]); g.addColorStop(0.55, TH.sky[2]); g.addColorStop(1, TH.sky[3]); ctx.fillStyle = g; ctx.fillRect(0, 0, 480, 360);
      // 먼 물결: 카메라보다 천천히 흘러 옆으로 가는 느낌이 난다
      const par = cam * 0.3;
      for (let x = 0; x < 480; x += 6) { const w = x + par, h = 14 + 9 * Math.sin(w * 0.05 + t * 2.1) * Math.sin(w * 0.013 - t * 0.7) + 5 * Math.sin(w * 0.21 + t * 5.3); ctx.fillStyle = TH.wave; ctx.fillRect(x, Math.round(150 - h), 6, Math.round(h) + 20); }
      if (!baked) bake();
      ctx.drawImage(baked, -cam + OX, OY);
      // 레이저 예고: 깜빡이는 점선(총구에서 왼쪽 벽까지)
      for (const l of lasers) {
        if (l.fired) continue;
        if (Math.floor(l.age * 12) % 2) continue;
        const y = Math.round(l.y) + OY;
        ctx.strokeStyle = 'rgba(255,90,90,0.9)'; ctx.lineWidth = 2; ctx.setLineDash([6, 6]);
        ctx.beginPath(); ctx.moveTo(sx(TILE), y); ctx.lineTo(sx(originX()), y); ctx.stroke(); ctx.setLineDash([]);
      }
      // B 내려찍기 영역(원작 비데와 같은 표시): 바닥 띠는 캐릭터 밑에 깔고, 화살표는 서 있는 요플래에 가리지 않게 맨 위에 따로 그린다
      if (marker) {
        const mx = sx(marker.x), my = Math.round(marker.y) + OY, pulse = 0.5 + 0.4 * Math.abs(Math.sin(t * 14));
        ctx.fillStyle = `rgba(255,50,50,${(0.3 * pulse).toFixed(3)})`; ctx.fillRect(mx, my - 10, marker.w, 10);
        ctx.strokeStyle = `rgba(255,90,90,${pulse.toFixed(3)})`; ctx.lineWidth = 2; ctx.strokeRect(mx + 1, my - 10, marker.w - 2, 10);
      }
      const feet = Math.round(ycY) + OY, cx = sx(ycX);
      // 도트 영클: 시트가 왼쪽을 보고 그려져 있다 — 요플래가 오른쪽에 있을 때만 뒤집는다
      if (imgs.yc && ycVisible) {
        const cut = ycFrame === 2 ? K.yc.flashCut : 0;
        ctx.save(); ctx.translate(cx, feet); ctx.scale(SC, SC);
        if (ycFacing > 0) ctx.scale(-1, 1);
        if (phase === 'vanish') ctx.globalAlpha = Math.max(0.1, 1 - pt / B.vanish);
        if (phase === 'overload' && Math.floor(t * 20) % 2) ctx.translate(2, 0);
        // 넘어지는 동안은 기울어진다
        if (phase === 'stumble') { ctx.translate(0, -6); ctx.rotate(-Math.min(0.5, pt / B.stumble * 0.5)); ctx.translate(Math.sin(pt * 26) * 2, 6); }
        ctx.drawImage(imgs.yc, (ycFrame % 3) * CELL + cut, Math.floor(ycFrame / 3) * CELL, CELL - cut, CELL, -CELL / 2 + cut, -FEET, CELL - cut, CELL);
        ctx.restore();
      } else if (!imgs.yc && ycVisible) { ctx.fillStyle = '#9ad'; ctx.fillRect(cx - 16 * SC, feet - 50 * SC, 32 * SC, 50 * SC); }
      // 발사된 레이저: 총구 섬광 + 왼쪽으로 뻗어 나가는 빔(끝머리가 밝다) → 유지 → 페이드
      for (const l of lasers) {
        if (!l.fired) continue;
        const life = l.age - K.lasers.warn, total = K.lasers.beam, y = Math.round(l.y) + OY;
        const fade = life > total - 0.15 ? Math.max(0, (total - life) / 0.15) : 1;
        const b = beamRect(l), x1 = sx(b.x), x2 = sx(originX()), half = K.lasers.thick / 2;
        ctx.save(); ctx.globalAlpha = fade;
        ctx.fillStyle = 'rgba(255,60,60,0.3)'; ctx.fillRect(x1, y - half - 6, x2 - x1, K.lasers.thick + 12);
        ctx.fillStyle = 'rgba(255,70,70,0.9)'; ctx.fillRect(x1, y - half, x2 - x1, K.lasers.thick);
        ctx.fillStyle = '#fff'; ctx.fillRect(x1, y - 2, x2 - x1, 4);
        // 뻗어 나가는 동안은 앞머리가 굵고 하얗다
        if (life < K.lasers.fire) { ctx.fillStyle = '#fff'; ctx.fillRect(x1 - 3, y - half - 4, 8, K.lasers.thick + 8); }
        if (life < K.lasers.fire + 0.12) {
          const a2 = Math.max(0, 1 - life / (K.lasers.fire + 0.12));
          const fx = sx(ycX + (K.yc.fistX - CELL / 2) * SC), fy = Math.round(ycY + (K.yc.fistY - FEET) * SC) + OY;
          ctx.lineCap = 'round';
          ctx.strokeStyle = `rgba(255,80,80,${(0.75 * a2).toFixed(3)})`; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(x2, y); ctx.stroke();
          ctx.strokeStyle = `rgba(255,255,255,${(0.9 * a2).toFixed(3)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(x2, y); ctx.stroke();
          ctx.lineCap = 'butt';
        }
        const burst = Math.max(0, 1 - life / 0.22);
        if (burst > 0) {
          const r = 8 + 16 * burst;
          ctx.fillStyle = `rgba(255,120,120,${(0.55 * burst).toFixed(3)})`; ctx.beginPath(); ctx.arc(x2, y, r, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x2, y, r * 0.42, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = `rgba(255,255,255,${(0.9 * burst).toFixed(3)})`; ctx.fillRect(x2 - r, y - 2, r * 2, 4); ctx.fillRect(x2 - 2, y - r, 4, r * 2);
        }
        ctx.restore();
      }
      for (const s of sparks) { ctx.fillStyle = s.color || (s.life > 0.2 ? '#ffe066' : '#fff'); ctx.fillRect(sx(s.x), Math.round(s.y) + OY, 3, 3); }
      // ‘공격해라!’ 화살표(위아래로 튐) + 남은 시간
      if (phase === 'down') {
        const ay = feet - K.yc.bodyDy * SC - 22 - Math.abs(Math.sin(t * 6)) * 8;
        ctx.fillStyle = '#ffe066'; ctx.beginPath(); ctx.moveTo(cx - 10, ay - 14); ctx.lineTo(cx + 10, ay - 14); ctx.lineTo(cx, ay); ctx.closePath(); ctx.fill();
        ctx.font = '14px "Galmuri11", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.fillText(K.down.arrowText, cx, ay - 34); ctx.fillStyle = '#fff'; ctx.fillText(`${Math.max(0, Math.ceil(K.down.seconds - pt))}`, cx, ay - 52); ctx.textAlign = 'left';
      }
      // 창
      for (const sp of spears) { const px = sx(sp.x), py = Math.round(sp.y) + OY;
        if (imgs.spear) { ctx.save(); ctx.translate(px + 12, py + 3); if (sp.facing < 0) ctx.scale(-1, 1); ctx.drawImage(imgs.spear, -12, -3); ctx.restore(); }
        else { ctx.fillStyle = '#e6d28c'; ctx.fillRect(px, py + 2, 20, 2); } }
      // 억빠맨의 불덩이(앞이 둥글고 뒤로 타는 꼬리) — 원작 subrio.js 와 같은 모양
      for (const f of fires) {
        const fx = sx(f.x) + 6, fy = Math.round(f.y) + OY + 6, flick = Math.floor(f.t * 24) % 3, d = f.facing;
        ctx.fillStyle = '#c8321a'; ctx.beginPath(); ctx.ellipse(fx - d * 8, fy, 12, 5 + flick, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ff5a1e'; ctx.beginPath(); ctx.ellipse(fx - d * 4, fy, 10, 6, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffa030'; ctx.beginPath(); ctx.arc(fx + d, fy, 5 + (flick === 1 ? 1 : 0), 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffe66a'; ctx.beginPath(); ctx.arc(fx + d * 2, fy - 1 + (flick === 2 ? 1 : 0), 3, 0, Math.PI * 2); ctx.fill();
      }
      // 경섭의 시계(포물선)
      for (const c of clocks) {
        const kx = sx(c.x) + 6, ky = Math.round(c.y) + OY + 6, spin = c.t * 9;
        ctx.fillStyle = '#5a3a08'; ctx.beginPath(); ctx.arc(kx, ky, 6.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffd24a'; ctx.beginPath(); ctx.arc(kx, ky, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff7d0'; ctx.beginPath(); ctx.arc(kx, ky, 3, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#3a2404'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(kx, ky); ctx.lineTo(kx + Math.cos(spin) * 3, ky + Math.sin(spin) * 3); ctx.stroke();
      }
      // 동료 먼저, 요플래를 맨 앞에
      for (let i = actors.length - 1; i >= 0; i--) drawActor(ctx, actors[i]);
      // 내려찍기 예고 화살표: 서 있는 사람 머리 위에서 내려꽂히듯 튄다
      if (marker) {
        const ax = sx(marker.x) + marker.w / 2, ay = Math.round(marker.y) + OY - 58 - Math.abs(Math.sin(t * 12)) * 8;
        ctx.fillStyle = '#ff5c5c'; ctx.beginPath(); ctx.moveTo(ax - 10, ay - 16); ctx.lineTo(ax + 10, ay - 16); ctx.lineTo(ax, ay); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(ax - 2, ay - 30, 4, 12);
      }
      ctx.font = '14px "Galmuri11", sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'top'; ctx.fillStyle = '#ffe066';
      if (phase === 'down' || phase === 'getup') ctx.fillText(`${hits}타 · 피해 ${damageDealt}/${K.down.maxDamage}`, 468, 8);
      ctx.fillStyle = '#c9c9d9'; ctx.textAlign = 'left'; ctx.fillText('←→ 이동 · ↑ 점프 · C 창 · X 방패', 12, 8);
      if (flash > 0) { ctx.fillStyle = `rgba(255,255,255,${flash * 4})`; ctx.fillRect(0, 0, 480, 360); }
      ctx.restore();
      function drawActor(c2, a) {
        if (!a.active) return;
        if (a.invuln > 0 && a.hurtT <= 0 && Math.floor(t * 14) % 2 === 1) return;
        const sheet = imgs.sheets[a.classId], frame = frameOf(a);
        const ax = sx(a.x + a.w / 2), af = Math.round(a.y + a.h) + OY;
        if (sheet) {
          c2.save(); c2.translate(ax, af);
          // 시트는 오른쪽을 본다 — 걷는 쪽이 왼쪽이면 뒤집는다
          if (a.facing < 0) c2.scale(-1, 1);
          c2.drawImage(sheet, (frame % 2) * CELL, Math.floor(frame / 2) * CELL, CELL, CELL, -CELL / 2, -FEET, CELL, CELL);
          c2.restore();
        } else {
          c2.fillStyle = PARTY.find(p => p.classId === a.classId)?.color || '#fff';
          c2.fillRect(ax - 6, af - a.h, 12, a.h);
        }
      }
    },
    dispose() { disposed = true; },
  };
}
