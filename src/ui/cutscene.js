// ─────────────────────────────────────────────────────────────
// 컷신 명령 (스크립트 노드 → "waiter"). ScriptRunner 가 텍스트/분기 외 노드를 여기로 넘긴다.
// waiter = { update(dt, input) → true(끝) }
//
//  { wait: 1.0 }                              초 단위 대기
//  { move: 'player'|id, to:[tx,ty] | px:[x,y] | by:[dx,dy] | rel:'소품id', at:'bottom'|'top'|'left'|'right', by:[dx,dy], speed?: 60, run?: true, dash?: true }  — 소품 앞 연출은 rel 로(누른 위치 무관), 도착 지점은 끼임 자동 보정
//                                             속도 기준(16px 단위/초 → 실제 px/s): 걷기 60(120) · run 110(220) · dash 190(380, 숨으러 뛰어가기 같은 "빨리") — 브리핑에 '빨리·달려·급히'가 있으면 run/dash 중 하나를 반드시 넣는다(2026-09-11 사용자)
//                                             걸어서 이동(충돌 무시). to=타일, px=픽셀, by=상대 픽셀
//  { face: id, dir: 'up'|'down'|'left'|'right' | 'toward:'+id }
//  { camera: [tx,ty] | 'player' | id, duration?: 1 }   카메라 팬 / 다시 따라가기
//  { fade: 'in'|'out'|'white', duration?: 0.5 }     white = 하얗게. 'in' 은 현재 색에서 걷힘
//  { shake: 0.4, amp?: 3 }                    화면 흔들림
//  { sfx: 'chime' }  { sound: 'thud' }  { bgm: 'opening' } / { bgm: null, fadeOut: 1 }   assets/audio/bgm/<name>.mp3
//  { bgmPause: 0.3 } / { bgmResume: 0.3 }         브금을 재생 위치 그대로 잠깐 멈췄다 이어 튼다(정적 개그 뒤 '이어서')
//  { slide: id, by:[dx,dy], duration?: 0.6, sfx? }  소품을 미끄러뜨린다(히트박스+그림 같이, 걷기 애니 없음) — 대포 밀기. by 는 픽셀
//  { scale: id, to: 0.15, duration?: 0.5 }  캐릭터 그림 배율(visualScale)을 to 까지 서서히(토관에 빨려 들어가며 몸이 줄어듦). 끝나면 hide 뒤 { scale:id, to:1, duration:0 } 로 되돌린다
//  { mash: { target:100, push:[id…], tremble:id } }   C 연타 미니게임: 가운데 안내 창(C 키가 눌리는 애니 + 게이지에 불씨가 찬다, 누를 때마다 ember). push 는 미는 걷기 애니, tremble 은 부들부들. target 번이면 끝
//  { fire: { at:id, dx, dy, spread, rate, grow } } / { fire:null }   캐릭터·소품에 불이 붙어 커진다(기다리지 않음, game.flameEmitters) / 전부 끈다
//  대사 노드 옵션 { cut: 1.4 }                   찍히는 중이라도 그 시간에 말이 끊기고 다음으로 (C/X 로 못 넘김) — 말하다 날아가는 연출
//  { rocket: { ids:[id…], speed:1100, camera:id, amp:5 } }   불꼬리를 달고 오른쪽으로 쏘아져 맵 밖으로 사라진다(카메라가 따라감·흔들림, 끝나면 제거)
//  { boom: { sheet:'assets/fx/<이름>.png', at:id|[x,y], cols, rows?:1, count?, fps?:14, scale?:1, offset?:[dx,dy], sfx?, hold?:0 } }
//        한 번만 재생하는 큰 이펙트 애니(가로 프레임 띠). 모든 캐릭터 **위**에 그려지고 다 돌면 사라진다. 그림이 아직 없으면 소리만 나고 조용히 넘어간다.
//        영상에서 만들기: /usr/bin/python3 tools/art/video_to_strip.py <영상> --out assets/fx/<이름>.png (누끼·프레임 띠 자동)
//  { pulse: 'red', times: 3, every: 0.4 }        화면 붉은 번쩍임(사이렌) — 대사와 겹치려면 { async: [{ pulse }] }
//  { aura: { from:['red','blue'], to:['player','gyeongsub','ppaman'], colors:['#ff5c5c','#4fa8ff'], n:36, duration:1.6 } }  반짝이는 입자가 감싸 돈다(버프 획득)
//  { show: id } { hide: id } { spawn: {type,...} } { remove: id }
//  { zoom: s, at: id|[x,y]|'center', offset?, duration? }  2D 월드 줌 (UI 제외)   { battle:{enemies:[id..], bgm?, flag?} } 턴제 전투(끝날 때까지 대기, game.lastBattle.win)
//  { scene3d: 'drawer', flag? }  src/scenes/<name>.js 의 run(game,node) → {found} 을 기다림
//  { tiles:'키' } 맵 tileSwaps 적용(다리 내려옴 등)
//  { join:'ppaman' } { leave:'id' } { regroup:true } 파티(동료)
//  { bubble:'player'|id, dots?:3, gap?:0.4, hold?:0.6 } 머리 위 '...' 말풍선(대화창 없이)
//  { hop:..., spin?:2, keep?:true } 소품도 날린다(빙글 회전, 끼임 보정 생략)   { tremble:id|[ids], duration?, amp? } 부들부들(기다리지 않음)   { fling:id, vx, vup, spin?, gravity?, duration?, sfx? } 속도·중력으로 튀어나가 사라짐(동상 펑)   { emote:id, kind:'!'|'sweat', duration?, hold? } 머리 위 느낌표/식은땀   { hop:id, by:[dx,dy], height?, duration? } 캐릭터 포물선 점프(jump.mp3)   { raft:id, go:true | jump:true | until:'stop' } 뗏목 출발/점프/멈출 때까지 대기   { prompt:'C를 눌러보자' } C 로만 닫히는 안내 창   { shakeOff:id, duration } 물 털기(타다다닥+파란 점)
//  { chat:'open'|mode|'close' } 방송 채팅창 / { dialog:{…}|'press'|null } 오류창 / { vortex:{at,size,grow}|null } 소용돌이
//  { map: 'room', spawn: 'bed' }              즉시 맵 교체 (앞뒤로 fade 를 붙일 것)
//  { caption: '평화롭던 우이동', duration?: 3 }   화면 위쪽에 지역 이름이 떠올랐다 사라짐 (기다리지 않음)
//  { pose: id, to: 'lying'|'stand' }           누움(옆으로 눕힌 스프라이트)/일어남
//  { motion: id, name: 'laugh', sfx?: 'laugh_junhee' } 캐릭터별 등록 동작을 한 번 재생 후 복귀
//  { curtain: 'black'|'white'|null }            맵을 완전히 가리는 막 (타이밍과 무관하게 새는 것 방지)
//  { parallel: [ ...노드 ] }                  동시에 실행, 전부 끝날 때까지 대기
//  { async: 노드 | [노드...] }                 기다리지 않고 다음으로 (배열이면 배경에서 순차 실행)
//  주의: { action } { set } { if/goto } { label } { end } 는 ScriptRunner(dialogue.js)가 처리하는 노드라 parallel/async 배열 **안에서는 무시된다**(waiter 없음).
//        배열 안에서 무언가를 만들어야 하면 밖에서 hidden 으로 spawn 해 두고 배열 안은 show/hop/sfx 만 (2026-09-15 마리오 낙하)
// ─────────────────────────────────────────────────────────────
import { TILE } from '../world/tiles.js';
import { freeSpot, SCREEN_W, SCREEN_H } from '../world/world.js';
import { characterMotionWaiter } from '../world/character-motion.js';
import { MusicCamera } from './music-camera.js';
import { darkSmokeWaiter } from './dark-smoke.js';
import { doorTransitWaiter } from '../world/door-transit.js';
import { youngcleCageDropWaiter } from '../scenes/youngcle-lounge-effects.js';
import { editorUnionWaiter } from '../scenes/editor-union-effects.js';

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
  if (node.rel) {                                        // { move, rel:'소품id', at:'bottom'|'top'|'left'|'right', by:[dx,dy] } — C 를 어디서 눌렀든 소품 기준 같은 자리
    const t = findEntity(game, node.rel); if (!t) return done;
    const at = node.at || 'bottom', [bx, by] = node.by || [0, 0];
    if (at === 'bottom') { tx = t.x + t.w / 2 - e.w / 2; ty = t.y + t.h - e.h; }
    else if (at === 'top') { tx = t.x + t.w / 2 - e.w / 2; ty = t.y - e.h; }
    else if (at === 'left') { tx = t.x - e.w; ty = t.y + t.h / 2 - e.h / 2; }
    else { tx = t.x + t.w; ty = t.y + t.h / 2 - e.h / 2; }
    tx = Math.round(tx + bx); ty = Math.round(ty + by);
  }
  else if (node.to) { tx = node.to[0] * TILE + TILE * 0.125; ty = node.to[1] * TILE + TILE * 0.5; }
  else if (node.px) { [tx, ty] = typeof node.px === 'function' ? node.px(game) : node.px; }   // px:(game)=>[x,y] — 맵 meta 처럼 부팅 뒤에야 있는 값은 함수로(모듈 로드 때 MAPS.<json맵> 은 아직 없다, 2026-09-11)
  else if (node.by) { tx = e.x + node.by[0] * TILE / 16; ty = e.y + node.by[1] * TILE / 16; }   // by 는 16px 단위
  else return done;
  [tx, ty] = freeSpot(game, e, tx, ty);
  const speed = (node.speed ?? (node.dash ? 190 : node.run ? 110 : 60)) * TILE / 16;   // dash: 질주(380px/s)
  const fast = node.run || node.dash;
  const passenger = node.carry ? findEntity(game, node.carry.id) : null;
  const syncPassenger = () => {
    if (!passenger) return;
    const [dx, dy] = node.carry.offset;
    passenger.x = e.x + dx; passenger.y = e.y + dy;
    passenger.moving = false; passenger.frame = 0;
    passenger.facing = node.carry.facing || e.facing;
  };
  syncPassenger();
  return {
    update(dt) {
      const dx = tx - e.x, dy = ty - e.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 0.5) {
        e.x = tx; e.y = ty; e.moving = false; e.animate?.(dt);
        syncPassenger();
        if (e === game.player) e.trail = [];   // 동료가 옛 발자국으로 되돌아가지 않게
        return true;
      }
      const step = Math.min(dist, speed * dt);
      e.x += (dx / dist) * step; e.y += (dy / dist) * step;
      e.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
      e.moving = true; e.animate?.(dt, fast ? 14 : 8); e.driven = true;   // driven: 이 틱은 컷신이 걷기 프레임을 진행시켰다 — NPC.update 의 대화 중 정지 처리가 프레임을 0 으로 덮지 않게 (PR #13 지침, 2026-09-11)
      syncPassenger();
      if (node.track) { game.camera.target = e; game.camera.locked = false; game.camera.snap(); }
      if (node.shake) game.shake = { time: 0.08, amp: node.shake };
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
  if (node.editorUnion) return editorUnionWaiter(game, node.editorUnion);
  if (node.youngcleCageDrop) return youngcleCageDropWaiter(game, node.youngcleCageDrop);
  if (node.doorTransit) {
    const entry = node.doorTransit;
    return doorTransitWaiter(game, findEntity(game, entry.actor), findEntity(game, entry.door), entry);
  }
  if ('darkSmoke' in node) return darkSmokeWaiter(game, node.darkSmoke);
  if (node.nod) {
    const entity = findEntity(game, node.nod); if (!entity) return done;
    const duration = node.duration ?? 1.4, count = node.times ?? 3;
    const oldSpin = entity.spin || 0, oldY = entity.flyY || 0;
    let time = 0;
    return { update(dt) {
      time = Math.min(duration, time + dt);
      const bend = Math.max(0, Math.sin(time / duration * count * Math.PI * 2));
      entity.spin = oldSpin + bend * 0.055;
      entity.flyY = oldY + Math.round(bend * (node.depth ?? 3));
      if (time < duration) return false;
      entity.spin = oldSpin; entity.flyY = oldY;
      return true;
    } };
  }
  if (node.musicCamera) return new MusicCamera(game, node.musicCamera);
  if (node.wait !== undefined) return timer(node.wait);
  if (node.emerge) {
    const e = findEntity(game, node.emerge); if (!e) return done;
    const depth = node.depth ?? 360, duration = node.duration ?? 2;
    e.visible = true; e.emerge = { depth, progress: 0 }; let t = 0;
    return { update(dt) { t += dt; const progress = Math.min(1, t / duration); e.emerge.progress = node.ease === 'out' ? 1 - (1 - progress) ** 3 : progress; if (t >= duration) { e.emerge = null; return true; } return false; } };
  }
  if (node.puff) {
    const e = findEntity(game, node.puff); if (!e) return done;
    const [dx, dy] = node.offset || [0, -20], duration = node.duration ?? 0.7;
    const x = (e.drawX ?? e.x) + (e.iw ?? e.w) / 2 + dx, y = (e.drawY ?? e.y) + dy;
    const parts = [-4, 0, 4].map((offset) => ({ x: x + offset, y, a: 1, color: '#dbd1e6', ang: 1, size: offset ? 5 : 8 }));
    game.sparks = parts; let t = 0;
    return { update(dt) { t += dt; for (const p of parts) { p.y -= dt * 24; p.a = Math.max(0, 1 - t / duration); } if (t >= duration) { if (game.sparks === parts) game.sparks = null; return true; } return false; } };
  }
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
  if (node.emote) {                                    // { emote:id, kind:'!'|'sweat', duration?:1.0, hold?:0.5, sfx? } 머리 위 이모트. hold 만큼 기다리고 다음으로(이모트는 duration 동안 남는다)
    const e = findEntity(game, node.emote); if (!e) return done;
    e.emote = { kind: node.kind || '!', text: node.labelText, color: node.color, size: node.size, anchor: node.anchor, offsetY: node.offsetY, t: 0, life: node.duration ?? 1.0 };
    if (node.sfx) game.sound.sfx(node.sfx);
    let t = 0; return { update: (dt) => { t += dt; return t >= (node.hold ?? 0.5); } };
  }   // (sfx 키를 같이 쓰므로 { sfx } 분기보다 앞에)
  if (node.pulse) {                                    // { pulse:'red', times?:3, every?:0.4 } 화면이 붉게 번쩍번쩍(사이렌 — 청록숲9 레드). 낙석 피격의 hurt 오버레이를 재사용, 대사 중에도 돈다({async} 로)
    const times = node.times ?? 3, every = node.every ?? 0.4; let t = 0, n = 0;
    return { update: (dt) => { t += dt; if (n < times && t >= n * every) { game.hurt = 0.32; n++; } return t >= times * every; } };
  }
  if (node.aura) {                                     // { aura:{ from:[id…], to:[id…], colors:['#ff5c5c','#4fa8ff'], n:36, duration:1.6 } } 반짝이는 입자가 from 에서 날아와 to 를 감싸 돈다(레드·블루 버프). game.sparks 를 main.js 가 그린다
    const a = node.aura; const froms = (a.from || []).map((id) => findEntity(game, id)).filter(Boolean), tos = (a.to || []).map((id) => findEntity(game, id)).filter(Boolean);
    if (!froms.length || !tos.length) return done;
    const dur = a.duration ?? 1.6, parts = [];
    for (let i = 0; i < (a.n ?? 36); i++) { const f = froms[i % froms.length]; parts.push({ x0: f.x + f.w / 2 + (Math.random() - 0.5) * 30, y0: f.y + f.h - 20 - Math.random() * 60, tx: tos[i % tos.length], ang: Math.random() * Math.PI * 2, r: 18 + Math.random() * 10, color: (a.colors || ['#fff'])[i % (a.colors || ['#fff']).length], delay: Math.random() * 0.4, t: 0, x: 0, y: 0, a: 0 }); }
    game.sparks = parts; let t = 0;
    return { update: (dt) => { t += dt;
      for (const p of parts) { p.t += dt; const k = Math.min(1, Math.max(0, (p.t - p.delay) / (dur * 0.55))); const cx = a.targetImageTop ? (p.tx.drawX ?? p.tx.x) + (p.tx.iw ?? p.tx.w) / 2 + (a.offset?.[0] || 0) : p.tx.x + p.tx.w / 2, cy = a.targetImageTop ? (p.tx.drawY ?? p.tx.y) + (a.offset?.[1] || 0) : p.tx.y + p.tx.h - 26; p.ang += dt * 5;
        p.x = p.x0 + (cx - p.x0) * k + Math.cos(p.ang) * p.r * k; p.y = p.y0 + (cy - p.y0) * k + Math.sin(p.ang) * p.r * 0.5 * k; p.a = p.t < p.delay ? 0 : t < dur ? 1 : Math.max(0, 1 - (t - dur) / 0.5); }
      if (t >= dur + 0.5) { game.sparks = null; return true; } return false; } };
  }
  if (node.mash) {                                     // { mash:{ target, push:[…], tremble } } — 옵젝영역1 대포 밀기 (사용자 2026-09-11 "C 를 연타하라 UI, 게이지에 불씨가 타다다닥, 100회면 달성")
    const cfg = node.mash, target = cfg.target ?? 100;
    const pushers = (cfg.push || []).map((id) => findEntity(game, id)).filter(Boolean), trem = cfg.tremble ? findEntity(game, cfg.tremble) : null;
    game.mash = { count: 0, target, pressT: 0, sparks: [], done: false, doneT: 0, t: 0 };
    return { update(dt, input) {
      const m = game.mash; if (!m) return true; m.t += dt; m.pressT = Math.max(0, m.pressT - dt);
      for (const e of pushers) { e.moving = true; e.animate?.(dt, 10); e.driven = true; }
      if (trem) trem.flyX = m.done ? 0 : (Math.random() - 0.5) * (1 + 4 * m.count / target);
      if (!m.done && input.just('confirm')) {
        m.count++; m.pressT = 0.09; game.sound.sfx('ember', { volume: 0.6, rate: 0.85 + Math.random() * 0.4 });
        for (let i = 0; i < 3; i++) m.sparks.push({ k: m.count / target, x: 0, y: 0, vx: (Math.random() - 0.5) * 24, vy: -40 - Math.random() * 50, t: 0, life: 0.35 + Math.random() * 0.3 });
        if (m.count >= target) { m.done = true; m.doneT = 0; }
      }
      for (const s of m.sparks) { s.t += dt; s.x += s.vx * dt; s.y += s.vy * dt; }
      m.sparks = m.sparks.filter((s) => s.t < s.life);
      if (m.done) { m.doneT += dt; if (m.doneT >= 0.7) { game.mash = null; for (const e of pushers) { e.moving = false; e.frame = 0; } if (trem) trem.flyX = 0; return true; } }
      return false; } };
  }
  if ('fire' in node) {                                // { fire:{ at, dx, dy, spread, rate, grow } } / { fire:null }
    if (!node.fire) { game.flameEmitters = []; return done; }
    const f = node.fire, e = findEntity(game, f.at); if (!e) return done;
    game.flameEmitters.push({ e, dx: f.dx ?? 0, dy: f.dy ?? -20, spread: f.spread ?? 14, rate: f.rate ?? 30, grow: f.grow ?? 1.5, t: 0 });
    return done;
  }
  if (node.rocket) {                                   // { rocket:{ ids, speed, camera, amp } }
    const r = node.rocket, es = r.ids.map((id) => findEntity(game, id)).filter(Boolean); if (!es.length) return done;
    const lead = findEntity(game, r.camera) || es[0], speed = r.speed ?? 1100;
    game.flameEmitters = game.flameEmitters.filter((em) => !es.includes(em.e));
    for (const e of es) game.flameEmitters.push({ e, dx: -((e.iw ?? e.w) / 2) - 8, dy: -((e.ih ?? e.h) * 0.45), spread: e.iw ? 26 : 10, rate: e.iw ? 170 : 60, grow: 0, t: 0, trail: true });
    return { update(dt) {
      for (const e of es) { const step = speed * dt; e.x += step; if (e.def?.ix !== undefined) e.def.ix += step; e.moving = false; }
      game.camera.target = lead; game.camera.locked = false; game.camera.follow(1);
      game.shake = { time: 0.1, amp: r.amp ?? 5 };
      if (lead.x > game.map.pxW + 140) { for (const e of es) e.dead = true; game.flameEmitters = game.flameEmitters.filter((em) => !es.includes(em.e)); game.shake = null; return true; }
      return false; } };
  }
  if (node.boom) {                                     // { boom:{ sheet, at, cols, rows, count, fps, scale, offset, sfx, hold } } — 한 번 재생하는 이펙트 애니(캐릭터 위)
    const b = node.boom;
    let pos = Array.isArray(b.at) ? b.at : null;
    if (!pos && b.at) { const e = findEntity(game, b.at); pos = e ? [(e.drawX ?? e.x) + (e.iw ?? e.w) / 2, (e.drawY ?? e.y) + (e.ih ?? e.h) / 2] : null; }
    if (!pos) pos = [game.camera.x + SCREEN_W / 2, game.camera.y + SCREEN_H / 2];
    if (b.offset) pos = [pos[0] + b.offset[0], pos[1] + b.offset[1]];
    if (b.sfx) game.sound.sfx(b.sfx, b.volume !== undefined ? { volume: b.volume } : undefined);
    const fps = b.fps ?? 14, count = b.count ?? (b.cols * (b.rows ?? 1)), dur = (b.duration ?? count / fps) + (b.hold ?? 0);
    game.playBoom({ src: b.sheet, x: pos[0], y: pos[1], cols: b.cols, rows: b.rows ?? 1, count, fps, scale: b.scale ?? 1,
      ...(b.duration !== undefined ? { duration: b.duration, endScale: b.endScale ?? b.scale ?? 1, grow: b.grow ?? b.duration } : {}) });
    let t = 0;
    return { update: (dt) => (t += dt) >= dur };
  }
  if (node.camera !== undefined) return cameraPan(game, node);
  if ('bgm' in node) { if (node.bgm) game.sound.playBgm(node.bgm, { volume: node.volume ?? 0.6, fadeIn: node.fadeIn ?? 0.5 }); else game.sound.stopBgm(node.fadeOut ?? node.fade ?? 0.8); return done; }
  if (node.bgmPause !== undefined) { game.sound.pauseBgm(node.bgmPause || 0.3); return done; }
  if (node.bgmResume !== undefined) { game.sound.resumeBgm(node.bgmResume || 0.3); return done; }
  if (node.slide) {                                    // { slide:id, by:[dx,dy], duration?:0.6, sfx? } — 소품(대포 등)을 히트박스·그림 같이 미끄러뜨린다
    const e = findEntity(game, node.slide); if (!e) return done;
    const [dx, dy] = node.by || [0, 0], dur = node.duration ?? 0.6, sx = e.x, sy = e.y, six = e.def.ix ?? e.x, siy = e.def.iy ?? e.y; let t = 0;
    if (node.sfx) game.sound.sfx(node.sfx);
    return { update(dt) { t = Math.min(dur, t + dt); const k = dur > 0 ? t / dur : 1; e.x = Math.round(sx + dx * k); e.y = Math.round(sy + dy * k); if (e.def.ix !== undefined) { e.def.ix = Math.round(six + dx * k); e.def.iy = Math.round(siy + dy * k); } return t >= dur; } };
  }
  if (node.scale) {                                    // { scale:id, to:0.15, duration?:0.5 } — 캐릭터 그림 배율을 서서히 바꾼다(발 기준 유지). def.visualScale 을 직접 움직인다
    const e = findEntity(game, node.scale); if (!e) return done;
    const dur = node.duration ?? 0.5, from = e.def.visualScale ?? 1, to = node.to ?? 1; let t = 0;
    if (dur <= 0) { e.def.visualScale = to; return done; }
    return { update(dt) { t = Math.min(dur, t + dt); const k = t / dur; e.def.visualScale = from + (to - from) * k; return t >= dur; } };
  }
  if (node.fade) {
    let finished = false;
    const toColor = node.fade === 'white' ? 'white' : node.fade === 'out' ? 'black' : undefined;
    game.fadeTo(node.fade === 'in' ? 0 : 1, node.duration ?? 0.5, () => { finished = true; }, toColor);
    if ((node.duration ?? 0.5) === 0) return done;
    return { update: () => finished };
  }
  if (node.shake !== undefined) { game.shake = { time: node.shake, amp: node.amp ?? 3 }; return timer(node.shake); }
  if (node.sfx && Object.keys(node).every((k) => k === 'sfx' || k === 'volume')) { game.sound.sfx(node.sfx, node.volume !== undefined ? { volume: node.volume } : undefined); return done; }   // 효과음만 있는 노드. hop/fling 처럼 sfx 를 곁들이는 노드는 여기서 삼키지 않는다(2026-09-11: { hop, sfx:'thud' } 가 소리만 나고 안 뛰던 버그)
  if (node.sound) { game.sound[node.sound]?.(); return done; }
  if (node.show) { const e = findEntity(game, node.show); if (e) { e.visible = true; if (e._solidBeforeHide !== undefined) { e.solid = e._solidBeforeHide; delete e._solidBeforeHide; } } return done; }
  if (node.hide) { const e = findEntity(game, node.hide); if (e) { e.visible = false; if (e._solidBeforeHide === undefined) e._solidBeforeHide = e.solid; e.solid = false; } return done; }   // 안 보이는 것은 막지도 않는다 (2026-09-10 미로 출구에서 숨긴 NPC 가 길을 막았음)
  if (node.remove) { const e = findEntity(game, node.remove); if (e) e.dead = true; return done; }
  if (node.map) { game.changeMap(node.map, node.spawn, true); return done; }
  if (node.spawn) { game.spawn(node.spawn); return done; }
  if ('curtain' in node) { game.curtain = node.curtain; return done; }
  if (node.caption) { game.caption = { text: node.caption, time: 0, duration: node.duration ?? 3.2 }; return done; }
  if (node.pose) { const e = findEntity(game, node.pose); if (e) { e.pose = node.to === 'lying' ? 'lying' : null; e.moving = false; e.frame = 0; } return done; }
  if (node.seaChase) {
    const scene = game.startSeaChase();
    return { update: () => scene.completed };
  }
  if (node.battle) {                                   // { battle:{ enemies:['cs','cs'], bgm:'rude_buster', flag?:'..._won' } } 전투가 끝날 때까지 기다림 (game.lastBattle.win)
    game.battleFlag = node.battle.flag || null; game.startBattle(node.battle);
    return { update: () => !game.battle };
  }
  if (node.zoom !== undefined) {                       // { zoom:2.8, at:'tv'|[x,y]|'center', offset:[dx,dy], duration:0.8 } / { zoom:1 }
    let focus = null;
    if (Array.isArray(node.at)) focus = node.at;
    else if (node.at === 'center') focus = [game.camera.x + SCREEN_W / 2, game.camera.y + SCREEN_H / 2];   // 화면 가운데로 클로즈업(전투 진입)
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
      else if (node.vortex.at === 'center') { x = game.camera.x + SCREEN_W / 2; y = game.camera.y + SCREEN_H / 2; }   // 화면 가운데(전투 진입: 검게 빨려 들어감)
      else { const e = findEntity(game, node.vortex.at); if (e) { x = (e.drawX ?? e.x) + (e.iw ?? e.w) / 2; y = (e.drawY ?? e.y) + (e.ih ?? e.h) * 0.35; } }
      game.vortex.start({ x, y, size: node.vortex.size, grow: node.vortex.grow });
    }
    return done;
  }
  if (node.tiles) { game.applyTiles(node.tiles); return done; }
  if (node.bubble) {                                   // { bubble:'player'|id, dots?, gap?, hold? } — 머리 위 '...' 말풍선, 다 찍히고 사라질 때까지 기다림
    const e = Array.isArray(node.bubble) ? node.bubble.map(id => findEntity(game, id)).filter(Boolean) : findEntity(game, node.bubble);
    if (!e || (Array.isArray(e) && !e.length)) return done;
    game.textbox.close(); game.bubble.start(e, node);
    return { update: () => game.bubble.done };
  }
  if (node.join) { game.joinParty(node.join); return done; }          // { join:'ppaman' } 동료 가입(맵의 같은 id NPC 는 사라짐)
  if (node.leave) { game.leaveParty(node.leave); return done; }
  if (node.raft) {                                     // { raft:id, go:true } 출발 / { raft:id, jump:true } 점프(컷신용 강제) / { raft:id, until:'stop'|'land' } 멈출/착지할 때까지 / { raft:id, swim:id } 동료를 물에 / { raft:id, hold:bool } 정지 / { raft:id, holdAt:'apex'|x } 정점·x 에서 정지 / { raft:id, awaitJump:true } C 기다려 점프(공중이면 2단)
    const r = findEntity(game, node.raft); if (!r) return done;
    if (node.go) { r.depart(); return done; }
    if (node.jump) { r.jump(true); return done; }
    if (node.swim) { r.addSwimmer(node.swim); return done; }                                   // 동료 한 명을 지금 물에 (뗏목 옆/아래에서 헤엄)
    if ('hold' in node) { r.hold = !!node.hold; if (!r.hold) r.moving = true; return done; }   // 제자리 정지/해제 (공중 포함)
    if (node.holdAt !== undefined) return { update: () => {                                    // 'apex' = 점프 정점에서 공중 정지 / 숫자 = 그 x 에 닿으면 정지
      if (node.holdAt === 'apex') { if (!r.jumping) return true; if (r.jumpT >= r.jumpDur * 0.5) { r.hold = true; return true; } return false; }
      if (r.x >= node.holdAt) { r.setPos([node.holdAt, r.y]); r._carry(); r.hold = true; return true; } return false; } };
    if (node.awaitJump) return { update: (dt, input) => { if (input.just('confirm')) { r.hold = false; r.moving = true; r.jump(true); return true; } return false; } };   // C 를 기다렸다 점프(공중이면 2단)
    if (node.until === 'stop') return { update: () => !r.moving };
    if (node.until === 'land') return { update: () => !r.jumping };
    return done;
  }
  if (node.prompt) {                                   // { prompt:'C를 눌러보자' } 작은 안내 창 — C 를 누를 때까지(텍스트 넘김 아님)
    game.textbox.close(); game.prompt = { text: node.prompt, t: 0 };
    return { update: (dt, input) => { if (!game.prompt) return true; game.prompt.t += dt; if (input.just('confirm')) { game.prompt = null; return true; } return false; } };
  }
  if (node.tremble) {                                  // { tremble:id|[ids], duration:1.2, amp?:1 } 부들부들 떨기(흔들림만, 물방울 없음) — 기다리지 않음
    const ids = Array.isArray(node.tremble) ? node.tremble : [node.tremble];
    for (const id of ids) { const e = findEntity(game, id); if (e) e.jitter = { t: node.duration ?? 1.2, amp: node.amp ?? 1 }; }
    return done;
  }
  if (node.shakeOff) {                                 // { shakeOff:id, duration:0.9 } 강아지 물 털듯 타다다닥 흔들림 + 파란 물방울 (새 스프라이트 없음)
    const e = findEntity(game, node.shakeOff); if (!e) return done;
    e.jitter = { t: node.duration ?? 0.9, amp: node.amp ?? 2 }; let acc = 0;
    return { update: (dt) => { acc += dt; while (acc > 0.03) { acc -= 0.03; game.emitDroplets(e, 2); } return !e.jitter; } };
  }
  if (node.hop) {                                      // { hop:id, by:[dx,dy], height?:24, duration?:0.5, sfx?:'jump'|false } 캐릭터가 포물선으로 뛴다(재사용 점프 연출)
    const e = findEntity(game, node.hop); if (!e) return done;
    const [dx, dy] = node.by || [0, 0], h = node.height ?? 24, dur = node.duration ?? 0.5, x0 = e.x, y0 = e.y; let t = 0;
    if (node.sfx !== false) game.sound.sfx(node.sfx || 'jump', { volume: 0.7 });
    return { update: (dt) => { t += dt; const k = Math.min(1, t / dur); e.x = Math.round(x0 + dx * k); e.y = Math.round(y0 + dy * k); e.hopY = h * Math.sin(Math.PI * k); if (node.spin) e.spin = node.spin * Math.PI * 2 * k; e.moving = false; e.frame = 0; if (e.def?.w !== undefined) { e.flyX = Math.round(dx * k); e.flyY = Math.round(dy * k); } if (k >= 1) { e.hopY = 0; if (!node.keep) { e.flyX = e.flyY = 0; [e.x, e.y] = freeSpot(game, e, e.x, e.y); } return true; } return false; } };   // spin: 바퀴 수(소품 회전), keep. flyX/Y: 히트박스 지정 소품은 그림이 def.ix 를 따르므로 따로 밀어 준다: 도착 보정 없음(날아가 사라질 때)
  }
  if (node.fling) {                                    // { fling:id, vx?, vup?, gravity?:1700, spin?:12(rad/s), duration?:1.3, sfx?, keep? } 펑! 속도로 튀어나가 중력에 끌리며 빙글빙글 날아간 뒤 사라진다(동상 벽)
    const e = findEntity(game, node.fling); if (!e) return done;
    const g = node.gravity ?? 1700, dur = node.duration ?? 1.3, sp = node.spin ?? 12, vx = node.vx || 0; let vup = node.vup ?? 800, t = 0, air = 0, fx = e.flyX || 0;
    if (node.sfx) game.sound.sfx(node.sfx, { volume: 0.8 });
    return { update: (dt) => { t += dt; fx += vx * dt; air += vup * dt; vup -= g * dt; e.flyX = Math.round(fx); e.hopY = Math.round(air); e.spin = (e.spin || 0) + sp * dt; if (t >= dur) { if (!node.keep) e.dead = true; return true; } return false; } };
  }
  if (node.regroup) { for (const e of game.entities) if (e.def?.type === 'follower') e.snapBehind(); return done; }   // 동료를 주인공 뒤로 재정렬   // { tiles:'bridge_down' } 맵 tileSwaps 적용 + 다시 굽기
  if (node.parallel) return parallel(game, node.parallel);
  if ('async' in node) {
    if (!node.async) { game.background = []; return done; }               // { async:null } 남은 배경 동작 취소
    const w = Array.isArray(node.async) ? sequence(game, node.async) : makeWaiter(game, node.async); if (w) game.background.push(w); return done;
  }
  return null;
}
