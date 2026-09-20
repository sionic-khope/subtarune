// 벚꽃 숲 5(BUILD271): 아래로 살짝·오른쪽 3초·나무다리 3초·갈림목(오른쪽/윗길)·동그란 공터·거대 나무·다섯 배우·연출 대사 원문·브금 끔·오른쪽 길 막기·문 연결·QA·자산
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { SCRIPTS } from '../../src/data/scripts.js';
import { jjajang_sakura5_scene, jjajang_sakura5_clearing, jjajang_sakura5_no_right, CLEARING_VIEW, PEEK_VIEW, CAM, GIRLS_ZOOM, CLEARING_BGM, DUO_BATTLE, PARTY_SPOTS, LEAP, HEUMI, SAKURA5_SCENE_FLAG, SAKURA5_CLEARING_FLAG, SAKURA5_CLEARING_SCENE_FLAG, NO_RIGHT_LINE } from '../../src/data/cutscenes/jjajang_sakura5.js';
import { CHARACTER_MOTIONS } from '../../src/data/character-motions.js';
import { ENEMIES } from '../../src/data/enemies.js';
import { PATTERNS } from '../../src/battle/bullets.js';
import { SAKURA5_PATTERNS, SKATE, TORCH, DOHYUN_FALL, KAKAO, KAKAO_TEXTS } from '../../src/battle/sakura5-patterns.js';
import { QA_POINTS } from '../../src/core/story.js';
import { MAP_RUNTIME_ASSETS } from '../../src/data/map-runtime-assets.js';
import { CHARACTERS } from '../../src/data/characters.js';
import { VOICES } from '../../src/core/audio.js';

const load = id => JSON.parse(readFileSync(new URL(`../../assets/maps/${id}.json`, import.meta.url), 'utf8'));
const here = rel => existsSync(new URL(`../../${rel}`, import.meta.url));
const RUN_TILES_PER_SEC = 6.6;   // 달리기(기본) ≈ 213px/s
const ACTORS = ['domijorim', 'gasuni4', 'gasuni5', 'gasuni6', 'dohyun'];

test('test_sakura5_map_goes_down_a_little_right_three_seconds_bridge_three_seconds_then_forks_right_and_up_to_a_round_clearing', () => {
  const m = load('jjajang_sakura5'), S = m.meta.sakura5;
  assert.deepEqual([m.bgm, m.dim, m.battleBg], ['sakura', 0, 'sakura']);
  const at = (c, r) => m.rows[r][c];
  // 아래로 살짝: 도착 자리(15행)에서 길(22행)까지 7칸 ≈ 1초, 되돌아가는 문은 윗줄 끝
  const spawn = m.spawns.from_north; assert.equal(Math.floor(spawn.y / 32), S.spawnRow);
  const down = S.roadRows[0] - S.spawnRow; assert.ok(down / RUN_TILES_PER_SEC < 1.5 && down >= 4, `아래로 살짝 ${down}칸`);
  for (let r = 0; r <= S.roadRows[1]; r++) assert.equal(at(S.entryCols[0], r), ')', `입구 길 ${r}행`);
  const north = m.entities.find(e => e.id === 'sakura5_north_door'); assert.deepEqual([north.y, north.to, north.spawn], [0, 'jjajang_sakura4', 'south_end']);
  // 오른쪽 3초 → 나무다리 3초
  const right = S.rightCols[1] - S.rightCols[0] + 1, bridge = S.bridgeCols[1] - S.bridgeCols[0] + 1;
  assert.ok(Math.abs(right / RUN_TILES_PER_SEC - 3) < 0.5 && Math.abs(bridge / RUN_TILES_PER_SEC - 3) < 0.5, `오른쪽 ${right}칸·다리 ${bridge}칸 ≈ 3초씩`);
  for (const r of [S.roadRows[0], S.roadRows[1]]) {
    for (let c = S.rightCols[0]; c <= S.rightCols[1]; c++) assert.equal(at(c, r), ')');
    for (let c = S.bridgeCols[0]; c <= S.bridgeCols[1]; c++) assert.equal(at(c, r), ']', `나무다리 ${c},${r}`);
  }
  assert.ok(at(S.bridgeCols[0], S.roadRows[0] - 1) === '[' && at(S.bridgeCols[1], S.roadRows[1] + 1) === '[', '다리 위아래는 파란 물');
  assert.ok(at(S.bridgeCols[0], S.waterRows[0]) === '[' && at(S.bridgeCols[0], S.waterRows[1]) === '[' && at(S.bridgeCols[0], S.waterRows[0] - 1) === '@', '물은 화면 위아래까지, 그 너머는 숲');
  // 갈림목: 오른쪽 길은 동쪽 끝까지, 윗길은 공터로
  assert.ok(m.rows[S.roadRows[0]].endsWith(')') && at(S.eastCols[0], S.roadRows[1]) === ')', '오른쪽 길은 동쪽 끝까지(다음 맵 아직 없음)');
  for (let r = S.clearingBottom; r <= S.roadRows[0]; r++) assert.equal(at(S.upCols[0], r), ')', `윗길 ${r}행`);
  const [cx, cy, rx, ry] = S.clearing;
  assert.ok(at(cx, cy) === ')' && at(cx - Math.floor(rx), cy) === ')' && at(cx, cy - Math.floor(ry)) === ')' && at(cx + Math.floor(rx) + 2, cy) === '@' && at(cx, 0) === '@', '동그란(타원) 공터, 위쪽엔 한 줄 숲');
  assert.ok(at(cx - Math.floor(rx), cy - Math.floor(ry)) === '@', '모서리는 숲(네모가 아니라 동그랗게)');
  // 거대 나무(훨씬 큰 것): 밑동은 공터 가운데 땅, 그림 위쪽은 맵 밖(카메라에 맨 위가 안 보인다), 밑동 앞에 선 배우가 위에 그려지도록 sortY -1
  const tree = m.entities.find(e => e.id === 'sakura5_giant_tree');
  assert.ok(tree && here(tree.image) && m.preload.includes(tree.image) && tree.sortY === -1 && tree.iy < 0 && tree.solid && tree.w >= 96, JSON.stringify(tree));
  assert.equal(Math.floor((tree.y + tree.h) / 32), S.treeBaseRow);
  assert.ok(tree.ix >= 0 && tree.ix + 768 <= m.rows[0].length * 32 && tree.y + tree.h - tree.iy >= 700, '나무는 좌우 맵 안, 세로 700px 이상');
  // 다섯 배우: 밑동 오른쪽 땅(발 = 밑동 36px 위·뿌리 앞), 공터 안, 처음부터 보임. 카메라 CLEARING_VIEW(y 124)에서 발이 대화창(230) 위
  const actors = ACTORS.map(id => m.entities.find(e => e.id === id));
  const camY = CLEARING_VIEW[1] * 32 - 164;
  assert.ok(actors.every(e => e && !e.hidden && e.solid && e.wander === 0), '배우 다섯은 서 있는 NPC');
  for (const e of actors) assert.ok(e.y + e.h - camY <= 230 && e.y + e.h - camY >= 150 && e.y + e.h <= S.treeBaseY && e.y + e.h >= S.treeBaseY - 44 && e.x + e.w > tree.x + tree.w / 2, `${e.id} 는 밑동 오른쪽 땅·대화창 위 (${e.x},${e.y})`);
  const byX = [...actors].sort((a, b) => a.x - b.x).map(e => e.id);
  assert.deepEqual(byX, ['gasuni4', 'gasuni5', 'gasuni6', 'dohyun', 'domijorim'], '밑동에서부터 가순이 셋 → 도현 → 도미조림');
  for (const [id, [px, py]] of Object.entries(PARTY_SPOTS)) assert.ok(px + 12 >= S.partyX - 60 && px + 12 <= S.partyX + 60 && Math.abs(py + 16 - S.partyFeetY) <= 4 && px + 24 <= tree.x + tree.w && py + 16 <= tree.y, `${id} 일행 자리는 밑동 왼쪽`);
  const camX = CLEARING_VIEW[0] * 32 - 224;
  for (const e of actors) assert.ok(e.x >= camX && e.x + e.w <= camX + 480, `${e.id} 가 카메라 안`);
  for (const [px] of Object.values(PARTY_SPOTS)) assert.ok(px >= camX, '일행도 카메라 안');
  const land = { domijorim: [actors.find(e => e.id === 'domijorim').x + LEAP.domijorim.by[0], actors.find(e => e.id === 'domijorim').y + LEAP.domijorim.by[1]], dohyun: [actors.find(e => e.id === 'dohyun').x + LEAP.dohyun.by[0], actors.find(e => e.id === 'dohyun').y + LEAP.dohyun.by[1]] };
  assert.ok(land.domijorim[0] < PARTY_SPOTS.player[0] && land.dohyun[0] > PARTY_SPOTS.player[0] && land.domijorim[1] > PARTY_SPOTS.player[1] + 40 && land.dohyun[1] > PARTY_SPOTS.player[1] + 40 && land.domijorim[0] >= camX, `둘은 일행 아래(앞) 양옆에 착지해 일행을 올려다본다 ${JSON.stringify(land)}`);
  // 트리거: 연출(다리 건너자마자) · 공터 방문 · 오른쪽 길 막기
  const scene = m.entities.find(e => e.id === 'sakura5_scene_trigger'), visited = m.entities.find(e => e.id === 'sakura5_clearing_trigger'), block = m.entities.find(e => e.id === 'sakura5_block_trigger');
  assert.deepEqual([scene.x, scene.once, scene.unless, scene.script], [S.sceneCols[0] * 32, true, SAKURA5_SCENE_FLAG, 'jjajang_sakura5_scene']);
  assert.ok(S.sceneCols[0] >= S.bridgeCols[1] + 4 && S.sceneCols[1] <= S.upCols[0], '연출 트리거는 다리 끝보다 오른쪽, 윗길 앞');
  assert.deepEqual([visited.flag, visited.once, visited.script, Math.floor(visited.y / 32)], [SAKURA5_CLEARING_FLAG, true, 'jjajang_sakura5_clearing', S.clearingBottom]);
  assert.deepEqual([block.unless, block.script, block.once], [SAKURA5_CLEARING_FLAG, 'jjajang_sakura5_no_right', undefined]);
  assert.ok(block.x > scene.x + scene.w && block.x >= S.upCols[1] * 32, '막기 트리거는 갈림목·윗길 오른쪽');
  // 벚꽃 숲 4 아랫줄 문 → 5
  const four = load('jjajang_sakura4'), south = four.entities.find(e => e.id === 'sakura4_south_door');
  assert.deepEqual([south.to, south.spawn, south.y + south.h], ['jjajang_sakura5', 'from_north', four.rows.length * 32]);
  assert.deepEqual(MAP_RUNTIME_ASSETS.jjajang_sakura5.sprites, ACTORS);
});

test('test_sakura5_scene_turns_bgm_off_pans_up_hops_domijorim_with_heumi_speaks_the_brief_verbatim_and_returns', () => {
  assert.equal(SCRIPTS.jjajang_sakura5_scene, jjajang_sakura5_scene);
  const lines = jjajang_sakura5_scene.filter(n => n.text).map(n => `${n.speaker}: ${n.text.replace(/^\* /, '')}`);
  assert.deepEqual(lines, ['도미조림: 흐미!!', '가순이들: 깜짝이야!', '도미조림: 아따 전라도 홍어가 최고랑께', '도현: 어ㅋㅋ 가순이분들 괜찮으세요?', '도현: 도미조림형이 악역을 자처해서..', '가순이들: 하.. 땡땡이 오빠 어딨지..']);
  const bgmOff = jjajang_sakura5_scene.findIndex(n => 'bgm' in n && n.bgm === null), pan = jjajang_sakura5_scene.findIndex(n => Array.isArray(n.camera));
  const heumi = jjajang_sakura5_scene.findIndex(n => n.parallel?.some(x => x.motion === 'domijorim' && x.name === 'heumi'));
  const first = jjajang_sakura5_scene.findIndex(n => n.text), back = jjajang_sakura5_scene.findIndex(n => n.camera === 'player');
  assert.ok(bgmOff === 0 && jjajang_sakura5_scene[bgmOff].fadeOut >= 1 && bgmOff < pan && pan < heumi && heumi < first, '[브금 페이드아웃 ≥1초] → 카메라 → 흐미 자세+점프 → 흐미!!');
  assert.ok(jjajang_sakura5_scene[pan].duration >= 2 && jjajang_sakura5_scene[pan + 1].wait >= 0.5, '카메라는 천천히(≥2초) 가고 멈춘 뒤 연출');
  const heumiPar = jjajang_sakura5_scene[heumi].parallel;
  assert.ok(heumiPar.find(x => x.motion === 'domijorim').sfx === HEUMI.sfx && heumiPar.find(x => x.hop === 'domijorim').height === HEUMI.height, '흐미 클립은 자세와 함께');
  assert.deepEqual(jjajang_sakura5_scene[pan].camera, CLEARING_VIEW);
  const girlsStartle = jjajang_sakura5_scene.findIndex(n => n.parallel?.some(x => x.emote === 'gasuni4'));
  assert.ok(girlsStartle > first && girlsStartle < jjajang_sakura5_scene.findIndex(n => n.text?.includes('깜짝이야')) && jjajang_sakura5_scene[girlsStartle].parallel.some(x => x.hop === 'gasuni5' && x.height <= 12), '가순이들 놀람 = 살짝 점프 + 느낌표 → 깜짝이야!');
  assert.ok(jjajang_sakura5_scene[back + 1].wait >= 1, '돌아올 때도 기다린 뒤 끝');
  assert.ok(CHARACTER_MOTIONS.domijorim.heumi && CHARACTER_MOTIONS.domijorim.leap && CHARACTER_MOTIONS.dohyun.wave && CHARACTER_MOTIONS.dohyun.leap && [CHARACTER_MOTIONS.domijorim.heumi, CHARACTER_MOTIONS.dohyun.leap].every(m => m.frames.length === 4 && here(m.src)), '자세 띠 4프레임·파일');
  assert.ok(here(`assets/audio/sfx/${HEUMI.sfx}.mp3`), '흐미 효과음 파일');
  assert.ok(back > jjajang_sakura5_scene.findIndex(n => n.text?.includes('땡땡이')), '대사 뒤 카메라 주인공');
  assert.ok(!jjajang_sakura5_scene.some(n => n.sfx === 'whoosh' || n.parallel?.some(x => x.sfx === 'whoosh')), 'whoosh 금지');
  assert.ok(!jjajang_sakura5_scene.some(n => typeof n.bgm === 'string'), '연출 뒤 브금은 지정 없음(켜지 않는다)');
  assert.ok(jjajang_sakura5_scene.some(n => n.set?.[SAKURA5_SCENE_FLAG]));
  const portraits = new Set(jjajang_sakura5_scene.filter(n => n.portrait).map(n => n.portrait));
  for (const p of portraits) assert.ok(here(`assets/portraits/${p}.png`), `초상화 ${p}`);
});

test('test_sakura5_right_road_is_blocked_by_ppaman_until_the_clearing_is_visited', () => {
  assert.equal(SCRIPTS.jjajang_sakura5_no_right, jjajang_sakura5_no_right);
  assert.equal(SCRIPTS.jjajang_sakura5_clearing, jjajang_sakura5_clearing);
  const line = jjajang_sakura5_no_right.find(n => n.text);
  assert.deepEqual([line.speaker, line.text], ['억빠맨', `* ${NO_RIGHT_LINE}`]);
  const push = jjajang_sakura5_no_right.find(n => n.move === 'player');
  assert.ok(push && push.by[0] < 0 && jjajang_sakura5_no_right.at(-1).end === true, '한 칸 왼쪽으로 밀고 끝');
  assert.ok(jjajang_sakura5_clearing[0].set?.[SAKURA5_CLEARING_FLAG], '윗길 연출 첫 노드가 공터 방문 플래그(오른쪽 길 막기 해제)');
});

test('test_sakura5_up_the_path_scene_starts_the_telling_bgm_exclaims_domijorim_looks_down_speaks_verbatim_and_peeks_at_the_treetop', () => {
  assert.equal(SCRIPTS.jjajang_sakura5_clearing, jjajang_sakura5_clearing);
  const lines = jjajang_sakura5_clearing.filter(n => n.text).map(n => `${n.speaker}: ${n.text.replace(/^\* /, '')}`);
  assert.deepEqual(lines, ['도미조림: 어 형님?', '억빠맨: ㅋㅋ뭐냐 너네', '도현: 안녕하세요 형들', '억빠맨: 여기서 뭐하고있어?', '도현: 그게요 저 이 벚꽃나무 보이세요?', '억빠맨: ㅇㅇ', '도현: 사실 저기 벚꽃나무 맨 위에', '도현: 이상한 짜장면? 같은게 있는데 가순이들이 자꾸 최미스그새끼 준다고 가져와달라는거에요',
    '억빠맨: 형들 이거 설마', '경섭: 아마 그런거같다.', '도현: 알고계셨어요?', '억빠맨: 도현아', '도현: 네', '억빠맨: 저 짜장면은 우리가 가져가야될듯 ㅇㅇ', '도현: 네? 왜요?', '도미조림: 아따 행님들 그건 아니지라',
    '가순이들: 수근수근 뭐야?', 'undefined: 아무래도 저 둘은 가순이들의 시선을 의식중인 것 같다.', '도미조림: 저 짜장면은 제가 먼저 찾았당깨', 'undefined: 아무래도 도미조림은 가순이들의 시선보다 지가 처먹는게 더 중요한거같다.', '도현: 형님들 아무리 그래도 그건아니죠 .', 'undefined: 도현이가 슬금슬금 가순이들의 눈치를 본다.',
    '억빠맨: 뭐? 너 뒤질래?', '도현: 형님들 아무리 그러시면 저희가', '억빠맨: 응 느금마 걍 꺼지샘', '억빠맨: 걍 족치고 가져가죠', '도현: 훗.. 악역을 자처하시겠다.', '도미조림: 내꺼랑께요 흐미!!!!!!!!!!!!']);
  assert.ok(jjajang_sakura5_clearing.filter(n => n.text && !n.speaker).every(n => n.voice === 'narrator'), '나레이션은 화자 없이 narrator 목소리');
  const walk = jjajang_sakura5_clearing.findIndex(n => n.parallel?.some(b => Array.isArray(b) && b[0].move === 'player'));
  const branches = jjajang_sakura5_clearing[walk].parallel;
  assert.ok(walk >= 0 && walk < jjajang_sakura5_clearing.findIndex(n => n.camera === CLEARING_VIEW) && branches.map(b => b[0].move).join() === 'player,gyeongsub,ppaman' && branches.every(b => b.length === 3 && b.every(x => x.run)), '일행 셋이 ㄱ자(위·왼쪽·위)로 달려 올라간 뒤 카메라');
  for (const b of branches) assert.deepEqual(b[2].px, PARTY_SPOTS[b[2].move], `${b[2].move} 는 밑동 왼쪽 자리`);
  const bgm = jjajang_sakura5_clearing.findIndex(n => n.bgm === CLEARING_BGM), up = jjajang_sakura5_clearing.findIndex(n => n.camera === CLEARING_VIEW);
  const emote = jjajang_sakura5_clearing.findIndex(n => n.parallel?.some(x => x.emote === 'domijorim' && x.kind === '!')), faceDown = jjajang_sakura5_clearing.findIndex(n => n.face === 'domijorim' && n.dir === 'toward:player');
  const first = jjajang_sakura5_clearing.findIndex(n => n.text);
  assert.ok(bgm >= 0 && bgm < up && up < faceDown && faceDown < emote && emote < first, '브금 → 카메라 → 일행 쪽 쳐다봄·느낌표 → 어 형님?');
  assert.ok(jjajang_sakura5_clearing[up].duration >= 2 && jjajang_sakura5_clearing[up + 1].wait >= 0.5, '카메라 천천히 → 멈춤 → 대사');
  const wave = jjajang_sakura5_clearing.findIndex(n => n.motion === 'dohyun' && n.name === 'wave');
  assert.ok(wave > 0 && wave < jjajang_sakura5_clearing.findIndex(n => n.text?.includes('안녕하세요 형들')), '도현 손 들어 인사 자세 → 안녕하세요 형들');
  assert.ok(here(`assets/audio/bgm/${CLEARING_BGM}.mp3`), '브금 파일');
  const dohyunDown = jjajang_sakura5_clearing.findIndex(n => n.face === 'dohyun' && n.dir === 'toward:player'), hello = jjajang_sakura5_clearing.findIndex(n => n.text?.includes('안녕하세요 형들'));
  assert.ok(dohyunDown >= 0 && dohyunDown < hello && dohyunDown > jjajang_sakura5_clearing.findIndex(n => n.text?.includes('뭐냐 너네')), '도현이도 일행 쪽(아래)을 쳐다보고 인사');
  const yes = jjajang_sakura5_clearing.findIndex(n => n.text === '* ㅇㅇ'), top = jjajang_sakura5_clearing.findIndex((n, i) => i > yes && n.camera === PEEK_VIEW);
  const backDown = jjajang_sakura5_clearing.findIndex((n, i) => i > top && n.camera === CLEARING_VIEW), truth = jjajang_sakura5_clearing.findIndex(n => n.text?.includes('맨 위에'));
  assert.ok(yes < top && top < backDown && backDown < truth, 'ㅇㅇ 뒤 카메라 살짝 위로 갔다가 다시 돌아온 뒤 “사실 저기 벚꽃나무 맨 위에”');
  assert.ok(PEEK_VIEW[1] < CLEARING_VIEW[1] && jjajang_sakura5_clearing[top].duration >= 1.2 && jjajang_sakura5_clearing[backDown].duration >= 1.2, '살짝 위·복귀 모두 천천히');
  // 주인공 일행 모두 느낌표 → 대사 → (가순이들로 카메라) → 나레이션 → 카메라 넓게 → 흐미 점프 → 전투 → 카메라 주인공
  const jjajang = jjajang_sakura5_clearing.findIndex(n => n.text?.includes('이상한 짜장면')), emotes = jjajang_sakura5_clearing.findIndex(n => n.parallel?.some(x => x.emote === 'player'));
  assert.ok(emotes > jjajang && jjajang_sakura5_clearing[emotes].parallel.filter(x => x.emote).map(x => x.emote).join() === 'player,gyeongsub,ppaman' && jjajang_sakura5_clearing[emotes].parallel.filter(x => x.hop).length === 3, '주인공 일행 모두가 느낌표(살짝 점프)');
  const girls = jjajang_sakura5_clearing.findIndex(n => n.zoom === GIRLS_ZOOM.zoom), notThat = jjajang_sakura5_clearing.findIndex(n => n.text?.includes('그건 아니지라')), whisper = jjajang_sakura5_clearing.findIndex(n => n.text?.includes('수근수근'));
  assert.ok(notThat < girls && girls < whisper && jjajang_sakura5_clearing[girls].duration >= 1 && jjajang_sakura5_clearing[girls + 1].wait >= 0.4, '“아따 행님들 그건 아니지라” 뒤 가순이들로 천천히 줌인 → 멈춤 → “수근수근 뭐야?”');
  assert.deepEqual(jjajang_sakura5_clearing[girls].at, load('jjajang_sakura5').meta.sakura5.girlsFocus, '줌 초점 = 맵의 가순이 셋 가운데');
  const glance = jjajang_sakura5_clearing.findIndex(n => n.text?.includes('눈치를 본다')), glanceFace = jjajang_sakura5_clearing.findIndex(n => n.face === 'dohyun' && n.dir === 'left');
  assert.ok(glanceFace >= 0 && glanceFace < glance && glance < jjajang_sakura5_clearing.findIndex(n => n.text?.includes('뒤질래')), '도현이 가순이들(왼쪽)을 보고 눈치 나레이션 → 억빠맨');
  const wide = jjajang_sakura5_clearing.findIndex((n, i) => i > girls && n.zoom === 1);
  assert.ok(wide > glance && wide < jjajang_sakura5_clearing.findIndex(n => n.text?.includes('뒤질래')), '맞붙기 전 줌아웃');
  const leap = jjajang_sakura5_clearing.findIndex((n, i) => i > wide && n.parallel?.some(x => x.motion === 'domijorim' && x.name === 'leap'));
  const leapPar = jjajang_sakura5_clearing[leap].parallel;
  assert.ok(leap > jjajang_sakura5_clearing.findIndex(n => n.text?.includes('악역을 자처하시겠다')) && leapPar.some(x => x.motion === 'dohyun' && x.name === 'leap') && leapPar.some(x => x.hop === 'domijorim' && x.by[0] < -300) && leapPar.some(x => x.hop === 'dohyun' && x.by[0] < -100), '둘이 뛰는 자세로 점프해서 일행 양옆으로');
  assert.ok(jjajang_sakura5_clearing[leap - 1].async?.some(x => x.sfx === 'thud') && jjajang_sakura5_clearing[leap - 3].camera?.[1] > CLEARING_VIEW[1], '뛰기 전 카메라 한 칸 아래·착지음');
  assert.ok(jjajang_sakura5_clearing.slice(leap, leap + 8).some(n => n.face === 'domijorim' && n.dir === 'up') && jjajang_sakura5_clearing.slice(leap, leap + 8).some(n => n.face === 'player' && n.dir === 'down'), '착지 뒤 둘은 위(일행)를, 일행은 아래를 본다');
  const hop = jjajang_sakura5_clearing.findIndex((n, i) => i > leap && n.hop === 'domijorim'), mine = jjajang_sakura5_clearing.findIndex(n => n.text?.includes('내꺼랑께요')), battle = jjajang_sakura5_clearing.findIndex(n => n.battle);
  assert.ok(hop > 0 && hop < mine && mine < battle && jjajang_sakura5_clearing[hop].sfx === HEUMI.sfx, '“내꺼랑께요 흐미!!!!!!!!!!!!” 는 점프+흐미 뒤, 그다음 전투');
  const entry = jjajang_sakura5_clearing.findIndex((n, i) => i > mine && n.sfx === 'battle_start');
  assert.ok(entry > mine && entry < battle && jjajang_sakura5_clearing.slice(entry, battle).some(n => n.zoom) && jjajang_sakura5_clearing.slice(entry, battle).some(n => n.fade === 'out'), '전투 진입 연출(battleEntry: 소리·줌·페이드) 뒤 전투');
  assert.deepEqual(jjajang_sakura5_clearing[battle].battle, DUO_BATTLE);
  assert.deepEqual([DUO_BATTLE.enemies, DUO_BATTLE.bgm, DUO_BATTLE.bg], [['domijorim', 'dohyun'], 'petal_dance', 'sakura']);
  assert.ok(here(`assets/audio/bgm/${DUO_BATTLE.bgm}.mp3`), '전투 브금 파일(사용자 지정 RsAu3BDaAp8)');
  const back = jjajang_sakura5_clearing.findIndex((n, i) => i > battle && n.camera === 'player');
  const after = jjajang_sakura5_clearing.slice(battle + 1, back);
  assert.ok(after.some(n => n.zoom === 1) && after.some(n => n.fade === 'in') && after.some(n => n.bgm === CLEARING_BGM), '전투 뒤 줌 1·페이드인·공터 브금 복귀(검은 화면 방지)');
  assert.ok(back > battle && jjajang_sakura5_clearing.some(n => n.set?.[SAKURA5_CLEARING_SCENE_FLAG]), '전투 뒤 카메라 주인공·플래그');
  assert.equal(SCRIPTS.sakura5_duo_battle_qa[0].battle, DUO_BATTLE);
});

test('test_sakura5_domijorim_and_dohyun_have_50_hp_their_four_patterns_warn_before_firing_and_stay_in_the_box', () => {
  for (const id of ['domijorim', 'dohyun']) {
    const e = ENEMIES[id]; assert.equal(e.hp, 50, `${id} 체력 50`); assert.ok(e.sheet && e.sheet.count === 4 && here(e.sheet.src) && !e.image, `${id} 전투 대기 4프레임 시트(정지 그림 아님)`);
    assert.deepEqual([e.idle.swayX, e.idle.swayY], [0, 0], `${id} 시트 대기 모션이 있으면 sway 0`);
    for (const p of e.patterns) assert.ok(SAKURA5_PATTERNS[p.type] && PATTERNS[p.type] === SAKURA5_PATTERNS[p.type], `${id} 패턴 ${p.type} 등록`);
  }
  assert.deepEqual(ENEMIES.domijorim.patterns.map(p => p.type), ['skate_boomerang', 'torch_pillars']);
  assert.deepEqual(ENEMIES.dohyun.patterns.map(p => p.type), ['dohyun_drift', 'kakao_burst']);
  assert.ok(ENEMIES.dohyun.scale <= 0.75 && ENEMIES.domijorim.lines.speak.length >= 1 && ENEMIES.dohyun.lines.speak.length >= 1, '도현 키 20% 축소·말풍선 한 줄');
  assert.ok(ENEMIES.dohyun.sheet.fps <= 4, '도현 살랑살랑 춤은 시트 프레임으로(느린 fps)');
  assert.ok(here(ENEMIES.dohyun.projectiles.dohyun), '낙하 패턴은 도현 전투 정지 그림을 쓴다');
  assert.deepEqual(KAKAO_TEXTS, ['파크가디언 그새끼보다 낫노'], '카톡 문구는 사용자 원문만');
  for (const w of [SKATE.warn, TORCH.warn, DOHYUN_FALL.warn, KAKAO.warn]) assert.ok(w >= 0.35, '예고 ≥ 0.35초');
  // 가짜 상자에서 한 턴을 돌려 본다: 예고(harmless)가 먼저, 진짜 탄은 그 뒤, 모두 상자 근처에서 나온다
  let seed = 7; const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  const box = { x: 140, y: 140, w: 200, h: 150 }, soul = { x: 240, y: 215, r: 6 };
  for (const [type, cfg] of [['skate_boomerang', SKATE], ['torch_pillars', TORCH], ['dohyun_drift', DOHYUN_FALL], ['kakao_burst', KAKAO]]) {
    const emitted = [], sfx = [];
    const api = { box, soul, rnd, sfx: n => sfx.push(n), images: {}, emit: o => { const b = { age: 0, rot: 0, ...o }; emitted.push({ ...b, at: now }); return b; } };
    let now = 0; const pat = SAKURA5_PATTERNS[type]();
    for (let step = 0; step < 240; step++) { now = step * 0.025; pat.update(now, 0.025, api); for (const b of emitted) { b.age += 0.025; b.steer?.(b, 0.025); b.vy = (b.vy || 0) + (b.ay || 0) * 0.025; b.x += (b.vx || 0) * 0.025; b.y += (b.vy || 0) * 0.025; } }
    const warns = emitted.filter(b => b.harmless), shots = emitted.filter(b => !b.harmless);
    assert.ok(warns.length >= 2 && shots.length >= 2, `${type}: 예고 ${warns.length}·탄 ${shots.length}`);
    assert.ok(warns[0].at < shots[0].at && shots[0].at - warns[0].at >= cfg.warn - 1e-6, `${type}: 예고가 먼저(${cfg.warn}초)`);
    assert.ok(shots.every(b => b.drawShape || b.shape === 'circle'), `${type}: 모양 있는 탄`);
    assert.ok(sfx.length >= 1 && !sfx.includes('whoosh'), `${type}: 소리(whoosh 금지)`);
    assert.ok(shots.some(b => b.steer || b.hitShape || b.vy || b.vx), `${type}: 회피 축이 둘 이상(움직임·모양 조합)`);
    assert.ok(pat.duration >= 4.5 && pat.duration <= 6, `${type}: 길이 ${pat.duration}`);
  }
});

test('test_sakura5_characters_voices_sprites_and_qa_points_exist', () => {
  for (const id of ACTORS) {
    assert.ok(CHARACTERS[id]?.sheet && here(CHARACTERS[id].sheet), `${id} 시트`);
    assert.ok(here(`assets/portraits/${id}.png`), `${id} 초상화`);
  }
  assert.deepEqual([CHARACTERS.dohyun.voice, CHARACTERS.domijorim.voice, CHARACTERS.gasuni4.voice], ['dohyun', 'domijorim', 'gasuni']);
  for (const v of ['dohyun', 'domijorim']) assert.ok(VOICES[v] && here(`assets/audio/voices/${v}.mp3`), `목소리 ${v}`);
  assert.ok(here('assets/enemies/domijorim-battle.png') && here('assets/enemies/dohyun-battle.png'), '적군 전투 스프라이트(그림만)');
  const ids = QA_POINTS.filter(q => q.map === 'jjajang_sakura5').map(q => [q.id, q.spawn]);
  assert.deepEqual(ids, [['jjajang_sakura5', 'from_north'], ['jjajang_sakura5_bridge', 'bridge_end'], ['jjajang_sakura5_fork', 'fork'], ['jjajang_sakura5_battle', 'clearing'], ['jjajang_sakura5_clearing', 'clearing']]);
  assert.equal(QA_POINTS.find(q => q.id === 'jjajang_sakura5_battle').script, 'sakura5_duo_battle_qa');
  const clearing = QA_POINTS.find(q => q.id === 'jjajang_sakura5_clearing');
  assert.ok(clearing.flags.sakura5_scene_done && clearing.flags.sakura5_clearing_visited && clearing.flags.sakura5_clearing_scene_done && clearing.flags.sakura5_duo_won && clearing.flags.jjajang_sakura4_bazzi_defeated);
});
