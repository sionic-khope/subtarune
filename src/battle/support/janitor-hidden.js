// 청소부 히든 보스 지원 모듈(BUILD468): 거슨전 원본 효과음을 전투가 열릴 때 미리 받는다. 패턴 차례·피해·승패는 기본 전투 규칙 그대로.
//   BUILD469: 아이템을 쓰면 청소부도 따라서 '!' → 깃발 들고 HP +10 → 껄껄(웃음 그림). 패턴 설정 laugh: true 인 턴은 말풍선이 뜨는 동안 웃음 그림·웃음소리
import { JANITOR_HIDDEN as C, janitorItemHeal } from '../../data/janitor-hidden.js';
import { drawEmote } from '../../world/world.js';

export function createJanitorHiddenSupport(battle) {
  if (!battle.enemies.some(enemy => enemy.def.support === 'janitor_hidden')) return null;
  const R = C.itemReaction;
  const boss = () => battle.enemies.find(enemy => enemy.def.support === 'janitor_hidden');
  // reaction: 진행 중인 아이템 반응 { t, cued } — 자세는 poseFor, '!' 는 반응 gimmick 의 draw
  let reaction = null, laughed = false;
  const reactionPose = () => {
    const t = reaction.t - R.delay;
    if (t < R.notice) return null;
    return t < R.notice + R.raise ? { sheet: 'attack', frame: R.raiseFrame } : { sheet: 'laugh', frame: 0 };
  };
  return {
    load() {
      return battle.game.sound.loadSfxFiles?.(['gerson_boost', 'gerson_explosion_firework', 'gerson_eye_telegraph', 'gerson_fall', 'gerson_gerlaugh_clear', 'gerson_glassbreak',
        'gerson_metal_hit_reverb', 'gerson_motor_swing_down', 'gerson_motor_upper_quick_mid', 'gerson_parry_fast_nodelay', 'gerson_queen_punched_lower',
        'gerson_queen_punched_lower_heavy', 'gerson_rocket', 'gerson_screenshake', 'gerson_smallswing', 'gerson_stardrop', 'impact', 'jump', 'rudebuster_swing',
        'rudebuster_hit', 'laugh_janitor', 'heal']);
    },
    reset() { reaction = null; laughed = false; },
    afterEnemyPhase() { return null; },
    get reaction() { return reaction ? { t: reaction.t, pose: reactionPose() } : null; },
    poseFor(enemy) {
      if (enemy !== boss()) return null;
      if (reaction) return reactionPose();
      if (battle.state === 'enemy-prep' && battle.turnConfig?.laugh) return { sheet: 'laugh', frame: 0 };
      return null;
    },
    update() {
      if (battle.state !== 'enemy-prep') { laughed = false; return; }
      if (!laughed && battle.turnConfig?.laugh) { laughed = true; battle.sfx(C.laughSfx, { volume: 0.7 }); }
    },
    /** 아이템 행동이 끝나면 청소부도 따라서 회복한다(battle.js 아이템 행동 뒤에 이어지는 연출) */
    afterItem() {
      const enemy = boss();
      if (!enemy || enemy.dead || enemy.dying > 0 || enemy.hp <= 0) return null;
      const current = { t: 0, cued: {} };
      reaction = current;
      const cue = (name, at, fn) => { if (!current.cued[name] && current.t >= R.delay + at) { current.cued[name] = true; fn(); } };
      return {
        update(dt) {
          current.t += dt;
          cue('notice', 0, () => battle.sfx(R.sounds.notice));
          cue('raise', R.notice, () => {
            battle.sfx(R.sounds.raise, { volume: 0.6 });
            const healed = janitorItemHeal(enemy);
            if (healed > 0) { enemy.hp += healed; enemy.popup = { t: 0, text: `+${healed}`, color: '#7cff7c' }; battle.sparkle({ home: [enemy.x, enemy.y - 24] }, 14, true); }
            battle.sfx(R.sounds.heal);
          });
          cue('laugh', R.notice + R.raise, () => battle.sfx(R.sounds.laugh, { volume: 0.7 }));
          if (current.t < R.delay + R.notice + R.raise + R.laugh) return false;
          if (reaction === current) reaction = null;
          return true;
        },
        draw(ctx) {
          battle.drawPanel(ctx);
          const t = current.t - R.delay;
          if (t >= 0 && t < R.notice) drawEmote(ctx, { kind: '!', t }, enemy.x, enemy.y - R.headOffset);
        },
        dispose() { if (reaction === current) reaction = null; },
      };
    },
  };
}
