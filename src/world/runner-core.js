// 러너 기믹 상태기계 — 순수 로직(캔버스·입력 객체·소리 없음). src/world/runner.js 가 그리기·소리·카메라를 맡는다 (BUILD230 사용자 브리핑 2026-09-19)
//   파란 토리이를 지나면: 준비(땅 짚고 검을 뒤로 뽑음, 검 뽑는 소리) → 잔상 대시(0 → 속도) → 자동 달리기(X 점프, C 베기, 공중 C 위에서 아래로 내려치는 점프 공격, 착지 웅크림) → 맵 오른쪽 끝에서 제동 → 끝
//   숫자는 여기 한 곳에서만 조정한다(사용자 “10초쯤 지나면 오른쪽 맵 끝”: 달리기 구간 ≈ 5250px / 520px/s ≈ 10초)
//   BUILD236: 방향(dir ±1, 왼쪽 달리기)·장애물(나뭇잎 낙하·솔잎 날아옴·나뭇가지: 베면 쳐냄, 맞으면 hurt)
export const RUNNER = Object.freeze({
  speed: 520,                       // px/s
  prepTime: 0.72,                   // 준비 동작 전체
  drawAt: 0.24,                     // 검 뽑는 순간(소리·프레임 2)
  prepFrames: [0, 0.24, 0.5, 0.62], // prep 시트 프레임 0~3 시작 시각
  dashTime: 0.45,                   // 0 → speed 가속
  runFps: 12,                       // 달리기 프레임 속도(최고 속도 기준)
  stepFrames: [1, 3],               // 발 접촉 프레임 → 물결 고리·발소리
  jumpV: 451, gravity: 1100,        // 점프(사용자 “더 높게”, BUILD240 “점프력 10퍼센트만 올리자”): 체공 약 0.82초, 높이 약 92px(84 의 1.1배)
  jumpTilt: 0.32,                   // 점프 중 몸을 대각선으로 살짝 틀어 하늘을 본다(라디안, 오를 때 뒤로 젖힘·내려올 때 앞으로)
  airTime: 2 * 451 / 1100,          // 점프 체공 시간 — 착지 자리가 끝에서 minSkid 보다 가까워질 점프는 받지 않는다(리뷰: 공중이면 제동이 못 시작해 미끄러짐이 통째로 빠짐)
  minSkid: 120,                     // 착지 뒤 최소 미끄러짐 거리(점프 거부 구간은 끝 앞 약 526px = 1초, 그 안에서 착지하면 짧게라도 미끄러진다)
  slashTime: 0.32, airSlashTime: 0.36,   // C 베기 / 공중 C 내려치기(사용자 정정: 한 바퀴가 아니라 위에서 아래로 휘두르는 점프 공격)
  landTime: 0.16,                   // 착지 웅크림(점프 시트 4번째 프레임) 동안은 달리기 프레임·발소리 없이 미끄러지듯 이어 달린다
  brakeDist: 260,                   // 끝에서 제동(사용자 “땅을 짚으면서 앞으로 드르르르륵”): 웅크려 손을 짚은 채 미끄러지며 v = speed·√(남은/brakeDist) 로 줄어 endX 에 정확히 선다(약 1.0초)
  skidStepEvery: 0.05,              // 미끄러지는 동안 물보라 간격
  settleTime: 0.3,                  // 멈춘 뒤 웅크린 채 잠깐(그 뒤 일어나며 조작 복귀)
  trailEvery: 0.03, trailMax: 8,    // 잔상
  cameraLeft: 0.22,                 // 캐릭터를 화면 왼쪽 22% 자리에(크기는 character-motions.js runner_* 의 scale — 걷기보다 살짝 작게)
  invuln: 0.9,                      // 맞은 뒤 무적
});

// 장애물(BUILD236 사용자 “나뭇잎 같은 게 떨어지거나 날아오거나 나뭇가지가 따라오는데 … 못 쳐내면 피가 10”): 종류별 크기·속도, 앞 거리(달리는 방향 기준)
//   높이(h)는 땅에서 위로 잰 값. 베기 판정은 SLASH_BOX(BUILD244 에서 넓힘)
//   BUILD240(사용자 “나뭇잎 잘 안 보여 … 떨어지는 속도랑 반응할 수 있는 속도”): 나뭇잎은 화면 오른쪽 가장자리 밖(앞 380~440px)에서 나타나 몸 높이(arrive)에 딱 맞춰 닿도록 시작 높이를 역산한다(머리 위로 지나가 버리는 잎 없음),
//   솔잎·가지는 절반 속도로 날아오고 간격은 1.5~2.3초. 그림은 draw 배로 키워 그리고(가시성) 판정 상자는 그대로. 굽이 길 자체는 420px/s(맵 meta.runs.<id>.speed)
export const OBSTACLES = Object.freeze({
  leaf:    { w: 20, h: 18, ahead: [380, 440], arrive: [10, 26], fall: [70, 110], drift: 30, sway: 22, hurt: 10, hitbox: 'body', draw: 1.6 },
  leaf2:   { w: 20, h: 16, ahead: [380, 440], arrive: [10, 26], fall: [70, 110], drift: 30, sway: 22, hurt: 10, hitbox: 'body', draw: 1.6 },
  needles: { w: 16, h: 10, ahead: [400, 460], height: [22, 34], fly: [120, 160], hurt: 10, hitbox: 'body', draw: 1.5 },
  branch:  { w: 56, h: 18, ahead: [400, 470], height: [14, 20], fly: [130, 170], hurt: 10, hitbox: 'body', draw: 1.2 },
});
export const OBSTACLE_SPAWN = Object.freeze({ every: [1.5, 2.3], first: 1.4, types: ['leaf', 'needles', 'leaf2', 'branch', 'leaf', 'needles'] });
// 첫 나뭇잎 튜토리얼(BUILD240 사용자 “첫 나뭇잎 맞기 바로 직전에 멈춰서 C 를 누르라는 가이드, 그 전엔 조작을 잠시 막기”): createRunner({tutorial:true}) 이면
//   pending(점프·베기 무시) → 첫 장애물이 앞 holdAt px 안(땅 베기 판정 8~62 의 끝)에 들면 hold(시간 정지, C 만 기다림) → C 로 done(그 틱에 베기 시작 → 쳐냄). 게임 플래그 flag 가 있으면 다시 안 한다
export const TUTORIAL = Object.freeze({ holdAt: 60, flag: 'run_leaf_tutorial_done' });
const PLAYER_BOX = Object.freeze({ half: 10, height: 44 });
// 올려베기(BUILD244 사용자 “위로 올릴 때는 턱도 들면서 자세가 잡혀야, 팔만 움직이지 말고 스프라이트를”): 전용 시트 runner_upslash(웅크림 → 낮게 베기 → 턱 들고 위로 → 복귀)
// 베기 판정(BUILD244 “이펙트나 영역 좀 더 넓게”): 땅 베기 앞 4~80 × 높이 0~72, 공중 앞 -6~72 × airY-24 ~ +72
export const SLASH_BOX = Object.freeze({ ground: [4, 80, 0, 72], air: [-6, 72, -24, 72] });

/** 시작 상태. x = 주인공 x(히트박스 왼쪽), endX = 제동 목표(맵 오른쪽 끝 안쪽) */
export function createRunner({ x, endX, speed = RUNNER.speed, dir = 1, obstacles = false, seed = 1, tutorial = false }) {
  return { phase: 'prep', t: 0, elapsed: 0, x, endX, speed: Math.max(1, speed || RUNNER.speed), dir: dir < 0 ? -1 : 1, vx: 0, airY: 0, vy: 0, grounded: true,
    anim: 'prep', frame: 0, animT: 0, attack: null, slashN: 0, tilt: 0, landT: 0, trail: [], trailT: 0,
    obstacles: obstacles ? [] : null, spawnT: obstacles ? OBSTACLE_SPAWN.first : 0, spawnIdx: 0, rng: (seed >>> 0) || 1, invuln: 0, hurtCount: 0, deflectCount: 0, tutorial: obstacles && tutorial ? 'pending' : null };
}
/** 결정적 난수(테스트 재현용) 0~1 */
function rand01(s) { s.rng = (Math.imul(s.rng, 1664525) + 1013904223) >>> 0; return s.rng / 4294967296; }
const lerp = (a, b, k) => a + (b - a) * k;
/** 남은 거리(달리는 방향 기준) */
const left = s => (s.endX - s.x) * s.dir;

/** 한 틱. input = { jump, attack } (이번 틱에 눌림). 돌아오는 값은 이벤트 이름 배열: draw·dash·step·jump·land·slash·airslash·skid·skidstep·end */
export function stepRunner(s, dt, input = {}) {
  const ev = [];
  // 첫 나뭇잎 튜토리얼: hold 동안은 시간이 멈춘 채 C(attack)만 기다리고, 그 전(pending)엔 점프·베기를 받지 않는다
  if (s.tutorial === 'hold') {
    if (!input.attack) return ev;
    s.tutorial = 'done'; ev.push('tutorial_done');
  } else if (s.tutorial === 'pending') input = {};
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
    if (left(s) <= RUNNER.brakeDist && s.grounded) { s.phase = 'brake'; s.t = 0; s.skidT = 0; s.attack = null; ev.push('skid'); }   // 땅 베기 중이면 베기를 끊고 미끄러진다
  } else if (s.phase === 'brake') {
    s.t += dt; s.skidT += dt;
    const remain = Math.max(0, left(s));
    s.vx = s.speed * Math.sqrt(remain / RUNNER.brakeDist);
    if (s.skidT >= RUNNER.skidStepEvery) { s.skidT = 0; ev.push('skidstep'); }
    if (remain <= 0.5 || s.vx * dt >= remain) { s.x = s.endX; s.vx = 0; s.phase = 'settle'; s.t = 0; s.grounded = true; s.airY = 0; s.vy = 0; s.attack = null; }
  }
  if (s.phase !== 'done' && s.phase !== 'settle') { s.x += s.vx * dt * s.dir; if (left(s) < 0) s.x = s.endX; }
  // 점프(X): 땅에 있고 공격 중이 아닐 때(제동 중엔 안 됨)
  const jumpLandsBeforeBrake = left(s) - s.speed * RUNNER.airTime > RUNNER.minSkid;
  if (input.jump && s.grounded && !s.attack && (s.phase === 'run' || s.phase === 'dash') && jumpLandsBeforeBrake) { s.grounded = false; s.vy = RUNNER.jumpV; ev.push('jump'); }
  if (!s.grounded) {
    s.airY += s.vy * dt; s.vy -= RUNNER.gravity * dt;
    if (s.airY <= 0) { s.airY = 0; s.vy = 0; s.grounded = true; s.landT = RUNNER.landTime; ev.push('land'); }
  }
  if (s.landT > 0) s.landT = Math.max(0, s.landT - dt);
  // 공격(C): 땅에서는 앞을 가르는 베기, 공중에서는 머리 위에서 아래로 내려치는 점프 공격(airslash)
  // 땅 베기는 내려베기·올려베기가 번갈아 나온다(BUILD243 사용자 “아래로만 휘두르지 말고 위에서 아래로, 아래에서 위로”): up 이면 올려베기 시트(runner_upslash)
  if (input.attack && !s.attack && (s.phase === 'run' || s.phase === 'dash') && !(s.grounded && s.landT > 0)) { s.attack = { kind: s.grounded ? 'slash' : 'airslash', t: 0, up: s.grounded && s.slashN++ % 2 === 1 }; ev.push(s.attack.kind); }
  if (s.attack) {
    s.attack.t += dt;
    const dur = s.attack.kind === 'slash' ? RUNNER.slashTime : RUNNER.airSlashTime;
    if (s.attack.t >= dur) s.attack = null;
  }
  // 점프 기울기: 오를 때 뒤로 젖혀 하늘을 보고(음수 = 왼쪽으로 회전), 내려올 때 살짝 앞으로. 공격 중엔 기울이지 않는다(공격 판정 뒤에 계산)
  s.tilt = s.grounded || s.attack ? 0 : -RUNNER.jumpTilt * Math.max(-0.6, Math.min(1, s.vy / RUNNER.jumpV));
  // 애니메이션 프레임
  if (s.attack?.kind === 'slash') { s.anim = s.attack.up ? 'upslash' : 'slash'; s.frame = Math.min(3, Math.floor((s.attack.t / RUNNER.slashTime) * 4)); }
  else if (s.attack?.kind === 'airslash') { s.anim = 'airslash'; s.frame = Math.min(3, Math.floor((s.attack.t / RUNNER.airSlashTime) * 4)); }
  else if (!s.grounded) { s.anim = 'jump'; s.frame = s.airY < 6 && s.vy > 0 ? 0 : s.vy > 0 ? 1 : 2; }   // 0 도약, 1 상승(하늘 봄), 2 하강(착지 대비)
  else if (s.landT > 0 && s.phase !== 'brake' && s.phase !== 'settle') { s.anim = 'jump'; s.frame = 3; }   // 착지 웅크림
  else if (s.phase === 'brake') { s.anim = 'prep'; s.frame = 1; }   // 웅크려 손을 짚고 미끄러진다(준비 시트 2번째 프레임)
  else if (s.phase === 'settle') { s.anim = 'prep'; s.frame = 2; }
  else {
    const prevFrame = s.frame, prevAnim = s.anim;
    s.anim = 'run'; s.animT += dt * RUNNER.runFps * Math.max(0.5, s.vx / s.speed);
    s.frame = Math.floor(s.animT) % 4;
    if ((prevAnim !== 'run' || s.frame !== prevFrame) && RUNNER.stepFrames.includes(s.frame)) ev.push('step');
  }
  if (s.obstacles) stepObstacles(s, dt, ev);
  // 잔상: 움직이는 동안 일정 간격으로 자리를 남긴다(대시 때 가장 진하게 — 그리기에서 결정)
  s.trailT += dt;
  if (s.vx > 0 && s.trailT >= RUNNER.trailEvery) {
    s.trailT = 0;
    s.trail.push({ x: s.x, airY: s.airY, anim: s.anim, frame: s.frame, angle: s.tilt, phase: s.phase });
    if (s.trail.length > RUNNER.trailMax) s.trail.shift();
  } else if (s.vx <= 0 && s.trail.length && s.phase === 'done') s.trail.length = 0;
  return ev;
}

/** 장애물 갱신: 생성(달리는 동안) → 이동 → 베기 판정(쳐냄) → 몸 판정(맞음) → 뒤로 지나간 것 정리. 좌표는 월드 x·땅에서의 높이 h */
function stepObstacles(s, dt, ev) {
  const running = s.phase === 'run' || s.phase === 'dash';
  if (s.invuln > 0) s.invuln = Math.max(0, s.invuln - dt);
  if (running && left(s) > RUNNER.brakeDist + 240) {
    s.spawnT -= dt;
    if (s.spawnT <= 0) {
      s.spawnT = lerp(...OBSTACLE_SPAWN.every, rand01(s));
      const type = OBSTACLE_SPAWN.types[s.spawnIdx % OBSTACLE_SPAWN.types.length]; s.spawnIdx += 1;
      const d = OBSTACLES[type];
      const ahead = lerp(...d.ahead, rand01(s));
      const o = { type, x: s.x + s.dir * ahead, h: d.height ? lerp(...d.height, rand01(s)) : 0, w: d.w, hh: d.h, t: 0, deflected: false, hit: false, spin: 0, phase: rand01(s) * 6.28 };
      if (d.fall) {
        o.vh = -lerp(...d.fall, rand01(s)); o.vx = -s.dir * d.drift; o.sway = d.sway;
        // 떨어지는 잎: 몸 가운데에 닿는 순간 높이가 arrive 가 되도록 시작 높이를 역산(닿기까지 ahead / (달리기 + 마주 오는 drift) 초)
        if (d.arrive) o.h = lerp(...d.arrive, rand01(s)) - o.vh * (ahead / (s.speed + d.drift));
      } else { o.vh = 0; o.vx = -s.dir * lerp(...d.fly, rand01(s)); }
      s.obstacles.push(o);
    }
  }
  const px = s.x + 12, body = { lo: s.airY, hi: s.airY + PLAYER_BOX.height };
  const atk = s.attack && s.attack.t >= 0.04 && s.attack.t <= (s.attack.kind === 'slash' ? RUNNER.slashTime : RUNNER.airSlashTime) * 0.8 ? s.attack.kind : null;
  for (const o of s.obstacles) {
    o.t += dt;
    if (o.deflected) { o.x += o.vx * dt; o.h += o.vh * dt; o.vh -= 700 * dt; o.spin += 14 * dt; continue; }
    o.x += o.vx * dt; o.h += o.vh * dt;
    if (o.sway) o.x += Math.sin(o.phase + o.t * 5) * o.sway * dt;
    if (o.h < -o.hh) { o.dead = true; continue; }
    const relX = (o.x - px) * s.dir;   // 달리는 방향 기준 앞(+)
    const overlapX = (a, b) => relX + o.w / 2 > a && relX - o.w / 2 < b;
    const overlapH = (lo, hi) => o.h + o.hh > lo && o.h < hi;
    if (s.tutorial === 'pending' && relX <= TUTORIAL.holdAt && relX > 16 && overlapH(0, 58)) { s.tutorial = 'hold'; ev.push('tutorial_hold'); break; }
    if (atk === 'slash' && overlapX(SLASH_BOX.ground[0], SLASH_BOX.ground[1]) && overlapH(SLASH_BOX.ground[2], SLASH_BOX.ground[3])) { o.deflected = true; o.vx = s.dir * 420; o.vh = 260; s.deflectCount += 1; ev.push('deflect'); continue; }
    if (atk === 'airslash' && overlapX(SLASH_BOX.air[0], SLASH_BOX.air[1]) && overlapH(s.airY + SLASH_BOX.air[2], s.airY + SLASH_BOX.air[3])) { o.deflected = true; o.vx = s.dir * 420; o.vh = 200; s.deflectCount += 1; ev.push('deflect'); continue; }
    if (!o.hit && s.invuln <= 0 && overlapX(-PLAYER_BOX.half, PLAYER_BOX.half) && overlapH(body.lo, body.hi)) { o.hit = true; o.dead = true; s.invuln = RUNNER.invuln; s.hurtCount += 1; ev.push('hurt'); }
  }
  s.obstacles = s.obstacles.filter(o => !o.dead && (o.x - px) * s.dir > -160 && (!o.deflected || o.t < 3));
}
