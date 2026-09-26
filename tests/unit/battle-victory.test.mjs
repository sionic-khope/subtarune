import test from 'node:test';
import assert from 'node:assert/strict';
import { Battle } from '../../src/battle/battle.js';
import { Board, Soul } from '../../src/battle/bullets.js';
import { ENEMIES } from '../../src/data/enemies.js';
import L from '../../src/data/locale/ko.js';

const idleInput = { just: () => false, down: () => false };
const confirmInput = { just: key => key === 'confirm', down: () => false };

function fixture(ids) {
  const sounds = [], stops = [], fades = [], ended = [], music = [];
  const battle = Object.assign(Object.create(Battle.prototype), {
    cfg: { enemies: ids, flag: 'fixture_won', bgm: 'fixture_bgm' },
    state: 'act', t: 0, text: '', textT: 0, shown: 0, fx: [],
    plans: [], actIdx: 0, actWait: 0, cur: null, rnd: () => 0.5,
    board: new Board(), soul: new Soul(), bullets: [], patterns: [],
    members: [
      { id: 'hyungsub', hp: 73, maxHp: 100, down: false },
      { id: 'kyungsub', hp: 0, maxHp: 120, down: true, downTurns: 2 },
    ],
    enemies: ids.map(id => ({ id, def: ENEMIES[id], hp: 0, dead: true })),
    game: { money: 17, partyHp: { hyungsub: 73, kyungsub: 0 },
      fadeTo: (...args) => fades.push(args), endBattle: result => ended.push(result),
      sound: { sfx: name => sounds.push(name), stopBgm: duration => stops.push(duration),
        playBgm: (...args) => music.push(args), blip() {} },
    },
  });
  return { battle, sounds, stops, fades, ended, music };
}

test('test_boss_victory_metadata_marks_only_registered_story_bosses', () => {
  assert.deepEqual(Object.keys(ENEMIES).filter(id => ENEMIES[id].boss),
    ['gajaeman_runner', 'malzahar_sub', 'choimis_flower', 'teen_giant', 'drum_devil', 'youngcle_hover', 'youngcle_tvform', 'park_guardian', 'domijorim', 'dohyun', 'mankatsuki_junhee', 'expelled_viewer', 'baron', 'red', 'blue']);   // 도미조림·도현(BUILD275): 벚꽃 숲 5 보스전 — 승리음 없음(사용자 “보스전에서는 승리음 안 떠야”)
});

for (const [ids, boss] of [
  [['cs_red', 'cs_blue'], false], [['red', 'blue'], true], [['baron'], true],
  [['mankatsuki_junhee'], true], [['expelled_viewer'], true], [['cs_red', 'red'], true], [['park_guardian'], true],
]) {
  test(`test_${ids.join('_')}_victory_keeps_reward_revive_confirmation_and_continuation`, () => {
    const { battle, sounds, stops, fades, ended } = fixture(ids);
    const gain = ids.reduce((total, id) => total + (ENEMIES[id].money ?? 30), 0);

    battle.update(0.01, idleInput);

    assert.equal(battle.bossBattle, boss);
    assert.equal(battle.state, 'win');
    assert.equal(battle.text, L.battle_win_money.replace('{n}', gain));
    assert.equal(battle.game.money, 17 + gain);
    assert.deepEqual(battle.members.map(member => [member.hp, member.down]), [[73, false], [60, false]]);
    assert.deepEqual(stops, [boss ? 1.8 : 0.3]);
    assert.deepEqual(sounds, boss ? [] : ['won']);
    assert.deepEqual(fades, []);

    battle.update(0, confirmInput);
    assert.equal(battle.state, 'win');
    assert.equal(battle.typed, true);
    for (let i = 0; i < 10; i++) battle.update(0.1, idleInput);
    assert.equal(battle.state, 'win');
    assert.equal(battle.game.money, 17 + gain);
    assert.equal(stops.length, 1);
    assert.deepEqual(ended, []);

    battle.update(0, confirmInput);
    assert.equal(battle.state, 'ending');
    assert.deepEqual(battle.game.partyHp, { hyungsub: 73, kyungsub: 60 });
    assert.equal(fades.length, 1);
    assert.deepEqual([fades[0][0], fades[0][1], fades[0][3]], [1, boss ? 1.8 : 0.35, 'black']);
    assert.deepEqual(ended, []);
    for (let i = 0; i < 10; i++) battle.update(0.05, confirmInput);
    battle.finish(true);
    assert.equal(fades.length, 1);
    assert.equal(battle.game.money, 17 + gain);
    fades[0][2]();
    assert.deepEqual(ended, [{ win: true }]);
    assert.equal(battle.cfg.flag, 'fixture_won');
  });
}

test('test_boss_victory_cancels_a_pending_battle_music_start', () => {
  const { battle, stops, music } = fixture(['mankatsuki_junhee']);
  battle.bgmWait = 0.4;
  battle.bgmLoadToken = {};
  battle.update(0.01, idleInput);
  battle.update(0.5, idleInput);
  assert.deepEqual(stops, [1.8]);
  assert.deepEqual(music, []);
  assert.equal(battle.bgmLoadToken, null);
});

test('test_living_boss_blocks_victory_until_the_final_enemy_dies', () => {
  const { battle, stops, sounds } = fixture(['red', 'blue']);
  battle.enemies[1].dead = false;
  battle.enemies[1].hp = 1;
  battle.beginEnemyTurn = () => { battle.state = 'enemy-prep'; };
  battle.update(0.01, idleInput);
  assert.equal(battle.state, 'enemy-prep');
  assert.equal(battle.game.money, 17);
  assert.equal(battle.members[1].down, true);
  assert.deepEqual(stops, []);
  assert.deepEqual(sounds, []);
});

test('test_nonwinning_boss_exit_keeps_the_existing_screen_fade', () => {
  const { battle, fades } = fixture(['baron']);
  battle.finish(false);
  assert.equal(fades[0][1], 0.35);
});

for (const id of ['choimis_flower', 'cs_red']) test(`test_${id}_duplicate_win_and_finished_reentry_credit_only_once`, () => {
  const { battle, stops, sounds, fades, ended } = fixture([id]);
  const expected = 17 + (ENEMIES[id].money ?? 30);
  battle.beginWin();
  battle.t = 0.75;
  battle.beginWin();
  assert.equal(battle.game.money, expected);
  assert.equal(battle.t, 0.75);
  assert.equal(stops.length, 1);
  assert.equal(sounds.length, battle.bossBattle ? 0 : 1);
  battle.finish(true);
  battle.beginWin();
  assert.equal(battle.state, 'ending');
  assert.equal(battle.game.money, expected);
  assert.equal(stops.length, 1);
  fades[0][2]();
  battle.beginWin();
  assert.equal(battle.game.money, expected);
  assert.deepEqual(ended, [{ win: true }]);
});

test('test_loss_retry_does_not_prevent_its_first_successful_reward', () => {
  const { battle } = fixture(['choimis_flower']);
  battle.state = 'lose';
  battle.game.sound.preloadBgm = () => {};
  for (const enemy of battle.enemies) enemy.maxHp = enemy.def.hp;
  battle.beginRetry();
  assert.equal(battle.game.money, 17);
  battle.state = 'act';
  for (const enemy of battle.enemies) { enemy.hp = 0; enemy.dead = true; }
  battle.beginWin(); battle.beginWin();
  assert.equal(battle.game.money, 15000017);
  const fresh = fixture(['choimis_flower']).battle;
  fresh.beginWin();
  assert.equal(fresh.game.money, 15000017);
});

test('test_win_enters_settled_state_before_cleanup_can_reenter', () => {
  const { battle } = fixture(['choimis_flower']);
  let cleanups = 0;
  battle.stopRapVideo = () => { cleanups++; battle.beginWin(); };
  battle.beginWin();
  assert.equal(cleanups, 1);
  assert.equal(battle.game.money, 15000017);
});

for (const id of ['malzahar_sub', 'cs_red']) test(`test_${id}_skip_victory_text_finishes_without_confirmation_and_settles_once`, () => {
  const { battle, stops, sounds, fades, ended, music } = fixture([id]);
  battle.cfg.skipVictoryText = true;
  battle.bgmWait = 0.4;
  battle.bgmLoadToken = {};
  const expected = 17 + (ENEMIES[id].money ?? 30);

  battle.update(0.01, idleInput);

  assert.equal(battle.state, 'ending');
  assert.equal(battle.text, '');
  assert.deepEqual(battle.result, { win: true });
  assert.equal(battle.game.money, expected);
  assert.deepEqual(battle.members.map(member => [member.hp, member.down]), [[73, false], [60, false]]);
  assert.deepEqual(battle.game.partyHp, { hyungsub: 73, kyungsub: 60 });
  assert.equal(battle.bgmLoadToken, null);
  assert.deepEqual(stops, [battle.bossBattle ? 1.8 : 0.3]);
  assert.deepEqual(sounds, battle.bossBattle ? [] : ['won']);
  assert.equal(fades.length, 1);
  assert.deepEqual([fades[0][0], fades[0][1], fades[0][3]], [1, battle.bossBattle ? 1.8 : 0.35, 'black']);
  assert.deepEqual(ended, []);

  battle.update(1, idleInput);
  battle.beginWin();
  battle.finish(true);
  assert.equal(battle.game.money, expected);
  assert.equal(fades.length, 1);
  assert.equal(stops.length, 1);
  assert.deepEqual(music, []);
  fades[0][2]();
  battle.beginWin();
  assert.deepEqual(ended, [{ win: true }]);
  assert.equal(battle.game.money, expected);
  assert.equal(battle.cfg.flag, 'fixture_won');
});

test('test_opted_in_enemy_mode_captures_its_last_frame_and_hp_before_disposal_and_keeps_it_during_ending', t => {
  const { battle, fades } = fixture(['malzahar_sub']);
  battle.cfg.skipVictoryText = true;
  battle.state = 'enemy-mode';
  battle.activeEnemyMode = 'malzahar_runner';
  battle.members.forEach(member => { member.name = member.id; });
  const events = [], capturedText = [], presented = [];
  const captureContext = {
    fillRect: (...args) => events.push(['fillRect', ...args]),
    fillText: text => capturedText.push(text),
    measureText: text => ({ width: text.length * 4 }),
  };
  const canvas = { getContext: kind => { assert.equal(kind, '2d'); return captureContext; } };
  const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  Object.defineProperty(globalThis, 'document', { configurable: true, value: {
    createElement: tag => { assert.equal(tag, 'canvas'); events.push(['create']); return canvas; },
  } });
  t.after(() => {
    if (originalDocument) Object.defineProperty(globalThis, 'document', originalDocument);
    else delete globalThis.document;
  });
  let completed = false;
  battle.gimmick = {
    fullscreen: true, hpStrip: true, preserveFinalFrame: true,
    update: () => completed,
    draw: context => { assert.equal(context, captureContext); events.push(['last-frame']); context.fillRect(12, 24, 100, 50); },
    dispose: () => events.push(['dispose']),
  };

  battle.update(0.01, idleInput);
  assert.equal(battle.state, 'enemy-mode');
  assert.equal(battle.endingFrame, undefined);
  assert.deepEqual(events, []);

  completed = true;
  battle.update(0.01, idleInput);
  assert.equal(battle.state, 'ending');
  assert.equal(battle.endingFrame, canvas);
  assert.deepEqual([canvas.width, canvas.height], [480, 360]);
  assert.equal(captureContext.imageSmoothingEnabled, false);
  assert.deepEqual(events.slice(0, 3), [['create'], ['last-frame'], ['fillRect', 12, 24, 100, 50]]);
  assert.deepEqual(events.at(-1), ['dispose']);
  assert.equal(events.filter(event => event[0] === 'dispose').length, 1);
  assert.ok(capturedText.includes('73/ 100'));
  assert.ok(capturedText.includes('0/ 120'));
  assert.equal(battle.gimmick, null);
  assert.equal(battle.activeEnemyMode, null);
  assert.equal(battle.text, '');

  const displayContext = { fillRect() {}, drawImage: (...args) => presented.push(args) };
  battle.draw(displayContext);
  battle.update(0.5, idleInput);
  battle.draw(displayContext);
  assert.deepEqual(presented, [[canvas, 0, 0], [canvas, 0, 0]]);
  assert.equal(events.filter(event => event[0] === 'create').length, 1);
  assert.equal(fades.length, 1);
});

test('test_ordinary_enemy_mode_completion_does_not_capture_a_frame_or_skip_victory_confirmation', () => {
  const { battle, fades } = fixture(['cs_red']);
  battle.state = 'enemy-mode';
  battle.activeEnemyMode = 'fixture_mode';
  let disposed = 0;
  battle.gimmick = {
    fullscreen: true, update: () => true,
    draw: () => assert.fail('ordinary mode must not draw an opt-in final frame'),
    dispose: () => { disposed++; },
  };

  battle.update(0.01, idleInput);

  assert.equal(battle.state, 'win');
  assert.equal(battle.text, L.battle_win_money.replace('{n}', ENEMIES.cs_red.money ?? 30));
  assert.equal(battle.endingFrame, undefined);
  assert.equal(disposed, 1);
  assert.equal(battle.gimmick, null);
  assert.deepEqual(fades, []);
  battle.update(0, confirmInput);
  battle.update(0.7, confirmInput);
  assert.equal(battle.state, 'ending');
  assert.equal(battle.endingFrame, undefined);
  assert.equal(fades.length, 1);
});
