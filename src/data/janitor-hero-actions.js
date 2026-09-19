export const JANITOR_HERO_ACTIONS = Object.freeze({
  attack: { src: 'assets/battle/janitor-hero-attack.png', cell: 320, cols: 2, count: 6, pivot: [164, 236],
    holds: [0.22, 0.34, 0.12, 0.1, 0.22, 0.24], contactOffset: [90, 10] },
  energy: { src: 'assets/fx/janitor-red-triple.png', cell: 128, cols: 2, count: 4, pivot: [64, 64], fps: 16,
    origin: [90, 10], target: [0, -100], flight: 0.52, impactHold: 0.2 },
  assistHold: 0.28,
  intercept: { notice: 0.3, teleport: 0.18, laugh: 0.9, settle: 0.15, headOffset: 76, minimumRootY: 150 },
  sounds: { release: 'rudebuster_swing', hit: 'rudebuster_hit', teleport: 'spearappear', notice: 'chime', laugh: 'laugh_janitor' },
});
