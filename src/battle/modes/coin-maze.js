// 코인벌기 미로(BUILD214 사용자 “피하는 공간에 미로를 만들어서 탈출구에 코인을 두고, 중간중간 레이저를 쏴서 방해, 미로 탈출하면 패턴 끝, 15~20초”):
//   상자(240×214)에 12×10 미로(완전 미로 — 시드 DFS, 항상 풀린다). 왼쪽 위 입구에서 시작, 오른쪽 아래 출구에 코인. 3.2초마다 가로(a)/세로(b) 레이저 띠가 예고 뒤 지나간다(맞으면 피해).
//   코인에 닿으면 코인 +1 하고 끝, maxSeconds 지나면 놓친 채 끝. 소울은 벽을 못 지나간다(칸 단위 축별 충돌).
import { TVFORM_BATTLE as C } from '../../data/youngcle-tvform-battle.js';
import { drawCoin } from '../coin-patterns.js';
const TAU = Math.PI * 2;

/** 시드 난수(같은 시드면 같은 미로 — 검사용) */
export function seededRandom(seed) { let s = (seed >>> 0) || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return (s % 100000) / 100000; }; }

/** 완전 미로(DFS backtracker): right[r][c]/down[r][c] 가 true 면 그 쪽 벽이 열려 있다 */
export function generateMaze(cols, rows, seed) {
  const rnd = seededRandom(seed);
  const right = Array.from({ length: rows }, () => Array(cols).fill(false)), down = Array.from({ length: rows }, () => Array(cols).fill(false));
  const seen = Array.from({ length: rows }, () => Array(cols).fill(false)); const stack = [[0, 0]]; seen[0][0] = true;
  while (stack.length) {
    const [r, c] = stack[stack.length - 1];
    const next = [[r, c + 1, 'R'], [r + 1, c, 'D'], [r, c - 1, 'L'], [r - 1, c, 'U']].filter(([nr, nc]) => nr >= 0 && nc >= 0 && nr < rows && nc < cols && !seen[nr][nc]);
    if (!next.length) { stack.pop(); continue; }
    const [nr, nc, dir] = next[Math.floor(rnd() * next.length)]; seen[nr][nc] = true;
    if (dir === 'R') right[r][c] = true; else if (dir === 'L') right[nr][nc] = true; else if (dir === 'D') down[r][c] = true; else down[nr][nc] = true;
    stack.push([nr, nc]);
  }
  return { cols, rows, right, down };
}

/** 입구(0,0)→출구(rows-1, cols-1) 최단 경로 길이(칸 수) — 검사·난도 확인용 */
export function solveMaze(m) {
  const dist = Array.from({ length: m.rows }, () => Array(m.cols).fill(-1)); const q = [[0, 0]]; dist[0][0] = 0;
  while (q.length) {
    const [r, c] = q.shift();
    const moves = []; if (m.right[r][c]) moves.push([r, c + 1]); if (c > 0 && m.right[r][c - 1]) moves.push([r, c - 1]); if (m.down[r][c]) moves.push([r + 1, c]); if (r > 0 && m.down[r - 1][c]) moves.push([r - 1, c]);
    for (const [nr, nc] of moves) if (dist[nr][nc] < 0) { dist[nr][nc] = dist[r][c] + 1; q.push([nr, nc]); }
  }
  return dist[m.rows - 1][m.cols - 1];
}

export function createCoinMaze(battle, { enemy }) {
  const K = C.maze, sup = battle.support, variant = sup?.mazeVariant || 'a', board = battle.board, soul = battle.soul;
  const [bw, bh] = [240, 214]; board.setTarget(bw, bh, 240, 214); board.snap();
  const b = board.rect, cell = K.cell, ox = Math.round(b.x + (b.w - K.cols * cell) / 2), oy = Math.round(b.y + (b.h - K.rows * cell) / 2);
  const maze = generateMaze(K.cols, K.rows, (variant === 'a' ? K.seedA : K.seedB) + (sup?.mazeCount || 0) * 7919);
  const coin = { x: ox + (K.cols - 0.5) * cell, y: oy + (K.rows - 0.5) * cell, r: C.coin.r, t: 0 };
  soul.x = ox + cell / 2; soul.y = oy + cell / 2; soul.invuln = 0;
  let t = 0, got = false, done = false, disposed = false, lasers = [], nextLaser = K.laserEvery, endAt = -1, open = 0;
  const cellOf = (x, y) => [Math.max(0, Math.min(K.rows - 1, Math.floor((y - oy) / cell))), Math.max(0, Math.min(K.cols - 1, Math.floor((x - ox) / cell)))];
  const moveSoul = (dt, input) => {
    let vx = 0, vy = 0; if (input.down('left')) vx -= 1; if (input.down('right')) vx += 1; if (input.down('up')) vy -= 1; if (input.down('down')) vy += 1;
    if (vx && vy) { vx *= 0.7071; vy *= 0.7071; }
    const sp = soul.speed * (input.down('cancel') ? 0.5 : 1), m = soul.r + 2;
    // 축별로: 지금 칸의 닫힌 벽은 넘지 못한다(열린 벽은 통과) — 통로 폭 = cell − 벽 2
    const [r, c] = cellOf(soul.x, soul.y);
    let nx = soul.x + vx * sp * dt, ny = soul.y + vy * sp * dt;
    const x0 = ox + c * cell, x1 = x0 + cell, y0 = oy + r * cell, y1 = y0 + cell;
    const openL = c > 0 && maze.right[r][c - 1], openR = maze.right[r][c], openU = r > 0 && maze.down[r - 1][c], openD = maze.down[r][c];
    const inRow = soul.y > y0 + m - 1 && soul.y < y1 - m + 1, inCol = soul.x > x0 + m - 1 && soul.x < x1 - m + 1;   // 통로 한가운데 줄에 있을 때만 옆 칸으로 새 수 있다
    if (nx < x0 + m && !(openL && inRow)) nx = x0 + m; if (nx > x1 - m && !(openR && inRow)) nx = x1 - m;
    if (ny < y0 + m && !(openU && inCol)) ny = y0 + m; if (ny > y1 - m && !(openD && inCol)) ny = y1 - m;
    soul.x = Math.max(ox + m, Math.min(ox + K.cols * cell - m, nx)); soul.y = Math.max(oy + m, Math.min(oy + K.rows * cell - m, ny));
    if (soul.invuln > 0) soul.invuln -= dt;
  };
  return {
    get snapshot() { return { t, got, done, open: Math.round(open * 100) / 100, variant, soul: { x: Math.round(soul.x), y: Math.round(soul.y) }, coin: { x: Math.round(coin.x), y: Math.round(coin.y) }, lasers: lasers.map(l => ({ axis: l.axis, at: Math.round(l.pos), fired: l.age >= K.laserWarn })), solve: solveMaze(maze) }; },
    update(dt, input) {
      if (disposed) return true;
      t += dt; open = Math.min(1, t / 0.6); coin.t += dt;
      if (t < 0.6) return false;
      if (!got) moveSoul(dt, input);
      // 레이저: 가로(a)/세로(b) 띠 — 예고(깜빡이는 점선) 뒤 지나간다
      if (t >= nextLaser && t < K.maxSeconds - 1.5 && !got) {
        nextLaser += K.laserEvery; const axis = variant === 'a' ? 'h' : 'v';
        const pos = axis === 'h' ? oy + (Math.floor(battle.rnd() * K.rows) + 0.5) * cell : ox + (Math.floor(battle.rnd() * K.cols) + 0.5) * cell;
        lasers.push({ axis, pos, age: 0, hit: false }); battle.sfx('laser_charge', { volume: 0.4 });
      }
      for (const l of lasers) { l.age += dt; if (l.age >= K.laserWarn && !l.fired) { l.fired = true; battle.sfx('laser_zap', { volume: 0.7 }); }
        if (l.age >= K.laserWarn && l.age < K.laserWarn + K.laserHit && soul.invuln <= 0 && !got) { const d = l.axis === 'h' ? Math.abs(soul.y - l.pos) : Math.abs(soul.x - l.pos); if (d <= cell / 2 - 2 + soul.r - 2) battle.hurtParty(enemy.def.damage ?? 15); } }
      lasers = lasers.filter(l => l.age < K.laserWarn + K.laserHit);
      if (!got && Math.hypot(soul.x - coin.x, soul.y - coin.y) <= soul.r + coin.r) { got = true; endAt = t + 0.7; sup?.onPickup?.(coin); }
      if (!got && t >= K.maxSeconds) { got = false; endAt = t; done = true; }
      if (endAt >= 0 && t >= endAt) { done = true; board.setTarget(440, 72, 240, 282); return true; }
      return false;
    },
    draw(ctx) {
      board.draw(ctx);
      if (open <= 0) return;
      ctx.save(); ctx.beginPath(); ctx.rect(b.x + 3, b.y + 3, b.w - 6, b.h - 6); ctx.clip();
      // 미로 벽(흰 선), 열리는 동안은 위에서 아래로 드러난다
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath();
      const rowsShown = Math.ceil(open * K.rows);
      for (let r = 0; r < rowsShown; r++) for (let c = 0; c < K.cols; c++) {
        const x0 = ox + c * cell, y0 = oy + r * cell;
        if (!maze.right[r][c]) { ctx.moveTo(x0 + cell, y0); ctx.lineTo(x0 + cell, y0 + cell); }
        if (!maze.down[r][c]) { ctx.moveTo(x0, y0 + cell); ctx.lineTo(x0 + cell, y0 + cell); }
      }
      ctx.moveTo(ox, oy); ctx.lineTo(ox + K.cols * cell, oy); ctx.moveTo(ox, oy); ctx.lineTo(ox, oy + K.rows * cell); ctx.stroke();
      // 레이저 띠
      for (const l of lasers) {
        const w = cell - 2, firing = l.age >= K.laserWarn;
        if (l.axis === 'h') { const y = l.pos - w / 2; if (!firing) { if (Math.floor(l.age * 12) % 2 === 0) { ctx.fillStyle = 'rgba(255,60,60,0.28)'; ctx.fillRect(ox, y, K.cols * cell, w); } } else { ctx.fillStyle = 'rgba(255,60,60,0.9)'; ctx.fillRect(ox, y, K.cols * cell, w); ctx.fillStyle = '#fff'; ctx.fillRect(ox, l.pos - 2, K.cols * cell, 4); } }
        else { const x = l.pos - w / 2; if (!firing) { if (Math.floor(l.age * 12) % 2 === 0) { ctx.fillStyle = 'rgba(255,60,60,0.28)'; ctx.fillRect(x, oy, w, K.rows * cell); } } else { ctx.fillStyle = 'rgba(255,60,60,0.9)'; ctx.fillRect(x, oy, w, K.rows * cell); ctx.fillStyle = '#fff'; ctx.fillRect(l.pos - 2, oy, 4, K.rows * cell); } }
      }
      if (!got) drawCoin(ctx, coin.x, coin.y, coin.r, coin.t); else if (Math.floor(t * 12) % 2 === 0) drawCoin(ctx, coin.x, coin.y, coin.r + 3, coin.t);
      ctx.restore();
      soul.draw(ctx);
      ctx.font = '12px "Galmuri11", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillStyle = '#c9c9d9'; ctx.fillText(`${Math.max(0, Math.ceil(K.maxSeconds - t))}`, 240, b.y - 16); ctx.textAlign = 'left';
    },
    dispose() { disposed = true; board.setTarget(440, 72, 240, 282); },
  };
}
