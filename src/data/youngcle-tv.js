export const YOUNGCLE_TV = {
  anchor: 'youngcle_tv', inset: [15, 29, 258, 119], powerTime: 0.8, shutdownTime: 0.28,
  sound: 'youngcle_tv_on', bgm: 'storage_show',
  expressions: {
    smirk: 'assets/sprites/youngcle_tv_smirk.png',
    laugh: 'assets/sprites/youngcle_tv_laugh.png',
    greet: 'assets/sprites/youngcle_tv_greet.png',
    oh: 'assets/sprites/youngcle_tv_oh.png',
  },
};
export const YOUNGCLE_TV_PORTRAITS = Object.keys(YOUNGCLE_TV.expressions).map(expression => `youngcle_tv_${expression}`);
