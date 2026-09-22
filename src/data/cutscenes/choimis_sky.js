import {
  ascendChoimisSky,
  clearChoimisSky,
  panChoimisSkyReveal,
  playChoimisSkyCue,
  prepareChoimisSky,
  readyChoimisSkyBattle,
  revealChoimisCape,
  riseChoimisFromBelow,
  startChoimisSkyGather,
  waitForChoimisSkyGather,
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
  { bgm: 'wind', volume: 0.45 },
  { action: prepareChoimisSky },
  { parallel: [
    { move: 'player', rel: 'night_edge', at: 'left', by: [-20, 0], speed: 70 },
    { move: 'gyeongsub', rel: 'night_edge', at: 'left', by: [-84, 0], speed: 70 },
    { move: 'ppaman', rel: 'night_edge', at: 'left', by: [-148, 0], speed: 70 },
  ] },
  { face: 'player', dir: `toward:${CHOIMIS_SKY.boss}` },
  { face: 'gyeongsub', dir: `toward:${CHOIMIS_SKY.boss}` },
  { face: 'ppaman', dir: `toward:${CHOIMIS_SKY.boss}` },
  { action: panChoimisSkyReveal },
  { action: riseChoimisFromBelow },
  { wait: 0.5 },
  C('하이'),
  P('빨리 내려와라 씨발색끼'),
  C('어휴 하여간 다들 날 싫어하는이유가뭐야?'),
  C('어쨋든 곧 나는 점례에게 돌아갈거야'),
  C('너희들의 동기가 어떻게 됐든 난 상관없어'),
  C('나를 막을 순 없을것이다.'),
  C("형들이 무슨 대의를 위해 날 막는건진 모르겠지만. 난 '순애'다."),
  C('순수한 나의 사랑을'),
  C('그리고. 이젠 달라진 나의 모습을.'),
  C('점례야.. 곧 해치우고 너에게 갈게'),
  close,
  { action: playChoimisSkyCue },
  { action: startChoimisSkyGather },
  { ...C('내 힘을 받아라'), voice: 'none' },
  { action: waitForChoimisSkyGather },
  { action: ascendChoimisSky },
  { action: revealChoimisCape },
  { action: readyChoimisSkyBattle },
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
