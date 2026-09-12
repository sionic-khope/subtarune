export const maillard_cart_board = Object.assign([
  { if: (flags) => flags.maillard_cart_done, goto: 'end' },
  { action: (game) => game.startMaillardCart() },
  { label: 'end' },
  { end: true },
], { silent: true });
