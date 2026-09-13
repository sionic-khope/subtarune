/** Presentation only: seconds and logical pixels for captain_attack.md. */
export const SHIP_ASSAULT = Object.freeze({
  images: {
    maillard: 'assets/props/maillard-ship.png',
    enemy: 'assets/props/youngcle-warship.png',
  },
  bgm: 'youngcle_assault',
  timing: { oceanFade: 1.8, reveal: 3.4, approach: 3, bridge: 2.2, returnFade: 1.1 },
  room: { period: 2.6, shakeTime: 0.55, shakeAmp: 4, dustCount: 20, dustLife: 2.1, gravity: 40 },
  ocean: { explosionPeriod: 1.75, explosionScale: 0.45, waterSpeed: 85, bobHeight: 1.4, bobRate: 1.9 },
  framing: {
    closeWidth: 340, closeCenter: [240, 115],
    width: 172, enemyRatio: 1.5, maillardCenter: [114, 169], enemyCenter: [335, 91],
    enemyApproach: 10, bridgeWidth: 16,
    maillardAnchor: [0.88, 0.64], enemyAnchor: [0.19, 0.85],
  },
});
