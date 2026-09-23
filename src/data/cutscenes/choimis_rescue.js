import { prepareChoimisRescue, startChoimisRescue, finishChoimisRescue } from '../../scenes/choimis-rescue.js';
import { SHIP_LOUNGE_BRIEFING_NODES } from './ship_lounge_briefing.js';

const P = text => ({ speaker: '억빠맨', portrait: 'ppaman', voice: 'ppaman', text: `* ${text}` });
const G = text => ({ speaker: '경섭', portrait: 'gyeongsub', voice: 'gyeongsub', text: `* ${text}` });
const Y = text => ({ speaker: '박용준', portrait: 'yongjun', voice: 'yongjun', text: `* ${text}` });
const close = { action: game => game.textbox.close() };
const beat = name => ({ rescueBeat: name, action: game => game.choimisRescue.setBeat(name) });

/** Continue the same script after victory; there is no field-control interval. */
export const CHOIMIS_RESCUE_NODES = [
  { action: startChoimisRescue },
  { bgm: null },
  P('휴 드디어 잡았네요'),
  G('ㅋㅋ 그니까 근데 여기 진짜 높다.'),
  P('잠깐 근데 이거 하늘을 날수있는 이유가..'),
  P('최미스 힘때문이라면 지금은...'),
  close,
  beat('petals_fade'), { wait: 2.4 },
  beat('dots_ppaman'), { wait: 1.25 },
  beat('dots_gyeongsub'), { wait: 1.25 },
  beat('dots_hyungsub'), { wait: 1.25 },
  P('으아아아아악!!'), close,
  beat('party_fall'), { wait: 1.7 },
  { fade: 'white', duration: 0.4 },
  beat('ocean_fall'), { fade: 'in', duration: 0.9 }, { wait: 2.1 },
  beat('catch'), { wait: 1.6 },
  { fade: 'out', duration: 0.65 },
  beat('jet_reveal'), { bgm: 'vs_lancer', volume: 0.5, fadeIn: 0.8 },
  { fade: 'in', duration: 1.2 }, { wait: 0.7 },
  Y('오 형들 하이요 ㅋㅋ'),
  P('머야 씨바'),
  Y('저희가 만든 무기에요 이름하여 냄트기'),
  P('...'),
  Y('저희 진짜 노력 많이했습니다.'),
  Y('가재맨이 불쌍해질정도로 강한 무기들이 많아요'),
  G('오 ㅋㅋ'),
  Y('일단 영클형이 형들 데려오라고 해서 엄청대박인배로 가시죠'),
  P('ㅋㅋㅋ'),
  beat('spot_choimis'),
  Y('어 근데 저기 핑크색 어떤새끼가 떨어지고있는데 어떡하죠'),
  P('버려 씨바'),
  G('빠맨아.'),
  P('...네'),
  Y('네 일단 쟤까지 챙겨갈게요'), close,
  beat('save_choimis'), { wait: 2.2 },
  beat('flyaway'), { wait: 2 },
  { fade: 'out', duration: 0.6 },
  { action: game => finishChoimisRescue(game) },
  { stage: 'choimis_rescued' },
  { map: 'ship_lounge', spawn: 'from_rescue', bgm: false },
  ...SHIP_LOUNGE_BRIEFING_NODES,
];

/** QA uses the same continuation, not a second copy of its dialogue or timing. */
export const choimis_rescue = Object.assign([
  { action: prepareChoimisRescue }, ...CHOIMIS_RESCUE_NODES, { end: true },
], { silent: true });
