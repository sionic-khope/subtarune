import test from 'node:test';
import assert from 'node:assert/strict';
import { ChoimisRescue, finishChoimisRescue } from '../../src/scenes/choimis-rescue.js';
import { rescueGeometry } from '../../src/scenes/choimis-rescue-render.js';
import { CHOIMIS_RESCUE_NODES, choimis_rescue } from '../../src/data/cutscenes/choimis_rescue.js';
import { choimis_sky } from '../../src/data/cutscenes/choimis_sky.js';

function setup() {
  const sounds = [], handles = [];
  const game = { sound: { bgmName: null,
    sfx: name => { sounds.push(name); const h = { pause() { this.paused = true; } }; handles.push(h); return h; },
    stopBgm() { this.bgmName = null; },
  }, dialogue: { script: [], wait: {}, onEnd() {} }, textbox: { close() {} }, flags: {} };
  const assets = { images: { jet: { width: 400, height: 200 } }, sprites: {}, cancelled: false };
  const scene = new ChoimisRescue(game, assets);
  game.choimisRescue = scene; game.choimisRescueAssets = assets;
  return { scene, game, sounds, handles };
}

test('rescue keeps every supplied line in order and only corrects speaker typo', () => {
  const mapIndex = CHOIMIS_RESCUE_NODES.findIndex(n => n.map);
  assert.deepEqual(CHOIMIS_RESCUE_NODES.slice(0, mapIndex).filter(n => n.text).map(n => n.text.slice(2)), [
    '휴 드디어 잡았네요', 'ㅋㅋ 그니까 근데 여기 진짜 높다.', '잠깐 근데 이거 하늘을 날수있는 이유가..',
    '최미스 힘때문이라면 지금은...', '으아아아아악!!', '오 형들 하이요 ㅋㅋ', '머야 씨바',
    '저희가 만든 무기에요 이름하여 냄트기', '...', '저희 진짜 노력 많이했습니다.',
    '가재맨이 불쌍해질정도로 강한 무기들이 많아요', '오 ㅋㅋ',
    '일단 영클형이 형들 데려오라고 해서 엄청대박인배로 가시죠', 'ㅋㅋㅋ',
    '어 근데 저기 핑크색 어떤새끼가 떨어지고있는데 어떡하죠', '버려 씨바', '빠맨아.', '...네',
    '네 일단 쟤까지 챙겨갈게요',
  ]);
  assert.equal(CHOIMIS_RESCUE_NODES.find(n => n.text === '* 으아아아아악!!').speaker, '억빠맨');
});

test('victory goes directly to shared rescue and then the authored lounge spawn', () => {
  const index = choimis_sky.findIndex(n => n.battle);
  assert.equal(choimis_sky[index + 1], CHOIMIS_RESCUE_NODES[0]);
  assert.equal(choimis_rescue[1], CHOIMIS_RESCUE_NODES[0]);
  assert.deepEqual(CHOIMIS_RESCUE_NODES.filter(n => n.map), [{ map: 'ship_lounge', spawn: 'from_rescue', bgm: false }]);
  assert.deepEqual(CHOIMIS_RESCUE_NODES.filter(n => n.stage).map(n => n.stage), ['choimis_rescued', 'ship_lounge_briefed']);
  assert.ok(CHOIMIS_RESCUE_NODES.findIndex(n => n.stage) > CHOIMIS_RESCUE_NODES.findIndex(n => n.rescueBeat === 'flyaway'));
});

test('petals disappear gradually before the three sequential three-dot reactions', () => {
  const { scene } = setup();
  assert.equal(rescueGeometry(scene).petals, 1);
  scene.setBeat('petals_fade'); scene.update(1.2);
  assert.equal(rescueGeometry(scene).petals, 0.5);
  scene.update(1.2); assert.equal(rescueGeometry(scene).petals, 0);
  const ids = ['ppaman', 'gyeongsub', 'hyungsub'];
  for (const id of ids) {
    scene.setBeat(`dots_${id}`);
    assert.equal(scene.bubble.dots, 3);
    for (let i = 0; i < 20; i++) scene.update(0.05);
    assert.equal(scene.bubble.shown, 3);
  }
  assert.deepEqual(CHOIMIS_RESCUE_NODES.filter(n => n.rescueBeat?.startsWith('dots')).map(n => n.rescueBeat), ids.map(id => `dots_${id}`));
});

test('fall moves all three actors offscreen before the distant ocean camera', () => {
  const { scene } = setup(); scene.setBeat('party_fall');
  const before = scene.snapshot().party;
  scene.update(0.85); const halfway = scene.snapshot().party;
  scene.update(0.85); const after = scene.snapshot().party;
  after.forEach((member, i) => {
    assert.ok(halfway[i].y > before[i].y && halfway[i].y < member.y);
    assert.ok(member.y - member.height > 360);
  });
  scene.setBeat('ocean_fall'); assert.equal(scene.snapshot().sky, false);
});

test('three catches are contact-timed and do not repeat while scene remains visible', () => {
  const { scene, sounds } = setup(); scene.setBeat('catch');
  scene.update(0.17); assert.equal(scene.catchCount, 0);
  scene.update(0.02); assert.equal(scene.catchCount, 1);
  scene.update(0.32); assert.equal(scene.catchCount, 2);
  scene.update(0.32); assert.equal(scene.catchCount, 3);
  scene.update(4); assert.equal(sounds.filter(s => s === 'wing').length, 3);
});

test('jet flight keeps moving during dialogue and rescues normal Choimis before departure', () => {
  const { scene } = setup(); scene.setBeat('jet_reveal'); scene.update(2);
  const first = scene.model.scroll; scene.update(2); assert.ok(scene.model.scroll < first);
  scene.setBeat('spot_choimis'); assert.equal(scene.snapshot().choimisCaught, false);
  scene.setBeat('save_choimis'); scene.update(1.51); assert.equal(scene.snapshot().choimisCaught, true);
  scene.setBeat('flyaway'); scene.update(2); assert.ok(scene.snapshot().jet.x > 480);
});

test('abort disposes handles, assets and script without setting completion or late cues', () => {
  const { scene, game, sounds, handles } = setup(); scene.setBeat('party_fall');
  game.sound.bgmName = 'vs_lancer'; finishChoimisRescue(game, true);
  assert.equal(game.choimisRescue, null); assert.equal(game.choimisRescueAssets, null);
  assert.equal(game.dialogue.script, null); assert.equal(game.sound.bgmName, null);
  assert.deepEqual(game.flags, {}); assert.ok(handles.every(h => h.paused));
  const count = sounds.length; scene.update(2); scene.setBeat('catch');
  assert.equal(sounds.length, count);
});
