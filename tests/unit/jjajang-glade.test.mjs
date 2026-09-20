// 빛 드는 공터 — 풀숲의 최미스·가순이 셋(BUILD257, design/narrative/cutscenes/jjajang_glade.md): 대사 원문·순서, 연출 순서, 맵(공터·풀숲·나무·숨은 배우·트리거), 자산 파일, QA
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { SCRIPTS } from '../../src/data/scripts.js';
import { jjajang_glade_intro, RUSTLE, POP, GIRL_SPOTS, PARTY_BELOW, PAN_DOWN } from '../../src/data/cutscenes/jjajang_glade.js';
import { QA_POINTS } from '../../src/core/story.js';
import { CHARACTERS } from '../../src/data/characters.js';
import { CHARACTER_MOTIONS } from '../../src/data/character-motions.js';
import { VOICES } from '../../src/core/audio.js';
import { MAP_RUNTIME_ASSETS } from '../../src/data/map-runtime-assets.js';

const load = id => JSON.parse(readFileSync(new URL(`../../assets/maps/${id}.json`, import.meta.url), 'utf8'));
const exists = rel => existsSync(new URL(`../../${rel}`, import.meta.url));
const flatten = list => list.flatMap(node => Array.isArray(node) ? flatten(node) : [node, ...flatten(node.parallel || node.async || [])]);
const texts = list => flatten(list).filter(n => n.text).map(n => `${n.speaker || '나레이션'}: ${n.text.replace(/^\* /, '')}`);

test('test_glade_lines_are_the_briefing_verbatim_in_order', () => {
  assert.equal(SCRIPTS.jjajang_glade_intro, jjajang_glade_intro);
  assert.deepEqual(texts(jjajang_glade_intro), [
    '억빠맨: ?? 뭐죠', '경섭: 흔..들린거같은데', '???: 우왁!!!',
    '최미스: 아시발.', '최미스: 후욱 후욱 아 존나 덥다 시발.', '최미스: 내이름은 최땡땡', '최미스: 가재맨방 최고 고닉', '최미스: 어쩐 이유에선가 여기에 갇히게 되었는데',
    '최미스: 바로 이!', '최미스: 이 가면을 획득한뒤로', '최미스: 여자들이 나를 좋아해준단말이지ㅎㅎㅎㅎㅎ', '최미스: 하긴 멘트치는건 내가 좀 .. 감각적이니까', '최미스: 큼큼.. 콜록 큼!!!',
    '최미스: 내 추구미는... 쵸쇼우야.....', '최미스: 스읍 미스', '최미스: 막이래 어헣헣헣',
    '???: 땡떙씨~?', '가순이1: 꺅 땡땡오빠 여깄었군요', '가순이2: 오늘도 멋져요!!', '가순이3: 패션 대박대박', '최미스: 후훗',
    '최미스: 내 추구미는 쵸소우야.', '가순이123: 꺄아아악 꺄아아악 섹시해, 고닉... 하...',
    '억빠맨: 형저새끼 씨발 칼로찔러죽일테니까 제발 나가게해주세요', '경섭: 참아 빠맨아',
    '최미스: 후후 이따 봐요 아가씨들 먼저 올라가있어.', '가순이123: 네 땡떙씨!!', '최미스: ㅋㅋㅋ... 후후..',
    '최미스: 휴우우우ㅜ우우 후우우우ㅜㅜ 아 다행이다. 시발 아 진짜 ㅈㄴ힘들다.', '최미스: 이렇게해서라도 ... 넣... 넣을수만 있다면', '최미스: 나는 상관없어!!!!', '최미스: 어.',
    '최미스: ... 어 하이', '억빠맨: ...', '억빠맨: 스읍 미스', '최미스: 아 씨발', '최미스: 이거 말하면 진짜 뒤진다.',
    '억빠맨: ㅋㅋ', '억빠맨: 근데 경섭이형', '경섭: 어 왜', '억빠맨: 왜 돈달라고 안해요?', '경섭: ...', '경섭: 아 맞네 씨발 야 쫒아가.',
  ]);
  // 유튜브 음성이 대신하는 두 줄(쵸쇼우야·스읍 미스)과 가순이들 앞 “내 추구미는 쵸소우야.” 은 글자 블립 없음
  for (const n of flatten(jjajang_glade_intro).filter(n => /쵸쇼우야|쵸소우야|^\* 스읍 미스$/.test(n.text || '') && n.speaker === '최미스')) assert.equal(n.voice, 'none', n.text);
  for (const n of flatten(jjajang_glade_intro).filter(n => n.speaker === '최미스' && n.voice !== 'none')) assert.deepEqual([n.portrait, n.voice], ['choimis', 'choimis']);
  for (const n of flatten(jjajang_glade_intro).filter(n => /^가순이\d$/.test(n.speaker || ''))) assert.equal(n.voice, 'gasuni');
});

test('test_glade_beats_follow_the_briefing_order', () => {
  const flat = flatten(jjajang_glade_intro);
  const at = pred => flat.findIndex(pred);
  const line = needle => at(n => (n.text || '').includes(needle));
  const idx = {
    rustle1: at(n => n.tremble === 'glade_bush_2'), alarm1: at(n => n.emote === 'player'), lookRight: at(n => n.face === 'ppaman' && n.dir === 'right'),
    line1: line('뭐죠'), rustle2: flat.findIndex((n, i) => n.tremble === 'glade_bush_2' && i > line('뭐죠')),
    runLeft: at(n => n.move === 'player' && n.rel === 'glade_hide_tree' && n.run), camBush: at(n => Array.isArray(n.camera) && n.camera[0] > 20),
    uwak: line('우왁'), show: at(n => n.show === 'choimis'), masked: at(n => n.pose === 'masked'), pop: at(n => n.hop === 'choimis'), fallen: at(n => n.pose === 'fallen'), maskOff: at(n => n.hop === 'discord_mask'),
    bgm: at(n => n.bgm === 'choimis'), asibal: line('아시발'), camPlayer: at(n => n.camera === 'player'), bubble: at(n => n.bubble === 'player'),
    wink: at(n => n.motion === 'choimis' && n.name === 'wink'), gonic: line('고닉'), maskZoom: at(n => n.zoom > 1 && n.at === 'discord_mask'),
    sway: at(n => n.hop === 'choimis' && n.by && n.by[0] > 0 && n.height < 5), bgmOff: at(n => n.bgm === null),
    slowZoom: at(n => n.zoom > 1 && n.at === 'choimis'), chosouya: at(n => n.sfx === 'choimis_chosouya'), seup: at(n => n.motion === 'choimis' && n.name === 'seup'),
    ddaeng: line('땡떙씨~?'), maskOn: flat.findIndex((n, i) => n.hop === 'discord_mask' && i > line('땡떙씨~?')), gasuniBgm: at(n => n.bgm === 'gasuni'),
    girlsIn: at(n => n.move === 'gasuni1' && n.rel === 'choimis'), bounce3: at(n => n.hop === 'gasuni3'), girlsShift: at(n => n.move === 'gasuni1' && n.by && !n.rel && !n.run),
    camTree: at(n => Array.isArray(n.camera) && n.camera[0] < 15), knife: line('칼로'), girlsOut: at(n => n.move === 'gasuni1' && n.run && n.by && !n.rel),
    gasuniBgmOff: flat.findIndex((n, i) => n.bgm === null && i > line('후후..')), facepalm: at(n => n.pose === 'facepalm'),
    maskDrop: flat.findIndex((n, i) => n.hop === 'discord_mask' && i > line('후후..')), panDown: at(n => Array.isArray(n.camera) && n.camera[1] >= 19),
    eo: line('* 어.'), bubbles: at(n => n.bubble === 'gyeongsub'), jump: flat.findIndex((n, i) => n.hop === 'choimis' && i > line('어 하이')),
    escape: at(n => n.move === 'choimis' && n.dash), gone: at(n => n.remove === 'choimis'), money: line('돈달라고'), done: at(n => n.set?.glade_done),
  };
  const order = Object.keys(idx);
  for (const key of order) assert.ok(idx[key] >= 0, `${key} 노드가 있다`);
  for (let i = 1; i < order.length; i++) assert.ok(idx[order[i]] > idx[order[i - 1]], `${order[i - 1]} → ${order[i]} 순서`);
  assert.ok(RUSTLE.first > 0 && POP.height > 0 && GIRL_SPOTS.length === 3 && GIRL_SPOTS.every(([dx]) => dx < 0), '가순이는 최미스 왼쪽 빈터에');
  assert.ok(PARTY_BELOW > 100 && PAN_DOWN >= 3, '일행은 최미스 아래로, 카메라는 천천히');
  assert.equal(flat.filter(n => n.emote === 'player').length, 2, '모두 느낌표는 두 번(첫 흔들림·두 번째 흔들림)');
});

test('test_glade_map_has_lit_clearing_bushes_tree_and_hidden_actors', () => {
  const m = load('jjajang_glade'), by = id => m.entities.find(e => e.id === id);
  assert.deepEqual([m.bgm, m.stage], ['wind', 'ship_sinking_done']);
  assert.ok(m.spotlight && m.spotlight.alpha > 0 && m.dim > 0, '위에서 드는 빛(spotlight) + 어두운 바깥');
  const { center: [cx, cy], radius, bushes, hideTree, trigger } = m.meta.glade;
  assert.ok(radius >= 8 && m.rows[cy][cx] === 'U' && m.rows[cy - radius + 1][cx] === 'U' && m.rows[cy][cx + radius - 1] === 'U', '원형 공터');
  assert.equal(bushes.length, 3); assert.ok(bushes.every(([c]) => c > cx + 3), '풀숲 셋은 가운데 살짝 오른쪽');
  for (let i = 1; i <= 3; i++) { const b = by(`glade_bush_${i}`); assert.ok(b && b.solid && exists(b.image), `풀숲 ${i}`); }
  assert.ok(hideTree[0] < cx - 3 && by('glade_hide_tree')?.solid, '숨는 나무는 공터 왼쪽');
  const c = by('choimis'), mask = by('discord_mask');
  assert.ok(c.hidden && c.sprite === 'choimis' && Math.abs(c.x - by('glade_bush_2').x) < 8, '최미스는 가운데 풀숲에 숨어 있다');
  assert.ok(mask.hidden && exists(mask.image), '디스코드 가면 소품');
  for (let i = 1; i <= 3; i++) { const g = by(`gasuni${i}`); assert.ok(g.hidden && g.unless === 'glade_done' && g.y < cy * 32, `가순이${i} 는 공터 위쪽에 숨어`); }
  const t = by('glade_intro_trigger');
  assert.deepEqual([t.script, t.once, t.unless], ['jjajang_glade_intro', true, 'glade_done']);
  assert.ok(t.y / 32 >= trigger[1] && t.y / 32 > bushes[2][1], '트리거는 풀숲보다 아래(풀숲이 화면에 보이는 자리)');
  const door = by('glade_deep_door'); assert.deepEqual([door.to, door.spawn], ['jjajang_deep', 'from_north']);
  const deep = load('jjajang_deep'); assert.deepEqual([deep.entities.find(e => e.id === 'deep_glade_door').to, deep.spawns.from_north.facing], ['jjajang_glade', 'down']);
});

test('test_choimis_and_gasuni_assets_are_registered', () => {
  assert.equal(CHARACTERS.choimis.voice, 'choimis'); assert.ok(VOICES.choimis && VOICES.gasuni);
  for (const f of ['assets/audio/voices/choimis.mp3', 'assets/audio/sfx/choimis_chosouya.mp3', 'assets/audio/sfx/choimis_seup_miss.mp3', 'assets/audio/bgm/choimis.mp3', 'assets/audio/bgm/gasuni.mp3', 'assets/portraits/choimis.png', 'assets/props/jjajang_bush.png', 'assets/props/discord_mask.png']) assert.ok(exists(f), f);
  const motions = CHARACTER_MOTIONS.choimis;
  for (const name of ['masked', 'fallen', 'wink', 'seup', 'facepalm']) { assert.ok(motions[name] && exists(motions[name].src), name); assert.equal(motions[name].scale, 0.5); assert.ok(motions[name].frames.every(f => f.pivot.join() === '64,120')); }
  assert.ok(Math.abs(motions.seup.frames.reduce((s, f) => s + f.duration, 0) - 2.7) < 0.01, '스읍 미스 동작 = 음성 2.7초');
  assert.ok(motions.wink.frames.length >= 3, '윙크는 애니메이션');
  for (let i = 1; i <= 3; i++) { assert.equal(CHARACTERS[`gasuni${i}`].voice, 'gasuni'); assert.ok(exists(`assets/sprites/gasuni${i}.png`) && exists(`assets/portraits/gasuni${i}.png`), `가순이${i} 시트·초상화`); }
  assert.ok(MAP_RUNTIME_ASSETS.jjajang_glade.sprites.includes('choimis') && MAP_RUNTIME_ASSETS.jjajang_glade.portraits.includes('gasuni1'));
  const qa = id => QA_POINTS.find(p => p.id === id);
  assert.deepEqual([qa('jjajang_glade').map, qa('jjajang_glade_bush').spawn, qa('jjajang_glade').party], ['jjajang_glade', 'before_bush', ['gyeongsub', 'ppaman']]);
});
