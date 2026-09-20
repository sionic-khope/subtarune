// 타일 교체가 한 행에서부터 위아래로 번진다(벚꽃 숲 jjajang_sakura, BUILD261 “맵 자체가 조건부로 변하는 느낌”): origin 행에서 speed(행/초)로 반지름이 커지며 닿은 행을 돌려준다.
//   main.js 가 돌려받은 행을 tileSwaps 로 바꿔 다시 굽고, covers(행) 로 소품(나무) 그림도 같은 박자로 바꾼다. 순수 로직.
export function createTileSpread({ origin, speed = 10, rows = [] }) {
  const pending = new Set(rows.map(Number)); let radius = 0;
  return {
    get radius() { return radius; },
    get done() { return pending.size === 0; },
    covers(row) { return Math.abs(row - origin) <= radius; },
    /** dt 초만큼 번진다. 새로 닿은 행 번호 목록(각 행은 한 번만) */
    update(dt) {
      radius += speed * dt;
      const hit = [];
      for (const r of [...pending].sort((a, b) => Math.abs(a - origin) - Math.abs(b - origin))) if (Math.abs(r - origin) <= radius) { hit.push(r); pending.delete(r); }
      return hit;
    },
  };
}
