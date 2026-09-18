/** Data-only contract for the underwater Gajaeman memory sequence. */
export const SHIP_MEMORY = Object.freeze({
  bgm: 'ship_sinking',
  panels: Object.freeze([1, 2, 3, 4, 5].map(number => Object.freeze({
    id: `memory_${number}`,
    src: `assets/illustrations/gajaeman-memory-${number}.png`,
  }))),
  panelRect: Object.freeze({ x: 48, y: 14, w: 384, h: 216 }),
  timing: Object.freeze({
    preTextDelay: 5,
    fadeOut: 1.4,
    blackHold: 0.7,
    fadeIn: 2,
    panelDwell: 5,
    // 복귀 전환 한 번 = fadeOut 1.4 + blackHold 0.7 + fadeIn 2.0
    returnTransition: 4.1,
    shoreTransition: 5,
    bgmFadeIn: 2.4,
    bgmFadeOut: 2.4,
  }),
  underwater: Object.freeze({
    surfaceY: 43,
    yoplaitStartY: 174,
    sinkSpeed: 8,
    maxSink: 16,
    actorScale: 1.15,
    actorTilt: -1.22,
    actorRock: 0.022,
    actorRockRate: 0.23,
    actorBob: 1.5,
    driftX: 7,
    driftRate: 0.13,
    bubbleCount: 22,
    rayCount: 7,
    rayBlur: 10,
  }),
  colors: Object.freeze({
    abyss: '#030b1a',
    deep: '#061124',
    middle: '#0b3151',
    upper: '#23617d',
    surface: '#4c9db2',
    foam: '#a9e5df',
    ray: 'rgba(215,247,215,0.15)',
    rayFaint: 'rgba(215,247,215,0.055)',
    rayClear: 'rgba(215,247,215,0)',
    glowCore: 'rgba(232,255,226,0.26)',
    glowMid: 'rgba(195,240,218,0.09)',
    glowClear: 'rgba(195,240,218,0)',
    bubble: '#a7ebef',
    recovery: '#d8f3e9',
  }),
  sfx: Object.freeze({ entry: 'maillard_splash', recovery: 'chime' }),
});

/** Ordered beat IDs accepted by ShipMemory.setBeat. */
export const SHIP_MEMORY_BEATS = Object.freeze([
  'underwater_enter',
  'memory_1', 'memory_2', 'memory_3', 'memory_4', 'memory_5',
  'underwater_return', 'shore_transition',
]);

/** Script wait for one complete fade-to-black, fade-in and full panel dwell. */
export const SHIP_MEMORY_PANEL_BEAT_DURATION = SHIP_MEMORY.timing.fadeOut
  + SHIP_MEMORY.timing.blackHold
  + SHIP_MEMORY.timing.fadeIn
  + SHIP_MEMORY.timing.panelDwell;
