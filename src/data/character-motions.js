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
  // 영클 변신형(BUILD211/212): 테나 전투 대기(사용자 GIF)처럼 웅크린 채 앞으로 뻗은 팔이 작은 원을 그리고 몸이 들썩이는 루프. 시트는 이미 투명이라 colorKey 는 안 걸린다. scale 0.5 = assets/sprites 2x 시트와 같은 크기(320 셀 → 229px)
  youngcle_tvform: {
    idle: {
      src: 'assets/sprites/youngcle_tvform.png',
      scale: 0.5,
      colorKey: { rMin: 256, gMax: -1, bMin: 256 },
      frames: Array.from({ length: 4 }, (_, i) => ({ rect: [i * 320, 0, 320, 320], pivot: [160, 312], duration: 0.16 })),
    },
  },
  // 영클 힘 받는 4단계(BUILD211): 웅크림 → 무릎·주먹 → 노려봄 → 포효. 컷신(ship_control.js)이 단계별로 프레임을 골라 loopCharacterMotion 에 건다(떨림은 두 프레임을 빠르게 번갈아)
  youngcle_powerup: {
    rise: {
      src: 'assets/sprites/youngcle_powerup.png',
      scale: 0.5,
      colorKey: { rMin: 256, gMax: -1, bMin: 256 },
      frames: Array.from({ length: 4 }, (_, i) => ({ rect: [i * 128, 0, 128, 128], pivot: [64, 122], duration: 0.5 })),
    },
  },
  // 청소부 호탕한 웃음(BUILD227 사용자 “얼굴 올려서, 쥰희 웃음마냥”): gpt-image-2.5-sunburst 2×2 raw 그대로(마젠타 색키), 발 밑변 pivot·배율은 assets/source/janitor-v1/laugh-contract.json. 소리는 델타룬 거슨 웃음 원음 laugh_janitor
  janitor: {
    laugh: {
      src: 'assets/sprites/janitor-laugh.png',
      scale: 0.1076,
      colorKey: { rMin: 150, gMax: 110, bMin: 150 },
      frames: [
        { rect: [0, 0, 512, 512], pivot: [231, 467], duration: 0.24 },
        { rect: [512, 0, 512, 512], pivot: [231, 467], duration: 0.30 },
        { rect: [0, 512, 512, 512], pivot: [243, 467], duration: 0.24 },
        { rect: [512, 512, 512, 512], pivot: [234, 467], duration: 0.32 },
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
