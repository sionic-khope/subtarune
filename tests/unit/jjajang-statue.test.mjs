// 석상 앞 숲(BUILD228): 곧은 길 + 가운데 위 공터 + 그림자 통로를 막는 석상(그림 밑변 = 히트박스 밑변, 통로 폭을 덮음, 대화 중 보이는 높이 안·카메라 목표),
// 소나무 숲 오른쪽 문 ↔ 왼쪽 문, 브금 이어짐, 컷신(브금 끔 → 둘 다 뒤로 → 위 봄 → 카메라 → 원문 26줄·색 태그 → 껄껄 두 곳 뒤 웃음 → 카메라·브금 복귀), QA
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { jjajang_statue_talk, STATUE_VIEW } from '../../src/data/cutscenes/jjajang_statue.js';
import { SCRIPTS } from '../../src/data/scripts.js';
import { QA_POINTS, storyBgm, JJAJANG_AFTER_JOIN_MAPS } from '../../src/core/story.js';
import { DIALOGUE_VISIBLE_H, SCREEN_H, TILE } from '../../src/core/layout.js';

const map = JSON.parse(readFileSync(new URL('../../assets/maps/jjajang_statue.json', import.meta.url), 'utf8'));
const pines = JSON.parse(readFileSync(new URL('../../assets/maps/jjajang_pines.json', import.meta.url), 'utf8'));
const rows = map.rows;
const walk = (c, r) => rows[r]?.[c] === '$' || rows[r]?.[c] === '&';
const pngSize = p => { const b = readFileSync(new URL('../../' + p, import.meta.url)); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };
const statue = map.entities.find(e => e.id === 'jjajang_statue');
const shade = map.entities.find(e => e.id === 'jjajang_passage_shade');
const [[pc0, pc1], [pr0, pr1]] = map.meta.passage;

test('test_statue_map_straight_road_short_branch_wide_clearing_and_passage', () => {
  assert.ok([14, 15].every(r => [...Array(60).keys()].every(c => walk(c, r))), '왼쪽 가장자리에서 오른쪽 끝까지 곧은 길');
  assert.equal(rows[14][0], '&'); assert.equal(rows[14][59], '&');
  assert.ok([11, 12, 13].every(r => walk(28, r) && walk(29, r)) && !walk(27, 12) && !walk(30, 12), '가운데(28~29열)에서 살짝 위로');
  const [c0, c1, r0, r1] = map.meta.clearing;
  assert.ok(c1 - c0 + 1 >= 20 && r1 - r0 + 1 === 4, '가로로 넓은 공터');
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) assert.equal(rows[r][c], '$', `clearing ${c},${r}`);
  assert.ok(!walk(c0 - 1, r0) && !walk(c1 + 1, r1), '공터 양옆은 숲');
  for (let r = pr0; r <= pr1; r++) for (let c = pc0; c <= pc1; c++) assert.equal(rows[r][c], '$', `passage ${c},${r}`);
  assert.ok(pr0 >= 1 && [...rows[0]].every(ch => ch === '@'), '윗줄은 막혀 있다(오버레이가 완전히 검어 보이지 않는다)');
  assert.ok(!walk(pc0 - 1, pr1) && !walk(pc1 + 1, pr1), '통로 양옆은 숲(석상 옆으로 돌 수 없다)');
  assert.deepEqual(map.meta.blocked, [[28, 9], [28, 2]], '막아야 하는 길 감사: 공터에서 통로 안으로 못 간다');
});

test('test_statue_blocks_the_passage_and_fits_the_dialogue_view', () => {
  const [w, h] = pngSize(statue.image);
  assert.equal(statue.image, 'assets/props/jjajang_statue.png');
  assert.ok(statue.solid && statue.script === 'jjajang_statue_talk' && !statue.unless, '막혀 있고 C 로 이야기, 사라지지 않는다');
  assert.equal(statue.iy + h, statue.y + statue.h, '그림 밑변 = 히트박스 밑변');
  assert.equal(statue.y + statue.h, map.meta.statue[1] * TILE, '밑변은 통로 아래·공터 위 경계');
  assert.ok(statue.x <= pc0 * TILE && statue.x + statue.w >= (pc1 + 1) * TILE, '히트박스가 통로 폭을 다 덮는다');
  assert.ok(statue.x >= statue.ix && statue.x + statue.w <= statue.ix + w, '히트박스는 그림 안(레이아웃 감사)');
  assert.ok(h >= 160 && h <= DIALOGUE_VISIBLE_H, `거대하지만(${h}px = 요플래 65px 의 ${(h / 65).toFixed(1)}배) 대화 중 보이는 높이 안`);
  assert.ok(statue.sortY > shade.sortY, '석상은 그림자 오버레이 위에 그린다(석상은 밝게, 뒤 통로만 어둡게)');
  // 카메라 목표: 카메라 위 = ty*32 - (SCREEN_H/2 - 16). 석상 전체가 대화창 위 230px 안에 들어와야 한다
  const camTop = STATUE_VIEW[1] * TILE - (SCREEN_H / 2 - TILE / 2);
  assert.ok(camTop >= 0 && camTop <= statue.iy - 4, `카메라 위(${camTop})가 석상 위(${statue.iy}) 위쪽`);
  assert.ok(statue.iy + h - camTop <= DIALOGUE_VISIBLE_H, '석상 밑변까지 대화창 위');
  assert.ok(Math.abs(STATUE_VIEW[0] * TILE + TILE / 2 - (statue.ix + w / 2)) <= 4, '카메라 가운데 = 석상 가운데');
  const [sw, sh] = pngSize(shade.image);
  assert.deepEqual([shade.solid, shade.w, shade.h, shade.ix, shade.iy], [false, 0, 0, pc0 * TILE - 16, 0], '그림자 오버레이는 막지 않고 통로 위에');
  assert.equal(sw, (pc1 - pc0 + 1) * TILE + 32); assert.ok(sh >= (pr1 + 1) * TILE, '통로 전체를 덮고 공터 첫 행에서 옅어진다');
  for (const p of map.entities.filter(e => e.type === 'prop' && /jjajang_pine_/.test(e.image))) {
    const c = Math.floor((p.x + 12) / 32), r = Math.floor((p.y + 6) / 32);
    assert.equal(rows[r][c], '@', `소나무 밑동 ${c},${r} 은 숲 칸`); assert.ok(p.ix >= 0 && p.iy >= 0);
  }
});

test('test_statue_doors_link_to_the_pine_forest_and_bgm_continues', () => {
  const west = map.entities.find(e => e.type === 'door');
  assert.deepEqual([west.to, west.spawn, west.x, west.w, west.y], ['jjajang_pines', 'from_east', 0, 10, 14 * TILE]);
  assert.ok(pines.spawns.from_east && pines.spawns.from_east.facing === 'left' && pines.spawns.from_east.x > 60 * TILE, '소나무 숲 오른쪽 끝 스폰');
  const east = pines.entities.find(e => e.id === 'pines_statue_door');
  assert.deepEqual([east.to, east.spawn, east.x, east.w], ['jjajang_statue', 'from_west', 64 * TILE - 10, 10], '소나무 숲 오른쪽 끝 10px → 석상 앞 숲');
  assert.equal(map.bgm, 'my_castle_town'); assert.ok(JJAJANG_AFTER_JOIN_MAPS.includes('jjajang_statue'));
  assert.equal(storyBgm('jjajang_statue', { torii_janitor_joined: true }), 'my_castle_town');
  assert.equal(map.vision, undefined); assert.equal(map.dim, 0.08);
  assert.equal(map.spawns.before_statue.facing, 'up'); assert.ok(map.spawns.before_statue.y > statue.y + statue.h);
  for (const id of ['jjajang_statue', 'jjajang_statue_front']) {
    const qa = QA_POINTS.find(p => p.id === id);
    assert.deepEqual(qa.party, ['janitor']); assert.ok(qa.flags.torii_janitor_joined && qa.flags.pines_ajimkiya_won, `${id}: 아짐키야 전투 뒤 상태`);
  }
});

test('test_statue_talk_script_order_lines_and_laughs', () => {
  const s = jjajang_statue_talk;
  assert.equal(SCRIPTS.jjajang_statue_talk, s);
  assert.equal(s[0].if({ jjajang_statue_told: true, torii_janitor_joined: true }), true);
  assert.equal(s[0].if({ torii_janitor_joined: true }), false);
  const texts = s.filter(n => n.text).map(n => n.text.replace(/^\* /, ''));
  assert.deepEqual(texts, [
    '여기 숲은', '{c=yellow}짜장숲{/c} 이라고 하네', '그리고 짜장숲 깊은곳에는', '누군가의 {c=purple}어둠의 힘{/c}에 잠식당하면',
    '아주 강력해지는 괴물이 될수있는 그릇의 인간이 살고있다는 말이 있네', '그래서 어떤 눈이 하나인 똑똑한 친구가 여기에', '그를 봉인하고 이 동상을 깔아뒀다하지', '껄껄',
    '아마 그는 안에서 자기혼자 왕국을 구축하려는 카더라도 있던거같던데 흠', '그런데 문제가 하나 있네', '그 어둠의 힘은 누군가가 부여하는것인데',
    '그것은 꼭 다른 방식으로도 전달될수있다네 받거나, 뭐 먹거나, 마시거나', '그리고 문제는', '이 숲 어딘가에 그 힘을 받은 짜장면이 존재한다고하네',
    '그 힘을 그 위험인물이 받게되면', '껄껄 너무 지나친 생각이였나.', '문제가 하나 더 있네', '이 동상을 깔게 된 순간 바다에 잠식해있던', '어떠한 악마가.',
    '이 숲에서 활동하기 시작했네', '... 드럼통의 악마라고 하지', '조심하게 그는 잔혹하고 강력하네', '내가 유일하게 제대로 기억하는',
    '미안하네 뭐 말이 너무 많았지 일단 이 동상때문에 지나갈 수 없으니', '오른쪽으로 가보는건 어떻겠나',
  ]);
  assert.ok(s.filter(n => n.text).every(n => n.speaker === '청소부' && n.voice === 'janitor' && n.portrait === 'janitor'), '전부 청소부 대사');
  const idx = pred => s.findIndex(pred);
  const bgmOff = idx(n => 'bgm' in n && n.bgm === null);
  const back = idx(n => Array.isArray(n.parallel) && n.parallel.length === 2 && n.parallel.every(b => b.move && b.by[0] === 0 && b.by[1] === 16));
  const faceUp = s.map((n, i) => (n.face && n.dir === 'up' ? i : -1)).filter(i => i >= 0);
  const cam = idx(n => n.camera === STATUE_VIEW), first = idx(n => n.text);
  assert.ok(bgmOff >= 0 && bgmOff < back && back < faceUp[0] && faceUp[1] < cam && cam < first, '브금 끔 → 둘 다 뒤로 → 위를 봄 → 카메라 → 대사');
  assert.deepEqual(s[back].parallel.map(b => b.move).sort(), ['janitor', 'player']);
  assert.deepEqual(faceUp.map(i => s[i].face).sort(), ['janitor', 'player']);
  const laughs = s.map((n, i) => (n.motion === 'janitor' && n.name === 'laugh' && n.sfx === 'laugh_janitor' ? i : -1)).filter(i => i >= 0);
  assert.equal(laughs.length, 2, '웃음은 껄껄 두 곳에만');
  assert.equal(s[laughs[0] - 1].text, '* 껄껄'); assert.equal(s[laughs[1] - 1].text, '* 껄껄 너무 지나친 생각이였나.');
  const last = s.map((n, i) => (n.text ? i : -1)).filter(i => i >= 0).pop();
  const told = idx(n => n.set?.jjajang_statue_told), camBack = idx(n => n.camera === 'player'), resume = idx(n => String(n.action).includes('resumeMapBgm')), regroup = idx(n => n.regroup);
  assert.ok(last < told && told < camBack && camBack < resume && resume < regroup, '끝: 플래그 → 카메라 복귀 → 브금 복귀 → 동료 정렬');
});
