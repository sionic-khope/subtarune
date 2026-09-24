import { BOULDER_ACTORS as A, prepareCastleBoulder, finishCastleBoulder,
  restoreCastleBoulder, separateBoulderParty } from '../../scenes/castle-boulder.js';
import { startCastleBoulderPush } from '../../scenes/castle-boulder-push.js';

const V = text => ({ speaker: '영클', portrait: 'youngcle', voice: 'youngcle', text: `* ${text}` });
const J = text => ({ speaker: '쥰희', portrait: 'junhee', voice: 'junhee', text: `* ${text}` });
const P = text => ({ speaker: '억빠맨', portrait: 'ppaman', voice: 'ppaman', text: `* ${text}` });
const K = text => ({ speaker: '경섭', portrait: 'gyeongsub', voice: 'gyeongsub', text: `* ${text}` });
const B = text => ({ speaker: '따뜻한비데', portrait: 'warm_bidet', voice: 'warm_bidet', text: `* ${text}` });
const T = text => ({ speaker: '뚜울라알라', portrait: 'ttuulla', voice: 'ttuulla', text: `* ${text}` });
const G = text => ({ speaker: '파크가디언', portrait: 'park_guardian_costume', voice: 'park_guardian_costume', text: `* ${text}` });
const PARTY = ['player', 'gyeongsub', 'ppaman'];
const WALKERS = [...PARTY, A.bidet, A.mario];
const ALL = [...WALKERS, A.youngcle, A.junhee, A.ttuulla, A.park];
const PUSHERS = ALL.filter(id => id !== A.youngcle);
const close = { action: game => game.textbox.close() };
const find = (game, id) => id === 'player' ? game.player : game.entities.find(entity => entity.id === id && !entity.dead);
const point = (game, name, offset = [0, 0]) => {
  const at = game.map.def.meta.boulder.anchors[name];
  return [at[0] + offset[0], at[1] + offset[1]];
};
const at = (id, name, by = [0, 0], extra = {}) => ({ move: id, px: game => point(game, name, by), exact: true, ...extra });
const camera = (x, y, duration = 1.4) => ({ camera: [(x - 16) / 32, (y - 16) / 32], duration });
const face = (ids, dir) => ids.map(id => ({ face: id, dir }));
const surprise = ids => ({ parallel: ids.map(id => ({ emote: id, kind: '!', duration: 0.9, hold: 0.5, sfx: 'chime' })) });
const beat = name => ({ boulderBeat: name, action: game => game.castleBoulder.setBeat(name) });
const waitBeat = { action: game => game.castleBoulder.wait() };
const approachOffsets = [[-180, 14], [-280, -30], [-280, 38], [-100, -44], [-100, 52]];
const finalOffsets = [[0, 0], [-128, -58], [-58, -38], [-270, 6], [-206, 48], [-200, -58], [-90, 20], [-320, 58], [-350, -58]];
const pushOffsets = [[10, -8], [-40, -8], [-90, -8], [-180, -8], [-130, -8], [60, -8], [-236, -8], [-292, -8]];
export const BOULDER_FINAL_SPURT = J('거의다 온거같아 마지막 스퍼트다 밀어!!!!!');

export const castle_boulder_intro = Object.assign([
  { if: flags => !!flags.castle_boulder_done, goto: 'after' },
  close, { bgm: null, fadeOut: 0.5 }, { action: prepareCastleBoulder },
  { camera: 'player' }, { wait: 0.8 },
  { parallel: [
    at(A.bidet, 'bend', [-16, -64], { speed: 70 }),
    at(A.mario, 'bend', [48, -104], { speed: 70 }),
    ...PARTY.map((id, i) => at(id, 'bend', [0, i * 62 + 30], { speed: 76 })),
  ] },
  { parallel: [camera(380, 720),
    ...WALKERS.map((id, i) => at(id, 'bend', [[0, 36], [-70, 70], [60, 88], [-70, 0], [64, -38]][i], { speed: 70 }))] },
  ...face(WALKERS, 'right'), { wait: 0.5 },
  B('흠.. 영클형이 이쯤에서... 있었던거같은데'), K('음..'), V('2런 시발'), close,
  surprise(WALKERS), ...face(WALKERS, 'right'),
  beat('reveal'), { parallel: [camera(1670, 620, 2.3), { zoom: 1, duration: 1.3 }] },
  waitBeat, beat('focus'), { bgm: 'baron_intro', volume: 0.5, fadeIn: 1.2 }, { wait: 1.2 }, beat('holding'),
  { parallel: [camera(380, 720, 1.8), { zoom: 1, duration: 1 }] },
  surprise(WALKERS),
  { parallel: [camera(860, 650, 2), ...WALKERS.map((id, i) => at(id, 'approach', approachOffsets[i], { run: true }))] },
  { fade: 'out', duration: 0.6 },
  { action: game => {
    for (const [i, id] of WALKERS.entries()) {
      const actor = find(game, id), p = point(game, 'push', approachOffsets[i]);
      actor.x = p[0]; actor.y = p[1]; actor.moving = false; actor.facing = 'right';
    }
    game.player.trail = [];
  } }, camera(1430, 650, 0), { zoom: 0.78, duration: 0 }, { fade: 'in', duration: 0.7 }, { wait: 0.65 },
  { emote: A.youngcle, kind: '!', duration: 0.8, hold: 0.5, sfx: 'chime' },
  { face: A.youngcle, dir: 'left' }, beat('talk'),
  V('어 ㅎ2'), K('이게 무슨일이야?'), V('저 뒤에서 이 미친 돌을 밀고있음.'), beat('holding'),
  { async: [{ shake: 0.4, amp: 3 }] }, J('잔말말고 빨리 도와 씨발 !!!!'),
  beat('focus'), V('난 도움이 안될거같아서 일단 레이저쏘는중'), P('저 뒤에 누가있는거지?'),
  V('가재맨 모양의 누누와윌럼프가 있음'), close, beat('holding'),
  { parallel: [camera(2140, 600, 1.8), { zoom: 0.75, duration: 1.2 }] },
  { wait: 0.55 }, beat('roar'), waitBeat, beat('holding'), { wait: 0.5 },
  { parallel: [camera(1430, 650, 1.6), { zoom: 0.78, duration: 1 }] },
  P('와 타코 혼자서 이걸 막네'), T('형님들!'), close,
  surprise([...WALKERS, A.youngcle]), ...face([...WALKERS, A.youngcle], 'left'),
  { action: game => {
    for (const [id, by] of [[A.ttuulla, [-510, 74]], [A.park, [-580, -44]]]) {
      const actor = find(game, id), p = point(game, 'push', by);
      actor.x = p[0]; actor.y = p[1]; actor.visible = true; actor.solid = false; actor.facing = 'right';
    }
  } },
  { parallel: [camera(1360, 650, 1.3), { zoom: 0.78, duration: 1.1 }, at(A.ttuulla, 'push', [-380, 42], { run: true }),
    at(A.park, 'push', [-420, -38], { run: true })] }, { wait: 0.5 },
  G('안냐세여'), T('오우 지금 뭔상황이죠?'), V('ㅈ된상황'),
  B('어.. 일단 쥰희 도와야하지 않을까요'), V('그런듯'), K('일단 이걸 좀 밀어야될거같은데'),
  P('다들 붙으시죠'), close,
  { parallel: [camera(1560, 620, 1.6), { zoom: 0.65, duration: 1 },
    at(A.youngcle, 'push', [-40, -138], { speed: 70 }),
    ...PUSHERS.flatMap((id, i) => id === A.junhee ? [] : [at(id, 'push', pushOffsets[i], { run: true })])] },
  ...face(PUSHERS, 'right'), beat('push'), { wait: 0.6 }, { bgm: null, fadeOut: 0.6 },
  J('아.. 자 준비하고...'), J('타이밍에 맞춰서 c를 눌러, 합 맞춰서 미는거야!'), close,
  { bgm: 'castle_battle', volume: 0.5 },
  { action: game => {
    const scene = game.castleBoulder;
    scene.say({ ...J('밀어!!!!!!'), auto: 0.6, speed: 3 });
    game.shake = { time: 0.6, amp: 5 };
    return startCastleBoulderPush(game, { push: PUSHERS, tremble: A.junhee,
      barks: ['흐압!', '흐랴압!', '좀만 더 합을 맞춰서!!'], missBark: '다시, 합을 맞춰!',
      onStage: stage => scene.stage(stage),
      onTimingComplete: async () => {
        scene.setBeat('surge_pan'); await scene.panTo(2100, 600, 0.62);
        if (scene.disposed || game.castleBoulder !== scene) return;
        scene.setBeat('surge'); await scene.wait();
        if (scene.disposed || game.castleBoulder !== scene) return;
        scene.setBeat('surge_hold'); await scene.say(BOULDER_FINAL_SPURT);
        if (scene.disposed || game.castleBoulder !== scene) return;
        scene.setBeat('surge_return'); await scene.panTo(1560, 620, 0.65);
        if (!scene.disposed && game.castleBoulder === scene) scene.setBeat('mash');
      },
    });
  } },
  { ...J('히야아ㅏ아아아아아아ㅏㅏ아아아압!'), auto: 0.35, speed: 3 }, close,
  beat('launch'),
  { parallel: [{ zoom: 0.48, duration: 1.25 }, camera(2640, 620, 3.2)] },
  camera(3330, 620, 1.3), waitBeat, { wait: 0.8 }, { bgm: null, fadeOut: 0.6 },
  { parallel: [camera(2890, 700, 1.5), { zoom: 0.9, duration: 1.3 },
    ...ALL.map((id, i) => at(id, 'finish', finalOffsets[i], { dash: true }))] },
  ...face(ALL, 'right'), { wait: 0.65 },
  { motion: A.junhee, name: 'laugh', sfx: 'laugh_junhee' }, { wait: 0.5 },
  J('맛이 어떠냐 쓰레기년'), P('휴.. 다행이네요'),
  K('일단 위에 또 이상한 방이 있네\n* 요플래 갔다와.'), J('좀 쉬고있어야겠다.'), V('잘했음 ㅇㅇ'), close,
  { action: separateBoulderParty }, { leave: 'gyeongsub' }, { leave: 'ppaman' },
  { stage: 'castle_boulder_done' }, { action: restoreCastleBoulder },
  { action: game => finishCastleBoulder(game) },
  { zoom: 1, duration: 0.65 }, { camera: 'player' }, { end: true },
  { label: 'after' }, { action: restoreCastleBoulder }, { camera: 'player' }, { end: true },
], { silent: true });

export const castle_boulder_left_block = Object.assign([
  { if: flags => !flags.castle_boulder_done, goto: 'end' },
  { face: A.junhee, dir: 'toward:player' }, J('빨리 갔다와.'), close,
  at('player', 'guard_return', [0, 0], { run: true }), { face: 'player', dir: 'right' },
  { label: 'end' }, { end: true },
], { silent: true });

export const castle_boulder_waiting = [J('좀 쉬고있어야겠다.')];

export const castle_boulder_orb_enter = Object.assign([
  { if: flags => !flags.castle_boulder_done, goto: 'end' }, close,
  { sfx: 'locker' }, { fade: 'out', duration: 0.55 },
  { map: 'gajaeman_castle_left_orb', spawn: 'start' },
  { bgm: 'castle_orb', volume: 0.5, fadeIn: 0.7 },
  { fade: 'in', duration: 0.7 }, { label: 'end' }, { end: true },
], { silent: true });
