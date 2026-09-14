export const PARK_CLEANING = {
  duration: 7.4, warn: 0.65,
  line: '파크가디언 청소서비스에요~',
  assets: { bag: 'cleaningBag', broom: 'cleaningBroom', dustpan: 'cleaningDustpan' },
  sizes: { bag: [32, 32], broom: [56, 112], dustpan: [72, 48] },
  sourceSizes: { bag: [64, 64], broom: [64, 128], dustpan: [96, 64] },
  contactPixels: {
    bag: [[[24, 23], [39, 23], [47, 29], [51, 37], [51, 48], [47, 55], [18, 55], [13, 47], [13, 36], [18, 28]]],
    broom: [[[30, 11], [33, 11], [33, 87], [30, 87]], [[28, 102], [36, 102], [43, 120], [21, 120]]],
    dustpan: [[[29, 31], [67, 31], [80, 53], [16, 53]]],
  },
  bagSeconds: 1.1, broomSeconds: 1.25, dustpanSeconds: 1.05,
  bagEdgeInset: 18,
  waves: [
    { at: 0.2, kind: 'bag', lanes: [0, 2, 4] },
    { at: 1.4, kind: 'bag', lanes: [1, 3] },
    { at: 3.0, kind: 'broom' },
    { at: 5.0, kind: 'dustpan' },
    { at: 5.3, kind: 'bag', lanes: [0, 4] },
  ],
};
