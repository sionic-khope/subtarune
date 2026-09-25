import { TEEN_BATTLE as C } from '../../data/teen-battle.js';
import { createTalk } from './talk.js';
import { clearTeenTimers } from '../teen-patterns.js';

/**
 * BUILD339 청소년 보스전 지원 모듈(사용자 2026-09-25 브리핑). 공격하기는 잠겨 있고(X), 방어하기로 버티며 잔해를 피해 청소 용량을
 * 채운다 → 100% 면 과부하로 쓰러져 3턴 동안 공격 가능, 그동안 가재맨이 내려와 공격한다. 주먹 패턴은 무피격이면 낙석 50.
 */
export function createTeenBossSupport(battle) {
  const enemy = battle.enemies.find(e => e.def.support === 'teen_boss');
  if (!enemy) return null;
  let phase = 'guard', gauge = 0, turn = 0, downLeft = 0, gjIdx = 0, defending = false, time = 0;
  let defendImages = {}, gajaeman = null, gj = { y: -80, target: -80 };
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
      await battle.game.sound.loadSfxFiles?.(['gajaeman_knee', 'gajaeman_kick', 'knight_cut', 'spearappear', 'heavyswing', 'furnace_blast', 'baron_slam', 'impact', 'power', 'laser_charge', 'weaponpull', 'thud', 'rumble']);
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
    /** 상자는 조금 오른쪽(왼쪽 파티와 겹치지 않게) */
    get boardCenter() { return [274, 214]; },
    action(id) {
      if (id !== 'defend') return null;
      defending = true;
      return { type: 'skip', member: battle.members[battle.memberIdx] };
    },
    idleFor() { return phase === 'down' ? C.idle.down : C.idle.guard; },
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
      return [{ type: turn % C.slamEvery === 0 ? 'teen_slam' : 'teen_vacuum', damage: 15 }];
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
    /** Right-side gauge: 청소 용량. */
    drawOverlay(ctx) {
      if (battle.state === 'load' || battle.state === 'win') return;
      const x = 452, y = 70, w = 12, h = 150, k = gauge / C.gauge.max;
      ctx.save();
      ctx.fillStyle = '#000'; ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.strokeRect(x - 1.5, y - 1.5, w + 3, h + 3);
      ctx.fillStyle = phase === 'down' ? '#ffe066' : '#6fe3ff'; ctx.fillRect(x, y + Math.round(h * (1 - k)), w, Math.round(h * k));
      ctx.font = '9px "Galmuri9", monospace'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff';
      ctx.fillText(`${Math.round(gauge)}%`, x + w / 2, y + h + 12);
      ctx.save(); ctx.translate(x + w / 2, y - 8); ctx.fillText(C.labels.gauge, 0, 0); ctx.restore();
      ctx.restore();
    },
    dispose() { clearTeenTimers(); },
  };
  return self;
}
