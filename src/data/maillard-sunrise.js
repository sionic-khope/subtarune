export const MAILLARD_SUNRISE = Object.freeze({
  bgm: 'maillard_sunrise',
  completionFlag: 'maillard_sunrise_seen',
  lightStartSeconds: 0,
  lightDurationSeconds: 18,
  sunStartSeconds: 2,
  sunDurationSeconds: 18,
  horizonY: 141,
  sky: 'assets/backdrops/maillard_sunset.png',
  sun: 'assets/props/maillard_sun.png',
  sunCrop: Object.freeze([53, 53, 151, 150]),
  sunCenter: Object.freeze([122, 150]),
  sunDiameter: 132,
  worldDimAlpha: 0.26,
  colors: Object.freeze({
    cool: '#343853',
    sea: '#234e70',
    warm: '#ed9a76',
    reflection: '#ffcc70',
    sun: '#fff4a8',
    horizonGlow: '#ffd77c',
    streak: '#fff4cf',
  }),
});

export const MAILLARD_CART = Object.freeze({
  map: 'maillard_path',
  landingSpawn: 'cart_landing',
  completionFlag: 'maillard_cart_done',
  order: Object.freeze(['player', 'ppaman', 'gyeongsub']),
});
