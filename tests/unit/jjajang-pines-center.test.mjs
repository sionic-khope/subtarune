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

test('test_pines_plaza_rim_is_thicket_with_centre_trigger', () => {
  const [c0, c1, r0, r1] = map.meta.plaza;
  for (let c = c0; c <= c1; c++) { assert.equal(map.rows[r0][c], '"'); assert.equal(map.rows[r1][c], '"'); }
  for (let r = r0 + 1; r < r1; r++) for (let c = c0 + 1; c < c1; c++) assert.equal(map.rows[r][c], '$', `centre ${c},${r} 비움`);
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
  const dots = idx(n => n.text === '* ..' && !n.speaker), song = idx(n => n.bgm === 'ajimkiya_song');
  const hides = pines_center.map((n, i) => (n.hide && AJIMKIYA.includes(n.hide) ? i : -1)).filter(i => i >= 0);
  const hopPar = idx(n => Array.isArray(n.parallel) && n.parallel.every(branch => Array.isArray(branch) && branch.some(x => x.hop && AJIMKIYA.includes(x.hop)) && branch.some(x => x.show)));
  const dancersSpin = idx(n => String(n.action).includes('spinRate = 5')), entry = idx(n => n.sfx === 'battle_start'), battle = idx(n => n.battle);
  const waits = pines_center.filter(n => typeof n.wait === 'number' && pines_center.indexOf(n) > song).reduce((sum, n) => sum + n.wait, 0);
  assert.ok(bgmOff >= 0 && bgmOff < who && who < bang && bang < janitor && janitor < spawns[0] && spawns[2] < hides[0] && hides[2] < hopPar && hopPar < clip && clip < line && line < dots && dots < song && song < dancersSpin && dancersSpin < entry && entry < battle, '순서: 숨겨 두고 → 점프하며 나타남 → 대사');
  assert.equal(hides.length, 3, '셋 다 숨겨 뒀다가');
  assert.equal(idx(n => n.worldSpin !== undefined), -1, '화면은 돌지 않는다(사용자)');
  assert.ok(Math.abs(waits - 22) < 0.5, '노래는 22초 뒤 전투(사용자)');
  assert.ok(entry > 0, '전투 진입 이펙트·소리(battleEntry)');
  assert.equal(spawns.length, 3, '아짐키야 셋(사용자 “3마리로”)');
  assert.ok(pines_center[spawns[0]].spawn.anim.cols === 4 && pines_center[spawns[0]].spawn.image.includes('ajimkiya1-dance'), '춤추는 소품');
  assert.equal(pines_center[spawns[0]].spawn.y - pines_center[spawns[0]].spawn.iy, 118, '128px 그림(요플래의 약 2배)');
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
    assert.equal(e.lines.speakSfx, 'ajimkiya_line'); assert.equal(e.voice, 'none'); assert.equal(e.soloPattern, true, '말한 한 명만 탄막');
    assert.ok(e.sheet.src === `assets/enemies/${id}-dance.png` && e.sheet.count === 4);
    assert.ok(e.scale >= 1, '전투 스프라이트 크게(사용자 “캐릭터 크기 더 키워”)');
    assert.deepEqual(Object.keys(e.projectiles), ['d1', 'd2', 'd3']);
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
  assert.ok(glyphs.length >= 3 && glyphs.length <= 6 && glyphs.every(b => b.vy < 0 && b.y > box.y + box.h && typeof b.drawShape === 'function'), '글자가 아래에서 위로 드문드문 뿜어진다(일반몹 난이도)');
  const rain = run('ajimkiya_rain', 2);
  assert.ok(rain.length >= 4 && rain.length <= 8 && rain.every(b => b.vy > 0 && b.y < box.y), '글자 비(일반몹 난이도)');
  const dance = run('ajimkiya_dance', 4.5);
  assert.ok(dance.length >= 2 && dance.length <= 4 && dance.every(b => typeof b.steer === 'function' && typeof b.hitShape === 'function' && Math.abs(b.vx) > 0), '무용수가 드문드문 가로지른다(일반몹 난이도)');
});

test('test_pines_center_bgm_rules_and_qa', () => {
  assert.equal(storyBgm('jjajang_pines', { torii_janitor_joined: true, pines_center_started: true }), null, '연출 뒤 전투 전엔 무음');
  assert.equal(storyBgm('jjajang_pines', { torii_janitor_joined: true, pines_center_started: true, pines_ajimkiya_won: true }), 'my_castle_town', '이기면 다시');
  const qa = QA_POINTS.find(p => p.id === 'jjajang_pines_center');
  assert.deepEqual(qa.party, ['janitor']); assert.equal(qa.spawn, 'before_center'); assert.ok(!qa.flags.pines_center_started);
});

test('test_pines_center_after_victory_janitor_talk_face_to_face_and_laugh', () => {
  // BUILD228 사용자 브리핑: 승리 뒤 청소부: 허허허. → 요플래만 한 발짝 앞으로 가 뒤를 돌아본다(마주 봄) → 대사 → 껄껄 뒤 웃음
  const s = pines_center;
  const idx = pred => s.findIndex(pred);
  const battle = idx(n => n.battle), guard = idx((n, i) => i > battle && typeof n.if === 'function');
  const removes = s.map((n, i) => (n.remove && AJIMKIYA.includes(n.remove) ? i : -1)).filter(i => i >= 0);
  const resume = idx(n => String(n.action).includes('resumeMapBgm')), heh = idx(n => n.text === '* 허허허.');
  const step = idx(n => n.move === 'player' && typeof n.px === 'function');
  const faceP = idx(n => n.face === 'player' && n.dir === 'toward:janitor'), faceJ = idx(n => n.face === 'janitor' && n.dir === 'toward:player');
  const after = s.slice(heh).filter(n => n.text).map(n => n.text.replace(/^\* /, ''));
  assert.deepEqual(after, ['허허허.', '검을 휘두르는 동작이 너무 거대하네', '한번에 죽일 수 있는 적에게는 효과적이지만 아마 나중에는 그렇지 않을걸세', '뭐?? 아 미안하네 노인의 혼잣말이라 생각해주게',
    '...틀린말은 아닌거같다.', '나는 더 자세히 물었다.', '나는 싸움같은거 할줄 모르네,', '그렇지만 여기 섬에서 살아남는법은 알고있지.', '일단 다음으로 가보새 껄껄']);
  assert.ok(s.slice(heh).filter(n => n.text && n.text.includes('틀린말') || n.text?.includes('자세히')).every(n => n.voice === 'narrator' && !n.speaker), '나레이션 두 줄');
  assert.ok(battle < removes[0] && removes[2] < guard && guard < resume && resume < heh && heh < step && step < faceP && faceP < faceJ, '전투 → 아짐키야 제거 → (이겼을 때만) 브금 복귀 → 허허허 → 한 발짝 → 마주 봄');
  const fadeIn = idx((n, i) => i > battle && n.fade === 'in'), zoomBack = idx((n, i) => i > battle && n.zoom === 1), regroupFirst = idx((n, i) => i > battle && n.regroup);
  assert.ok(guard < zoomBack && zoomBack < fadeIn && fadeIn < regroupFirst && regroupFirst < heh, '표준 조우처럼 줌 복귀 → 검은 화면 걷기 → 동료 정렬 뒤에 대사(전투 뒤 화면이 검게 남던 것)');
  assert.equal(s[step].exact, true, '한 칸 정확히');
  assert.equal(s[guard].if({ pines_ajimkiya_won: false }), true, '이기지 못했으면 건너뛴다');
  const fake = { player: { x: 100, y: 200, facing: 'right' } };
  assert.deepEqual(s[step].px(fake), [132, 200], '보고 있는 쪽으로 한 칸(32px)');
  assert.deepEqual(s[step].px({ player: { x: 100, y: 200, facing: 'up' } }), [100, 168]);
  const laughs = s.map((n, i) => (n.motion === 'janitor' && n.name === 'laugh' ? i : -1)).filter(i => i >= 0);
  assert.equal(laughs.length, 1, '웃음은 껄껄 뒤 한 번');
  assert.equal(s[laughs[0] - 1].text, '* 일단 다음으로 가보새 껄껄');
  const done = idx(n => n.set?.pines_center_done), regroup = s.map((n, i) => (n.regroup ? i : -1)).filter(i => i >= 0).pop();
  assert.ok(laughs[0] < done && done < regroup, '끝: 플래그 → 동료 정렬');
});
