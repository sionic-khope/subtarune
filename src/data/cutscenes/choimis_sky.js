import {
  ascendChoimisSky,
  clearChoimisSky,
  gatherChoimisSkyPollen,
  playChoimisSkyCue,
  prepareChoimisSky,
  riseChoimisFromBelow,
} from '../../scenes/choimis-sky-intro.js';

export const CHOIMIS_SKY = Object.freeze({
  boss: 'choimis_sky_boss',
  winFlag: 'choimis_flower_won',
  enemy: 'choimis_flower',
  background: 'choimis_sky',
  bgm: 'choimis_battle',
});

const C = text => ({ speaker: '최미스', portrait: 'choimis_flower', voice: 'choimis_flower', text: `* ${text}` });
const P = text => ({ speaker: '억빠맨', portrait: 'ppaman', voice: 'ppaman', text: `* ${text}` });
const close = { action: game => game.textbox.close() };

export const choimis_sky = Object.assign([
  { if: flags => !!flags[CHOIMIS_SKY.winFlag], goto: 'end' },
  { action: prepareChoimisSky },
  { face: 'player', dir: `toward:${CHOIMIS_SKY.boss}` },
  { face: 'gyeongsub', dir: `toward:${CHOIMIS_SKY.boss}` },
  { face: 'ppaman', dir: `toward:${CHOIMIS_SKY.boss}` },
  { action: riseChoimisFromBelow },
  { wait: 0.5 },
  C('하이'),
  P('빨리 내려와라 씨발색끼'),
  C('어휴 하여간 다들 날 싫어하는이유가뭐야?'),
  C('어쨋든 곧 나는 점례에게 돌아갈거야'),
  C('너희들의 동기가 어떻게 됐든 난 상관없어'),
  C('나를 막을 순 없을것이다.'),
  C('순수한 나의 사랑을'),
  C('그리고. 이젠 달라진 나의 모습을.'),
  close,
  { action: playChoimisSkyCue },
  { action: gatherChoimisSkyPollen },
  { action: ascendChoimisSky },
  { battle: {
    enemies: [CHOIMIS_SKY.enemy], bgm: CHOIMIS_SKY.bgm, bg: CHOIMIS_SKY.background,
    flag: CHOIMIS_SKY.winFlag, seamlessIntro: CHOIMIS_SKY.background,
  } },
  { fade: 'out', duration: 0.01 },
  { action: clearChoimisSky },
  { map: 'jjajang_night_cliff', spawn: 'from_west', bgm: false },
  { camera: 'player' },
  { regroup: true },
  { fade: 'in', duration: 0.45 },
  { label: 'end' },
  { end: true },
], { silent: true });
