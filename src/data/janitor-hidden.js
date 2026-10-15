// 청소부 히든 보스 전투 설정(BUILD469). 탄막 패턴 값은 src/battle/janitor-patterns.js, 연출은 src/battle/support/janitor-hidden.js
export const JANITOR_HIDDEN = Object.freeze({
  // 아이템 반응(사용자 “아이템을 먹으면 청소부도 따라서 느낌표 하고 깃발올려서 체력 10 회복한다음에 껄껄 웃는거”)
  //   delay(아이템 회복 숫자를 먼저 본다) → '!'(notice 초) → 깃발 들기·회복(raise 초) → 웃음(laugh 초)
  itemReaction: Object.freeze({
    delay: 0.35, notice: 0.55, raise: 0.8, laugh: 1.35, heal: 10, headOffset: 50,
    // 깃발을 머리 위로 든 공격 시트 칸
    raiseFrame: 2,
    sounds: Object.freeze({ notice: 'chime', raise: 'gerson_smallswing', heal: 'heal', laugh: 'laugh_janitor' }),
  }),
  // 패턴 설정 laugh: true 인 턴은 말풍선이 뜨는 동안 웃음 그림 + 웃음소리(사용자 “멸공하고 웃을때 웃음스프라이트가 안나와”)
  laughSfx: 'laugh_janitor',
});

/** 아이템 반응 회복량: 최대 HP 를 넘지 않는다. 쓰러졌거나 쓰러지는 중이면 0 */
export function janitorItemHeal(enemy, amount = JANITOR_HIDDEN.itemReaction.heal) {
  if (!enemy || enemy.dead || enemy.dying > 0 || enemy.hp <= 0) return 0;
  return Math.max(0, Math.min(amount, enemy.maxHp - enemy.hp));
}
