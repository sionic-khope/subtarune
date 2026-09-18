// 짜장 굽이 길(BUILD227): 위→오른쪽→밑→오른쪽→위 길, 길 위의 돌(청소부가 줍는다, 체력회복 -5), 토리이 길 ↔ 굽이 길 ↔ 소나무 숲 문, 브금은 이 맵부터 my_castle_town
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { jjajang_rock } from '../../src/data/cutscenes/jjajang_bend.js';
import { torii_janitor } from '../../src/data/cutscenes/jjajang_torii.js';
import { SCRIPTS } from '../../src/data/scripts.js';
import { ITEMS } from '../../src/data/items.js';
import { QA_POINTS, storyBgm, stateFromFlags } from '../../src/core/story.js';

const map = JSON.parse(readFileSync(new URL('../../assets/maps/jjajang_bend.json', import.meta.url), 'utf8'));
const rows = map.rows;
const walk = (c, r) => ['$', '&'].includes(rows[r]?.[c]);

test('test_bend_road_goes_up_right_down_right_up', () => {
  assert.equal(rows[40][0], '&'); assert.ok(walk(1, 40) && walk(1, 41), '왼쪽 가장자리 입구');
  assert.ok([...Array(34).keys()].map(r => r + 8).every(r => walk(2, r) && walk(3, r)), '위로(2~3열)');
  assert.ok([8, 9].every(r => [...Array(24).keys()].map(c => c + 2).every(c => walk(c, r))), '오른쪽으로(8~9행)');
  assert.ok([...Array(26).keys()].map(r => r + 8).every(r => walk(24, r) && walk(25, r)), '밑으로(24~25열)');
  assert.ok([32, 33].every(r => [...Array(28).keys()].map(c => c + 24).every(c => walk(c, r))), '오른쪽으로(32~33행)');
  assert.ok([...Array(34).keys()].every(r => walk(50, r) && walk(51, r)), '위로(50~51열) 위 가장자리까지');
  assert.equal(rows[0][50], '&');
  assert.ok(!walk(8, 20) && !walk(38, 20) && !walk(53, 40), '길 밖은 숲');
  // 사용자 “지금보다 두 배는 더 길게”: 길 칸 수 ≈ 1차(67칸 × 2폭)의 두 배
  const roadTiles = rows.reduce((n, row) => n + [...row].filter(ch => ch === '$' || ch === '&').length, 0);
  assert.ok(roadTiles >= 2 * 134 * 0.95, `길 칸 수 ${roadTiles} (1차 134 의 2배 이상)`);
});

test('test_bend_rock_sits_on_the_second_right_leg_and_leaves_a_lane', () => {
  const rock = map.entities.find(e => e.id === 'jjajang_rock');
  assert.deepEqual({ script: rock.script, unless: rock.unless, solid: rock.solid, image: rock.image }, { script: 'jjajang_rock', unless: 'jjajang_rock_taken', solid: true, image: 'assets/props/jjajang_rock.png' });
  const c = Math.floor((rock.x + rock.w / 2) / 32), r0 = Math.floor(rock.y / 32), r1 = Math.floor((rock.y + rock.h - 1) / 32);
  assert.deepEqual([c, r0, r1], [38, 32, 32], '두 번째 가로 다리 윗줄 한 칸만 막는다');
  assert.ok(walk(38, 33), '아랫줄로 지나갈 수 있다');
  assert.equal(rock.iy + 18 * rock.scale, rock.y + rock.h, '그림 밑변 = 히트박스 밑변');
});

test('test_bend_rock_script_lines_pickup_and_item', () => {
  const texts = jjajang_rock.filter(n => n.text).map(n => [n.speaker || 'N', n.text.replace(/^\* /, '')]);
  assert.deepEqual(texts, [['청소부', '허허 볼품없는 돌이라네'], ['청소부', '누군가는 이걸 품어줘야지'], ['N', '{c=yellow}돌{/c}을 얻었다.']]);
  const idx = pred => jjajang_rock.findIndex(pred);
  const walkTo = idx(n => n.move === 'janitor' && n.rel === 'jjajang_rock'), gone = idx(n => n.remove === 'jjajang_rock'), sfx = idx(n => n.sfx === 'item');
  const give = idx(n => String(n.action).includes("inventory.push('돌')")), got = idx(n => n.text?.includes('얻었다')), flag = idx(n => n.set?.jjajang_rock_taken);
  assert.ok(walkTo > 1 && walkTo < gone && gone < sfx && sfx < give && give < got && got < flag, '청소부가 다가가 줍고 → 효과음 → 아이템 → 문구 → 플래그');
  assert.equal(jjajang_rock[0].if({ jjajang_rock_taken: true, torii_janitor_joined: true }), true);
  assert.equal(SCRIPTS.jjajang_rock, jjajang_rock);
  assert.deepEqual({ kind: ITEMS['돌'].kind, heal: ITEMS['돌'].heal }, { kind: 'plain', heal: -5 });
  assert.ok(stateFromFlags({ jjajang_rock_taken: true }).inventory.includes('돌'));
});

test('test_bend_doors_bgm_qa_and_join_sfx', () => {
  const west = map.entities.find(e => e.id === 'bend_torii_door'), north = map.entities.find(e => e.id === 'bend_pines_door');
  assert.deepEqual([west.to, west.spawn, west.x, west.w], ['jjajang_torii', 'from_east', 0, 10]);
  assert.deepEqual([north.to, north.spawn, north.y, north.h], ['jjajang_walk', 'from_west', 0, 10], '위 가장자리 문 → 곧은 길');
  assert.equal(map.bgm, 'my_castle_town');
  assert.equal(storyBgm('jjajang_bend', { torii_janitor_joined: true }), 'my_castle_town', '다음 맵(굽이 길)부터');
  assert.equal(storyBgm('jjajang_torii', { torii_janitor_joined: true }), 'wise_words');
  assert.deepEqual(QA_POINTS.find(p => p.id === 'jjajang_bend').party, ['janitor']);
  const joinLine = torii_janitor.findIndex(n => n.text?.includes('동료가 되었다'));
  assert.equal(torii_janitor[joinLine - 1].sfx, 'item', '합류 문구 직전에 합류 효과음');
});
