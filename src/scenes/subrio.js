// 섭리오 — 비데 방의 거대 게임 스크린 속 2D 플랫포머(게임 속 게임). 2026-09-15 사용자 브리핑.
// 컷신 노드 { scene3d: 'subrio' } 로 실행되는 오버레이 씬. 규칙은 subrio-core.js(순수), 여기는 진행·그리기·소리·입력.
//   흐름: 오버레이 페이드인 → 검은 화면에 SUBRIO 로고가 천천히(Query? 브금) → 나레이션 4줄(한 글자씩, 나레이션 음성)
//   → 직업 선택(창·불·시계 아이콘 하나씩 페이드인, 1P/2P/3P 포인터, 대사, 커서 이동 띡띡·선택 띠링) → 슈우웅 밝아지며 게임(SWORD 브금)
//   → 세 명이 하늘에서 띠링 띠링 띠링 떨어짐 → 좌우/위 점프/아래 앉기/C 창/X 방패, 동료는 늦게 반응하는 AI 추종. 적은 아직 없다.
//   테두리는 사용자 지시대로 입체감 있는 흰색 베젤. Esc(title) 로 방으로 돌아온다(임시 출구).
import { Input } from '../core/input.js';
import { FONT, F } from '../ui/font.js';
import { SCREEN_W, SCREEN_H } from '../world/world.js';
import { buildLevel, makeActor, stepActor, followerIntent, updateSpears, frameOf, cameraX, TILE, VIEW_W, VIEW_H, ATLAS_COLUMN, SPEAR_SPEED, SPEAR_LIFE } from './subrio-core.js';

const FRAME = 10;
const VIEW_X = FRAME, VIEW_Y = FRAME;
const CLASSES = [
  { id: 'pantheon', name: '판테온', icon: 'assets/props/subrio_icon_spear.png', sheet: 'assets/sprites/subrio_pantheon.png', color: '#d9a441' },
  { id: 'brand', name: '브랜드', icon: 'assets/props/subrio_icon_fire.png', sheet: 'assets/sprites/subrio_brand.png', color: '#ff7a3d' },
  { id: 'zilean', name: '질리언', icon: 'assets/props/subrio_icon_clock.png', sheet: 'assets/sprites/subrio_zilean.png', color: '#ffd166' },
];
const PLAYERS = [
  { id: 'hyungsub', label: '요플래', color: '#7fd0ff', voice: 'hyungsub', pick: 0 },
  { id: 'gyeongsub', label: '경섭', color: '#ff5c5c', voice: 'gyeongsub', pick: 2 },
  { id: 'ppaman', label: '억빠맨', color: '#c9a3ff', voice: 'ppaman', pick: 1 },
];
const NARRATION = ['섭리오에 오신 여러분들 환영합니다', '방향키로 움직이고 점프하고 앉을 수 있습니다.', 'x가 방어 c가 공격입니다', '직업을 선택해주세요~'];
const SELECT_LINES = [
  { speaker: '억빠맨', voice: 'ppaman', text: '오 판테온 브랜드 질리언이네요?' },
  { speaker: '억빠맨', voice: 'ppaman', text: '요플래씨는 질리언하실건가요?' },
  { speaker: '경섭', voice: 'gyeongsub', text: '저..' },
  { speaker: '경섭', voice: 'gyeongsub', text: '내가 질리언할수있나? 허허' },
  { speaker: '억빠맨', voice: 'ppaman', text: '아 상관없죠 전 브랜드할게요 어차피 셋다 주챔아니라 그나마 쉬운거' },
  { speaker: null, voice: 'narrator', text: '판테온을 하게되었다.' },
];
const FINAL_LINE = '네 여러분 좋습니다. 그럼 한번 모험을 떠나볼까요오 ~~~';
const CHAR_DELAY = 0.05;
const HOLD_AFTER_LINE = 2.4;
const ICON_X = [96, 230, 364];

function loadImage(src) {
  const img = new Image();
  const done = new Promise((resolve) => { img.onload = () => resolve(img); img.onerror = () => resolve(null); });
  img.src = src;
  return { img, done };
}

function makeOverlay(game) {
  const root = document.createElement('div');
  root.id = 'subrio';
  Object.assign(root.style, { position: 'fixed', left: '0', top: '0', width: '0', height: '0', opacity: '0', transition: 'opacity 0.6s ease', zIndex: '10', overflow: 'hidden', background: '#000' });
  const canvas = document.createElement('canvas');
  canvas.width = SCREEN_W; canvas.height = SCREEN_H;
  Object.assign(canvas.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', display: 'block', imageRendering: 'pixelated' });
  root.appendChild(canvas);
  document.body.appendChild(root);
  const fit = () => {
    const r = game.canvas.getBoundingClientRect();
    Object.assign(root.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
  };
  return { root, canvas, fit };
}

/** 한 글자씩 나오는 글. blip 은 보이는 글자마다 한 번 */
class Typewriter {
  constructor(sound) { this.sound = sound; this.text = ''; this.shown = 0; this.timer = 0; this.voice = 'narrator'; this.doneT = 0; }
  start(text, voice = 'narrator') { this.text = text; this.shown = 0; this.timer = 0; this.voice = voice; this.doneT = 0; }
  get done() { return this.shown >= this.text.length; }
  skip() { this.shown = this.text.length; }
  update(dt) {
    if (this.done) { this.doneT += dt; return; }
    this.timer += dt;
    while (this.timer >= CHAR_DELAY && !this.done) {
      this.timer -= CHAR_DELAY; this.shown += 1;
      const ch = this.text[this.shown - 1];
      if (ch !== ' ') this.sound.blip(this.voice);
    }
  }
  get visible() { return this.text.slice(0, this.shown); }
}

export function run(game, node = {}) {
  return new Promise((resolve) => {
    const ov = makeOverlay(game);
    const ctx = ov.canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    const level = buildLevel();
    const baked = bakeLevel(level);
    const sheets = Object.fromEntries(CLASSES.map(c => [c.id, loadImage(c.sheet)]));
    const icons = Object.fromEntries(CLASSES.map(c => [c.id, loadImage(c.icon)]));
    const spearImg = loadImage('assets/props/subrio_spear.png');
    const tilesImg = loadImage('assets/props/subrio_tiles.png');
    tilesImg.done.then(img => { if (img) baked.paint(img); });
    const typer = new Typewriter(game.sound);
    const state = {
      phase: 'logo', t: 0, phaseT: 0, logoAlpha: 0, lineIndex: 0, icons: [0, 0, 0], cursors: [0, 0, 0], picked: [false, false, false],
      cursorScript: null, flash: 0, actors: [], spears: [], trail: [], control: false, cam: 0, exiting: false,
    };
    // 눌린 순간: 게임 루프가 프레임마다 채우는 Input.pressed(짧은 탭도 한 프레임은 남는다)와 held 의 상승 에지를 합친다 — 이 씬의 rAF 가 게임 poll 과 어긋나도 탭을 놓치지 않는다
    const prev = Object.create(null);
    const edge = (action) => { const down = Input.down(action) || !!Input.pressed[action]; const just = down && !prev[action]; prev[action] = down; return just; };
    const held = (action) => Input.down(action);

    // ── 진행 ──
    const startPlay = () => {
      state.phase = 'play'; state.phaseT = 0; state.control = false; state.trail = []; state.spears = [];
      const order = ['hyungsub', 'gyeongsub', 'ppaman'];
      state.actors = order.map((id, i) => {
        const cls = CLASSES[PLAYERS.find(p => p.id === id).pick];
        const actor = makeActor(id, 64 + i * 44, -40, 1);
        actor.classId = cls.id; actor.delay = i * 0.55; actor.active = false; actor.blockedT = 0; actor.dropped = false;
        return actor;
      });
      game.sound.stopBgm(0.2);
      game.sound.playBgm('subrio_sword', { volume: 0.42 });
    };
    const finish = () => {
      if (state.exiting) return; state.exiting = true;
      game.sound.stopBgm(0.5);
      ov.root.style.opacity = '0';
      setTimeout(() => { cancelAnimationFrame(raf); removeEventListener('resize', ov.fit); ov.root.remove(); delete window.__subrio; resolve({ found: true }); }, 620);
    };

    const advanceLine = () => {
      if (state.phase === 'narration') {
        state.lineIndex += 1;
        if (state.lineIndex >= NARRATION.length - 1) { state.phase = 'select'; state.phaseT = 0; state.lineIndex = 0; typer.start(NARRATION[3], 'narrator'); typer.skip(); state.dialogue = null; }
        else typer.start(NARRATION[state.lineIndex], 'narrator');
      } else if (state.phase === 'select' && state.dialogue) {
        state.dialogue.index += 1;
        if (state.dialogue.index < SELECT_LINES.length) { const line = SELECT_LINES[state.dialogue.index]; typer.start(line.text, line.voice); }
        else { state.dialogue = null; state.cursorScript = { t: 0, steps: [] }; }
      } else if (state.phase === 'final') {
        state.phase = 'flash'; state.phaseT = 0; game.sound.sfx('whoosh', { volume: 0.9 }); game.sound.stopBgm(0.6);
      }
    };

    // 커서 대본: 경섭 두 칸(띡띡) → 질리언 띠링, 억빠맨 동시에 한 칸 → 브랜드 띠링, 마지막에 요플래 판테온 띠링
    const CURSOR_STEPS = [
      { at: 0.35, player: 1, to: 1, sfx: 'menu' }, { at: 0.35, player: 2, to: 1, sfx: 'menu' },
      { at: 0.8, player: 1, to: 2, sfx: 'menu' }, { at: 0.8, player: 2, pick: true, sfx: 'confirm' },
      { at: 1.3, player: 1, pick: true, sfx: 'confirm' },
      { at: 2.0, player: 0, pick: true, sfx: 'confirm' },
    ];

    const update = (dt) => {
      state.t += dt; state.phaseT += dt;
      const confirm = edge('confirm');
      if (edge('title')) { finish(); return; }
      if (state.phase === 'logo') {
        if (state.phaseT < 0.05 && !state.bgmStarted) { state.bgmStarted = true; game.sound.playBgm('subrio_query', { volume: 0.4, fadeIn: 1.2 }); }
        state.logoAlpha = Math.max(0, Math.min(1, (state.phaseT - 0.8) / 2.6));
        if (state.phaseT > 6.2 || (confirm && state.phaseT > 3.6)) { state.phase = 'narration'; state.phaseT = 0; state.lineIndex = 0; typer.start(NARRATION[0], 'narrator'); }
        return;
      }
      if (state.phase === 'narration') {
        typer.update(dt);
        if (confirm) { if (!typer.done) typer.skip(); else advanceLine(); }
        else if (typer.done && typer.doneT > HOLD_AFTER_LINE) advanceLine();
        return;
      }
      if (state.phase === 'select') {
        for (let i = 0; i < 3; i++) state.icons[i] = Math.max(0, Math.min(1, (state.phaseT - 0.4 - i * 0.9) / 0.8));
        const iconsDone = state.icons[2] >= 1;
        if (iconsDone && !state.dialogue && !state.cursorScript && !state.cursorsShown) { state.cursorsShown = true; state.cursorT = 0; }
        if (state.cursorsShown && !state.dialogue && !state.cursorScript && !state.scriptDone) {
          state.cursorT = (state.cursorT || 0) + dt;
          if (state.cursorT > 0.9) { state.dialogue = { index: 0 }; typer.start(SELECT_LINES[0].text, SELECT_LINES[0].voice); }
        }
        if (state.dialogue) {
          typer.update(dt);
          if (confirm) { if (!typer.done) typer.skip(); else advanceLine(); }
          else if (typer.done && typer.doneT > HOLD_AFTER_LINE) advanceLine();
        }
        if (state.cursorScript) {
          state.cursorScript.t += dt;
          for (const step of CURSOR_STEPS) {
            if (step.done || state.cursorScript.t < step.at) continue;
            step.done = true;
            if (step.to !== undefined) state.cursors[step.player] = step.to;
            if (step.pick) state.picked[step.player] = true;
            game.sound.sfx(step.sfx, { volume: 0.8 });
          }
          if (state.cursorScript.t > 2.8) { state.cursorScript = null; state.scriptDone = true; state.phase = 'final'; state.phaseT = 0; typer.start(FINAL_LINE, 'narrator'); }
        }
        return;
      }
      if (state.phase === 'final') {
        typer.update(dt);
        if (confirm) { if (!typer.done) typer.skip(); else advanceLine(); }
        else if (typer.done && typer.doneT > HOLD_AFTER_LINE) advanceLine();
        return;
      }
      if (state.phase === 'flash') {
        state.flash = Math.min(1, state.phaseT / 0.9);
        if (state.phaseT >= 0.9) { startPlay(); state.flash = 1; }
        return;
      }
      if (state.phase === 'play') {
        state.flash = Math.max(0, state.flash - dt * 1.1);
        const leader = state.actors[0];
        const events = [];
        for (const [i, actor] of state.actors.entries()) {
          if (!actor.active) { if (state.phaseT >= actor.delay) actor.active = true; else continue; }
          let intent;
          if (i === 0) {
            intent = state.control ? { left: held('left'), right: held('right'), jump: edge('up'), jumpHeld: held('up'), crouch: held('down'), attack: confirm, guard: held('cancel') } : NO_INTENT;
          } else {
            intent = state.control ? followerIntent(actor, state.trail, state.t, { reaction: 0.32 * i + 0.1, spacing: 34 * i }) : NO_INTENT;
            const wantsMove = intent.left || intent.right;
            actor.blockedT = wantsMove && actor.grounded && Math.abs(actor.vx) < 6 ? (actor.blockedT || 0) + dt : 0;
          }
          const before = events.length;
          stepActor(level, actor, intent, dt, events);
          if (i === 0) state.trail.push({ t: state.t, x: actor.x, y: actor.y, facing: actor.facing, jumped: events.slice(before).some(e => e.type === 'jump') });
        }
        if (state.trail.length > 400) state.trail.splice(0, state.trail.length - 400);
        for (const event of events) {
          if (event.type === 'land') { const actor = state.actors.find(a => a.id === event.id); if (actor && !actor.dropped) { actor.dropped = true; game.sound.sfx('item', { volume: 0.7 }); } }
          if (event.type === 'jump' && event.id === 'hyungsub') game.sound.sfx('jump', { volume: 0.5 });
          if (event.type === 'attack' && event.id === 'hyungsub') { state.spears.push({ x: event.x, y: event.y, vx: event.facing * SPEAR_SPEED, life: SPEAR_LIFE, facing: event.facing }); game.sound.sfx('whoosh', { volume: 0.45, rate: 1.4 }); }
        }
        state.spears = updateSpears(level, state.spears, dt);
        if (!state.control && leader.dropped && state.phaseT > 1.9) state.control = true;
        state.cam = cameraX(level, leader);
      }
    };

    // ── 그리기 ──
    const drawFrame = () => {
      ctx.fillStyle = '#e9e9f0'; ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, SCREEN_W, 3); ctx.fillRect(0, 0, 3, SCREEN_H);
      ctx.fillStyle = '#b4b4c6'; ctx.fillRect(0, SCREEN_H - 4, SCREEN_W, 4); ctx.fillRect(SCREEN_W - 4, 0, 4, SCREEN_H);
      ctx.fillStyle = '#8f8fa6'; ctx.fillRect(VIEW_X - 2, VIEW_Y - 2, VIEW_W + 4, 2); ctx.fillRect(VIEW_X - 2, VIEW_Y - 2, 2, VIEW_H + 4);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(VIEW_X, VIEW_Y + VIEW_H, VIEW_W + 2, 2); ctx.fillRect(VIEW_X + VIEW_W, VIEW_Y, 2, VIEW_H + 2);
      ctx.fillStyle = '#1a1a26'; ctx.fillRect(VIEW_X - 1, VIEW_Y - 1, VIEW_W + 2, 1); ctx.fillRect(VIEW_X - 1, VIEW_Y - 1, 1, VIEW_H + 2);
    };
    const text = (str, x, y, { color = '#fff', align = 'left', size = F.size, shadow = true } = {}) => {
      ctx.font = size === F.size ? FONT : FONT.replace(`${F.size}px`, `${size}px`);
      ctx.textBaseline = 'top'; ctx.textAlign = align;
      if (shadow) { ctx.fillStyle = '#000'; ctx.fillText(str, Math.round(x) + 1, Math.round(y) + 1); }
      ctx.fillStyle = color; ctx.fillText(str, Math.round(x), Math.round(y));
    };
    const drawBackdrop = () => {
      const g = ctx.createLinearGradient(0, VIEW_Y, 0, VIEW_Y + VIEW_H);
      g.addColorStop(0, '#0c0416'); g.addColorStop(0.3, '#2a1048'); g.addColorStop(0.55, '#120620'); g.addColorStop(1, '#05020a');
      ctx.fillStyle = g; ctx.fillRect(VIEW_X, VIEW_Y, VIEW_W, VIEW_H);
      const t = state.t, px = state.cam * 0.25, baseY = VIEW_Y + 150;
      for (let x = 0; x < VIEW_W; x += 6) {
        const wx = x + px;
        const h = 18 + 12 * Math.sin(wx * 0.05 + t * 2.1) * Math.sin(wx * 0.013 - t * 0.7) + 7 * Math.sin(wx * 0.21 + t * 5.3) + 4 * Math.sin(wx * 0.9 + t * 11);
        ctx.fillStyle = 'rgba(98,44,170,0.55)'; ctx.fillRect(VIEW_X + x, Math.round(baseY - h), 6, Math.round(h) + 26);
        const h2 = h * 0.5 + 4 * Math.sin(wx * 0.33 + t * 7.7);
        ctx.fillStyle = 'rgba(190,130,255,0.5)'; ctx.fillRect(VIEW_X + x + 1, Math.round(baseY - h2), 4, Math.round(h2) + 8);
      }
      ctx.fillStyle = 'rgba(150,90,230,0.22)'; ctx.fillRect(VIEW_X, baseY + 2, VIEW_W, 12);
    };
    const drawActor = (actor) => {
      const sheet = sheets[actor.classId]?.img;
      const frame = frameOf(actor);
      const cx = Math.round(actor.x + actor.w / 2 - state.cam) + VIEW_X;
      const feet = Math.round(actor.y + actor.h) + VIEW_Y;
      if (sheet && sheet.complete && sheet.naturalWidth) {
        const sx = (frame % 2) * 48, sy = Math.floor(frame / 2) * 48;
        ctx.save();
        ctx.translate(cx, feet);
        if (actor.facing < 0) ctx.scale(-1, 1);
        ctx.drawImage(sheet, sx, sy, 48, 48, -24, -44, 48, 48);
        ctx.restore();
      } else {
        const cls = CLASSES.find(c => c.id === actor.classId);
        ctx.fillStyle = cls?.color || '#fff';
        ctx.fillRect(cx - 6, feet - actor.h, 12, actor.h);
        ctx.fillStyle = '#000'; ctx.fillRect(cx + (actor.facing > 0 ? 2 : -5), feet - actor.h + 5, 3, 3);
      }
    };
    const drawBox = (speaker, body, color = '#fff') => {
      const bx = VIEW_X + 14, by = VIEW_Y + VIEW_H - 84, bw = VIEW_W - 28, bh = 72;
      ctx.fillStyle = '#000'; ctx.fillRect(bx, by, bw, bh);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(bx + 1, by + 1, bw - 2, bh - 2);
      if (speaker) { ctx.fillStyle = '#000'; ctx.fillRect(bx + 8, by - 20, 64, 22); ctx.strokeRect(bx + 9, by - 19, 62, 20); text(speaker, bx + 40, by - 17, { align: 'center', shadow: false }); }
      const lines = wrap(body, bw - 40);
      lines.forEach((line, i) => text('* ' + line, bx + 16, by + 12 + i * 20, { color, shadow: false }));
    };
    const wrap = (str, width) => {
      ctx.font = FONT;
      const words = str.split(' '); const lines = []; let cur = '';
      for (const w of words) { const next = cur ? cur + ' ' + w : w; if (ctx.measureText('* ' + next).width > width && cur) { lines.push(cur); cur = w; } else cur = next; }
      if (cur) lines.push(cur); return lines;
    };
    const draw = () => {
      drawFrame();
      ctx.save(); ctx.beginPath(); ctx.rect(VIEW_X, VIEW_Y, VIEW_W, VIEW_H); ctx.clip();
      ctx.fillStyle = '#000'; ctx.fillRect(VIEW_X, VIEW_Y, VIEW_W, VIEW_H);
      if (state.phase === 'logo') {
        ctx.globalAlpha = state.logoAlpha;
        text('SUBRIO', VIEW_X + VIEW_W / 2, VIEW_Y + VIEW_H / 2 - 26, { align: 'center', size: 48, color: '#ffffff' });
        text('엄청 대박인 배 · 게임 속 게임', VIEW_X + VIEW_W / 2, VIEW_Y + VIEW_H / 2 + 34, { align: 'center', color: '#9a8cff' });
        ctx.globalAlpha = 1;
      } else if (state.phase === 'narration') {
        text('* ' + typer.visible, VIEW_X + VIEW_W / 2, VIEW_Y + VIEW_H / 2 - 8, { align: 'center' });
      } else if (state.phase === 'select' || state.phase === 'final') {
        text('* ' + NARRATION[3], VIEW_X + VIEW_W / 2, VIEW_Y + 26, { align: 'center' });
        CLASSES.forEach((cls, i) => {
          const a = state.icons[i]; if (a <= 0) return;
          ctx.globalAlpha = a;
          const icon = icons[cls.id]?.img, x = VIEW_X + ICON_X[i], y = VIEW_Y + 84;
          if (icon && icon.complete && icon.naturalWidth) ctx.drawImage(icon, x - 32, y, 64, 64);
          else { ctx.fillStyle = cls.color; ctx.fillRect(x - 24, y + 8, 48, 48); }
          text(cls.name, x, y + 72, { align: 'center', color: '#fff' });
          ctx.globalAlpha = 1;
        });
        if (state.cursorsShown) PLAYERS.forEach((p, i) => {
          const col = state.cursors[i], x = VIEW_X + ICON_X[col], y = VIEW_Y + 176 + i * 18;
          const picked = state.picked[i];
          ctx.fillStyle = p.color; ctx.beginPath(); ctx.moveTo(x - 6, y + 8); ctx.lineTo(x + 6, y + 8); ctx.lineTo(x, y); ctx.closePath(); ctx.fill();
          text(`${i + 1}P ${p.label}${picked ? ' ✓' : ''}`, x + 10, y - 2, { color: p.color });
        });
        if (state.dialogue) { const line = SELECT_LINES[state.dialogue.index]; drawBox(line.speaker, typer.visible, line.speaker ? '#fff' : '#fff'); }
        if (state.phase === 'final') drawBox(null, typer.visible);
      } else if (state.phase === 'flash' || state.phase === 'play') {
        if (state.phase === 'play' || state.phaseT > 0.4) {
          drawBackdrop();
          ctx.drawImage(baked.canvas, state.cam, 0, VIEW_W, VIEW_H, VIEW_X, VIEW_Y, VIEW_W, VIEW_H);
          for (const spear of state.spears) {
            const img = spearImg.img; const sx = Math.round(spear.x - state.cam) + VIEW_X, sy = Math.round(spear.y) + VIEW_Y;
            if (img && img.complete && img.naturalWidth) { ctx.save(); ctx.translate(sx + 12, sy + 3); if (spear.facing < 0) ctx.scale(-1, 1); ctx.drawImage(img, -12, -3); ctx.restore(); }
            else { ctx.fillStyle = '#e6d28c'; ctx.fillRect(sx, sy + 2, 20, 2); }
          }
          for (const actor of [...state.actors].reverse()) if (actor.active) drawActor(actor);
          state.actors.forEach((actor, i) => { const p = PLAYERS.find(q => q.id === actor.id); const cls = CLASSES.find(c => c.id === actor.classId); text(`${i + 1}P ${p.label} · ${cls.name}`, VIEW_X + 8, VIEW_Y + 6 + i * 16, { color: p.color }); });
        }
        if (state.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${state.flash})`; ctx.fillRect(VIEW_X, VIEW_Y, VIEW_W, VIEW_H); }
      }
      ctx.restore();
    };

    // ── 루프 ──
    let last = performance.now(), raf = 0;
    const frame = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (!state.exiting) update(dt);
      draw();
      raf = requestAnimationFrame(frame);
    };
    ov.fit(); addEventListener('resize', ov.fit);
    requestAnimationFrame(() => { ov.root.style.opacity = '1'; });
    raf = requestAnimationFrame(frame);
    window.__subrio = { state, level, finish, get phase() { return state.phase; }, skipTo(phase) { if (phase === 'play') { state.phase = 'flash'; state.phaseT = 0.9; } else { state.phase = phase; state.phaseT = 0; } } };
  });
}

const NO_INTENT = { left: false, right: false, jump: false, jumpHeld: false, crouch: false, attack: false, guard: false };

/** 레벨을 한 번 구워 둔다(매 프레임 타일 루프 금지). 타일 그림이 늦게 오면 그때 다시 칠한다 */
function bakeLevel(level) {
  const canvas = document.createElement('canvas');
  canvas.width = level.width; canvas.height = level.height;
  const paint = (img) => {
    const c = canvas.getContext('2d'); c.imageSmoothingEnabled = false;
    c.clearRect(0, 0, canvas.width, canvas.height);
    for (let r = 0; r < level.rows; r++) for (let x = 0; x < level.cols; x++) {
      const ch = level.tiles[r][x]; if (ch === '.') continue;
      const col = ATLAS_COLUMN[ch];
      if (img) c.drawImage(img, col * TILE, 0, TILE, TILE, x * TILE, r * TILE, TILE, TILE);
      else { c.fillStyle = ch === '#' ? '#3e1c6e' : ch === '=' ? '#6030a0' : '#804cc4'; c.fillRect(x * TILE, r * TILE, TILE, TILE); }
    }
  };
  paint(null);
  return { canvas, paint };
}
