const frame = (rect, pivot, duration, exclude = []) => ({ rect, pivot, duration, exclude });
const idle = (pivot) => [0, 1, 2, 3].map((column) => frame([column * 384, 0, 384, 512], pivot, 0.25));
const run = (id, scale, pivots) => ({
  src: `assets/battle/${id}-run.png`,
  scale,
  frames: pivots.map((pivot, index) => frame([(index % 2) * 768, Math.floor(index / 2) * 512, 768, 512], pivot, 0.10)),
});

export const BATTLE_SPRITES = {
  hyungsub: {
    src: 'assets/battle/hyungsub.png', scale: 0.25,
    run: run('hyungsub', 0.225, [[404, 500], [259, 502], [399, 439], [268, 437]]),
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
    run: run('gyeongsub', 0.230, [[340, 475], [249, 475], [343, 424], [255, 425]]),
    idle: idle([149, 466]),
    attack: [
      frame([0, 512, 352, 512], [165, 433], 0.24),
      frame([352, 512, 412, 512], [132, 433], 0.12),
      frame([764, 512, 428, 512], [124, 433], 0.20),
      frame([1192, 512, 344, 512], [118, 433], 0.22),
    ],
  },
  // 청소부(허약, BUILD226 동료): gpt-image-2.5-sunburst 4장(대기·달리기·공격·쓰러짐)을 형섭 규격으로 포장 — assets/source/janitor-v1/export_battle.py, battle-contract.json.
  //   깃발·코사크 댄스 시트(assets/enemies/janitor-stance-*, janitor-dance)는 ‘청소부(전투)’ 전용이라 여기 쓰지 않는다
  janitor: {
    src: 'assets/battle/janitor.png', scale: 0.25,
    run: run('janitor', 0.1864, [[398, 488], [364, 490], [403, 474], [364, 477]]),
    idle: idle([192, 500]),
    attack: [
      frame([0, 512, 384, 512], [192, 500], 0.18),
      frame([384, 512, 384, 512], [191, 500], 0.12),
      frame([768, 512, 384, 512], [191, 500], 0.16),
      frame([1152, 512, 384, 512], [192, 500], 0.20),
    ],
  },
  ppaman: {
    src: 'assets/battle/ppaman.png', scale: 0.25,
    run: run('ppaman', 0.211, [[402, 487], [295, 479], [405, 406], [289, 406]]),
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
  anchors: [[60, 230], [150, 230], [240, 230]],
  attackAnchor: [335, 230],
  target: [425, 230],
  colorKey: { rMin: 220, gMax: 40, bMin: 220 },
};
