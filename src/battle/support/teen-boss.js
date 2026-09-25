import { TEEN_BATTLE as C } from '../../data/teen-battle.js';
import { createTalk } from './talk.js';
import { clearTeenTimers, TEEN_DEBRIS } from '../teen-patterns.js';
import { SummitSmoke } from '../../scenes/summit-smoke.js';

/**
 * BUILD339 청소년 보스전 지원 모듈(사용자 2026-09-25 브리핑). 공격하기는 잠겨 있고(X), 방어하기로 버티며 잔해를 피해 청소 용량을
 * 채운다 → 100% 면 과부하로 쓰러져 3턴 동안 공격 가능, 그동안 가재맨이 내려와 공격한다. 주먹 패턴은 무피격이면 낙석 50.
 * BUILD342: 필드 대치와 같은 한 화면(TEEN_BATTLE.view) — 일행은 끝길 위 같은 발 자리, 청소년은 같은 그림·같은 자리, 연기가 아래를 덮는다.
 */
export function createTeenBossSupport(battle) {
  const enemy = battle.enemies.find(e => e.def.support === 'teen_boss');
  if (!enemy) return null;
  const V = C.view, CF = C.collapse, GF = C.gajaemanFly;
  let phase = 'guard', gauge = 0, turn = 0, downLeft = 0, gjIdx = 0, defending = false, time = 0, gaugeA = 0;
  let defendImages = {}, gajaeman = null, images = {}, vac = null, nextType = null;
  // 가재맨: 어깨 위(perch) → 쓰러지면 천천히 내려와 쓰러진 몸 뒤에서 맴돈다(hover) → 일어나면 다시 어깨로
  let gj = { mode: 'perch', t: 0, from: [...V.shoulder] };
  // 쓰러짐(collapse)·일어남(rise) 연출 시간
  let fall = null, vacTurns = 0, motes = [];
  const live = () => !enemy.dead && enemy.hp > 0 && !(enemy.dying > 0);
  // 필드에서 이어진 연기(같은 장면이면 그대로 이어 받는다)
  const smoke = battle.game.castleSummit?.smoke || new SummitSmoke();
  const homes = new Map();
  for (const m of battle.members) if (V.party[m.id]) { homes.set(m, [...m.home]); m.home = [...V.party[m.id]]; }
  const hoverAt = t => [V.hover[0] + Math.cos(t * GF.speed) * GF.radius[0], V.hover[1] + Math.sin(t * GF.speed * 2) * GF.radius[1]];
  const gjPos = () => {
    if (gj.mode === 'perch') return V.shoulder;
    if (gj.mode === 'back' && gj.t >= GF.descend) return V.shoulder;
    const k = Math.min(1, gj.t / GF.descend), e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
    const to = gj.mode === 'hover' ? hoverAt(time) : V.shoulder;
    return [gj.from[0] + (to[0] - gj.from[0]) * e, gj.from[1] + (to[1] - gj.from[1]) * e - Math.sin(k * Math.PI) * 12];
  };
  const flyTo = mode => { gj = { mode, t: 0, from: gjPos() }; };
  const self = {
    get phase() { return phase; },
    get gauge() { return gauge; },
    get smoke() { return smoke; },
    get snapshot() { return { phase, gauge: Math.round(gauge), downLeft, defending, turn, fall: fall?.kind || null, gaugeAlpha: +gaugeA.toFixed(2), gajaeman: gj.mode }; },
    async load(loadImage) {
      const ids = battle.members.map(m => m.id);
      const imgs = await Promise.all(ids.map(id => loadImage(C.images.defend(id)).catch(() => null)));
      defendImages = Object.fromEntries(ids.map((id, i) => [id, imgs[i]]));
      gajaeman = await loadImage(C.images.gajaeman).catch(() => null);
      for (const src of [V.giant.image, V.down.image]) images[src] = await loadImage(src).catch(() => null);
      // 배경(끝길 그림)은 필드에서 이미 읽었지만, QA 로 전투부터 열 때도 같은 화면이 되게
      const props = battle.game.propImages || (battle.game.propImages = {});
      for (let i = 0; i < 2; i++) { const src = `assets/props/summit336_chunk_${i}.png`; if (!props[src]) props[src] = await loadImage(src).catch(() => null); }
      const debris = await Promise.all(TEEN_DEBRIS.map(src => loadImage(src).catch(() => null)));
      globalThis.__teenImages = Object.fromEntries(TEEN_DEBRIS.map((src, i) => [src, debris[i]]));
      await battle.game.sound.loadSfxFiles?.(['gajaeman_knee', 'gajaeman_kick', 'knight_cut', 'spearappear', 'heavyswing', 'furnace_blast', 'baron_slam', 'impact', 'power', 'laser_charge', 'weaponpull', 'thud', 'rumble', 'teen_vacuum', 'baron_roar']);
    },
    reset() { phase = 'guard'; gauge = 0; turn = 0; downLeft = 0; gjIdx = 0; defending = false; gj = { mode: 'perch', t: 0, from: [...V.shoulder] }; fall = null; clearTeenTimers(); enemy.patternPose = null; },
    buttons() {
      return [
        { label: C.labels.fight, kind: 'fight', enabled: phase === 'down' },
        { label: C.labels.item, kind: 'item', enabled: true },
        { label: C.labels.defend, kind: 'support', id: 'defend', enabled: true },
      ];
    },
    get hint() { return ''; },
    onVacuum(on, seconds) { vac = on ? { t: 0, d: seconds } : null; },
    /** 이번(또는 곧 올) 적 턴이 청소기인가: 준비 단계 상자 크기는 patternsFor 전에 정해지므로 턴 번호로 미리 본다 */
    vacuumTurn() {
      if (phase !== 'guard') return false;
      const upcoming = battle.state === 'bullets' || battle.state === 'board-close' ? turn : turn + 1;
      return upcoming % C.slamEvery !== 0;
    },
    // 상자는 끝길 일행 오른쪽(겹치지 않게). 청소기는 손바닥 구멍(205,136) 오른쪽 아래로 넓게(사용자 “더 넓혀”)
    // BUILD343: 청소기는 손바닥 구멍(view.palm)이 상자 왼쪽 가운데, 게이지 패널(x 440)과 겹치지 않게
    get boardCenter() { return this.vacuumTurn() ? [352, 224] : [322, 214]; },
    boardSizeFor() { return this.vacuumTurn() ? [170, 140] : [220, 140]; },
    action(id) {
      if (id !== 'defend') return null;
      defending = true;
      return { type: 'skip', member: battle.members[battle.memberIdx] };
    },
    idleFor() { return [phase === 'down' ? C.idle.down : C.idle.guard[turn % C.idle.guard.length]]; },
    speechFor() { return ['...']; },
    /** 방어하기: 이번 적 턴 피해 −3 */
    adjustPartyDamage(member, dmg) { return defending ? Math.max(1, dmg - C.defend.reduce) : dmg; },
    /** 쓰러지기 전에는 공격이 통하지 않는다(버튼도 잠김). 낙석은 언제나 들어간다 */
    blocksDamage(target, source) { return target === enemy && phase !== 'down' && source !== 'teen_rock'; },
    patternsFor(target) {
      if (target !== enemy) return null;
      clearTeenTimers();
      if (phase === 'down') return [{ type: C.gajaemanPatterns[gjIdx++ % C.gajaemanPatterns.length], damage: 15 }];
      turn++;
      // 첫 공격 전에 한 번 크게 포효 — 계단 누누와 윌럼프 포효와 같은 소리(사용자 “우리가 쓰는 사운드, 바론”)
      if (turn === 1) { battle.sfx('baron_roar'); battle.game.shake = { time: 1.6, amp: 4 }; }
      nextType = turn % C.slamEvery === 0 ? 'teen_slam' : 'teen_vacuum';
      // 세 번째 청소부터 가재맨이 중간중간 검·무릎으로 방해(사용자 2026-09-25)
      if (nextType === 'teen_vacuum') vacTurns++;
      return [{ type: nextType, damage: 15, harass: nextType === 'teen_vacuum' && vacTurns >= 3 }];
    },
    onProjectile(p) {
      if (p?.type === 'teen_dodge' && phase === 'guard') gauge = Math.min(C.gauge.max, gauge + C.gauge.perDodge);
      if (p?.type === 'teen_rock' && live()) { battle.hitEnemy(enemy, null, C.rockDamage, { source: 'teen_rock' }); battle.game.shake = { time: 0.4, amp: 5 }; }
    },
    /** 쓰러진 청소년 앞(낮아진 몸)까지만 달려간다 */
    attackSpot(target) { return target === enemy && phase === 'down' ? C.downSpot : null; },
    memberImage(m) {
      if (!defending || !['bullets', 'board-open', 'board-close', 'enemy-prep', 'prep'].includes(battle.state)) return null;
      return defendImages[m.id] || null;
    },
    poseFor(target) {
      if (target !== enemy) return null;
      // 쓰러지는/일어나는 동안은 draw() 가 직접 그린다(기울기·가라앉음)
      if (fall) return { hidden: true };
      if (phase === 'down') return { sheet: 'down' };
      return target.patternPose || null;
    },
    update(dt) {
      if (vac) { vac.t += dt; if (vac.t > vac.d) vac = null; }
      time += dt; gj.t += dt;
      // 가재맨 둘레로 보라·검은 오오라 입자가 피어오른다
      if (Math.random() < 0.6) { const [x, y] = gjPos(), side = Math.random() * 2 - 1; motes.push({ x: x + side * 14, y: y - 6 - Math.random() * 26, vx: side * 10, vy: -(30 + Math.random() * 40), age: 0, life: 0.7 + Math.random() * 0.6, size: 2 + Math.floor(Math.random() * 2), purple: Math.random() < 0.55 }); }
      for (const m of motes) { m.age += dt; m.x += m.vx * dt; m.y += m.vy * dt; }
      motes = motes.filter(m => m.age < m.life);
      if (fall) { fall.t += dt; if (fall.kind === 'rise' && fall.t >= CF.rise) fall = null; }
      if (!battle.game.castleSummit) smoke.update(dt);
      const want = phase === 'guard' && this.vacuumTurn() && ['enemy-prep', 'bullets', 'board-close'].includes(battle.state) ? 1 : 0;
      gaugeA += (want - gaugeA) * Math.min(1, dt * 5);
    },
    afterEnemyPhase() {
      defending = false;
      if (!live()) return null;
      if (phase === 'guard' && gauge >= C.gauge.max) {
        // 과부하: 몇 초 동안 앞으로 기울며 무너져 끝길 쪽으로 엎어진다(애니처럼) → 정적 → 억빠맨
        phase = 'down'; downLeft = C.downTurns; fall = { kind: 'collapse', t: 0, landed: false };
        battle.sfx('baron_roar'); battle.sfx('rumble'); battle.game.shake = { time: CF.tilt, amp: 3 };
        let talk = null, hold = CF.hold;
        return {
          update: (dt, input) => {
            if (fall && !fall.landed && fall.t >= CF.tilt) { fall.landed = true; battle.game.shake = { time: 0.7, amp: 7 }; battle.sfx('baron_slam'); battle.sfx('impact'); flyTo('hover'); }
            if (fall && fall.t >= CF.tilt + CF.land) fall = null;
            if (fall) return false;
            if (!talk) { hold -= dt; if (hold > 0) return false; talk = createTalk(battle, [C.downLine]); }
            return talk.update(dt, input);
          },
          draw: ctx => { if (talk) battle.drawTextBox(ctx); },
        };
      }
      if (phase === 'down') {
        downLeft--;
        if (downLeft <= 0) { phase = 'guard'; gauge = 0; fall = { kind: 'rise', t: 0 }; flyTo('back'); battle.sfx('rumble'); }
      }
      return null;
    },
    /** Behind the 청소년: collapse/rise drawn by hand, and gajaeman hovering behind the fallen body. */
    draw(ctx) {
      const up = images[V.giant.image], down = images[V.down.image];
      // 가재맨: 평소·오갈 때 초반은 청소년 뒤(등에 가려 안 보인다), 날아 나와 떠 있을 때는 앞(drawOverEnemies)
      if (gajaeman && !this.gajaemanInFront()) this.drawGajaeman(ctx);
      if (fall && up && down) {
        const collapse = fall.kind === 'collapse';
        const k = collapse ? Math.min(1, fall.t / CF.tilt) : 1 - Math.min(1, fall.t / CF.rise), e = k * k;
        const land = collapse ? Math.min(1, Math.max(0, (fall.t - CF.tilt * 0.6) / (CF.land + CF.tilt * 0.4))) : 1 - Math.min(1, fall.t / (CF.rise * 0.6));
        // 선 자세: 아래 가운데를 축으로 앞(왼쪽)으로 기울며 가라앉는다 → 같은 자리의 숙인 자세로 겹쳐 바뀐다
        ctx.save(); ctx.globalAlpha *= 1 - land;
        const pvx = V.giant.x + up.width * 0.5, pvy = V.giant.y + up.height;
        ctx.translate(pvx, pvy + e * 40); ctx.rotate(-0.22 * e); ctx.drawImage(up, -up.width * 0.5, -up.height);
        ctx.restore();
        ctx.save(); ctx.globalAlpha *= land; ctx.drawImage(down, V.down.x, V.down.y + (1 - land) * -18); ctx.restore();
      }
    },
    gajaemanInFront() {
      const k = Math.min(1, gj.t / GF.descend);
      return gj.mode === 'hover' ? k > 0.35 : gj.mode === 'back' && k < 0.65;
    },
    drawGajaeman(ctx) {
      const [x, y] = gjPos(), s = V.gajaemanScale, bob = Math.round(Math.sin(time * 2.4) * 3);
      ctx.save();
      const glow = ctx.createRadialGradient(x, y - 30 * s, 0, x, y - 30 * s, 40 * s);
      glow.addColorStop(0, 'rgba(90,30,150,0.45)'); glow.addColorStop(1, 'rgba(20,6,40,0)');
      ctx.fillStyle = glow; ctx.fillRect(x - 40 * s, y - 70 * s, 80 * s, 80 * s);
      for (const m of motes) { ctx.globalAlpha = Math.max(0, 1 - m.age / m.life); ctx.fillStyle = m.purple ? '#6a34b0' : '#0a0612'; ctx.fillRect(Math.round(m.x), Math.round(m.y), m.size, m.size + 1); }
      ctx.globalAlpha = 1;
      ctx.drawImage(gajaeman, 0, 128, 64, 64, Math.round(x - 32 * s), Math.round(y - 61 * s + bob), Math.round(64 * s), Math.round(64 * s));
      ctx.restore();
    },
    /** Over the 청소년: smoke swallowing her lower body. */
    drawOverEnemies(ctx) {
      const [cx, cy] = V.cam;
      smoke.draw(ctx, { x: cx, y: cy }, 'front', 0.3);
      if (gajaeman && this.gajaemanInFront()) this.drawGajaeman(ctx);
    },
    /** Right-side gauge: 청소 용량 — only fades in during the cleaning pattern (사용자 “청소패턴일때만 페이드인”). */
    drawOverlay(ctx) {
      if (battle.state === 'load' || battle.state === 'win' || gaugeA < 0.02) return;
      const px = 440, py = 52, pw = 36, ph = 190, w = 12, x = px + (pw - w) / 2, y = py + 34, h = ph - 58, k = gauge / C.gauge.max;
      ctx.save(); ctx.globalAlpha *= gaugeA;
      ctx.fillStyle = 'rgba(0,0,0,0.92)'; ctx.fillRect(px, py, pw, ph);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.strokeRect(px + 0.5, py + 0.5, pw - 1, ph - 1);
      ctx.font = '9px "Galmuri9", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillStyle = '#fff';
      const [a1, a2] = [C.labels.gauge.slice(0, 2), C.labels.gauge.slice(-2)];
      ctx.fillText(a1, px + pw / 2, py + 5); ctx.fillText(a2, px + pw / 2, py + 17);
      ctx.strokeRect(x - 1.5, y - 1.5, w + 3, h + 3);
      ctx.fillStyle = '#b48cff'; ctx.fillRect(x, y + Math.round(h * (1 - k)), w, Math.round(h * k));
      ctx.fillStyle = '#fff'; ctx.fillText(`${Math.round(gauge)}%`, px + pw / 2, y + h + 6);
      ctx.restore();
    },
    dispose() { clearTeenTimers(); for (const [m, h] of homes) m.home = h; },
  };
  return self;
}
