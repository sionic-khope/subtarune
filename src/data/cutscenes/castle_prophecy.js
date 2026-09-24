// BUILD328 사용자 원문(2026-09-25): 예언의 회랑 끝, 남색 유광 대문 앞 대화. 대사·표기 그대로.
const P = text => ({ speaker: '억빠맨', portrait: 'ppaman', voice: 'ppaman', text: `* ${text}` });
const K = text => ({ speaker: '경섭', portrait: 'gyeongsub', voice: 'gyeongsub', text: `* ${text}` });
const N = text => ({ voice: 'narrator', text: `* ${text}` });
const close = { action: game => game.textbox.close() };
const PARTY = ['player', 'gyeongsub', 'ppaman'];
const stand = id => [
  { move: id, rel: `prophecy_stand_${id}`, at: 'bottom', by: [0, 0], axis: 'y' },
  { move: id, rel: `prophecy_stand_${id}`, at: 'bottom', by: [0, 0], axis: 'x' },
];
const faceAll = dir => PARTY.map(id => ({ face: id, dir }));

export const PROPHECY_DOOR = Object.freeze({ flag: 'castle_prophecy_door_done', camera: [146.375, 5.75] });

export const castle_prophecy_door = Object.assign([
  { if: flags => !!flags[PROPHECY_DOOR.flag], goto: 'end' },
  close,
  { parallel: [stand('player'), [{ wait: 0.2 }, ...stand('gyeongsub')], [{ wait: 0.35 }, ...stand('ppaman')]] },
  ...faceAll('up'),
  { camera: PROPHECY_DOOR.camera, duration: 1.4 }, { wait: 0.6 },
  P('...'),
  { face: 'ppaman', dir: 'left' },
  P('요플래형, 경섭이형'),
  { face: 'player', dir: 'right' }, { face: 'gyeongsub', dir: 'right' },
  K('응 빠맨아'),
  P('저는 그리고 저희는, 형들과 함께라서 기뻐요'),
  K('...'),
  P('우리는 꼭 형섭이형을 구해 돌아갈거에요 그렇죠?'),
  K('응 당연하지.'),
  close, ...faceAll('up'), { wait: 0.4 },
  K('구하자 형섭이'),
  K('구하자. 세상을.'),
  close, { wait: 0.6 },
  N('...'),
  N('지금까지 길고길었던 모험의 끝이 보이는 듯 하다.'),
  N('결전의 시간이다.'),
  close,
  { set: { [PROPHECY_DOOR.flag]: true } },
  { camera: 'player' },
  { label: 'end' }, { end: true },
], { silent: true });
