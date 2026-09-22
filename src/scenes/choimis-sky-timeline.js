const ease = value => value * value * (3 - 2 * value);

/** Return the active Choimis scene token, replacing a previously cancelled token. */
export function getChoimisSkyState(game) {
  const state = game.choimisSky && !game.choimisSky.cancelled ? game.choimisSky : (game.choimisSky = {});
  state.cancelled = false;
  state.waiters ||= new Set();
  return state;
}

/** Run one scene animation and resolve false when its owning scene token is cancelled. */
export function waitForChoimisSkyAnimation(game, state, duration, update) {
  return new Promise(resolve => {
    let elapsed = 0;
    let settled = false;
    const finish = completed => {
      if (settled) return true;
      settled = true;
      state.waiters.delete(waiter);
      resolve(completed);
      return true;
    };
    const waiter = {
      choimisSkyState: state,
      cancel: () => finish(false),
      update(dt) {
        if (state.cancelled || game.choimisSky !== state) return finish(false);
        elapsed = Math.min(duration, elapsed + dt);
        update(ease(elapsed / duration), dt);
        return elapsed < duration ? false : finish(true);
      },
    };
    state.waiters.add(waiter);
    game.background.push(waiter);
  });
}

/** Resolve and remove only waiters owned by the supplied Choimis scene token. */
export function cancelChoimisSkyAnimations(game, state) {
  state.cancelled = true;
  for (const waiter of [...(state.waiters || [])]) waiter.cancel();
  game.background = game.background.filter(waiter => waiter.choimisSkyState !== state);
}
