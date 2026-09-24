// BUILD327 사용자 브리핑(2026-09-24): 바람이 멎은 남색 오르막. 가재맨이 빠르게 위 방(마법의 샘)으로 날아가고,
// 쥰희·영클이 먼저 달려 쫓아가고, 주인공들이 뒤따라 들어온다. 대사는 브리핑에 없어서 넣지 않는다.
export const SPIRE = Object.freeze({
  stage: 'castle_spire_arrived', gajaeman: 'spire_gajaeman', junhee: 'spire_junhee', youngcle: 'spire_youngcle',
  // 카메라 타일 좌표(중심): 아래 입구 / 샘 방
  entryCam: [11.5, 55.75], roomCam: [11.5, 8],
  // 가재맨: 방 입구까지 1.5초, 잠깐 멈춤, 북쪽 통로로 0.6초 가속 이탈
  stopY: 300, exitY: -300, rush: 1.5, pause: 0.35, leave: 0.6,
});

const PARTY = ['player', 'gyeongsub', 'ppaman'];
const ease = k => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2);
const easeIn = k => k * k * k;

/** Flying tween for the floating boss (y only); the bob keeps him airborne like the cathedral halls. */
const fly = (toY, seconds, curve) => ({ action: game => {
  const e = game.entities.find(entity => entity.id === SPIRE.gajaeman);
  if (!e) return undefined;
  const from = e.y;
  let t = 0;
  return new Promise(resolve => game.background.push({ update: dt => {
    t += dt; const k = Math.min(1, t / seconds);
    e.y = from + (toY - from) * curve(k);
    e.flyY = -10 + Math.sin(t * 2.4) * 4;
    if (k < 1) return false;
    resolve(); return true;
  } }));
} });
const hover = { action: game => {
  const e = game.entities.find(entity => entity.id === SPIRE.gajaeman);
  if (e) e.flyY = -10;
} };
const place = id => ({ move: id, rel: `spire_in_${id}`, at: 'bottom', by: [0, 0], speed: 10000, facing: 'up' });
const walkIn = id => [
  { show: id },
  { move: id, rel: `spire_stand_${id}`, at: 'bottom', by: [0, 0], axis: 'y', run: true, facing: 'up' },
  { move: id, rel: `spire_stand_${id}`, at: 'bottom', by: [0, 0], axis: 'x', run: true, facing: 'up' },
];

export const castle_spire_intro = Object.assign([
  { if: flags => !!flags[SPIRE.stage], goto: 'end' },
  ...PARTY.map(id => ({ hide: id })),
  ...PARTY.map(place),
  { camera: SPIRE.entryCam, duration: 0.01 },
  { show: SPIRE.gajaeman }, hover,
  { wait: 0.8 },
  { parallel: [
    { sfx: 'wing', volume: 0.5 },
    fly(SPIRE.stopY, SPIRE.rush, ease),
    { camera: SPIRE.roomCam, duration: SPIRE.rush },
  ] },
  { wait: SPIRE.pause },
  { parallel: [{ sfx: 'wing', volume: 0.55 }, fly(SPIRE.exitY, SPIRE.leave, easeIn)] },
  { hide: SPIRE.gajaeman },
  { wait: 0.6 },
  { camera: SPIRE.entryCam, duration: 1.3 },
  { wait: 0.2 },
  { show: SPIRE.junhee }, { show: SPIRE.youngcle },
  { parallel: [
    { move: SPIRE.junhee, rel: 'spire_run_out', at: 'bottom', by: [64, 0], dash: true, facing: 'up' },
    [{ wait: 0.12 }, { move: SPIRE.youngcle, rel: 'spire_run_out', at: 'bottom', by: [-64, 0], dash: true, facing: 'up' }],
  ] },
  { remove: SPIRE.junhee }, { remove: SPIRE.youngcle },
  { wait: 0.35 },
  { parallel: [walkIn('player'), [{ wait: 0.25 }, ...walkIn('gyeongsub')], [{ wait: 0.45 }, ...walkIn('ppaman')]] },
  ...PARTY.map(id => ({ face: id, dir: 'up' })),
  { wait: 0.4 },
  { camera: 'player' },
  { stage: SPIRE.stage },
  { label: 'end' }, { end: true },
], { silent: true });

// 되돌아가기 차단은 나레이션(기존 문구) + 맵 끝 충돌
export const castle_spire_back = Object.assign([
  { voice: 'narrator', text: '* 앞이 먼저다.' },
], { silent: true });
