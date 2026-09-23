import test from 'node:test';
import assert from 'node:assert/strict';
import { ENEMIES } from '../../src/data/enemies.js';
import { BATTLE_BGS } from '../../src/battle/backgrounds.js';
import { drawChoimisSkyBackground } from '../../src/battle/choimis-sky-background.js';
import { Battle } from '../../src/battle/battle.js';
import { Board, Soul, PATTERNS } from '../../src/battle/bullets.js';
import { getBattleMode } from '../../src/battle/modes.js';
import { choimisLyricAt, drawChoimisKaraoke } from '../../src/battle/choimis-karaoke.js';

test('test_choimis_battle_uses_approved_hp_sprite_and_menu_copy', () => {
  const enemy = ENEMIES.choimis_flower;
  assert.equal(enemy.hp, 200);
  assert.equal(enemy.boss, true);
  assert.deepEqual(enemy.sheet, { src: 'assets/enemies/choimis-flower-idle.png', cols: 2, rows: 2, count: 4, fps: 1000 / 280, px: 1 });
  assert.deepEqual(enemy.pivot, [80, 152]);
  assert.equal(enemy.lines.appear, '* 최미스가 승부를 걸어왔다.');
  assert.deepEqual(enemy.lines.idle, ['* 짜장면의 냄새가 풍긴다.', '* 핑크색이 보인다.']);
  assert.equal(enemy.idle.swayX, 0);
  assert.equal(enemy.idle.swayY, 0);
  assert.equal(enemy.scale, 0.506);
  assert.equal(enemy.scaleY, 1.2);
  assert.equal(ENEMIES.drum_devil.scaleY, undefined);
  assert.equal(enemy.actions.choso.src, 'assets/enemies/choimis-choso.png');
  assert.deepEqual(enemy.projectiles, {
    jjajang: 'assets/props/dark_jjajang.png',
    mic: 'assets/enemies/choimis-rap.png',
    fashion: 'assets/props/choimis-fashion.png',
    dao: 'assets/enemies/dao-battle.png',
    bazzi: 'assets/enemies/bazzi-battle.png',
    daoKart: 'assets/props/choimis-dao-kart.png',
    bazziKart: 'assets/props/choimis-bazzi-kart.png',
  });
  assert.deepEqual(enemy.patterns.map(pattern => [pattern.type, pattern.speak]), [
    ['choimis_jjajang', '내 짜장면 맛 좀 볼래?'],
    ['choimis_choso', '내 추구미는 쵸소우야'],
    ['choimis_rap', '요 최미스 래퍼딱지를때이젠앰씨로 포에버 포에버'],
    ['choimis_money', '가져가라.'],
    ['choimis_seup', '스읍 미스'],
    ['choimis_fashion', '이거 패션어떰?'],
    ['choimis_pink_choso', '내 추구미는 쵸소우야'],
    ['choimis_pink_kart', '막자할게'],
    ['choimis_pink_prism', '차징해서 쏜 공격 아닌 이상 이 코어들은 무너지지 않아.'],
    ['choimis_eating_race', '짜장면 먹방 대결해볼까? 들어와'],
  ]);
  assert.equal(enemy.openingMode, 'choimis_pink_shooter');
  assert.deepEqual(enemy.openingLines.map(line => [line.speaker, line.portrait, line.voice, line.text]), [
    ['최미스', 'choimis_flower', 'choimis_flower', '* 형들 꼭 그렇게 저를 막으셔야겠다면'],
    ['최미스', 'choimis_flower', 'choimis_flower', '* 여러분들의 마음을 핑크로 물들여보세요.'],
  ]);
  assert.ok(enemy.patterns.slice(0, 6).every(pattern => typeof PATTERNS[pattern.type] === 'function'));
  assert.ok(enemy.patterns.slice(6).every(pattern => typeof getBattleMode('enemy', pattern.mode) === 'function'));
});

test('test_choimis_battle_vertical_scale_keeps_width_and_foot_anchor_for_idle_and_actions', () => {
  const draws = [];
  const ctx = {
    globalAlpha: 1, filter: '', save() {}, restore() {}, translate() {}, scale() {},
    drawImage: (...args) => draws.push(args),
  };
  const battle = Object.assign(Object.create(Battle.prototype), { support: null, t: 0, game: { time: 0 } });
  const image = { width: 320, height: 320 };
  const enemy = {
    id: 'choimis_flower', def: ENEMIES.choimis_flower, img: image, actionImages: { choso: image },
    x: 396, y: 176, hp: 200, maxHp: 200, dead: false, dying: 0, shake: 0, blink: 0, popup: null,
    patternPose: null,
  };
  const assertTallDraw = call => {
    const [, , , sourceW, sourceH, left, top, width, height] = call;
    assert.deepEqual([sourceW, sourceH, width, height], [160, 160, 81, 97]);
    assert.equal(left + Math.round(ENEMIES.choimis_flower.pivot[0] * ENEMIES.choimis_flower.scale), enemy.x);
    assert.equal(top + Math.round(ENEMIES.choimis_flower.pivot[1] * ENEMIES.choimis_flower.scale * ENEMIES.choimis_flower.scaleY), enemy.y);
  };
  battle.drawEnemy(ctx, enemy);
  assertTallDraw(draws.at(-1));
  draws.length = 0;
  enemy.patternPose = { sheet: 'choso', frame: 0 };
  battle.drawEnemy(ctx, enemy);
  assertTallDraw(draws.at(-1));

  draws.length = 0;
  const ordinary = { ...enemy, id: 'ordinary', def: { ...ENEMIES.choimis_flower, scaleY: undefined }, patternPose: null };
  battle.drawEnemy(ctx, ordinary);
  const ordinaryDraw = draws.at(-1);
  assert.deepEqual(ordinaryDraw.slice(-2), [81, 81]);
  assert.equal(ordinaryDraw[6] + Math.round(152 * 0.506), ordinary.y);
});

test('test_choimis_opening_mode_runs_once_per_attempt_and_retry_rearms_it', () => {
  const sounds = [];
  const battle = Object.assign(Object.create(Battle.prototype), {
    cfg: { seamlessIntro: 'choimis_sky' }, openingShown: false,
    enemies: [{ def: ENEMIES.choimis_flower }], members: [],
    cancelPendingBgm() {}, disposeGimmick() {}, sfx(name) { sounds.push(name); },
    game: { fadeTo() {}, sound: { preloadBgm() {} }, shake: null },
  });
  assert.equal(battle.takeOpeningMode(), 'choimis_pink_shooter');
  assert.equal(battle.takeOpeningMode(), null);
  battle.beginRetry();
  assert.equal(battle.takeOpeningMode(), 'choimis_pink_shooter');
  assert.ok(sounds.includes('weaponpull'));
  assert.ok(!sounds.includes('battle_start'));
});

test('test_choimis_actual_turn_dispatch_alternates_independent_cycles_and_retry_restarts_after_opening', () => {
  const enemy = { id: 'choimis_flower', def: ENEMIES.choimis_flower, hp: 200, maxHp: 200,
    dead: false, dying: 0, patternIdx: 0, enraged: false, actionImages: {}, projectiles: {} };
  const battle = Object.assign(Object.create(Battle.prototype), {
    cfg: { seamlessIntro: 'choimis_sky' }, enemies: [enemy], members: [], support: null,
    openingShown: false, modes: { enemy: 'bullets' }, board: new Board(), soul: new Soul(),
    rnd: () => 0.5, setText() {}, sfx() {}, cancelPendingBgm() {},
    game: { fadeTo() {}, sound: { preloadBgm() {}, blip() {} } },
  });
  const regular = ['choimis_jjajang', 'choimis_choso', 'choimis_rap', 'choimis_money', 'choimis_seup', 'choimis_fashion', 'choimis_eating_race'];
  const pink = ['choimis_pink_choso', 'choimis_pink_kart', 'choimis_pink_prism'];
  const instantiated = [], originals = new Map(regular.filter(type => PATTERNS[type]).map(type => [type, PATTERNS[type]]));
  for (const [type, create] of originals) PATTERNS[type] = config => { instantiated.push(config.type); return create(config); };
  try {
    assert.equal(battle.takeOpeningMode(), 'choimis_pink_shooter');
    battle.startEnemyMode('choimis_pink_shooter');
    assert.equal(enemy.patternIdx, 0, 'mandatory opening consumes no ordinary turn');
    battle.disposeGimmick();
    for (let turn = 0; turn < 86; turn++) {
      const expected = turn % 2 ? pink[Math.floor(turn / 2) % pink.length] : regular[Math.floor(turn / 2) % regular.length];
      const selected = battle.nextPatternConfig(enemy).config;
      assert.equal(selected.type, expected, `selected turn ${turn}`);
      assert.equal(enemy.patternIdx, turn, 'preview does not consume a turn');
      battle.beginEnemyTurn();
      if (selected.mode) {
        assert.equal(battle.state, 'enemy-mode');
        assert.equal(battle.activeEnemyMode, selected.mode);
        battle.disposeGimmick();
      } else {
        assert.equal(battle.state, 'enemy-prep');
        assert.equal(battle.bubble.text, selected.speak, 'speech uses the same selected config');
        assert.equal(enemy.patternIdx, turn, 'ordinary prep does not advance early');
        battle.beginBullets();
        assert.equal(instantiated.at(-1), expected, 'real bullet constructor uses the selected config');
      }
      assert.equal(enemy.patternIdx, turn + 1, 'every mode advances exactly once');
    }
    battle.beginRetry();
    assert.equal(enemy.patternIdx, 0);
    assert.equal(battle.takeOpeningMode(), 'choimis_pink_shooter');
    assert.equal(battle.takeOpeningMode(), null);
    assert.equal(battle.nextPatternConfig(enemy).config.type, 'choimis_jjajang');
    battle.beginEnemyTurn(); battle.beginBullets();
    assert.equal(battle.nextPatternConfig(enemy).config.type, 'choimis_pink_choso');
  } finally {
    battle.disposeGimmick();
    for (const [type, create] of originals) PATTERNS[type] = create;
  }
});

test('test_choimis_opening_focus_hides_actors_before_board_updates_and_restores_them_before_menu', () => {
  let modeUpdates = 0, afterCalls = 0;
  const battle = Object.assign(Object.create(Battle.prototype), {
    state: 'enemy-mode', t: 0, actorFocus: { phase: 'out', t: 0, duration: 0.22 },
    members: [], enemies: [], fx: [], patterns: [], bullets: [], board: new Board(), soul: new Soul(),
    game: { sound: {}, time: 1 }, support: null, bubble: null,
    gimmick: { update() { modeUpdates++; return modeUpdates > 1; }, dispose() {} },
    typeText() {}, clearPatternPresentation() {}, afterEnemyPhase() { afterCalls++; },
  });
  const input = { just: () => false };

  battle.update(0.1, input);
  assert.equal(modeUpdates, 0);
  assert.ok(battle.openingActorAlpha() > 0 && battle.openingActorAlpha() < 1);
  battle.update(0.12, input);
  assert.equal(modeUpdates, 1);
  assert.equal(battle.openingActorAlpha(), 0);
  battle.update(0.01, input);
  assert.equal(battle.state, 'enemy-mode-restore');
  assert.equal(battle.openingActorAlpha(), 0);
  battle.update(0.11, input);
  assert.equal(afterCalls, 0);
  assert.equal(battle.openingActorAlpha(), 0.5);
  battle.update(0.11, input);
  assert.equal(afterCalls, 1);
  assert.equal(battle.openingActorAlpha(), 1);
});

test('test_choimis_choso_recorded_preamble_finishes_before_costume_attack_without_voice_blips', () => {
  const sounds = [], blips = [];
  const enemy = { id: 'choimis_flower', def: ENEMIES.choimis_flower, hp: 200, maxHp: 200,
    dead: false, dying: 0, patternIdx: 2, enraged: false };
  const battle = Object.assign(Object.create(Battle.prototype), {
    enemies: [enemy], members: [], support: null, modes: { enemy: 'bullets' },
    board: new Board(), soul: new Soul(), rnd: () => 0.5, setText() {},
    sfx(name) { sounds.push(name); }, game: { sound: { blip(voice) { blips.push(voice); } } },
  });
  const idle = { down: () => false };
  battle.beginEnemyTurn();
  assert.deepEqual(sounds, ['choimis_chosouya']);
  for (let step = 0; step < 32; step++) { battle.t += 0.05; battle.updatePrep(0.05, idle); }
  assert.equal(battle.state, 'enemy-prep', '1.7-second recorded clip cannot be interrupted by transformation');
  assert.equal(enemy.patternPose, undefined);
  assert.deepEqual(blips, []);
  for (let step = 0; step < 5 && battle.state === 'enemy-prep'; step++) { battle.t += 0.05; battle.updatePrep(0.05, idle); }
  assert.equal(battle.state, 'bullets');
  assert.equal(enemy.patternIdx, 3);
  assert.deepEqual(sounds, ['choimis_chosouya']);
});

test('test_choimis_sky_keeps_three_party_supports_and_moves_only_the_sea_left', () => {
  const sky = { id: 'night-sky' }, calls = [];
  const ctx = {
    globalAlpha: 1, fillStyle: '',
    drawImage: (...args) => calls.push(['image', ...args]),
    fillRect: (...args) => calls.push(['paint', ...args]),
    save: () => calls.push(['save']), restore: () => calls.push(['restore']),
  };
  const battle = {
    t: 1.25,
    game: { propImages: { 'assets/backdrops/jjajang_night_sea.png': sky } },
    members: [{ home: [84, 104] }, { home: [84, 164] }, { home: [84, 224] }],
    enemies: [{ x: 396, y: 176, oy: 2, dead: false }],
  };
  drawChoimisSkyBackground(ctx, battle);
  assert.equal(BATTLE_BGS.choimis_sky, drawChoimisSkyBackground);
  assert.deepEqual(calls[0], ['paint', 0, 0, 480, 360]);
  assert.deepEqual(calls[1], ['image', sky, 0, 0, 480, 360, 0, 0, 480, 360]);
  const platformPaint = calls.filter(call => call[0] === 'paint' && call[3] <= 4 && call[4] <= 2 && call[1] < 130);
  assert.ok(platformPaint.length >= 162, 'three dense 54-petal party platforms render');
  assert.equal(calls.filter(call => call[0] === 'image').length, 19);
  const earlierSea = calls.find(call => call[0] === 'image' && call[3] === 216);
  calls.length = 0;
  battle.game.time = 2.25;
  drawChoimisSkyBackground(ctx, battle);
  const laterSea = calls.find(call => call[0] === 'image' && call[3] === 216);
  assert.ok(laterSea[2] > earlierSea[2], 'fixed screen origin samples farther right as water travels left');
  assert.deepEqual(calls[1], ['image', sky, 0, 0, 480, 360, 0, 0, 480, 360], 'moon and stars stay fixed');
  calls.length = 0;
  battle.openingActorAlpha = () => 0;
  drawChoimisSkyBackground(ctx, battle);
  assert.ok(calls.filter(call => call[0] === 'paint').length < 162, 'party supports hide with party actors');
});

test('test_choimis_seamless_intro_keeps_the_previous_frame_until_assets_are_ready', async () => {
  const fades = [];
  const battle = Object.assign(Object.create(Battle.prototype), {
    cfg: { enemies: ['choimis_flower'], bgm: 'choimis_battle', bg: 'choimis_sky', seamlessIntro: 'choimis_sky' },
    state: 'load', t: 0, members: [], fx: [], patterns: [], board: new Board(), soul: new Soul(),
    text: '', shown: 0, textT: 0, support: null,
    enemies: [{ id: 'choimis_flower', name: '최미스', hp: 200, maxHp: 200,
      def: { ...ENEMIES.choimis_flower, actions: {}, projectiles: {} } }],
    loadEnemyImage: async () => ({}),
    game: { partyHp: {}, fadeTo: (...args) => fades.push(args), sound: { playBgm() {}, blip() {}, sfx() {} } },
  });
  const drawCalls = [];
  battle.draw({ fillRect: (...args) => drawCalls.push(args) });
  assert.deepEqual(drawCalls, []);

  await battle.load();
  assert.equal(battle.state, 'intro');
  assert.deepEqual(fades, []);
});

test('test_choimis_karaoke_reads_only_the_audio_clock_and_recomputes_after_seek', () => {
  const cue = choimisLyricAt(24.25);
  assert.equal(cue.text, '가재맨 방 고닉 최미스');
  const calls = [];
  const ctx = {
    globalAlpha: 1, font: '', textAlign: '', textBaseline: '', lineJoin: '', strokeStyle: '', fillStyle: '', lineWidth: 0,
    save() {}, restore() {}, measureText: () => ({ width: 8 }),
    beginPath() {}, rect() {}, clip() {},
    strokeText: (text, x, y) => calls.push(['stroke', text, x, y]),
    fillText: (text, x, y) => calls.push(['fill', text, x, y]),
  };
  const battle = { cfg: { bgm: 'choimis_battle' }, state: 'menu', game: { sound: { bgmName: 'choimis_battle', bgm: { currentTime: 24.25 } } } };
  drawChoimisKaraoke(ctx, battle);
  assert.ok(calls.filter(call => call[0] === 'fill').length >= 1);

  calls.length = 0; battle.game.sound.bgm.currentTime = 10;
  drawChoimisKaraoke(ctx, battle);
  assert.deepEqual(calls, []);

  battle.game.sound.bgm.currentTime = 46.3;
  assert.equal(choimisLyricAt(battle.game.sound.bgm.currentTime).text, '최미스! 최미스! 가재맨! 방고닉!');
  assert.equal(choimisLyricAt(42.35).text, '쟤들은 날 이해 하지 못해');
  assert.equal(choimisLyricAt(45).text, '오늘도 스읍 미스');
  assert.equal(choimisLyricAt(165).text, '오늘도 스읍 미스');
  assert.equal(choimisLyricAt(0), null);

  calls.length = 0; battle.state = 'lose';
  drawChoimisKaraoke(ctx, battle);
  assert.deepEqual(calls, []);
});
