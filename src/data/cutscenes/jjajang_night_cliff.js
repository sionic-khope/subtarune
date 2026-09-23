import { choimis_runaway } from './choimis_runaway.js';
import { choimis_rescue } from './choimis_rescue.js';

export const NIGHT_CLIFF = {
  map: 'jjajang_night_cliff',
  doneFlag: 'night_cliff_scene_done',
  bgm: 'ship_sinking',
  approachSpeed: 60,
  approachCamera: [20, 6.375],
  vistaCamera: [24.5, 6.375],
  vistaDuration: 2.2,
  jump: { by: [100, 270], height: 128, duration: 1.05 },
};

const K = text => ({ speaker: '경섭', portrait: 'gyeongsub', voice: 'gyeongsub', text: `* ${text}` });
const C = text => ({ speaker: '최미스', portrait: 'choimis', voice: 'choimis', text: `* ${text}` });
const close = { action: game => game.textbox.close() };

/** A remote view, not a protagonist swap: inventory, HP and party remain untouched. */
export const jjajang_night_cliff_scene = Object.assign([
  { if: flags => flags.choimis_flower_won && !flags.choimis_rescued, goto: 'rescue' },
  { if: flags => !!flags[NIGHT_CLIFF.doneFlag] || flags.night_cliff_scene_started, goto: 'end' },
  { set: { night_cliff_scene_started: true } },
  { hide: 'player' },
  { bgm: null, fadeOut: 0.3 },
  { action: game => { game.sound.preloadBgm(NIGHT_CLIFF.bgm); } },
  { camera: 'gyeongsub' },
  { action: game => game.camera.snap() },
  { face: 'gyeongsub', dir: 'right' },
  { face: 'choimis', dir: 'right' },
  { fade: 'in', duration: 0.9 },
  { move: 'gyeongsub', rel: 'night_approach', at: 'bottom', exact: true, speed: NIGHT_CLIFF.approachSpeed },
  { camera: NIGHT_CLIFF.approachCamera, duration: 1.4 },
  { wait: 0.5 },
  K('..'),
  K('어 미스야'),
  { face: 'choimis', dir: 'left' },
  C('어 형. 안녕하세요'),
  { ...K('... 그 내 ㄷ..'), auto: 0.1, cut: 0.8 },
  { face: 'choimis', dir: 'right' },
  { bgm: NIGHT_CLIFF.bgm, volume: 0.5, fadeIn: 1.2 },
  { async: [{ camera: NIGHT_CLIFF.vistaCamera, duration: NIGHT_CLIFF.vistaDuration }] },
  C('형 저는 왜 항상 이런식일까요'),
  { action: game => new Promise(resolve => {
    const x = NIGHT_CLIFF.vistaCamera[0] * 32 - 224;
    const y = NIGHT_CLIFF.vistaCamera[1] * 32 - 164;
    game.background.push({ update: () => {
      const ready = Math.abs(game.camera.x - x) < 0.01 && Math.abs(game.camera.y - y) < 0.01;
      if (ready) resolve();
      return ready;
    } });
  }) },
  K('그게 무슨말이야'),
  { ...C('저는요 그냥 순수하게 보지를 보고싶었을뿐이에요'), mosaic: { text: '보지', block: 2 } },
  C('옷도 여러벌 사봤고요, 완장도 달아봤고, 디스코드도 돌았고, 카트라이더 소개팅도 다녀봤어요'),
  C('근데 결국.. 항상 이런식으로 끝이나더라구요'),
  K('그게 미스야'),
  C('그냥 힘듭니다 이제'),
  C('저는 어떻게 해야하는걸까요'),
  K('미스야'),
  C('....'),
  K('그건 모르겠고 1500만원은 언제 갚을거니..?'),
  C('...'),
  K('...'),
  close,
  { wait: 0.45 },
  { hop: 'choimis', ...NIGHT_CLIFF.jump, keep: true },
  { remove: 'choimis' },
  { wait: 0.5 },
  K('아 씨발년 이럴줄알았어'),
  close,
  { wait: 0.6 },
  ...choimis_runaway,
  { label: 'end' },
  { end: true },
  { label: 'rescue' },
  ...choimis_rescue,
], { silent: true });
