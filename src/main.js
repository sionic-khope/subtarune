// ─────────────────────────────────────────────────────────────
// 엔트리. 게임 상태: field → dialogue / menu / fade
// 내부 해상도 320x240, 정수배 스케일.
// ─────────────────────────────────────────────────────────────
import { Input } from './core/input.js';
import { Sound, VOICES } from './core/audio.js';
import { makeCanvas, artToCanvas, drawBox, drawHeart, loadImageOptional } from './core/gfx.js';
import { TextBox, ScriptRunner } from './ui/dialogue.js';
import { FONT, F } from './ui/font.js';
import { TitleScreen } from './ui/title.js';
import { TileMap, Camera, createEntity, SCREEN_W, SCREEN_H, CHAR_SCALE } from './world/world.js';
import { loadTileOverrides } from './world/tiles.js';
import { TORSO, LEGS, PALETTES } from './data/art.js';
import { MAPS } from './data/maps.js';
import { SCRIPTS } from './data/scripts.js';
import L from './data/locale/ko.js';
import { CHARACTERS } from './data/characters.js';

const TEXT_SPEEDS = [
  { key: 'speed_slow', delay: 0.08 },
  { key: 'speed_normal', delay: 0.045 },
  { key: 'speed_fast', delay: 0.02 },
];

class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.sound = new Sound();
    this.flags = {};
    this.inventory = [];
    this.settings = { textSpeed: 1, sound: true };
    this.state = 'title';          // title | field | menu
    this.fade = { alpha: 0, dir: 0, cb: null };
    this.transitioning = false;
    this.debug = false;
    this.spriteOverrides = {};
    this.time = 0;
    this.menu = { index: 0, sub: null };
    this.shake = null;            // { time, amp }
    this.background = [];         // async 컷신 waiter
  }

  async load() {
    // 폰트, 스프라이트 오버라이드(assets/sprites/<name>.png), 타일 오버라이드
    try { await document.fonts.load(FONT); } catch {}
    await Promise.all([
      loadTileOverrides(),
      this.sound.loadVoiceFiles(Object.keys(VOICES)),
      this.sound.loadSfxFiles(['menu', 'confirm', 'cancel', 'open', 'close', 'item', 'door', 'chime', 'thud', 'battle_start', 'battle_end', 'laugh_junhee']),
      ...[...new Set([...Object.keys(CHARACTERS), ...Object.keys(PALETTES)])].map(async (name) => {
        const img = await loadImageOptional(`assets/sprites/${name}.png`);
        if (img) this.spriteOverrides[name] = img;
      }),
    ]);
    this.portraits = this.makePortraits();
    this.title = new TitleScreen(this);
    this.title.enter();
    this.textbox = new TextBox(this.sound, this.portraits);
    this.dialogue = new ScriptRunner(this.textbox, this);
    this.camera = new Camera();
    this.playerSprite = 'hyungsub';   // 기본 주인공 = 형섭 (기존 파란 후드 문자 도트는 사용 안 함)
    // 개발용: ?map=test&spawn=start 로 타이틀/오프닝 건너뛰고 바로 진입
    const q = new URLSearchParams(location.search);
    if (q.get('map') && MAPS[q.get('map')]) {
      this.flags.opening_seen = true;
      if (q.get('sprite')) this.playerSprite = q.get('sprite');
      this.changeMap(q.get('map'), q.get('spawn') || 'start', true);
      this.state = 'field';
    } else {
      this.changeMap('village', 'start', true);
    }
  }

  setPlayerSprite(name) {
    this.playerSprite = name;
    this.player.setSprite(name);
  }

  /** 초상화: assets/portraits/<name>.png (48x48) → 없으면 시트의 정면 얼굴 확대 → 없으면 문자 도트 얼굴 */
  makePortraits() {
    const out = {};
    for (const name of new Set([...Object.keys(CHARACTERS), ...Object.keys(PALETTES)])) {
      const c = makeCanvas(48, 48);
      const ctx = c.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      const sheet = this.spriteOverrides[name];
      if (sheet) {
        const fw = Math.floor(sheet.width / 4), fh = Math.floor(sheet.height / 4);
        const headH = Math.round(fh * 0.55);            // 정면 0번 프레임 상단 55% = 얼굴
        const scale = Math.min(48 / fw, 44 / headH);
        const dw = Math.round(fw * scale), dh = Math.round(headH * scale);
        ctx.drawImage(sheet, 0, 0, fw, headH, Math.round((48 - dw) / 2), 48 - dh - 2, dw, dh);
      } else {
        const pal = PALETTES[name] || PALETTES[CHARACTERS[name]?.palette] || PALETTES.hero;
        const face = artToCanvas([...TORSO.down.slice(0, 7), ...Array(9).fill('................')], pal);
        ctx.drawImage(face, 3, 0, 10, 8, 0, 4, 48, 40);
      }
      out[name] = c;
      loadImageOptional(`assets/portraits/${name}.png`).then((img) => { if (img) out[name] = img; });
    }
    return out;
  }

  // ── 맵 전환 ─────────────────────────────────────────────
  changeMap(mapId, spawnId, instant = false) {
    const go = () => {
      const def = MAPS[mapId];
      this.mapId = mapId;
      this.map = new TileMap(def);
      this.map.bake();
      this.entities = def.entities.map((e) => createEntity({ ...e }, this)).filter(Boolean);
      const spawn = def.spawns[spawnId] || def.spawns.start;
      this.player = createEntity({ type: 'player', sprite: this.playerSprite || 'hyungsub', ...spawn, facing: this.player?.facing ?? 'down' }, this);
      this.entities.push(this.player);
      // 문 위에서 스폰될 때 바로 되돌아가지 않도록 쿨다운
      for (const e of this.entities) if (e.cooldown !== undefined) e.cooldown = 0.6;
      this.camera.map = this.map;
      this.camera.target = this.player;
      this.camera.snap();
    };
    if (instant) { go(); return; }
    this.transitioning = true;
    this.fadeTo(1, 0.25, () => { go(); this.fadeTo(0, 0.25, () => { this.transitioning = false; }); });
  }

  fadeTo(target, duration, cb) {
    if (duration <= 0) { this.fade.alpha = target; this.fade.target = undefined; if (cb) cb(); return; }
    Object.assign(this.fade, { target, speed: 1 / duration, cb });
  }

  /** 타이틀에서 C: 오프닝 컷신이 있으면 먼저 재생 */
  startGame() {
    this.state = 'field';
    if (!this.flags.opening_seen && SCRIPTS.opening) this.runScript('opening');
    else this.fadeTo(0, 0.5);
  }

  spawn(def) {
    const e = createEntity({ ...def }, this);
    if (e) this.entities.push(e);
    return e;
  }

  // ── 스크립트 ────────────────────────────────────────────
  runScript(key, onEnd) {
    const script = SCRIPTS[key];
    if (!script) { console.warn('[script] 없음:', key); return; }
    this.player.moving = false;
    this.dialogue.start(script, onEnd);
  }

  // ── 루프 ────────────────────────────────────────────────
  update(dt) {
    this.time += dt;
    Input.poll();
    if (Input.just('debug')) this.debug = !this.debug;
    this.textbox.charDelay = TEXT_SPEEDS[this.settings.textSpeed].delay;
    this.sound.muted = !this.settings.sound;

    // 페이드
    if (this.fade.target !== undefined) {
      const d = Math.sign(this.fade.target - this.fade.alpha);
      this.fade.alpha += d * this.fade.speed * dt;
      if ((d > 0 && this.fade.alpha >= this.fade.target) || (d < 0 && this.fade.alpha <= this.fade.target) || d === 0) {
        this.fade.alpha = this.fade.target;
        const cb = this.fade.cb; this.fade.target = undefined; this.fade.cb = null;
        if (cb) cb();
      }
    }

    if (this.state === 'title') {
      this.title.update(dt, Input);
      return;
    }
    if (this.shake) { this.shake.time -= dt; if (this.shake.time <= 0) this.shake = null; }
    this.background = this.background.filter((w) => !w.update(dt, Input));

    if (this.dialogue.running) {
      this.dialogue.update(dt, Input);
      for (const e of this.entities) if (e !== this.player) e.update(dt, Input);
    } else if (this.state === 'menu') {
      this.updateMenu();
    } else if (!this.transitioning) {
      if (Input.just('confirm')) {
        const target = this.player.probe();
        if (target) { target.interact(this.player); }
      } else if (Input.just('menu')) {
        this.state = 'menu'; this.menu = { index: 0, sub: null }; this.sound.sfx('open');
      }
      for (const e of this.entities) e.update(dt, Input);
      this.entities = this.entities.filter((e) => !e.dead);
    }
    this.camera.follow(this.dialogue.running ? 0.05 : 0.18);
  }

  updateMenu() {
    const m = this.menu;
    const items = [L.menu_items, L.menu_settings, L.menu_close];
    if (m.sub === null) {
      if (Input.just('up')) { m.index = (m.index + 2) % 3; this.sound.sfx('menu'); }
      if (Input.just('down')) { m.index = (m.index + 1) % 3; this.sound.sfx('menu'); }
      if (Input.just('cancel') || (Input.just('confirm') && m.index === 2)) { this.state = 'field'; this.sound.sfx('close'); return; }
      if (Input.just('confirm')) { m.sub = m.index; m.subIndex = 0; this.sound.sfx('confirm'); }
    } else if (m.sub === 0) {
      if (Input.just('cancel') || Input.just('confirm')) { m.sub = null; this.sound.sfx('cancel'); }
    } else if (m.sub === 1) {
      if (Input.just('up')) { m.subIndex = (m.subIndex + 1) % 2; this.sound.sfx('menu'); }
      if (Input.just('down')) { m.subIndex = (m.subIndex + 1) % 2; this.sound.sfx('menu'); }
      if (Input.just('left') || Input.just('right') || Input.just('confirm')) {
        const dir = Input.just('left') ? -1 : 1;
        if (m.subIndex === 0) this.settings.textSpeed = (this.settings.textSpeed + dir + 3) % 3;
        else this.settings.sound = !this.settings.sound;
        this.sound.sfx('menu');
      }
      if (Input.just('cancel')) { m.sub = null; this.sound.sfx('cancel'); }
    }
  }

  draw() {
    const ctx = this.ctx;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    if (this.state === 'title') {
      this.title.draw(ctx);
      if (this.fade.alpha > 0) { ctx.fillStyle = `rgba(0,0,0,${this.fade.alpha})`; ctx.fillRect(0, 0, SCREEN_W, SCREEN_H); }
      return;
    }
    if (this.textbox.fullscreen) {
      this.textbox.draw(ctx);
      if (this.fade.alpha > 0) { ctx.fillStyle = `rgba(0,0,0,${this.fade.alpha})`; ctx.fillRect(0, 0, SCREEN_W, SCREEN_H); }
      return;
    }
    const cam = { x: Math.round(this.camera.x), y: Math.round(this.camera.y) };
    if (this.shake) { cam.x += Math.round((Math.random() * 2 - 1) * this.shake.amp); cam.y += Math.round((Math.random() * 2 - 1) * this.shake.amp); }

    this.map.draw(ctx, cam);
    // y 정렬: 아래 있는 엔티티가 앞에 그려진다
    const sorted = [...this.entities].sort((a, b) => (a.y + a.h) - (b.y + b.h));
    for (const e of sorted) e.draw(ctx, cam);

    // 상호작용 가능 표시 (말풍선 점)
    if (!this.dialogue.running && this.state === 'field') {
      const t = this.player.probe();
      if (t && Math.floor(this.time * 4) % 2 === 0) {
        const x = Math.round(t.cx - cam.x), y = Math.round(t.y - 6 - 16 * CHAR_SCALE - cam.y);
        ctx.fillStyle = '#fff'; ctx.fillRect(x - 3, y, 6, 4); ctx.fillRect(x - 1, y + 4, 2, 1);
        ctx.fillStyle = '#000'; ctx.fillRect(x - 2, y + 1, 1, 1); ctx.fillRect(x, y + 1, 1, 1); ctx.fillRect(x + 2, y + 1, 1, 1);
      }
    }

    this.textbox.draw(ctx);
    if (this.state === 'menu') this.drawMenu(ctx);

    if (this.fade.alpha > 0) {
      ctx.fillStyle = `rgba(0,0,0,${this.fade.alpha})`;
      ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    }
    if (this.debug) this.drawDebug(ctx, cam);
  }

  drawMenu(ctx) {
    const m = this.menu;
    ctx.font = FONT; ctx.textBaseline = 'top';
    const LH = F.lineH;
    drawBox(ctx, 8, 8, 100, LH * 3 + 16);
    const items = [L.menu_items, L.menu_settings, L.menu_close];
    items.forEach((label, i) => {
      ctx.fillStyle = m.sub === null && i === m.index ? '#ffe066' : '#fff';
      ctx.fillText(label, 30, 16 + i * LH);
      if (m.sub === null && i === m.index) drawHeart(ctx, 17, 16 + Math.round(F.size / 2) - 3 + i * LH);
    });
    if (m.sub === 0) {
      drawBox(ctx, 116, 8, 190, LH * 3 + 16);
      ctx.fillStyle = '#fff';
      if (!this.inventory.length) ctx.fillText(L.no_items, 124, 16);
      this.inventory.forEach((it, i) => ctx.fillText('* ' + it, 124, 16 + i * LH));
    }
    if (m.sub === 1) {
      drawBox(ctx, 116, 8, 196, LH * 2 + 16);
      const rows = [
        [L.setting_text_speed, L[TEXT_SPEEDS[this.settings.textSpeed].key]],
        [L.setting_sound, this.settings.sound ? L.on : L.off],
      ];
      rows.forEach(([k, v], i) => {
        ctx.fillStyle = i === m.subIndex ? '#ffe066' : '#fff';
        ctx.fillText(k, 138, 16 + i * LH);
        ctx.fillText('< ' + v + ' >', 232, 16 + i * LH);
        if (i === m.subIndex) drawHeart(ctx, 125, 16 + Math.round(F.size / 2) - 3 + i * LH);
      });
    }
  }

  drawDebug(ctx, cam) {
    ctx.strokeStyle = 'rgba(255,0,0,0.8)';
    for (const e of this.entities) ctx.strokeRect(e.x - cam.x + 0.5, e.y - cam.y + 0.5, e.w, e.h);
    ctx.font = FONT; ctx.textBaseline = 'top'; ctx.fillStyle = '#0f0';
    const p = this.player;
    ctx.fillText(`${this.mapId} (${Math.round(p.x)},${Math.round(p.y)}) ${p.facing} fps:${Math.round(1 / this.dt)}`, 4, SCREEN_H - 14);
    ctx.fillText('flags: ' + JSON.stringify(this.flags), 4, SCREEN_H - 28);
  }
}

// ── 부트 ────────────────────────────────────────────────────
const canvas = document.getElementById('screen');
const game = new Game(canvas);
window.game = game;   // 콘솔 디버깅용

function resize() {
  const s = Math.max(1, Math.min(Math.floor(innerWidth / SCREEN_W), Math.floor((innerHeight - 24) / SCREEN_H)));
  canvas.style.width = SCREEN_W * s + 'px';
  canvas.style.height = SCREEN_H * s + 'px';
}
addEventListener('resize', resize);
resize();

Input.init();
// 브라우저 정책상 오디오는 사용자 입력 후에만 켜진다 → 첫 키/클릭에서 언락
const unlock = () => game.sound.unlock();
Input.onAnyKey = unlock;
canvas.addEventListener('pointerdown', unlock);

await game.load();

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  game.dt = dt;
  game.update(dt);
  game.draw();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
