// 러너 기믹 상태기계 — 순수 로직(캔버스·입력 객체·소리 없음). src/world/runner.js 가 그리기·소리·카메라를 맡는다 (BUILD230 사용자 브리핑 2026-09-19)
//   파란 토리이를 지나면: 준비(땅 짚고 검을 뒤로 뽑음, 검 뽑는 소리) → 잔상 대시(0 → 속도) → 자동 달리기(X 점프, C 베기, 공중 C 한 바퀴 회전 베기) → 맵 오른쪽 끝에서 제동 → 끝
//   숫자는 여기 한 곳에서만 조정한다(사용자 “10초쯤 지나면 오른쪽 맵 끝”: 달리기 구간 ≈ 5250px / 520px/s ≈ 10초)
export const RUNNER = Object.freeze({
  speed: 520,                       // px/s
  prepTime: 0.72,                   // 준비 동작 전체
  drawAt: 0.24,                     // 검 뽑는 순간(소리·프레임 2)
  prepFrames: [0, 0.24, 0.5, 0.62], // prep 시트 프레임 0~3 시작 시각
  dashTime: 0.45,                   // 0 → speed 가속
  runFps: 12,                       // 달리기 프레임 속도(최고 속도 기준)
  stepFrames: [1, 3],               // 발 접촉 프레임 → 물결 고리·발소리
  jumpV: 430, gravity: 1100,        // 점프(사용자 “더 높게”): 체공 약 0.78초, 높이 약 84px
  jumpTilt: 0.32,                   // 점프 중 몸을 대각선으로 살짝 틀어 하늘을 본다(라디안, 오를 때 뒤로 젖힘·내려올 때 앞으로)
  airTime: 2 * 430 / 1100,          // 점프 체공 시간 — 착지 자리가 끝에서 minSkid 보다 가까워질 점프는 받지 않는다(리뷰: 공중이면 제동이 못 시작해 미끄러짐이 통째로 빠짐)
  minSkid: 120,                     // 착지 뒤 최소 미끄러짐 거리(점프 거부 구간은 끝 앞 약 526px = 1초, 그 안에서 착지하면 짧게라도 미끄러진다)
  slashTime: 0.32, spinTime: 0.34,  // C 베기 / 공중 C 회전 베기(사용자 “공중 베기 속도감”: 0.34초에 한 바퀴)
  brakeDist: 260,                   // 끝에서 제동(사용자 “땅을 짚으면서 앞으로 드르르르륵”): 웅크려 손을 짚은 채 미끄러지며 v = speed·√(남은/brakeDist) 로 줄어 endX 에 정확히 선다(약 1.0초)
  skidStepEvery: 0.05,              // 미끄러지는 동안 물보라 간격
  settleTime: 0.3,                  // 멈춘 뒤 웅크린 채 잠깐(그 뒤 일어나며 조작 복귀)
  trailEvery: 0.03, trailMax: 8,    // 잔상
  cameraLeft: 0.22,                 // 캐릭터를 화면 왼쪽 22% 자리에(크기는 character-motions.js runner_* 의 scale — 걷기보다 살짝 작게)
});

/** 시작 상태. x = 주인공 x(히트박스 왼쪽), endX = 제동 목표(맵 오른쪽 끝 안쪽) */
export function createRunner({ x, endX, speed = RUNNER.speed }) {
  return { phase: 'prep', t: 0, elapsed: 0, x, endX, speed: Math.max(1, speed || RUNNER.speed), vx: 0, airY: 0, vy: 0, grounded: true,
    anim: 'prep', frame: 0, animT: 0, attack: null, spinAngle: 0, tilt: 0, trail: [], trailT: 0 };
}

/** 한 틱. input = { jump, attack } (이번 틱에 눌림). 돌아오는 값은 이벤트 이름 배열: draw·dash·step·jump·land·slash·spin·end */
export function stepRunner(s, dt, input = {}) {
  const ev = [];
  s.elapsed += dt;
  if (s.phase === 'done') return ev;
  if (s.phase === 'settle') {
    s.t += dt; s.anim = 'prep'; s.frame = 2; s.tilt = 0;
    if (s.t >= RUNNER.settleTime) { s.phase = 'done'; s.trail.length = 0; ev.push('end'); }
    return ev;
  }
  if (s.phase === 'prep') {
    const before = s.t; s.t += dt;
    if (before < RUNNER.drawAt && s.t >= RUNNER.drawAt) ev.push('draw');
    s.anim = 'prep'; s.frame = Math.max(0, RUNNER.prepFrames.filter((at) => s.t >= at).length - 1);
    if (s.t >= RUNNER.prepTime) { s.phase = 'dash'; s.t = 0; s.animT = 0; ev.push('dash'); }
    return ev;
  }
  if (s.phase === 'dash') {
    s.t += dt; s.vx = s.speed * Math.min(1, s.t / RUNNER.dashTime);
    if (s.t >= RUNNER.dashTime) { s.phase = 'run'; s.t = 0; s.vx = s.speed; }
  } else if (s.phase === 'run') {
    s.t += dt;
    if (s.x >= s.endX - RUNNER.brakeDist && s.grounded) { s.phase = 'brake'; s.t = 0; s.skidT = 0; s.attack = null; s.spinAngle = 0; ev.push('skid'); }   // 땅 베기 중이면 베기를 끊고 미끄러진다
  } else if (s.phase === 'brake') {
    s.t += dt; s.skidT += dt;
    const left = Math.max(0, s.endX - s.x);
    s.vx = s.speed * Math.sqrt(left / RUNNER.brakeDist);
    if (s.skidT >= RUNNER.skidStepEvery) { s.skidT = 0; ev.push('skidstep'); }
    if (left <= 0.5 || s.vx * dt >= left) { s.x = s.endX; s.vx = 0; s.phase = 'settle'; s.t = 0; s.grounded = true; s.airY = 0; s.vy = 0; s.attack = null; s.spinAngle = 0; }
  }
  if (s.phase !== 'done' && s.phase !== 'settle') s.x = Math.min(s.endX, s.x + s.vx * dt);
  // 점프(X): 땅에 있고 공격 중이 아닐 때(제동 중엔 안 됨)
  const jumpLandsBeforeBrake = s.x + s.speed * RUNNER.airTime < s.endX - RUNNER.minSkid;
  if (input.jump && s.grounded && !s.attack && (s.phase === 'run' || s.phase === 'dash') && jumpLandsBeforeBrake) { s.grounded = false; s.vy = RUNNER.jumpV; ev.push('jump'); }
  if (!s.grounded) {
    s.airY += s.vy * dt; s.vy -= RUNNER.gravity * dt;
    if (s.airY <= 0) { s.airY = 0; s.vy = 0; s.grounded = true; ev.push('land'); }
  }
  // 점프 기울기: 오를 때 뒤로 젖혀 하늘을 보고(음수 = 왼쪽으로 회전), 내려올 때 살짝 앞으로. 회전 베기 중엔 회전각이 대신한다
  s.tilt = s.grounded || s.attack?.kind === 'spin' ? 0 : -RUNNER.jumpTilt * Math.max(-0.6, Math.min(1, s.vy / RUNNER.jumpV));
  // 공격(C): 땅에서는 앞을 가르는 베기, 공중에서는 한 바퀴 공중제비 회전 베기
  if (input.attack && !s.attack && (s.phase === 'run' || s.phase === 'dash')) { s.attack = { kind: s.grounded ? 'slash' : 'spin', t: 0 }; ev.push(s.attack.kind); }
  if (s.attack) {
    s.attack.t += dt;
    const dur = s.attack.kind === 'slash' ? RUNNER.slashTime : RUNNER.spinTime;
    if (s.attack.kind === 'spin') s.spinAngle = Math.PI * 2 * Math.min(1, s.attack.t / dur);
    if (s.attack.t >= dur) { s.attack = null; s.spinAngle = 0; }
  }
  // 애니메이션 프레임
  if (s.attack?.kind === 'slash') { s.anim = 'slash'; s.frame = Math.min(3, Math.floor((s.attack.t / RUNNER.slashTime) * 4)); }
  else if (!s.grounded) { s.anim = 'jump'; s.frame = s.attack ? 2 : (s.airY < 6 && s.vy > 0 ? 0 : s.vy > 60 ? 1 : s.vy > -60 ? 2 : 3); }
  else if (s.phase === 'brake') { s.anim = 'prep'; s.frame = 1; }   // 웅크려 손을 짚고 미끄러진다(준비 시트 2번째 프레임)
  else if (s.phase === 'settle') { s.anim = 'prep'; s.frame = 2; }
  else {
    const prevFrame = s.frame, prevAnim = s.anim;
    s.anim = 'run'; s.animT += dt * RUNNER.runFps * Math.max(0.5, s.vx / s.speed);
    s.frame = Math.floor(s.animT) % 4;
    if ((prevAnim !== 'run' || s.frame !== prevFrame) && RUNNER.stepFrames.includes(s.frame)) ev.push('step');
  }
  // 잔상: 움직이는 동안 일정 간격으로 자리를 남긴다(대시 때 가장 진하게 — 그리기에서 결정)
  s.trailT += dt;
  if (s.vx > 0 && s.trailT >= RUNNER.trailEvery) {
    s.trailT = 0;
    s.trail.push({ x: s.x, airY: s.airY, anim: s.anim, frame: s.frame, angle: s.spinAngle || s.tilt, phase: s.phase });
    if (s.trail.length > RUNNER.trailMax) s.trail.shift();
  } else if (s.vx <= 0 && s.trail.length && s.phase === 'done') s.trail.length = 0;
  return ev;
}
