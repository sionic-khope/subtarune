// ─────────────────────────────────────────────────────────────
// 맵 에디터. 배경 이미지 + 사각형(걷는 영역/막힘/트리거/상호작용) + 스폰 + NPC + 소품(라이브러리 스프라이트).
// 저장: POST /api/save → assets/maps/<id>.json (+ index.json). 게임은 이 JSON 을 코드 맵보다 우선 로드.
// ─────────────────────────────────────────────────────────────
const $ = (s) => document.querySelector(s);
const view = $('#view'), ctx = view.getContext('2d');
const COLORS = { walk: 'rgba(60,220,120,.25)', solid: 'rgba(255,70,70,.35)', trigger: 'rgba(255,220,60,.35)', sign: 'rgba(90,160,255,.35)', spawn: '#5cf', npc: '#f8f', prop: 'rgba(255,255,255,.15)' };
const STROKE = { walk: '#3ad', solid: '#f44', trigger: '#fd4', sign: '#6af', prop: '#fff' };

let maps = [];           // id 목록
let map = null;          // 현재 맵 JSON
let mapId = null;
let bg = null;           // 배경 Image
let zoom = 2;
let tool = 'select';
let sel = null;          // { kind, index }
let drag = null;
let undo = [];
let libFiles = [];
let libPick = null;      // 선택한 소품 이미지 경로
const propImgs = {};

const api = {
  list: async (dir) => (await (await fetch(`/api/list?dir=${encodeURIComponent(dir)}`)).json()).files,
  save: async (path, body) => (await fetch(`/api/save?path=${encodeURIComponent(path)}`, { method: 'POST', body })).json(),
  json: async (path) => (await fetch(path + '?v=' + Date.now())).json(),
};
const loadImg = (src) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src + '?v=' + Date.now(); });
const status = (t) => { $('#status').textContent = t; };
const snap = (v) => Math.round(v);

// ── 맵 목록 ──
async function refreshMaps() {
  try { maps = (await api.json('assets/maps/index.json')).maps || []; } catch { maps = []; }
  const files = await api.list('assets/maps');
  for (const f of files) if (f.endsWith('.json') && !f.endsWith('index.json')) { const id = f.split('/').pop().replace('.json', ''); if (!maps.includes(id)) maps.push(id); }
  $('#maps').innerHTML = maps.map((m) => `<div data-id="${m}" class="${m === mapId ? 'on' : ''}">${m}</div>`).join('');
  $('#maps').querySelectorAll('div').forEach((d) => d.onclick = () => openMap(d.dataset.id));
}
async function openMap(id) {
  map = await api.json(`assets/maps/${id}.json`);
  mapId = id;
  map.walkable ||= []; map.solids ||= []; map.entities ||= []; map.spawns ||= {};
  bg = map.image ? await loadImg(map.image) : null;
  for (const e of map.entities) if (e.type === 'prop' && e.image && !propImgs[e.image]) propImgs[e.image] = await loadImg(e.image);
  sel = null; undo = [];
  await refreshMaps(); renderMapProps(); draw();
  status(`${id} 열림`);
}

// ── 그리기 ──
function draw() {
  if (!map) return;
  const W = bg ? Math.round(bg.width * (map.imageScale ?? 1)) : 480, H = bg ? Math.round(bg.height * (map.imageScale ?? 1)) : 360;
  view.width = W * zoom; view.height = H * zoom;
  ctx.setTransform(zoom, 0, 0, zoom, 0, 0); ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  if (bg) ctx.drawImage(bg, 0, 0, W, H);
  if ($('#showGrid').checked) { ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.lineWidth = 1 / zoom; for (let x = 0; x < W; x += 32) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); } for (let y = 0; y < H; y += 32) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); } }
  const rect = (r, kind, on) => { ctx.fillStyle = COLORS[kind]; ctx.fillRect(r[0], r[1], r[2], r[3]); ctx.strokeStyle = on ? '#fff' : STROKE[kind]; ctx.lineWidth = (on ? 2 : 1) / zoom; ctx.strokeRect(r[0] + .5 / zoom, r[1] + .5 / zoom, r[2], r[3]); };
  map.walkable.forEach((r, i) => rect(r, 'walk', sel?.kind === 'walk' && sel.index === i));
  map.solids.forEach((r, i) => rect(r, 'solid', sel?.kind === 'solid' && sel.index === i));
  // 소품/엔티티 (y 정렬)
  const ents = map.entities.map((e, i) => ({ e, i })).sort((a, b) => entBottom(a.e) - entBottom(b.e));
  for (const { e, i } of ents) {
    const on = sel?.kind === 'ent' && sel.index === i;
    if (e.type === 'prop') {
      const img = propImgs[e.image]; const sc = e.scale ?? 1;
      if (img) ctx.drawImage(img, e.x, e.y, img.width * sc, img.height * sc);
      const r = propRect(e); ctx.strokeStyle = on ? '#fff' : 'rgba(255,255,255,.4)'; ctx.lineWidth = 1 / zoom; ctx.strokeRect(r[0], r[1], r[2], r[3]);
      if (e.solid !== false) { const hb = propHit(e); ctx.fillStyle = COLORS.solid; ctx.fillRect(hb[0], hb[1], hb[2], hb[3]); }
    } else if (e.type === 'npc') {
      ctx.fillStyle = COLORS.npc; ctx.fillRect(e.x, e.y, e.w ?? 24, e.h ?? 16);
      ctx.fillStyle = '#fff'; ctx.font = `${8}px monospace`; ctx.fillText(e.sprite || 'npc', e.x, e.y - 2);
      if (on) { ctx.strokeStyle = '#fff'; ctx.strokeRect(e.x, e.y, e.w ?? 24, e.h ?? 16); }
    } else {
      const kind = e.type === 'trigger' ? 'trigger' : 'sign';
      rect([e.x, e.y, e.w ?? 24, e.h ?? 24], kind, on);
      ctx.fillStyle = '#fff'; ctx.font = `${8}px monospace`; ctx.fillText((e.script || e.type) + (e.to ? '→' + e.to : ''), e.x + 1, e.y + 8);
    }
  }
  for (const [name, p] of Object.entries(map.spawns)) {
    const on = sel?.kind === 'spawn' && sel.index === name;
    ctx.fillStyle = COLORS.spawn; ctx.beginPath(); ctx.arc(p.x + 12, p.y + 8, on ? 6 : 4, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = `${8}px monospace`; ctx.fillText('▲' + name, p.x + 18, p.y + 11);
  }
  if (drag?.rect) { const r = normRect(drag.rect); ctx.strokeStyle = '#fff'; ctx.setLineDash([2, 2]); ctx.strokeRect(r[0], r[1], r[2], r[3]); ctx.setLineDash([]); }
}
const entBottom = (e) => e.type === 'prop' ? propRect(e)[1] + propRect(e)[3] : e.y + (e.h ?? 24);
function propRect(e) { const img = propImgs[e.image]; const sc = e.scale ?? 1; return [e.x, e.y, img ? img.width * sc : 32, img ? img.height * sc : 32]; }
function propHit(e) { const r = propRect(e); if (e.w !== undefined) return [e.x, e.y, e.w, e.h]; const h = Math.max(4, Math.round(r[3] * 0.4)); return [r[0], r[1] + r[3] - h, r[2], h]; }
const normRect = ([x0, y0, x1, y1]) => [Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0)];

// ── 히트 테스트 ──
function pick(x, y) {
  const ents = map.entities.map((e, i) => ({ e, i })).sort((a, b) => entBottom(b.e) - entBottom(a.e));
  for (const [name, p] of Object.entries(map.spawns)) if (Math.hypot(x - (p.x + 12), y - (p.y + 8)) < 8) return { kind: 'spawn', index: name };
  for (const { e, i } of ents) { const r = e.type === 'prop' ? propRect(e) : [e.x, e.y, e.w ?? 24, e.h ?? (e.type === 'npc' ? 16 : 24)]; if (x >= r[0] && y >= r[1] && x < r[0] + r[2] && y < r[1] + r[3]) return { kind: 'ent', index: i }; }
  for (let i = map.solids.length - 1; i >= 0; i--) { const r = map.solids[i]; if (x >= r[0] && y >= r[1] && x < r[0] + r[2] && y < r[1] + r[3]) return { kind: 'solid', index: i }; }
  for (let i = map.walkable.length - 1; i >= 0; i--) { const r = map.walkable[i]; if (x >= r[0] && y >= r[1] && x < r[0] + r[2] && y < r[1] + r[3]) return { kind: 'walk', index: i }; }
  return null;
}
function getSel() { if (!sel) return null; if (sel.kind === 'walk') return map.walkable[sel.index]; if (sel.kind === 'solid') return map.solids[sel.index]; if (sel.kind === 'ent') return map.entities[sel.index]; if (sel.kind === 'spawn') return map.spawns[sel.index]; }
function pushUndo() { undo.push(JSON.stringify(map)); if (undo.length > 50) undo.shift(); }

// ── 마우스 ──
const pos = (ev) => { const r = view.getBoundingClientRect(); return [snap((ev.clientX - r.left) / zoom), snap((ev.clientY - r.top) / zoom)]; };
view.addEventListener('mousedown', (ev) => {
  if (!map) return;
  const [x, y] = pos(ev);
  if (tool === 'select') {
    sel = pick(x, y); renderProps();
    if (sel) { pushUndo(); const o = getSel(); drag = { move: true, x, y, ox: Array.isArray(o) ? o[0] : o.x, oy: Array.isArray(o) ? o[1] : o.y }; }
    draw(); return;
  }
  if (tool === 'spawn') { pushUndo(); const name = prompt('스폰 이름', 'start'); if (name) map.spawns[name] = { x: x - 12, y: y - 8 }; sel = { kind: 'spawn', index: name }; draw(); renderProps(); return; }
  if (tool === 'npc') { pushUndo(); map.entities.push({ type: 'npc', id: 'npc' + map.entities.length, sprite: 'gyeongsub', x, y, facing: 'down', wander: 0, script: '' }); sel = { kind: 'ent', index: map.entities.length - 1 }; draw(); renderProps(); return; }
  if (tool === 'prop') { if (!libPick) { status('오른쪽 라이브러리에서 소품을 먼저 고르세요'); return; } pushUndo(); const img = propImgs[libPick]; map.entities.push({ type: 'prop', image: libPick, x: x - Math.round((img?.width || 32) / 2), y: y - (img?.height || 32), scale: 1, solid: true, script: '' }); sel = { kind: 'ent', index: map.entities.length - 1 }; draw(); renderProps(); return; }
  drag = { rect: [x, y, x, y] };
});
view.addEventListener('mousemove', (ev) => {
  if (!drag) return;
  const [x, y] = pos(ev);
  if (drag.move) {
    const o = getSel(); const dx = x - drag.x, dy = y - drag.y;
    if (Array.isArray(o)) { o[0] = drag.ox + dx; o[1] = drag.oy + dy; } else { o.x = drag.ox + dx; o.y = drag.oy + dy; }
    draw(); renderProps(); return;
  }
  drag.rect[2] = x; drag.rect[3] = y; draw();
});
window.addEventListener('mouseup', () => {
  if (!drag) return;
  if (drag.rect) {
    const r = normRect(drag.rect);
    if (r[2] >= 4 && r[3] >= 4) {
      pushUndo();
      if (tool === 'walk') { map.walkable.push(r); sel = { kind: 'walk', index: map.walkable.length - 1 }; }
      if (tool === 'solid') { map.solids.push(r); sel = { kind: 'solid', index: map.solids.length - 1 }; }
      if (tool === 'trigger') { map.entities.push({ type: 'trigger', x: r[0], y: r[1], w: r[2], h: r[3], once: false, script: '' }); sel = { kind: 'ent', index: map.entities.length - 1 }; }
      if (tool === 'sign') { map.entities.push({ type: 'sign', x: r[0], y: r[1], w: r[2], h: r[3], script: '' }); sel = { kind: 'ent', index: map.entities.length - 1 }; }
    }
  }
  drag = null; draw(); renderProps();
});
window.addEventListener('keydown', (ev) => {
  if (ev.target.tagName === 'INPUT' || ev.target.tagName === 'SELECT') return;
  const k = ev.key.toLowerCase();
  const map_ = { v: 'select', w: 'walk', s: 'solid', t: 'trigger', i: 'sign', p: 'spawn', n: 'npc', b: 'prop' };
  if (map_[k] && !ev.metaKey && !ev.ctrlKey) setTool(map_[k]);
  if ((ev.key === 'Delete' || ev.key === 'Backspace') && sel) { pushUndo(); if (sel.kind === 'walk') map.walkable.splice(sel.index, 1); if (sel.kind === 'solid') map.solids.splice(sel.index, 1); if (sel.kind === 'ent') map.entities.splice(sel.index, 1); if (sel.kind === 'spawn') delete map.spawns[sel.index]; sel = null; draw(); renderProps(); }
  if ((ev.metaKey || ev.ctrlKey) && k === 'z') { const u = undo.pop(); if (u) { map = JSON.parse(u); sel = null; draw(); renderProps(); } ev.preventDefault(); }
  if ((ev.metaKey || ev.ctrlKey) && k === 's') { save(); ev.preventDefault(); }
  if (sel && ['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) { const o = getSel(); const d = ev.shiftKey ? 8 : 1; const dx = k === 'arrowleft' ? -d : k === 'arrowright' ? d : 0, dy = k === 'arrowup' ? -d : k === 'arrowdown' ? d : 0; if (Array.isArray(o)) { o[0] += dx; o[1] += dy; } else { o.x += dx; o.y += dy; } draw(); renderProps(); ev.preventDefault(); }
});
function setTool(t) { tool = t; $('#tools').querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.tool === t)); }
$('#tools').querySelectorAll('button').forEach((b) => b.onclick = () => setTool(b.dataset.tool));
$('#zoom').onchange = () => { zoom = +$('#zoom').value; draw(); };
$('#showGrid').onchange = draw;

// ── 속성 패널 ──
function field(label, key, obj, type = 'text', opts) {
  const id = 'f_' + key;
  let input = type === 'select' ? `<select id="${id}">${opts.map((o) => `<option ${obj[key] === o ? 'selected' : ''}>${o}</option>`).join('')}</select>`
    : type === 'check' ? `<input type="checkbox" id="${id}" ${obj[key] ? 'checked' : ''}>`
    : `<input id="${id}" value="${obj[key] ?? ''}">`;
  return `<label>${label}${input}</label>`;
}
function bind(key, obj, type = 'text') {
  const el = $('#f_' + key); if (!el) return;
  el.onchange = () => { pushUndo(); obj[key] = type === 'num' ? +el.value : type === 'check' ? el.checked : el.value; draw(); };
}
function renderProps() {
  const o = getSel(); const box = $('#props');
  if (!o) { box.innerHTML = '<span class="hint">아무것도 선택 안 됨</span>'; return; }
  if (Array.isArray(o)) {
    box.innerHTML = `<div class="hint">${sel.kind === 'walk' ? '걷는 영역' : '막힘'}</div>` + ['x', 'y', 'w', 'h'].map((k, i) => `<label>${k}<input id="r_${i}" value="${o[i]}"></label>`).join('');
    [0, 1, 2, 3].forEach((i) => $('#r_' + i).onchange = (ev) => { pushUndo(); o[i] = +ev.target.value; draw(); });
    return;
  }
  if (sel.kind === 'spawn') { box.innerHTML = `<div class="hint">스폰 "${sel.index}"</div>${field('x', 'x', o)}${field('y', 'y', o)}`; bind('x', o, 'num'); bind('y', o, 'num'); return; }
  const e = o;
  let html = `<div class="hint">${e.type}${e.image ? ' · ' + e.image.split('/').pop() : ''}</div>`;
  html += field('x', 'x', e) + field('y', 'y', e);
  if (e.type === 'prop') html += field('배율', 'scale', e) + field('막힘', 'solid', e, 'check') + field('상호작용 스크립트', 'script', e);
  if (e.type === 'npc') html += field('id', 'id', e) + field('스프라이트', 'sprite', e, 'select', ['hyungsub', 'gyeongsub', 'ppaman', 'junhee']) + field('방향', 'facing', e, 'select', ['down', 'up', 'left', 'right']) + field('배회 반경', 'wander', e) + field('스크립트', 'script', e);
  if (e.type === 'sign') html += field('w', 'w', e) + field('h', 'h', e) + field('스크립트', 'script', e);
  if (e.type === 'trigger') html += field('w', 'w', e) + field('h', 'h', e) + field('스크립트', 'script', e) + field('한 번만', 'once', e, 'check') + field('플래그', 'flag', e) + `<div class="hint">문으로 쓰려면 ↓ (스크립트 대신)</div>` + field('이동할 맵 (to)', 'to', e) + field('도착 스폰 (spawn)', 'spawn', e);
  box.innerHTML = html;
  bind('x', e, 'num'); bind('y', e, 'num'); bind('w', e, 'num'); bind('h', e, 'num'); bind('scale', e, 'num'); bind('wander', e, 'num');
  bind('solid', e, 'check'); bind('once', e, 'check');
  ['script', 'id', 'sprite', 'facing', 'flag', 'to', 'spawn'].forEach((k) => bind(k, e));
}
function renderMapProps() {
  $('#mapProps').innerHTML = `<label>id<input id="m_id" value="${mapId}" disabled></label><label>이름<input id="m_name" value="${map.name || ''}"></label><label>BGM (assets/audio/bgm/*.mp3)<input id="m_bgm" value="${map.bgm || ''}"></label><label>배경<input id="m_image" value="${map.image || ''}"></label>`;
  $('#m_name').onchange = (ev) => { map.name = ev.target.value; };
  $('#m_bgm').onchange = (ev) => { map.bgm = ev.target.value; };
  $('#m_image').onchange = async (ev) => { map.image = ev.target.value; bg = await loadImg(map.image); draw(); };
}

// ── 저장 / 플레이 ──
async function save() {
  if (!map) return;
  // 트리거에 to 가 있으면 문(door) 으로 변환
  for (const e of map.entities) if (e.type === 'trigger' && e.to) { e.type = 'door'; } else if (e.type === 'door' && !e.to) e.type = 'trigger';
  await api.save(`assets/maps/${mapId}.json`, JSON.stringify(map, null, 2));
  if (!maps.includes(mapId)) maps.push(mapId);
  await api.save('assets/maps/index.json', JSON.stringify({ maps }, null, 2));
  status(`저장됨: assets/maps/${mapId}.json`);
}
$('#btnSave').onclick = save;
$('#btnPlay').onclick = async () => { await save(); const sp = Object.keys(map.spawns)[0] || 'start'; window.open(`index.html?map=${mapId}&spawn=${sp}`, 'subtarune_play'); };

// ── 라이브러리 ──
async function loadLib() {
  libFiles = (await api.list('assets/library')).filter((f) => /\.(png|webp|gif)$/i.test(f));
  renderLib('');
}
function renderLib(q) {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const hits = libFiles.filter((f) => words.every((w) => f.toLowerCase().includes(w))).slice(0, 150);
  $('#libCount').textContent = `${hits.length}개 표시 (전체 ${libFiles.length})`;
  $('#lib').innerHTML = hits.map((f) => `<div class="item" data-f="${f}"><img loading="lazy" src="${f}"><span>${f.split('/').pop().replace(/^spr_/, '').replace('.png', '')}</span></div>`).join('');
  $('#lib').querySelectorAll('.item').forEach((d) => d.onclick = async () => { libPick = d.dataset.f; if (!propImgs[libPick]) propImgs[libPick] = await loadImg(libPick); $('#lib').querySelectorAll('.item').forEach((x) => x.style.outline = ''); d.style.outline = '2px solid #ffe066'; setTool('prop'); status('소품 선택: ' + libPick.split('/').pop() + ' — 맵을 클릭해 배치'); });
}
$('#libSearch').oninput = (ev) => renderLib(ev.target.value);

// ── 새 맵: 배경 자르기 ──
const cropcv = $('#cropcv'), cctx = cropcv.getContext('2d');
let cropImg = null, cropRect = null, cropDrag = null, cropScale = 1;
$('#btnNew').onclick = async () => {
  const files = (await api.list('assets/library/deltarune/maps')).concat((await api.list('assets/maps')).filter((f) => /\.(png|webp)$/i.test(f)));
  $('#cropSrc').innerHTML = files.map((f) => `<option>${f}</option>`).join('');
  $('#crop').classList.add('on'); await showCrop();
};
$('#cropSrc').onchange = showCrop;
async function showCrop() {
  cropImg = await loadImg($('#cropSrc').value); cropRect = null;
  const maxW = window.innerWidth - 40; cropScale = Math.min(1, maxW / cropImg.width);
  cropcv.width = cropImg.width * cropScale; cropcv.height = cropImg.height * cropScale; drawCrop();
  const d = cropImg.width >= 1400 ? 2.25 : cropImg.width >= 1200 ? 2 : 1; $('#cropDiv').value = d;
}
function drawCrop() { cctx.clearRect(0, 0, cropcv.width, cropcv.height); cctx.drawImage(cropImg, 0, 0, cropcv.width, cropcv.height); if (cropRect) { const r = normRect(cropRect); cctx.strokeStyle = '#ffe066'; cctx.lineWidth = 2; cctx.strokeRect(r[0], r[1], r[2], r[3]); } }
cropcv.onmousedown = (ev) => { const r = cropcv.getBoundingClientRect(); cropDrag = true; cropRect = [ev.clientX - r.left, ev.clientY - r.top, ev.clientX - r.left, ev.clientY - r.top]; };
cropcv.onmousemove = (ev) => { if (!cropDrag) return; const r = cropcv.getBoundingClientRect(); cropRect[2] = ev.clientX - r.left; cropRect[3] = ev.clientY - r.top; drawCrop(); };
cropcv.onmouseup = () => { cropDrag = false; };
$('#cropCancel').onclick = () => $('#crop').classList.remove('on');
$('#cropOk').onclick = async () => {
  const id = $('#cropId').value.trim(); if (!/^[a-z0-9_]+$/.test(id)) { alert('맵 id 는 영문 소문자/숫자/_ 만'); return; }
  const div = +$('#cropDiv').value || 1;
  let r = cropRect ? normRect(cropRect).map((v) => v / cropScale) : [0, 0, cropImg.width, cropImg.height];
  r = r.map(Math.round);
  const w = Math.round(r[2] / div), h = Math.round(r[3] / div);
  const c = document.createElement('canvas'); c.width = w; c.height = h; const cx = c.getContext('2d'); cx.imageSmoothingEnabled = div !== 1;
  cx.drawImage(cropImg, r[0], r[1], r[2], r[3], 0, 0, w, h);
  const blob = await new Promise((res) => c.toBlob(res, 'image/png'));
  await api.save(`assets/maps/${id}.png`, blob);
  const json = { id, name: $('#cropName').value || id, image: `assets/maps/${id}.png`, walkable: [[0, 0, w, h]], solids: [], spawns: { start: { x: Math.round(w / 2) - 12, y: Math.round(h / 2) } }, entities: [], bgm: '' };
  await api.save(`assets/maps/${id}.json`, JSON.stringify(json, null, 2));
  if (!maps.includes(id)) maps.push(id); await api.save('assets/maps/index.json', JSON.stringify({ maps }, null, 2));
  $('#crop').classList.remove('on'); await openMap(id);
};

// ── 시작 ──
await refreshMaps(); await loadLib();
if (maps.length) openMap(maps.includes('room') ? 'room' : maps[0]);
