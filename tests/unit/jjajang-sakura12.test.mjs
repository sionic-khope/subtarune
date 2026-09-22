// 벚꽃 숲 11 위쪽 길 · 벚꽃 숲 12 제단(BUILD284 사용자 “그다음맵 위에 길 뚫어주고 위에 길로 가면 브금 잠깐꺼지고 그냥 그렇게 넓진않음 위로 가면 이제 가운데에 작은잘린 나무 재단? 같은곳위에 보라색 짜장면이 오오라를 뛰면서 (보라색) 배치되게해줘”)
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { QA_POINTS } from '../../src/core/story.js';
import { SCRIPTS } from '../../src/data/scripts.js';
import { jjajang_sakura11_hush, jjajang_sakura11_unhush, HUSH_FADE } from '../../src/data/cutscenes/jjajang_sakura10.js';
import { jjajang_sakura12_bowl, DARK_JJAJANG_ITEM, DARK_JJAJANG_FLAG, EYES_CLOSED_FLAG, EYES, BOWL_ID } from '../../src/data/cutscenes/jjajang_sakura12.js';
import { ITEMS } from '../../src/data/items.js';
import { STATE_FROM_FLAGS } from '../../src/core/story.js';

const load = id => JSON.parse(readFileSync(new URL(`../../assets/maps/${id}.json`, import.meta.url), 'utf8'));
const here = rel => existsSync(new URL(`../../${rel}`, import.meta.url));
const ent = (m, id) => m.entities.find(e => e.id === id);

test('test_sakura11_has_an_upper_path_to_the_altar_map_and_the_doors_connect_both_ways', () => {
  const eleven = load('jjajang_sakura11'), twelve = load('jjajang_sakura12'), S = eleven.meta.sakura11;
  for (let row = 0; row < S.center[1]; row++) for (let col = S.pathCols[0]; col <= S.pathCols[1]; col++) assert.equal(eleven.rows[row][col], '-', `위쪽 길 (${col},${row})`);
  const n11 = ent(eleven, 'sakura11_north_door'), s12 = ent(twelve, 'sakura12_south_door');
  assert.deepEqual([n11.to, n11.spawn, n11.y, n11.x, n11.x + n11.w], ['jjajang_sakura12', 'from_south', 0, S.pathCols[0] * 32, (S.pathCols[1] + 1) * 32]);
  assert.deepEqual([s12.to, s12.spawn, s12.y + s12.h], ['jjajang_sakura11', 'from_north', twelve.rows.length * 32]);
  assert.deepEqual([eleven.spawns.from_north.facing, twelve.spawns.from_south.facing], ['down', 'up']);
  assert.ok(eleven.spawns.from_north.y >= n11.h && eleven.spawns.from_north.x >= n11.x && eleven.spawns.from_north.x + 24 <= n11.x + n11.w, '북쪽 스폰은 문 아래·길 폭 안');
  const trees = eleven.entities.filter(e => e.id.startsWith('sakura11_tree'));
  assert.ok(trees.every(t => !(t.y < S.center[1] * 32 && Math.abs(t.x + 12 - (S.center[0] + 0.5) * 32) < 96)), '위쪽 길 자리엔 나무 없음');
  assert.ok(trees.every(t => eleven.rows[Math.floor((t.y + 12) / 32)]?.[Math.floor((t.x + 12) / 32)] !== '-'), '밑동은 바닥 밖');
  // 위에 길로 가면 브금 잠깐 꺼지고(BUILD285): 길 위 끝 띠(hush, 문 바로 아래)는 sakura 를 끄고, 바닥 위 끝 띠(unhush)는 내려오면 sakura 다시. 북쪽 스폰은 두 띠 사이(돌아오면 sakura, 다시 올라갈 때 hush 를 밟는다)
  const hush = ent(eleven, 'sakura11_hush'), unhush = ent(eleven, 'sakura11_unhush');
  assert.deepEqual([hush.script, hush.x, hush.y, hush.w, hush.h, hush.once], ['jjajang_sakura11_hush', S.pathCols[0] * 32, S.hushRows[0] * 32, 3 * 32, (S.hushRows[1] - S.hushRows[0] + 1) * 32, undefined]);
  assert.deepEqual([unhush.script, unhush.y, unhush.h], ['jjajang_sakura11_unhush', S.unhushRows[0] * 32, (S.unhushRows[1] - S.unhushRows[0] + 1) * 32]);
  assert.ok(hush.y + hush.h <= unhush.y && unhush.y + unhush.h <= (S.center[1] + 1) * 32, 'hush 는 위, unhush 는 바닥 위 끝');
  assert.ok(hush.y >= n11.y + n11.h && eleven.spawns.from_north.y >= hush.y + hush.h && eleven.spawns.from_north.y + 16 <= unhush.y, 'hush 는 문 아래, 북쪽 스폰은 hush 와 unhush 사이');
  assert.equal(SCRIPTS.jjajang_sakura11_hush, jjajang_sakura11_hush); assert.equal(SCRIPTS.jjajang_sakura11_unhush, jjajang_sakura11_unhush);
  assert.deepEqual(jjajang_sakura11_hush, [{ bgm: null, fadeOut: HUSH_FADE }, { end: true }]);
  assert.deepEqual(jjajang_sakura11_unhush[0], { bgm: 'sakura', volume: 0.45, fadeIn: 0.6 }); assert.ok(jjajang_sakura11_unhush.at(-1).end);
});

test('test_sakura12_is_a_small_deck_with_its_own_bgm_and_a_stump_altar_holding_the_dark_jjajang_in_a_purple_aura', () => {
  const m = load('jjajang_sakura12'), S = m.meta.sakura12;
  assert.equal(m.bgm, 'shop3', '브금 shop3(사용자 지정 wsYUaus3RGI)'); assert.ok(here('assets/audio/bgm/shop3.mp3'), 'shop3.mp3');
  const deck = m.rows.join('').split('').filter(ch => ch === '-').length;
  assert.ok(deck >= 40 && deck <= 110 && m.rows.every(r => /^[@-]+$/.test(r)), `그리 넓지 않은 나무 바닥 (${deck}칸)`);
  for (let row = S.center[1]; row < m.rows.length; row++) for (let col = S.pathCols[0]; col <= S.pathCols[1]; col++) assert.equal(m.rows[row][col], '-', '아래 길');
  const stump = ent(m, 'sakura12_altar'), bowl = ent(m, 'sakura12_dark_jjajang');
  const sc = JSON.parse(readFileSync(new URL('../../assets/source/sakura12-v1/stump-contract.json', import.meta.url), 'utf8')), bc = JSON.parse(readFileSync(new URL('../../assets/source/sakura12-v1/bowl-contract.json', import.meta.url), 'utf8'));
  assert.ok(here(stump.image) && here(bowl.image) && m.preload.includes(stump.image) && m.preload.includes(bowl.image), '소품 그림·미리 적재');
  assert.deepEqual([stump.image, bowl.image, [stump.w, stump.h], stump.solid, bowl.solid], [sc.file, bc.file, [36, 14], true, false]);
  // 제단에 C → 짜장면 연출(BUILD288). 그루터기는 하나(플래그가 서도 남는다), 그릇만 재진입 때 없다
  assert.deepEqual([stump.script, stump.unless, stump.requires, bowl.unless, ent(m, 'sakura12_altar_after')], ['jjajang_sakura12_bowl', undefined, undefined, DARK_JJAJANG_FLAG, undefined]);
  assert.equal(m.rows[S.altar[1]][S.altar[0]], '-', '제단은 바닥 위');
  assert.ok(Math.abs(stump.ix + sc.size[0] / 2 - (S.altar[0] * 32 + 16)) <= 1 && stump.iy + sc.size[1] === S.altar[1] * 32 + 30, '그루터기는 제단 칸 가운데');
  assert.ok(Math.abs(bowl.ix + bc.size[0] / 2 - (stump.ix + sc.top[0])) <= 1 && Math.abs(bowl.iy + bc.size[1] - (stump.iy + sc.top[1] + 4)) <= 1, '그릇은 그루터기 윗면 가운데 위');
  assert.ok(bowl.sortY > stump.y + stump.h, '그릇은 늘 그루터기 앞에');
  assert.deepEqual(bowl.aura, S.aura); assert.ok(bowl.aura.rgb === '180,140,255' && bowl.aura.radius >= 24 && bowl.aura.pulse > 0, '보라 오라');
  const cx = S.center[0] * 32 + 16;
  assert.ok(Math.abs(stump.x + stump.w / 2 - cx) <= 16, '가운데');
  assert.ok(!m.entities.some(e => e.type === 'door' && e.id !== 'sakura12_south_door'), '문은 아래뿐');
  const trees = m.entities.filter(e => e.id.startsWith('sakura12_tree'));
  assert.ok(trees.length >= 6 && trees.every(t => m.rows[Math.floor((t.y + 12) / 32)]?.[Math.floor((t.x + 12) / 32)] === '@'), '둘레 나무 밑동은 바닥 밖');
  assert.ok(m.meta.petals && m.rows[0].split('').every(ch => ch === '@'), '꽃잎, 위쪽은 허공');
});

test('test_sakura12_qa_point', () => {
  const qa = QA_POINTS.find(q => q.id === 'jjajang_sakura12');
  assert.deepEqual([qa.map, qa.spawn, qa.party], ['jjajang_sakura12', 'from_south', []]); assert.ok(qa.flags.sakura8_split_done);
  const ids = QA_POINTS.map(q => q.id); assert.ok(ids.indexOf('jjajang_sakura12') > ids.indexOf('jjajang_sakura11'));
});

test('test_sakura12_bowl_scene_has_verbatim_lines_in_order_gives_the_item_and_closes_the_eyes', () => {
  const s = jjajang_sakura12_bowl; assert.equal(SCRIPTS.jjajang_sakura12_bowl, s);
  // 이미 얻었으면 첫 줄에서 끝으로(같은 방문에서 다시 C: 반복·중복 획득 없음)
  assert.ok(typeof s[0].if === 'function' && s[0].goto === 'after_item' && s[0].if({ [DARK_JJAJANG_FLAG]: true }) === true && s[0].if({}) === false && s.at(-2).label === 'end', '얻은 뒤엔 아이템 대사를 건너뛴다');
  const line = n => n.text ? [n.speaker || '나레이션', n.text.replace(/^\* /, '')] : null;
  assert.deepEqual(s.map(line).filter(Boolean), [
    ['짜장면', '안녕하세요'], ['짜장면', '왜요 짜장면이 말하면 안되는건가요? 프하하'], ['짜장면', '저는 짜장면이지만 어떠한 힘이 깃들어 있어서 말을 할 수 있어요'], ['짜장면', '저를 먹으면 강한 힘을 얻을 수 있을거에요'],
    ['짜장면', '...'], ['짜장면', '네? 가재맨이요? 전 그런거 몰라요~'], ['짜장면', '흠 어쨋든 저를 먹으실건가요?'], ['짜장면', '미안하지만 당신은 절 드실수 없을거에요'], ['짜장면', '저는 고춧가루가 들어가있거든요'],
    ['짜장면', '위염갖고계신분한테는 힘들거에요'], ['짜장면', '네? 저를 먹으려고 하는 나쁜사람이 있고'], ['짜장면', '그 사람이 절 먹으면 큰일난다구요?'], ['짜장면', '네 그래서 제가 지금 여기 있는거잖아요'],
    ['짜장면', '더 안전한 곳으로 데려다주신다구요? 알겠어요'], ['짜장면', '흥. 이번 한번만이에요'], ['나레이션', '{c=yellow}짜장면{/c}을 획득했다.'],
    ['짜장면', '근데 여기서 어떻게 나가실거에요?'], ['나레이션', '아 맞다.'], ['짜장면', '이럴땐 편한하게 다른사람들이 어디서 무엇을 하고있는지'], ['짜장면', '천천히 생각해보시는걸 추천해요'], ['나레이션', '...'], ['나레이션', '나는 눈을 감는다.'],
  ]);
  assert.ok(s.filter(n => n.text && n.speaker === '짜장면').every(n => n.voice === 'narrator' && n.portrait === 'dark_jjajang'), '짜장면 목소리는 나레이션과 같이');
  assert.ok(s.filter(n => n.text && !n.speaker).every(n => n.voice === 'narrator'), '나레이션');
  const idx = pred => s.findIndex(pred);
  const hello = idx(n => n.text === '* 안녕하세요'), ex1 = idx(n => n.emote === 'player' && n.kind === '!'), why = idx(n => n.text?.includes('프하하'));
  assert.ok(hello < ex1 && ex1 < why && s[ex1 - 1].action, '안녕하세요 → 요플래 느낌표 → 왜요');
  const last = idx(n => n.text?.includes('이번 한번만이에요')), gone = idx(n => n.remove === BOWL_ID), sfx = idx(n => n.sfx === 'item'), give = idx(n => n.action && String(n.action).includes("push('어둠의 짜장면')")), flag = idx(n => n.set?.[DARK_JJAJANG_FLAG]), got = idx(n => n.text?.includes('획득했다'));
  assert.ok(last < gone && gone < sfx && sfx < give && give < flag && flag < got, '흥 → 그릇 사라짐 → 아이템 소리 → 획득 → 플래그 → 획득했다');
  const how = idx(n => n.text?.includes('어떻게 나가실거에요')), ex2 = idx((n, i) => i > how && n.emote === 'player' && n.kind === '!'), ahMatda = idx(n => n.text === '* 아 맞다.');
  assert.ok(got < how && how < ex2 && ex2 < ahMatda, '(이후에) 근데 → 느낌표 → 아 맞다');
  const eyes = idx(n => n.text === '* 나는 눈을 감는다.'), fadeOut = idx((n, i) => i > eyes && n.fade === 'out'), hold = idx((n, i) => i > fadeOut && n.wait !== undefined), closed = idx(n => n.set?.[EYES_CLOSED_FLAG]), night = idx(n => n.map === 'jjajang_night_cliff');
  assert.ok(eyes < fadeOut && fadeOut < hold && hold < closed && closed < night && s.at(-1).end === true, '눈을 감는다 → 어두워짐 → 잠깐 → 플래그 → 밤 절벽 장면');
  assert.deepEqual([s[fadeOut].duration, s[hold].wait, s[night].spawn, s[night].enter], [EYES.fadeOut, EYES.hold, 'scene', true]);
  assert.ok(!s.some(n => n.fade === 'in'), '밤 절벽 도착 스크립트가 검은 화면을 열어 제단이 잠깐 비치지 않음');
  assert.equal(DARK_JJAJANG_ITEM, '어둠의 짜장면'); assert.equal(ITEMS[DARK_JJAJANG_ITEM].kind, 'key', '먹을 수 없는 중요 아이템');
  assert.deepEqual(STATE_FROM_FLAGS.find(r => r.flag === DARK_JJAJANG_FLAG)?.items, [DARK_JJAJANG_ITEM], 'QA 도 플래그로 아이템 유도');
  assert.ok(here('assets/portraits/dark_jjajang.png'), '짜장면 초상화(그릇 그림에서)');
  const qa = QA_POINTS.find(q => q.id === 'jjajang_sakura12_after'); assert.ok(qa.flags[DARK_JJAJANG_FLAG] && qa.flags[EYES_CLOSED_FLAG] && qa.spawn === 'from_south');
});
