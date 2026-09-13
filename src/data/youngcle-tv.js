export const YOUNGCLE_TV = {
  anchor: 'youngcle_tv', inset: [15, 29, 258, 119], powerTime: 0.8, shutdownTime: 0.28,
  sound: 'youngcle_tv_on', bgm: 'storage_show',
  expressions: {
    smirk: 'assets/illustrations/youngcle-tv-smirk.png',
    laugh: 'assets/illustrations/youngcle-tv-laugh.png',
    greet: 'assets/illustrations/youngcle-tv-greet.png',
    oh: 'assets/illustrations/youngcle-tv-oh.png',
    taunt: 'assets/illustrations/youngcle-tv-taunt.png',
    shrug: 'assets/illustrations/youngcle-tv-shrug.png',
    bye: 'assets/illustrations/youngcle-tv-bye.png',
    yes: 'assets/illustrations/youngcle-tv-yes.png',
    surprise: 'assets/illustrations/youngcle-tv-surprise.png',
    read: 'assets/illustrations/youngcle-tv-read.png',
    shock: 'assets/illustrations/youngcle-tv-shock.png',
    hide: 'assets/illustrations/youngcle-tv-hide.png',
  },
};
export const YOUNGCLE_TV_PORTRAITS = Object.keys(YOUNGCLE_TV.expressions).map(expression => `youngcle_tv_${expression}`);
