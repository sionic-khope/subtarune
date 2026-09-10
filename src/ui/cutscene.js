// ─────────────────────────────────────────────────────────────
// 컷신 명령 (스크립트 노드 → "waiter"). ScriptRunner 가 텍스트/분기 외 노드를 여기로 넘긴다.
// waiter = { update(dt, input) → true(끝) }
//
//  { wait: 1.0 }                              초 단위 대기
//  { move: 'player'|id, to:[tx,ty] | px:[x,y] | by:[dx,dy], speed?: 60, run?: true }
//                                             걸어서 이동(충돌 무시). to=타일, px=픽셀, by=상대 픽셀
//  { face: id, dir: 'up'|'down'|'left'|'right' | 'toward:'+id }
//  { camera: [tx,ty] | 'player' | id, duration?: 1 }   카메라 팬 / 다시 따라가기
//  { fade: 'in'|'out'|'white', duration?: 0.5 }     white = 하얗게. 'in' 은 현재 색에서 걷힘
//  { shake: 0.4, amp?: 3 }                    화면 흔들림
//  { sfx: 'chime' }  { sound: 'thud' }  { bgm: 'opening' } / { bgm: null, fadeOut: 1 }   assets/audio/bgm/<name>.mp3
//  { show: id } { hide: id } { spawn: {type,...} } { remove: id }
//  { zoom: s, at: id|[x,y], offset?, duration? }  2D 월드 줌 (UI 제외)
//  { scene3d: 'drawer', flag? }  src/scenes/<name>.js 의 run(game,node) → {found} 을 기다림
//  { tiles:'키' } 맵 tileSwaps 적용(다리 내려옴 등)
//  { join:'ppaman' } { leave:'id' } { regroup:true } 파티(동료)
//  { bubble:'player'|id, dots?:3, gap?:0.4, hold?:0.6 } 머리 위 '...' 말풍선(대화창 없이)
//  { raft:id, go:true | jump:true | until:'stop' } 뗏목 출발/점프/멈출 때까지 대기   { prompt:'C를 눌러보자' } C 로만 닫히는 안내 창   { shakeOff:id, duration } 물 털기(타다다닥+파란 점)
//  { chat:'open'|mode|'close' } 방송 채팅창 / { dialog:{…}|'press'|null } 오류창 / { vortex:{at,size,grow}|null } 소용돌이
//  { map: 'room', spawn: 'bed' }              즉시 맵 교체 (앞뒤로 fade 를 붙일 것)
//  { caption: '평화롭던 우이동', duration?: 3 }   화면 위쪽에 지역 이름이 떠올랐다 사라짐 (기다리지 않음)
//  { pose: id, to: 'lying'|'stand' }           누움(옆으로 눕힌 스프라이트)/일어남
//  { motion: id, name: 'laugh', sfx?: 'laugh_junhee' } 캐릭터별 등록 동작을 한 번 재생 후 복귀
//  { curtain: 'black'|'white'|null }            맵을 완전히 가리는 막 (타이밍과 무관하게 새는 것 방지)
//  { parallel: [ ...노드 ] }                  동시에 실행, 전부 끝날 때까지 대기
//  { async: 노드 | [노드...] }                 기다리지 않고 다음으로 (배열이면 배경에서 순차 실행)
// ─────────────────────────────────────────────────────────────
import { TILE } from '../world/tiles.js';
import { SCREEN_W, SCREEN_H } from '../world/world.js';
import { characterMotionWaiter } from '../world/character-motion.js';

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
  if (node.to) { tx = node.to[0] * TILE + TILE * 0.125; ty = node.to[1] * TILE + TILE * 0.5; }
  else if (node.px) { [tx, ty] = node.px; }
  else if (node.by) { tx = e.x + node.by[0] * TILE / 16; ty = e.y + node.by[1] * TILE / 16; }   // by 는 16px 단위
  else return done;
  const speed = (node.speed ?? (node.run ? 110 : 60)) * TILE / 16;
  return {
    update(dt) {
      const dx = tx - e.x, dy = ty - e.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 0.5) {
        e.x = tx; e.y = ty; e.moving = false; e.animate?.(dt);
        if (e === game.player) e.trail = [];   // 동료가 옛 발자국으로 되돌아가지 않게
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
  const clampX = (v) => map.pxW < SCREEN_W ? (map.pxW - SCREEN_W) / 2 : Math.max(0, Math.min(map.pxW - SCREEN_W, v));
  const clampY = (v) => map.pxH < SCREEN_H ? (map.pxH - SCREEN_H) / 2 : Math.max(0, Math.min(map.pxH - SCREEN_H, v));
  const ex = clampX(tx * TILE - SCREEN_W / 2 + TILE / 2), ey = clampY(ty * TILE - SCREEN_H / 2 + TILE / 2);
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

function sequence(game, nodes) {
  let i = 0, cur = null;
  return { update(dt, input) {
    while (true) {
      if (!cur) { if (i >= nodes.length) return true; cur = makeWaiter(game, nodes[i++]) || { update: () => true }; }
      if (!cur.update(dt, input)) return false;
      cur = null;
    }
  } };
}

function parallel(game, nodes) {
  const ws = nodes.map((n) => makeWaiter(game, n)).filter(Boolean);
  return { update(dt, input) { let all = true; for (const w of ws) if (!w.done) { if (w.update(dt, input)) w.done = true; else all = false; } return all; } };
}

/** 노드 → waiter | null(컷신 명령 아님) */
export function makeWaiter(game, node) {
  if (node.wait !== undefined) return timer(node.wait);
  if (node.move) return mover(game, node);
  if (node.motion) {
    const entity = findEntity(game, node.motion);
    const definition = game.characterMotions?.[entity?.def.sprite]?.[node.name];
    if (node.sfx) game.sound.sfx(node.sfx);
    if (!entity || !definition) { console.warn('[cutscene] 동작 없음:', node.motion, node.name); return done; }
    return characterMotionWaiter(entity, definition);
  }
  if (node.face) {
    const e = findEntity(game, node.face);
    if (e) {
      if (typeof node.dir === 'string' && node.dir.startsWith('toward:')) { const t = findEntity(game, node.dir.slice(7)); if (t) e.faceToward?.(t); }
      else e.facing = node.dir;
    }
    return done;
  }
  if (node.camera !== undefined) return cameraPan(game, node);
  if ('bgm' in node) { if (node.bgm) game.sound.playBgm(node.bgm, { volume: node.volume ?? 0.6 }); else game.sound.stopBgm(node.fadeOut ?? node.fade ?? 0.8); return done; }
  if (node.fade) {
    let finished = false;
    const toColor = node.fade === 'white' ? 'white' : node.fade === 'out' ? 'black' : undefined;
    game.fadeTo(node.fade === 'in' ? 0 : 1, node.duration ?? 0.5, () => { finished = true; }, toColor);
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
  if ('curtain' in node) { game.curtain = node.curtain; return done; }
  if (node.caption) { game.caption = { text: node.caption, time: 0, duration: node.duration ?? 3.2 }; return done; }
  if (node.pose) { const e = findEntity(game, node.pose); if (e) { e.pose = node.to === 'lying' ? 'lying' : null; e.moving = false; e.frame = 0; } return done; }
  if (node.zoom !== undefined) {                       // { zoom:2.8, at:'tv'|[x,y], offset:[dx,dy], duration:0.8 } / { zoom:1 }
    let focus = null;
    if (Array.isArray(node.at)) focus = node.at;
    else if (node.at) { const e = findEntity(game, node.at); if (e) focus = [(e.drawX ?? e.x) + (e.iw ?? e.w) / 2, (e.drawY ?? e.y) + (e.ih ?? e.h) / 2]; }
    if (focus && node.offset) focus = [focus[0] + node.offset[0], focus[1] + node.offset[1]];
    let finished = false;
    game.zoomTo(node.zoom, focus || undefined, node.duration ?? 0.8, () => { finished = true; });
    return { update: () => finished };
  }
  if (node.scene3d) {                                  // { scene3d:'drawer', flag:'cord_found' } — WebGL 오버레이 씬, 끝나면 result.found 를 flag 에
    let finished = false;
    game.scene3d = node.scene3d;
    import(`../scenes/${node.scene3d}.js`)
      .then((m) => m.run(game, node))
      .catch((e) => { console.warn('[scene3d] 실패 → 건너뜀', e); return { found: true, fallback: true }; })
      .then((res) => { game.scene3d = null; if (node.flag && res?.found) game.setFlag(node.flag); game.flags[`${node.scene3d}_result`] = res?.found ? 'found' : 'cancel'; finished = true; });
    return { update: () => finished };
  }
  if ('chat' in node) {                                // { chat:'open'|'close'|'late'|'spam'|'idle'|'question'|'silence'|'panic' }
    if (node.chat === 'open') game.chat.start({ viewers: node.viewers ?? 100 });
    else if (node.chat === 'close' || node.chat === null) game.chat.stop();
    else game.chat.setMode(node.chat);
    return done;
  }
  if ('dialog' in node) {                              // { dialog:{title,text,button} } { dialog:'press' } { dialog:null }
    if (node.dialog === 'press') { game.sysdialog.press(); return timer(0.35); }
    if (node.dialog) game.sysdialog.show(node.dialog); else game.sysdialog.hide();
    return done;
  }
  if ('vortex' in node) {                              // { vortex:{ at:'pc'|[x,y], size, grow } } { vortex:null } — 기다리지 않음
    if (!node.vortex) { game.vortex.stop(); return done; }
    if (game.vortex.active && !node.vortex.at) game.vortex.grow(node.vortex);
    else {
      let x = 0, y = 0;
      if (Array.isArray(node.vortex.at)) [x, y] = node.vortex.at;
      else { const e = findEntity(game, node.vortex.at); if (e) { x = (e.drawX ?? e.x) + (e.iw ?? e.w) / 2; y = (e.drawY ?? e.y) + (e.ih ?? e.h) * 0.35; } }
      game.vortex.start({ x, y, size: node.vortex.size, grow: node.vortex.grow });
    }
    return done;
  }
  if (node.tiles) { game.applyTiles(node.tiles); return done; }
  if (node.bubble) {                                   // { bubble:'player'|id, dots?, gap?, hold? } — 머리 위 '...' 말풍선, 다 찍히고 사라질 때까지 기다림
    const e = findEntity(game, node.bubble); if (!e) return done;
    game.textbox.close(); game.bubble.start(e, node);
    return { update: () => game.bubble.done };
  }
  if (node.join) { game.joinParty(node.join); return done; }          // { join:'ppaman' } 동료 가입(맵의 같은 id NPC 는 사라짐)
  if (node.leave) { game.leaveParty(node.leave); return done; }
  if (node.raft) {                                     // { raft:id, go:true } 출발 / { raft:id, jump:true } 점프(컷신용 강제) / { raft:id, until:'stop' } 멈출 때까지(벽에 쿵·도착)
    const r = findEntity(game, node.raft); if (!r) return done;
    if (node.go) { r.depart(); return done; }
    if (node.jump) { r.jump(true); return done; }
    if (node.until === 'stop') return { update: () => !r.moving };
    return done;
  }
  if (node.prompt) {                                   // { prompt:'C를 눌러보자' } 작은 안내 창 — C 를 누를 때까지(텍스트 넘김 아님)
    game.textbox.close(); game.prompt = { text: node.prompt, t: 0 };
    return { update: (dt, input) => { if (!game.prompt) return true; game.prompt.t += dt; if (input.just('confirm')) { game.prompt = null; return true; } return false; } };
  }
  if (node.shakeOff) {                                 // { shakeOff:id, duration:0.9 } 강아지 물 털듯 타다다닥 흔들림 + 파란 물방울 (새 스프라이트 없음)
    const e = findEntity(game, node.shakeOff); if (!e) return done;
    e.jitter = { t: node.duration ?? 0.9, amp: node.amp ?? 2 }; let acc = 0;
    return { update: (dt) => { acc += dt; while (acc > 0.03) { acc -= 0.03; game.emitDroplets(e, 2); } return !e.jitter; } };
  }
  if (node.regroup) { for (const e of game.entities) if (e.def?.type === 'follower') e.snapBehind(); return done; }   // 동료를 주인공 뒤로 재정렬   // { tiles:'bridge_down' } 맵 tileSwaps 적용 + 다시 굽기
  if (node.parallel) return parallel(game, node.parallel);
  if ('async' in node) {
    if (!node.async) { game.background = []; return done; }               // { async:null } 남은 배경 동작 취소
    const w = Array.isArray(node.async) ? sequence(game, node.async) : makeWaiter(game, node.async); if (w) game.background.push(w); return done;
  }
  return null;
}
