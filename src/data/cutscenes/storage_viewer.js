import { battleEntry } from './helpers.js';
import { loopCharacterMotion } from '../../world/character-motion.js';
import { STORAGE_DANCE } from '../storage-dance.js';

const V = (text, extra = {}) => ({ speaker: '???', voice: 'expelled_viewer', text, ...extra });
const P = text => ({ speaker: '억빠맨', portrait: 'ppaman', voice: 'ppaman', text });
const G = text => ({ speaker: '경섭', portrait: 'gyeongsub', voice: 'gyeongsub', text });
const dance = (name, options = {}) => ({ action: g => {
  const actor = g.entities.find(e => e.id === 'expelled_viewer');
  const definition = g.characterMotions.expelled_viewer[name];
  if (!definition) return;
  loopCharacterMotion(actor, name === 'reveal' ? { ...definition, frames: [definition.frames.at(-1)] } : definition, options);
} });

const STAGE = [
  { camera: [7, 8], duration: 0.3 },
  { parallel: [
    { move: 'player', rel: 'expelled_viewer', at: 'bottom', by: [0, 80], run: true },
    { move: 'gyeongsub', rel: 'expelled_viewer', at: 'bottom', by: [-64, 80], run: true },
    { move: 'ppaman', rel: 'expelled_viewer', at: 'bottom', by: [64, 80], run: true },
  ] },
  { face: 'player', dir: 'up' }, { face: 'gyeongsub', dir: 'up' }, { face: 'ppaman', dir: 'up' },
];

export const storage_viewer = Object.assign([
  { if: f => f.storage_viewer_defeated, goto: 'end' },
  { if: f => f.storage_viewer_intro_seen, goto: 'battle' },
  { bgm: null },
  { action: g => g.sound.preloadBgm('storage_show') },
  { action: g => { void g.sound.loadCue(STORAGE_DANCE.src).catch(error => console.warn('[storage-dance] preload failed', error)); } },
  ...STAGE,
  V('* ... ... ... 으... 으...'),
  P('* ??? 뭐 뭐지 저기 괜찮으세요?'),
  { face: 'expelled_viewer', dir: 'down' },
  dance('reveal'),
  { sfx: 'maillard_applause' },
  { bgm: 'storage_show' },
  V('* 흔.. 흔들으라노 !!!!!!!!!!!!!'),
  P('* ?? 머야 씨바'),
  V('* 예. 그렇게 됐습니다. 너무 현명한 우리 슨상님들 저랑 한번 한판 해보시겠사옵니까?', { cut: 1.45 }),
  P('* 아니 야 이거 방송에서 못써'),
  dance('dance', { flipEvery: 0.34, pop: 7 }),
  V('* 샬케고역금통어디감? onep어딨어요?'),
  P('* ... 아니'),
  G('* 허허 강퇴당한 친군가보네'),
  dance('legraise'),
  V('* 이게 무슨 자세로 보이시나요? 헤헤 레그레이즈입니다'),
  V('* 뮤직 큐 해도될까요? 여긴 유미시티'),
  { musicCamera: { ...STORAGE_DANCE, at: 'expelled_viewer' } },
  P('* 야야야 아잠깐만 야 야'),
  dance('dance', { flipEvery: 0.22, pop: 13 }),
  V('* ㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋ페이커페이커페이커페이커페이커페이커페이커페이커페이커페이커페이커페이커페이커페이커', { speed: 3, mosaic: { text: '페이커', block: 2, detail: 0.45 } }),
  P('* 아니 씨발새끼 족쳐'),
  { set: { storage_viewer_intro_seen: true } },
  { label: 'battle' },
  ...battleEntry(['expelled_viewer'], 'storage_battle'),
  { battle: { enemies: ['expelled_viewer'], bgm: 'storage_battle', flag: 'storage_viewer_defeated' } },
  { bgm: 'wind' },
  { zoom: 1, duration: 0 },
  ...STAGE,
  { fade: 'in', duration: 0.25 },
  dance('reveal'),
  { ...V('* ... 아 안돼'), speaker: '악질맨' },
  P('* 넌니애미따라가라'),
  { parallel: [
    { motion: 'expelled_viewer', name: 'knockdown' },
    { emote: 'expelled_viewer', kind: 'stamp', labelText: '강퇴!', color: '#ff2929', size: 36, anchor: 'feet', offsetY: -48, duration: 1.2, hold: 1.2, sfx: 'plug' },
    { shake: 0.25, amp: 4 },
  ] },
  { action: g => {
    const actor = g.entities.find(e => e.id === 'expelled_viewer');
    actor.setSprite('expelled_viewer_down');
    actor.def.script = 'storage_viewer_defeated';
    actor.def.persistentEmote = { kind: 'stamp', text: '강퇴!', color: '#ff2929', size: 36, anchor: 'feet', offsetY: -48 };
  } },
  { regroup: true },
  { camera: 'player' },
  { label: 'end' },
  { end: true },
], { silent: true });

export const storage_viewer_defeated = Object.assign([
  { voice: 'narrator', text: '* 강퇴당했다' },
], { silent: true });
