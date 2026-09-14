import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { youngcle_lounge_plan_b } from '../../src/data/cutscenes/youngcle_lounge.js';
import { drawYoungcleLoungeEffects, youngcleCageDropWaiter } from '../../src/scenes/youngcle-lounge-effects.js';
import { QA_POINTS } from '../../src/core/story.js';

const text = youngcle_lounge_plan_b.filter(node => node.text).map(node => node.text.slice(2));

test('test_plan_b_keeps_every_requested_line_in_order', () => {
  const expected = [
    '헉 헉 헉', '무슨 퍼즐이 이렇게 있죠???', '이 족같은 영클 에잇', '어 형 진 진정하세요',
    '아시발', '뭔데 화풀이하노 ㅋㅋ', '바로 보자면서 함정이나 만들어놓고 말이야 너 !!', '?', '?',
    '뭔개소리노?', '시치미때지마 시발년아', 'ㄴㄴ진짜모름', '??? 아니 너가 보자했는데', 'ㅇㅇ',
    '함정이랑 몬스터가 우릴 막 공격했다니까', '아설마', '??', 'ㅂㅅ새끼 혹시 오른쪽문 쓰셨나요?',
    '그런데?', '거기는 함정존임', '??? 아니 왜 무슨',
    '라운지맵 왼쪽에 뻔하게 편하게 오는 천사문 있는데 왜 거길로감? ㅋㅋ ㅂㅅ임?', '...',
    '음 근데 차라리 잘됐음', '뭐가?', '... ... ...', '플랜B', '..뭐 뭐하는거야 영클아 지금',
    '오 경섭이형 ㅎㅇㅎㅇ', '어 반갑다', '왜 쥰희랑 용준이를 납치하신거에요?', '흠',
    '쥰희랑 용준이는 적이 아니에요', 'ㅇㅇ', '네?', '내 알바 아님 ㅋㅋ 알아서 잘 나와보샘',
    '그리고 조심해라 그 다음방은', 'ㅇ..왜 우리는 철창으로 공격 안하시죠', '그야',
    '두개밖에 준비안했음 ㅇ', '...', '원래 완벽한 플랜B는 없음', '네', 'ㅇㅇ ㅂㅇ',
    '어.. 일단 쥰희랑 용준이는 알아서하겠죠 영클형 보러 갑시다', '다음방이 걱정되는데 난..',
  ];
  assert.deepEqual(text, expected);
});

test('test_plan_b_uses_existing_tv_cutaway_and_two_target_cage_sequence', () => {
  const map = JSON.parse(fs.readFileSync('assets/maps/youngcle6.json', 'utf8'));
  const cages = youngcle_lounge_plan_b.find(node => node.youngcleCageDrop)?.youngcleCageDrop;
  assert.deepEqual(cages.targets, ['youngcle6_junhee', 'youngcle6_yongjun']);
  assert.equal(cages.sfx, 'whoosh');
  assert.equal(cages.impactSfx, 'plug');
  assert.equal(cages.impactBodySfx, 'thud');
  assert.ok(map.preload.includes('assets/props/youngcle_electric_cage.png'));
  assert.ok(map.preload.includes('assets/props/youngcle1_walls.png'));
  assert.ok(map.preload.includes('assets/props/youngcle_angel_door145.png'));
  for (const actor of map.entities.filter(entity => ['youngcle6_junhee', 'youngcle6_yongjun'].includes(entity.id))) {
    assert.equal(actor.unless, 'youngcle_lounge_plan_b_done');
  }
});

test('test_cages_leave_afterimages_hit_once_and_take_both_actors_below_view', () => {
  const actors = [
    { id: 'youngcle6_junhee', x: 252, y: 244, w: 24, h: 16, visible: true, solid: false },
    { id: 'youngcle6_yongjun', x: 364, y: 244, w: 24, h: 16, visible: true, solid: false },
  ];
  const sounds = [];
  const game = { entities: actors, camera: { y: 0 }, sound: {
    sfx: name => sounds.push(name), stopBgm: () => sounds.push('stop-bgm'),
  } };
  const waiter = youngcleCageDropWaiter(game, { targets: actors.map(actor => actor.id),
    sfx: 'whoosh', impactSfx: 'plug', impactBodySfx: 'thud', fallDuration: 0.2,
    impactHold: 0.1, carryDuration: 0.3 });
  waiter.update(0.08);
  assert.ok(game.youngcleCages.every(cage => cage.trails.length > 0));
  for (let i = 0; i < 20 && !waiter.update(0.05); i += 1) {}
  assert.deepEqual(sounds, ['whoosh', 'stop-bgm', 'plug', 'thud']);
  assert.ok(actors.every(actor => !actor.visible && actor.y > 360));
  assert.equal(game.youngcleCages, null);
});

test('test_cage_impact_emotes_each_remaining_party_hero_once', () => {
  const captives = [
    { id: 'youngcle6_junhee', x: 252, y: 244, w: 24, h: 16, visible: true, solid: false },
    { id: 'youngcle6_yongjun', x: 364, y: 244, w: 24, h: 16, visible: true, solid: false },
  ];
  const heroes = [
    { id: 'gyeongsub', x: 244, y: 312, w: 24, h: 16, visible: true, solid: false },
    { id: 'ppaman', x: 372, y: 312, w: 24, h: 16, visible: true, solid: false },
  ];
  const player = { id: 'player', x: 308, y: 312, w: 24, h: 16, visible: true, solid: false };
  const sounds = [];
  const game = { player, entities: [...captives, ...heroes], camera: { y: 0 }, sound: {
    sfx: name => sounds.push(name), stopBgm: () => sounds.push('stop-bgm'),
  } };

  const waiter = youngcleCageDropWaiter(game, { targets: captives.map(actor => actor.id),
    sfx: 'whoosh', impactSfx: 'plug', impactBodySfx: 'thud', fallDuration: 0.2,
    impactHold: 0.1, carryDuration: 0.3 });
  waiter.update(0.2);
  assert.equal(player.emote, undefined);
  assert.ok(heroes.every(hero => hero.emote === undefined));

  waiter.update(0.01);
  assert.deepEqual([player, ...heroes].map(hero => hero.emote), [
    { kind: '!', t: 0, life: 1 }, { kind: '!', t: 0, life: 1 }, { kind: '!', t: 0, life: 1 },
  ]);
  assert.equal(sounds.filter(name => name === 'chime').length, 1);

  waiter.update(0.01);
  assert.equal(sounds.filter(name => name === 'chime').length, 1);
  assert.ok(captives.every(captive => captive.emote === undefined));
});

test('test_cage_impact_emotes_reuse_the_scene_zoom_transform_above_the_cages', () => {
  const transforms = [];
  const hero = id => ({ id, x: 240, y: 300, w: 24, h: 16, emote: { kind: '!', t: 0, life: 1 },
    sprite: { fh: 64, px: 2 }, def: {} });
  const game = { camera: { x: 0, y: 0 }, zoom: { s: 0.72 }, player: hero('player'),
    entities: [hero('gyeongsub'), hero('ppaman')], youngcleCages: [{}], propImages: {} };
  const ctx = { globalAlpha: 1, save: () => transforms.push(['save']), restore: () => transforms.push(['restore']),
    translate: (x, y) => transforms.push(['translate', x, y]), scale: (x, y) => transforms.push(['scale', x, y]),
    fillRect: () => {} };

  drawYoungcleLoungeEffects(ctx, game, game.camera);

  assert.deepEqual(transforms.slice(-5), [
    ['save'], ['translate', 240, 180], ['scale', 0.72, 0.72], ['translate', -240, -180], ['restore'],
  ]);
});

test('test_plan_b_has_before_and_after_qa_checkpoints_with_same_party_state', () => {
  const before = QA_POINTS.find(point => point.id === 'youngcle6');
  const after = QA_POINTS.find(point => point.id === 'youngcle6_after_plan_b');
  assert.deepEqual(after.party, before.party);
  assert.equal(before.flags.youngcle_lounge_plan_b_done, undefined);
  assert.equal(after.flags.youngcle_lounge_plan_b_done, true);
});
