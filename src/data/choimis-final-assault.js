/** BUILD300 final survival barrage tuning; all phases use the existing pink controls. */
export const CHOIMIS_FINAL_ASSAULT = Object.freeze({
  seconds: 60, stageSeconds: 15, step: 1 / 120,
  box: Object.freeze({ x: 8, y: 8, w: 464, h: 304 }),
  heartMargin: 14, bossInset: 46, bossRadius: 24,
  bossAmplitude: 76, bossFrequency: 0.63,
  corridorAmplitude: 95, corridorFrequency: 0.42, corridorHalfWidth: 29,
  firstWave: 0.65, waveEvery: [0.95, 0.78, 0.65, 0.48],
  speeds: [166, 184, 205, 230], rowSpacing: 30, rowMargin: 20,
  warn: 0.5, kartWarn: 0.7, maxHazards: 96, maxShots: 24, maxEffects: 80,
  beamFirst: 16, beamEvery: [0, 2.3, 1.9, 1.5], beamWarn: 0.9, beamHit: 0.38, beamRadius: 5,
  resolveLines: Object.freeze([
    { contacts: 6, text: '아직이다.' },
    { contacts: 15, text: '아직 쓰러질 수 없어.' },
    { contacts: 27, text: '쓰읍 미스' },
  ]),
});
