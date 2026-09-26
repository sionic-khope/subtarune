import { GJ_RUNNER as C } from '../../data/gajaeman-runner.js';
import { RUNNER, SLASH_BOX } from '../../world/runner-core.js';
import { FONT } from '../../ui/font.js';
import { SunsetRun } from '../../scenes/sunset-run.js';
import { glow } from '../../scenes/castle-rise.js';

const lerp = (a, b, t) => a + (b - a) * t;
const smooth = t => { const k = Math.max(0, Math.min(1, t)); return k * k * (3 - 2 * k); };
const overlap = (x, y, w, h, l, t, r, b) => x + w > l && x - w < r && y + h > t && y - h < b;

/**
 * BUILD363 노을 땅 가재맨 달리기 결전(전투 모드). 달리기 화면은 필드 연출이 쓰던 SunsetRun 을 그대로 이어받는다.
 * 순환: 검 세 자루(아래로 낮게 날아옴 — 점프로 넘거나 베어 쳐냄) → “니애미 따라가라” 누워 돌진(C 로 쳐내야 함, 쳐내면 뒤로 물러났다 복귀)
 * 다섯 번 쳐내면 마지막: 엄청난 기운 → 콰앙 뒤로 → 두두두둥 폭죽과 함께 천천히, 점프해도 따라오는 돌진 → 맞붙기 직전 멈추고 C.
 */
export function createGajaemanRunner(battle, { enemy }) {
  const g = battle.game;
  const run = battle.cfg.sunsetRun || new SunsetRun(g);
  if (!battle.cfg.sunsetRun) { run.started = true; run.core.phase = 'run'; run.core.vx = run.core.speed; run.reveal = 1; run.white = 0; run.boss.visible = true; run.boss.x = C.boss.home[0]; }
  run.core.endX = Infinity; run.core.obstacles = null;
  const boss = run.boss; boss.visible = true; boss.lie = 0; boss.aura = 1; boss.face = 'left';
  let phase = 'hover', phaseTime = 0, elapsed = 0, counters = 0, disposed = false, invuln = 0, hurtFlash = 0;
  let swords = [], thrown = 0, dash = null, returnFrom = null, popT = 0, lockFrom = null;
  const lock = { gauge: 0 }; let cycleN = 0;
  // 적 hp 는 6: 쳐냄 다섯 번이 막대 5칸, 마지막 맞붙기의 C 가 남은 한 칸(그때 전투가 이긴 것으로 끝난다)
  const hpMax = C.counters, shown = () => Math.max(0, enemy.hp - 1);
  let hpDisplay = shown();
  const change = next => { phase = next; phaseTime = 0; };
  const sfx = (name, volume = 0.8) => battle.sfx(name, { volume });
  const player = () => ({ x: run.x, y: run.groundY - run.core.airY * C.stage.scale });
  const slashBox = () => {
    const a = run.core.attack;
    if (!a || a.t < C.slash.from || a.t > (a.kind === 'slash' ? RUNNER.slashTime : RUNNER.airSlashTime) * C.slash.until) return null;
    const p = player(), k = C.stage.scale * 1.15, box = SLASH_BOX[a.kind === 'slash' ? 'ground' : 'air'].map(v => v * k);
    return [p.x + box[0], p.y - box[3], p.x + box[1], p.y - box[2]];
  };
  const bodyBox = () => { const p = player(); return [p.x - C.player.halfWidth, p.y - C.player.height, p.x + C.player.halfWidth, p.y]; };
  const hurt = () => {
    if (invuln > 0 || disposed) return;
    // SAVE THE WORLD 결전은 맞는 연출만(체력은 깎이지 않는다 — 게임오버 없음, 사용자 BUILD369)
    invuln = C.invulnerability; hurtFlash = 0.2; sfx(C.sfx.hurt, 0.8); g.shake = { time: 0.15, amp: 2 };
  };
  // ── 검 ──
  const throwSword = index => {
    if (index % 2 === 1) {
      // 뒤(오른쪽 위)로 한 번 뺐다가 → 요플래에게 일직선
      swords.push({ x: boss.x - 10, y: boss.y + 6, vx: 170, vy: -60, ang: Math.PI, landed: true, straight: true, back: C.sword.back, dead: false, t: 0 });
      sfx(C.sfx.sword, 0.5);
      return;
    }
    const p = player(), tx = p.x + C.sword.aimAhead, ty = run.groundY - C.sword.aimHeight;
    const dx = tx - boss.x, dy = ty - boss.y, d = Math.hypot(dx, dy);
    swords.push({ x: boss.x - 10, y: boss.y + 6, vx: dx / d * C.sword.speed, vy: dy / d * C.sword.speed, ang: Math.atan2(dy, dx), landed: false, dead: false, t: 0 });
    sfx(C.sfx.swordFly, 0.7);
  };
  // ── 돌진 ──
  const launchDash = () => {
    dash = { y: run.groundY - C.dash.height, vx: -C.dash.speed, countered: false, hit: false };
    boss.y = dash.y; boss.lie = 1; sfx(C.sfx.dashGo, 0.8); change('dash');
    run.burst(boss.x, boss.y, 30, { rainbow: false, speed: 200, life: 0.5 });
  };
  // 돌진 뒤편에서 폭죽처럼 팡팡 — 타닥타닥 튀기는 소리(폭발음 아님)
  let popClock = 0, trailClock = 0; const crackles = [];
  const firework = dt => {
    popClock += dt; trailClock += dt;
    if (trailClock >= C.dash.trailEvery) { trailClock = 0; boss.trail = [{ x: boss.x, y: boss.y }, ...(boss.trail || [])].slice(0, 5); }
    if (popClock >= C.dash.pop) {
      popClock = 0;
      const x = boss.x + 46 + run.rnd() * 40, y = boss.y + (run.rnd() - 0.5) * 34, c = C.rainbow[Math.floor(run.rnd() * C.rainbow.length)];
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, v = 70 + run.rnd() * 50; run.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, life: 0.35, s: 2, color: i % 3 ? c : '#ffffff', g: 40, drag: 0.94 }); }
      for (let i = 0; i < 3; i++) crackles.push(i * 0.045);
    }
    for (let i = crackles.length - 1; i >= 0; i--) { crackles[i] -= dt; if (crackles[i] <= 0) { crackles.splice(i, 1); sfx(C.sfx.crackle, 0.32); } }
  };
  const counter = () => {
    if (dash.countered || disposed) return;
    dash.countered = true;
    const applied = battle.hitEnemy(enemy, null, 1, { source: 'gajaeman_counter', sound: false });
    if (!(applied > 0) || disposed) return;
    counters++;
    // 쳐냄: 무지개·보라 입자, 릴리즈샷, 화려한 검기, 진동
    sfx(C.sfx.counter, 0.9); sfx(C.sfx.counterHit, 0.8);
    run.burst(boss.x, boss.y, 46, { speed: 190 }); run.burst(boss.x, boss.y, 18, { rainbow: false, speed: 120 });
    run.flash = 0.16; run.flashColor = '255,244,255'; g.shake = { time: 0.35, amp: 6 }; boss.shake = 0.3;
    run.slashFx.push({ kind: 'slash', up: false, t: 0, dur: 0.34 }, { kind: 'airslash', up: false, t: 0.05, dur: 0.4 });
    returnFrom = { x: boss.x, y: boss.y }; boss.trail = [];
    change(counters >= C.counters ? 'final_pause' : 'recoil');
  };
  function tick(dt, keys) {
    elapsed += dt; phaseTime += dt;
    invuln = Math.max(0, invuln - dt); hurtFlash = Math.max(0, hurtFlash - dt);
    hpDisplay = Math.max(shown(), hpDisplay - dt * 6);
    const slow = phase === 'clash_wait' ? C.final.slow : phase === 'slash' ? 0.35 : 1;
    run.update(dt * slow, ['clash_wait', 'lock', 'release', 'slash'].includes(phase) ? {} : keys);
    const p = player();
    const home = C.boss.home;
    if (phase === 'hover') {
      boss.lie = Math.max(0, boss.lie - dt * 4); boss.face = 'left';
      boss.x = lerp(boss.x, home[0], Math.min(1, dt * 3)); boss.y = lerp(boss.y, home[1], Math.min(1, dt * 3));
      if (phaseTime >= (counters === 0 && elapsed < 2 ? C.cycle.first : C.cycle.rest)) { thrown = 0; cycleN++; change('swords'); sfx(C.sfx.sword, 0.5); }
    } else if (phase === 'swords') {
      // 검을 꺼내 들어 번쩍(예고) → 한 자루씩
      const next = C.sword.warn + thrown * C.sword.every;
      if (thrown < C.sword.count && phaseTime >= next) { throwSword(thrown + cycleN); thrown++; }
      if (thrown >= C.sword.count && phaseTime >= next + 0.9) { change('dash_warn'); sfx(C.sfx.kickVoice, 1.0); }
    } else if (phase === 'dash_warn') {
      // “니애미 따라가라” — 몸을 가로로 눕히며 땅 높이로 내려와 기를 모은다
      boss.lie = 0; boss.aura = 1.4 + 1.6 * smooth(phaseTime / 0.6); boss.shake = 0.1;
      boss.y = lerp(home[1], run.groundY - C.dash.height, smooth(phaseTime / 0.8)); boss.x = lerp(boss.x, 430, Math.min(1, dt * 3));
      for (let i = 0; i < 3; i++) { const a = run.rnd() * Math.PI * 2, r = 16 + run.rnd() * 26; run.particles.push({ x: boss.x + Math.cos(a) * r, y: boss.y + Math.sin(a) * r, vx: Math.cos(a) * 90, vy: Math.sin(a) * 90 - 40, t: 0, life: 0.5, s: 3 + (i % 2), color: i % 2 ? '#a851ff' : '#1a0830', g: -30 }); }
      if (phaseTime >= C.dash.warn) launchDash();
    } else if (phase === 'dash') {
      boss.x += dash.vx * dt;
      firework(dt);
      if (run.rnd() < 0.8) run.particles.push({ x: boss.x + 30, y: boss.y + (run.rnd() - 0.5) * 20, vx: 80, vy: 0, t: 0, life: 0.3, s: 3, color: run.rnd() < 0.5 ? '#a851ff' : '#1a0830', g: 0 });
      const s = slashBox();
      if (s && overlap(boss.x, boss.y, C.dash.halfW, C.dash.halfH, ...s)) counter();
      else if (!dash.hit && overlap(boss.x, boss.y, C.dash.halfW, C.dash.halfH, ...bodyBox())) { dash.hit = true; hurt(); }
      if (phase === 'dash' && boss.x < C.dash.endX) { boss.trail = []; boss.x = 560; boss.lie = 0; returnFrom = { x: 560, y: home[1] }; change('return'); }
    } else if (phase === 'recoil') {
      const k = Math.sin(Math.min(1, phaseTime / C.dash.recoil) * Math.PI / 2);
      boss.x = returnFrom.x + k * 150; boss.y = returnFrom.y - k * 60; boss.lie = 1 - k;
      if (phaseTime >= C.dash.recoil) { returnFrom = { x: boss.x, y: boss.y }; change('return'); }
    } else if (phase === 'return') {
      const k = smooth(phaseTime / C.dash.returnSeconds);
      boss.x = lerp(returnFrom.x, home[0], k); boss.y = lerp(returnFrom.y, home[1], k); boss.lie = Math.max(0, boss.lie - dt * 3); boss.aura = 1;
      if (phaseTime >= C.dash.returnSeconds) change('hover');
    } else if (phase === 'final_pause') {
      const k = smooth(phaseTime / C.pause);
      boss.x = lerp(returnFrom.x, home[0], k); boss.y = lerp(returnFrom.y, home[1], k); boss.lie = Math.max(0, 1 - phaseTime * 2); boss.aura = 1;
      if (phaseTime >= C.pause) { returnFrom = { x: boss.x, y: boss.y }; change('final_gather'); }
    } else if (phase === 'final_gather') {
      // 엄청난 기운을 모은다
      if (phaseTime < dt * 1.5) { sfx(C.sfx.gather, 0.8); sfx(C.sfx.charge, 0.7); }
      const k = Math.min(1, phaseTime / C.final.gather);
      boss.lie = Math.max(0, 1 - phaseTime * 3); boss.aura = 1 + k * 2.5; boss.shake = 0.1;
      boss.x = lerp(returnFrom.x, home[0], smooth(phaseTime / 0.8)); boss.y = lerp(returnFrom.y, home[1], smooth(phaseTime / 0.8));
      if (run.rnd() < 0.9) { const a = run.rnd() * Math.PI * 2, r = 70 + run.rnd() * 40; run.particles.push({ x: boss.x + Math.cos(a) * r, y: boss.y + Math.sin(a) * r, vx: -Math.cos(a) * r * 2, vy: -Math.sin(a) * r * 2, t: 0, life: 0.45, s: 2 + (run.rnd() < 0.4 ? 1 : 0), color: C.rainbow[Math.floor(run.rnd() * C.rainbow.length)], g: 0 }); }
      g.shake = { time: 0.05, amp: 1 + k * 2 };
      if (phaseTime >= C.final.gather) { returnFrom = { x: boss.x, y: boss.y }; sfx(C.sfx.back, 0.9); g.shake = { time: 0.4, amp: 6 }; change('final_back'); }
    } else if (phase === 'final_back') {
      // 콰앙 — 살짝 뒤로(오른쪽) 물러났다가
      const k = smooth(phaseTime / C.final.backSeconds);
      boss.x = lerp(returnFrom.x, C.final.back[0], k); boss.y = lerp(returnFrom.y, C.final.back[1], k); boss.lie = k;
      if (phaseTime >= C.final.backSeconds) { dash = { vx: 0, vy: 0 }; popT = 0; change('final_dash'); }
    } else if (phase === 'final_dash') {
      // 천천히, 요플래가 점프해도 그 자리로 따라온다 — 두 두 두 둥 폭죽
      const tx = p.x + 20, ty = p.y - 16, dx = tx - boss.x, dy = ty - boss.y, d = Math.hypot(dx, dy) || 1;
      dash.vx = lerp(dash.vx, dx / d * C.final.speed, Math.min(1, dt * C.final.homing)); dash.vy = lerp(dash.vy, dy / d * C.final.speed, Math.min(1, dt * C.final.homing));
      boss.x += dash.vx * dt; boss.y += dash.vy * dt; boss.lie = 1; boss.aura = 4.2;
      for (let i = 0; i < 2; i++) { const a = run.rnd() * Math.PI * 2, r = 20 + run.rnd() * 30; run.particles.push({ x: boss.x + Math.cos(a) * r, y: boss.y + Math.sin(a) * r * 0.6, vx: 60 + run.rnd() * 60, vy: -20 - run.rnd() * 40, t: 0, life: 0.55, s: 3, color: run.rnd() < 0.5 ? '#a851ff' : '#2a0e48', g: -20 }); }
      firework(dt);
      popT += dt;
      if (popT >= C.final.pop) {
        popT = 0; const big = Math.floor(phaseTime / C.final.pop) % 4 === 3;
        sfx(big ? 'popBig' : 'pop', big ? 0.8 : 0.6); g.shake = { time: 0.12, amp: big ? 4 : 2 };
        run.burst(boss.x + 30 + run.rnd() * 40, boss.y + (run.rnd() - 0.5) * 60, big ? 40 : 22, { speed: big ? 190 : 130, life: 0.7 });
        run.burst(boss.x + 60 + run.rnd() * 50, boss.y + (run.rnd() - 0.5) * 70, 14, { rainbow: false, speed: 90, life: 0.5 });
      }
      if (d <= C.final.clashDist) { change('clash_wait'); sfx(C.sfx.clash, 0.8); }
    } else if (phase === 'clash_wait') {
      // 맞붙기 직전 — 거의 멈춘 시간, C 로 맞받아친다
      if (keys.attack) {
        change('lock'); sfx(C.sfx.counter, 1.0); sfx(C.sfx.counterHit, 0.9); g.shake = { time: 0.5, amp: 7 };
        run.frozen = true; run.core.airY = 0; run.core.attack = null; run.pose = 0; lock.gauge = 0;
        lockFrom = { px: run.x, bx: boss.x, by: boss.y };
        run.burst(boss.x - 24, boss.y, 60, { speed: 230, life: 0.8 });
      }
    } else if (phase === 'lock') {
      // 칼 경합: 가운데로 모여 맞붙은 채 불꽃·잔상. C 연타(소리 없음)로 게이지 — 누를 때마다 둘 다 흔들림
      const k = smooth(phaseTime / 0.35);
      run.pxOverride = lerp(lockFrom.px, C.lock.playerX, k);
      boss.x = lerp(lockFrom.bx, C.lock.playerX + C.lock.gap, k); boss.y = lerp(lockFrom.by, run.groundY - 22, k); boss.lie = 1; boss.aura = 2.4;
      lock.whine = (lock.whine ?? 0) - dt;
      // 참고 영상(lX0SKoUXI5Y 6:29~) 경합 위이이잉 4.7초 — 4.2초마다 겹쳐 끊기지 않게
      if (lock.whine <= 0) { lock.whine = 4.2; sfx(C.sfx.lockWhine, 0.75); }
      if (keys.attack) { lock.gauge = Math.min(1, lock.gauge + 1 / C.lock.presses); run.jolt = C.lock.shake; boss.shake = C.lock.shake; run.pose = run.pose === 0 ? 1 : 0; }
      if (lock.gauge < 1) lock.gauge = Math.max(0, lock.gauge - C.lock.decay * dt);
      if (run.rnd() < 0.7) { const a = run.rnd() * Math.PI * 2, v = 120 + run.rnd() * 160; run.particles.push({ x: C.lock.playerX + C.lock.gap * 0.5, y: run.groundY - 24, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, t: 0, life: 0.35, s: 2, color: run.rnd() < 0.5 ? '#ffffff' : '#fff2a0', g: 300 }); }
      if (lock.gauge >= 1) {
        change('release');
        // 더 큰 릴리즈샷
        sfx(C.sfx.counter, 1.0); sfx(C.sfx.burst, 1.0); sfx(C.sfx.popBig, 0.9); sfx(C.sfx.clash, 0.8);
        g.shake = { time: 0.8, amp: 9 }; run.flash = 0.4; run.flashColor = '255,255,255';
      }
    } else if (phase === 'release') {
      // 화면이 하얘지며 그림자만 → 거대한 검기 그림자와 함께 슬로우모션으로 화악
      run.shade = Math.min(1, phaseTime / C.release.white);
      if (phaseTime >= C.release.white) { change('slash'); run.slashK = 0; run.pose = 2; sfx(C.sfx.airslash, 0.9); }
    } else if (phase === 'slash') {
      const k = Math.min(1, phaseTime / C.release.slash), e = 1 - (1 - k) ** 3;
      run.slashK = k; run.shade = 1;
      run.pxOverride = lerp(C.lock.playerX, C.release.endPlayerX, e); run.poseFlip = true; run.pose = k > 0.6 ? 3 : 2;
      boss.x = lerp(C.lock.playerX + C.lock.gap, C.release.bossTo[0], e); boss.y = lerp(run.groundY - 22, C.release.bossTo[1], e); boss.lie = 1 - e; boss.aura = 2;
      // 벤 순간에 남은 한 칸 — 전투는 이긴 것으로 끝난다(흰 그림자 화면 그대로 필드 연출이 이어받는다)
      if (k >= 1) { run.slashK = -1; battle.hitEnemy(enemy, null, 1, { source: 'gajaeman_counter', sound: false }); change('finish'); }
    } else if (phase === 'finish') {
      // 흰 그림자 화면을 잠깐 유지(적 퇴장 처리가 끝날 때까지) — 필드 연출이 같은 그림에서 이어받는다
      if (phaseTime >= 1.4) change('done');
    }
    // 검: 날아와 땅을 스치며 요플래 쪽으로
    const s = slashBox();
    for (const sw of swords) {
      sw.t += dt;
      if (sw.straight && sw.back > 0) {
        sw.back -= dt; sw.vx *= 0.9; sw.vy *= 0.9;
        if (sw.back <= 0) { const p = player(), tx = p.x, ty = run.groundY - 16, dx = tx - sw.x, dy = ty - sw.y, d = Math.hypot(dx, dy) || 1; sw.vx = dx / d * C.sword.line; sw.vy = dy / d * C.sword.line; sw.ang = Math.atan2(dy, dx); sfx(C.sfx.swordFly, 0.8); }
      } else if (sw.straight && sw.y >= run.groundY - C.sword.aimHeight) { sw.vy = 0; sw.y = run.groundY - C.sword.aimHeight; sw.ang = Math.PI; }
      if (!sw.landed && sw.y >= run.groundY - C.sword.aimHeight) { sw.landed = true; sw.vy = 0; sw.y = run.groundY - C.sword.aimHeight; sw.vx = -C.sword.speed; sw.ang = Math.PI; }
      sw.x += sw.vx * dt; sw.y += sw.vy * dt;
      if (sw.dead) continue;
      if (s && overlap(sw.x, sw.y, C.sword.halfW, C.sword.halfH, ...s)) { sw.dead = true; sw.flyV = [260, -320]; sfx(C.sfx.swordHit, 0.9); sfx(C.sfx.counter, 0.6); run.burst(sw.x, sw.y, 12, { speed: 110, life: 0.45 });
        for (let i = 0; i < 16; i++) { const a = run.rnd() * Math.PI * 2, v = 120 + run.rnd() * 180; run.particles.push({ x: sw.x, y: sw.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, t: 0, life: 0.3, s: 2, color: i % 3 ? '#fff2a0' : '#ffffff', g: 420 }); }
        run.flash = 0.1; run.flashColor = '255,248,255'; g.shake = { time: 0.14, amp: 3 }; }
      else if (overlap(sw.x, sw.y, C.sword.halfW, C.sword.halfH, ...bodyBox())) { sw.dead = true; sw.gone = true; hurt(); }
    }
    for (const sw of swords) if (sw.flyV) { sw.x += sw.flyV[0] * dt; sw.y += sw.flyV[1] * dt; sw.flyV[1] += 900 * dt; sw.ang += 18 * dt; }
    swords = swords.filter(sw => !sw.gone && sw.x > -80 && sw.y < 400);
  }
  /** 경합: 가재맨 무지개 잔상(색이 돌며 흔들림), 요플래 뒤 짙은 푸른 잔상, 맞닿은 곳에서 뻗는 흰 불꽃 쐐기 */
  function drawLock(ctx) {
    const sp = run.bossSprite(), img = sp?.down?.[0];
    if (img) {
      const s = 1.43 * C.boss.scale / sp.px, dw = Math.round(sp.fw * s), dh = Math.round(sp.fh * s);
      for (let i = 4; i >= 1; i--) {
        const c = C.rainbow[(i + Math.floor(elapsed * 10)) % C.rainbow.length], tint = run.backlight.tinted(img, c, `lk${i}`);
        ctx.save(); ctx.globalAlpha = 0.5 - i * 0.08; ctx.translate(Math.round(boss.x + i * 9 + Math.sin(elapsed * 30 + i) * 2), Math.round(boss.y - i)); ctx.rotate(-Math.PI / 2);
        ctx.drawImage(tint, -dw / 2, -dh / 2, dw, dh); ctx.restore();
      }
    }
    ctx.save();
    for (let i = 1; i <= 3; i++) { ctx.globalAlpha = 0.28 - i * 0.06; ctx.translate(-10, 0); run.paintPlayer(ctx, { trail: false }); }
    ctx.restore();
    const cx = C.lock.playerX + C.lock.gap * 0.45, cy = run.groundY - 24, f = Math.floor(elapsed * 14);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 5; i++) {
      const a = (f * 2.3 + i * 1.26) % (Math.PI * 2), L = 60 + ((i * 37 + f * 13) % 70), w = 3 + (i % 2) * 2;
      ctx.globalAlpha = 0.75; ctx.fillStyle = '#ffffff'; ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a + Math.PI / 2) * w, cy + Math.sin(a + Math.PI / 2) * w); ctx.lineTo(cx + Math.cos(a) * L, cy + Math.sin(a) * L);
      ctx.lineTo(cx - Math.cos(a + Math.PI / 2) * w, cy - Math.sin(a + Math.PI / 2) * w); ctx.lineTo(cx - Math.cos(a) * L * 0.8, cy - Math.sin(a) * L * 0.8);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    glow(ctx, cx, cy, 60, 'rgba(255,240,200,A)', 0.5);
  }
  /** 연타 게이지(오른쪽 아래, 무지개로 찬다) */
  function drawGauge(ctx) {
    const x = 316, y = 286, w = 140, h = 14, blink = Math.floor(elapsed * 6) % 2;
    ctx.save();
    ctx.fillStyle = 'rgba(10,6,20,0.85)'; ctx.fillRect(x - 44, y - 3, w + 48, h + 6);
    ctx.font = FONT.replace(/^\d+px/, '12px'); ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    ctx.fillStyle = blink ? '#ffe45a' : '#ffffff'; ctx.fillText('C 연타', x - 40, y + h / 2);
    ctx.fillStyle = '#20182c'; ctx.fillRect(x, y, w, h);
    const grad = ctx.createLinearGradient(x, 0, x + w, 0); C.rainbow.forEach((c, i) => grad.addColorStop(i / (C.rainbow.length - 1), c));
    ctx.fillStyle = grad; ctx.fillRect(x, y, Math.round(w * lock.gauge), h);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 1, y - 1, w + 2, 1); ctx.fillRect(x - 1, y + h, w + 2, 1); ctx.fillRect(x - 1, y, 1, h); ctx.fillRect(x + w, y, 1, h);
    ctx.restore();
  }
  function drawSword(ctx, sw) {
    const img = g.propImages?.['assets/props/cathedral323_sword.png']; if (!img) return;
    ctx.save(); ctx.translate(Math.round(sw.x), Math.round(sw.y));
    // 그림은 칼끝이 아래 → 진행 방향으로
    ctx.rotate(sw.ang - Math.PI / 2);
    const w = C.sword.w * C.sword.draw, h = C.sword.h * C.sword.draw, rim = run.backlight.tinted(img, 'rgba(230,204,255,1)', 'swordrim');
    // 칼 모양 그대로의 밝은 테두리(사각형 없이)
    ctx.globalAlpha = 0.8; for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) ctx.drawImage(rim, -w / 2 + dx, -h / 2 + dy, w, h);
    ctx.globalAlpha = 1; ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
  }
  return {
    fullscreen: true, hpStrip: false, preserveFinalFrame: true,
    get hudAlpha() { return 1; },
    get snapshot() { return { phase, phaseTime, counters, hp: enemy.hp, boss: { ...boss }, swords: swords.length, gauge: lock.gauge, swordList: swords.filter(w => !w.dead).map(w => ({ x: Math.round(w.x), y: Math.round(w.y), landed: w.landed })), invuln, player: player(), airY: run.core.airY }; },
    update(dt, input) {
      if (disposed || phase === 'done') return true;
      const keys = { jump: input.just('cancel'), attack: input.just('confirm') };
      for (let remaining = Math.max(0, dt); remaining > 1e-9 && !disposed && phase !== 'done';) {
        const part = Math.min(remaining, 1 / 120); tick(part, keys); keys.jump = false; keys.attack = false; remaining -= part;
      }
      return disposed || phase === 'done';
    },
    draw(ctx) {
      ctx.save();
      const zk = phase === 'lock' ? smooth(phaseTime / 0.5) : 0, zoom = 1 + (C.lock.zoom - 1) * zk;
      const zx = C.lock.playerX + C.lock.gap * 0.45, zy = run.groundY - 24;
      ctx.save();
      if (zoom > 1) { ctx.translate(zx, zy); ctx.scale(zoom, zoom); ctx.translate(-zx + (240 - zx) * zk / zoom, -zy + (200 - zy) * zk / zoom); }
      run.drawBackground(ctx);
      if (phase === 'swords' && phaseTime < C.sword.warn) {
        // 예고: 가재맨 손에 검이 번쩍
        const k = phaseTime / C.sword.warn;
        // 예고: 가재맨 옆에 검이 번쩍(검 그림 + 빛무리)
        glow(ctx, boss.x - 28, boss.y - 20, 22, 'rgba(240,220,255,A)', 0.5 + 0.4 * Math.sin(k * 20));
        drawSword(ctx, { x: boss.x - 28, y: boss.y - 20, ang: Math.PI / 2 });
      }
      if (phase === 'lock') drawLock(ctx);
      run.drawBoss(ctx);
      for (const sw of swords) drawSword(ctx, sw);
      run.drawPlayer(ctx, { blink: invuln > 0 && Math.floor(invuln * 16) % 2 === 1 });
      run.drawBacklight(ctx);
      const p = player();
      battle.heart(ctx, Math.round(p.x + 2), Math.round(p.y - C.player.heartHeight));
      run.drawParticles(ctx);
      ctx.restore();
      if (hurtFlash > 0) { ctx.fillStyle = `rgba(220,15,40,${hurtFlash})`; ctx.fillRect(0, 0, 480, 360); }
      if (phase === 'clash_wait') {
        const blink = Math.floor(elapsed * 4) % 2;
        ctx.font = FONT.replace(/^\d+px/, '24px'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = blink ? '#ffe45a' : '#ffffff'; ctx.fillText(C.text.press, Math.round((p.x + boss.x) / 2), Math.round(Math.min(p.y, boss.y) - 44));
      }
      run.drawShade(ctx);
      if (phase === 'lock') drawGauge(ctx);
      run.drawOverlay(ctx);
      // HUD: 가재맨 HP(쳐낸 횟수만큼 줄어든다) · 조작
      ctx.font = FONT.replace(/^\d+px/, '12px'); ctx.textBaseline = 'top'; ctx.textAlign = 'left'; ctx.fillStyle = '#fff';
      ctx.fillText(`${C.text.title}  ${shown()}/${hpMax}`, 18, 22);
      ctx.fillStyle = '#100817'; ctx.fillRect(18, 40, 132, 7);
      ctx.fillStyle = '#bb76ff'; ctx.fillRect(18, 40, Math.round(132 * hpDisplay / hpMax), 7);
      ctx.strokeStyle = '#e9def4'; ctx.lineWidth = 1; ctx.strokeRect(17.5, 39.5, 133, 8);
      ctx.textAlign = 'right'; ctx.fillStyle = '#fff'; ctx.fillText(C.text.controls, 462, 22);
      ctx.restore();
    },
    dispose() { if (disposed) return; disposed = true; swords = []; },
  };
}
