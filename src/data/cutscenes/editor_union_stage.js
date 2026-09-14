import { FX } from '../fx.js';
import { beginEditorUnionStage, clearEditorUnionStage } from '../../scenes/editor-union-effects.js';
import { loopCharacterMotion } from '../../world/character-motion.js';

const PARK = 'park_guardian_costume', BIDET = 'warm_bidet', MOUSE = 'ttuulla', MARIO = 'mini_mario';
const PARTY = ['player', 'gyeongsub', 'ppaman'];
const EDITORS = [BIDET, MOUSE, MARIO, PARK];
const P = text => ({ speaker: '억빠맨', portrait: 'ppaman', voice: 'ppaman', text: '* ' + text });
const G = text => ({ speaker: '경섭', portrait: 'gyeongsub', voice: 'gyeongsub', text: '* ' + text });
const K = text => ({ speaker: '파크가디언', portrait: PARK, voice: PARK, text: '* ' + text });
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

export const editor_union_stage_wait = Object.assign([K(FINAL)], { silent: true });

export const editor_union_stage = Object.assign([
  { if: flags => flags.editor_union_stage_done, goto: 'finished' },
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
  K('저희 영클전함에는 여기로 빨려들어온 거의 모든 시청자들을 전부 모아놨습니다.'),
  G('오. 쥰희보다 먼저했구나'),
  K('그리고~ 저는 여기에 있는 여러분들의 불안감을 해소시켜주기위한'),
  K('제 이름은 바로 DJ ~'),
  P('인면견'),
  K('인 면 견 ~'),
  { bgmPause: 0.12 },
  K('... ... ... ?'),
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
  { label: 'finished' },
  { end: true },
], { silent: true });
