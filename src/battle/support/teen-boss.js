import { TEEN_BATTLE as C } from '../../data/teen-battle.js';
import { createTalk } from './talk.js';
import { clearTeenTimers, TEEN_DEBRIS } from '../teen-patterns.js';

/**
 * BUILD339 청소년 보스전 지원 모듈(사용자 2026-09-25 브리핑). 공격하기는 잠겨 있고(X), 방어하기로 버티며 잔해를 피해 청소 용량을
 * 채운다 → 100% 면 과부하로 쓰러져 3턴 동안 공격 가능, 그동안 가재맨이 내려와 공격한다. 주먹 패턴은 무피격이면 낙석 50.
 */
export function createTeenBossSupport(battle) {
  const enemy = battle.enemies.find(e => e.def.support === 'teen_boss');
  if (!enemy) return null;
  let phase = 'guard', gauge = 0, turn = 0, downLeft = 0, gjIdx = 0, defending = false, time = 0;
  let defendImages = {}, gajaeman = null, gj = { y: -80, target: -80 }, palm = null, vac = null, nextType = null;
  const live = () => !enemy.dead && enemy.hp > 0 && !(enemy.dying > 0);
  const collapse = { t: 1 };
  const self = {
    get phase() { return phase; },
    get gauge() { return gauge; },
    get snapshot() { return { phase, gauge: Math.round(gauge), downLeft, defending, turn }; },
    async load(loadImage) {
      const ids = battle.members.map(m => m.id);
      const imgs = await Promise.all(ids.map(id => loadImage(C.images.defend(id)).catch(() => null)));
      defendImages = Object.fromEntries(ids.map((id, i) => [id, imgs[i]]));
      gajaeman = await loadImage(C.images.gajaeman).catch(() => null);
      palm = await loadImage('assets/props/teenboss339_palm.png').catch(() => null);
      const debris = await Promise.all(TEEN_DEBRIS.map(src => loadImage(src).catch(() => null)));
      globalThis.__teenImages = Object.fromEntries(TEEN_DEBRIS.map((src, i) => [src, debris[i]]));
      await battle.game.sound.loadSfxFiles?.(['gajaeman_knee', 'gajaeman_kick', 'knight_cut', 'spearappear', 'heavyswing', 'furnace_blast', 'baron_slam', 'impact', 'power', 'laser_charge', 'weaponpull', 'thud', 'rumble', 'teen_vacuum']);
    },
    reset() { phase = 'guard'; gauge = 0; turn = 0; downLeft = 0; gjIdx = 0; defending = false; gj = { y: -80, target: -80 }; clearTeenTimers(); enemy.patternPose = null; },
    buttons() {
      return [
        { label: C.labels.fight, kind: 'fight', enabled: phase === 'down' },
        { label: C.labels.item, kind: 'item', enabled: true },
        { label: C.labels.defend, kind: 'support', id: 'defend', enabled: true },
      ];
    },
    get hint() { return ''; },
    onVacuum(on, seconds) { vac = on ? { t: 0, d: seconds } : null; },
    /** 상자는 조금 오른쪽(왼쪽 파티와 겹치지 않게) */
    /** 이번(또는 곧 올) 적 턴이 청소기인가: 준비 단계 상자 크기는 patternsFor 전에 정해지므로 턴 번호로 미리 본다 */
    vacuumTurn() {
      if (phase !== 'guard') return false;
      const upcoming = battle.state === 'bullets' || battle.state === 'board-close' ? turn : turn + 1;
      return upcoming % C.slamEvery !== 0;
    },
    get boardCenter() { return this.vacuumTurn() ? [236, 214] : [274, 214]; },
    boardSizeFor() { return this.vacuumTurn() ? [160, 110] : null; },
    action(id) {
      if (id !== 'defend') return null;
      defending = true;
      return { type: 'skip', member: battle.members[battle.memberIdx] };
    },
    idleFor() { return phase === 'down' ? C.idle.down : C.idle.guard[turn % C.idle.guard.length]; },
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
      nextType = turn % C.slamEvery === 0 ? 'teen_slam' : 'teen_vacuum';
      return [{ type: nextType, damage: 15 }];
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
      if (target.patternPose) return target.patternPose;
      if (phase === 'down') return { sheet: 'all', frame: C.frames.down, scaleY: 1 - 0.01 * Math.sin(time * 1.4) };
      // 숨 쉬듯: 거의 움직이지 않고 가슴만 천천히 오르내린다
      const k = Math.sin(time * Math.PI * 2 / 3.4);
      return { sheet: 'all', frame: k > 0.55 ? C.frames.breathe : C.frames.idle, scaleY: 1 + 0.012 * k };
    },
    update(dt) {
      if (vac) { vac.t += dt; if (vac.t > vac.d) vac = null; }
      time += dt; collapse.t = Math.min(1, collapse.t + dt);
      gj.y += (gj.target - gj.y) * Math.min(1, dt * 2.2);
    },
    afterEnemyPhase() {
      defending = false;
      if (!live()) return null;
      if (phase === 'guard' && gauge >= C.gauge.max) {
        phase = 'down'; downLeft = C.downTurns; gj.target = 64; collapse.t = 0;
        battle.game.shake = { time: 0.6, amp: 5 }; battle.sfx('baron_slam');
        const talk = createTalk(battle, [C.downLine]);
        return { update: (dt, input) => talk.update(dt, input), draw: ctx => battle.drawTextBox(ctx) };
      }
      if (phase === 'down') {
        downLeft--;
        if (downLeft <= 0) { phase = 'guard'; gauge = 0; gj.target = -80; battle.sfx('rumble'); }
      }
      return null;
    },
    /** Behind the actors: gajaeman hovering beside the fallen 청소년 with a dark aura. */
    draw(ctx) {
      if (!gajaeman || gj.y < -60) return;
      const fw = 64, x = 300, y = Math.round(gj.y + Math.sin(time * 2.4) * 3), s = 1.6;
      ctx.save();
      ctx.fillStyle = 'rgba(40,12,70,0.35)'; ctx.beginPath(); ctx.ellipse(x, y + 36, 34, 12, 0, 0, Math.PI * 2); ctx.fill();
      ctx.drawImage(gajaeman, 0, 0, fw, fw, Math.round(x - fw * s / 2), Math.round(y - fw * s / 2), Math.round(fw * s), Math.round(fw * s));
      ctx.restore();
    },
    /** Behind the bullet box during the vacuum: the palm reaching in from the right and a violent triangular vortex funnel. */
    drawUnderBoard(ctx) {
      if (!vac || battle.state !== 'bullets') return;
      const b = battle.board, t = vac.t, k = Math.min(1, t / 0.5), hx = b.x + b.w + 70 + (1 - k) * 200, hy = b.y + b.h / 2;
      ctx.save();
      // 삼각형 소용돌이: 손바닥 구멍(꼭짓점)에서 왼쪽으로 벌어지는 깔때기, 소용돌이 줄이 빨려 든다
      const apexX = hx - 36, openX = b.x - 30, spread = b.h * 0.95;
      const g = ctx.createLinearGradient(openX, 0, apexX, 0);
      g.addColorStop(0, 'rgba(120,70,220,0.05)'); g.addColorStop(0.7, 'rgba(150,90,255,0.28)'); g.addColorStop(1, 'rgba(230,200,255,0.55)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(apexX, hy); ctx.lineTo(openX, hy - spread); ctx.lineTo(openX, hy + spread); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(apexX, hy); ctx.lineTo(openX, hy - spread); ctx.lineTo(openX, hy + spread); ctx.closePath(); ctx.clip();
      ctx.lineCap = 'round';
      for (let i = 0; i < 14; i++) {
        const ph = ((i / 14) + t * 1.4) % 1, x = openX + (apexX - openX) * ph, r = spread * (1 - ph);
        ctx.strokeStyle = `rgba(235,215,255,${0.25 + 0.6 * ph})`; ctx.lineWidth = 1 + 2.5 * ph;
        const a0 = t * 9 + i * 1.7;
        ctx.beginPath(); ctx.ellipse(x, hy, Math.max(2, r * 0.18), r, 0, a0, a0 + 2.2); ctx.stroke();
      }
      ctx.restore();
      if (palm) {
        const s = 0.85, w = palm.width * s, h = palm.height * s, shake = Math.sin(t * 60) * 1.5;
        ctx.drawImage(palm, Math.round(hx - w * 0.26 + shake), Math.round(hy - h * 0.52), Math.round(w), Math.round(h));
      }
    },
    /** Right-side gauge: 청소 용량. */
    drawOverlay(ctx) {
      if (battle.state === 'load' || battle.state === 'win') return;
      // 오른쪽 끝의 독립된 검은 패널(보스 그림 위에 겹쳐도 글자·막대가 잘리지 않게)
      const px = 440, py = 52, pw = 36, ph = 190, w = 12, x = px + (pw - w) / 2, y = py + 34, h = ph - 58, k = gauge / C.gauge.max;
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.92)'; ctx.fillRect(px, py, pw, ph);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.strokeRect(px + 0.5, py + 0.5, pw - 1, ph - 1);
      ctx.font = '9px "Galmuri9", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillStyle = '#fff';
      const [a1, a2] = [C.labels.gauge.slice(0, 2), C.labels.gauge.slice(-2)];
      ctx.fillText(a1, px + pw / 2, py + 5); ctx.fillText(a2, px + pw / 2, py + 17);
      ctx.strokeRect(x - 1.5, y - 1.5, w + 3, h + 3);
      ctx.fillStyle = phase === 'down' ? '#ffe066' : '#6fe3ff'; ctx.fillRect(x, y + Math.round(h * (1 - k)), w, Math.round(h * k));
      ctx.fillStyle = '#fff'; ctx.fillText(`${Math.round(gauge)}%`, px + pw / 2, y + h + 6);
      ctx.restore();
    },
    dispose() { clearTeenTimers(); },
  };
  return self;
}
