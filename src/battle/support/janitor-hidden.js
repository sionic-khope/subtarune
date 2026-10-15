// 청소부 히든 보스 지원 모듈(BUILD468): 거슨전 원본 효과음을 전투가 열릴 때 미리 받는다. 패턴 차례·피해·승패는 기본 전투 규칙 그대로.
export function createJanitorHiddenSupport(battle) {
  if (!battle.enemies.some(enemy => enemy.def.support === 'janitor_hidden')) return null;
  return {
    load() {
      return battle.game.sound.loadSfxFiles?.(['gerson_boost', 'gerson_explosion_firework', 'gerson_eye_telegraph', 'gerson_fall', 'gerson_gerlaugh_clear', 'gerson_glassbreak',
        'gerson_metal_hit_reverb', 'gerson_motor_swing_down', 'gerson_motor_upper_quick_mid', 'gerson_parry_fast_nodelay', 'gerson_queen_punched_lower',
        'gerson_queen_punched_lower_heavy', 'gerson_rocket', 'gerson_screenshake', 'gerson_smallswing', 'gerson_stardrop', 'impact', 'jump', 'rudebuster_swing', 'laugh_janitor']);
    },
    reset() {},
    afterEnemyPhase() { return null; },
  };
}
