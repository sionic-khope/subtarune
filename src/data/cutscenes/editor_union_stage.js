import { FX } from '../fx.js';
import { beginEditorUnionStage, clearEditorUnionStage } from '../../scenes/editor-union-effects.js';
import { loopCharacterMotion } from '../../world/character-motion.js';
import { battleEntry } from './helpers.js';

const PARK = 'park_guardian_costume', BIDET = 'warm_bidet', MOUSE = 'ttuulla', MARIO = 'mini_mario';
const PARTY = ['player', 'gyeongsub', 'ppaman'];
const EDITORS = [BIDET, MOUSE, MARIO, PARK];
const P = text => ({ speaker: '억빠맨', portrait: 'ppaman', voice: 'ppaman', text: '* ' + text });
const G = text => ({ speaker: '경섭', portrait: 'gyeongsub', voice: 'gyeongsub', text: '* ' + text });
const K = text => ({ speaker: '파크가디언', portrait: PARK, voice: PARK, text: '* ' + text });
// 탈을 벗은 본체(인면견) 대사 — 본체 시트/음색
const D = text => ({ speaker: '파크가디언', portrait: 'park_guardian', voice: 'park_guardian', text: '* ' + text });
const B = text => ({ speaker: '따듯한비데', portrait: BIDET, voice: BIDET, text: '* ' + text });
const T = text => ({ speaker: '뚜울라알라', portrait: MOUSE, voice: MOUSE, text: '* ' + text });
const close = { action: game => game.textbox.close() };
const cheer = { action: game => { game.editorUnionStage.cheerUntil = game.time + 2.8; } };
const at = (id, x, y, run = true) => ({ move: id, rel: 'stage_center', at: 'bottom', by: [x, PARTY.includes(id) ? y - 40 : y], run });
const sceneCamera = { parallel: [{ camera: [19, 13.5], duration: 0.65 }, { zoom: 0.72, duration: 0.65 }] };
const surprise = { parallel: PARTY.flatMap((id, i) => [
  { emote: id, kind: '!', duration: 1, hold: 0.42, ...(i === 0 ? { sfx: 'chime' } : {}) },
  { hop: id, height: 12, duration: 0.32, sfx: false },
]) };
const FINAL = '첫번째 시련!! 파크가디언을 이겨라!!! 들어와 ㅅㅂ새끼들아.';

/** 승리 후 연출(2026-09-15 사용자 원문): 본체 항복 → 억빠맨 박치기로 날아감 → 위 통로 철창 → 오른쪽으로. 전투 직후와 승리 저장 뒤 본체 C 둘 다 같은 노드 */
const parkAftermath = () => [
  { if: flags => flags.park_guardian_aftermath_done, goto: 'aftermath_end' },
  ...PARTY.map(id => ({ face: id, dir: 'toward:park_guardian_defeated' })),
  D('헉.. 헉.. 이.. 이럴수가 말.. 말도안돼...'),
  P('넌 니애미 따라가라'),
  close,
  { move: 'ppaman', rel: 'park_guardian_defeated', at: 'left', by: [-6, 0], dash: true },
  { sfx: 'thud' },
  { shake: 0.3, amp: 5 },
  { fling: 'park_guardian_defeated', vx: 780, vup: 900, spin: 15, duration: 1.5, sfx: 'whoosh' },
  { wait: 0.4 },
  // 박치기한 억빠맨은 일행 옆으로 돌아온다
  { move: 'ppaman', rel: 'player', at: 'left', by: [-40, 0], run: true },
  // 위 통로(x928~1056)에 철창이 천천히 내려와 쾅. 카메라는 통로와 일행이 같이 보이게 줌아웃
  { parallel: [{ camera: [23, 10.5], duration: 0.8 }, { zoom: 0.66, duration: 0.8 }] },
  { spawn: { type: 'prop', id: 'youngcle7_grate', image: 'assets/props/youngcle_grate.png', x: 928, y: -64, w: 128, h: 96, solid: true } },
  { async: [{ sfx: 'rumble', volume: 0.7 }, { wait: 1.0 }, { sfx: 'rumble', volume: 0.7 }] },
  { slide: 'youngcle7_grate', by: [0, 256], duration: 2.4 },
  { sfx: 'baron_slam' },
  { shake: 0.45, amp: 6 },
  ...PARTY.map(id => ({ face: id, dir: 'up' })),
  { parallel: PARTY.map(id => ({ emote: id, kind: '!', duration: 1.0, hold: 0.6 })) },
  P('오 이런,, 위쪽길이 막혔네요 아마 저기 뚜울라 있을텐데'),
  G('오른쪽에 비데부터 보고오란 소리겠지'),
  P('뭐가 꿍꿍이가 있는것같지만 일단 가보시죠'),
  close,
  { parallel: [{ camera: 'player', duration: 0.55 }, { zoom: 1, duration: 0.55 }] },
  { regroup: true },
  { set: { park_guardian_aftermath_done: true } },
  { label: 'aftermath_end' },
];

export const park_guardian_aftermath = Object.assign([...parkAftermath(), { end: true }], { silent: true });

const parkBattle = () => [
  close,
  ...battleEntry(['park_guardian'], 'park_guardian'),
  { battle: { enemies: ['park_guardian'], bgm: 'park_guardian', bg: 'editor_union_stage', flag: 'park_guardian_won' } },
  { if: flags => !flags.park_guardian_won, goto: 'finished' },
  { bgm: null },
  { action: game => {
    for (const actor of game.entities) {
      if (actor.id === PARK || actor.id === 'park_guardian_ready') actor.dead = true;
    }
  } },
  { spawn: { type: 'npc', id: 'park_guardian_defeated', sprite: 'park_guardian',
    x: 760, y: 416, facing: 'left', wander: 0, solid: false } },
  { zoom: 1, duration: 0 },
  { camera: 'player' },
  { fade: 'in', duration: 0.35 },
  ...parkAftermath(),
];

export const editor_union_stage_wait = Object.assign([
  { if: flags => flags.park_guardian_won, goto: 'finished' },
  K(FINAL),
  ...parkBattle(),
  { label: 'finished' },
  { end: true },
], { silent: true });

export const editor_union_stage = Object.assign([
  { if: flags => flags.park_guardian_won, goto: 'finished' },
  { if: flags => flags.editor_union_stage_done, goto: 'battle' },
  { action: game => {
    beginEditorUnionStage(game);
    game.sound.stopBgm(0);
    game.sound.preloadBgm('editor_union_stage');
    game.player.solid = false;
  } },
  close,
  { parallel: [at('gyeongsub', -172, 104), at('player', -104, 104), at('ppaman', -36, 104)] },
  ...PARTY.map(id => ({ face: id, dir: 'up' })),
  sceneCamera,
  { wait: 0.6 },
  { sfx: 'plug' },
  { editorUnion: { kind: 'light', spotlight: 1, dim: 0.68, duration: 0.85 } },
  surprise,
  P('ㅁ..뭐지 여긴?'),
  { bgm: 'editor_union_stage', fadeIn: 0.3 },
  { speaker: '???', voice: PARK, text: '* 반갑습니다 형님들~~~~~~~~' },
  P('???'),
  close,
  { camera: [21, 13.5], duration: 0.65 },
  { face: PARK, dir: 'down' },
  { editorUnion: { kind: 'drop', actor: PARK, height: 420, duration: 1.1 } },
  { parallel: [{ boom: { ...FX.explosion, at: PARK, scale: 0.9 } }, { shake: 0.5, amp: 6 }] },
  ...PARTY.map(id => ({ face: id, dir: 'right' })),
  { action: game => {
    const actor = game.entities.find(entity => entity.id === PARK);
    loopCharacterMotion(actor, game.characterMotions?.[PARK]?.bow);
  } },
  K('안냐세여 형ㅎㅎ'),
  { action: game => { game.entities.find(entity => entity.id === PARK).motion = null; } },
  P('아씨발인면견 말투 찢어죽여버릴까'),
  K('...'),
  P('그래서 여긴 어디야?'),
  K('훗훗 여기로 말씀드릴거같으면'),
  close,
  { parallel: [{ camera: [18, 13], duration: 1.2 }, { zoom: 0.48, duration: 1.2 },
    { editorUnion: { kind: 'light', dim: 0.68, reveal: 1, spotlight: 1, duration: 1.2 } }] },
  { wait: 0.18 },
  cheer,
  { sfx: 'maillard_applause', volume: 0.7 },
  K('저희들의 스테이지~ 입니다.'),
  P('???'),
  sceneCamera,
  K('저희 엄청 대박인 배에는 여기로 빨려들어온 거의 모든 시청자들을 전부 모아놨습니다.'),
  G('오. 쥰희보다 먼저했구나'),
  K('그리고~ 저는 여기에 있는 여러분들의 불안감을 해소시켜주기위한'),
  K('제 이름은 바로 DJ ~'),
  P('인면견'),
  { bgmPause: 0.12 },
  // 2026-09-15 사용자: '인 면 견 ~' 뒤 같은 대화창 안에 ... ... ... 이 하나씩 뜨고, 그 상자를 통째로 날린다
  K('인 면 견 ~{w=0.7}{n}...{w=0.55} ...{w=0.55} ...'),
  { parallel: [{ hop: PARK, height: 36, duration: 0.5, sfx: false },
    { editorUnion: { kind: 'box', duration: 0.78 } }, { sfx: 'explosion', volume: 0.65 }, { shake: 0.32, amp: 5 }] },
  K('아니아니 뭔 개소리임 저는 파크가디언입니다.'),
  { bgmResume: 0.4 },
  P('ㅋㅋ'),
  K('그리고 여기 스테이지에 모신 분들은 저만이 아닙니다.'),
  K('바로 여기 저희의 적 악덕 사장님들까지!!'),
  close,
  ...PARTY.map(id => ({ face: id, dir: 'down' })),
  { parallel: [{ camera: [15.5, 15], duration: 0.55 }, { zoom: 1.05, at: 'player', offset: [0, -28], duration: 0.55 }] },
  cheer,
  { sfx: 'maillard_applause', volume: 0.7 },
  P('?'),
  G('?'),
  { bgm: null, fadeOut: 0.15 },
  close,
  sceneCamera,
  ...PARTY.map(id => ({ face: id, dir: 'right' })),
  K('애들아 나와라.'),
  close,
  { parallel: [{ editorUnion: { kind: 'drop', actor: BIDET, height: 420, duration: 1.1 } },
    { async: [{ wait: 0.7 }, { motion: BIDET, name: 'axe_strike' }] }] },
  { parallel: [{ shake: 0.6, amp: 8 }, { boom: { ...FX.explosion, at: BIDET, scale: 1.1 } }] },
  B('허이얍'),
  close,
  { show: MOUSE },
  { parallel: [{ emerge: MOUSE, depth: 88, duration: 0.95, ease: 'out' },
    { motion: MOUSE, name: 'burrow' }, { editorUnion: { kind: 'dirt', actor: MOUSE, duration: 1.15 } },
    { sfx: 'rumble', volume: 0.6 }] },
  T('하얍'),
  close,
  { action: game => {
    const mario = game.entities.find(actor => actor.id === MARIO);
    mario.x = game.camera.x + 760;
    mario.visible = true;
  } },
  at(MARIO, 244, 64, false),
  { hop: MARIO, height: 14, duration: 0.35, sfx: 'mario_jump' },
  P('...'),
  K('아직도 상황파악을 못한것같은데.'),
  K('우리로 소개할거같으면'),
  close,
  { parallel: [...EDITORS.map((id, index) => at(id, 8 + index * 96, 32)),
    at('gyeongsub', -240, 96), at('player', -180, 104), at('ppaman', -120, 112)] },
  ...EDITORS.map(id => ({ face: id, dir: 'down' })),
  ...PARTY.map(id => ({ face: id, dir: 'right' })),
  K('우리는!'),
  close,
  ...EDITORS.map((actor, index) => ({ editorUnion: { kind: 'glyph', actor, index, duration: 0.7 } })),
  sceneCamera,
  cheer,
  { sfx: 'maillard_applause', volume: 0.75 },
  K('편집노조다!'),
  { action: game => {
    const actor = game.entities.find(entity => entity.id === PARK);
    loopCharacterMotion(actor, game.characterMotions?.[PARK]?.bow);
  } },
  { bgm: 'editor_union_stage', fadeIn: 0.3 },
  K('감사합니다 감사합니다 감사합니다.'),
  { wait: 1.5 },
  { action: game => { game.entities.find(entity => entity.id === PARK).motion = null; } },
  close,
  { action: game => { game.editorUnionStage.glyphs = []; } },
  { bubble: PARTY, gap: 0.24, hold: 0.65 },
  P('편집노조라니'),
  K('자 이제 긴말은 됐고, 편집자들 각자 위치로!'),
  B('ㅋㅋ뒤졌다'),
  close,
  { camera: [24, 13.5], duration: 0.55 },
  at(BIDET, 567, 63),
  { hide: BIDET },
  T('이따봐요 악덕사장'),
  close,
  at(MOUSE, 376, -65),
  at(MOUSE, 376, -353),
  { hide: MOUSE },
  sceneCamera,
  at(MARIO, -80, 70, false),
  { face: MARIO, dir: 'left' },
  { hop: MARIO, height: 16, duration: 0.38, sfx: 'mario_jump' },
  { editorUnion: { kind: 'mushroom', actor: MARIO, to: 'player', duration: 0.8 } },
  { action: game => { for (const id of ['hyungsub', ...game.party]) game.partyHp[id] = game.maxHpOf(id); } },
  { sfx: 'heal' },
  { parallel: PARTY.map(id => ({ emote: id, kind: 'stamp', labelText: 'HP MAX', size: 12, offsetY: -24, color: '#ffe066', duration: 1.4, hold: 0.8 })) },
  { camera: [24, 13.5], duration: 0.55 },
  at(MARIO, 567, 71, false),
  { hide: MARIO },
  { wait: 3 },
  { parallel: [at(PARK, 120, 0), at('gyeongsub', -172, 96), at('player', -104, 104), at('ppaman', -36, 112)] },
  { face: PARK, dir: 'left' },
  ...PARTY.map(id => ({ face: id, dir: `toward:${PARK}` })),
  sceneCamera,
  P('그래서 뭐 어쩔샘이야'),
  K('모두가 합공할 생각입니다. 어차피 영클형 보러가실거죠?'),
  P('ㅇㅇ'),
  K('그럼 저희의 시험을 통과하셔야합니다'),
  K('그전에 죽겠지만요 ㅋㅋㅋㅋㅋㅋㅋ'),
  P('너 뒤진다 진짜'),
  K('너디진따진짜ㅋㅋ{n}형섭아나도사랑해줘짜ㅋㅋ{n}형섭아나도사랑해줘짜ㅋㅋ{n}형섭아나도사랑해줘짜ㅋㅋ{n}형섭아나도사랑해줘'),
  P('형들 안되겠어요 이 인면견 애미창년새끼 가죽까지 벗겨서 찢어죽여버릴게요'),
  G('워워 빠맨아'),
  K(FINAL),
  close,
  { parallel: [{ camera: 'player' }, { zoom: 1, duration: 0.55 }] },
  { regroup: true },
  { action: game => {
    game.player.solid = true;
    const park = game.entities.find(actor => actor.id === PARK);
    park.def.script = 'editor_union_stage_wait';
    park.script = 'editor_union_stage_wait';
    const trigger = game.entities.find(actor => actor.id === 'editor_union_stage_trigger');
    if (trigger) trigger.dead = true;
    clearEditorUnionStage(game);
  } },
  { set: { editor_union_stage_done: true } },
  { label: 'battle' },
  ...parkBattle(),
  { label: 'finished' },
  { end: true },
], { silent: true });
