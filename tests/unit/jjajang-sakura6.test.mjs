// 벚꽃 숲 6(BUILD277): 오른쪽 길 → 뗏목 5초 → 뭍 → 살짝 동그란 광장(가면 쓴 최미스 고백 연습 연출) → 오른쪽 길 · 문 연결 · 대사 원문 · 카메라 먼저 · 자세 · QA · 자산
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { SCRIPTS } from '../../src/data/scripts.js';
import { jjajang_sakura6_scene, PARTY, CENTER, CENTER_VIEW, PARTY_VIEW, PARTY_SPOTS, FLOWER_SPOTS, CENTER_SPOT, EXIT_SPOT, SCENE_BGM, MAP_BGM, SAKURA6_SCENE_FLAG } from '../../src/data/cutscenes/jjajang_sakura6.js';
import { CHARACTER_MOTIONS } from '../../src/data/character-motions.js';
import { CHARACTERS } from '../../src/data/characters.js';
import { QA_POINTS } from '../../src/core/story.js';
import { MAP_RUNTIME_ASSETS } from '../../src/data/map-runtime-assets.js';

const load = id => JSON.parse(readFileSync(new URL(`../../assets/maps/${id}.json`, import.meta.url), 'utf8'));
const here = rel => existsSync(new URL(`../../${rel}`, import.meta.url));
const SCREEN_W = 480;
const viewLeft = view => view[0] * 32 - 224;   // { camera:[tx,ty] } → cam.x = tx*32 - 224
const line = n => n.text ? [n.speaker, n.text.replace(/^\* /, '').replace(/\{\/?shake\}/g, '')] : null;

test('test_sakura6_map_is_one_road_with_a_five_second_raft_and_a_slightly_round_plaza', () => {
  const m = load('jjajang_sakura6'), S = m.meta.sakura6, raft = m.entities.find(e => e.type === 'raft');
  for (const row of S.roadRows) { assert.equal(m.rows[row][0], ')', '서쪽 끝 길'); assert.equal(m.rows[row][S.shoreCol], ')', '물가'); assert.equal(m.rows[row][S.landingCol], ')', '뭍'); assert.equal(m.rows[row].at(-1), ')', '동쪽 끝 길'); }
  for (let c = S.channel[0][0]; c <= S.channel[0][1]; c++) for (let r = S.channel[1][0]; r <= S.channel[1][1]; r++) assert.equal(m.rows[r][c], '[', `파란 물길 (${c},${r})`);
  // 뗏목: 물가 오른쪽 물 위 → 오른쪽 곧장 5초쯤 → 뭍 첫 열에 4px 걸쳐 멈춘다(벚꽃 숲 3 과 같은 뗏목·걸어 올라타기·동료 헤엄)
  assert.deepEqual([raft.walkOn, raft.swim, raft.swimAt, raft.speed, raft.route.length, raft.route[0][1]], [true, ['ppaman', 'gyeongsub'], 'below', 171, 1, raft.y]);
  const ride = (raft.route[0][0] - raft.x) / raft.speed; assert.ok(ride >= 4.5 && ride <= 5.5, `5초쯤 (${ride.toFixed(2)}초)`); assert.equal(S.rideSeconds, +ride.toFixed(2));
  assert.equal(raft.route[0][0] + 56, S.landingCol * 32 + 4, '뗏목 오른쪽이 뭍에 4px 걸친다');
  // 살짝 동그란 광장: 중심 = 연출 카메라 가운데, 가운데 행이 가장 넓고 광장 위는 숲
  const [cx, cy, rx, ry] = S.plaza; assert.deepEqual(S.center, [cx * 32, cy * 32]); assert.deepEqual(CENTER, S.center);
  const width = row => [...m.rows[row].slice(S.landingCol)].filter(ch => ch === ')').length;
  assert.ok(width(Math.floor(cy)) > width(Math.floor(cy) - 3) && width(Math.floor(cy) - 3) > width(Math.floor(cy - ry) - 1), '가운데가 가장 넓다');
  assert.equal(m.rows[Math.floor(cy - ry) - 1][Math.floor(cx)], '@', '광장 위는 숲');
  // 꽃 무더기 넷은 광장 가운데 옆(그림 있음), 최미스는 꽃 1 왼쪽에서 오른쪽을 보고, 연출이 끝나면 없다
  const flowers = m.entities.filter(e => e.id.startsWith('sakura6_flowers_')); assert.equal(flowers.length, 4);
  for (const f of flowers) { assert.ok(here(f.image), f.image); assert.ok(Math.abs(f.x - S.center[0]) <= 140 && Math.abs(f.y - S.center[1]) <= 80, `${f.id} 는 가운데 옆`); }
  const c = m.entities.find(e => e.id === 'choimis');
  assert.deepEqual([c.sprite, c.facing, c.unless, c.wander, [c.x, c.y]], ['choimis_masked', 'right', SAKURA6_SCENE_FLAG, 0, FLOWER_SPOTS[0]]);
  // 들머리 트리거: 광장 왼쪽 가장자리 앞 뭍 길, 한 번, 연출 뒤엔 안 밟힘
  const t = m.entities.find(e => e.id === 'sakura6_scene_trigger');
  assert.deepEqual([t.once, t.unless, t.script, t.x], [true, SAKURA6_SCENE_FLAG, 'jjajang_sakura6_scene', S.sceneCols[0] * 32]);
  assert.ok(t.x + t.w <= (cx - rx) * 32 && m.spawns.plaza.x + 24 <= t.x, '트리거는 광장 가장자리 앞, 광장 QA 자리는 그 왼쪽');
});

test('test_sakura6_doors_connect_both_ways_with_sakura5', () => {
  const five = load('jjajang_sakura5'), six = load('jjajang_sakura6');
  const east = five.entities.find(e => e.id === 'sakura5_east_door'), west = six.entities.find(e => e.id === 'sakura6_west_door');
  assert.deepEqual([east.to, east.spawn, east.x + east.w], ['jjajang_sakura6', 'from_west', five.rows[0].length * 32]);
  assert.deepEqual([west.to, west.spawn, west.x], ['jjajang_sakura5', 'from_east', 0]);
  assert.deepEqual([five.spawns.from_east.facing, six.spawns.from_west.facing], ['left', 'right']);
});

test('test_sakura6_scene_camera_first_then_verbatim_lines_in_order', () => {
  const s = jjajang_sakura6_scene; assert.equal(SCRIPTS.jjajang_sakura6_scene, s);
  assert.deepEqual(s.map(line).filter(Boolean), [
    ['최미스', '헤헤'], ['최미스', '곧 그녀에게... 고백을 할거야'], ['최미스', '점례야..'], ['최미스', '나랑 사귀..'], ['최미스', '아 이런건 너무 담백한가'], ['최미스', '어이 너 나랑 사귈래 죽을래'],
    ['최미스', '허허허 막이래 ㅋㅋㅋ 큼큼'], ['최미스', '점례야 처음본순간부터 난 너를 좋아했어'], ['최미스', '오우 쉣 손발이 다 오그라들어'],
    ['최미스', '이젠 나 진짜 여자친구가 생기는건가'], ['최미스', '나 진짜 이제섹스 하는건가!!!!!!!!'],
    ['최미스', '엇 이녀석들 또 여기!!'], ['경섭', '미스야'], ['경섭', '내 돈 갚아 씨2발새끼야'], ['최미스', '형 제가 지금 당장 돈이'], ['경섭', '씨발년아 그럼 난 지금당장 돈 있냐'],
    ['최미스', '형 그럼 제 부탁하나만 들어주세요'], ['경섭', '뭔데'], ['최미스', '제가 곧 고백을 하는데'], ['최미스', '이거까지만 기다려주시면 안될까요'], ['최미스', '제발요 부탁할게요'],
    ['경섭', '하아 언제하는데'], ['최미스', '곧이요 제가 바로 옆에 이제 무대를 차려놨어요'], ['최미스', '그녀가 무대위에 올라가있겠다고 했어요'], ['최미스', '그럼 제가 옆에서 나타나 고백하는거에요 바로 이후에!!'],
    ['경섭', '잠깐'], ['억빠맨', '잠깐 이렇게 바로 그다음맵에서 고백한다고?'], ['최미스', 'ㅇㅇ'], ['억빠맨', '오 씨발.'], ['최미스', '지켜봐줘 나의 무대.'],
    ['억빠맨', 'ㅋㅋㅋ 뭔가 재밌을거같은데 가보죠'],
  ]);
  // 첫 노드: 카메라가 천천히(≥2초) 광장 가운데로 가는 동안 일행은 살짝 앞으로(카메라 왼쪽 가장자리 밖), 최미스는 꽃을 딴다 — 대사는 그 뒤
  const first = s[0].parallel, cam = first.find(x => x.camera); assert.deepEqual([cam.camera, cam.duration >= 2], [CENTER_VIEW, true]);
  for (const id of PARTY) { const mv = first.find(x => x.move === id); assert.deepEqual(mv.px, PARTY_SPOTS[id]); assert.ok(mv.px[0] + 24 < viewLeft(CENTER_VIEW), `${id} 는 카메라 왼쪽 밖`); }
  const isPick = n => n.parallel?.some(x => x.motion === 'choimis' && x.name === 'pick');
  assert.ok(first.some(x => Array.isArray(x) && x.some(isPick)), '카메라가 가는 동안 꽃 1 을 딴다');
  const hehe = s.findIndex(n => n.text === '* 헤헤');
  assert.equal(s.slice(1, hehe).filter(isPick).length, 2, '꽃 2·3 으로 옮겨 다니며 딴다');
  assert.deepEqual(s.slice(1, hehe).filter(n => n.move === 'choimis').map(n => n.px), [FLOWER_SPOTS[1], FLOWER_SPOTS[2], CENTER_SPOT]);
  const center = s.findIndex(n => n.move === 'choimis' && n.px === CENTER_SPOT), faceDown = s.findIndex(n => n.face === 'choimis' && n.dir === 'down'), bgm = s.findIndex(n => n.bgm === SCENE_BGM);
  assert.ok(center > 0 && faceDown > center && bgm > faceDown && hehe > bgm, '가운데 → 앞을 봄 → 브금 → 헤헤');
  // # 스읍 미스: 클립 + 가면 쓴 seup 자세(대사 없이), 오그라들어 뒤·여자친구 앞. 섹스 줄은 대화창 글자 진동
  const seup = s.findIndex(n => n.parallel?.some(x => x.sfx === 'choimis_seup_miss') && n.parallel?.some(x => x.motion === 'choimis' && x.name === 'seup'));
  assert.ok(seup > s.findIndex(n => n.text?.includes('오그라들어')) && seup < s.findIndex(n => n.text?.includes('여자친구가')));
  assert.ok(/^\* \{shake\}.*\{\/shake\}$/.test(s.find(n => n.text?.includes('섹스')).text), '채팅창 진동');
  // 왼쪽 보고 → 카메라 천천히(≥1.5초) 주인공들 쪽(주인공들과 최미스가 한 화면) → 주인공들 ... 말풍선 → 엇 이녀석들
  const left = s.findIndex(n => n.face === 'choimis' && n.dir === 'left'), toParty = s.findIndex(n => n.camera === PARTY_VIEW), bub = s.findIndex(n => n.bubble === PARTY), eot = s.findIndex(n => n.text?.includes('이녀석들'));
  assert.ok(left > seup && toParty > left && s[toParty].duration >= 1.5 && bub > toParty && eot > bub);
  const vl = viewLeft(PARTY_VIEW); assert.ok(PARTY_SPOTS.ppaman[0] >= vl && CENTER_SPOT[0] + 24 <= vl + SCREEN_W, '주인공들과 최미스가 한 화면');
  // 미스야 → 최미스 느낌표 → 내 돈 갚아 → 최미스 ... 말풍선 → 형 제가 지금 당장 돈이
  const misya = s.findIndex(n => n.text === '* 미스야'), emote = s.findIndex(n => n.emote === 'choimis' && n.kind === '!'), money = s.findIndex(n => n.text?.includes('내 돈 갚아')), dots = s.findIndex(n => n.bubble === 'choimis');
  assert.ok(emote > misya && money > emote && dots > money && dots < s.findIndex(n => n.text?.includes('지금 당장 돈이')));
  // 지켜봐줘 → 오른쪽 끝으로 걸어 나가 사라짐(배경) → 브금 끄고(페이드 ≥1초) 억빠맨 → 정상(카메라 주인공·맵 브금·플래그)
  const stage = s.findIndex(n => n.text?.includes('지켜봐줘')), exit = s.findIndex(n => Array.isArray(n.async) && n.async[0]?.move === 'choimis' && n.async[1]?.remove === 'choimis');
  const off = s.findIndex(n => n.bgm === null), last = s.findIndex(n => n.text?.includes('가보죠')), back = s.findIndex(n => n.camera === 'player'), mapBgm = s.findIndex(n => n.bgm === MAP_BGM), flag = s.findIndex(n => n.set?.[SAKURA6_SCENE_FLAG]);
  assert.ok(exit > stage && s[exit].async[0].px === EXIT_SPOT && EXIT_SPOT[0] > viewLeft(PARTY_VIEW) + SCREEN_W, '화면 밖 오른쪽 끝까지');
  assert.ok(off > exit && s[off].fadeOut >= 1 && last > off && back > last && mapBgm > last && flag > mapBgm);
});

test('test_sakura6_masked_choimis_assets_and_qa_points', () => {
  assert.deepEqual([CHARACTERS.choimis_masked.sheet, CHARACTERS.choimis_masked.voice, CHARACTERS.choimis_masked.name], ['assets/sprites/choimis-masked-walk.png', 'choimis', '최미스']);
  for (const rel of ['assets/sprites/choimis-masked-walk.png', 'assets/sprites/choimis-masked-pick.png', 'assets/sprites/choimis-masked-seup.png', 'assets/audio/bgm/loving_steps.mp3', 'assets/audio/sfx/choimis_seup_miss.mp3']) assert.ok(here(rel), rel);
  const M = CHARACTER_MOTIONS.choimis_masked;
  assert.deepEqual([M.pick.frames.length, M.seup.frames.length, M.pick.scale], [2, 2, 0.5]);
  assert.ok(Math.abs(M.seup.frames[0].duration + M.seup.frames[1].duration - 2.7) < 0.01, '스읍 미스 2.7초(최미스 seup 과 같은 박자)');
  assert.deepEqual(MAP_RUNTIME_ASSETS.jjajang_sakura6.sprites, ['choimis_masked', 'choimis']);
  const qa = id => QA_POINTS.find(q => q.id === id);
  assert.deepEqual([qa('jjajang_sakura6').spawn, qa('jjajang_sakura6_dock').spawn, qa('jjajang_sakura6_plaza').spawn, qa('jjajang_sakura6_east').spawn], ['from_west', 'dock', 'plaza', 'east']);
  assert.ok(qa('jjajang_sakura6').flags.sakura5_clearing_scene_done && qa('jjajang_sakura6').flags.sakura5_girls_left && !qa('jjajang_sakura6_plaza').flags.sakura6_scene_done && qa('jjajang_sakura6_east').flags.sakura6_scene_done);
  const ids = QA_POINTS.map(q => q.id); assert.ok(ids.indexOf('jjajang_sakura6') > ids.indexOf('jjajang_sakura5_clearing') && ids.indexOf('jjajang_sakura6_east') > ids.indexOf('jjajang_sakura6_plaza'), 'QA 순서: 벚꽃 숲 5 뒤, 연출 끝은 그 뒤(벚꽃 숲 7 이 이어진다)');
});
