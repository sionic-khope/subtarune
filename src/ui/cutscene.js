// ─────────────────────────────────────────────────────────────
// 컷신 명령 (스크립트 노드 → "waiter"). ScriptRunner 가 텍스트/분기 외 노드를 여기로 넘긴다.
// waiter = { update(dt, input) → true(끝) }
//
//  { wait: 1.0 }                              초 단위 대기
//  { move: 'player'|id, to:[tx,ty] | px:[x,y] | by:[dx,dy], speed?: 60, run?: true }
//                                             걸어서 이동(충돌 무시). to=타일, px=픽셀, by=상대 픽셀
//  { face: id, dir: 'up'|'down'|'left'|'right' | 'toward:'+id }
//  { camera: [tx,ty] | 'player' | id, duration?: 1 }   카메라 팬 / 다시 따라가기
//  { fade: 'in'|'out', duration?: 0.5 }
//  { shake: 0.4, amp?: 3 }                    화면 흔들림
//  { sfx: 'chime' }  { sound: 'thud' }
//  { show: id } { hide: id } { spawn: {type,...} } { remove: id }
//  { map: 'room', spawn: 'bed' }              즉시 맵 교체 (앞뒤로 fade 를 붙일 것)
//  { parallel: [ ...노드 ] }                  동시에 실행, 전부 끝날 때까지 대기
//  { async: 노드 }                            기다리지 않고 다음으로
// ─────────────────────────────────────────────────────────────
import { TILE } from '../world/tiles.js';

const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const done = { update: () => true };
const timer = (sec) => { let t = sec; return { update: (dt) => (t -= dt) <= 0 }; };

function findEntity(game, ref) {
  if (ref === 'player') return game.player;
  const e = game.entities.find((x) => x.id === ref);
  if (!e) console.warn('[cutscene] 엔티티 없음:', ref);
  return e;
}

function mover(game, node) {
  const e = findEntity(game, node.move);
  if (!e) return done;
  let tx, ty;
  if (node.to) { tx = node.to[0] * TILE + 2; ty = node.to[1] * TILE + 8; }
  else if (node.px) { [tx, ty] = node.px; }
  else if (node.by) { tx = e.x + node.by[0]; ty = e.y + node.by[1]; }
  else return done;
  const speed = node.speed ?? (node.run ? 110 : 60);
  return {
    update(dt) {
      const dx = tx - e.x, dy = ty - e.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 0.5) {
        e.x = tx; e.y = ty; e.moving = false; e.animate?.(dt);
        return true;
      }
      const step = Math.min(dist, speed * dt);
      e.x += (dx / dist) * step; e.y += (dy / dist) * step;
      e.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
      e.moving = true; e.animate?.(dt, node.run ? 14 : 8);
      return false;
    },
  };
}

function cameraPan(game, node) {
  const cam = game.camera;
  if (typeof node.camera === 'string') {
    const e = findEntity(game, node.camera);
    if (e) cam.target = e;
    cam.locked = false;
    return done;
  }
  const [tx, ty] = node.camera;
  const dur = node.duration ?? 1;
  const sx = cam.x, sy = cam.y;
  const map = game.map;
  const clampX = (v) => map.pxW < 320 ? (map.pxW - 320) / 2 : Math.max(0, Math.min(map.pxW - 320, v));
  const clampY = (v) => map.pxH < 240 ? (map.pxH - 240) / 2 : Math.max(0, Math.min(map.pxH - 240, v));
  const ex = clampX(tx * TILE - 160 + 8), ey = clampY(ty * TILE - 120 + 8);
  let t = 0;
  cam.locked = true;
  return {
    update(dt) {
      t += dt;
      const k = Math.min(1, t / dur), ease = 1 - Math.pow(1 - k, 3);
      cam.x = sx + (ex - sx) * ease; cam.y = sy + (ey - sy) * ease;
      return k >= 1;
    },
  };
}

function parallel(game, nodes) {
  const ws = nodes.map((n) => makeWaiter(game, n)).filter(Boolean);
  return { update(dt, input) { let all = true; for (const w of ws) if (!w.done) { if (w.update(dt, input)) w.done = true; else all = false; } return all; } };
}

/** 노드 → waiter | null(컷신 명령 아님) */
export function makeWaiter(game, node) {
  if (node.wait !== undefined) return timer(node.wait);
  if (node.move) return mover(game, node);
  if (node.face) {
    const e = findEntity(game, node.face);
    if (e) {
      if (typeof node.dir === 'string' && node.dir.startsWith('toward:')) { const t = findEntity(game, node.dir.slice(7)); if (t) e.faceToward?.(t); }
      else e.facing = node.dir;
    }
    return done;
  }
  if (node.camera !== undefined) return cameraPan(game, node);
  if (node.fade) {
    let finished = false;
    game.fadeTo(node.fade === 'out' ? 1 : 0, node.duration ?? 0.5, () => { finished = true; });
    if ((node.duration ?? 0.5) === 0) return done;
    return { update: () => finished };
  }
  if (node.shake !== undefined) { game.shake = { time: node.shake, amp: node.amp ?? 3 }; return timer(node.shake); }
  if (node.sfx) { game.sound.sfx(node.sfx); return done; }
  if (node.sound) { game.sound[node.sound]?.(); return done; }
  if (node.show) { const e = findEntity(game, node.show); if (e) e.visible = true; return done; }
  if (node.hide) { const e = findEntity(game, node.hide); if (e) e.visible = false; return done; }
  if (node.remove) { const e = findEntity(game, node.remove); if (e) e.dead = true; return done; }
  if (node.map) { game.changeMap(node.map, node.spawn, true); return done; }
  if (node.spawn) { game.spawn(node.spawn); return done; }
  if (node.parallel) return parallel(game, node.parallel);
  if (node.async) { const w = makeWaiter(game, node.async); if (w) game.background.push(w); return done; }
  return null;
}
