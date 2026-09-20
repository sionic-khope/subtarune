// 벚꽃 숲 7(BUILD278): 오른쪽 2초 → 넓은 들 · 맨 위 결혼식 나무 무대 · 관객 가순이들 · 무대 연출(어둠·치지직·나레이션·브금·스포트라이트·점례·말풍선·가면 최미스·도미조림 난입·가면 벗겨짐·관객 난동·박치기) · 문 연결 · 대사 원문 · QA · 자산 · 새 엔진 노드
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { SCRIPTS } from '../../src/data/scripts.js';
import { jjajang_sakura7_scene, PARTY, CROWD, THROWS, STAGE_VIEW, CROWD_VIEW, RIGHT_ROAD_VIEW, DARK, SPOT, PARTY_SPOTS, JEOMNYE_SPOT, JEOMNYE_STEPS, CHOIMIS_SPOT, SLOW, FALL, BOUNCE, MASK_OFF, RIOT, SCENE_BGM, MAP_BGM, SAKURA7_SCENE_FLAG } from '../../src/data/cutscenes/jjajang_sakura7.js';
import { CHARACTERS } from '../../src/data/characters.js';
import { QA_POINTS } from '../../src/core/story.js';
import { MAP_RUNTIME_ASSETS } from '../../src/data/map-runtime-assets.js';
import { TextBalloon } from '../../src/ui/bubble.js';

const load = id => JSON.parse(readFileSync(new URL(`../../assets/maps/${id}.json`, import.meta.url), 'utf8'));
const here = rel => existsSync(new URL(`../../${rel}`, import.meta.url));
const SCREEN_H = 360, DIALOGUE_VISIBLE = 230;
const camY = view => view[1] * 32 - 164;   // { camera:[tx,ty] } → cam.y = ty*32 - 164
const line = n => n.text && !n.balloon ? [n.speaker || '나레이션', n.text.replace(/^\* /, '')] : null;   // 글 말풍선(balloon)은 대사 상자 줄이 아니다
const idx = (s, pred) => s.findIndex(pred);
const deep = (s, pred) => s.some(n => pred(n) || (Array.isArray(n.parallel) && n.parallel.flat(3).some(pred)) || (Array.isArray(n.async) && n.async.some(pred)));

test('test_sakura7_map_is_a_two_second_road_into_a_tall_field_with_a_wedding_stage_and_an_upward_facing_crowd', () => {
  const m = load('jjajang_sakura7'), S = m.meta.sakura7, stage = m.entities.find(e => e.id === 'wedding_stage');
  for (const row of S.roadRows) { assert.equal(m.rows[row][0], ')', '서쪽 끝 길'); assert.equal(m.rows[row].at(-1), ')', '동쪽 끝 오른쪽 길'); }
  const roadLen = S.fieldCols[0] - S.entryCols[0]; assert.ok(roadLen * 32 / 121 >= 2 && roadLen * 32 / 121 <= 3.2, `길 2초쯤(걷기 ${(roadLen * 32 / 121).toFixed(1)}초)`);
  assert.ok((S.fieldRows[1] - S.fieldRows[0]) > (S.fieldCols[1] - S.fieldCols[0]) * 0.9, '세로로 꽤 긴 들');
  // 무대: 들 맨 위 가운데, 판자 위에 배우가 그려지고(sortY -1) 앞면은 막힘, 무대 자리는 막힌 땅
  assert.deepEqual([stage.ix, stage.iy, stage.sortY, stage.solid, stage.image], [S.stage[0], S.stage[1], -1, true, 'assets/props/wedding_stage.png']); assert.ok(here(stage.image));
  assert.ok(stage.y >= S.stageFloor[1] - 4 && stage.y + stage.h > S.stageFloor[1], '히트박스는 판자 앞면');
  assert.equal(m.rows[5][22], '@', '무대 자리는 못 올라간다');
  // 스포트라이트·배우 자리는 판자 위, 일행 자리는 관객 뒤 가운데, 카메라 무대 뷰 안(대화 중 보이는 230px 안에 무대·배우)
  assert.deepEqual([S.spot, S.jeomnyeSpot, S.choimisSpot, S.partySpots], [SPOT, JEOMNYE_SPOT, CHOIMIS_SPOT, { player: PARTY_SPOTS.player, gyeongsub: PARTY_SPOTS.gyeongsub, ppaman: PARTY_SPOTS.ppaman }]);
  const top = camY(STAGE_VIEW);
  assert.ok(S.stageFloor[0] >= top && S.stageFloor[1] <= top + DIALOGUE_VISIBLE && JEOMNYE_SPOT[1] + 16 <= top + DIALOGUE_VISIBLE && SPOT.y <= top + DIALOGUE_VISIBLE, '무대·배우·스포트라이트는 대화창 위');
  for (const [id, [x, y]] of Object.entries(PARTY_SPOTS)) assert.ok(y + 16 <= top + SCREEN_H && y - 60 >= top, `${id} 자리는 무대 뷰 안`);
  const crowd = m.entities.filter(e => e.id.startsWith('crowd_')); assert.equal(crowd.length, 14);
  for (const c of crowd) { assert.deepEqual([c.facing, c.wander, c.hidden], ['up', 0, undefined]); assert.ok(/^gasuni[1-6]$/.test(c.sprite)); assert.ok(c.y > S.stageFloor[1] && c.y + 16 < PARTY_SPOTS.player[1], `${c.id} 는 무대 아래·일행 위`); }
  const throws = m.entities.filter(e => e.id.startsWith('throw_')); assert.equal(throws.length, 14);
  for (const t of throws) { assert.ok(t.hidden && !t.solid && here(t.image), t.id); assert.ok(m.preload.includes(t.image), '던질 것 그림 미리 적재'); }
  for (const id of ['jeomnye', 'choimis', 'choimis_bare', 'domijorim', 'discord_mask']) { const e = m.entities.find(x => x.id === id); assert.ok(e.hidden && e.unless === SAKURA7_SCENE_FLAG, `${id} 숨김·연출 뒤 없음`); }
  assert.deepEqual([m.entities.find(e => e.id === 'choimis').sprite, m.entities.find(e => e.id === 'choimis_bare').sprite, m.entities.find(e => e.id === 'jeomnye').sprite], ['choimis_masked', 'choimis', 'jeomnye']);
  const t = m.entities.find(e => e.id === 'sakura7_scene_trigger');
  assert.deepEqual([t.once, t.unless, t.script, t.x, t.y], [true, SAKURA7_SCENE_FLAG, 'jjajang_sakura7_scene', S.sceneCols[0] * 32, S.roadRows[0] * 32]);
  assert.ok(m.spawns.before_scene.x + 24 < t.x && m.spawns.before_scene.y === S.roadY, '들머리 QA 자리는 트리거 왼쪽');
});

test('test_sakura7_doors_connect_both_ways_with_sakura6', () => {
  const six = load('jjajang_sakura6'), seven = load('jjajang_sakura7');
  const east = six.entities.find(e => e.id === 'sakura6_east_door'), west = seven.entities.find(e => e.id === 'sakura7_west_door');
  assert.deepEqual([east.to, east.spawn, east.x + east.w], ['jjajang_sakura7', 'from_west', six.rows[0].length * 32]);
  assert.deepEqual([west.to, west.spawn, west.x], ['jjajang_sakura6', 'from_east', 0]);
  assert.deepEqual([six.spawns.from_east.facing, seven.spawns.from_west.facing], ['left', 'right']);
});

test('test_sakura7_scene_beats_in_order_with_verbatim_lines', () => {
  const s = jjajang_sakura7_scene; assert.equal(SCRIPTS.jjajang_sakura7_scene, s);
  assert.deepEqual(s.map(line).filter(Boolean), [
    ['나레이션', '지금부터 그남자와 그여자의 무대를 시작하겠습니다.'],
    ['점례', '아 외로워'], ['점례', '나의 외로움을 달래줄 어떤이가 없는것인가'], ['점례', '흑흑흑'], ['점례', '오늘도 나는 천천히'], ['점례', '하루를 보내다 잠에 들겠지.'],
    ['최미스', '안녕.'], ['최미스', '나 가재맨방 고닉. 최미스'], ['점례', '헐 가재맨 방 고닉???'], ['최미스', '스읍 미스'], ['최미스', '혹시 너 뭐해?'], ['점례', '나? 나 그냥.. 아무것도.'],
    ['최미스', '혹시'], ['최미스', '난 너가 마음에 들어.'], ['점례', '헉!'], ['최미스', '스읍..'], ['최미스', '나랑 진지하게...'], ['최미스', '..후훗.. 이런말 부끄럽군'], ['점례', '두근두근..'], ['최미스', '나랑.. 사귀'],
    ['도미조림', '흐미!!!!!!! 내 홍어 어디갔당가!!!'], ['점례', '이게뭐지.'], ['점례', '혹시 땡떙씨'], ['점례', '...?'], ['가순이들', '....?'], ['최미스', '어 하이.'],
    ['최미스', '아 시발. 점례야'], ['점례', '꺼져 씨발새끼야'], ['억빠맨', 'ㅋㅋㅋ'], ['경섭', '아이고 저런'], ['억빠맨', 'ㅈㄴ웃긴데요 ㅋㅋ'], ['경섭', '일단 뭐.. 가볼까? 오른쪽에 길이 있네.'],
  ]);
  // 느낌표 → 카메라 천천히 무대 → 셋이 가운데로(위를 봄) → 점차 어두워짐(맵 브금도 같이) → 치지직 ×2 → 나레이션 → 브금 → 스포트라이트 쾅 → 점례 등장
  assert.ok(s[0].parallel.filter(x => x.emote && x.kind === '!').length === 3, '셋 느낌표');
  const cam = idx(s, n => n.camera === STAGE_VIEW), walk = idx(s, n => n.parallel?.some(x => x.move === 'player' && x.px === PARTY_SPOTS.player && x.run));
  const dim = idx(s, n => n.parallel?.some(x => x.dim === DARK.dim && x.duration >= 2) && n.parallel?.some(x => x.bgm === null && x.fadeOut >= 1));
  const statics = s.map((n, i) => n.sfx === 'static_burst' ? i : -1).filter(i => i >= 0), narr = idx(s, n => n.text?.includes('그남자와 그여자의 무대'));
  const bgm = idx(s, n => n.bgm === SCENE_BGM), spot = idx(s, n => n.parallel?.some(x => x.spotlight === SPOT) && n.parallel?.some(x => x.sfx === 'boom') && n.parallel?.some(x => x.shake));
  const show = idx(s, n => n.show === 'jeomnye'), enter = idx(s, n => n.move === 'jeomnye' && n.px === JEOMNYE_SPOT && n.speed <= SLOW.jeomnye && n.exact);
  assert.ok(cam === 1 && s[cam].duration >= 2 && walk > cam && dim > walk && statics.length === 2 && statics[0] > dim && statics[1] > statics[0] && narr > statics[1] && bgm > narr && spot > bgm && show > spot && enter > show);
  // 한 줄마다 한 걸음(천천히 걷기)
  const jl = ['아 외로워', '나의 외로움을', '흑흑흑', '오늘도 나는', '하루를 보내다'].map(t => idx(s, n => n.text?.includes(t)));
  jl.forEach((li, i) => { const mv = s[li - 2]; assert.ok(mv.move === 'jeomnye' && mv.px === JEOMNYE_STEPS[i] && mv.speed <= SLOW.jeomnye, `${i + 1}번째 줄 앞 한 걸음`); });
  assert.ok(JEOMNYE_STEPS.every(([x]) => Math.abs(x - SPOT.x) <= SPOT.rx - 20), '걸음은 스포트라이트 안');
  // 최미스 말풍선만(어둠 속) → 점례 느낌표·오른쪽 → 최미스 천천히 → 대사 → 스읍 미스(클립 + 가면 seup) → 나랑.. 사귀는 자동 넘김(중간에 치고 들어옴)
  const bal = idx(s, n => n.balloon === 'choimis'), em = idx(s, n => n.emote === 'jeomnye' && n.kind === '!'), fr = idx(s, n => n.face === 'jeomnye' && n.dir === 'right'), cm = idx(s, n => n.move === 'choimis' && n.px === CHOIMIS_SPOT && n.speed <= SLOW.choimis);
  assert.ok(bal > jl[4] && s[bal].say === '아니. 그대여.' && s[bal].text === undefined && em > bal && fr > em && cm > fr && s[idx(s, n => n.show === 'choimis')] && idx(s, n => n.show === 'choimis') < bal);
  const seup = idx(s, n => n.async?.some(x => x.sfx === 'choimis_seup_miss') && n.async?.some(x => x.motion === 'choimis' && x.name === 'seup'));
  assert.ok(seup > 0 && s[seup + 1].text === '* 스읍 미스' && s[seup + 1].voice === 'none');
  const sagwi = s.find(n => n.text === '* 나랑.. 사귀'); assert.ok(sagwi.auto > 0 && sagwi.auto < 1, '중간에 치고 들어옴(자동 넘김)');
  // 도미조림 하늘에서 쿵(thud+흔들림) → 닿자마자 가면 벗겨짐(점례 뒤로)·최미스 뒷모습 넘어짐 → 흐미(자세+클립) → 통통 튀어 도망 → 사라짐
  const fall = idx(s, n => n.parallel?.some(x => x.hop === 'domijorim' && x.height === 0 && x.by[1] === -FALL.from) && n.parallel?.some(b => Array.isArray(b) && b.some(x => x.sfx === 'thud')));
  const off = idx(s, n => n.parallel?.some(x => x.hop === 'discord_mask' && x.keep && x.by === MASK_OFF.by) && n.parallel?.some(x => x.motion === 'domijorim' && x.name === 'heumi'));
  const heumi = idx(s, n => n.text?.includes('흐미')), bounces = s.map((n, i) => n.hop === 'domijorim' && n.sfx === 'jump' ? i : -1).filter(i => i >= 0), gone = idx(s, n => n.remove === 'domijorim');
  assert.ok(fall > idx(s, n => n.text === '* 나랑.. 사귀') && off > fall && s[fall - 1].action && s[off - 1].action && heumi > off && bounces.length === BOUNCE.length && bounces[0] > heumi && gone > bounces.at(-1));
  assert.ok(MASK_OFF.by[0] < 0, '가면은 점례 쪽(왼쪽 뒤)으로');
  // 점례 뒤 잠깐 → 이게뭐지·땡떙씨 → 브금 끔·불 켜짐 → 일어남(뒷모습) → 2초 → 앞모습 + crowd_ooh → ...? → 카메라 살짝 아래 관객 ....? → 다시 가운데 → ... 말풍선 → 어 하이
  const back = idx(s, n => n.face === 'jeomnye' && n.dir === 'up'), what = idx(s, n => n.text?.includes('이게뭐지')), bgmOff = idx(s, n => n.parallel?.some(x => x.bgm === null && x.fadeOut >= 1) && n.parallel?.some(x => x.spotlight === null) && n.parallel?.some(x => x.dim === 0));
  const wait2 = idx(s, (n, i) => i > bgmOff && n.wait === 2.0), ooh = idx(s, n => n.parallel?.some(x => x.face === 'choimis_bare' && x.dir === 'down') && n.parallel?.some(x => x.sfx === 'crowd_ooh'));
  const q1 = idx(s, n => n.text === '* ...?'), down = idx(s, n => n.camera === CROWD_VIEW), q2 = idx(s, n => n.text === '* ....?'), up = idx(s, (n, i) => i > down && n.camera === STAGE_VIEW), dots = idx(s, n => n.bubble === 'choimis_bare'), hi = idx(s, n => n.text?.includes('어 하이'));
  assert.ok(back > gone && what > back && bgmOff > idx(s, n => n.text?.includes('땡떙씨')) && wait2 > bgmOff && ooh > wait2 && q1 > ooh && down > q1 && q2 > down && up > q2 && dots > up && hi > dots);
  assert.ok(camY(CROWD_VIEW) > camY(STAGE_VIEW) && camY(CROWD_VIEW) - camY(STAGE_VIEW) <= 64, '살짝 밑으로');
  // 2초 뒤 관객 난동 6초(야유·던지기 열넷·가순이들 발 동동/양옆/앞) → 아 시발 → ... → 꺼져 → 달려가 박치기 → 날아감(야유 계속) → 카메라 주인공들 → 넉 줄 → 오른쪽 길 → 다시 주인공들 → 맵 브금·플래그
  const riot = idx(s, (n, i) => i > hi && n.parallel && n.parallel.flat(3).some(x => x?.hop && THROWS.includes(x.hop)));
  assert.ok(riot > hi && s[riot - 1].wait === 2.0);
  const flat = s[riot].parallel.flat(4);
  assert.equal(flat.filter(x => x?.hop && THROWS.includes(x.hop) && x.keep).length, 14, '던질 것 열넷이 날아와 남는다');
  assert.ok(flat.filter(x => typeof x?.sfx === 'string' && x.sfx.startsWith('crowd_roar')).length >= 2 && CROWD.every(id => flat.some(x => x?.face === id && x.dir === 'left') && flat.some(x => x?.hop === id)), '야유·가순이들 양옆·발 동동');
  assert.ok(s[riot].parallel.some(b => Array.isArray(b) && b.some(x => x.wait === RIOT.seconds)), '6초');
  const sibal = idx(s, n => n.text?.includes('아 시발. 점례야')), jd = idx(s, n => n.bubble === 'jeomnye'), go = idx(s, n => n.text?.includes('꺼져')), rush = idx(s, n => n.move === 'jeomnye' && n.rel === 'choimis_bare' && n.dash), bump = idx(s, n => n.parallel?.some(x => x.hop === 'jeomnye' && x.sfx === 'punch'));
  const fling = idx(s, n => n.parallel?.some(x => x.fling === 'choimis_bare') && n.parallel?.some(x => x.sfx === 'crowd_roar_2')), toParty = idx(s, (n, i) => i > fling && n.camera === 'player');
  const road = idx(s, n => n.camera === RIGHT_ROAD_VIEW), back2 = idx(s, (n, i) => i > road && n.camera === 'player'), mapBgm = idx(s, n => n.bgm === MAP_BGM), flag = idx(s, n => n.set?.[SAKURA7_SCENE_FLAG]);
  assert.ok(sibal > riot && jd > sibal && go > jd && rush > go && bump > rush && fling > bump && toParty > fling && idx(s, n => n.text?.includes('오른쪽에 길이 있네')) > toParty && road > toParty && back2 > road && mapBgm > back2 && flag > mapBgm);
  assert.ok(s[toParty].duration >= 1 && s[road].duration >= 1 && s[back2].duration >= 1, '카메라는 천천히');
});

test('test_sakura7_assets_qa_points_and_text_balloon_engine', () => {
  assert.deepEqual([CHARACTERS.jeomnye.sheet, CHARACTERS.jeomnye.voice, CHARACTERS.jeomnye.name], ['assets/sprites/jeomnye.png', 'gasuni', '점례']);
  for (const rel of ['assets/sprites/jeomnye.png', 'assets/portraits/jeomnye.png', 'assets/props/wedding_stage.png', 'assets/props/throw_tomato.png', 'assets/props/throw_egg.png', 'assets/props/throw_paper.png', 'assets/props/throw_apple.png', 'assets/audio/sfx/crowd_ooh.mp3', 'assets/audio/sfx/static_burst.mp3', 'assets/audio/sfx/crowd_roar.mp3', 'assets/audio/sfx/crowd_roar_2.mp3', 'assets/audio/bgm/loving_steps.mp3']) assert.ok(here(rel), rel);
  const A = MAP_RUNTIME_ASSETS.jjajang_sakura7;
  for (const sp of ['jeomnye', 'choimis_masked', 'choimis', 'domijorim', 'gasuni1', 'gasuni6']) assert.ok(A.sprites.includes(sp), sp);
  for (const pt of ['jeomnye', 'choimis', 'domijorim', 'gasuni1']) assert.ok(A.portraits.includes(pt), pt);
  const qa = id => QA_POINTS.find(q => q.id === id);
  assert.deepEqual([qa('jjajang_sakura7').spawn, qa('jjajang_sakura7_stage').spawn, qa('jjajang_sakura7_after').spawn], ['from_west', 'before_scene', 'after']);
  assert.ok(qa('jjajang_sakura7').flags.sakura6_scene_done && !qa('jjajang_sakura7_stage').flags.sakura7_scene_done && qa('jjajang_sakura7_after').flags.sakura7_scene_done);
  const ids = QA_POINTS.map(q => q.id); assert.ok(ids.indexOf('jjajang_sakura7') > ids.indexOf('jjajang_sakura6_east') && ids.indexOf('jjajang_sakura7_after') === ids.length - 1);
  // 글 말풍선(엔진): 한 글자씩 찍힌 뒤 hold 만큼 있다가 사라진다
  const b = new TextBalloon(); b.start({ x: 0, y: 0, w: 24, h: 16 }, { text: '아니. 그대여.', cps: 100 });
  assert.equal(b.done, false); b.update(0.5); assert.equal(b.shown, '아니. 그대여.'.length); assert.equal(b.phase, 'hold');
  b.update(b.hold + 0.05); assert.equal(b.phase, 'out'); b.update(0.2); assert.equal(b.done, true);
});
