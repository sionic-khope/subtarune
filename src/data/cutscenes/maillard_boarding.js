const JUNHEE = 'boarding_junhee';
const YONGJUN = 'boarding_yongjun';

export const maillard_boarding_intro = Object.assign([
  { if: flags => flags.maillard_boarding_departed, goto: 'end' },
  { camera: [13, 14], duration: 0.35 },
  { parallel: [
    { move: 'player', rel: 'boarding_to_bridge', at: 'left', by: [-276, 8], run: true },
    { move: 'gyeongsub', rel: 'boarding_to_bridge', at: 'left', by: [-340, 8], run: true },
    { move: 'ppaman', rel: 'boarding_to_bridge', at: 'left', by: [-404, 8], run: true },
  ] },
  ...['player', 'gyeongsub', 'ppaman', JUNHEE, YONGJUN].map(id => ({ face: id, dir: 'right' })),
  { speaker: '박용준', portrait: 'yongjun', voice: 'yongjun', text: '* 철 철다리..?' },
  { speaker: '쥰희', portrait: 'junhee', voice: 'junhee', text: '* 이 이건 뭐지...? 저 개자식들 내가 가서 족치겠다!' },
  { wait: 0.3 },
  { move: JUNHEE, rel: 'boarding_to_bridge', at: 'left', by: [-4, 0], dash: true },
  { move: JUNHEE, px: [776, 424], dash: true },
  { remove: JUNHEE },
  { speaker: '박용준', portrait: 'yongjun', voice: 'yongjun', text: '* 혀 혀엉 같이가요!' },
  { wait: 0.35 },
  { hop: YONGJUN, height: 12, duration: 0.3, sfx: false },
  { move: YONGJUN, rel: 'boarding_to_bridge', at: 'left', by: [-4, 0], dash: true },
  { move: YONGJUN, px: [776, 424], dash: true },
  { remove: YONGJUN },
  { speaker: '경섭', portrait: 'gyeongsub', voice: 'gyeongsub', text: '* 빨리 쫒아가자 우리도!' },
  { set: { maillard_boarding_departed: true } },
  { camera: 'player' },
  { regroup: true },
  { label: 'end' },
  { end: true },
], { silent: true });

export const youngcle_entrance = [
  { voice: 'narrator', text: '* 철 전함의 입구다.' },
];
