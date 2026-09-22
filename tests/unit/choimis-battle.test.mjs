import test from 'node:test';
import assert from 'node:assert/strict';
import { ENEMIES } from '../../src/data/enemies.js';
import { BATTLE_BGS } from '../../src/battle/backgrounds.js';
import { drawChoimisSkyBackground } from '../../src/battle/choimis-sky-background.js';
import { Battle } from '../../src/battle/battle.js';
import { Board, Soul, PATTERNS } from '../../src/battle/bullets.js';
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
  assert.ok(enemy.idle.swayY > 0);
  assert.equal(enemy.scale, 0.506);
  assert.equal(enemy.actions.choso.src, 'assets/enemies/choimis-choso.png');
  assert.deepEqual(enemy.projectiles, {
    jjajang: 'assets/props/dark_jjajang.png',
    mic: 'assets/enemies/choimis-rap.png',
    fashion: 'assets/props/choimis-fashion.png',
  });
  assert.deepEqual(enemy.patterns.map(pattern => [pattern.type, pattern.speak]), [
    ['choimis_jjajang', undefined],
    ['choimis_choso', '내 추구미는 쵸소우야'],
    ['choimis_rap', '요 최미스 래퍼딱지를때이젠앰씨로 포에버 포에버'],
    ['choimis_money', '가져가라.'],
    ['choimis_seup', '스읍 미스'],
    ['choimis_fashion', '이거 패션어떰?'],
  ]);
  assert.equal(enemy.openingMode, 'choimis_pink_shooter');
  assert.deepEqual(enemy.openingLines.map(line => [line.speaker, line.portrait, line.voice, line.text]), [
    ['최미스', 'choimis_flower', 'choimis_flower', '* 형들 꼭 그렇게 저를 막으셔야겠다면'],
    ['최미스', 'choimis_flower', 'choimis_flower', '* 여러분들의 마음을 핑크로 물들여보세요.'],
  ]);
  assert.ok(enemy.patterns.every(pattern => typeof PATTERNS[pattern.type] === 'function'));
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

test('test_choimis_sky_preserves_moon_and_sea_with_petal_supports_for_every_actor', () => {
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
  assert.ok(calls.filter(call => call[0] === 'paint').length >= 230, 'four dense petal platforms plus airborne petals render');
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
  const cue = choimisLyricAt(24.1);
  assert.equal(cue.text, '가재맨 방 고닉 최미스');
  const calls = [];
  const ctx = {
    globalAlpha: 1, font: '', textAlign: '', textBaseline: '', lineJoin: '', strokeStyle: '', fillStyle: '', lineWidth: 0,
    save() {}, restore() {}, measureText: () => ({ width: 8 }),
    strokeText: (text, x, y) => calls.push(['stroke', text, x, y]),
    fillText: (text, x, y) => calls.push(['fill', text, x, y]),
  };
  const battle = { cfg: { bgm: 'choimis_battle' }, state: 'menu', game: { sound: { bgmName: 'choimis_battle', bgm: { currentTime: 24.1 } } } };
  drawChoimisKaraoke(ctx, battle);
  assert.ok(calls.filter(call => call[0] === 'fill').length >= 1);

  calls.length = 0; battle.game.sound.bgm.currentTime = 10;
  drawChoimisKaraoke(ctx, battle);
  assert.deepEqual(calls, []);

  battle.game.sound.bgm.currentTime = 46.2;
  assert.equal(choimisLyricAt(battle.game.sound.bgm.currentTime).text, '최미스! 최미스! 가재맨! 방고닉!');
  assert.equal(choimisLyricAt(42.2).text, '쟤들은 날 이해 하지 못해');
  assert.equal(choimisLyricAt(44.9).text, '오늘도 스읍 미스');
  assert.equal(choimisLyricAt(164.9).text, '오늘도 스읍 미스');
  assert.equal(choimisLyricAt(0), null);

  calls.length = 0; battle.state = 'lose';
  drawChoimisKaraoke(ctx, battle);
  assert.deepEqual(calls, []);
});
