// 전투 안 대사 러너(BUILD208): 줄 목록을 C 로 넘긴다(타자 중이면 다 보여 주고, 다 뜨면 다음 줄). 끝나면 true. 바론 대포 막간(support/baron-cannon.js)과 같은 규칙.
export function createTalk(battle, lines, { onLine } = {}) {
  let i = -1, hold = 0, done = false;
  const next = () => { i++; if (i >= lines.length) { done = true; battle.setText(''); return; } battle.showLine(lines[i]); hold = 0; onLine?.(lines[i], i); };
  next();
  return {
    get index() { return i; },
    get done() { return done; },
    update(dt, input) {
      if (done) return true;
      hold += dt;
      if (input.just('confirm') && hold >= 0.15) { if (!battle.typed) battle.shown = battle.text.length; else next(); }
      return done;
    },
  };
}
