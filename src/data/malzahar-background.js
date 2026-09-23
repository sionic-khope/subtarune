/** Distant castle skirmishes; seconds and pixel anchors are independent of combat damage. */
export const MALZAHAR_BACKGROUND = Object.freeze({
  period: 60, duration: 8, fade: 0.6, alpha: 0.88,
  approach: 1.2, strikePeriod: 1.8, dissolve: 0.55,
  approachDistance: 16, knockback: 21, jumpHeight: 25, jumpSeconds: 0.72,
  ledge: { left: 70, width: 210, depth: 10, brick: 26 },
  colors: { stone: '#15151c', edge: '#23212b', mortar: '#08090d', dust: '#49315a' },
  enemy: { cell: 96, cols: 2, pivot: [48, 48], bodyHeight: 70, scale: 0.48, windup: 0.3, strike: 0.18, lunge: 6, knockup: 9 },
  scenes: [
    { at: 10, actor: 'ppaman', enemy: 'warwick', x: 165, y: 180, target: 199, scale: 0.085, hit: 0.34 },
    { at: 25, actor: 'warm_bidet', enemy: 'ezreal', x: 188, y: 167, target: 204, scale: 0.35, hit: 0.4 },
    { at: 40, actor: 'mini_mario', enemy: 'yasuo', x: 200, y: 185, target: 221, scale: 0.55, hit: 0.72 },
    { at: 55, actor: 'gyeongsub', enemy: 'akali', x: 165, y: 172, target: 198, scale: 0.085, hit: 0.36 },
  ],
});
