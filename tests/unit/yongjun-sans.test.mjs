// 박용준 히든 보스(BUILD462): 보라꽃 연출 판매·오마카세 강화·전투 정의·샌즈식 오프닝·패턴 여섯의 계약.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Bullet, PATTERNS } from '../../src/battle/bullets.js';
import { YONGJUN_PATTERNS } from '../../src/battle/yongjun-patterns.js';
import { createYongjunSansIntro } from '../../src/battle/modes/yongjun-sans-intro.js';
import { ENEMIES } from '../../src/data/enemies.js';
import { ITEMS } from '../../src/data/items.js';
import { CHARACTERS } from '../../src/data/characters.js';
import { YONGJUN_SANS } from '../../src/data/yongjun-sans.js';
import { raisePartyMaxHp, saleItemState, sellShopItem } from '../../src/core/shop.js';
import { stateFromFlags } from '../../src/core/story.js';
import { SCRIPTS } from '../../src/data/scripts.js';

const BOX = { x: 120, y: 134, w: 240, h: 160 };
const makeGame = (state = {}) => ({
  flags: {}, inventory: [], party: ['gyeongsub', 'ppaman'], partyHp: {}, money: 300, attack: 2, hpBonus: 20, mapId: 'maillard_lounge', saves: 0,
  has(key) { return !!this.flags[key]; },
  setFlag(key, value = true) { this.flags[key] = value; },
  maxHpOf(id) { return (CHARACTERS[id]?.hp ?? 100) + this.hpBonus; },
  hpOf(id) { const max = this.maxHpOf(id); return Math.max(0, Math.min(max, this.partyHp[id] ?? max)); },
  autosave() { this.saves++; },
  ...state,
});

test('test_yongjun_flower_item_is_minus_hundred_and_sells_only_as_the_lounge_event', () => {
  assert.deepEqual(ITEMS['보라꽃'], { kind: 'plain', heal: -100, desc: ITEMS['보라꽃'].desc });
  const lounge = makeGame({ inventory: ['바나나', '보라꽃'] });
  const state = saleItemState(lounge, 1);
  assert.equal(state.ok, true);
  assert.equal(state.price, undefined);
  assert.equal(state.event.script, 'yongjun_flower');
  assert.equal(typeof SCRIPTS[state.event.script], 'object');
  const elsewhere = makeGame({ inventory: ['보라꽃'], mapId: 'ship_lounge' });
  assert.equal(saleItemState(elsewhere, 0).reason, 'unsellable');
  const result = sellShopItem(lounge, 1);
  assert.equal(result.ok, true);
  assert.deepEqual(lounge.inventory, ['바나나']);
  assert.equal(lounge.money, 300, 'no money for the flower');
  assert.equal(lounge.flags.yongjun_flower_sold, true);
  assert.equal(lounge.saves, 0, 'the scene saves when it finishes, not at the sale');
});

test('test_yongjun_omakase_raises_every_member_max_hp_and_current_hp_by_ten', () => {
  const game = makeGame({ partyHp: { hyungsub: 50 } });
  const before = ['hyungsub', 'gyeongsub', 'ppaman'].map(id => [game.maxHpOf(id), game.hpOf(id)]);
  raisePartyMaxHp(game, 10);
  assert.equal(game.hpBonus, 30);
  ['hyungsub', 'gyeongsub', 'ppaman'].forEach((id, i) => { assert.equal(game.maxHpOf(id), before[i][0] + 10); assert.equal(game.hpOf(id), before[i][1] + 10); });
  const derived = stateFromFlags({ purple_flower_taken: true, yongjun_flower_sold: true, yongjun_sans_won: true, yongjun_omakase_eaten: true }, { enemyMoney: () => 0 });
  assert.equal(derived.inventory.includes('보라꽃'), false);
  assert.equal(derived.hpBonus, 10);
  assert.equal(stateFromFlags({ purple_flower_taken: true }).inventory.includes('보라꽃'), true);
});

test('test_yongjun_boss_hp_hundred_no_dodge_six_distinct_patterns_each_with_a_turn_line', () => {
  const def = ENEMIES.yongjun_sans;
  assert.equal(def.hp, 100);
  assert.equal(def.boss, true);
  assert.equal(def.support, 'yongjun_sans');
  // 냄새 블래스터는 오프닝 첫 강공격 전용(YONGJUN_SANS.openingPattern), 차례에는 없다
  assert.deepEqual(def.patterns.map(p => p.type), Object.keys(YONGJUN_PATTERNS).filter(type => type !== 'yongjun_blaster'));
  assert.equal(YONGJUN_SANS.openingPattern.type, 'yongjun_blaster');
  for (const p of def.patterns) { assert.equal(PATTERNS[p.type], YONGJUN_PATTERNS[p.type]); assert.ok(p.silent || (p.speak && p.speak.length <= 30), p.type); }
  assert.equal(new Set(def.patterns.filter(p => !p.silent).map(p => p.speak)).size, 5);
  assert.equal(def.patterns.find(p => p.type === 'yongjun_hug').silent, true, 'the hug shouts inside the box instead of a bubble');
});

function simulate(type, fps = 60) {
  const pattern = YONGJUN_PATTERNS[type]({});
  const soul = { x: BOX.x + BOX.w / 2, y: BOX.y + BOX.h / 2, r: 6 };
  const emitted = [], sounds = [], poses = [];
  let active = [];
  const api = { box: BOX, soul, rnd: (() => { let s = 11; return () => (s = (s * 16807) % 2147483647) / 2147483647; })(), actor: { x: 390, y: 236, scale: 0.9 }, images: {},
    emit(o) { const b = new Bullet(o); emitted.push(b); active.push(b); return b; }, sfx(name) { sounds.push(name); }, present(pose) { poses.push(pose); } };
  const dt = 1 / fps;
  for (let t = 0; t < pattern.duration + 4; t += dt) {
    if (t < pattern.duration) pattern.update(t, dt, api);
    for (const b of active) {
      b.update(dt, BOX);
      if (b.harmless) for (let x = BOX.x + 8; x < BOX.x + BOX.w; x += 24) for (let y = BOX.y + 8; y < BOX.y + BOX.h; y += 24) assert.equal(b.hits({ x, y, r: 6 }), false, `${type}: warnings never hurt`);
    }
    active = active.filter(b => !b.out(BOX));
  }
  return { emitted, sounds, poses, active, soul };
}

for (const type of Object.keys(YONGJUN_PATTERNS)) {
  test(`test_yongjun_pattern_${type}_warns_emits_hazards_and_cleans_up_at_60_and_240hz`, () => {
    for (const fps of [60, 240]) {
      const { emitted, active, sounds } = simulate(type, fps);
      assert.ok(emitted.some(b => !b.harmless), `${type}@${fps}: hazards`);
      assert.ok(emitted.some(b => b.harmless), `${type}@${fps}: a warning comes first`);
      assert.ok(emitted.every(b => Number.isFinite(b.life) && b.life > 0), `${type}@${fps}: finite lives`);
      assert.equal(active.length, 0, `${type}@${fps}: everything is gone after the turn`);
      assert.ok(sounds.length > 0 && sounds.length < 40, `${type}@${fps}: one sound per action, not per bullet (${sounds.length})`);
    }
  });
}

test('test_yongjun_center_patterns_move_the_heart_off_the_body_before_it_can_hurt', () => {
  for (const type of ['yongjun_stench', 'yongjun_hug']) {
    const { soul } = simulate(type);
    assert.ok(soul.y > BOX.y + BOX.h / 2 + 30, `${type}: heart moved down (${soul.y})`);
  }
});

test('test_yongjun_intro_follows_the_sans_beats_and_leaves_the_music_off', () => {
  const sfx = [], blips = [], bgm = [];
  const enemy = { def: ENEMIES.yongjun_sans, patternPose: null };
  const battle = { bubble: null, drawTextBox() {}, sfx: name => sfx.push(name),
    game: { sound: { blip: v => blips.push(v), stopBgm: f => bgm.push(['stop', f]), playBgm: (name, o) => bgm.push(['play', name, o]) } } };
  const mode = createYongjunSansIntro(battle, { enemy });
  let pressed = false;
  const input = { just: key => key === 'confirm' && pressed };
  const seen = [], phases = [];
  let done = false;
  for (let t = 0; t < 40 && !done; t += 1 / 60) {
    pressed = Math.round(t * 60) % 30 === 0;
    done = mode.update(1 / 60, input);
    const s = mode.snapshot;
    if (phases.at(-1) !== s.phase) phases.push(s.phase);
    if (s.bubble && seen.at(-1) !== s.bubble) seen.push(s.bubble);
  }
  assert.equal(done, true);
  assert.deepEqual(phases, ['wait', 'talk', 'pause', 'black', 'still', 'hell', 'done']);
  assert.deepEqual(seen, [...YONGJUN_SANS.lines, YONGJUN_SANS.hell]);
  assert.deepEqual(sfx, ['switch_noise', 'switch_noise'], '촵 촵');
  assert.deepEqual(bgm.map(b => b.slice(0, 2)), [['stop', 0.01]], 'Megalovania waits until after the opening attack');
  assert.ok(blips.length > 0 && blips.every(v => v === 'yongjun'), 'the three lines speak with his voice, the last line is silent');
  assert.equal(enemy.patternPose, null);
});

test('test_yongjun_flower_qa_point_is_last_in_shift_q_and_never_counts_as_story_progress', async () => {
  const { QA_POINTS, qaProgress } = await import('../../src/core/story.js');
  const menu = QA_POINTS.filter(p => !p.hidden);
  const point = menu.at(-1);
  assert.equal(point.id, 'yongjun_flower');
  assert.equal(point.map, 'maillard_lounge');
  assert.equal(point.flags.purple_flower_taken, true);
  assert.equal(stateFromFlags(point.flags).inventory.includes('보라꽃'), true);
  const reached = qaProgress(point.flags, point.stage, point.map);
  assert.equal(menu[reached].id, 'maillard_lounge', 'a save holding the flower in the lounge is still the lounge');
});

test('test_yongjun_support_opening_attack_then_line_then_megalovania_and_retry_restarts', async () => {
  const { createYongjunSansSupport } = await import('../../src/battle/support/yongjun-sans.js');
  const bgm = [];
  const enemy = { def: ENEMIES.yongjun_sans, patternIdx: 1 };
  const battle = { enemies: [enemy], bubble: null, drawTextBox() {}, game: { sound: { blip() {}, playBgm: (name) => bgm.push(name), preloadBgm() {}, loadSfxFiles() {} } } };
  const support = createYongjunSansSupport(battle);
  assert.equal(support.preemptiveMode(), 'yongjun_sans_intro');
  assert.equal(support.patternsFor, undefined, 'normal turns keep def.patterns and their speak lines');
  assert.equal(support.enemyTurnNext(), true, 'after the intro the enemy attacks before any menu');
  assert.deepEqual(support.patternsFor(enemy), [YONGJUN_SANS.openingPattern]);
  assert.equal(support.silentTurn(enemy), true);
  const interlude = support.afterEnemyPhase();
  assert.equal(battle.bubble.text, YONGJUN_SANS.afterOpening);
  assert.equal(enemy.patternIdx, 0);
  let done = false;
  for (let i = 0; i < 200 && !done; i++) done = interlude.update(1 / 60, { just: key => key === 'confirm' && i % 20 === 19 });
  assert.equal(done, true);
  assert.deepEqual(bgm, ['megalovania']);
  assert.equal(support.enemyTurnNext(), false);
  assert.equal(support.patternsFor, undefined);
  assert.equal(support.afterEnemyPhase(), null);
  support.reset();
  assert.equal(support.preemptiveMode(), 'yongjun_sans_intro', 'retry plays the opening again');
});
