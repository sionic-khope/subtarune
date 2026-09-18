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
  assert.equal(rows[20][0], '&'); assert.ok(walk(1, 20) && walk(1, 21), '왼쪽 가장자리 입구');
  assert.ok([...Array(16).keys()].map(r => r + 6).every(r => walk(2, r) && walk(3, r)), '위로(2~3열)');
  assert.ok([6, 7].every(r => [...Array(12).keys()].map(c => c + 2).every(c => walk(c, r))), '오른쪽으로(6~7행)');
  assert.ok([...Array(12).keys()].map(r => r + 6).every(r => walk(12, r) && walk(13, r)), '밑으로(12~13열)');
  assert.ok([16, 17].every(r => [...Array(14).keys()].map(c => c + 12).every(c => walk(c, r))), '오른쪽으로(16~17행)');
  assert.ok([...Array(18).keys()].every(r => walk(24, r) && walk(25, r)), '위로(24~25열) 위 가장자리까지');
  assert.equal(rows[0][24], '&');
  assert.ok(!walk(8, 12) && !walk(18, 10) && !walk(27, 20), '길 밖은 숲');
});

test('test_bend_rock_sits_on_the_second_right_leg_and_leaves_a_lane', () => {
  const rock = map.entities.find(e => e.id === 'jjajang_rock');
  assert.deepEqual({ script: rock.script, unless: rock.unless, solid: rock.solid, image: rock.image }, { script: 'jjajang_rock', unless: 'jjajang_rock_taken', solid: true, image: 'assets/props/jjajang_rock.png' });
  const c = Math.floor((rock.x + rock.w / 2) / 32), r0 = Math.floor(rock.y / 32), r1 = Math.floor((rock.y + rock.h - 1) / 32);
  assert.deepEqual([c, r0, r1], [18, 16, 16], '두 번째 가로 다리 윗줄 한 칸만 막는다');
  assert.ok(walk(18, 17), '아랫줄로 지나갈 수 있다');
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
  assert.deepEqual([north.to, north.spawn, north.y, north.h], ['jjajang_pines', 'from_south', 0, 10]);
  assert.equal(map.bgm, 'my_castle_town');
  assert.equal(storyBgm('jjajang_bend', { torii_janitor_joined: true }), 'my_castle_town', '다음 맵(굽이 길)부터');
  assert.equal(storyBgm('jjajang_torii', { torii_janitor_joined: true }), 'wise_words');
  assert.deepEqual(QA_POINTS.find(p => p.id === 'jjajang_bend').party, ['janitor']);
  const joinLine = torii_janitor.findIndex(n => n.text?.includes('동료가 되었다'));
  assert.equal(torii_janitor[joinLine - 1].sfx, 'item', '합류 문구 직전에 합류 효과음');
});
