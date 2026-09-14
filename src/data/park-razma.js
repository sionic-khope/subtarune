/** Park Guardian's summoned text-laser turn; seconds exclude the introduction. */
export const PARK_RAZMA = Object.freeze({
  asset: 'assets/enemies/park-razma.png',
  cell: 128, cols: 2, frames: 4, fps: 4,
  pivot: [64, 116], actor: { x: 240, y: 212 },
  origin: { x: 240, y: 138 },
  board: { x: 20, y: 76, w: 440, h: 238 },
  panel: { x: 20, y: 246, w: 440, h: 72 },
  seconds: { expand: 0.7, call: 2.1, name: 1.1, summon: 2, effect: 0.45, active: 12, leave: 0.6 },
  shots: { count: 10, first: 0.15, every: 1.1, warning: 0.65, fire: 0.7, speed: 780, length: 520, width: 18, glitchWidth: 24 },
  simulationStep: 1 / 120,
  characterSeconds: 0.04,
  speaker: '파크가디언', voice: 'park_guardian_costume',
  text: { call: '훗훗훗.. 나와라 나의 역작', name: '라즈마!!!!!', scream: '으어어어어어어', glitch: '너 전라도 사람이지 ~' },
  sfx: { summon: 'editor_union_bam', appear: 'white', warning: 'scrape', fire: 'rocket' },
  volume: { summon: 0.7, appear: 0.45, warning: 0.22, fire: 0.4 },
});
