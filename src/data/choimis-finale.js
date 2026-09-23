const line = text => ({ speaker: '최미스', portrait: 'choimis_flower', voice: 'choimis_flower', text: `* ${text}` });

/** BUILD300: dialogue order and cinematic timing after Choimis's lethal-hit gate. */
export const CHOIMIS_FINALE = Object.freeze({
  palette: Object.freeze({
    flowerCenter: '#ffeebc', flowerPetal: '#ff8fc7', flowerHighlight: '#ffd9ed',
    heart: '#ff5ca8', chargeGlow: '#ff98d1', chargeStreak: '#ff9ccd',
    beamOuter: '#ff67bd', beamInner: '#ffc9ed', energyWhite: '#fff', impactPetal: '#ff7fc7',
  }),
  intro: [...['큭.. 형들 대단하시네요', '여기까지 온건 칭찬해드리겠습니다.', '그렇지만, 전 포기할 수 없어요.', '마지막 그녀를 위한 이 힘을 바칠거에요!!'].map(line),
    { ...line('마지막 모두의 힘을 합쳐.'), voice: 'none' }],
  announcement: [line('마지막 피날래 GAP 모드!!!')],
  defeated: ['아..', '난... 이렇게....', '점례...야....'].map(line),
  box: { x: 8, y: 8, w: 464, h: 304 },
  seconds: { raise: 1.45, gather: 3, 'transform-white': 0.85, reveal: 1.1, bursts: 1.8, autocharge: 4, shot: 0.42, impact: 0.8, 'beam-fade': 1.4, flash: 0.75, smoke: 2.2, revert: 0.7, fall: 1.5 },
  whiteRise: 0.4,
  raiseFrames: [0.3, 0.65, 1],
  flowerCount: 190,
  gather: { palm: [47, 14], body: [69, 80], radius: 68 },
  chargeAudio: { startVolume: 0.18, endVolume: 0.6 },
  impact: { flashSeconds: 0.075, timeScale: 0.18, hitstop: 0.09, recoil: 14, pierceSeconds: 0.22, beamEndX: 600, smokeReveal: 0.65 },
  finisher: { x: 360, y: 175, soulX: 64, soulY: 210, fallDistance: 370 },
});
