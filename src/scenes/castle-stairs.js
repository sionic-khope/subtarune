import { SCREEN_W, SCREEN_H } from '../core/layout.js';

/**
 * BUILD334 crumbling tower stairs (사용자 2026-09-25): the climber stays on the stair band (PATH from the map),
 * 파크가디언·뚜울라·쥰희 climb ahead in step with the player, and at fixed points the 청소년 fist smashes the steps
 * just behind (tension only, not a timer). Encounters (three monsters, then 누누와 윌럼프) run as scripts.
 */
export const STAIRS = Object.freeze({
  map: 'gajaeman_castle_stairs',
  flags: { monsters: 'castle_stairs_monsters_done', nunu: 'castle_stairs_nunu_done' },
  scripts: { monsters: 'castle_stairs_monsters', nunu: 'castle_stairs_nunu' },
  allySpeed: 170, lateral: [-28, 26, -2], stopGap: 80,
  fist: { image: 'assets/props/arena332_arm.png', drop: 0.22, hold: 0.45, fade: 0.35, behind: 150, span: 110, height: 420 },
  nunu: { cell: 384, scale: 0.6, drop: 0.7 },
  fall: { vx: 230, vup: 260, gravity: 900, life: 1.6 },
  step: 31,   // 생성 계단의 한 칸 높이(tools/art/castle334_stairs_set.py 의 step pitch)
});

const clamp01 = v => Math.max(0, Math.min(1, v));

export class CastleStairs {
  constructor(game, { rnd = Math.random } = {}) {
    this.game = game; this.map = game.map; this.rnd = rnd; this.disposed = false;
    const meta = game.map.def.meta.stairs;
    this.meta = meta;
    this.path = meta.path.map(([x, y]) => ({ x, y }));
    this.lens = [0];
    for (let i = 1; i < this.path.length; i++) this.lens.push(this.lens[i - 1] + Math.hypot(this.path[i].x - this.path[i - 1].x, this.path[i].y - this.path[i - 1].y));
    this.total = this.lens.at(-1);
    this.smash = meta.smash.map(([x, y]) => ({ s: this.project(x, y).s, fired: false }));
    this.enc = Object.fromEntries(Object.entries(meta.encounters).map(([k, [x, y]]) => [k, this.project(x, y).s]));
    this.allies = meta.allies.map(([id, lead], i) => ({ id, lead, lateral: STAIRS.lateral[i] || 0, s: null, e: game.entities.find(e => e.id === id) }));
    this.progress = 0; this.clouds = []; this.bobs = new Map(); this.stepDist = 0; this.fists = []; this.holes = []; this.debris = []; this.fallers = []; this.nunu = null; this.alliesPaused = false; this.time = 0;
    if (game.has(STAIRS.flags.monsters)) this.removeAlly('stairs_park', 'stairs_ttuulla');
    if (game.has(STAIRS.flags.nunu)) this.removeAlly('stairs_junhee');
    game.windWalk = true;
    void game.sound.loadSfxFiles?.(['furnace_blast', 'baron_slam', 'baron_roar', 'impact', 'heavyswing', 'thud', 'captain_transform', 'rumble', 'jump', 'iron_step_1', 'iron_step_2']);
    const p = game.player;
    if (p) { this.progress = this.project(p.x + p.w / 2, p.y + p.h / 2).s; for (const sm of this.smash) if (sm.s < this.progress) sm.fired = true; }
    for (const a of this.allies) if (a.e) a.s = this.progress + a.lead;
  }
  get snapshot() {
    return { progress: Math.round(this.progress), total: Math.round(this.total), smashed: this.smash.filter(s => s.fired).length,
      allies: this.allies.filter(a => a.e && !a.gone).map(a => a.id), nunu: this.nunu?.phase || null, fallers: this.fallers.length };
  }
  removeAlly(...ids) { for (const a of this.allies) if (ids.includes(a.id)) { a.gone = true; if (a.e) a.e.dead = true; } }
  /** Nearest point on the stair centreline and its arc length. */
  project(x, y) {
    let best = { d: Infinity, s: 0, x, y };
    for (let i = 1; i < this.path.length; i++) {
      const a = this.path[i - 1], b = this.path[i], dx = b.x - a.x, dy = b.y - a.y, L2 = dx * dx + dy * dy || 1;
      const t = clamp01(((x - a.x) * dx + (y - a.y) * dy) / L2), px = a.x + dx * t, py = a.y + dy * t, d = Math.hypot(x - px, y - py);
      if (d < best.d) best = { d, s: this.lens[i - 1] + Math.sqrt(L2) * t, x: px, y: py };
    }
    return best;
  }
  pointAt(s) {
    s = Math.max(0, Math.min(this.total, s));
    let i = 1; while (i < this.lens.length - 1 && this.lens[i] < s) i++;
    const a = this.path[i - 1], b = this.path[i], seg = this.lens[i] - this.lens[i - 1] || 1, t = (s - this.lens[i - 1]) / seg;
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  }
  sfx(name, volume) { this.game.sound.sfx(name, { volume }); }
  waitFor(done) { return new Promise(resolve => this.game.background.push({ update: () => { if (this.disposed || done()) { resolve(); return true; } return false; } })); }
  pauseAllies(v) { this.alliesPaused = v; }
  update(dt) {
    const g = this.game;
    if (this.disposed) return;
    if (g.map !== this.map || g.state === 'title') { this.dispose(); return; }
    const s = Math.max(0, dt); this.time += s;
    const p = g.player;
    if (p && !g.dialogue.running) {
      const cx = p.x + p.w / 2, cy = p.y + p.h / 2, q = this.project(cx, cy), R = this.meta.half;
      if (q.d > R) { const k = R / q.d; p.x = q.x + (cx - q.x) * k - p.w / 2; p.y = q.y + (cy - q.y) * k - p.h / 2; }
      this.progress = Math.max(this.progress, q.s);
      for (const sm of this.smash) if (!sm.fired && this.progress > sm.s + 30) { sm.fired = true; this.slam(sm.s - STAIRS.fist.behind + 60); }
      if (g.state === 'field' && !g.transitioning) {
        if (!g.has(STAIRS.flags.monsters) && this.progress > this.enc.monsters) g.runScript(STAIRS.scripts.monsters);
        else if (g.has(STAIRS.flags.monsters) && !g.has(STAIRS.flags.nunu) && this.progress > this.enc.nunu) g.runScript(STAIRS.scripts.nunu);
      }
    }
    // 동료들이 앞에서 같은 속도로 오른다(대화 중엔 멈춤)
    for (const a of this.allies) {
      if (!a.e || a.gone || a.e.dead) continue;
      if (this.alliesPaused || g.dialogue.running) { a.e.moving = false; continue; }
      // 멈추는 자리도 한 줄로(같은 점에 몰리지 않게)
      const order = this.allies.filter(x => x.e && !x.gone && !x.e.dead).indexOf(a), base = g.has(STAIRS.flags.monsters) ? (g.has(STAIRS.flags.nunu) ? this.total : this.enc.nunu + 50) : this.enc.monsters + 120;
      const cap = base + order * STAIRS.stopGap;
      const target = Math.min(this.progress + a.lead, cap), before = a.s;
      a.s += Math.sign(target - a.s) * Math.min(Math.abs(target - a.s), STAIRS.allySpeed * s);
      const pt = this.pointAt(a.s);
      a.e.x = pt.x + a.lateral - a.e.w / 2; a.e.y = pt.y - a.e.h / 2;
      a.e.moving = Math.abs(a.s - before) > 0.1;
      // 걷는 모션: 이 틱에 직접 움직였음을 알려 NPC 정지 처리가 프레임을 0으로 덮지 않게
      if (a.e.moving) { a.e.animate?.(s, 8); a.e.driven = true; }
      a.e.facing = 'up';
    }
    // 계단 느낌: 움직이는 모두가 한 칸마다 몸이 들썩이고, 주인공 발소리
    const climbers = [p, ...g.entities.filter(e => e.def?.type === 'follower' && !e.dead), ...this.allies.filter(a => a.e && !a.gone && !a.e.dead).map(a => a.e)];
    for (const e of climbers) {
      if (!e) continue;
      const last = this.bobs.get(e) || { x: e.x, y: e.y, d: 0 };
      const moved = Math.hypot(e.x - last.x, e.y - last.y);
      last.d += moved; last.x = e.x; last.y = e.y; this.bobs.set(e, last);
      if (!this.fallers.some(f => f.e === e)) e.hopY = moved > 0.05 ? Math.round(Math.abs(Math.sin(last.d * Math.PI / STAIRS.step)) * 3) : 0;
    }
    if (p && !g.dialogue.running) {
      const b = this.bobs.get(p);
      if (b && b.d - this.stepDist >= STAIRS.step) { this.stepDist = b.d; this.sfx(Math.floor(b.d / STAIRS.step) % 2 ? 'iron_step_1' : 'iron_step_2', 0.22); }
    }
    for (const c of this.clouds) { c.age += s; c.x += c.vx * s; c.y += c.vy * s; c.vx *= 0.96; c.vy *= 0.96; c.r += 10 * s; }
    this.clouds = this.clouds.filter(c => c.age < c.life);
    for (const f of this.fists) {
      f.t += s;
      if (!f.hit && f.t >= STAIRS.fist.drop) {
        f.hit = true; this.holes.push({ s0: f.s - STAIRS.fist.span, s1: f.s + STAIRS.fist.span, age: 0 });
        g.shake = { time: 0.5, amp: 6 }; this.sfx('furnace_blast', 0.75); this.sfx('baron_slam', 0.5);
        for (let i = 0; i < 18; i++) this.debris.push({ x: f.x + (this.rnd() - 0.5) * 120, y: f.y, vx: (this.rnd() - 0.5) * 220, vy: -120 - this.rnd() * 200, age: 0, size: 3 + (i % 4) * 2 });
      }
    }
    this.fists = this.fists.filter(f => f.t < STAIRS.fist.drop + STAIRS.fist.hold + STAIRS.fist.fade);
    for (const h of this.holes) h.age += s;
    for (const d of this.debris) { d.age += s; d.x += d.vx * s; d.y += d.vy * s; d.vy += 700 * s; }
    this.debris = this.debris.filter(d => d.age < 1.6);
    for (const f of this.fallers) {
      f.t += s; f.vy += STAIRS.fall.gravity * s; f.dx += f.vx * s; f.dy += f.vy * s;
      if (f.e) { f.e.x = f.x0 + f.dx; f.e.y = f.y0 + f.dy; f.e.spin = (f.e.spin || 0) + f.spin * s; }
      if (f.t >= STAIRS.fall.life && f.e) { f.e.visible = false; f.e.dead = true; }
    }
    this.fallers = this.fallers.filter(f => f.t < STAIRS.fall.life);
    if (this.nunu) this.updateNunu(s);
  }
  /** The 청소년 fist drops from above onto the steps at arc length s. */
  slam(s) {
    const pt = this.pointAt(s);
    this.fists.push({ s, x: pt.x, y: pt.y, t: 0, hit: false });
    this.sfx('heavyswing', 0.6);
  }
  /** Walk the remaining allies (walking frames) to a neat row on the steps just below the threat, facing it. */
  arrangeAllies(baseS, gap = 34, seconds = 0.8) {
    const g = this.game, live = this.allies.filter(a => a.e && !a.gone && !a.e.dead);
    const jobs = live.map((a, i) => { const pt = this.pointAt(baseS + i * gap); return { a, fx: a.e.x, fy: a.e.y, tx: pt.x + (i - (live.length - 1) / 2) * 34 - a.e.w / 2, ty: pt.y - a.e.h / 2 }; });
    let t = 0;
    return new Promise(resolve => g.background.push({ update: dt => {
      t = Math.min(1, t + dt / seconds);
      for (const j of jobs) { j.a.e.x = j.fx + (j.tx - j.fx) * t; j.a.e.y = j.fy + (j.ty - j.fy) * t; j.a.e.moving = t < 1; if (t < 1) { j.a.e.animate?.(dt, 8); j.a.e.driven = true; } j.a.e.facing = 'up'; j.a.s = baseS; }
      if (t < 1) return false;
      resolve(); return true;
    } }));
  }
  /** A thick dark smoke cloud billows up where a monster is summoned. */
  smoke(x, y, count = 26) {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      this.clouds.push({ x: x + Math.cos(a) * 10, y: y - 20 + Math.sin(a) * 6, vx: Math.cos(a) * (30 + this.rnd() * 50), vy: -20 - this.rnd() * 50, r: 12 + this.rnd() * 14, age: 0, life: 1.4 + this.rnd() * 0.6 });
    }
  }
  /** The three monsters are summoned one by one inside dark smoke (사용자 “소환되는거 연기랑 함께”). */
  showMonsters(ids) {
    const g = this.game, list = ids.map(id => g.entities.find(x => x.id === id)).filter(Boolean);
    let t = 0;
    const jobs = list.map((e, i) => ({ e, at: i * 0.55, started: false, shown: false }));
    return new Promise(resolve => g.background.push({ update: dt => {
      t += dt;
      for (const j of jobs) {
        if (!j.started && t >= j.at) { j.started = true; this.smoke(j.e.x + (j.e.iw || j.e.w) / 2, j.e.y + j.e.h); this.sfx('captain_transform', 0.4); }
        if (j.started && !j.shown && t >= j.at + 0.35) { j.shown = true; j.e.visible = true; g.shake = { time: 0.2, amp: 2 }; }
      }
      if (!(jobs.every(j => j.shown) && t > jobs.at(-1).at + 0.9)) return false;
      resolve(); return true;
    } }));
  }
  /** A body flies off the side of the stairs and falls into the dark. */
  fallOff(ids, dir) {
    for (const id of ids) {
      const e = this.game.entities.find(x => x.id === id);
      if (!e) continue;
      this.fallers.push({ e, x0: e.x, y0: e.y, dx: 0, dy: 0, vx: dir * STAIRS.fall.vx * (0.8 + this.rnd() * 0.4), vy: -STAIRS.fall.vup, spin: dir * (6 + this.rnd() * 6), t: 0 });
      const a = this.allies.find(x => x.id === id); if (a) a.gone = true;
    }
    return this.waitFor(() => !this.fallers.length);
  }
  /** Tackle: runner dashes into the target(s), impact, then everyone involved falls off to `dir`. */
  tackle(runnerId, targetIds, dir, seconds = 0.45) {
    const g = this.game, r = g.entities.find(x => x.id === runnerId), t = g.entities.find(x => x.id === targetIds[0]);
    if (!r || !t) return undefined;
    const a = this.allies.find(x => x.id === runnerId); if (a) a.gone = true;
    const from = { x: r.x, y: r.y }, to = { x: t.x + (t.w || 0) / 2 - r.w / 2, y: t.y + (t.h || 0) - r.h };
    let k = 0; this.sfx('jump', 0.6);
    return new Promise(resolve => g.background.push({ update: dt => {
      k = Math.min(1, k + dt / seconds);
      r.x = from.x + (to.x - from.x) * k; r.y = from.y + (to.y - from.y) * k; r.hopY = Math.sin(Math.PI * k) * 40; r.moving = true;
      if (k < 1) return false;
      r.hopY = 0; g.shake = { time: 0.4, amp: 5 }; this.sfx('impact', 0.9);
      for (let i = 0; i < 10; i++) this.debris.push({ x: to.x + r.w / 2, y: to.y, vx: (this.rnd() - 0.5) * 240, vy: -160 - this.rnd() * 120, age: 0.4, size: 3 });
      this.fallOff([runnerId, ...targetIds], dir).then(resolve);
      return true;
    } }));
  }
  /** 누누와 윌럼프 lands on the top landing with a roar. */
  showNunu() {
    const n = this.meta.nunu;
    this.nunu = { phase: 'drop', t: 0, x: n.x, feet: n.feet, dy: -420, frame: 0, dx: 0, spin: 0, vx: 0, vy: 0 };
    this.sfx('baron_roar', 0.8); this.game.shake = { time: 1.2, amp: 5 };
    return this.waitFor(() => this.nunu && this.nunu.phase !== 'drop');
  }
  /** 쥰희 headbutts 누누와 윌럼프 and both go over the side. */
  junheeHeadbutt(junheeId, dir) {
    const g = this.game, j = g.entities.find(x => x.id === junheeId), n = this.nunu;
    if (!j || !n) return undefined;
    const a = this.allies.find(x => x.id === junheeId); if (a) a.gone = true;
    const from = { x: j.x, y: j.y }, to = { x: n.x - j.w / 2, y: n.feet - 60 };
    let k = 0; this.sfx('jump', 0.7);
    return new Promise(resolve => g.background.push({ update: dt => {
      k = Math.min(1, k + dt / 0.5);
      j.x = from.x + (to.x - from.x) * k; j.y = from.y + (to.y - from.y) * k; j.hopY = Math.sin(Math.PI * k) * 50;
      if (k < 1) return false;
      j.hopY = 0; g.shake = { time: 0.6, amp: 7 }; this.sfx('impact', 1); this.sfx('baron_roar', 0.9);
      n.phase = 'fall'; n.t = 0; n.vx = dir * 200; n.vy = -240; n.frame = 3;
      this.fallOff([junheeId], dir).then(() => this.waitFor(() => !this.nunu)).then(resolve);
      return true;
    } }));
  }
  updateNunu(s) {
    const n = this.nunu, N = STAIRS.nunu;
    n.t += s;
    if (n.phase === 'drop') {
      const k = clamp01(n.t / N.drop); n.dy = -420 * (1 - k * k);
      if (k >= 1) { n.phase = 'idle'; n.dy = 0; this.game.shake = { time: 0.5, amp: 6 }; this.sfx('baron_slam', 0.7); }
    } else if (n.phase === 'idle') n.frame = Math.floor(n.t * 2) % 2 ? 2 : Math.floor(n.t * 3) % 2;
    else if (n.phase === 'fall') {
      n.vy += STAIRS.fall.gravity * s; n.dx += n.vx * s; n.dy += n.vy * s; n.spin += 4 * s * Math.sign(n.vx);
      if (n.t > STAIRS.fall.life + 0.3) this.nunu = null;
    }
  }
  /** Drawn after actors: smashed gaps, the fist, debris and the big monster. */
  draw(ctx, cam) {
    if (this.disposed) return;
    ctx.save();
    for (const h of this.holes) {
      for (let s = h.s0; s <= h.s1; s += 8) {
        const pt = this.pointAt(s), jag = ((s * 13) % 17) - 8;
        ctx.fillStyle = '#020208';
        ctx.fillRect(Math.round(pt.x - this.meta.half - 24 + jag / 2 - cam.x), Math.round(pt.y - 10 - cam.y), Math.round((this.meta.half + 24) * 2 - jag), 22);
      }
      const e0 = this.pointAt(h.s0), e1 = this.pointAt(h.s1);
      ctx.fillStyle = '#34437f';
      for (const e of [e0, e1]) for (let i = 0; i < 6; i++) ctx.fillRect(Math.round(e.x - 50 + i * 18 - cam.x), Math.round(e.y - 4 + (i % 2) * 6 - cam.y), 10, 4);
    }
    const img = this.game.propImages[STAIRS.fist.image], F = STAIRS.fist;
    for (const f of this.fists) {
      if (!img) break;
      const k = clamp01(f.t / F.drop), fade = f.t > F.drop + F.hold ? 1 - clamp01((f.t - F.drop - F.hold) / F.fade) : 1;
      const y = f.y - F.height * (1 - k * k);
      ctx.save(); ctx.globalAlpha = fade;
      ctx.translate(Math.round(f.x - cam.x), Math.round(y - cam.y)); ctx.rotate(Math.PI / 2);
      ctx.drawImage(img, -img.width + 20, -img.height / 2); ctx.restore();
    }
    for (const d of this.debris) {
      ctx.globalAlpha = Math.max(0, 1 - d.age / 1.6); ctx.fillStyle = d.dark ? '#1a0d2c' : d.size > 5 ? '#34437f' : '#1a2150';
      ctx.fillRect(Math.round(d.x - cam.x), Math.round(d.y - cam.y), d.size, d.size);
    }
    for (const c of this.clouds) {
      ctx.globalAlpha = Math.min(0.9, (1 - c.age / c.life) * 1.3); ctx.fillStyle = c.r > 22 ? '#1a0d2c' : '#07030d';
      const r = Math.round(c.r), cx = c.x - cam.x, cy = c.y - cam.y;
      for (let row = -r; row < r; row += 2) { const half = Math.round(Math.sqrt(1 - ((row + 1) / r) ** 2) * r); ctx.fillRect(Math.round(cx - half), Math.round(cy + row), half * 2, 2); }
    }
    ctx.globalAlpha = 1;
    this.drawNunu(ctx, cam);
    ctx.restore();
  }
  drawNunu(ctx, cam) {
    const n = this.nunu, img = n && this.game.propImages[this.meta.nunu.image];
    if (!img) return;
    const N = STAIRS.nunu, size = N.cell * N.scale;
    ctx.save();
    ctx.translate(Math.round(n.x + n.dx - cam.x), Math.round(n.feet + n.dy - cam.y - size * 0.45)); if (n.spin) ctx.rotate(n.spin);
    ctx.drawImage(img, (n.frame % 2) * N.cell, Math.floor(n.frame / 2) * N.cell, N.cell, N.cell, -size / 2, -size / 2, size, size);
    ctx.restore();
    void SCREEN_W; void SCREEN_H;
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.game.windWalk = false;
    if (this.game.castleStairs === this) this.game.castleStairs = null;
  }
}
