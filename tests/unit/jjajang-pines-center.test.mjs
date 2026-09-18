// 소나무 숲 공터 아짐키야 조우(BUILD227): 풀숲 전체·트리거, 컷신 순서(브금 끔 → ??? → ! → 청소부 → 넷 등장 → 클립 대사 → .. → 노래·회전 22초 → 전투), 적 정의(체력 8·10원·패턴·대사·클립), 청소부 첫 턴 대사·데미지 1, 전투 브금 규칙
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pines_center, AJIMKIYA } from '../../src/data/cutscenes/jjajang_pines.js';
import { ENEMIES } from '../../src/data/enemies.js';
import { PATTERNS } from '../../src/battle/bullets.js';
import { AJIMKIYA_TEXT } from '../../src/battle/ajimkiya-patterns.js';
import { SCRIPTS } from '../../src/data/scripts.js';
import { QA_POINTS, storyBgm, stateFromFlags } from '../../src/core/story.js';
import { getTile } from '../../src/world/tiles.js';

const map = JSON.parse(readFileSync(new URL('../../assets/maps/jjajang_pines.json', import.meta.url), 'utf8'));

test('test_pines_plaza_is_all_thicket_with_centre_trigger', () => {
  const [c0, c1, r0, r1] = map.meta.plaza;
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) assert.equal(map.rows[r][c], '"', `plaza ${c},${r}`);
  assert.equal(getTile('"').variants, 3, '풀숲은 칸마다 다른 모양');
  const trigger = map.entities.find(e => e.type === 'trigger');
  assert.deepEqual({ script: trigger.script, once: trigger.once, flag: trigger.flag, unless: trigger.unless }, { script: 'pines_center', once: true, flag: 'pines_center_started', unless: 'pines_ajimkiya_won' });
  assert.ok(trigger.x >= 37 * 32 && trigger.x + trigger.w <= 39 * 32 && trigger.y === 10 * 32, '공터 한가운데');
  assert.ok(map.spawns.before_center.x < trigger.x);
});

test('test_pines_center_script_order', () => {
  const idx = pred => pines_center.findIndex(pred);
  const bgmOff = idx(n => 'bgm' in n && n.bgm === null), who = idx(n => n.speaker === '???' && n.text === '* ~~.. 디짐');
  const bang = idx(n => n.emote === 'player' && n.kind === '!'), janitor = idx(n => n.speaker === '청소부' && n.text.includes('허허 이게 무슨소린가.'));
  const spawns = pines_center.map((n, i) => (n.spawn && AJIMKIYA.includes(n.spawn.id) ? i : -1)).filter(i => i >= 0);
  const clip = idx(n => n.sfx === 'ajimkiya_line'), line = idx(n => n.speaker === '아짐키야' && n.text === '* 가재맨 애미뒤짐' && n.voice === 'none');
  const dots = idx(n => n.text === '* ..' && !n.speaker), song = idx(n => n.bgm === 'ajimkiya_song'), spinOn = idx(n => n.worldSpin === 0.9);
  const wait = idx(n => n.wait === 22), spinOff = idx(n => n.worldSpin === 0), battle = idx(n => n.battle);
  assert.ok(bgmOff >= 0 && bgmOff < who && who < bang && bang < janitor && janitor < spawns[0] && spawns[3] < clip && clip < line && line < dots && dots < song && song < spinOn && spinOn < wait && wait < spinOff && spinOff < battle, '순서');
  assert.equal(spawns.length, 4);
  assert.ok(pines_center[spawns[0]].spawn.anim.cols === 4 && pines_center[spawns[0]].spawn.image.includes('ajimkiya1-dance'), '춤추는 소품');
  const b = pines_center[battle].battle;
  assert.deepEqual(b.enemies, AJIMKIYA); assert.equal(b.bgm, 'jjajang_battle'); assert.equal(b.flag, 'pines_ajimkiya_won');
  assert.deepEqual(b.memberDamage, { janitor: 1 });
  assert.deepEqual(b.memberIntro.janitor.map(l => l.text), ['* 뭐 뭐라고? 공격을 하라고?', '* 껄껄 난 그런거 잘못한다네', '* 이거라도 던져보겠네 허허']);
  assert.ok(b.memberIntro.janitor.every(l => l.speaker === '청소부' && l.voice === 'janitor'));
  assert.equal(SCRIPTS.pines_center, pines_center);
  assert.equal(pines_center[0].if({ pines_ajimkiya_won: true }), true);
});

test('test_ajimkiya_enemies_hp8_money10_patterns_lines_clip', () => {
  let money = 0;
  for (const id of AJIMKIYA) {
    const e = ENEMIES[id];
    assert.equal(e.hp, 8); money += e.money;
    assert.deepEqual(e.patterns.map(p => p.type), ['ajimkiya_spew', 'ajimkiya_rain', 'ajimkiya_dance']);
    assert.deepEqual(e.lines.speak, ['가재맨ㅇㅁ뒤짐~', '땡개땡개~ ㅇㅁ뒤짐~']);
    assert.equal(e.lines.speakSfx, 'ajimkiya_line'); assert.equal(e.voice, 'none');
    assert.ok(e.sheet.src === `assets/enemies/${id}-dance.png` && e.sheet.count === 4);
    assert.deepEqual(Object.keys(e.projectiles), ['d1', 'd2', 'd3', 'd4']);
  }
  assert.equal(money, 10, '이기면 10원');
  assert.equal(stateFromFlags({ pines_ajimkiya_won: true }, { enemyMoney: id => ENEMIES[id].money }).money, 10);
  for (const type of ['ajimkiya_spew', 'ajimkiya_rain', 'ajimkiya_dance']) assert.equal(typeof PATTERNS[type], 'function');
  assert.equal(AJIMKIYA_TEXT, '가재맨애미뒤짐');
});

test('test_ajimkiya_patterns_emit_glyph_bullets_and_dancers', () => {
  const box = { x: 100, y: 100, w: 280, h: 140 };
  const run = (type, seconds) => { const p = PATTERNS[type]({}); const out = []; const api = { box, soul: { x: 240, y: 170, r: 8 }, rnd: () => 0.5, emit: b => out.push(b), images: {} }; let t = 0; const dt = 0.05; while (t < seconds) { p.update(t, dt, api); t += dt; } return out; };
  const spew = run('ajimkiya_spew', 3);
  assert.ok(spew.some(b => b.harmless && b.life > 5), '상자 아래 무용수 무대(무해)');
  const glyphs = spew.filter(b => !b.harmless);
  assert.ok(glyphs.length >= 8 && glyphs.every(b => b.vy < 0 && b.y > box.y + box.h && typeof b.drawShape === 'function'), '글자가 아래에서 위로 뿜어진다');
  const rain = run('ajimkiya_rain', 2);
  assert.ok(rain.length >= 10 && rain.every(b => b.vy > 0 && b.y < box.y), '글자 비');
  const dance = run('ajimkiya_dance', 3);
  assert.ok(dance.length >= 3 && dance.every(b => typeof b.steer === 'function' && typeof b.hitShape === 'function' && Math.abs(b.vx) > 0), '무용수가 가로지른다');
});

test('test_pines_center_bgm_rules_and_qa', () => {
  assert.equal(storyBgm('jjajang_pines', { torii_janitor_joined: true, pines_center_started: true }), null, '연출 뒤 전투 전엔 무음');
  assert.equal(storyBgm('jjajang_pines', { torii_janitor_joined: true, pines_center_started: true, pines_ajimkiya_won: true }), 'my_castle_town', '이기면 다시');
  const qa = QA_POINTS.find(p => p.id === 'jjajang_pines_center');
  assert.deepEqual(qa.party, ['janitor']); assert.equal(qa.spawn, 'before_center'); assert.ok(!qa.flags.pines_center_started);
});
