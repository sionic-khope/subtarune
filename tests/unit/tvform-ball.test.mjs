// 팽이 배틀(특별 패턴 4, BUILD218 '너무 쉽다 · 10대는 때려야 · 경기장은 화면 전체') 순수 로직 검사:
//   무방비일 때 받아쳐 10히트를 채우면 영클에게 10 피해 · 돌진 간격이 데이터 범위 안이고 페인트/연속 돌진으로 한 번은 바짝 붙어 온다 ·
//   가만히 서 있으면 얻어맞는다 · 두 공 모두 경기장(아래 316) 밖으로 나가지 않는다 · 50초가 지나면 피해 없이 끝난다.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createBallDuel } from '../../src/battle/modes/tvform-ball.js';
import { YOUNGCLE_SPECIAL as S } from '../../src/data/youngcle-special.js';

const K = S.ball, STEP = 1 / 60;
const fakeBattle = (seed = 7) => {
  const hits = [], yc = { id: 'youngcle_tvform', hp: S.hp, x: 340, y: 246, def: { damage: 15 } };
  let n = seed;
  const rnd = () => { n = (n * 9301 + 49297) % 233280; return n / 233280; };
  return { yc, hits, hurt: [], sfx() {}, rnd, game: { shake: null, sound: {} },
    members: [{ id: 'ppaman', home: [84, 224], action: null }],
    hitEnemy(e, by, dmg) { hits.push(dmg); e.hp -= dmg; return dmg; },
    hurtParty(d) { this.hurt.push(d); },
    board: { setTarget() {}, rect: { x: 120, y: 100, w: 240, h: 160 } },
    setText() {}, showLine() {}, living() { return [yc]; } };
};
const input = (state = {}) => ({ down: (k) => !!state[k], just: (k) => !!state['just:' + k] });
const IDLE = input();
const start = (b) => { const g = createBallDuel(b, b.yc, K); let t = 0; while (g.snapshot.phase !== 'game' && t < 2) { g.update(STEP, IDLE); t += STEP; } return g; };
// 봇: 영클 쪽으로 밀고 가다 무방비일 때 붙으면 C 돌진
const botInput = (s) => {
  const dx = s.yc.x - s.ball.x, dy = s.yc.y - s.ball.y, d = Math.hypot(dx, dy), st = {};
  if (dx < -6) st.left = true; else if (dx > 6) st.right = true;
  if (dy < -6) st.up = true; else if (dy > 6) st.down = true;
  if (!s.yc.dashing && !s.clash && !s.ball.dashing && d < 88) st['just:confirm'] = true;
  return input(st);
};

test('test_ball_ten_hits_finish_deals_ten_damage', () => {
  const b = fakeBattle(); const g = start(b);
  assert.equal(g.snapshot.phase, 'game');
  assert.equal(g.snapshot.need, 10, '10대를 때려야 끝난다');
  let t = 0;
  while (g.snapshot.hits < K.hits && t < 55) { g.update(STEP, botInput(g.snapshot)); t += STEP; }
  const s = g.snapshot;
  assert.equal(s.hits, K.hits, `히트 ${s.hits}/${K.hits} (${t.toFixed(1)}초)`);
  assert.ok(t < K.maxSeconds, `제한 ${K.maxSeconds}초 안에 끝낼 수 있다 (${t.toFixed(1)}초)`);
  assert.equal(s.phase, 'finish'); assert.equal(s.damaged, true);
  assert.deepEqual(b.hits, [K.damage]); assert.equal(b.yc.hp, S.hp - K.damage);
  let guard = 0;
  while (!g.update(STEP, IDLE) && guard < 300) guard += 1;
  assert.ok(guard < 300, '끝난 뒤 done 으로 넘어간다');
});

test('test_ball_dash_cadence_in_range_and_chained_dashes_hit_a_standing_player', () => {
  const b = fakeBattle(11); const g = start(b);
  const starts = []; let wasDash = false, t = 0;
  while (t < 40) {
    g.update(STEP, IDLE); t += STEP;
    const d = g.snapshot.yc.dashing;
    if (d && !wasDash) starts.push(t);
    wasDash = d;
  }
  assert.ok(starts.length >= 12, `40초 동안 돌진 ${starts.length}회`);
  assert.equal(g.snapshot.dashes, starts.length, 'dashes 스냅샷이 실제 돌진 수와 같다');
  const gaps = starts.slice(1).map((v, i) => v - starts[i]);
  const maxGap = Math.max(...gaps), minGap = Math.min(...gaps);
  const bound = K.yc.dashEvery[1] + K.yc.telegraph + K.yc.dashTime + K.yc.ricochet + 0.4;
  assert.ok(maxGap <= bound, `돌진 간격 최대 ${maxGap.toFixed(2)}초 ≤ ${bound.toFixed(2)}초`);
  assert.ok(minGap < 1.0, `페인트·연속 돌진으로 바짝 이어지는 돌진이 있다 (최소 간격 ${minGap.toFixed(2)}초)`);
  assert.ok(b.hurt.length >= 4, `가만히 서 있으면 얻어맞는다 (${b.hurt.length}회)`);
  assert.ok(b.hurt.every(d => d === K.ycHitDamage), '영클 돌진에 맞으면 파티 15 피해');
});

test('test_ball_arena_keeps_both_balls_above_the_party_hp_strip', () => {
  const b = fakeBattle(29); const g = start(b);
  let t = 0, maxY = 0, minY = 360, minX = 480, maxX = 0;
  while (t < 30) {
    const s = g.snapshot;
    maxY = Math.max(maxY, s.ball.y + K.ball.r, s.yc.y + K.yc.r);
    minY = Math.min(minY, s.ball.y - K.ball.r, s.yc.y - K.yc.r);
    minX = Math.min(minX, s.ball.x - K.ball.r, s.yc.x - K.yc.r);
    maxX = Math.max(maxX, s.ball.x + K.ball.r, s.yc.x + K.yc.r);
    g.update(STEP, botInput(s)); t += STEP;
  }
  assert.ok(maxY <= 316, `경기장 밑동 ${maxY} ≤ 316 (HP 띠 322~ 를 가리지 않는다)`);
  assert.ok(minY >= 24, `경기장 위 ${minY} ≥ 24`);
  assert.ok(minX >= 0 && maxX <= 480, `가로 ${minX}~${maxX} 가 화면 안`);
  assert.equal(K.arena.cy + K.arena.ry, 316, '타원 아래 끝이 316');
  assert.ok(K.arena.rx * 2 >= 460, `경기장 가로 ${K.arena.rx * 2} 가 화면 폭에 가깝다`);
});

test('test_ball_time_limit_ends_without_damage', () => {
  const b = fakeBattle(5); const g = start(b);
  let t = 0, done = false;
  while (!done && t < 70) { done = g.update(STEP, IDLE); t += STEP; }
  assert.ok(done, '시간이 지나면 스스로 끝난다');
  assert.ok(t >= K.maxSeconds, `제한 시간 ${K.maxSeconds}초는 채운다 (${t.toFixed(1)}초)`);
  assert.equal(g.snapshot.damaged, false); assert.equal(b.hits.length, 0, '시간 초과는 피해 없음');
  assert.equal(b.yc.hp, S.hp);
});
