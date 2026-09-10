const frame = (rect, pivot, duration, exclude = []) => ({ rect, pivot, duration, exclude });
const idle = (pivot) => [0, 1, 2, 3].map((column) => frame([column * 384, 0, 384, 512], pivot, 0.25));

export const BATTLE_SPRITES = {
  hyungsub: {
    src: 'assets/battle/hyungsub.png', scale: 0.25,
    idle: idle([156, 490]),
    attack: [
      frame([0, 512, 352, 512], [166, 458], 0.16),
      frame([352, 512, 456, 512], [122, 458], 0.10, [[416, 388, 40, 124]]),
      frame([768, 512, 440, 512], [118, 458], 0.14, [[0, 0, 40, 388]]),
      frame([1208, 512, 328, 512], [100, 458], 0.18),
    ],
  },
  gyeongsub: {
    src: 'assets/battle/gyeongsub.png', scale: 0.25,
    idle: idle([149, 466]),
    attack: [
      frame([0, 512, 352, 512], [165, 433], 0.24),
      frame([352, 512, 412, 512], [132, 433], 0.12),
      frame([764, 512, 428, 512], [124, 433], 0.20),
      frame([1192, 512, 344, 512], [118, 433], 0.22),
    ],
  },
  ppaman: {
    src: 'assets/battle/ppaman.png', scale: 0.25,
    idle: idle([174, 466]),
    attack: [
      frame([0, 512, 360, 512], [170, 433], 0.20),
      frame([360, 512, 410, 512], [142, 433], 0.14),
      frame([770, 512, 420, 512], [137, 433], 0.20),
      frame([1190, 512, 346, 512], [120, 433], 0.20),
    ],
  },
};

export const BATTLE_PREVIEW = {
  ids: ['hyungsub', 'gyeongsub', 'ppaman'],
  anchors: [[80, 230], [220, 230], [360, 230]],
  colorKey: { rMin: 220, gMax: 40, bMin: 220 },
};
