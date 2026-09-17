// 변신 영클 특별 패턴(BUILD216) 순수 로직 검사: 섭리오 게임(가짜 battle·입력)이 레이저 → 과부하 → 쓰러짐 → 창 명중 5타마다 1 피해(최대 10) → 일어남 순서로 돌고, 특별 순환·재판 데이터가 맞다.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSubrioGame } from '../../src/battle/modes/tvform-subrio.js';
import { createBallDuel } from '../../src/battle/modes/tvform-ball.js';
import { YOUNGCLE_TRIAL } from '../../src/battle/modes/tvform-special.js';
import { YOUNGCLE_SPECIAL as S } from '../../src/data/youngcle-special.js';

const fakeBattle = () => { const hits = []; const yc = { id: 'youngcle_tvform', hp: 200, x: 340, y: 246, def: { damage: 15 } }; let seed = 7; const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  return { yc, hits, hurt: [], sfx() {}, rnd, game: { shake: null, sound: {} }, members: [{ id: 'ppaman', home: [84, 224], action: null }], hitEnemy(e, by, dmg) { hits.push(dmg); e.hp -= dmg; return dmg; }, hurtParty(d) { this.hurt.push(d); }, board: { setTarget() {}, rect: { x: 120, y: 100, w: 240, h: 160 } }, setText() {}, showLine() {}, living() { return [yc]; } }; };
const makeInput = (state = {}) => ({ down: (k) => !!state[k], just: (k) => !!state['just:' + k] });

test('test_special_subrio_lasers_then_collapse_then_spear_hits_deal_damage', () => {
  const b = fakeBattle(); const g = createSubrioGame(b, b.yc, S.subrio); const idle = makeInput();
  const step = 1 / 60; let t = 0;
  while (g.snapshot.phase !== 'lasers' && t < 5) { g.update(step, idle); t += step; }
  assert.equal(g.snapshot.phase, 'lasers'); assert.equal(g.snapshot.yc.x, S.subrio.ycStand, '도트 영클이 오른쪽 자리에 선다');
  let fired = 0;
  while (g.snapshot.phase === 'lasers' && t < 20) { if (g.snapshot.lasers.some(l => l.fired)) fired++; g.update(step, idle); t += step; }
  assert.ok(fired > 10, '레이저가 쏘아졌다'); assert.equal(g.snapshot.phase, 'overload');
  while (g.snapshot.phase !== 'down' && t < 25) { g.update(step, idle); t += step; }
  assert.equal(g.snapshot.phase, 'down');
  // 쓰러진 7초 동안 C 를 연타(눌렀다 뗌 = 탭 창). 창이 오른쪽으로 날아가 몸에 맞는다
  let frame = 0;
  while (g.snapshot.phase === 'down' && t < 40) { const pressing = frame % 8 === 0; g.update(step, makeInput(pressing ? { 'just:confirm': true } : {})); frame++; t += step; }
  const snap = g.snapshot;
  assert.ok(snap.hits >= 20, `창 명중 ${snap.hits}타`);
  assert.equal(snap.damageDealt, Math.min(S.subrio.down.maxDamage, Math.floor(snap.hits / S.subrio.down.hitsPerDamage)), '5타마다 1 피해');
  assert.equal(b.hits.length, snap.damageDealt); assert.equal(b.yc.hp, 200 - snap.damageDealt);
  assert.equal(snap.phase, 'getup');
  while (g.snapshot.phase !== 'done' && t < 45) { g.update(step, idle); t += step; }
  assert.equal(g.snapshot.phase, 'done');
});

test('test_special_order_and_trial_config', () => {
  assert.deepEqual(S.order, ['subrio', 'rhythm', 'trial', 'ball']); assert.equal(S.hp, 200);
  assert.equal(YOUNGCLE_TRIAL.text.speaker, '영클'); assert.equal(YOUNGCLE_TRIAL.cases[0].choices.length, 3);
  assert.ok(YOUNGCLE_TRIAL.cases[0].choices[2].includes('임금체불')); assert.equal(YOUNGCLE_TRIAL.gavelDamage, 10);
  assert.equal(YOUNGCLE_TRIAL.text.shock.text, '* 호옥!'); assert.ok(YOUNGCLE_TRIAL.assets.judge.includes('youngcle-judge'));
  const rows = S.subrio.rows; assert.equal(rows.length, 22); assert.ok(rows.every(r => r.length === 30)); assert.ok(rows[20].startsWith('#===='), '바닥'); assert.ok(rows[15].includes('========') && rows[11].includes('===='), '발판 2단');
});

test('test_special_ball_hit_when_youngcle_idle_counts_and_clash_when_both_dash', () => {
  const b = fakeBattle(); const g = createBallDuel(b, b.yc, S.ball); const step = 1 / 60; let t = 0;
  while (g.snapshot.phase !== 'game' && t < 2) { g.update(step, makeInput()); t += step; }
  assert.equal(g.snapshot.phase, 'game');
  // 무방비일 때 옆에서 C 돌진 → 히트 (영클이 예고/돌진 중이면 잠깐 기다림)
  let tries = 0;
  while (g.snapshot.hits < S.ball.hits && tries < 400) {
    const s = g.snapshot;
    if (!s.yc.dashing && !s.yc.tele && !s.clash) { g.update(step, makeInput({ 'just:confirm': true, right: true })); for (let i = 0; i < 20; i++) g.update(step, makeInput({ right: true })); }
    else for (let i = 0; i < 10; i++) g.update(step, makeInput());
    tries++;
  }
  assert.equal(g.snapshot.hits, S.ball.hits, `히트 ${g.snapshot.hits}`); assert.equal(g.snapshot.phase, 'finish'); assert.equal(b.yc.hp, 200 - S.ball.damage);
});
