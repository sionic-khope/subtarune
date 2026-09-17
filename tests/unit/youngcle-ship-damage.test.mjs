// 조종실 전투 지원 모듈: 탄에 맞을 때마다 적 공격력 +10(사용자 2026-09-17), 재도전(reset)이면 처음부터. 방심 뒤 둘째 적 턴은 공격을 안 했어도 피날레.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createYoungcleShipSupport } from '../../src/battle/support/youngcle-ship.js';
import { YOUNGCLE_BATTLE } from '../../src/data/youngcle-battle.js';

const fixture = () => {
  const yc = { id: 'youngcle_hover', def: { support: 'youngcle_ship', untargetable: false, damage: 14 }, hp: 10, patternPose: null };
  const battle = { enemies: [yc], members: [], alive: () => [], setText() {}, showLine() {}, sfx() {} };
  return { battle, yc, support: createYoungcleShipSupport(battle) };
};

test('party damage climbs by damageStep per hit and resets with the battle', () => {
  const { support } = fixture();
  assert.equal(support.partyDamage(14), 14);
  support.onPartyHurt(14);
  assert.equal(support.partyDamage(14), 14 + YOUNGCLE_BATTLE.damageStep);
  support.onPartyHurt(24);
  assert.equal(support.partyDamage(12), 12 + 2 * YOUNGCLE_BATTLE.damageStep);
  support.reset();
  assert.equal(support.partyDamage(14), 14);
});

test('distraction: first enemy turn is skipped, the next one is the finale even without attacks', () => {
  const { support } = fixture();
  support.setDistracted(true);
  assert.equal(support.enemyModeFor(), 'youngcle_skip');
  assert.equal(support.enemyModeFor(), 'youngcle_finale');
  assert.equal(support.distracted, false);
  assert.equal(support.finalePending, true);
});
