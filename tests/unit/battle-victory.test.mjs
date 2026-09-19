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
    ['drum_devil', 'youngcle_hover', 'youngcle_tvform', 'park_guardian', 'mankatsuki_junhee', 'expelled_viewer', 'baron', 'red', 'blue']);
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
