// ─────────────────────────────────────────────────────────────
// 3D 씬: 거실 TV장 서랍에서 보라색 컴퓨터 코드 찾기 (three.js r170, assets/lib 에 동봉)
//   run(game, node) → Promise<{ found:boolean }>
//   흐름: 오버레이 크로스페이드 인(2D 줌인 마지막 프레임 위로) → TV 화면(지직) 정면
//         → 서랍이 스르륵 열리며 카메라가 내려가 서랍 안에 고정 → 마우스로 물건을 치우고
//         보라색 코드를 클릭 → "획득했다!" → 페이드 아웃 → resolve. X/Esc 로 취소 가능.
//   모든 모델/텍스처는 코드로 만든다(외부 에셋 0). 팔레트는 tools/art 세트와 맞춤.
// ─────────────────────────────────────────────────────────────
import * as THREE from '../../assets/lib/three.module.js';
import { FONT } from '../ui/font.js';

// ── 팔레트 (tools/art/room_set.py · living_set.py 와 동일 계열) ──
const C = {
  wall: 0xe6d6c4, wallFlower: 0xd9a7a0, wallLeaf: 0xa9bf8f,
  plank: 0xb98c5e, plankLine: 0x7e5a3a,
  wood: 0xa5683f, woodD: 0x7e4d2c, woodL: 0xc2854f, drawerIn: 0x8a5a3a,
  plastic: 0x3a3a44, plasticL: 0x5a5a66, screen: 0x1c2233,
  cord: 0x7b3fe4, cordD: 0x5a2bb0, plug: 0x1a1a1f,
};
const easeInOut = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const easeOutBack = (k) => { const c1 = 1.2, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); };
const lerp = (a, b, k) => a + (b - a) * k;
const rand = (a, b) => a + Math.random() * (b - a);

// ── 프로시저럴 텍스처 ─────────────────────────────────────────
function canvasTex(w, h, paint, { repeat = [1, 1], srgb = true } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  paint(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
const hex = (n) => '#' + n.toString(16).padStart(6, '0');
function texWallpaper() {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = hex(C.wall); g.fillRect(0, 0, w, h);
    for (let gy = 0; gy < 8; gy++) for (let gx = 0; gx < 8; gx++) {
      const ox = gx * 32 + 12 + (gy % 2 ? 16 : 0), oy = gy * 32 + 12;
      g.fillStyle = hex(C.wallFlower);
      g.fillRect(ox, oy - 3, 3, 9); g.fillRect(ox - 3, oy, 9, 3);
      g.fillStyle = '#eec4be'; g.fillRect(ox, oy, 3, 3);
      g.fillStyle = hex(C.wallLeaf); g.fillRect(ox + 5, oy + 5, 5, 3);
    }
    const id = g.getImageData(0, 0, w, h);   // 종이 결 노이즈
    for (let i = 0; i < id.data.length; i += 4) { const n = (Math.random() - 0.5) * 10; id.data[i] += n; id.data[i + 1] += n; id.data[i + 2] += n; }
    g.putImageData(id, 0, 0);
  }, { repeat: [6, 4] });
}
function texWood(base = C.wood, dark = C.woodD, light = C.woodL, planks = 0) {
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = hex(base); g.fillRect(0, 0, w, h);
    for (let i = 0; i < 180; i++) {          // 나뭇결
      const y = Math.random() * h, amp = rand(2, 9), len = rand(120, 512);
      g.strokeStyle = Math.random() < 0.5 ? hex(dark) : hex(light);
      g.globalAlpha = rand(0.08, 0.28); g.lineWidth = rand(0.6, 2.2);
      g.beginPath(); const x0 = Math.random() * w;
      for (let x = 0; x <= len; x += 8) g.lineTo(x0 + x, y + Math.sin((x0 + x) * 0.02 + y) * amp);
      g.stroke();
    }
    g.globalAlpha = 1;
    if (planks) {                             // 마루 널 이음새
      g.strokeStyle = hex(C.plankLine); g.lineWidth = 3;
      for (let i = 0; i <= planks; i++) { const y = (h / planks) * i; g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
      for (let i = 0; i < planks; i++) { const x = ((i * 197) % w); const y = (h / planks) * i; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + h / planks); g.stroke(); }
    }
  }, { repeat: planks ? [3, 3] : [1, 1] });
}
function texPaper(lines = 9, w = 128, h = 256) {
  return canvasTex(w, h, (g) => {
    g.fillStyle = '#f5f1e6'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#6a6a72';
    for (let i = 0; i < lines; i++) { const y = 20 + i * ((h - 40) / lines); g.fillRect(14, y, rand(40, w - 28), 3); }
    g.fillStyle = '#c8433a'; g.fillRect(14, h - 26, 34, 5);
  });
}
function texLabel(col) {
  return canvasTex(128, 192, (g, w, h) => {
    g.fillStyle = col; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,0.85)'; g.fillRect(12, 20, w - 24, 26);
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(18, 60, w - 36, 90);
    g.fillStyle = 'rgba(255,255,255,0.6)'; for (let i = 0; i < 4; i++) g.fillRect(18, 160 + i * 6, rand(30, 80), 2);
  });
}
function texRemote() {
  return canvasTex(64, 256, (g, w, h) => {
    g.fillStyle = '#2c2c33'; g.fillRect(0, 0, w, h);
    const cols = ['#c8433a', '#d9d9df', '#d9d9df', '#5a8ad0', '#d9d9df', '#d9d9df'];
    for (let r = 0; r < 9; r++) for (let c = 0; c < 3; c++) { g.fillStyle = r === 0 && c === 0 ? cols[0] : cols[(r + c) % 6 || 1]; g.beginPath(); g.arc(14 + c * 18, 26 + r * 22, 6, 0, Math.PI * 2); g.fill(); }
  });
}

// ── 사운드(WebAudio, 파일 없음): 서랍 스르륵 / 툭 ─────────────────
function slideSound(sound, dur = 0.7) {
  const ctx = sound?.ctx; if (!ctx || sound.muted) return;
  const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
  const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const src = ctx.createBufferSource(); src.buffer = buf;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700; lp.Q.value = 0.7;
  const g = ctx.createGain(); const t = ctx.currentTime;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.18, t + 0.08); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(lp); lp.connect(g); g.connect(sound.master); src.start(t);
}
function thumpSound(sound) {
  const ctx = sound?.ctx; if (!ctx || sound.muted) return;
  const o = ctx.createOscillator(); o.type = 'sine'; const t = ctx.currentTime;
  o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(50, t + 0.12);
  const g = ctx.createGain(); g.gain.setValueAtTime(0.25, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
  o.connect(g); g.connect(sound.master); o.start(t); o.stop(t + 0.18);
}

// ── 오버레이 DOM ───────────────────────────────────────────────
function makeOverlay(game) {
  const root = document.createElement('div');
  root.id = 'scene3d';
  Object.assign(root.style, { position: 'fixed', left: '0', top: '0', width: '0', height: '0', opacity: '0', transition: 'opacity 0.5s ease', zIndex: '10', overflow: 'hidden', background: '#000' });
  const canvas = document.createElement('canvas');
  Object.assign(canvas.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', display: 'block', cursor: 'default' });
  const vignette = document.createElement('div');
  Object.assign(vignette.style, { position: 'absolute', inset: '0', pointerEvents: 'none', background: 'radial-gradient(ellipse at 50% 55%, rgba(0,0,0,0) 45%, rgba(0,0,0,0.62) 100%)' });
  const flash = document.createElement('div');
  Object.assign(flash.style, { position: 'absolute', inset: '0', pointerEvents: 'none', background: '#fff', opacity: '0', transition: 'opacity 0.35s ease' });
  const hint = document.createElement('div');
  Object.assign(hint.style, { position: 'absolute', left: '0', right: '0', bottom: '4%', textAlign: 'center', font: FONT, color: '#fff', textShadow: '0 2px 0 #000, 0 0 6px #000', opacity: '0', transition: 'opacity 0.6s ease', pointerEvents: 'none', letterSpacing: '1px' });
  const big = document.createElement('div');
  Object.assign(big.style, { position: 'absolute', left: '0', right: '0', top: '18%', textAlign: 'center', font: FONT, color: '#ffe066', textShadow: '0 3px 0 #000, 0 0 12px #000', transform: 'scale(0.4)', opacity: '0', transition: 'transform 0.35s cubic-bezier(.2,1.6,.4,1), opacity 0.2s ease', pointerEvents: 'none' });
  root.append(canvas, vignette, flash, big, hint);
  document.body.appendChild(root);
  const fit = () => {
    const r = game.canvas.getBoundingClientRect();
    Object.assign(root.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
    const fs = Math.max(14, Math.round(r.width / 30));
    hint.style.fontSize = fs + 'px'; big.style.fontSize = Math.round(fs * 2.4) + 'px';
    return r;
  };
  return { root, canvas, vignette, flash, hint, big, fit };
}

// ── 씬 구성 ───────────────────────────────────────────────────
function buildRoom(scene, mats) {
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(6, 3.2), new THREE.MeshStandardMaterial({ map: mats.wallpaper, roughness: 0.95 }));
  wall.position.set(0, 1.6, -0.62); wall.receiveShadow = true; scene.add(wall);
  const base = new THREE.Mesh(new THREE.BoxGeometry(6, 0.12, 0.03), new THREE.MeshStandardMaterial({ color: C.woodD, roughness: 0.8 }));
  base.position.set(0, 0.06, -0.605); scene.add(base);                                   // 걸레받이
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(6, 5), new THREE.MeshStandardMaterial({ map: mats.floor, roughness: 0.85 }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, 0.8); floor.receiveShadow = true; scene.add(floor);
}

/** TV장: 상판·몸체·두 서랍(왼쪽이 열림). 반환 {group, drawer, drawerInner:{x0,x1,z0,z1,y}} */
function buildStand(scene, mats) {
  const g = new THREE.Group();
  const W = 1.2, D = 0.46, H = 0.5;
  const woodMat = new THREE.MeshStandardMaterial({ map: mats.wood, roughness: 0.6, metalness: 0.02 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(W, H - 0.04, D), woodMat);
  body.position.set(0, (H - 0.04) / 2, 0); body.castShadow = true; body.receiveShadow = true; g.add(body);
  const top = new THREE.Mesh(new THREE.BoxGeometry(W + 0.04, 0.04, D + 0.04), new THREE.MeshStandardMaterial({ map: mats.woodL, roughness: 0.45 }));
  top.position.set(0, H - 0.02, 0); top.castShadow = true; top.receiveShadow = true; g.add(top);
  // 서랍 구멍(어두운 안쪽)을 몸체 앞면에 표현: 왼쪽 구멍은 실제로 파고(서랍이 나오므로), 오른쪽은 닫힌 서랍 앞판
  const holeW = 0.5, holeH = 0.13, holeY = H - 0.12;
  const cavity = new THREE.Mesh(new THREE.BoxGeometry(holeW, holeH, D - 0.03), new THREE.MeshStandardMaterial({ color: 0x2a1a12, roughness: 1, side: THREE.BackSide }));
  cavity.position.set(-0.3, holeY, 0.005); g.add(cavity);
  // 몸체를 실제로 파는 대신: 서랍 자리에 몸체보다 살짝 앞에 검은 판 → 서랍이 나오면 뒤에 어둠이 보임
  const dark = new THREE.Mesh(new THREE.PlaneGeometry(holeW - 0.01, holeH - 0.01), new THREE.MeshStandardMaterial({ color: 0x120c08, roughness: 1 }));
  dark.position.set(-0.3, holeY, D / 2 + 0.001); g.add(dark);
  // 닫힌 오른쪽 서랍 앞판 + 손잡이
  const frontR = new THREE.Mesh(new THREE.BoxGeometry(holeW, holeH, 0.02), woodMat);
  frontR.position.set(0.3, holeY, D / 2 + 0.01); frontR.castShadow = true; g.add(frontR);
  const knobMat = new THREE.MeshStandardMaterial({ color: 0xd8b56a, metalness: 0.8, roughness: 0.35 });
  const knobR = new THREE.Mesh(new THREE.SphereGeometry(0.012, 16, 12), knobMat); knobR.position.set(0.3, holeY, D / 2 + 0.03); g.add(knobR);
  // 열리는 왼쪽 서랍(상자: 바닥+옆판+앞판)
  const drawer = new THREE.Group();
  const iw = holeW - 0.03, id = D - 0.06, ih = holeH - 0.02;
  const innerMat = new THREE.MeshStandardMaterial({ map: mats.woodIn, roughness: 0.9 });
  const bottom = new THREE.Mesh(new THREE.BoxGeometry(iw, 0.012, id), innerMat); bottom.position.set(0, -ih / 2 + 0.006, 0); bottom.receiveShadow = true; drawer.add(bottom);
  for (const sx of [-1, 1]) { const side = new THREE.Mesh(new THREE.BoxGeometry(0.012, ih, id), innerMat); side.position.set(sx * (iw / 2 - 0.006), 0, 0); side.castShadow = true; side.receiveShadow = true; drawer.add(side); }
  const back = new THREE.Mesh(new THREE.BoxGeometry(iw, ih, 0.012), innerMat); back.position.set(0, 0, -id / 2 + 0.006); back.receiveShadow = true; drawer.add(back);
  const front = new THREE.Mesh(new THREE.BoxGeometry(holeW, holeH, 0.02), woodMat); front.position.set(0, 0, id / 2 + 0.01); front.castShadow = true; front.receiveShadow = true; drawer.add(front);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.012, 16, 12), knobMat); knob.position.set(0, 0, id / 2 + 0.03); drawer.add(knob);
  drawer.position.set(-0.3, holeY, 0);                       // 닫힌 위치. 열리면 z += 0.34
  g.add(drawer);
  scene.add(g);
  const floorY = holeY - ih / 2 + 0.012;
  return { group: g, drawer, H, D, holeY, inner: { w: iw - 0.03, d: id - 0.03, floorY, ih } };
}

/** 브라운관 TV. 반환 {group, screenMat, screenLight} */
function buildTV(scene, standH, mats) {
  const g = new THREE.Group();
  const w = 0.64, h = 0.5, d = 0.46;
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color: C.plastic, roughness: 0.55, metalness: 0.1 }));
  body.castShadow = true; body.receiveShadow = true; g.add(body);
  const bezel = new THREE.Mesh(new THREE.BoxGeometry(w - 0.06, h - 0.08, 0.02), new THREE.MeshStandardMaterial({ color: C.plasticL, roughness: 0.5 }));
  bezel.position.set(0, 0.01, d / 2 + 0.005); g.add(bezel);
  const screenMat = new THREE.MeshStandardMaterial({ color: C.screen, roughness: 0.15, metalness: 0.2, emissive: 0xffffff, emissiveMap: mats.static, emissiveIntensity: 0.55 });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.12, h - 0.16, 8, 8), screenMat);
  // 살짝 볼록한 브라운관 유리
  const pos = screen.geometry.attributes.position; for (let i = 0; i < pos.count; i++) { const x = pos.getX(i) / ((w - 0.12) / 2), y = pos.getY(i) / ((h - 0.16) / 2); pos.setZ(i, 0.012 * (1 - (x * x + y * y) * 0.5)); } screen.geometry.computeVertexNormals();
  screen.position.set(0, 0.01, d / 2 + 0.016); g.add(screen);
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.005, 8, 8), new THREE.MeshStandardMaterial({ color: 0x330000, emissive: 0xff2020, emissiveIntensity: 2 }));
  led.position.set(w / 2 - 0.05, -h / 2 + 0.05, d / 2 + 0.004); g.add(led);
  for (const x of [-0.18, 0.18]) { const foot = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.02, 0.3), new THREE.MeshStandardMaterial({ color: 0x222228 })); foot.position.set(x, -h / 2 - 0.01, 0); g.add(foot); }
  g.position.set(0, standH + 0.02 + h / 2, -0.02);
  scene.add(g);
  const screenLight = new THREE.PointLight(0x9cc2ff, 0.9, 1.6, 2); screenLight.position.set(0, standH + 0.3, 0.45); scene.add(screenLight);
  return { group: g, screenMat, screenLight, screenCenter: new THREE.Vector3(0, standH + 0.02 + h / 2 + 0.01, d / 2 + 0.02) };
}

/** 서랍 속 물건들 + 보라색 코드. 반환 { items:Mesh[], cord:Group } (모두 drawer 그룹 로컬 좌표) */
function buildContents(drawer, inner, mats) {
  const items = [];
  const y0 = -inner.ih / 2 + 0.012;                   // 서랍 바닥 윗면(로컬)
  const std = (opt) => new THREE.MeshStandardMaterial(opt);
  const halfW = inner.w / 2 - 0.02, halfD = inner.d / 2 - 0.02;
  const add = (mesh, x, z, y, rotY = rand(-0.6, 0.6), name = 'item') => {
    mesh.position.set(x, y, z); mesh.rotation.y = rotY; mesh.castShadow = true; mesh.receiveShadow = true; mesh.name = name;
    mesh.userData.baseY = y; drawer.add(mesh); items.push(mesh); return mesh;
  };
  // ── 보라색 코드(맨 밑, 느슨하게 감긴 전원선 + 플러그) ──
  const cord = new THREE.Group(); cord.name = 'cord';
  // 작고(지름 ~8cm) 서랍 어디든 랜덤하게 놓여, 위에 잡동사니가 두 겹으로 덮인다 — 찾는 재미
  const pts = []; const cx = rand(-halfW * 0.7, halfW * 0.7), cz = rand(-halfD * 0.6, halfD * 0.6);
  for (let i = 0; i <= 40; i++) { const a = (i / 40) * Math.PI * 2 * 2.6; const r = 0.036 + Math.sin(i * 1.7) * 0.008; pts.push(new THREE.Vector3(cx + Math.cos(a) * r * 1.2, 0.004 + (i % 7) * 0.0008, cz + Math.sin(a) * r * 0.85)); }
  const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.6);
  const cordMat = std({ color: C.cord, roughness: 0.55, metalness: 0.05, emissive: C.cordD, emissiveIntensity: 0.1 });
  const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 240, 0.0034, 10, false), cordMat); tube.castShadow = true; tube.receiveShadow = true; cord.add(tube);
  const end = pts[pts.length - 1];
  const plug = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.012, 0.026), std({ color: C.plug, roughness: 0.6 })); plug.position.copy(end).add(new THREE.Vector3(0.012, 0.004, 0)); plug.castShadow = true; cord.add(plug);
  for (const dz of [-0.004, 0.004]) { const prong = new THREE.Mesh(new THREE.CylinderGeometry(0.0015, 0.0015, 0.012, 8), std({ color: 0xd9d9df, metalness: 0.9, roughness: 0.3 })); prong.rotation.z = Math.PI / 2; prong.position.copy(plug.position).add(new THREE.Vector3(0.015, 0, dz)); cord.add(prong); }
  cord.position.set(0, y0, 0); cord.userData.baseY = y0;
  drawer.add(cord);
  cord.traverse((o) => { if (o.isMesh) o.name = 'cord'; });

  // ── 덮는 층: 걸레·영수증·DVD 케이스 (코드 위) ──
  const bend = (geo, amp) => { const p = geo.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 40) * amp + Math.cos(p.getY(i) * 30) * amp * 0.6); geo.computeVertexNormals(); return geo; };
  const clamp = (v, lim) => Math.max(-lim, Math.min(lim, v));
  for (let i = 0; i < 2; i++) {   // 걸레·손수건 두 장이 코드를 바로 덮는다
    const cloth = new THREE.Mesh(bend(new THREE.PlaneGeometry(0.17, 0.14, 12, 10), 0.004), std({ color: i ? 0xd9c9b0 : 0xbfd3e0, roughness: 1, side: THREE.DoubleSide }));
    cloth.rotation.x = -Math.PI / 2; add(cloth, clamp(cx + rand(-0.03, 0.03), halfW), clamp(cz + rand(-0.025, 0.025), halfD), y0 + 0.01 + i * 0.004, 0, 'cloth'); cloth.rotation.z = rand(-0.7, 0.7);
  }
  for (let i = 0; i < 5; i++) {
    const paper = new THREE.Mesh(bend(new THREE.PlaneGeometry(0.075, 0.16, 6, 10), 0.003), std({ map: mats.paper[i % 2], roughness: 1, side: THREE.DoubleSide }));
    paper.rotation.x = -Math.PI / 2; add(paper, clamp(cx + rand(-0.09, 0.09), halfW), clamp(cz + rand(-0.06, 0.06), halfD), y0 + 0.02 + i * 0.0015, 0, 'paper'); paper.rotation.z = rand(-1.2, 1.2);
  }
  const notebook = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.012, 0.2), [std({ color: 0x2f4a6e }), std({ color: 0x2f4a6e }), std({ color: 0x3b5b86, roughness: 0.7 }), std({ color: 0x2f4a6e }), std({ color: 0xeeeeea }), std({ color: 0x2f4a6e })]);
  add(notebook, clamp(cx + rand(-0.04, 0.04), halfW), clamp(cz + rand(-0.03, 0.03), halfD), y0 + 0.03, rand(-0.4, 0.4), 'notebook');
  for (let i = 0; i < 2; i++) {
    const dvd = new THREE.Mesh(new THREE.BoxGeometry(0.135, 0.014, 0.19), [std({ color: 0x1a1a1f }), std({ color: 0x1a1a1f }), std({ map: mats.label[i], roughness: 0.4 }), std({ color: 0x1a1a1f }), std({ color: 0x1a1a1f }), std({ color: 0x1a1a1f })]);
    add(dvd, clamp(cx + (i ? 0.08 : -0.08) + rand(-0.02, 0.02), halfW), clamp(cz + rand(-0.04, 0.04), halfD), y0 + 0.036, rand(-0.5, 0.5), 'dvd');
  }
  // ── 잡동사니 층 ──
  const remote = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.018, 0.165), [std({ color: 0x2c2c33 }), std({ color: 0x2c2c33 }), std({ map: mats.remote, roughness: 0.6 }), std({ color: 0x2c2c33 }), std({ color: 0x2c2c33 }), std({ color: 0x2c2c33 })]);
  add(remote, clamp(cx + rand(-0.08, 0.08), halfW * 0.8), clamp(cz + rand(-0.06, 0.06), halfD * 0.8), y0 + 0.052, rand(-1.4, 1.4), 'remote');
  for (let i = 0; i < 3; i++) {
    const bat = new THREE.Group();
    const bodyM = new THREE.Mesh(new THREE.CylinderGeometry(0.0072, 0.0072, 0.05, 16), std({ color: i ? 0x2a2a30 : 0x6a1f1f, roughness: 0.4, metalness: 0.3 })); bat.add(bodyM);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.0074, 0.0074, 0.012, 16), std({ color: 0xc9a13a, metalness: 0.8, roughness: 0.3 })); cap.position.y = 0.02; bat.add(cap);
    bat.rotation.z = Math.PI / 2; bat.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.name = 'battery'; } });
    add(bat, rand(-halfW, halfW), rand(-halfD, halfD), y0 + 0.046, rand(-1.5, 1.5), 'battery');
  }
  const cd = new THREE.Mesh(new THREE.RingGeometry(0.0075, 0.06, 48), std({ color: 0xdfe6ee, metalness: 0.95, roughness: 0.15, side: THREE.DoubleSide }));
  cd.rotation.x = -Math.PI / 2; add(cd, clamp(cx + rand(-0.07, 0.07), halfW * 0.8), clamp(cz + rand(-0.05, 0.05), halfD * 0.7), y0 + 0.045, 0, 'cd');
  for (let i = 0; i < 4; i++) { const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.0115, 0.0115, 0.0018, 24), std({ color: i % 2 ? 0xd4af37 : 0xb8b8c0, metalness: 0.9, roughness: 0.25 })); add(coin, rand(-halfW, halfW), rand(-halfD, halfD), y0 + 0.044, rand(0, 3), 'coin'); }
  const flash = new THREE.Group();
  const fbody = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.017, 0.12, 20), std({ color: 0x8a8f99, metalness: 0.7, roughness: 0.35 })); flash.add(fbody);
  const fhead = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.017, 0.03, 20), std({ color: 0x2a2a30, roughness: 0.5 })); fhead.position.y = 0.07; flash.add(fhead);
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.004, 20), std({ color: 0xfff3c0, emissive: 0x332200, roughness: 0.2 })); lens.position.y = 0.086; flash.add(lens);
  flash.rotation.z = Math.PI / 2; flash.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.name = 'flashlight'; } });
  add(flash, rand(-halfW * 0.6, halfW * 0.6), rand(-halfD * 0.7, halfD * 0.7), y0 + 0.062, rand(-0.8, 0.8), 'flashlight');
  for (let i = 0; i < 2; i++) { const band = new THREE.Mesh(new THREE.TorusGeometry(0.026, 0.0022, 8, 40), std({ color: 0xc9a67a, roughness: 0.9 })); band.rotation.x = Math.PI / 2; add(band, rand(-halfW, halfW), rand(-halfD, halfD), y0 + 0.046, 0, 'band'); }
  const tape = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.013, 12, 40), std({ color: 0xe0d2b8, roughness: 0.8 })); tape.rotation.x = Math.PI / 2; add(tape, rand(-halfW * 0.8, halfW * 0.8), rand(-halfD * 0.7, halfD * 0.7), y0 + 0.056, 0, 'tape');
  const phone = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.012, 0.1), std({ color: 0x1e1e26, roughness: 0.35, metalness: 0.2 })); add(phone, clamp(cx + rand(-0.06, 0.06), halfW * 0.8), clamp(cz + rand(-0.05, 0.05), halfD * 0.7), y0 + 0.05, rand(-1, 1), 'phone');
  // 검은 케이블 뭉치 (미끼)
  const bpts = []; const bx = clamp(cx + rand(-0.05, 0.05), halfW * 0.5), bz = clamp(cz + rand(-0.04, 0.04), halfD * 0.5);
  for (let i = 0; i <= 30; i++) { const a = (i / 30) * Math.PI * 2 * 1.8; bpts.push(new THREE.Vector3(bx + Math.cos(a) * 0.05, 0.004 + (i % 5) * 0.001, bz + Math.sin(a * 1.3) * 0.035)); }
  const black = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(bpts), 160, 0.004, 8, false), std({ color: 0x111114, roughness: 0.6 }));
  add(black, 0, 0, y0 + 0.05, 0, 'cable');
  return { items, cord };
}

/** 빛 속 먼지 */
function buildDust(scene) {
  const n = 320; const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { pos[i * 3] = rand(-0.9, 0.9); pos[i * 3 + 1] = rand(0.3, 1.7); pos[i * 3 + 2] = rand(-0.5, 0.9); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ color: 0xffe9c4, size: 0.0035, transparent: true, opacity: 0.38, depthWrite: false, blending: THREE.AdditiveBlending });
  const pts = new THREE.Points(geo, mat); scene.add(pts); return pts;
}

// ── 메인 ──────────────────────────────────────────────────────
/**
 * 서랍 씬 실행. 2D 줌인이 끝난 상태에서 부른다(컷신 노드 {scene3d:'drawer'}).
 * @returns {Promise<{found:boolean}>}
 */
export function run(game, node = {}) {
  return new Promise((resolve) => {
    const ov = makeOverlay(game);
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: ov.canvas, antialias: true, powerPreference: 'high-performance' });
    } catch (e) {
      ov.root.remove(); console.warn('[drawer] WebGL 불가 → 씬 생략', e); resolve({ found: true, fallback: true }); return;
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene(); scene.background = new THREE.Color(0x08060a);
    scene.fog = new THREE.Fog(0x08060a, 2.2, 5);
    const camera = new THREE.PerspectiveCamera(42, 4 / 3, 0.02, 20);

    // 텍스처/재질
    const staticCanvas = document.createElement('canvas'); staticCanvas.width = 160; staticCanvas.height = 120;
    const staticCtx = staticCanvas.getContext('2d');
    const staticTex = new THREE.CanvasTexture(staticCanvas); staticTex.colorSpace = THREE.SRGBColorSpace; staticTex.magFilter = THREE.LinearFilter;
    const mats = {
      wallpaper: texWallpaper(), floor: texWood(C.plank, C.plankLine, 0xcc9d6b, 6), wood: texWood(), woodL: texWood(C.woodL, C.wood, 0xd6a06a), woodIn: texWood(C.drawerIn, 0x5a3a24, 0xa06f48),
      paper: [texPaper(9), texPaper(6)], label: [texLabel('#b8402e'), texLabel('#2f5da8')], remote: texRemote(), static: staticTex,
    };
    buildRoom(scene, mats);
    const stand = buildStand(scene, mats);
    const tv = buildTV(scene, stand.H, mats);
    const { items, cord } = buildContents(stand.drawer, stand.inner, mats);
    const dust = buildDust(scene);

    // 조명: 따뜻한 천장등(그림자) + 서랍용 스팟 + 반구광 + TV 푸른빛
    scene.add(new THREE.HemisphereLight(0xffe2c2, 0x2a1d16, 0.35));
    const lamp = new THREE.PointLight(0xffd6a0, 7, 6, 2); lamp.position.set(0.5, 1.9, 0.9); lamp.castShadow = true; lamp.shadow.mapSize.set(1024, 1024); lamp.shadow.bias = -0.0008; scene.add(lamp);
    const spot = new THREE.SpotLight(0xfff1dc, 10, 4, 0.55, 0.65, 1.6); spot.position.set(-0.4, 1.7, 0.75); spot.castShadow = true; spot.shadow.mapSize.set(2048, 2048); spot.shadow.bias = -0.0005; spot.shadow.normalBias = 0.01; scene.add(spot);
    spot.target.position.set(-0.3, stand.holeY, 0.34); scene.add(spot.target);

    // 카메라 키프레임: TV 정면 → 서랍 위
    const drawerOpenZ = 0.34;
    const camA = { pos: new THREE.Vector3(0.02, tv.screenCenter.y + 0.02, tv.screenCenter.z + 0.62), look: tv.screenCenter.clone() };
    const drawerWorld = new THREE.Vector3(-0.3, stand.holeY, drawerOpenZ);
    const camB = { pos: new THREE.Vector3(-0.3, stand.holeY + 0.62, drawerOpenZ + 0.33), look: drawerWorld.clone().add(new THREE.Vector3(0, -0.02, -0.02)) };
    camera.position.copy(camA.pos); camera.lookAt(camA.look);

    // 상태
    let phase = 'intro';          // intro → open → play → acquire → out
    let t = 0, phaseT = 0, dragging = null, hover = null, resolved = false, resultFound = false;
    const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), dragOffset = new THREE.Vector3(), hit = new THREE.Vector3();
    const ray = new THREE.Raycaster(); const ndc = new THREE.Vector2();
    const lookTarget = camA.look.clone(); const basePos = camA.pos.clone();
    const pickables = [...items];
    cord.traverse((o) => { if (o.isMesh) pickables.push(o); });

    const fit = () => {
      const r = ov.fit(); const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
      renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); return r;
    };
    let rect = fit();
    const onResize = () => { rect = fit(); };
    addEventListener('resize', onResize);

    const setNdc = (ev) => { ndc.set(((ev.clientX - rect.left) / rect.width) * 2 - 1, -((ev.clientY - rect.top) / rect.height) * 2 + 1); ray.setFromCamera(ndc, camera); };
    const topItem = (obj) => { let o = obj; while (o.parent && o.parent !== stand.drawer) o = o.parent; return o; };
    const clampToDrawer = (v) => { const hw = stand.inner.w / 2 + 0.03, hd = stand.inner.d / 2 + 0.02; v.x = Math.max(-hw, Math.min(hw, v.x)); v.z = Math.max(-hd, Math.min(hd, v.z)); };

    const onDown = (ev) => {
      if (phase !== 'play') return;
      setNdc(ev);
      const hits = ray.intersectObjects(pickables, true);
      if (!hits.length) return;
      const target = topItem(hits[0].object);
      if (target === cord || hits[0].object.name === 'cord') { acquire(); return; }
      dragging = target; ov.canvas.style.cursor = 'grabbing';
      const worldY = new THREE.Vector3(); target.getWorldPosition(worldY);
      dragPlane.set(new THREE.Vector3(0, 1, 0), -worldY.y);
      ray.ray.intersectPlane(dragPlane, hit); dragOffset.copy(hit).sub(worldY);
      target.userData.lift = 0.028;
      try { ov.canvas.setPointerCapture(ev.pointerId); } catch {}
    };
    const onMove = (ev) => {
      if (phase !== 'play') return;
      setNdc(ev);
      if (dragging) {
        if (ray.ray.intersectPlane(dragPlane, hit)) {
          const local = hit.clone().sub(dragOffset); stand.drawer.worldToLocal(local);
          clampToDrawer(local); dragging.position.x = local.x; dragging.position.z = local.z;
        }
        return;
      }
      const hits = ray.intersectObjects(pickables, true);
      const h = hits.length ? topItem(hits[0].object) : null;
      if (h !== hover) { hover = h; ov.canvas.style.cursor = h ? (h === cord ? 'pointer' : 'grab') : 'default'; }
    };
    const onUp = () => { if (dragging) { dragging.userData.lift = 0; dragging = null; ov.canvas.style.cursor = hover ? 'grab' : 'default'; } };
    const onKey = (ev) => { if ((ev.code === 'KeyX' || ev.code === 'Escape') && phase === 'play') { ev.stopPropagation(); finish(false); } };
    ov.canvas.addEventListener('pointerdown', onDown); ov.canvas.addEventListener('pointermove', onMove);
    ov.canvas.addEventListener('pointerup', onUp); ov.canvas.addEventListener('pointercancel', onUp);
    addEventListener('keydown', onKey, true);

    let acquireT = 0; const cordStart = new THREE.Vector3(), cordQuat = new THREE.Quaternion();
    function acquire() {
      phase = 'acquire'; acquireT = 0; ov.canvas.style.cursor = 'default';
      game.sound.sfx('item');
      stand.drawer.remove(cord); cord.getWorldPosition(cordStart); scene.add(cord); cord.position.copy(cordStart); cord.getWorldQuaternion(cordQuat);
      cord.traverse((o) => { if (o.isMesh && o.material.emissive) { o.material = o.material.clone(); o.material.emissiveIntensity = 0.9; } });
      ov.big.textContent = '획득했다!';
      setTimeout(() => { ov.big.style.opacity = '1'; ov.big.style.transform = 'scale(1)'; }, 250);
      ov.flash.style.opacity = '0.75'; setTimeout(() => { ov.flash.style.opacity = '0'; }, 60);
      ov.hint.style.opacity = '0';
      resultFound = true;
    }
    function finish(found) {
      if (resolved) return; resolved = true; phase = 'out';
      ov.root.style.opacity = '0';
      setTimeout(() => {
        cancelAnimationFrame(raf); removeEventListener('resize', onResize); removeEventListener('keydown', onKey, true);
        renderer.dispose(); ov.root.remove(); delete window.__drawer3d;
        resolve({ found });
      }, 520);
    }

    // 디버그/테스트 훅: 화면 좌표로 투영
    window.__drawer3d = {
      items, cord, camera, get phase() { return phase; },
      project(obj) { const v = new THREE.Vector3(); obj.getWorldPosition(v); v.project(camera); return { x: rect.left + (v.x + 1) / 2 * rect.width, y: rect.top + (1 - v.y) / 2 * rect.height }; },
      finish,
    };

    // 렌더 루프
    let last = performance.now(), raf = 0, staticFrame = 0;
    requestAnimationFrame(() => { ov.root.style.opacity = '1'; });   // 크로스페이드 인
    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt; phaseT += dt;
      // TV 지직 (15fps) + 깜빡임
      if (++staticFrame % 4 === 0) {
        const SW = staticCanvas.width, SH = staticCanvas.height;
        const id = staticCtx.createImageData(SW, SH); const d = id.data;
        for (let i = 0; i < d.length; i += 4) { const v = 25 + Math.random() * 150; const sl = ((i / 4 / SW) | 0) % 2 ? 0.75 : 1; d[i] = v * 0.8 * sl; d[i + 1] = v * 0.9 * sl; d[i + 2] = v * sl; d[i + 3] = 255; }
        for (let y = 0; y < SH; y++) if (Math.random() < 0.05) { const o = y * SW * 4; for (let x = 0; x < SW * 4; x += 4) { d[o + x] = 14; d[o + x + 1] = 16; d[o + x + 2] = 24; } }
        staticCtx.putImageData(id, 0, 0); staticTex.needsUpdate = true;
      }
      const flick = 0.42 + 0.1 * Math.sin(t * 23) + (Math.random() < 0.03 ? 0.2 : 0);
      tv.screenMat.emissiveIntensity = flick; tv.screenLight.intensity = 0.6 + flick;
      // 먼지
      const p = dust.geometry.attributes.position; for (let i = 0; i < p.count; i++) { p.setY(i, p.getY(i) + Math.sin(t * 0.7 + i) * 0.00012 + 0.00005); p.setX(i, p.getX(i) + Math.cos(t * 0.5 + i * 1.3) * 0.0001); if (p.getY(i) > 1.75) p.setY(i, 0.3); } p.needsUpdate = true;

      if (phase === 'intro') {                 // TV 화면을 잠깐 보여준 뒤
        if (phaseT > 1.1) { phase = 'open'; phaseT = 0; slideSound(game.sound, 0.8); }
      } else if (phase === 'open') {           // 서랍이 열리며 시선이 내려감
        const k = Math.min(1, phaseT / 1.0);
        stand.drawer.position.z = easeOutBack(k) * drawerOpenZ;
        if (k >= 1 && !stand.drawer.userData.thumped) { stand.drawer.userData.thumped = true; thumpSound(game.sound); }
        const kc = easeInOut(Math.min(1, Math.max(0, (phaseT - 0.25) / 1.35)));
        basePos.lerpVectors(camA.pos, camB.pos, kc); lookTarget.lerpVectors(camA.look, camB.look, kc);
        if (phaseT > 1.7) { phase = 'play'; phaseT = 0; ov.hint.textContent = '마우스로 물건을 치우고 코드를 찾자   (X: 나중에)'; ov.hint.style.opacity = '1'; }
      } else if (phase === 'acquire') {
        acquireT += dt; const k = Math.min(1, acquireT / 0.9);
        const goal = camera.position.clone().add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(0.28)).add(new THREE.Vector3(0, -0.02, 0));
        cord.position.lerpVectors(cordStart, goal, easeInOut(k));
        cord.rotation.y += dt * 2.2; cord.rotation.x = lerp(0, -0.5, easeInOut(k));
        const s = lerp(1, 1.35, easeInOut(k)); cord.scale.setScalar(s);
        if (acquireT > 1.9) finish(true);
      }
      // 카메라: 키프레임 + 미세한 숨쉬기
      const sway = phase === 'play' || phase === 'acquire' ? 1 : 0.3;
      camera.position.set(basePos.x + Math.sin(t * 0.9) * 0.004 * sway, basePos.y + Math.sin(t * 1.3) * 0.003 * sway, basePos.z + Math.cos(t * 0.7) * 0.003 * sway);
      camera.lookAt(lookTarget);
      // 들린 물건
      for (const it of items) { const goal = it.userData.baseY + (it.userData.lift || 0); it.position.y += (goal - it.position.y) * Math.min(1, dt * 18); }
      if (hover === cord && phase === 'play') cord.traverse((o) => { if (o.isMesh && o.material.emissive && o.name === 'cord') o.material.emissiveIntensity = 0.35 + 0.25 * Math.sin(t * 8); });
      else if (phase === 'play') cord.traverse((o) => { if (o.isMesh && o.material.emissive && o.name === 'cord') o.material.emissiveIntensity = 0.12; });
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(loop);
  });
}
