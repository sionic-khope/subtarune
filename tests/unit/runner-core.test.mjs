// 러너 기믹 상태기계(BUILD230): 준비(검 뽑는 순간) → 대시(가속·잔상) → 달리기(발 접촉 프레임마다 step) → X 점프(포물선, 착지) → C 베기 / 공중 C 회전 베기(한 바퀴) → 끝에서 제동 → done.
//   달리기 구간(≈5250px)을 약 10초에 지난다(사용자 “10초쯤 지나면 오른쪽 맵 끝”)
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { RUNNER, createRunner, stepRunner } from '../../src/world/runner-core.js';

const DT = 1 / 60;
const run = (s, seconds, input = {}) => { const ev = []; for (let t = 0; t < seconds; t += DT) ev.push(...stepRunner(s, DT, input)); return ev; };
const map = JSON.parse(readFileSync(new URL('../../assets/maps/jjajang_run.json', import.meta.url), 'utf8'));

test('test_runner_prep_draws_the_sword_then_dashes_up_to_speed_with_afterimages', () => {
  const s = createRunner({ x: 1000, endX: 6000 });
  assert.equal(s.phase, 'prep');
  const ev = run(s, RUNNER.prepTime + DT);
  assert.deepEqual(ev.filter(e => e === 'draw' || e === 'dash'), ['draw', 'dash'], '검 뽑는 소리 한 번 → 대시 한 번');
  assert.equal(s.phase, 'dash'); assert.ok(Math.abs(s.x - 1000) < 2, '준비 동안 제자리');
  run(s, RUNNER.dashTime + DT);
  assert.equal(s.phase, 'run'); assert.equal(s.vx, RUNNER.speed);
  assert.ok(s.trail.length > 0 && s.trail.length <= RUNNER.trailMax, '잔상이 남는다');
  assert.ok(s.x > 1000 + RUNNER.speed * RUNNER.dashTime * 0.4 && s.x < 1000 + RUNNER.speed * RUNNER.dashTime, '대시 동안 가속');
});

test('test_runner_steps_emit_on_foot_contact_frames_and_reaches_the_end_in_about_ten_seconds', () => {
  const { startX, endX, speed } = map.meta.run;
  const s = createRunner({ x: startX, endX, speed });
  const ev = run(s, 30);
  assert.equal(s.phase, 'done'); assert.equal(s.x, endX);
  const steps = ev.filter(e => e === 'step').length;
  assert.ok(steps >= 40, `발 접촉마다 파장 (${steps})`);
  assert.equal(ev.filter(e => e === 'end').length, 1);
  // 시간: 준비+대시+달리기+제동 ≈ 0.72 + 0.45 + 5100/520 + 0.54
  const s2 = createRunner({ x: startX, endX, speed }); let t = 0;
  while (s2.phase !== 'done' && t < 30) { stepRunner(s2, DT); t += DT; }
  assert.ok(t > 9 && t < 12.5, `토리이에서 오른쪽 끝까지 약 10초 (${t.toFixed(1)}s)`);
  assert.ok(speed === RUNNER.speed && endX === 200 * 32 - 96, '맵 meta.run 과 상태기계 속도가 같다');
});

test('test_runner_jump_is_a_parabola_that_lands_and_air_attack_spins_a_full_turn', () => {
  const s = createRunner({ x: 0, endX: 100000 });
  run(s, RUNNER.prepTime + RUNNER.dashTime + 0.5);
  assert.equal(s.phase, 'run');
  let ev = stepRunner(s, DT, { jump: true });
  assert.ok(ev.includes('jump') && !s.grounded && s.vy > 0);
  assert.ok(s.tilt < -0.2, '오를 때 뒤로 젖혀 하늘을 본다(음수 기울기)');
  let peak = 0; ev = []; let airSteps = 0;
  for (let t = 0; t < 1.2 && !s.grounded; t += DT) { const e = stepRunner(s, DT); ev.push(...e); peak = Math.max(peak, s.airY); if (!s.grounded && e.includes('step')) airSteps += 1; }
  assert.ok(s.grounded && s.airY === 0 && ev.includes('land'), '착지');
  assert.equal(s.tilt, 0, '땅에선 기울기 0');
  assert.ok(peak > 70 && peak < 100, `점프 높이 ${peak.toFixed(0)}px (사용자 “더 높게”)`);
  assert.equal(airSteps, 0, '공중에선 발소리·파장 없음(착지 틱의 발소리는 허용)');
  // 땅에서 C = 베기(프레임 0~3), 점프 중 C = 회전 베기(한 바퀴)
  ev = stepRunner(s, DT, { attack: true });
  assert.ok(ev.includes('slash') && s.attack?.kind === 'slash' && s.anim === 'slash');
  assert.deepEqual(stepRunner(s, DT, { jump: true }), [], '베는 동안 점프 안 됨');
  run(s, RUNNER.slashTime + DT);
  assert.equal(s.attack, null);
  stepRunner(s, DT, { jump: true }); stepRunner(s, DT);
  ev = stepRunner(s, DT, { attack: true });
  assert.ok(ev.includes('spin') && s.attack?.kind === 'spin' && s.anim === 'jump' && s.frame === 2, '공중 C: 웅크린 프레임으로 회전');
  const angles = []; while (s.attack) { stepRunner(s, DT); if (s.attack) angles.push(s.spinAngle); }
  assert.ok(angles.every((a, i) => i === 0 || a >= angles[i - 1]) && Math.max(...angles) > Math.PI * 1.8, '한 바퀴(2π)까지 돈다');
  run(s, 0.2); assert.equal(s.spinAngle, 0);
});

test('test_runner_brakes_before_the_end_and_stops_exactly_at_end_x', () => {
  const s = createRunner({ x: 0, endX: 2000 });
  const ev = [];
  let skidFrames = 0, skidAnimOk = true;
  for (let t = 0; t < 8; t += DT) { ev.push(...stepRunner(s, DT)); if (s.phase === 'brake') { skidFrames += 1; if (!(s.anim === 'prep' && s.frame === 1 && s.grounded)) skidAnimOk = false; } }
  assert.equal(s.phase, 'done'); assert.equal(s.x, 2000); assert.equal(s.vx, 0);
  assert.equal(ev.filter(e => e === 'skid').length, 1, '제동 시작에 드르륵 한 번');
  assert.ok(skidFrames * DT > 0.8 && skidFrames * DT < 1.3 && skidAnimOk, `땅을 짚은 웅크린 프레임으로 약 1초 미끄러진다(${(skidFrames * DT).toFixed(2)}s)`);
  assert.ok(ev.filter(e => e === 'skidstep').length >= 12, '미끄러지는 동안 물보라');
  assert.ok(ev.includes('end') && s.trail.length === 0, '끝나면 잔상도 지운다');
  assert.deepEqual(stepRunner(s, DT, { jump: true, attack: true }), [], 'done 뒤엔 아무것도 안 한다');
});
