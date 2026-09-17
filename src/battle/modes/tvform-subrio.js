// 특별 패턴 1 — 섭리오를 전투로 재구성(BUILD216 사용자 브리핑): TV 화면 속 정사각 맵(480×352, 발판 2단), 요플래(판테온 창)만 조작. 도트 영클(gpt subrio_youngcle.png)이 오른쪽에서 천천히 걸어와
//   왼쪽으로 레이저를 천천히 쏜다(바닥·발판 1단·2단 높이 중 하나, 예고 0.6초 → 0.5초 빔). 약 12초 뒤 과부하(불꽃·지지직)로 쓰러지면 7초 동안 때릴 수 있다(창·밟기, 5대마다 1 피해·최대 10, ‘공격해라!’ 화살표).
//   다시 일어나면 끝(지지직 복귀는 tvform-special.js). 규칙은 scenes/subrio-core.js(순수)를 그대로 쓴다.
import { TILE, SOLID, ATLAS_COLUMN, makeActor, stepActor, updateSpears, frameOf, rectsOverlap, hurtActor, SPEAR } from '../../scenes/subrio-core.js';
const HERO_CELL = 64, HERO_FEET = 60, YC_CELL = 64, YC_FEET = 60, OX = 0, OY = 4;
const SKY = ['#0c0416', '#2a1048', '#120620', '#05020a'];
const loadImg = (src) => new Promise(r => { if (typeof Image === 'undefined') return r(null); const im = new Image(); im.onload = () => r(im); im.onerror = () => r(null); im.src = src; });

export function createSubrioGame(battle, yc, K) {
  const rows = K.rows, cols = rows[0].length;
  const level = { cols, rows: rows.length, tiles: rows, width: cols * TILE, height: rows.length * TILE, goal: null, spawnX: K.heroSpawn, enemies: [], springs: [], arena: null,
    solidAt: (tx, ty) => (ty < 0 || ty >= rows.length || tx < 0 || tx >= cols) ? false : SOLID.has(rows[ty][tx]) };
  const groundY = rows.findIndex(r => /^#=+#$/.test(r)) * TILE;   // 바닥(벽 사이가 전부 '=' 인 첫 줄)
  const hero = makeActor('hyungsub', K.heroSpawn, groundY, 1); hero.classId = 'pantheon';
  const imgs = { hero: null, yc: null, tiles: null, spear: null }; let baked = null;
  loadImg('assets/sprites/subrio_pantheon.png').then(i => { imgs.hero = i; }); loadImg('assets/sprites/subrio_youngcle.png').then(i => { imgs.yc = i; });
  loadImg('assets/props/subrio_tiles.png').then(i => { imgs.tiles = i; baked = null; }); loadImg('assets/props/subrio_spear.png').then(i => { imgs.spear = i; });
  let t = 0, phase = 'walkin', pt = 0, spears = [], lasers = [], nextLaser = K.lasers.first, hits = 0, damageDealt = 0, hitCool = 0, disposed = false, sparks = [], ycX = K.ycEnterFrom, ycFrame = 0, flash = 0;
  const setPhase = (p) => { phase = p; pt = 0; };
  const bake = () => {
    const c = document.createElement('canvas'); c.width = level.width; c.height = level.height; const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    for (let r = 0; r < level.rows; r++) for (let x = 0; x < cols; x++) { const ch = rows[r][x]; if (ch === '.') continue; const col = ATLAS_COLUMN[ch] ?? 0;
      if (imgs.tiles) g.drawImage(imgs.tiles, col * TILE, 0, TILE, TILE, x * TILE, r * TILE, TILE, TILE); else { g.fillStyle = ch === '#' ? '#3e1c6e' : '#6030a0'; g.fillRect(x * TILE, r * TILE, TILE, TILE); } }
    baked = c;
  };
  const downRect = () => ({ x: ycX - 34, y: groundY - 26, w: 68, h: 26 });
  const hitOnce = () => {
    hits++; hitCool = K.down.hitCooldown; flash = 0.08; battle.sfx(K.hitSfx, { volume: 0.5 });
    if (hits % K.down.hitsPerDamage === 0 && damageDealt < K.down.maxDamage) { damageDealt++; battle.hitEnemy(yc, null, 1, { source: 'special', sound: true }); }
  };
  return {
    get snapshot() { return { kind: 'subrio', phase, t: Math.round(t * 100) / 100, hits, damageDealt, hero: { x: Math.round(hero.x), y: Math.round(hero.y), grounded: hero.grounded, invuln: hero.invuln > 0 }, yc: { x: Math.round(ycX), frame: ycFrame }, lasers: lasers.map(l => ({ y: Math.round(l.y), fired: l.fired })), spears: spears.length, down: downRect() }; },
    update(dt, input) {
      if (disposed) return true;
      t += dt; pt += dt; if (flash > 0) flash -= dt; hitCool = Math.max(0, hitCool - dt);
      const intent = { left: input.down('left'), right: input.down('right'), jump: input.just('up'), jumpHeld: input.down('up'), crouch: input.down('down'), attack: input.just('confirm'), attackHeld: input.down('confirm'), guard: input.down('cancel') };
      const events = []; stepActor(level, hero, intent, dt, events);
      for (const e of events) {
        if (e.type === 'attack') { spears.push({ x: e.x, y: e.y, vx: e.facing * (e.charged ? SPEAR.chargedSpeed : SPEAR.speed), life: e.charged ? SPEAR.chargedLife : SPEAR.life, facing: e.facing, charged: e.charged }); battle.sfx('weaponpull', { volume: 0.35 }); }
        else if (e.type === 'jump') battle.sfx('jump', { volume: 0.45 });
      }
      if (phase === 'down') hero.cooldown = Math.min(hero.cooldown, K.down.hitCooldown);   // 쓰러진 동안은 연타
      spears = updateSpears(level, spears, dt);
      if (phase === 'walkin') { ycX = K.ycEnterFrom + (K.ycStand - K.ycEnterFrom) * Math.min(1, pt / K.walkIn); ycFrame = Math.floor(pt * 6) % 2; if (pt >= K.walkIn) setPhase('lasers'); }
      else if (phase === 'lasers') {
        if (t >= nextLaser && t < K.lasers.until) { nextLaser += K.lasers.every; const h = K.lasers.heights[Math.floor(battle.rnd() * K.lasers.heights.length)]; lasers.push({ y: groundY - h, age: 0, fired: false }); battle.sfx(K.laserSfx.warn, { volume: 0.5 }); }
        for (const l of lasers) { l.age += dt; if (!l.fired && l.age >= K.lasers.warn) { l.fired = true; battle.sfx(K.laserSfx.fire, { volume: 0.8 }); } }
        ycFrame = lasers.some(l => l.age >= K.lasers.warn - 0.15 && l.age < K.lasers.warn + K.lasers.beam) ? 2 : 0;
        for (const l of lasers) if (l.fired && l.age < K.lasers.warn + K.lasers.beam && hero.invuln <= 0) {
          const beam = { x: TILE, y: l.y - K.lasers.thick / 2, w: ycX - 24 - TILE, h: K.lasers.thick };
          if (rectsOverlap({ x: hero.x, y: hero.y, w: hero.w, h: hero.h }, beam)) { hurtActor(hero, ycX, []); battle.hurtParty(K.lasers.damage); }
        }
        lasers = lasers.filter(l => l.age < K.lasers.warn + K.lasers.beam);
        if (t >= K.overload.at) { setPhase('overload'); ycFrame = 3; battle.sfx(K.overloadSfx); battle.game.shake = { time: 0.3, amp: 3 }; }
      }
      else if (phase === 'overload') { ycFrame = 3; if (battle.rnd() < 0.6) sparks.push({ x: ycX + (battle.rnd() - 0.5) * 50, y: groundY - 56 + battle.rnd() * 40, vy: -40 - battle.rnd() * 60, life: 0.4 }); if (pt >= K.overload.sparks) { setPhase('down'); ycFrame = 4; battle.sfx(K.downSfx); battle.game.shake = { time: 0.35, amp: 5 }; } }
      else if (phase === 'down') {
        ycFrame = 4; const body = downRect();
        for (const sp of spears) if (!sp.dead && rectsOverlap({ x: sp.x, y: sp.y, w: SPEAR.w, h: SPEAR.h }, body)) { sp.dead = true; hitOnce(); }
        spears = spears.filter(sp => !sp.dead);
        if (hero.vy > 0 && hitCool <= 0 && rectsOverlap({ x: hero.x, y: hero.y + hero.h - 6, w: hero.w, h: 10 }, body)) { hero.vy = -300; hitOnce(); }
        if (pt >= K.down.seconds) { setPhase('getup'); ycFrame = 5; battle.sfx(K.getupSfx, { volume: 0.7 }); }
      }
      else if (phase === 'getup') { ycFrame = 5; if (pt >= K.getup) setPhase('done'); }
      for (const s of sparks) { s.y += s.vy * dt; s.life -= dt; } sparks = sparks.filter(s => s.life > 0);
      return phase === 'done';
    },
    draw(ctx) {
      ctx.save(); ctx.imageSmoothingEnabled = false;
      const g = ctx.createLinearGradient(0, 0, 0, 360); g.addColorStop(0, SKY[0]); g.addColorStop(0.3, SKY[1]); g.addColorStop(0.55, SKY[2]); g.addColorStop(1, SKY[3]); ctx.fillStyle = g; ctx.fillRect(0, 0, 480, 360);
      for (let x = 0; x < 480; x += 6) { const h = 14 + 9 * Math.sin(x * 0.05 + t * 2.1) * Math.sin(x * 0.013 - t * 0.7) + 5 * Math.sin(x * 0.21 + t * 5.3); ctx.fillStyle = 'rgba(98,44,170,0.45)'; ctx.fillRect(x, Math.round(150 - h), 6, Math.round(h) + 20); }
      if (!baked) bake(); ctx.drawImage(baked, OX, OY);
      // 레이저: 예고(깜빡이는 점선) → 빔(빨간 띠 + 흰 심)
      for (const l of lasers) { const y = Math.round(l.y) + OY, x1 = Math.round(ycX - 24) + OX;
        if (!l.fired) { if (Math.floor(l.age * 12) % 2 === 0) { ctx.strokeStyle = 'rgba(255,90,90,0.9)'; ctx.lineWidth = 2; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.moveTo(TILE + OX, y); ctx.lineTo(x1, y); ctx.stroke(); ctx.setLineDash([]); } }
        else { const k = 1 - (l.age - K.lasers.warn) / K.lasers.beam; ctx.fillStyle = 'rgba(255,60,60,0.35)'; ctx.fillRect(TILE + OX, y - K.lasers.thick / 2 - 6, x1 - TILE, K.lasers.thick + 12); ctx.fillStyle = `rgba(255,60,60,${0.5 + 0.45 * k})`; ctx.fillRect(TILE + OX, y - K.lasers.thick / 2, x1 - TILE, K.lasers.thick); ctx.fillStyle = '#fff'; ctx.fillRect(TILE + OX, y - 2, x1 - TILE, 4); } }
      // 도트 영클(시트는 오른쪽을 본다 → 왼쪽을 보게 뒤집는다)
      const feet = groundY + OY, cx = Math.round(ycX) + OX;
      if (imgs.yc) { ctx.save(); ctx.translate(cx, feet); ctx.scale(-1, 1); if (phase === 'overload' && Math.floor(t * 20) % 2) ctx.translate(2, 0); ctx.drawImage(imgs.yc, (ycFrame % 3) * YC_CELL, Math.floor(ycFrame / 3) * YC_CELL, YC_CELL, YC_CELL, -YC_CELL / 2, -YC_FEET, YC_CELL, YC_CELL); ctx.restore(); }
      else { ctx.fillStyle = '#9ad'; ctx.fillRect(cx - 16, feet - 56, 32, 56); }
      for (const s of sparks) { ctx.fillStyle = s.life > 0.2 ? '#ffe066' : '#fff'; ctx.fillRect(Math.round(s.x) + OX, Math.round(s.y) + OY, 3, 3); }
      if (phase === 'down') {                                   // ‘공격해라!’ 화살표(위아래로 튐) + 남은 시간
        const ay = feet - 60 - Math.abs(Math.sin(t * 6)) * 8; ctx.fillStyle = '#ffe066'; ctx.beginPath(); ctx.moveTo(cx - 10, ay - 14); ctx.lineTo(cx + 10, ay - 14); ctx.lineTo(cx, ay); ctx.closePath(); ctx.fill();
        ctx.font = '14px "Galmuri11", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText(K.down.arrowText, cx, ay - 34); ctx.fillStyle = '#fff'; ctx.fillText(`${Math.max(0, Math.ceil(K.down.seconds - pt))}`, cx, ay - 52); ctx.textAlign = 'left';
      }
      // 창
      for (const sp of spears) { const sx = Math.round(sp.x) + OX, sy = Math.round(sp.y) + OY; if (imgs.spear) { ctx.save(); ctx.translate(sx + 12, sy + 3); if (sp.facing < 0) ctx.scale(-1, 1); ctx.drawImage(imgs.spear, -12, -3); ctx.restore(); } else { ctx.fillStyle = '#e6d28c'; ctx.fillRect(sx, sy + 2, 20, 2); } }
      // 요플래(판테온)
      const frame = frameOf(hero), hx = Math.round(hero.x + hero.w / 2) + OX, hf = Math.round(hero.y + hero.h) + OY;
      if (!(hero.invuln > 0 && hero.hurtT <= 0 && Math.floor(t * 14) % 2 === 1)) {
        if (imgs.hero) { ctx.save(); ctx.translate(hx, hf); if (hero.facing < 0) ctx.scale(-1, 1); ctx.drawImage(imgs.hero, (frame % 2) * HERO_CELL, Math.floor(frame / 2) * HERO_CELL, HERO_CELL, HERO_CELL, -HERO_CELL / 2, -HERO_FEET, HERO_CELL, HERO_CELL); ctx.restore(); }
        else { ctx.fillStyle = '#d9a441'; ctx.fillRect(hx - 6, hf - hero.h, 12, hero.h); }
      }
      // 명중·피해 표시(오른쪽 위)
      ctx.font = '14px "Galmuri11", sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'top'; ctx.fillStyle = '#ffe066';
      if (phase === 'down' || phase === 'getup') ctx.fillText(`${hits}타 · 피해 ${damageDealt}/${K.down.maxDamage}`, 468, 8);
      ctx.fillStyle = '#c9c9d9'; ctx.textAlign = 'left'; ctx.fillText('←→ 이동 · ↑ 점프 · C 창', 12, 8);
      if (flash > 0) { ctx.fillStyle = `rgba(255,255,255,${flash * 4})`; ctx.fillRect(0, 0, 480, 360); }
      ctx.restore();
    },
    dispose() { disposed = true; },
  };
}
