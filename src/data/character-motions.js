import { BATTLE_PREVIEW, BATTLE_SPRITES } from './battle-sprites.js';

export const CHARACTER_MOTIONS = {
  park_guardian_costume: {
    bow: {
      src: 'assets/sprites/park-guardian-bow.png',
      scale: 27 / 60,
      colorKey: { rMin: 256, gMax: -1, bMin: 256 },
      frames: Array.from({ length: 8 }, (_, i) => ({ rect: [(i % 2) * 128, Math.floor(i / 2) * 128, 128, 128], pivot: [64, 119], duration: 0.18 })),
    },
  },
  warm_bidet: {
    axe_strike: {
      src: 'assets/sprites/warm-bidet-axe-strike.png',
      scale: 0.96,
      colorKey: { rMin: 256, gMax: -1, bMin: 256 },
      frames: Array.from({ length: 4 }, (_, i) => ({ rect: [(i % 2) * 128, Math.floor(i / 2) * 128, 128, 128], pivot: [64, 119], duration: [0.22, 0.18, 0.38, 0.24][i] })),
    },
  },
  ttuulla: {
    burrow: {
      src: 'assets/sprites/ttuulla-burrow.png',
      scale: 26.5 / 75,
      colorKey: { rMin: 256, gMax: -1, bMin: 256 },
      frames: Array.from({ length: 4 }, (_, i) => ({ rect: [(i % 2) * 128, Math.floor(i / 2) * 128, 128, 128], pivot: [64, 119], duration: [0.24, 0.2, 0.2, 0.22][i] })),
    },
  },
  hyungsub: {
    attack: {
      src: BATTLE_SPRITES.hyungsub.src,
      scale: 0.13,
      colorKey: BATTLE_PREVIEW.colorKey,
      frames: BATTLE_SPRITES.hyungsub.attack,
    },
  },
  expelled_viewer: {
    legraise: {
      src: 'assets/sprites/expelled-viewer-legraise.png',
      scale: 0.8,
      colorKey: { rMin: 256, gMax: -1, bMin: 256 },
      frames: Array.from({ length: 4 }, (_, i) => ({ rect: [(i % 2) * 96, Math.floor(i / 2) * 96, 96, 96], pivot: [48, 88], duration: 0.23 })),
    },
    knockdown: {
      src: 'assets/sprites/expelled-viewer-knockdown.png',
      scale: 0.8,
      colorKey: { rMin: 256, gMax: -1, bMin: 256 },
      frames: Array.from({ length: 4 }, (_, i) => ({ rect: [(i % 2) * 96, Math.floor(i / 2) * 96, 96, 96], pivot: [48, 88], duration: i === 3 ? 0.5 : 0.12 })),
    },
    crouch: {
      src: 'assets/sprites/expelled-viewer-crouch.png',
      scale: 0.8,
      colorKey: { rMin: 256, gMax: -1, bMin: 256 },
      frames: Array.from({ length: 4 }, (_, i) => ({ rect: [(i % 2) * 96, Math.floor(i / 2) * 96, 96, 96], pivot: [48, 88], duration: 0.14 })),
    },
    reveal: {
      src: 'assets/sprites/expelled-viewer-reveal.png',
      scale: 0.8,
      colorKey: { rMin: 256, gMax: -1, bMin: 256 },
      frames: Array.from({ length: 4 }, (_, i) => ({ rect: [(i % 2) * 96, Math.floor(i / 2) * 96, 96, 96], pivot: [48, 88], duration: i === 3 ? 0.6 : 0.12 })),
    },
    dance: {
      src: 'assets/sprites/expelled-viewer-dance.png',
      scale: 0.8,
      colorKey: { rMin: 256, gMax: -1, bMin: 256 },
      frames: Array.from({ length: 8 }, (_, i) => ({ rect: [(i % 2) * 96, Math.floor(i / 2) * 96, 96, 96], pivot: [48, 88], duration: 0.18 })),
    },
  },
  baron_intro: {
    roar: {
      src: 'assets/enemies/baron-roar.png',
      scale: 160 / 256,
      colorKey: { rMin: 256, gMax: -1, bMin: 256 },
      frames: [
        { rect: [0, 0, 256, 256], pivot: [128, 240], duration: 0.25 },
        { rect: [256, 0, 256, 256], pivot: [128, 240], duration: 0.35 },
        { rect: [0, 256, 256, 256], pivot: [128, 240], duration: 0.8 },
        { rect: [256, 256, 256, 256], pivot: [128, 240], duration: 0.35 },
      ],
    },
  },
  junhee: {
    laugh: {
      src: 'assets/sprites/junhee-laugh.png',
      scale: 84 / 512 / 2,
      colorKey: { rMin: 220, gMax: 40, bMin: 220 },
      frames: [
        { rect: [0, 0, 627, 627], pivot: [317, 585], duration: 0.24 },
        { rect: [627, 0, 627, 627], pivot: [298, 588], duration: 0.30 },
        { rect: [0, 627, 627, 627], pivot: [319, 566], duration: 0.24 },
        { rect: [627, 627, 627, 627], pivot: [298, 567], duration: 0.32 },
      ],
    },
  },
};
