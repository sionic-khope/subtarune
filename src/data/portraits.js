export const PORTRAIT_ALIASES = Object.freeze({ youngcle: 'youngcle_tv_smirk' });

/** Resolve a dialogue portrait key to its existing approved face asset. */
export const resolvePortraitKey = name => PORTRAIT_ALIASES[name] ?? name;
