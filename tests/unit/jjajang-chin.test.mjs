// 찢칠라 길 1·2(BUILD242): 곧은 검은 물길, 파란 토리이 1개/2개 → 달리기(장애물), 중후반 찢칠라(필드 적, 표준 조우), 길 1 왼쪽은 되돌아가기 금지(나레이션 + 한 발짝), 길 2 오른쪽은 통로만.
//   찢칠라 적 데이터(체력 16, 전투 대사 3줄 원문, 찢기·드럼통 패턴 + 조합), 탄막 계약(예고 → 위험, 선 근처만 판정, 드럼통 표식 뒤 낙하·튕김·굴러감), 땅 베기 내려·올려 교대(BUILD243)
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { jjajang_chin_start_a, jjajang_chin_start_b, jjajang_no_return, NO_RETURN_LINE } from '../../src/data/cutscenes/jjajang_chin.js';
import { SCRIPTS } from '../../src/data/scripts.js';
import { ENEMIES } from '../../src/data/enemies.js';
import { CHARACTERS } from '../../src/data/characters.js';
import { PATTERNS, Bullet } from '../../src/battle/bullets.js';
import { TEAR, DRUM } from '../../src/battle/chinchilla-patterns.js';
import { RUNNER, createRunner, stepRunner, SLASH_BOX } from '../../src/world/runner-core.js';
import { STATE_FROM_FLAGS } from '../../src/core/story.js';

const load = id => JSON.parse(readFileSync(new URL(`../../assets/maps/${id}.json`, import.meta.url), 'utf8'));
const m1 = load('jjajang_chin1'), m2 = load('jjajang_chin2');
const walk = (m, c, r) => m.rows[r][c] === '*' || m.rows[r][c] === '+';
const DT = 1 / 60;

test('test_chin_maps_layout_torii_runs_enemy_late_and_doors', () => {
  for (const [m, toriis] of [[m1, ['a']], [m2, ['a', 'b']]]) {
    const W = m.rows[0].length, [r0, r1] = m.meta.runRoadRows;
    for (let c = 0; c < W; c++) assert.ok(walk(m, c, r0) && walk(m, c, r1), `${m.id} 길 ${c}`);
    assert.deepEqual(Object.keys(m.meta.runs), toriis, `${m.id}: 토리이 ${toriis.length}개`);
    let prevEnd = -1;
    for (const tag of toriis) {
      const front = m.entities.find(e => e.id === `jjajang_torii_blue_${tag}_front`), trig = m.entities.find(e => e.id === `chin_torii_${tag}`), run = m.meta.runs[tag];
      assert.ok(front && trig && trig.script === `jjajang_chin_start_${tag}` && trig.x > front.x && trig.once === undefined, `${tag}: 토리이 지난 자리 트리거(매번)`);
      assert.ok(front.x > prevEnd + 400, `${tag}: 앞 달리기 끝과 사이 걷는 구간`);
      assert.ok(run.dir === 1 && run.obstacles && run.speed === 420 && !run.tutorial && run.endX > trig.x + 1500, `${tag}: 오른쪽 달리기(장애물, 튜토리얼 없음)`);
      assert.ok(Math.abs((run.endX + 12) - Math.min(run.endX + 12 - 480 * 0.22, W * 32 - 480) - 480 * 0.22) <= 8, `${tag} 끝: 카메라 22%`);
      prevEnd = run.endX;
    }
    const chin = m.entities.find(e => e.type === 'enemy');
    assert.deepEqual([chin.sprite, chin.enemies, chin.wander, chin.unless], ['chinchilla', ['chinchilla'], 0, `${m.id}_chin_defeated`]);
    assert.ok(chin.x > W * 32 * 0.6 && chin.x > prevEnd + 500 && chin.y >= r0 * 32 && chin.y + 24 <= (r1 + 1) * 32, `${m.id}: 찢칠라는 중후반, 달리기 끝 뒤, 길 위`);
    assert.ok(m.spawns.before_chin.x < chin.x - 150 && m.spawns.from_west.x >= 2 * 32 && m.bgm === 'my_castle_town');
  }
  assert.ok(!m1.entities.some(e => e.type === 'door' && e.x === 0), '길 1 왼쪽엔 문이 없다');
  const guard = m1.entities.find(e => e.id === 'chin_no_return');
  assert.deepEqual([guard.x, guard.w, guard.script, guard.once, guard.y, guard.h], [0, 16, 'jjajang_no_return', undefined, 8 * 32, 64], '되돌아가기 트리거(왼쪽 16px, 매번)');
  assert.ok(m1.spawns.from_west.x >= guard.x + guard.w + 16, '스폰은 트리거 밖');
  const e1 = m1.entities.find(e => e.id === 'jjajang_chin1_east_door'); assert.deepEqual([e1.to, e1.spawn, e1.x], ['jjajang_chin2', 'from_west', m1.rows[0].length * 32 - 10]);
  const w2 = m2.entities.find(e => e.id === 'jjajang_chin2_west_door'); assert.deepEqual([w2.to, w2.spawn, w2.x], ['jjajang_chin1', 'from_east', 0]);
  assert.ok(!m2.entities.some(e => e.type === 'door' && e.x > 0) && m2.rows[m2.meta.runRoadRows[0]][m2.rows[0].length - 1] === '+', '길 2 오른쪽은 통로만(다음 맵 대기)');
  // 길 2 샛길(BUILD244): 176~177열로 내려가 20~21행에서 오른쪽으로, 끝에 마나샘(전체 회복). 달리기 끝 뒤·찢칠라 앞
  const br = m2.meta.branch; const [b0, b1] = br.cols, [l0, l1] = br.lowerRows, [r0, r1] = m2.meta.runRoadRows;
  for (let r = r1 + 1; r <= l1; r++) assert.ok(walk(m2, b0, r) && walk(m2, b1, r), `샛길 ${r}`);
  for (let c = b0; c <= br.springCol; c++) assert.ok(walk(m2, c, l0) && walk(m2, c, l1), `아래 길 ${c}`);
  assert.ok(!walk(m2, b0 - 3, l0) && !walk(m2, br.springCol + 2, l0) && !walk(m2, b0 - 1, r1 + 2), '샛길 밖은 숲');
  assert.ok(b0 * 32 > m2.meta.runs.b.endX + 300 && b0 < m2.entities.find(e => e.type === 'enemy').x / 32, '샛길은 달리기 끝 뒤, 찢칠라 앞');
  const spring = m2.entities.find(e => e.id === 'chin2_spring');
  assert.ok(spring && spring.script === 'jjajang_spring' && spring.solid && existsSync(new URL('../../' + spring.image, import.meta.url)) && Math.floor((spring.y + 6) / 32) >= l0 && Math.floor((spring.x + 12) / 32) === br.springCol, '마나샘은 아래 길 끝');
  assert.equal(SCRIPTS.jjajang_spring, SCRIPTS.maillard_spring, '마이야르 샘물과 같은 전체 회복');
  const g = { party: [], partyHp: { hyungsub: 3 }, maxHpOf: () => 160 }; SCRIPTS.jjajang_spring[0].action(g); assert.equal(g.partyHp.hyungsub, 160);
  assert.ok(m2.spawns.before_spring && Math.floor(m2.spawns.before_spring.y / 32) === l0 && m2.spawns.before_spring.x < spring.x - 100);
  for (const flag of ['jjajang_chin1_chin_defeated', 'jjajang_chin2_chin_defeated']) assert.ok(STATE_FROM_FLAGS.some(r => r.flag === flag && r.enemies?.[0] === 'chinchilla'), `${flag}: QA 돈 유도`);
});

test('test_no_return_and_start_scripts', () => {
  assert.equal(SCRIPTS.jjajang_no_return, jjajang_no_return); assert.equal(SCRIPTS.jjajang_chin_start_a, jjajang_chin_start_a); assert.equal(SCRIPTS.jjajang_chin_start_b, jjajang_chin_start_b);
  const line = jjajang_no_return.find(n => n.text);
  assert.equal(NO_RETURN_LINE, '지금은 그럴때가 아닌것같다.'); assert.equal(line.text, `* ${NO_RETURN_LINE}`); assert.equal(line.voice, 'narrator');
  const mv = jjajang_no_return.find(n => n.move === 'player'); assert.deepEqual(mv.by, [32, 0], '한 발짝(한 칸 32px) 오른쪽'); assert.ok(jjajang_no_return.indexOf(mv) > jjajang_no_return.indexOf(line));
  const calls = []; const game = { runner: null, player: { facing: 'right' }, map: { def: { meta: { runs: m2.meta.runs } } }, startRunner: cfg => calls.push(cfg) };
  jjajang_chin_start_b[0].action(game); assert.equal(calls.length, 1); assert.equal(calls[0].id, 'b'); assert.equal(calls[0].endX, m2.meta.runs.b.endX);
  game.player.facing = 'left'; jjajang_chin_start_a[0].action(game); assert.equal(calls.length, 1, '왼쪽 볼 땐 안 켠다');
});

test('test_chinchilla_enemy_data_and_assets', () => {
  const e = ENEMIES.chinchilla;
  assert.equal(e.name, '찢칠라'); assert.equal(e.hp, 16, '체력 16(원문)');
  assert.deepEqual(e.lines.speak, ['씨2발년아', '씹구멍 씹구멍', '찍찍찍찍찢'], '전투 대사 원문 그대로');
  assert.deepEqual(e.patterns.map(p => p.type), ['chin_tear', 'chin_drum', 'chin_tear']); assert.ok(e.patterns[2].cross && e.patterns[2].drums, '3번째는 찢기+드럼통 조합');
  for (const p of [e.sheet.src, e.projectiles.drum, CHARACTERS.chinchilla.still, 'assets/props/jjajang_drum.png']) assert.ok(existsSync(new URL('../../' + p, import.meta.url)), p);
  assert.equal(e.lines.speakSfx, 'squeaky');
  for (const sfx of ['wallclaw', 'metalhit', 'squeaky', 'bell_bounce', 'break1']) assert.ok(existsSync(new URL(`../../assets/audio/sfx/${sfx}.mp3`, import.meta.url)), sfx);
  assert.ok(e.idle.swayX === 0 && e.idle.swayY === 0, '시트 대기 모션이 있으니 흔들림 0');
  assert.ok(TEAR.every <= 1.1 && DRUM.every <= 0.85 && TEAR.warn >= 0.3 && DRUM.warn >= 0.3 && DRUM.arcWarn >= 0.3 && DRUM.rollWarn >= 0.3, '아짐키야보다 촘촘하되 예고 ≥0.3s');
});

test('test_chin_patterns_warn_before_harm_and_tear_hits_only_near_the_line', () => {
  const BOX = { x: 140, y: 139, w: 200, h: 150 }, SOUL = { x: 240, y: 214, r: 6 };
  const run = (type, opts) => {
    const p = PATTERNS[type](opts); const out = [], sfx = []; let seed = 3; const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    const api = { box: BOX, soul: SOUL, rnd, images: {}, t: 0, sfx: n => sfx.push(n), emit: o => { const b = new Bullet(o); b.bornAt = api.t; out.push(b); return b; } };
    for (let t = 0; t < p.duration + 0.05; t += DT) { api.t = t; p.update(t, DT, api); }
    return { out, sfx };
  };
  const { out, sfx } = run('chin_tear', {});
  const warns = out.filter(b => b.tearWarn), hits = out.filter(b => b.tear);
  assert.ok(warns.length >= 4 && hits.length === warns.length, `찢기 예고 ${warns.length} / 위험 ${hits.length}`);
  hits.forEach((h, i) => { assert.ok(Math.abs((h.bornAt - warns[i].bornAt) - TEAR.warn) < 0.03, '예고 뒤 정확히 warn 초'); assert.ok(warns[i].harmless && !h.harmless); });
  const h = hits[0]; h.age = 0.1;
  assert.ok(h.hits({ x: h.x + 1, y: h.y + 1, r: 6 }), '선 위는 맞는다');
  assert.ok(!h.hits({ x: h.x, y: h.y + 80, r: 6 }) || !h.hits({ x: h.x + 80, y: h.y, r: 6 }), '선에서 먼 곳은 안 맞는다');
  assert.equal(sfx.filter(n => n === 'wallclaw').length, hits.length, '찢길 때마다 소리 한 번');
  const combo = run('chin_tear', { cross: true, drums: true });
  assert.ok(combo.out.filter(b => b.tearWarn).length > warns.length && combo.sfx.includes('metalhit'), '조합: 교차 찢기 + 굴러오는 드럼통');
  const d = run('chin_drum', {});
  const marks = d.out.filter(b => b.harmless), drums = d.out.filter(b => !b.harmless);
  assert.ok(drums.length >= 4 && marks.length === drums.length && drums.every(b => b.r === DRUM.r), `드럼통 ${drums.length}(표식 ${marks.length})`);
  drums.forEach((b, i) => assert.ok(b.bornAt - marks[i].bornAt >= 0.44, '표식·호 뒤에 온다'));
  assert.ok(d.sfx.includes('wing'), '높이 던질 때 휘융');
  const drop = drums.find(b => b.phase === 'fall'); for (let i = 0; i < 240; i++) drop.update(DT, BOX);
  assert.equal(drop.phase, 'roll'); assert.ok(Math.abs(drop.y - (BOX.y + BOX.h - 3 - DRUM.r)) < 1 && Math.abs(drop.vx) === DRUM.roll, '바닥에서 튕긴 뒤 굴러간다');
});

test('test_runner_ground_slash_alternates_down_and_up', () => {
  const s = createRunner({ x: 0, endX: 100000 }); for (let t = 0; t < RUNNER.prepTime + RUNNER.dashTime + 0.2; t += DT) stepRunner(s, DT);
  stepRunner(s, DT, { attack: true }); assert.ok(s.attack && !s.attack.up && s.anim === 'slash', '첫 베기는 내려베기'); const f1 = []; while (s.attack) { f1.push(s.frame); stepRunner(s, DT); }
  stepRunner(s, DT, { attack: true }); assert.ok(s.attack && s.attack.up && s.anim === 'upslash', '두 번째는 올려베기(전용 시트)'); const f2 = []; while (s.attack) { f2.push(s.frame); stepRunner(s, DT); }
  assert.deepEqual([...new Set(f1)], [0, 1, 2, 3]); assert.deepEqual([...new Set(f2)], [0, 1, 2, 3], '올려베기 시트 4프레임 순서대로');
  assert.ok(SLASH_BOX.ground[1] >= 80 && SLASH_BOX.ground[3] >= 72 && SLASH_BOX.air[1] >= 72, '베기 영역을 넓혔다(BUILD244)');
  stepRunner(s, DT, { attack: true }); assert.ok(s.attack && !s.attack.up, '다시 내려베기');
});
