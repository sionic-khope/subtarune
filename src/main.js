// ─────────────────────────────────────────────────────────────
// 엔트리. 게임 상태: field → dialogue / menu / fade
// 내부 해상도 320x240, 정수배 스케일.
// ─────────────────────────────────────────────────────────────
import { Input } from './core/input.js';
import { Sound, VOICES } from './core/audio.js';
import { makeCanvas, artToCanvas, drawBox, drawHeart, loadImageOptional, monoPortrait } from './core/gfx.js';
import { TextBox, ScriptRunner } from './ui/dialogue.js';
import { FONT, F } from './ui/font.js';
import { TitleScreen } from './ui/title.js';
import { StreamChat } from './ui/chat.js';
import { SysDialog } from './ui/sysdialog.js';
import { Vortex } from './ui/vortex.js';
import { DotBubble } from './ui/bubble.js';
import { TileMap, Camera, createEntity, SCREEN_W, SCREEN_H, CHAR_SCALE, RENDER_SCALE } from './world/world.js';
import { loadTileOverrides } from './world/tiles.js';
import { TORSO, LEGS, PALETTES } from './data/art.js';
import { MAPS } from './data/maps.js';
import { SCRIPTS } from './data/scripts.js';
import L from './data/locale/ko.js';
import { CHARACTERS } from './data/characters.js';
import { Story, STAGES, QA_POINTS } from './core/story.js';

const TEXT_SPEEDS = [
  { key: 'speed_slow', delay: 0.06 },
  { key: 'speed_normal', delay: 0.033 },   // 언더테일 기본(1글자/2프레임)
  { key: 'speed_fast', delay: 0.016 },
];

class Game {
  constructor(canvas) {
    this.canvas = canvas;
    canvas.width = SCREEN_W * RENDER_SCALE;
    canvas.height = SCREEN_H * RENDER_SCALE;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.sound = new Sound();
    this.flags = {};
    this.story = new Story(this.flags);   // 스토리 단계(src/core/story.js). 단계 id = flags 키
    this.inventory = [];
    this.party = [];                      // 동료 캐릭터 id 순서 (예: ['ppaman']) — src/data/characters.js 키. 저장/복원됨
    this.settings = { textSpeed: 1, sound: true };
    this.state = 'title';          // title | field | menu
    this.fade = { alpha: 0, dir: 0, cb: null, color: '0,0,0' };
    this.transitioning = false;
    this.debug = false;
    this.spriteOverrides = {};
    this.time = 0;
    this.menu = { index: 0, sub: null };
    this.shake = null;            // { time, amp }
    this.caption = null;          // { text, time, duration } 지역 이름 표시
    this.curtain = null;          // 'black'|'white': 맵 위를 완전히 덮는 막 (컷신용)
    this.background = [];         // async 컷신 waiter
    this.zoom = { s: 1, fx: 0, fy: 0, smax: 1, tween: null };   // 2D 월드 줌 (TV 로 빨려 들어가는 전환 등). UI 는 안 줌됨
    this.scene3d = null;          // 3D 오버레이 씬(src/scenes/*) 실행 중이면 true — Esc 등 게임 입력 무시
    this.ride = null;             // 타고 있는 탈것(Raft 등) — 있으면 플레이어 입력 정지
  }

  /**
   * 월드를 (fx,fy) 월드 좌표 쪽으로 s 배 줌. s=1 이면 원래대로. duration 초 동안 easeInOut.
   * 줌 중심은 s 가 커질수록 화면 중앙으로 이동해서 1→s→1 이 튐 없이 이어진다.
   */
  zoomTo(s, [fx, fy] = [this.zoom.fx, this.zoom.fy], duration = 0.8, cb = null) {
    const z = this.zoom;
    z.fx = fx; z.fy = fy;
    z.smax = s > 1 ? s : Math.max(z.smax, z.s);
    if (duration <= 0) { z.s = s; z.tween = null; if (cb) cb(); return; }
    z.tween = { from: z.s, to: s, t: 0, dur: duration, cb };
  }

  async load() {
    // 폰트, 스프라이트 오버라이드(assets/sprites/<name>.png), 타일 오버라이드
    try { await document.fonts.load(FONT); } catch {}
    this.mapImages = {};
    this.propImages = {};
    // 에디터가 저장한 JSON 맵(assets/maps/*.json) 을 코드 맵 위에 덮어씀
    try {
      const idx = await (await fetch('assets/maps/index.json?v=' + Date.now())).json();
      await Promise.all((idx.maps || []).map(async (id) => {
        try { MAPS[id] = await (await fetch(`assets/maps/${id}.json?v=` + Date.now())).json(); } catch (e) { console.warn('[map] 로드 실패', id, e); }
      }));
    } catch {}
    const propSrcs = new Set();
    for (const m of Object.values(MAPS)) { for (const e of (m.entities || [])) if (e.image) propSrcs.add(e.image); for (const src of (m.preload || [])) propSrcs.add(src); }   // 엔티티 이미지 + 컷신에서 spawn 할 이미지(preload)
    await Promise.all([
      ...[...propSrcs].map(async (src) => { this.propImages[src] = await loadImageOptional(src); }),
      ...Object.entries(MAPS).filter(([, m]) => m.image).map(async ([id, m]) => { this.mapImages[id] = await loadImageOptional(m.image); }),
      loadTileOverrides(),
      this.sound.loadVoiceFiles(Object.keys(VOICES)),
      this.sound.loadSfxFiles(['menu', 'confirm', 'cancel', 'open', 'close', 'item', 'door', 'chime', 'thud', 'white', 'battle_start', 'battle_end', 'laugh_junhee', 'error', 'plug', 'click', 'whoosh', 'splash', 'rumble']),
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
    this.chat = new StreamChat();        // 방송 채팅창 오버레이 (컷신 {chat})
    this.sysdialog = new SysDialog();    // 시스템 오류창 (컷신 {dialog})
    this.vortex = new Vortex();          // 소용돌이 이펙트 (컷신 {vortex})
    this.bubble = new DotBubble();       // 머리 위 '...' 말풍선 (컷신 {bubble})
    this.playerSprite = 'hyungsub';   // 기본 주인공 = 형섭 (기존 파란 후드 문자 도트는 사용 안 함)
    // 개발용: ?map=test&spawn=start 로 타이틀/오프닝 건너뛰고 바로 진입
    const q = new URLSearchParams(location.search);
    const qa = q.get('qa') && QA_POINTS.find((x) => x.id === q.get('qa'));
    if (qa) { this.devJump(qa); }
    else if ((q.get('map') && MAPS[q.get('map')]) || (q.get('stage') && Story.isStage(q.get('stage')))) {
      if (q.get('sprite')) this.playerSprite = q.get('sprite');
      this.devJump({ map: q.get('map'), spawn: q.get('spawn'), stage: q.get('stage') });   // 단계 backfill 포함
    } else {
      this.changeMap('room', 'bed', true, { bgm: false });   // 부팅 시 타이틀 뒤에 준비만 — 방 브금이 타이틀/시작 순간에 새지 않게
    }
  }

  // ── 상태 시스템 ─────────────────────────────────────────
  /** 플래그를 세운다. 스토리 단계 id 면 단계를 올리며 앞 단계도 채운다(story.js). 상태 변경은 전부 여기로. */
  setFlag(key, value = true) {
    if (value === true && Story.isStage(key)) { if (this.story.advance(key)) this.autosave(); return; }
    this.flags[key] = value;
  }
  /** 플래그/단계 확인 (단계 플래그는 backfill 돼 있으므로 flags 만 보면 된다) */
  has(key) { return !!this.flags[key]; }
  static SAVE_KEY = 'subtarune.save.v1';
  hasSave() { try { return !!localStorage.getItem(Game.SAVE_KEY); } catch { return false; } }
  /** 자동 저장: 단계가 오를 때·맵을 옮길 때·스크립트가 끝날 때(필드에서만) */
  autosave() {
    if (this.state !== 'field' || !this.player || !this.mapId || this.mapId === 'test') return;
    const data = { v: 1, story: this.story.toJSON(), flags: this.flags, inventory: this.inventory, party: this.party, map: this.mapId, x: Math.round(this.player.x), y: Math.round(this.player.y), facing: this.player.facing, sprite: this.playerSprite, settings: this.settings, t: Date.now() };
    try { localStorage.setItem(Game.SAVE_KEY, JSON.stringify(data)); } catch {}
  }
  clearSave() { try { localStorage.removeItem(Game.SAVE_KEY); } catch {} }
  /** 타이틀에서 '이어하기' */
  continueGame() {
    let d = null; try { d = JSON.parse(localStorage.getItem(Game.SAVE_KEY)); } catch {}
    if (!d || !MAPS[d.map]) { this.startGame(); return; }
    this.flags = {}; this.story = new Story(this.flags); this.story.load(d.story);
    Object.assign(this.flags, d.flags || {});           // side flag 복원 (단계 플래그는 load 가 backfill)
    this.inventory = [...(d.inventory || [])]; this.party = [...(d.party || [])]; this.settings = { ...this.settings, ...(d.settings || {}) };
    this.playerSprite = d.sprite || 'hyungsub';
    this.state = 'field';
    this.changeMap(d.map, null, true);
    if (typeof d.x === 'number') { this.player.x = d.x; this.player.y = d.y; this.player.facing = d.facing || 'down'; this.camera.snap(); }
    this.fadeTo(0, 0.5);
  }
  /** 개발용 바로가기(?map= / ?stage=): 그 지점까지의 스토리 단계를 전부 채워서 상태 꼬임을 막는다 */
  devJump({ map, spawn, stage, flags, party }) {
    if (stage && Story.isStage(stage)) { this.story.advance(stage); const def = Story.stageOf(stage); map = map || def.map; spawn = spawn || def.spawn; }
    if (flags) Object.assign(this.flags, flags);   // QA 지점의 side flag (예: 다리 내려온 상태)
    if (party) this.party = [...party];             // QA 지점의 동료 구성
    if (map && MAPS[map]?.stage) this.story.advance(MAPS[map].stage);
    if (!this.has('opening_seen')) this.story.advance('opening_seen');
    this.changeMap(map, spawn || 'start', true);
    this.state = 'field';
  }

  // ── 파티(동료) ──────────────────────────────────────────
  /** 현재 맵에 party 순서대로 Follower 를 주인공 뒤에 세운다 (맵 전환·가입 직후) */
  spawnParty() {
    this.entities = this.entities.filter((e) => e.def?.type !== 'follower');
    this.party.forEach((id, i) => {
      const f = createEntity({ type: 'follower', id, sprite: id, x: this.player.x, y: this.player.y, facing: this.player.facing, slot: i + 1 }, this);
      if (f) this.entities.push(f);
    });
    this.player.trail = [];
  }
  /** 동료 가입: 맵의 같은 id NPC 를 제거하고 뒤에 붙인다. 이미 있으면 무시 */
  joinParty(id) {
    if (this.party.includes(id)) return false;
    this.party.push(id);
    for (const e of this.entities) if (e.def?.type === 'npc' && e.id === id) e.dead = true;
    this.spawnParty();
    this.autosave();
    return true;
  }
  leaveParty(id) { this.party = this.party.filter((x) => x !== id); this.spawnParty(); }

  /** 맵 JSON `tileSwaps: { <플래그>: { rows: { "<행>": "<새 행 문자열>" } } }` 를 적용하고 다시 굽는다 (레버로 다리 내려오기 등) */
  applyTiles(key, bake = true) {
    const sw = MAPS[this.mapId]?.tileSwaps?.[key];
    if (!sw) { console.warn('[tiles] 없는 tileSwaps', key); return; }
    for (const [row, str] of Object.entries(sw.rows || {})) this.map.rows[+row] = str;
    if (bake) this.map.bake();
  }

  /** 맵 JSON `backdrop:'purple_fire'` — 허공 너머 멀리서 지글지글 끓는 보라색 불 (화면 좌표, 카메라 x 의 1/4 만큼 흐름) */
  drawBackdrop(ctx, cam) {
    const t = this.time, px = cam.x * 0.25;
    const g = ctx.createLinearGradient(0, 0, 0, SCREEN_H); g.addColorStop(0, '#0c0416'); g.addColorStop(0.28, '#2a1048'); g.addColorStop(0.42, '#120620'); g.addColorStop(0.6, '#000');
    ctx.fillStyle = g; ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    const baseY = 118;
    for (let x = -6; x < SCREEN_W + 6; x += 6) {
      const wx = x + px;
      const h = 20 + 14 * Math.sin(wx * 0.05 + t * 2.1) * Math.sin(wx * 0.013 - t * 0.7) + 8 * Math.sin(wx * 0.21 + t * 5.3) + 5 * Math.sin(wx * 0.9 + t * 11);
      ctx.fillStyle = 'rgba(98,44,170,0.6)'; ctx.fillRect(x, Math.round(baseY - h), 6, Math.round(h) + 30);
      const h2 = h * 0.5 + 5 * Math.sin(wx * 0.33 + t * 7.7);
      ctx.fillStyle = 'rgba(190,130,255,0.55)'; ctx.fillRect(x + 1, Math.round(baseY - h2), 4, Math.round(h2) + 8);
    }
    ctx.fillStyle = 'rgba(150,90,230,0.25)'; ctx.fillRect(0, baseY + 2, SCREEN_W, 14);   // 불빛 번짐
    for (let i = 0; i < 36; i++) {                                                       // 불티
      const life = (t * 22 + i * 53) % 110, sx = ((i * 137 + t * 9 * (1 + (i % 3))) % (SCREEN_W + 20)) - 10, sy = baseY - life;
      ctx.fillStyle = `rgba(235,205,255,${(1 - life / 110) * 0.8})`; ctx.fillRect(Math.round(sx), Math.round(sy), 2, 2);
    }
  }

  /** ESC: 메인(타이틀)으로 */
  toTitle() {
    this.transitioning = true;
    this.sound.stopBgm(0.4); this.sound.stopIntro(0.2);
    this.dialogue.script = null; this.dialogue.wait = null; this.textbox.close();
    this.background = []; this.curtain = null; this.caption = null; this.shake = null;
    this.zoom = { s: 1, fx: 0, fy: 0, smax: 1, tween: null };   // 줌 도중 Esc 로 나와도 다음 게임이 확대된 채 시작되지 않게
    this.chat.stop(); this.sysdialog.hide(); this.vortex.stop(); this.ride = null; this.bubble.done = true;
    this.fadeTo(1, 0.4, () => {
      this.flags = {}; this.story = new Story(this.flags); this.inventory = []; this.party = [];
      this.changeMap('room', 'bed', true, { bgm: false });   // 타이틀에서 방 브금이 새지 않게
      this.state = 'title'; this.title.enter();
      this.transitioning = false;
      this.fadeTo(0, 0.3);
    }, 'black');
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
      // 대화창 초상화는 언더테일처럼 흰/검 2톤 도트로 (사용자 확정 2026-09-09)
      out[name] = monoPortrait(c);
      loadImageOptional(`assets/portraits/${name}.png`).then((img) => { if (img) out[name] = monoPortrait(img, { scale: 2, threshold: CHARACTERS[name]?.portraitThreshold }); });   // 96px 시트 → 48px 대화창 1:1
    }
    return out;
  }

  // ── 맵 전환 ─────────────────────────────────────────────
  changeMap(mapId, spawnId, instant = false, { bgm = true } = {}) {
    const go = () => {
      const def = MAPS[mapId];
      this.mapId = mapId;
      this.map = new TileMap({ ...def, rows: def.rows ? [...def.rows] : def.rows }, this.mapImages?.[mapId] || null);   // rows 는 복사 (tileSwaps 가 원본을 안 건드리게)
      for (const key of Object.keys(def.tileSwaps || {})) if (this.has(key)) this.applyTiles(key, false);   // 플래그가 선 타일 교체는 처음부터 적용
      this.map.bake();
      // 엔티티 조건: unless:'플래그' (플래그가 서면 안 나옴, 예: 먹은 에그타르트) / requires:'플래그' (서야 나옴)
      this.entities = def.entities
        .filter((e) => !(e.unless && this.has(e.unless)) && !(e.requires && e.type !== 'door' && !this.has(e.requires)))
        .map((e) => createEntity({ ...e }, this)).filter(Boolean);
      const spawn = def.spawns[spawnId] || def.spawns.start || Object.values(def.spawns)[0];   // 이어하기(위치는 세이브가 덮어씀) 대비
      this.player = createEntity({ type: 'player', sprite: this.playerSprite || 'hyungsub', ...spawn, facing: spawn.facing ?? this.player?.facing ?? 'down' }, this);   // 스폰에 facing 을 주면 그 방향(QA 지점 등)
      this.entities.push(this.player);
      this.spawnParty();
      // 문 위에서 스폰될 때 바로 되돌아가지 않도록 쿨다운
      for (const e of this.entities) if (e.cooldown !== undefined) e.cooldown = 0.6;
      this.camera.map = this.map;
      this.camera.target = this.player;
      this.camera.snap();
      if (bgm && def.bgm && !this.dialogue.running && this.state !== 'title') this.sound.playBgm(def.bgm, { volume: 0.45 });   // 타이틀 상태(부팅·Esc)에선 맵 브금을 절대 틀지 않는다
    };
    // 맵 JSON `enter: { script, flag? }` — 도착(페이드 인 끝) 직후 스크립트 1회. flag 가 있으면 그 플래그로 영구 1회
    const enter = () => {
      const en = MAPS[mapId].enter;
      if (!en || !en.script || this.dialogue.running) return;
      if (en.flag && this.has(en.flag)) return;
      if (en.flag) this.setFlag(en.flag);
      this.runScript(en.script);
    };
    if (instant) { go(); enter(); return; }
    this.transitioning = true;
    this.fadeTo(1, 0.25, () => { go(); this.fadeTo(0, 0.25, () => { this.transitioning = false; this.autosave(); enter(); }, 'black'); }, 'black');   // 문 전환은 항상 검은색 (직전 컷신이 흰 페이드를 썼어도)
  }

  fadeTo(target, duration, cb, color) {
    if (this.fade.cb) { const old = this.fade.cb; this.fade.cb = null; this.fade.target = undefined; old(); }   // 덮어쓰인 페이드의 waiter 를 풀어준다 → 컷신이 영원히 멈추지 않음
    if (color) this.fade.color = color === 'white' ? '255,255,255' : '0,0,0';
    if (duration <= 0) { this.fade.alpha = target; this.fade.target = undefined; if (cb) cb(); return; }
    Object.assign(this.fade, { target, speed: 1 / duration, cb });
  }

  /** 타이틀에서 새 게임: 세이브 삭제 → 오프닝 컷신 */
  startGame() {
    this.clearSave();
    this.flags = {}; this.story = new Story(this.flags); this.inventory = []; this.party = [];
    this.changeMap('room', 'bed', true, { bgm: false });   // 방 브금은 오프닝 컷신이 흰색 뒤에 직접 튼다
    this.state = 'field';
    if (SCRIPTS.opening) this.runScript('opening');
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
    this.dialogue.start(script, () => { if (onEnd) onEnd(); this.autosave(); });
  }

  // ── 루프 ────────────────────────────────────────────────
  update(dt) {
    this.time += dt;
    Input.poll();
    if (Input.just('debug')) this.debug = !this.debug;
    if (Input.just('title') && this.state !== 'title' && !this.transitioning && !this.scene3d && !this.zoom.tween) { this.toTitle(); return; }
    this.textbox.charDelay = TEXT_SPEEDS[this.settings.textSpeed].delay;
    if (this.sound.muted !== !this.settings.sound) { this.sound.muted = !this.settings.sound; if (this.sound.bgm) this.sound._ramp(this.sound.bgm, this.sound.muted ? 0 : (this.sound.bgmVolume ?? 0.35), 0.2); }

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
    if (this.zoom.tween) {
      const tw = this.zoom.tween; tw.t = Math.min(tw.dur, tw.t + dt);
      const k = tw.t / tw.dur, e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;   // easeInOutCubic
      this.zoom.s = tw.from + (tw.to - tw.from) * e;
      if (tw.t >= tw.dur) { this.zoom.s = tw.to; this.zoom.tween = null; if (tw.cb) tw.cb(); }
    }
    if (this.caption) { this.caption.time += dt; if (this.caption.time >= this.caption.duration) this.caption = null; }
    this.chat.update(dt); this.sysdialog.update(dt); this.vortex.update(dt); this.bubble.update(dt);
    this.background = this.background.filter((w) => !w.update(dt, Input));

    if (this.dialogue.running) {
      this.dialogue.update(dt, Input);
      for (const e of this.entities) if (e !== this.player) e.update(dt, Input);
    } else if (this.ride) {                                   // 뗏목 등 탈것에 실려 가는 중: 입력·트리거 정지
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
    const N = 4;   // 아이템 / 파티 / 설정 / 닫기
    if (m.sub === null) {
      if (Input.just('up')) { m.index = (m.index + N - 1) % N; this.sound.sfx('menu'); }
      if (Input.just('down')) { m.index = (m.index + 1) % N; this.sound.sfx('menu'); }
      if (Input.just('cancel') || (Input.just('confirm') && m.index === 3)) { this.state = 'field'; this.sound.sfx('close'); return; }
      if (Input.just('confirm')) { m.sub = m.index; m.subIndex = 0; this.sound.sfx('confirm'); }
    } else if (m.sub === 0 || m.sub === 1) {          // 아이템 / 파티: 보기만
      if (Input.just('cancel') || Input.just('confirm')) { m.sub = null; this.sound.sfx('cancel'); }
    } else if (m.sub === 2) {                          // 설정
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
    // 논리 좌표 320x240 → 물리 640x480. 고해상 스프라이트(2x 시트)는 1:1 로 찍힌다
    ctx.setTransform(RENDER_SCALE, 0, 0, RENDER_SCALE, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    if (this.state === 'title') {
      this.title.draw(ctx);
      if (this.fade.alpha > 0) { ctx.fillStyle = `rgba(${this.fade.color},${this.fade.alpha})`; ctx.fillRect(0, 0, SCREEN_W, SCREEN_H); }
      return;
    }
    if (this.curtain && !this.textbox.fullscreen) {
      ctx.fillStyle = this.curtain === 'white' ? '#fff' : '#000';
      ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
      this.textbox.draw(ctx);
      if (this.fade.alpha > 0) { ctx.fillStyle = `rgba(${this.fade.color},${this.fade.alpha})`; ctx.fillRect(0, 0, SCREEN_W, SCREEN_H); }
      return;
    }
    if (this.textbox.fullscreen) {
      this.textbox.draw(ctx);
      if (this.fade.alpha > 0) { ctx.fillStyle = `rgba(${this.fade.color},${this.fade.alpha})`; ctx.fillRect(0, 0, SCREEN_W, SCREEN_H); }
      return;
    }
    const cam = { x: Math.round(this.camera.x), y: Math.round(this.camera.y) };
    if (this.shake) { cam.x += Math.round((Math.random() * 2 - 1) * this.shake.amp); cam.y += Math.round((Math.random() * 2 - 1) * this.shake.amp); }
    if (MAPS[this.mapId]?.backdrop === 'purple_fire') this.drawBackdrop(ctx, cam);

    // 2D 줌: 월드(맵·엔티티·어두움)만 확대, UI 는 그대로
    ctx.save();
    const z = this.zoom;
    if (z.s > 1.0001) {
      const Fx = z.fx - cam.x, Fy = z.fy - cam.y;                       // 줌 초점(화면 좌표)
      const k = z.smax > 1 ? Math.min(1, (z.s - 1) / (z.smax - 1)) : 1; // 0(원래) → 1(최대 줌): 초점이 화면 중앙으로
      const Cx = Fx + (SCREEN_W / 2 - Fx) * k, Cy = Fy + (SCREEN_H / 2 - Fy) * k;
      ctx.translate(Cx, Cy); ctx.scale(z.s, z.s); ctx.translate(-Fx, -Fy);
    }
    this.map.draw(ctx, cam);
    // y 정렬: 아래 있는 엔티티가 앞에 그려진다
    // y 정렬: 아래 있는 엔티티가 앞. 누운 플레이어는 침대 위에 보여야 하므로 맨 뒤(위)에 그린다
    const onProp = (e) => e === this.player && this.entities.some((p) => p.def.type === 'prop' && p.solid && p.overlaps(e.rect));
    const key = (e) => (e.def?.sortY ?? (e.y + e.h)) + (e.pose === 'lying' || onProp(e) || (this.ride && e === this.player) ? 10000 : 0);   // sortY: 항상 뒤에 그릴 소품 / 탈것에 탄 플레이어는 항상 위(덮이지 않게)
    const sorted = [...this.entities].sort((a, b) => key(a) - key(b));
    for (const e of sorted) e.draw(ctx, cam);
    this.bubble.draw(ctx, cam);
    this.vortex.draw(ctx, cam);
    // 맵 JSON `dim: 0~1` — 살짝 어두운 공간(거실 등). 대화창/UI 는 어두워지지 않는다
    const dim = MAPS[this.mapId]?.dim;
    if (dim) { ctx.fillStyle = `rgba(0,0,0,${dim})`; ctx.fillRect(-SCREEN_W * 2, -SCREEN_H * 2, SCREEN_W * 5, SCREEN_H * 5); }
    ctx.restore();
    // 방송 채팅창(물리 해상도, 오른쪽) → 오류창 → 대화창 순서로 겹친다
    if (this.chat.open) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); this.chat.draw(ctx, 244); ctx.restore(); }
    this.sysdialog.draw(ctx);

    this.textbox.draw(ctx);
    if (this.caption) this.drawCaption(ctx);
    if (this.sound.muted) { ctx.font = FONT; ctx.textBaseline = 'top'; ctx.fillStyle = '#ff8080'; ctx.fillText('사운드 꺼짐 (V→설정)', SCREEN_W - 170, 6); }
    if (this.state === 'menu') this.drawMenu(ctx);

    if (this.fade.alpha > 0) {
      ctx.fillStyle = `rgba(${this.fade.color},${this.fade.alpha})`;
      ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    }
    if (this.debug) this.drawDebug(ctx, cam);
  }

  drawMenu(ctx) {
    const m = this.menu;
    ctx.font = FONT; ctx.textBaseline = 'top';
    const LH = F.lineH;
    drawBox(ctx, 8, 8, 100, LH * 4 + 16);
    const items = [L.menu_items, L.menu_party, L.menu_settings, L.menu_close];
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
    if (m.sub === 1) this.drawParty(ctx, 116, 8);
    if (m.sub === 2) {
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

  /** 파티 상태창: 리더(요플래/형섭) + 동료들 — 흰검 초상화, 표시 이름, 역할, 한 줄 상태 (전투 없음 → HP 대신 상태) */
  drawParty(ctx, x, y) {
    const LH = F.lineH, members = [this.playerSprite || 'hyungsub', ...this.party];
    const rowH = 58, w = 236, h = rowH * members.length + 14;
    drawBox(ctx, x, y, w, h);
    ctx.font = FONT; ctx.textBaseline = 'top';
    members.forEach((id, i) => {
      const ch = CHARACTERS[id] || { name: id }; const ry = y + 8 + i * rowH;
      const face = this.portraits[id]; if (face) ctx.drawImage(face, x + 10, ry + 2, 48, 48);
      const name = i === 0 ? (this.has('void_fallen') ? '요플래' : ch.name) : (ch.partyName || ch.name);
      ctx.fillStyle = '#ffe066'; ctx.fillText(name, x + 68, ry + 3);
      ctx.fillStyle = '#fff'; ctx.fillText(i === 0 ? L.party_leader : L.party_member, x + 68, ry + 3 + LH);
      ctx.fillStyle = '#9a9ab0'; ctx.fillText(ch.partyDesc || (i === 0 ? L.party_desc_leader : L.party_desc_member), x + 68, ry + 3 + LH * 2);
    });
  }

  /** 지역 이름 캡션: 페이드 인 → 유지 → 페이드 아웃 (언더테일 지역명처럼) */
  drawCaption(ctx) {
    const c = this.caption, k = c.time / c.duration;
    const a = k < 0.2 ? k / 0.2 : k > 0.75 ? (1 - k) / 0.25 : 1;
    ctx.globalAlpha = Math.max(0, Math.min(1, a));
    ctx.font = FONT; ctx.textBaseline = 'top'; ctx.textAlign = 'center';
    ctx.fillStyle = '#000'; ctx.fillText(c.text, SCREEN_W / 2 + 1, 41);
    ctx.fillStyle = '#fff'; ctx.fillText(c.text, SCREEN_W / 2, 40);
    ctx.textAlign = 'left'; ctx.globalAlpha = 1;
  }

  drawDebug(ctx, cam) {
    ctx.strokeStyle = 'rgba(255,0,0,0.8)';
    for (const e of this.entities) ctx.strokeRect(e.x - cam.x + 0.5, e.y - cam.y + 0.5, e.w, e.h);
    ctx.font = FONT; ctx.textBaseline = 'top'; ctx.fillStyle = '#0f0';
    const p = this.player;
    ctx.fillText(`${this.mapId} (${Math.round(p.x)},${Math.round(p.y)}) ${p.facing} fps:${Math.round(1 / this.dt)}`, 4, SCREEN_H - 14);
    ctx.fillText(`stage: ${this.story.stage}  flags: ` + JSON.stringify(this.flags), 4, SCREEN_H - 28);
    ctx.fillText(this.sound.info, 4, SCREEN_H - 42);
    const d = this.dialogue, node = d.script?.[d.i - 1];
    ctx.fillText(`script: running=${d.running} i=${d.i} wait=${d.wait ? 'y' : 'n'} node=${node ? Object.keys(node).slice(0, 3).join(',') : '-'} curtain=${this.curtain} fade=${this.fade.alpha.toFixed(2)} zoom=${this.zoom.s.toFixed(2)} scene3d=${this.scene3d}`, 4, SCREEN_H - 56);
  }
}

// ── 부트 ────────────────────────────────────────────────────
export const BUILD = '2026-09-10.11';
const canvas = document.getElementById('screen');
const game = new Game(canvas);
window.game = game;   // 콘솔 디버깅용

function resize() {
  // 0.5 단위 CSS 배율 (레티나에선 0.5 도 정수 픽셀). 최소 2 = 640x480
  const raw = Math.min(innerWidth / SCREEN_W, innerHeight / SCREEN_H);
  const s = Math.max(1, Math.floor(raw * 2) / 2);
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
