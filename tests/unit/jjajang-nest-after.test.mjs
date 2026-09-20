// 드럼통의 악마 보스전 뒤 연출(BUILD254, design/narrative/cutscenes/jjajang_nest_after.md): 대사 원문·순서, 플래그, 동상 맵의 파괴 전후 필터, 깊은숲 입구 맵
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { SCRIPTS } from '../../src/data/scripts.js';
import { jjajang_nest_drum } from '../../src/data/cutscenes/drum_devil.js';
import { jjajang_nest_after, jjajang_statue_return, ISLAND_ZOOM, RAMP, SHIP_HIT_DX, SHIP_THROUGH_DX, SHIP_RUSH, SHIP_HIT_AT } from '../../src/data/cutscenes/jjajang_nest_after.js';
import { QA_POINTS, STATE_FROM_FLAGS, partyFromFlags } from '../../src/core/story.js';
import { CHARACTERS } from '../../src/data/characters.js';
import { CHARACTER_MOTIONS } from '../../src/data/character-motions.js';
import { MAP_RUNTIME_ASSETS } from '../../src/data/map-runtime-assets.js';

const load = id => JSON.parse(readFileSync(new URL(`../../assets/maps/${id}.json`, import.meta.url), 'utf8'));
const flatten = list => list.flatMap(node => [node, ...flatten(node.parallel || node.async || [])]);
const texts = list => flatten(list).filter(n => n.text).map(n => `${n.speaker || '나레이션'}: ${n.text.replace(/^\* /, '')}`);

test('test_boss_battle_sets_the_win_flag_and_the_after_scene_follows_it', () => {
  const battleAt = jjajang_nest_drum.findIndex(n => n.battle);
  assert.equal(jjajang_nest_drum[battleAt].battle.flag, 'drum_devil_won');
  assert.deepEqual(jjajang_nest_drum.slice(battleAt + 1, battleAt + 1 + jjajang_nest_after.length), jjajang_nest_after);
  assert.equal(SCRIPTS.jjajang_nest_after, jjajang_nest_after);
  assert.equal(SCRIPTS.jjajang_statue_return, jjajang_statue_return);
  assert.equal(SCRIPTS.drum_devil_battle_qa.length, 1 + jjajang_nest_after.length, '전투 직행 QA 도 승리 뒤 연출까지');
  const guard = jjajang_nest_after[0];
  assert.ok(typeof guard.if === 'function' && !guard.if({ drum_devil_won: true }) && guard.if({}), '승리 플래그가 없으면 연출을 건너뛴다');
  assert.ok(STATE_FROM_FLAGS.some(r => r.flag === 'drum_devil_won' && r.enemies.join() === 'drum_devil'));
});

test('test_after_scene_lines_are_the_briefing_verbatim_in_order', () => {
  const nest = texts(jjajang_nest_after.slice(0, jjajang_nest_after.findIndex(n => n.map)));
  assert.deepEqual(nest, [
    '청소부: 껄껄', '청소부: 드디어 쓰러트렸구만', '청소부: 고맙네 자네가 아니였으면 기습을 못했을거였고 쓰러트리지도 못했을거라네', '나레이션: ...',
    '청소부: 할말이 많은 표정이구먼, 뭐 어떤가', '청소부: 멸공의 깃발', '청소부: 그게 나의 이명이라네,', '청소부: 껄껄', '청소부: 그리고 좋은일은 연속으로 일어나는 것 아니겠나.',
  ]);
  const statue = texts(jjajang_statue_return);
  assert.deepEqual(statue, [
    '나레이션: 동상쪽으로 온것같다 뭐지',
    '청소부: 뭐 앞으로의 싸움에서', '청소부: 꼭 너 혼자만의 힘으로 적을 쓰러트리려고 할 필요 없네', '청소부: 때론 누군가에게 도움을 받는것도 상책이니',
    '청소부: ... 사실 난 {w=1.0}기억같은거 잃은적 없다네, 자네',
    '청소부: 자식을 구분하지못하는 부모가 어디있겠는가', '청소부: 첫눈에 너가 누군지 바로 알아봤다네,', '청소부: 꼭 좀 구해줬으면 좋겠네 우리아들을, 젊은이.',
    '영클: ㅋㅋ', '영클: 저 동상엔 파괴후 감지장치가아니라', '영클: 애초에 카메라를 달아뒀다 게이야', '영클: 요플래 너가 이 카메라에 비춰진순간', '영클: 바로 여기로 좌표찍고 존나달려왔음 ㅇㅇ',
    '억빠맨: 요플래 괜찮아요?', '경섭: 허허 무사해서 다행이네', '나레이션: 모두들...', '영클: ㅋㅋ',
    '영클: 방해해서 미안하노', '영클: 뭐 어쨋든 다시 모였으니 다행이네', '영클: 지금 쥰희랑 용준이는 그 기괴한 성 침공을 위해 무기개발들에 투입되고있음',
    '영클: 니도 알겠지만 그 미친 성을 공략하려면 준비가 필요함 ㅇㅇ 그래서 시간좀 걸릴듯', '영클: 그래서 말인데, 저 짜장숲 깊이에 살고있는 어떠한 그릇의 재앙급의 인물이 살고있음',
    '영클: 기다리는동안 수련겸 토벌하고 오던가 ㅇㅇ', '영클: 아.', '영클: 그래도 그 {c=purple}어둠의짜장면{/c}을 먹게해선 안돼.', '영클: 뭐 알아서 잘 할거라고 믿음 ㅇㅇ',
    '억빠맨: 다행이네요 형.', '경섭: 우리 파티가 다시 복귀되었군 한번 가볼까?', '나레이션: {c=yellow}억빠맨{/c}과 {c=yellow}경섭{/c}이 다시 동료가 되었다',
  ]);
  // 영클 줄은 TV 초상화·목소리, 청소부는 janitor 초상화
  for (const n of flatten(jjajang_statue_return).filter(n => n.speaker === '영클')) assert.ok(/^youngcle_tv_/.test(n.portrait) && n.voice === 'youngcle');
  for (const n of flatten(jjajang_nest_after).filter(n => n.speaker === '청소부')) assert.deepEqual([n.portrait, n.voice], ['janitor', 'janitor']);
});

test('test_after_scene_beats_follow_the_briefing_order', () => {
  const flat = flatten(jjajang_nest_after);
  const at = pred => flat.findIndex(pred);
  const idx = {
    remove: at(n => n.remove === 'drum_devil'), faceBack: at(n => n.face === 'player' && n.dir === 'left'),
    firstLaugh: at(n => n.motion === 'janitor_hero' && n.name === 'laugh'), emote: at(n => n.emote === 'player'),
    approach: at(n => n.move === 'janitor_hero' && n.rel === 'player'), rise: at(n => n.rise), whiteOut: at(n => n.fade === 'white'), map: at(n => n.map === 'jjajang_statue'),
    drop: at(n => Array.isArray(n.drop) && n.drop.includes('player') && n.drop.includes('janitor_hero')),
    vanish: at(n => n.slide === 'janitor_hero'), heroGone: at(n => n.remove === 'janitor_hero'), bubble: at(n => n.bubble === 'player'),
    quake: flat.findIndex((n, i) => n.shake && i > at(n2 => n2.bubble === 'player')), alarm: flat.findIndex((n, i) => n.emote === 'player' && i > at(n2 => n2.bubble === 'player')), lookRight: at(n => n.face === 'player' && n.dir === 'right'),
    ship: at(n => n.show === 'youngcle_warship'), boom: at(n => n.boom?.sheet && n.boom.at === 'jjajang_statue'), statueGone: at(n => n.remove === 'jjajang_statue'),
    hop: at(n => n.hop === 'player'), back: at(n => n.move === 'player' && n.by), picture: at(n => n.picture?.src), youngcleBgm: at(n => n.bgm === 'storage_show'),
    ramp: at(n => n.sfx === 'chain_extend'), pictureOff: at(n => n.picture === null), partyDrop: at(n => n.drop === 'ppaman'), secondDrop: at(n => n.drop === 'gyeongsub'),
    tvDown: at(n => n.slide === 'youngcle_tv' && n.by[1] > 0), tvOpen: at(n => n.fold === 'youngcle_tv' && n.to === 1), bgmOff: at(n => n.bgm === null),
    tvClose: at(n => n.fold === 'youngcle_tv' && n.to < 1), tvUp: at(n => n.slide === 'youngcle_tv' && n.by[1] < 0), shine: at(n => n.sfx === 'great_shine'),
    whiteEnd: flat.findLastIndex(n => n.fade === 'white'), set: at(n => n.set?.statue_destroyed && n.set?.party_regrouped), joinG: at(n => n.join === 'gyeongsub'), joinP: at(n => n.join === 'ppaman'),
    reload: flat.findLastIndex(n => n.map === 'jjajang_statue'),
  };
  const order = Object.keys(idx);
  for (const key of order) assert.ok(idx[key] >= 0, `${key} 노드가 있다`);
  for (let i = 1; i < order.length; i++) assert.ok(idx[order[i]] > idx[order[i - 1]], `${order[i - 1]} → ${order[i]} 순서`);
  // “아. (브금꺼짐)”: 브금 끄기는 “아.” 바로 뒤, 어둠의짜장면 줄 앞
  const ah = at(n => n.text === '* 아.'), dark = at(n => /어둠의짜장면/.test(n.text || ''));
  assert.ok(ah < idx.bgmOff && idx.bgmOff < dark);
  assert.ok(idx.youngcleBgm < at(n => n.text === '* ㅋㅋ'), '영클 브금은 ㅋㅋ 와 함께');
  assert.ok(idx.picture < idx.youngcleBgm && idx.ramp < idx.pictureOff, '전경 위에서 영클 대사·다리·점, 그 다음 맵으로');
  assert.deepEqual(ISLAND_ZOOM.to, [0, 0, 960, 720]); assert.ok(ISLAND_ZOOM.from[2] < 960, '클로즈업에서 섬 전체로 축소');
  assert.ok(RAMP.walkAt >= RAMP.lower, '다리가 다 내려온 뒤 점이 내려온다');
  const ppamanDrop = flat[idx.partyDrop], gyeongsubDrop = flat[idx.secondDrop];
  assert.deepEqual([ppamanDrop.sfx, ppamanDrop.land, gyeongsubDrop.sfx, gyeongsubDrop.land], ['jump', 'thud', 'jump', 'thud'], '점프 소리와 함께 떨어진다');
  assert.ok(ppamanDrop.duration >= 0.9 && gyeongsubDrop.duration >= 0.9, '천천히 내려온다(사용자 2026-09-20)');
  const firstLine = at(n => n.text === '* 요플래 괜찮아요?');
  assert.ok(idx.partyDrop < idx.secondDrop && idx.secondDrop < firstLine, '억빠맨 착지 → 경섭 착지 → 대사');
  assert.ok(idx.map < idx.drop && flat[idx.map].spawn === 'after_crash');
  // 전함은 멈추지 않고 한 번에(슬라이드 하나) 들어오고, 폭발·석상 제거·점프·뒷걸음은 뱃머리가 닿는 시각에 비동기로(사용자 2026-09-20)
  const rush = flat.find(n => n.slide === 'youngcle_warship');
  assert.equal(flat.filter(n => n.slide === 'youngcle_warship').length, 1, '전함 슬라이드는 하나');
  assert.equal(rush.by[0], SHIP_HIT_DX + SHIP_THROUGH_DX); assert.equal(rush.duration, SHIP_RUSH);
  assert.ok(SHIP_HIT_AT > 0 && SHIP_HIT_AT < SHIP_RUSH && Math.abs(SHIP_HIT_AT - SHIP_RUSH * SHIP_HIT_DX / rush.by[0]) < 0.01, '닿는 순간 = 슬라이드 시간 × 석상까지 비율');
  const hitWait = flat.find(n => n.wait === SHIP_HIT_AT); assert.ok(hitWait, '뱃머리가 닿을 때까지 기다린 뒤 폭발');
  assert.ok(flat[idx.back].facing === 'right', '뒷걸음 중에도 오른쪽(전함)을 본다');
});

test('test_hero_form_reuses_battle_art_and_is_hidden_in_both_maps', () => {
  const hero = CHARACTERS.janitor_hero;
  assert.deepEqual([hero.still, hero.stillPivot, hero.portrait], ['assets/battle/janitor-hero-stand.png', [138, 180], false]);
  assert.ok(existsSync(new URL(`../../${hero.still}`, import.meta.url)));
  assert.equal(CHARACTER_MOTIONS.janitor_hero.idle, undefined, '필드 대기는 정지 그림(stand) — 깃발 흔드는 시트는 전투 스프라이트(사용자 2026-09-20)');
  const laugh = CHARACTER_MOTIONS.janitor_hero.laugh;
  assert.equal(laugh.src, 'assets/battle/janitor-hero-laugh.png'); assert.equal(laugh.scale, hero.stillScale);
  assert.ok(!flatten(jjajang_nest_after).some(n => n.motion === 'janitor_hero' && n.name === 'idle'));
  assert.ok(Math.round(192 * hero.stillScale * 1.43) === 128, '필드 키 = 128px 셀 상당(요플래의 약 2배)');
  for (const id of ['jjajang_nest', 'jjajang_statue']) {
    const npc = load(id).entities.find(e => e.id === 'janitor_hero');
    assert.ok(npc && npc.hidden && npc.solid === false && npc.sprite === 'janitor_hero' && npc.unless === 'party_regrouped', `${id}: 숨은 청소부 영웅`);
    assert.ok(MAP_RUNTIME_ASSETS[id].sprites.includes('janitor_hero') && MAP_RUNTIME_ASSETS[id].sprites.includes('janitor'), `${id}: 청소부 걷기 시트도 실어야 초상화가 난다`);
  }
  const nest = load('jjajang_nest');
  for (const id of ['jjajang_nest_drum', 'drum_devil']) assert.equal(nest.entities.find(e => e.id === id).unless, 'drum_devil_won', `${id}: 승리 뒤엔 놓이지 않는다`);
});

test('test_statue_map_switches_from_statue_to_rubble_and_opens_the_north_door', () => {
  const m = load('jjajang_statue'), by = id => m.entities.find(e => e.id === id);
  assert.equal(by('jjajang_statue').unless, 'statue_destroyed');
  const rubble = m.entities.filter(e => /^jjajang_rubble_/.test(e.id));
  assert.equal(rubble.length, 5); assert.ok(rubble.every(r => r.requires === 'statue_destroyed'));
  assert.equal(rubble.filter(r => r.solid).length, 2, '큰 더미 둘만 막는다');
  for (const r of rubble.filter(r => r.solid)) assert.ok(r.x + r.w <= 28 * 32 || r.x >= 30 * 32, `${r.id}: 가운데 길(28~29열)은 비운다`);
  for (const r of rubble) assert.ok(existsSync(new URL(`../../${r.image}`, import.meta.url)), r.image);
  const door = by('statue_deep_door');
  assert.deepEqual([door.to, door.spawn, door.y, door.h], ['jjajang_deep', 'from_south', 32, 10]);
  assert.ok(door.x <= 27 * 32 && door.x + door.w >= 31 * 32, '통로 폭을 덮는다');
  assert.equal(m.meta.blockedClearedBy, 'statue_destroyed');
  assert.ok(m.spawns.after_crash && m.spawns.from_deep && m.spawns.from_deep.y < 3 * 32);
  for (const id of ['ppaman', 'gyeongsub']) { const npc = by(id); assert.ok(npc.hidden && npc.unless === 'party_regrouped' && npc.sprite === id, id); }
  const ship = by('youngcle_warship'), tv = by('youngcle_tv'), arm = by('youngcle_tv_arm');
  assert.ok(ship.hidden && ship.x >= 60 * 32 && ship.image === 'assets/props/youngcle-warship-left.png' && ship.unless === 'party_regrouped', '전함은 맵 오른쪽 밖에 숨어 있다');
  assert.ok(existsSync(new URL(`../../${ship.image}`, import.meta.url)));
  assert.ok(tv.hidden && tv.foldX < 0.1 && tv.y < 0 && arm.hidden && arm.y < tv.y, 'TV·모니터암은 접힌 채 화면 위에');
  assert.ok(m.preload.includes('assets/illustrations/jjajang_island_crash.png'));
  assert.ok(existsSync(new URL('../../assets/illustrations/jjajang_island_crash.png', import.meta.url)));
});

test('test_deep_forest_entrance_is_a_dark_upward_path_with_one_spring', () => {
  const m = load('jjajang_deep');
  assert.deepEqual([m.bgm, m.dim, m.stage], ['wind', 0.06, 'ship_sinking_done']);
  const H = m.rows.length;
  for (let r = 1; r < H - 1; r++) assert.ok(m.rows[r][9] === 'U' && m.rows[r][10] === 'U' && m.rows[r][8] === '@' && m.rows[r][11] !== 'U' || (r >= 16 && r <= 17), `위로 가는 길 하나 ${r}`);
  assert.ok(m.rows[0][9] === '^' && m.rows[0][10] === '^' && [...m.rows[0]].filter(ch => ch !== '@').length === 2, '윗줄 가운데 두 칸만 출입구(BUILD257 빛 드는 공터로)');
  assert.ok(m.rows[H - 1][9] === '^' && m.rows[H - 1][10] === '^');
  const spring = m.entities.find(e => e.script === 'jjajang_spring');
  assert.ok(spring && spring.image === 'assets/props/blue_buff.png' && spring.solid, '마법의샘 하나');
  assert.equal(m.entities.filter(e => e.script === 'jjajang_spring').length, 1);
  const [sc, sr] = m.meta.spring; assert.ok(m.rows[sr][sc] === 'U' && m.rows[sr][sc - 1] === 'U', '나들목 위');
  const pines = m.entities.filter(e => /jjajang_pine_dark_/.test(e.image));
  assert.ok(pines.length >= 20 && pines.every(p => existsSync(new URL(`../../${p.image}`, import.meta.url))), '어두운 소나무');
  const door = m.entities.find(e => e.id === 'deep_statue_door'), north = m.entities.find(e => e.id === 'deep_glade_door');
  assert.deepEqual([door.to, door.spawn, door.y], ['jjajang_statue', 'from_deep', H * 32 - 10]);
  assert.deepEqual([north.to, north.spawn, north.y], ['jjajang_glade', 'from_south', 0], '위 문 → 빛 드는 공터(BUILD257)');
  assert.equal(m.entities.filter(e => e.type === 'door').length, 2, '문은 아래·위 둘');
});

test('test_party_and_qa_points_after_the_regroup', () => {
  assert.deepEqual(partyFromFlags({ ship_sinking_done: true, torii_janitor_joined: true, janitor_left: true, party_regrouped: true }), ['gyeongsub', 'ppaman']);
  assert.deepEqual(partyFromFlags({ ship_sinking_done: true, torii_janitor_joined: true, janitor_left: true }), []);
  const qa = id => QA_POINTS.find(p => p.id === id);
  assert.deepEqual([qa('jjajang_nest_after').script, qa('jjajang_nest_after').flags.drum_devil_won, qa('jjajang_nest_after').party], ['jjajang_nest_after', true, []]);
  assert.deepEqual([qa('jjajang_statue_return').map, qa('jjajang_statue_return').spawn, qa('jjajang_statue_return').script], ['jjajang_statue', 'after_crash', 'jjajang_statue_return']);
  for (const id of ['jjajang_statue_after', 'jjajang_deep']) {
    const p = qa(id); assert.ok(p.flags.statue_destroyed && p.flags.party_regrouped && p.flags.drum_devil_won); assert.deepEqual(p.party, ['gyeongsub', 'ppaman']);
  }
});
