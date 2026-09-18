// ─────────────────────────────────────────────────────────────
// 엔트리. 게임 상태: field → dialogue / menu / fade
// 내부 해상도 320x240, 정수배 스케일.
// ─────────────────────────────────────────────────────────────
import { Input } from './core/input.js';
import { Sound, VOICES } from './core/audio.js';
import { makeCanvas, artToCanvas, drawBox, drawHeart, loadImageOptional, monoPortrait, pixelDisplayScale } from './core/gfx.js';
import { TextBox, ScriptRunner } from './ui/dialogue.js';
import { FONT, F } from './ui/font.js';
import { MENU_LAYOUT, menuWindow, menuInventoryRows, drawMenuText } from './ui/menu-layout.js';
import { TitleScreen } from './ui/title.js';
import { Shop } from './ui/shop.js';
import { StreamChat } from './ui/chat.js';
import { SysDialog } from './ui/sysdialog.js';
import { Vortex } from './ui/vortex.js';
import { BattlePreview } from './ui/battle-preview.js';
import { DotBubble } from './ui/bubble.js';
import { darkSmokeWaiter, drawDarkSmoke } from './ui/dark-smoke.js';
import { TileMap, Camera, createEntity, freeSpot, SCREEN_W, SCREEN_H, CHAR_SCALE, RENDER_SCALE } from './world/world.js';
import { loadTileOverrides } from './world/tiles.js';
import { preloadCaptainMemories } from './data/captain-memories.js';
import { loadCharacterMotions } from './world/character-motion.js';
import { TORSO, LEGS, PALETTES } from './data/art.js';
import { MAPS } from './data/maps.js';
import { SCRIPTS } from './data/scripts.js';
import { battleEntry } from './data/cutscenes/helpers.js';
import { CAPTAIN_AURA_COLORS, CAPTAIN_REVEAL_VEIL } from './data/cutscenes/captain_reveal.js';
import { FX_SHEETS } from './data/fx.js';
import L from './data/locale/ko.js';
import { CHARACTERS } from './data/characters.js';
import { Story, STAGES, QA_POINTS, partyFromFlags, stateFromFlags, storyBgm } from './core/story.js';
import { ENEMIES } from './data/enemies.js';
import { WATER_WALK } from './data/footsteps.js';
import { normalizeParty } from './core/party.js';
import { BATTLE_PREVIEW, BATTLE_SPRITES } from './data/battle-sprites.js';
import { Battle } from './battle/battle.js';
import { BaronSeaChase } from './scenes/baron-sea-chase.js';
import { MaillardArrival } from './scenes/maillard-arrival.js';
import { ShipAssault } from './scenes/ship-assault.js';
import { ShipPursuitAmbient } from './scenes/ship-pursuit-ambient.js';
import { SHIP_ASSAULT } from './data/ship-assault.js';
import { ShipCastle } from './scenes/ship-castle.js';
import { SHIP_CASTLE } from './data/ship-castle.js';
import { ShipMemory } from './scenes/ship-memory.js';
import { YOUNGCLE_TV_PORTRAITS } from './data/youngcle-tv.js';
import { MaillardSunrise } from './world/sunrise.js';
import { MAILLARD_CART, MAILLARD_SUNRISE } from './data/maillard-sunrise.js';
import { ITEMS, plainItems, keyItems } from './data/items.js';
import { drawYoungcleLoungeEffects } from './scenes/youngcle-lounge-effects.js';
import { clearEditorUnionStage, drawEditorUnionWorld, drawEditorUnionLight, drawEditorUnionLabels, drawEditorUnionOverlay } from './scenes/editor-union-effects.js';

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
    this.partyHp = {};                    // 전투 HP (id → 현재 HP, 없으면 최대). 저장/복원됨 (2026-09-10 전투)
    this.attack = 1; this.hpBonus = 0;    // 공격력(기본 1) · 최대 HP 보너스 — 레드·블루 버프로 2 / +20 (청록숲9). 저장/복원됨
    this.money = 0;                       // 소지금(원) — 미니언 잡으면 30원 (2026-09-10 돈 시스템). 저장/복원됨
    this.battle = null;                   // 진행 중인 전투 (src/battle/battle.js) — 있으면 update/draw 를 전투가 가져간다
    this.lastBattle = null;
    this.seaChase = null;
    this.maillardArrival = null;
    this.shipAssault = null;
    this.shipCastle = null;
    this.shipMemory = null;
    this.tvBroadcast = null;
    this.youngcleDoorCutaway = null;
    this.youngcleCages = null;
    this.shipPursuitAmbient = new ShipPursuitAmbient(this);
    this.captainAttackPending = false;
    this.sunrise = new MaillardSunrise(MAILLARD_SUNRISE);
    this.settings = { textSpeed: 1, sound: true };
    this.state = 'title';          // title | field | menu | battle-preview
    this.fade = { alpha: 0, dir: 0, cb: null, color: '0,0,0' };
    this.transitioning = false;
    this.debug = false;
    this.spriteOverrides = {};
    this.time = 0;
    this.menu = { index: 0, sub: null };
    this.shop = new Shop(this);
    this.shopPending = false;
    this.shake = null;            // { time, amp }
    this.caption = null;          // { text, time, duration } 지역 이름 표시
    this.curtain = null;          // 'black'|'white': 맵 위를 완전히 덮는 막 (컷신용)
    this.background = [];         // async 컷신 waiter
    this.zoom = { s: 1, fx: 0, fy: 0, smax: 1, tween: null };   // 2D 월드 줌 (TV 로 빨려 들어가는 전환 등). UI 는 안 줌됨
    this.scene3d = null;          // 3D 오버레이 씬(src/scenes/*) 실행 중이면 true — Esc 등 게임 입력 무시
    this.ride = null;             // 타고 있는 탈것(Raft 등) — 있으면 플레이어 입력 정지
    this.hurt = 0; this.invuln = 0;   // 낙석 등에 맞았을 때 붉은 섬광 / 무적 시간
    this.fx = [];                 // 작은 입자(물방울 등) { x,y,vx,vy,t,color }
    this.ripples = [];            // 얕은 물 발소리 물결 고리 { x,y,t,dur } — emitRipple, 맵 위·캐릭터 아래에 그린다
    this.flames = []; this.flameEmitters = [];   // 불꽃 입자·방출기 (컷신 {fire}/{rocket}) — updateFlames, 캐릭터 위에 그린다
    this.mash = null;             // C 연타 미니게임 상태 (컷신 {mash}) — drawMash
    this.booms = [];              // 한 번 재생하는 큰 이펙트 애니 (컷신 {boom}) — 캐릭터 위에 그린다
    this.prompt = null;           // { text, t } 작은 안내 창 (컷신 {prompt}) — C 로만 닫힘
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
    const propSrcs = new Set(FX_SHEETS);
    for (const src of Object.values(SHIP_ASSAULT.images)) propSrcs.add(src);
    for (const src of Object.values(SHIP_CASTLE.images)) propSrcs.add(src);
    for (const m of Object.values(MAPS)) { for (const e of (m.entities || [])) if (e.image) propSrcs.add(e.image); for (const src of (m.preload || [])) propSrcs.add(src); }   // 엔티티 이미지 + 컷신에서 spawn 할 이미지(preload)
    await Promise.all([
      ...[...propSrcs].map(async (src) => { this.propImages[src] = await loadImageOptional(src); }),
      ...Object.entries(MAPS).filter(([, m]) => m.image).map(async ([id, m]) => { this.mapImages[id] = await loadImageOptional(m.image); }),
      loadTileOverrides(),
      preloadCaptainMemories(),
      loadCharacterMotions().then((motions) => { this.characterMotions = motions; }),
      this.sound.loadVoiceFiles(Object.keys(VOICES)),
      this.sound.loadSfxFiles(['menu', 'confirm', 'cancel', 'open', 'close', 'item', 'shop_buy', 'door', 'chime', 'thud', 'white', 'battle_start', 'battle_end', 'laugh_junhee', 'laugh_janitor', 'siren', 'error', 'plug', 'click', 'whoosh', 'splash', 'rumble', 'jump', 'knock', 'hit', 'hurt', 'damage', 'vaporized', 'won', 'pop', 'heal', 'scrape', 'drumroll', 'fanfare', 'ember', 'rocket', 'boom', 'explosion', 'baron_roar', 'cannon_charge', 'cannon_puff', 'baron_slam', 'baron_eruption', 'cannon_guard_charge', 'cannon_guard_fire', 'cannon_guard_block', 'cannon_guard_breath', 'maillard_splash', 'maillard_applause', 'maillard_water_lift', 'wemix_remix', 'captain_thunder', 'captain_transform', 'mankatsuki_clone', 'mankatsuki_hurt', 'iron_step_1', 'iron_step_2', 'youngcle_tv_on', 'mario_jump', 'mario_pipe', 'editor_union_bam', 'park_trial_objection', 'park_trial_shatter', 'park_razma_scream', 'park_razma_jeolla', 'wing', 'bell', 'spearappear', 'impact', 'power', 'ultraswing', 'heavyswing', 'zilean_q_throw', 'zilean_q_stun', 'pantheon_q_charge', 'pantheon_q_throw', 'pantheon_q_hit', 'pantheon_q_tap', 'pantheon_e_up', 'pantheon_e_block', 'levelup', 'menumove', 'select', 'orchhit', 'great_shine', 'chain_extend', 'weaponpull', 'locker', 'crowd', 'applause', 'crowd_cheer', 'crowd_roar', 'guitar_c4', 'guitar_g4', 'guitar_a4', 'guitar_scratch', 'guitar_feedback', 'guitar_dead', 'static_loop', 'static_burst', 'applause_2', 'crowd_cheer_2', 'crowd_roar_2', 'crowd_bed', 'sizzle', 'furnace_blast', 'bigcut', 'color_red', 'color_orange', 'color_yellow', 'color_green', 'color_blue', 'color_navy', 'color_purple', 'color_heart', 'color_nasdf', 'color_pi', 'color_legend', 'color_ngaita', 'laser_zap', 'laser_charge', 'laser_beam', 'queen_hoot', 'obangsun_wail', 'punch']),
      this.sound.loadWalkLoop(WATER_WALK),
      ...[...new Set([...Object.keys(CHARACTERS), ...Object.keys(PALETTES)])].map(async (name) => {
        const img = await loadImageOptional(CHARACTERS[name]?.still || CHARACTERS[name]?.sheet || `assets/sprites/${name}.png`);
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
    this.battlePreview = new BattlePreview({
      sprites: BATTLE_SPRITES,
      preview: BATTLE_PREVIEW,
      strings: L,
      onClose: () => this.closeBattlePreview(),
    });
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
    if (q.get('battle') === '1' && this.mapId === 'test') this.openBattlePreview();
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
  /** 자동 저장: 단계가 오를 때·맵을 옮길 때·스크립트가 끝날 때·QA 바로가기 직후(필드에서만). 컷신이 도는 동안은 저장하지 않는다(숨긴 주인공·임시 맵 위치가 세이브에 남지 않게, 2026-09-10) */
  autosave() {
    if (!['field', 'shop', 'menu'].includes(this.state) || this.ride || !this.player || !this.mapId || this.mapId === 'test' || this.dialogue.running) return;
    const data = { v: 1, story: this.story.toJSON(), flags: this.flags, inventory: this.inventory, party: this.party, partyHp: this.partyHp, money: this.money, attack: this.attack, hpBonus: this.hpBonus, map: this.mapId, spawn: this.entrySpawn, x: Math.round(this.player.x), y: Math.round(this.player.y), facing: this.player.facing, sprite: this.playerSprite, settings: this.settings, t: Date.now() };
    try { localStorage.setItem(Game.SAVE_KEY, JSON.stringify(data)); } catch {}
  }
  clearSave() { try { localStorage.removeItem(Game.SAVE_KEY); } catch {} }
  /** 진행 상태 전부 초기화 — 새 게임·타이틀 복귀·QA 바로가기·이어하기의 공통 출발점. 이전 세이브/이전 QA 상태가 섞이지 않는다 (2026-09-10 "QA 갔다가 이어하기 → 형섭만 나옴") */
  resetState() {
    this.finishTvBroadcast(true);
    this.battle?.cancelPendingBgm();
    this.shipPursuitAmbient?.stop();
    this.finishShipAssault(true);
    this.finishShipCastle(true);
    this.finishShipMemory(true);
    this.captainAttackPending = false;
    this.darkSmoke = null;
    this.musicCamera?.dispose();
    this.shopPending = false;
    this.shop.reset();
    this.seaRetryPromptPending = false;
    this.maillardArrival?.dispose(); this.maillardArrival = null;
    this.sunrise.dispose();
    this.seaChase?.dispose(); this.seaChase = null;
    this.battle?.disposeGimmick();
    this.flags = {}; this.story = new Story(this.flags); this.inventory = []; this.party = []; this.partyHp = {}; this.money = 0; this.attack = 1; this.hpBonus = 0;   // 공격력·최대 HP 보너스(레드·블루 버프)
    this.battle = null; this.lastBattle = null; this.battleFlag = null; this.encountering = false; this.ride = null;
  }
  /** 타이틀에서 '이어하기': 세이브를 통째로 복원 → 맵 → 위치 → 동료를 주인공 뒤에 다시 세움 → 그 뒤에야 도착 스크립트(플래그 안 섰으면 처음부터 다시) */
  continueGame() {
    let d = null; try { d = JSON.parse(localStorage.getItem(Game.SAVE_KEY)); } catch {}
    if (!d || !MAPS[d.map]) { this.startGame(); return; }
    this.resetState(); this.story.load(d.story);
    Object.assign(this.flags, d.flags || {});           // side flag 복원 (단계 플래그는 load 가 backfill)
    this.inventory = (d.inventory || []).filter((n) => typeof n === 'string');
    this.party = normalizeParty(d.party);            // 어떤 조합이든 걷는 순서(경섭 → 빠맨)로
    this.partyHp = { ...(d.partyHp || {}) }; this.money = d.money || 0; this.attack = d.attack || 1; this.hpBonus = d.hpBonus || 0; this.settings = { ...this.settings, ...(d.settings || {}) };
    this.playerSprite = d.sprite || 'hyungsub';
    this.state = 'field';
    this.changeMap(d.map, d.spawn || null, true, { enter: false });
    if (Number.isFinite(d.x) && Number.isFinite(d.y) && d.x >= 0 && d.y >= 0 && d.x + this.player.w <= this.map.pxW && d.y + this.player.h <= this.map.pxH) {
      const [sx, sy] = freeSpot(this, this.player, d.x, d.y, 96);
      if (!this.map.solidRect(sx, sy, this.player.w, this.player.h)) [this.player.x, this.player.y] = [sx, sy];
      this.player.facing = d.facing || 'down';
    }
    this.spawnParty(); this.camera.snap();             // 동료는 저장된 위치의 주인공 뒤에 (스폰 지점에 남겨 두면 화면 밖 → "형섭만 나옴")
    this.runMapEnter();
    this.fadeTo(0, 0.5);
  }
  /** 개발용 바로가기(?map= / ?stage=): 그 지점까지의 스토리 단계를 전부 채워서 상태 꼬임을 막는다 */
  devJump({ map, spawn, stage, flags, party, inventory, money, script }) {
    this.resetState();                               // 이전 세이브·이전 QA 지점 상태를 버리고 깨끗이 (섞이면 동료/플래그가 어긋난다)
    if (stage && Story.isStage(stage)) { this.story.advance(stage); const def = Story.stageOf(stage); map = map || def.map; spawn = spawn || def.spawn; }
    if (flags) Object.assign(this.flags, flags);   // QA 지점의 side flag (예: 다리 내려온 상태)
    this.party = normalizeParty(party || partyFromFlags(this.flags));   // QA 지점의 동료 구성 — 없으면 가입 플래그에서 유도, 순서는 걷는 순서
    // 아이템·돈·버프도 플래그에서 유도(STATE_FROM_FLAGS + 맵 위 몹 unless) — 바나나 2개·레드블루 버프처럼 실제 플레이와 같은 상태로 점프 (2026-09-11 사용자). 지점이 직접 주면 그게 우선
    const derived = stateFromFlags(this.flags, { maps: MAPS, enemyMoney: (id) => ENEMIES[id]?.money ?? 30 });
    this.inventory = inventory ? [...inventory] : derived.inventory; this.money = money ?? derived.money; this.attack = derived.attack; this.hpBonus = derived.hpBonus;
    if (map && MAPS[map]?.stage) this.story.advance(MAPS[map].stage);
    if (!this.has('opening_seen')) this.story.advance('opening_seen');
    this.state = 'field';                            // 먼저 field 로 — 그래야 맵 브금이 시작된다(타이틀 상태에선 금지)
    this.changeMap(map, spawn || 'start', true, { enter: false });
    this.autosave();                                 // 바로가기 직후 '이어하기' 도 이 지점을 연다 (도착 스크립트 전이라 플래그가 안 서 있고, 이어하기 때 스크립트가 처음부터 돈다)
    // 지점 전용 스크립트(예: 섭리오 보스전 직행)가 있으면 도착 스크립트 대신 그것을 튼다
    if (script) this.runScript(script); else this.runMapEnter();
  }

  /** 낙석 등에 맞음: 붉은 섬광 + 흔들림 + 소리, 레인 왼쪽으로 밀려남(체력 없음 — 진행만 되돌림), 잠깐 무적. 동료는 뒤로 재정렬 */
  /** 피격(낙석 등): 붉은 섬광 + 흔들림 + 무적 0.9s + **왼쪽으로 슬라이드**(순간이동·벽 튕김 금지). silent:true 면 소리 없음(낙석). HP 없음 */
  hurtPlayer(src, { silent = false, dir = -1, push = 240 } = {}) {
    if (this.invuln > 0) return;
    this.invuln = 0.9; this.hurt = 0.32;
    if (!silent) this.sound.sfx('thud', { volume: 0.8 });
    this.shake = { time: 0.25, amp: 3 };
    const p = this.player;
    p.knock = { vx: dir * push, t: 0.3, dur: 0.3 };   // Player.update 가 감속하며 미끄러뜨린다(≈36px)
    p.trail = [];
    for (const e of this.entities) if (e.def?.type === 'follower') e.knock = { vx: dir * push, t: 0.3, dur: 0.3 };   // 동료도 같이 밀려 간격 유지
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
    this.party = normalizeParty([...this.party, id]);   // 가입 순서와 무관하게 걷는 순서(형섭 → 경섭 → 빠맨)
    for (const e of this.entities) if (e.def?.type === 'npc' && e.id === id) e.dead = true;
    this.spawnParty();
    this.autosave();
    return true;
  }
  leaveParty(id) { this.party = normalizeParty(this.party.filter((x) => x !== id)); this.spawnParty(); this.autosave(); }

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

  /**
   * 맵 JSON `backdrop:'teal_bush'` — 청록숲: 검은 어둠 속에 멀리 겹겹이 서 있는 수풀 실루엣 (사용자 2026-09-10 "뭔가 애매하게 보이는 수풀 같은 배경을 디테일하게").
   * 3겹(멀수록 어둡고 느리게 흐름: 카메라 x 의 0.12/0.22/0.38), 둥근 덤불 덩어리 + 가는 줄기 + 잎 점, 아주 느린 흔들림. 위치는 인덱스 해시로 고정.
   */
  drawBackdropTeal(ctx, cam, pal = BACKDROP_TEAL) {
    const t = this.time;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    const g = ctx.createLinearGradient(0, 0, 0, SCREEN_H); g.addColorStop(0, '#000'); g.addColorStop(0.55, pal.mid); g.addColorStop(1, '#000');
    ctx.fillStyle = g; ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    const hash = (i, k) => { const v = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return v - Math.floor(v); };
    const layers = pal.layers;
    for (let li = 0; li < layers.length; li++) {
      const ly = layers[li], span = 640, off = ((cam.x * ly.par) % span + span) % span;
      for (let i = 0; i < ly.n * 2; i++) {
        const bx = ((i * (span / ly.n)) + hash(i, li) * 40 - off + span) % (span + 80) - 40;
        const r = ly.r[0] + hash(i + 7, li) * (ly.r[1] - ly.r[0]);
        const sw = Math.sin(t * 0.35 * ly.sway + i) * 1.5;
        const by = ly.base - hash(i + 3, li) * 30;
        const blob = (dy, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(bx + sw, by + dy, r, 0, Math.PI * 2); ctx.arc(bx + sw - r * 0.6, by + dy + r * 0.35, r * 0.7, 0, Math.PI * 2); ctx.arc(bx + sw + r * 0.6, by + dy + r * 0.3, r * 0.75, 0, Math.PI * 2); ctx.fill(); };
        blob(0, ly.rim); blob(3, ly.col);                                                                    // 위쪽 3px 만 밝게 남는 잎 테두리
        ctx.fillStyle = ly.leaf;                                                                            // 잎 점(디테일) — 위쪽에 많이
        for (let k = 0; k < 14; k++) { const a = hash(i * 13 + k, li + 5) * Math.PI * 2, d = hash(i * 17 + k, li + 9) * r * 0.95; const lx = bx + sw + Math.cos(a) * d, ly = by + Math.sin(a) * d * 0.8; if (ly < by + r * 0.4) ctx.fillRect(Math.round(lx), Math.round(ly), 2, 1); }
        if (hash(i + 11, li) > 0.55) { ctx.fillStyle = pal.stem; ctx.fillRect(Math.round(bx + sw), Math.round(by - r * 0.2), 1, Math.round(r * 1.6)); }   // 가는 줄기
      }
    }
    const gd = ctx.createLinearGradient(0, 170, 0, 250); gd.addColorStop(0, 'rgba(0,0,0,0)'); gd.addColorStop(1, '#000');   // 덤불 띠 아래는 완전한 검정 — 바닥처럼 보이는 밝은 면을 남기지 않는다(2026-09-10 "길이 투명하게 뚫려 허공을 걷는 느낌")
    ctx.fillStyle = gd; ctx.fillRect(0, 170, SCREEN_W, 80); ctx.fillStyle = '#000'; ctx.fillRect(0, 250, SCREEN_W, SCREEN_H - 250);
  }

  /** 캐릭터 위 프레임 띠. duration 지정 시 반복하며, endScale/grow는 해당 초 동안 부드럽게 크기를 바꾼다. 기본은 한 번 재생. */
  playBoom({ src, x, y, cols, rows = 1, count, fps, scale = 1, endScale = scale, grow, duration }) {
    const img = this.propImages[src];
    const put = (image) => { if (image) this.booms.push({ img: image, x, y, cols, rows, count, fps, scale, endScale, grow: grow ?? duration ?? count / fps, duration, t: 0 }); };
    if (img) put(img);
    else loadImageOptional(src).then((im) => { if (im) { this.propImages[src] = im; put(im); } else console.warn('[boom] 그림 없음', src); });
  }
  drawBooms(ctx, cam) {
    for (const b of this.booms) {
      const frame = Math.floor(b.t * b.fps);
      const i = b.duration == null ? Math.min(b.count - 1, frame) : frame % b.count;
      const fw = b.img.width / b.cols, fh = b.img.height / b.rows;
      const sx = (i % b.cols) * fw, sy = Math.floor(i / b.cols) * fh;
      const progress = b.grow > 0 ? Math.min(1, b.t / b.grow) : 1;
      const scale = b.scale + (b.endScale - b.scale) * progress * progress * (3 - 2 * progress);
      const dw = Math.round(fw * scale), dh = Math.round(fh * scale);
      ctx.drawImage(b.img, sx, sy, fw, fh, Math.round(b.x - cam.x - dw / 2), Math.round(b.y - cam.y - dh / 2), dw, dh);
    }
  }
  /** 불꽃 입자(컷신 {fire}/{rocket}): 방출기(엔티티에 붙음)가 rate 개/초(grow 로 점점 많이) 뿜고, 입자는 위로 오르며 노랑→주황→빨강→검붉게 사라진다. trail 은 뒤로 흐르는 불꼬리 */
  updateFlames(dt) {
    for (const em of this.flameEmitters) {
      em.t += dt; const e = em.e; if (!e || e.dead) continue;
      const cx = (e.drawX ?? e.x) + (e.iw ?? e.w) / 2 + em.dx, cy = (e.drawY ?? e.y) + (e.ih ?? e.h) + em.dy;
      const n = Math.floor(em.rate * (1 + em.grow * em.t) * dt + Math.random());
      for (let i = 0; i < n; i++) this.flames.push({ x: cx + (Math.random() - 0.5) * em.spread * (1 + em.grow * em.t * 0.3), y: cy + (Math.random() - 0.5) * 10, vx: (Math.random() - 0.5) * 30 - (em.trail ? 90 : 0), vy: -50 - Math.random() * 70 * (1 + em.grow * em.t * 0.2), t: 0, life: 0.35 + Math.random() * 0.35, size: 3 + Math.random() * 3 });
    }
    this.flameEmitters = this.flameEmitters.filter((em) => em.e && !em.e.dead);
    for (const p of this.flames) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy -= 20 * dt; }
    this.flames = this.flames.filter((p) => p.t < p.life);
  }
  /** C 연타 안내(컷신 {mash}): 배경 상자 없이 화면 위에 바로 — 제목(검은 테두리), 눌리면 납작해지는 C 키, 아래 게이지에 불씨가 차오른다(누를 때마다 불씨 튐). 달성하면 게이지가 깜빡인다. 배경 상자는 장면을 가려서 뺐다(2026-09-11 사용자) */
  drawMash(ctx) {
    const m = this.mash, w = 240, x = Math.round((SCREEN_W - w) / 2), y = 44;   // 화면 위쪽 — 배경이 없으니 캐릭터 위를 가로지르지 않게 (2026-09-11)
    ctx.font = FONT; ctx.textBaseline = 'top'; ctx.textAlign = 'center';
    ctx.fillStyle = '#000';
    for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]]) ctx.fillText(L.mash_title, SCREEN_W / 2 + ox, y + 8 + oy);   // 검은 테두리 — 배경 없이도 읽힌다
    ctx.fillStyle = '#fff'; ctx.fillText(L.mash_title, SCREEN_W / 2, y + 8);
    const pressed = m.pressT > 0, kw = 34, kh = pressed ? 22 : 28, kx = Math.round(SCREEN_W / 2 - kw / 2), ky = y + 30 + (pressed ? 6 : 0);
    ctx.fillStyle = pressed ? '#ffd76a' : '#fff'; ctx.fillRect(kx - 1, ky - 1, kw + 2, kh + 2); ctx.fillStyle = '#000'; ctx.fillRect(kx, ky, kw, kh);
    ctx.fillStyle = pressed ? '#ffd76a' : '#fff'; ctx.fillText('C', SCREEN_W / 2, ky + (pressed ? 3 : 6));
    const gx = x + 20, gy = y + 68, gw = w - 40, gh = 12, k = Math.min(1, m.count / m.target);
    ctx.fillStyle = '#fff'; ctx.fillRect(gx - 1, gy - 1, gw + 2, gh + 2); ctx.fillStyle = '#1a0a05'; ctx.fillRect(gx, gy, gw, gh);
    const grad = ctx.createLinearGradient(gx, 0, gx + gw, 0); grad.addColorStop(0, '#7a1e0a'); grad.addColorStop(0.5, '#ff6a1a'); grad.addColorStop(1, '#ffe27a');
    ctx.fillStyle = m.done && Math.floor(m.doneT * 12) % 2 ? '#fff' : grad; ctx.fillRect(gx, gy, Math.round(gw * k), gh);
    for (const s of m.sparks) { const kk = s.t / s.life; ctx.globalAlpha = 1 - kk; ctx.fillStyle = kk < 0.4 ? '#fff2a0' : '#ff8a2a'; ctx.fillRect(Math.round(gx + gw * s.k + s.x), Math.round(gy + s.y), 2, 2); }
    ctx.globalAlpha = 1; ctx.textAlign = 'left';
  }
  /** 얕은 물 발소리 물결 고리(옵젝영역): 발밑에서 타원 고리가 퍼지며 옅어진다 — 맵 위·캐릭터 아래 */
  /** 주인공 중심 원형 시야 + 바깥 노이즈 어둠 (맵 `vision`). 화면 좌표로 그린다(ctx 는 이미 cam 만큼 이동한 상태가 아니라 -cam 을 직접 뺀다) */
  drawVision(ctx, cam, vision) {
    const p = this.player; if (!p) return;
    const cx = p.x + p.w / 2 - cam.x, cy = p.y + p.h / 2 - cam.y;
    const radius = vision.radius ?? 150, edge = vision.edge ?? 250, density = vision.noise ?? 0.55;
    if (!this.visionNoise) {
      // 결정적 노이즈 판 3장(2px 알갱이): 매 0.12초 교대해 알갱이가 자글거린다
      let seed = 1234567;
      const rand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
      this.visionNoise = [0, 1, 2].map(() => {
        const c = document.createElement('canvas'); c.width = SCREEN_W; c.height = SCREEN_H; const g = c.getContext('2d'); g.fillStyle = '#000';
        for (let y = 0; y < SCREEN_H; y += 2) for (let x = 0; x < SCREEN_W; x += 2) if (rand() < density) g.fillRect(x, y, 2, 2);
        return c;
      });
      const buf = document.createElement('canvas'); buf.width = SCREEN_W; buf.height = SCREEN_H; this.visionBuf = buf;
    }
    const b = this.visionBuf.getContext('2d');
    b.clearRect(0, 0, SCREEN_W, SCREEN_H);
    // 알갱이: radius*0.85 안에서 0 → edge 에서 1 로 차오른다(자글거리는 노이즈가 어둠을 채운다)
    b.drawImage(this.visionNoise[Math.floor(performance.now() / 120) % 3], 0, 0);
    const grain = b.createRadialGradient(cx, cy, radius * 0.85, cx, cy, edge);
    grain.addColorStop(0, 'rgba(0,0,0,0)'); grain.addColorStop(1, 'rgba(0,0,0,1)');
    b.globalCompositeOperation = 'destination-in'; b.fillStyle = grain; b.fillRect(0, 0, SCREEN_W, SCREEN_H);
    b.globalCompositeOperation = 'source-over';
    // 매끈한 어둠은 알갱이 밑에 옅게(edge 에서 0.45) 깔리고, edge*1.2 부터는 완전히 검다
    const shade = b.createRadialGradient(cx, cy, radius, cx, cy, edge * 1.2);
    shade.addColorStop(0, 'rgba(0,0,0,0)'); shade.addColorStop(0.62, 'rgba(0,0,0,0.45)'); shade.addColorStop(1, 'rgba(0,0,0,1)');
    b.globalCompositeOperation = 'destination-over'; b.fillStyle = shade; b.fillRect(0, 0, SCREEN_W, SCREEN_H);
    b.globalCompositeOperation = 'source-over';
    ctx.drawImage(this.visionBuf, 0, 0);
  }
  emitRipple(x, y) { this.ripples.push({ x, y, t: 0, dur: 0.6 }); }
  drawRipples(ctx, cam) {
    if (!this.ripples.length) return;
    ctx.lineWidth = 1;
    for (const r of this.ripples) {
      const k = r.t / r.dur, rad = 4 + 14 * k;
      ctx.strokeStyle = `rgba(170,232,236,${(1 - k) * 0.7})`;
      ctx.beginPath(); ctx.ellipse(Math.round(r.x - cam.x), Math.round(r.y - cam.y), rad, rad * 0.45, 0, 0, Math.PI * 2); ctx.stroke();
    }
  }

  /** ESC: 메인(타이틀)으로 */
  toTitle() {
    this.finishTvBroadcast(true);
    this.battle?.cancelPendingBgm();
    this.shipPursuitAmbient?.stop();
    this.finishShipAssault(true);
    this.finishShipCastle(true);
    this.finishShipMemory(true);
    this.captainAttackPending = false;
    this.darkSmoke = null;
    this.musicCamera?.dispose();
    this.seaRetryPromptPending = false;
    this.maillardArrival?.dispose(); this.maillardArrival = null;
    this.sunrise.dispose();
    this.seaChase?.dispose(); this.seaChase = null;
    this.battle?.disposeGimmick();
    if (this.battle) { this.battle.interlude = null; this.battle.state = 'ending'; }
    this.transitioning = true;
    this.battlePreview?.close();
    this.sound.stopBgm(0.4); this.sound.stopIntro(0.2);
    this.dialogue.script = null; this.dialogue.wait = null; this.textbox.close();
    for (const entity of this.entities) entity.motion = null;
    this.background = []; this.curtain = null; this.caption = null; this.shake = null;
    this.zoom = { s: 1, fx: 0, fy: 0, smax: 1, tween: null };   // 줌 도중 Esc 로 나와도 다음 게임이 확대된 채 시작되지 않게
    this.chat.stop(); this.sysdialog.hide(); this.vortex.stop(); this.ride = null; this.bubble.done = true; this.fx = []; this.prompt = null;
    this.flames = []; this.flameEmitters = []; this.mash = null; this.ripples = []; this.booms = [];
    this.fadeTo(1, 0.4, () => {
      this.resetState();
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

  /** 필드 위치와 저장 상태를 유지한 채 전투 모션 미리보기를 연다. */
  openBattlePreview() {
    if (this.state !== 'field') return false;
    this.player.moving = false;
    this.state = 'battle-preview';
    void this.battlePreview.open();
    return true;
  }

  /** 최대 HP = 캐릭터 기본 + 버프(hpBonus, 레드·블루 버프 +20 — 청록숲9) */
  maxHpOf(id) { return (CHARACTERS[id]?.hp ?? 100) + (this.hpBonus || 0); }
  /** 현재 HP (전투 밖): partyHp 에 없으면 최대 */
  hpOf(id) { const max = this.maxHpOf(id); return Math.max(0, Math.min(max, this.partyHp[id] ?? max)); }
  /** 메뉴에서 힐템 사용: 인벤토리에서 빼고 partyHp 회복 (2026-09-10) */
  useItemOn(name, id) {
    const def = ITEMS[name]; if (!def?.heal) return false;
    const i = this.inventory.indexOf(name); if (i < 0) return false;
    this.inventory.splice(i, 1);
    // 음수 회복(돌 -5)은 1 밑으로 내리지 않고, 회복음 대신 피격음
    const max = this.maxHpOf(id); this.partyHp[id] = Math.max(1, Math.min(max, this.hpOf(id) + def.heal));
    this.sound.sfx(def.heal < 0 ? 'hurt' : 'heal'); this.autosave();
    return true;
  }

  /** 필드에서 적(enemy 엔티티)에 닿음 → 표준 전투 진입 연출 + 전투 + 승리 시 적 제거(플래그로 영구). 어느 맵이든 같은 흐름 (2026-09-10) */
  startEncounter(e) {
    if (this.battle || this.dialogue.running || this.transitioning || this.encountering) return;
    this.encountering = true; this.player.moving = false;
    const flag = `${this.mapId}_${e.id}_defeated`;
    this.runScript([
      ...battleEntry(e.def.enemies || ['cs_red'], e.def.bgm || 'rude_buster'),
      { battle: { enemies: e.def.enemies || ['cs_red'], bgm: e.def.bgm || 'rude_buster', bg: e.def.bg || MAPS[this.mapId]?.battleBg, flag } },
      { bgm: null }, { zoom: 1 },
      { action: (g) => { if (g.lastBattle?.win) e.dead = true; g.encountering = false; g.resumeMapBgm(); } },   // 맵 브금 복귀 (전투 뒤 브금 사라지던 버그 2026-09-10)
      { fade: 'in', duration: 0.5 },
      { regroup: true },
    ]);
  }

  /** 전투 시작 (컷신 {battle}) — 끝나면 endBattle → game.lastBattle = { win }. 필드·대화창은 그대로 두고 화면만 전투가 가져간다 */
  startBattle(cfg) {
    if (this.battle) return this.battle;
    this.shipPursuitAmbient?.clear();
    this.player.moving = false; this.textbox.close?.();
    this.battle = new Battle(this, cfg);   // 에셋이 준비되면 Battle.load() 가 브금을 틀고 검은 화면을 걷는다(0.12s) — 0.45s 페이드 + 로딩 정지 동안 루드버스터 첫 0.6초가 지나가던 문제 (사용자 2026-09-10 '초반이 패스당한 느낌')
    return this.battle;
  }
  /** 전투 뒤 맵 브금 복귀 — 표준 조우(startEncounter) 전용. 컷신 전투(튜토리얼)는 컷신이 알아서 (사용자 2026-09-10: 튜토리얼은 꺼져도 되지만 그 뒤 맵부턴 별도 요청 없으면 돌아와야 함) */
  resumeMapBgm() {
    const def = MAPS[this.mapId];
    if (!def) return;
    const override = storyBgm(this.mapId, this.flags);
    const name = override === undefined ? def.bgm : override;
    const gated = def.bgmFlag && !this.has(def.bgmFlag);
    if (name && !gated) this.sound.playBgm(name, { volume: 0.45 });
    else if (name === null || gated) this.sound.stopBgm(0.4);
  }
  endBattle(result) {
    this.battle?.cancelPendingBgm();
    this.battle?.disposeGimmick();
    this.lastBattle = result; this.battle = null; this.shake = null;
    if (result?.win && this.battleFlag) this.setFlag(this.battleFlag);
    this.battleFlag = null;
  }

  /** 전투 모션 미리보기를 닫고 중단했던 필드로 돌아간다. */
  closeBattlePreview() {
    if (this.state !== 'battle-preview') return false;
    this.battlePreview.close();
    this.state = 'field';
    return true;
  }

  /** 초상화: assets/portraits/<name>.png (48x48) → 없으면 시트의 정면 얼굴 확대 → 없으면 문자 도트 얼굴 */
  makePortraits() {
    const out = {};
    for (const name of new Set([...Object.keys(CHARACTERS), ...Object.keys(PALETTES), ...YOUNGCLE_TV_PORTRAITS])) {
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
  changeMap(mapId, spawnId, instant = false, { bgm = true, enter: runEnter = true } = {}) {   // enter:false — 도착 스크립트는 호출자가 runMapEnter() 로 (이어하기·QA: 위치·동료·세이브를 먼저)
    if (!MAPS[mapId]) { console.warn('[map] 없는 맵', mapId); return; }                        // 문/QA/스크립트가 잘못된 id 를 줘도 게임이 죽지 않는다 (2026-09-11 smoke)
    if (MAPS[mapId].meta?.sunriseCart && !this.has(MAILLARD_CART.completionFlag)) this.sound.preloadBgm(MAILLARD_SUNRISE.bgm);
    const go = () => {
      this.finishTvBroadcast(true);
      this.finishShipAssault(true);
      this.finishShipCastle(true);
      this.finishShipMemory(true);
      this.captainAttackPending = false;
      this.darkSmoke = null;
      this.booms = [];
      this.maillardArrival?.dispose(); this.maillardArrival = null;
      this.sunrise.dispose();
      this.seaChase?.dispose(); this.seaChase = null;
      const def = MAPS[mapId];
      const completedCartEntry = mapId === MAILLARD_CART.map && this.has(MAILLARD_CART.completionFlag) && (!spawnId || spawnId === 'start' || spawnId === 'from_hold');
      const resolvedSpawnId = completedCartEntry ? MAILLARD_CART.landingSpawn : spawnId;
      this.mapId = mapId; this.entrySpawn = resolvedSpawnId || 'start';   // 비상탈출(Tab)이 돌아갈 입구
      this.shipPursuitAmbient?.resume();
      this.map = new TileMap({ ...def, rows: def.rows ? [...def.rows] : def.rows }, this.mapImages?.[mapId] || null);   // rows 는 복사 (tileSwaps 가 원본을 안 건드리게)
      for (const key of Object.keys(def.tileSwaps || {})) if (this.has(key)) this.applyTiles(key, false);   // 플래그가 선 타일 교체는 처음부터 적용
      this.map.bake();
      // 엔티티 조건: unless:'플래그' (플래그가 서면 안 나옴, 예: 먹은 에그타르트) / requires:'플래그' (서야 나옴)
      this.entities = def.entities
        .filter((e) => !(e.unless && this.has(e.unless)) && !(e.requires && e.type !== 'door' && !this.has(e.requires)))
        .map((e) => createEntity({ ...e }, this)).filter(Boolean);
      const spawn = def.spawns[resolvedSpawnId] || def.spawns.start || Object.values(def.spawns)[0];   // 이어하기(위치는 세이브가 덮어씀) 대비
      this.player = createEntity({ type: 'player', sprite: this.playerSprite || 'hyungsub', ...spawn, facing: spawn.facing ?? this.player?.facing ?? 'down' }, this);   // 스폰에 facing 을 주면 그 방향(QA 지점 등)
      this.entities.push(this.player);
      this.spawnParty();
      if (mapId === 'maillard_captain' && this.has('captain_reveal_done') && !this.has('captain_aftermath_done')) {
        darkSmokeWaiter(this, { mode: 'veil', duration: 0.01, veil: CAPTAIN_REVEAL_VEIL,
          aura: { at: 'captain_mankatsuki', colors: CAPTAIN_AURA_COLORS } }).update(0.01);
      }
      // 문 위에서 스폰될 때 바로 되돌아가지 않도록 쿨다운
      for (const e of this.entities) if (e.cooldown !== undefined) e.cooldown = 0.6;
      this.camera.map = this.map;
      this.camera.target = this.player;
      this.camera.snap();
      if (bgm && !this.dialogue.running && this.state !== 'title') {                 // 타이틀 상태(부팅·Esc)에선 맵 브금을 절대 틀지 않는다
        const gated = def.bgmFlag && !this.has(def.bgmFlag);                        // bgmFlag: 이 플래그가 켜진 뒤에만 맵 브금 — 첫 도착 컷신이 대사 중간에 직접 켜는 맵(void11)
        const override = storyBgm(mapId, this.flags);
        const name = override === undefined ? def.bgm : override;
        if (name && !gated) this.sound.playBgm(name, { volume: 0.45 });
        else if (gated || name === null) this.sound.stopBgm(0.4);
      }
      if (def.backdrop === 'maillard_sunrise') this.sunrise.enter({
        sound: this.sound,
        images: this.propImages,
        animated: def.sunrise?.animated !== false,
        seen: this.has(MAILLARD_SUNRISE.completionFlag),
        onComplete: () => { this.setFlag(MAILLARD_SUNRISE.completionFlag); if (!this.ride) this.autosave(); },
      });
    };
    const enter = () => { if (runEnter) this.runMapEnter(mapId); };
    if (instant) { go(); enter(); return; }
    this.transitioning = true;
    const early = !!MAPS[mapId].enter?.early;   // enter.early: 검은 화면이 걷히기 전에 시작 — 첫 노드로 카메라를 옮겨 두면 플레이어가 잠깐도 안 보인다(void11)
    this.fadeTo(1, 0.25, () => { go(); if (early) enter(); this.fadeTo(0, 0.25, () => { this.transitioning = false; this.autosave(); if (!early) enter(); }, 'black'); }, 'black');   // 문 전환은 항상 검은색 (직전 컷신이 흰 페이드를 썼어도)
  }

  /** 맵 JSON `enter: { script, flag?, early? }` — 도착 직후 스크립트 1회. flag 가 있으면 그 플래그로 영구 1회(스크립트 시작 때 섬 — 세이브는 컷신 중엔 안 되므로, 중간에 끄면 이어하기 때 처음부터) */
  runMapEnter(mapId = this.mapId) {
    if (this.dialogue.running) return;
    if (mapId === 'maillard_captain' && this.has('captain_mankatsuki_defeated') && !this.has('captain_aftermath_done')) {
      this.runScript('captain_aftermath');
      return;
    }
    if (mapId === 'maillard_captain' && this.has('captain_aftermath_done') && !this.has('captain_attack_done')) {
      this.runScript('captain_attack');
      return;
    }
    const en = MAPS[mapId]?.enter;
    if (!en || !en.script || this.dialogue.running) return;
    if (en.flag && this.has(en.flag)) return;
    if (en.flag) this.setFlag(en.flag);
    this.runScript(en.script);
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
    this.resetState();
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
    const script = Array.isArray(key) ? key : SCRIPTS[key];   // 배열이면 즉석 스크립트(필드 조우 등)
    if (!script) { console.warn('[script] 없음:', key); return; }
    this.player.moving = false;
    this.dialogue.start(script, () => {
      if (onEnd) onEnd();
      if (this.mapId === 'maillard_captain' && this.has('captain_aftermath_done') && !this.has('captain_attack_done')) this.captainAttackPending = true;
      this.autosave();
      // 스크립트 안에서 { map, enter:true } 로 바꾼 맵의 도착 스크립트는 이 스크립트가 끝난 뒤 이어서(대사 중엔 runMapEnter 가 건너뛴다 — 철문 → 조종실 입장 연출, BUILD202)
      if (this.pendingMapEnter) { const next = this.pendingMapEnter; this.pendingMapEnter = null; if (next === this.mapId) this.runMapEnter(next); }
    });
  }

  /** Start from stable room anchors so old and interrupted saves resume the same attack. */
  startShipAssault() {
    this.finishShipAssault();
    this.shipPursuitAmbient?.clear();
    this.captainAttackPending = false;
    const junhee = this.entities.find(e => e.id === 'captain_junhee_restored');
    const carpet = this.entities.find(e => e.id === 'captain_carpet');
    [junhee.x, junhee.y] = freeSpot(this, junhee,
      carpet.x + carpet.w / 2 - junhee.w / 2 + 4, carpet.y - junhee.h - 2);
    junhee.visible = true; junhee.facing = 'down';
    for (const [i, id] of ['ppaman', 'player', 'gyeongsub'].entries()) {
      const actor = id === 'player' ? this.player : this.entities.find(e => e.id === id);
      [actor.x, actor.y] = freeSpot(this, actor,
        junhee.x + junhee.w / 2 - actor.w / 2 + (i - 1) * 64,
        junhee.y + junhee.h - actor.h + 90);
      actor.facing = 'up'; actor.moving = false;
    }
    this.player.trail = [];
    this.camera.target = this.player; this.camera.locked = false; this.camera.snap();
    this.entities = this.entities.filter(e => e.id !== 'captain_attack_yongjun');
    const door = this.entities.find(e => e.id === 'captain_to_saloon');
    this.spawn({ type: 'npc', id: 'captain_attack_yongjun', sprite: 'yongjun',
      x: door.x + door.w / 2 - 12, y: Math.max(this.map.pxH + 48, this.camera.y + SCREEN_H + 80),
      hidden: true, solid: false, facing: 'up', wander: 0 });
    this.sound.preloadBgm(SHIP_ASSAULT.bgm);
    this.shipAssault = new ShipAssault(this);
  }

  /** Release ocean, dust and shake on completion or any lifecycle interruption. */
  finishShipAssault(abort = false) {
    if (abort && this.shipAssault) {
      this.dialogue.script = null; this.dialogue.wait = null; this.dialogue.onEnd = null;
      this.textbox.close(); this.background = [];
    }
    if (!abort && this.shipAssault && this.shipPursuitAmbient) this.shipPursuitAmbient.adopt(this.shipAssault);
    else this.shipAssault?.dispose();
    this.shipAssault = null;
  }

  /** Start the castle presentation without moving or replacing field actors. */
  startShipCastle() {
    this.finishShipCastle(false);
    this.shipPursuitAmbient?.clear();
    this.shipCastle = new ShipCastle(this);
    return this.shipCastle;
  }

  /** Release the castle surface; abort additionally cancels its active script runner. */
  finishShipCastle(abort = false) {
    if (abort && this.shipCastle) {
      this.dialogue.script = null; this.dialogue.wait = null; this.dialogue.onEnd = null;
      this.textbox.close(); this.background = [];
    }
    this.shipCastle?.dispose();
    this.shipCastle = null;
  }

  /** Hand the active script from the castle surface to the underwater memory surface. */
  startShipMemory() {
    this.finishShipCastle(false);
    this.finishShipMemory(false);
    this.shipMemory = new ShipMemory(this);
    return this.shipMemory;
  }

  /** Release memory visuals; abort additionally cancels an interrupted script runner. */
  finishShipMemory(abort = false) {
    if (abort && this.shipMemory) {
      this.dialogue.script = null; this.dialogue.wait = null; this.dialogue.onEnd = null;
      this.textbox.close(); this.background = [];
    }
    this.shipMemory?.dispose();
    this.shipMemory = null;
  }

  /** TV cancellation releases the current runner before map/title/QA reconstructs actors. */
  finishTvBroadcast(abort = false) {
    if (abort) clearEditorUnionStage(this, true);
    if (abort && this.tvBroadcast) {
      this.dialogue.script = null; this.dialogue.wait = null; this.dialogue.onEnd = null;
      this.textbox.close(); this.background = [];
      this.zoom = { s: 1, fx: 0, fy: 0, smax: 1, tween: null };
    }
    this.tvBroadcast?.dispose(); this.tvBroadcast = null;
    if (abort) { this.youngcleDoorCutaway = null; this.youngcleCages = null; }
  }

  /** The shop opens after its interaction script releases the dialogue runner. */
  openShop() { this.shopPending = true; }

  // ── 루프 ────────────────────────────────────────────────
  /** Start the self-contained ocean scene; its cleared tableau survives the script. */
  startSeaChase() {
    if (this.has('obj5_maillard_done')) {
      this.changeMap('maillard_deck', 'arrival', true, { enter: false, bgm: false });
      return { completed: true };
    }
    this.setFlag('obj5_chase_retry_pending', false);
    this.seaChase?.dispose();
    this.seaChase = new BaronSeaChase(this);
    return this.seaChase;
  }

  /** Start the follow-up only after the old sea waiter releases its dialogue runner. */
  startMaillardArrival() {
    const scene = new MaillardArrival(this, this.seaChase);
    this.maillardArrival = scene;
    this.textbox.close();
    this.sound.stopBgm(0);
    scene.ready.then(() => {
      if (this.maillardArrival === scene && !scene.disposed) this.runScript('obj5_maillard', () => {
        if (this.mapId === 'maillard_deck') this.runMapEnter();
      });
    });
  }

  /** The white transition commits the reveal once and restores ordinary deck movement. */
  finishMaillardArrival() {
    this.setFlag('obj5_maillard_done');
    this.ride = null;
    this.changeMap('maillard_deck', 'arrival', true, { enter: false });
  }

  /** Defer the retry choice until the current chest script has released its runner. */
  promptSeaRetry() { this.seaRetryPromptPending = true; }

  /** Restore the original dock with its acquired gun and an explicit retry choice. */
  returnFromSeaChase() {
    this.dialogue.script = null; this.dialogue.wait = null; this.textbox.close();
    this.ride = null;
    this.setFlag('obj5_chase_retry_pending');
    this.changeMap('obj5', 'dock', true, { enter: false });
    this.runMapEnter();
    this.promptSeaRetry();
  }

  update(dt) {
    this.time += dt;
    Input.poll();
    if (Input.just('debug')) this.debug = !this.debug;
    if (Input.just('title') && this.state !== 'title' && !this.transitioning && !this.scene3d && !this.zoom.tween) { this.toTitle(); return; }
    this.textbox.charDelay = TEXT_SPEEDS[this.settings.textSpeed].delay;
    if (this.sound.muted !== !this.settings.sound) { this.sound.muted = !this.settings.sound; if (this.sound.bgm) this.sound._ramp(this.sound.bgm, this.sound.muted ? 0 : (this.sound.bgmVolume ?? 0.35), 0.2); }
    this.sunrise.update();

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

    this.shipPursuitAmbient?.sync();
    if (this.state === 'title') {
      this.title.update(dt, Input);
      return;
    }
    if (this.captainAttackPending && !this.dialogue.running && !this.transitioning) {
      this.captainAttackPending = false;
      if (this.mapId === 'maillard_captain' && !this.has('captain_attack_done')) this.runScript('captain_attack');
    }
    if (this.shopPending && !this.dialogue.running && !this.transitioning) {
      this.shopPending = false;
      this.player.moving = false;
      this.transitioning = true;
      this.sound.sfx('plug');
      this.fadeTo(1, 0.25, () => {
        this.shop.open();
        this.fadeTo(0, 0.25, () => { this.transitioning = false; }, 'black');
      }, 'black');
      return;
    }
    if (this.state === 'shop') {
      if (!this.transitioning) this.shop.update(dt);
      return;
    }
    if (this.state === 'battle-preview') {
      this.battlePreview.update(dt, Input);
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
    // 컷신 footsteps 오버라이드: 주인공 update 가 대화 중 돌지 않아도 이 구역 걸음 루프를 매 프레임 살려 둔다(BUILD226 “뒤에서 또 다른 걸음소리”)
    if (this.footstepsOverride) this.sound?.walk?.(this.footstepsOverride);
    if (this.hurt > 0) this.hurt -= dt;
    if (this.invuln > 0) this.invuln -= dt;
    for (const e of this.entities) if (e.jitter) { e.jitter.t -= dt; if (e.jitter.t <= 0) e.jitter = null; }
    for (const e of this.entities) if (e.emote) { e.emote.t += dt; if (e.emote.t >= e.emote.life) e.emote = null; }   // 머리 위 이모트 수명
    if (this.fx.length) { for (const f of this.fx) { f.vy += 320 * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.t -= dt; } this.fx = this.fx.filter((f) => f.t > 0); }
    if (this.ripples.length) { for (const r of this.ripples) r.t += dt; this.ripples = this.ripples.filter((r) => r.t < r.dur); }
    if (this.flameEmitters.length || this.flames.length) this.updateFlames(dt);
    if (this.booms.length) { for (const b of this.booms) b.t += dt; this.booms = this.booms.filter((b) => b.duration == null ? b.t * b.fps < b.count : b.t < b.duration); }
    this.background = this.background.filter((w) => !w.update(dt, Input));
    this.shipAssault?.update(dt);
    this.shipCastle?.update(dt);
    this.shipMemory?.update(dt);
    this.tvBroadcast?.update(dt);
    this.shipPursuitAmbient?.update(dt);
    if (this.shipAssault?.ocean) {
      if (this.dialogue.running) this.dialogue.update(dt, Input);
      return;
    }
    if (this.shipCastle?.fullFrame) {
      if (this.dialogue.running) this.dialogue.update(dt, Input);
      return;
    }
    if (this.shipMemory?.fullFrame) {
      if (this.dialogue.running) this.dialogue.update(dt, Input);
      return;
    }

    if (this.maillardArrival) {
      this.maillardArrival.update(dt);
      if (this.dialogue.running) this.dialogue.update(dt, Input);
      return;
    }
    if (this.seaChase) {
      this.seaChase.update(dt, Input);
      if (this.seaChase.outcome === 'failed') { this.returnFromSeaChase(); return; }
      if (this.dialogue.running) this.dialogue.update(dt, Input);
      if (this.seaChase?.outcome === 'cleared' && !this.dialogue.running && !this.has('obj5_maillard_done')) this.startMaillardArrival();
      return;
    }
    if (this.seaRetryPromptPending && !this.dialogue.running) {
      this.seaRetryPromptPending = false;
      this.runScript([
        { text: L.sea_chase_retry, voice: 'narrator', choice: { options: [
          { label: L.sea_chase_retry_yes, goto: 'retry' },
          { label: L.sea_chase_retry_no, goto: 'end' },
        ], cancel: 1 } },
        { label: 'retry' },
        { fade: 'white', duration: 0.18 }, { wait: 0.1 },
        { parallel: [{ seaChase: true }, { fade: 'in', duration: 0.28 }] },
        { label: 'end' }, { end: true },
      ]);
      return;
    }
    if (this.battle) { this.battle.update(dt, Input); if (this.dialogue.running) this.dialogue.update(dt, Input); return; }   // 전투 중: 전투 + 컷신 대기자만
    // 오버레이 씬(섭리오) 안에서 Tab/V 로 연 인게임 메뉴: 컷신이 scene3d 노드에서 기다리는 중이라 여기서 메뉴만 돌린다 (씬은 멈춰 있음)
    if (this.scene3d && this.state === 'menu') { this.updateMenu(); return; }
    if (this.dialogue.running) {
      this.dialogue.update(dt, Input);
      for (const e of this.entities) if (e !== this.player) e.update(dt, Input);
    } else if (this.state === 'menu') {                       // 메뉴(타는 중에 열린 것 포함): 열린 동안 월드는 멈춤
      this.updateMenu();
    } else if (this.ride) {                                   // 뗏목 등 탈것에 실려 가는 중: 입력·트리거 정지 (C = 점프, 되는 뗏목만 — Raft.canJump)
      if (Input.just('confirm') && this.ride.jump) this.ride.jump();
      if (Input.just('menu')) { this.state = 'menu'; this.menu = { index: 0, sub: null }; this.sound.sfx('open'); return; }   // 타는 중에도 메뉴(비상탈출) — 열린 동안 뗏목은 멈춤
      for (const e of this.entities) if (e !== this.player) e.update(dt, Input);
    } else if (!this.transitioning) {
      if (Input.just('confirm')) {
        const target = this.player.probe();
        if (target) { target.interact(this.player); }
      } else if (Input.just('menu')) {
        this.state = 'menu'; this.menu = { index: 0, sub: null }; this.sound.sfx('open');
      }
      for (const e of this.entities) e.update(dt, Input);
    }
    this.entities = this.entities.filter((e) => !e.dead);   // 컷신·탈것 중에 죽은 것(Swimmer 등)도 그 프레임에 치운다 (2026-09-10: 대사 중엔 안 치워져 헤엄 머리가 남던 버그)
    this.camera.follow(this.dialogue.running ? 0.05 : 0.18);
  }

  /**
   * 비상탈출 실행(메뉴 '비상탈출' → 탈출) — 설계(2026-09-10, 사용자 요청 "스토리 상태는 유지, 맵 진행을 막는 것만 롤백"):
   *   1) 스토리 플래그(컷신 본 것·아이템·동료·문 열림·레버·다리)는 그대로 — 되돌리면 소프트락(레버는 이미 뽑았는데 다리가 올라가는 등).
   *   2) 플레이어가 다시 할 수 있는 **맵 장치**만 입구 기준으로 되돌린다: 뗏목은 입구 스폰에 가까운 쪽 끝으로(`flags.raft_<id>`), 그래야 입구에서 다시 탈 수 있다.
   *   3) 탈것·피격·안내 창·입자 같은 순간 상태를 비우고 이 맵을 입구 스폰으로 **다시 진입**(엔티티 재생성, 동료 재정렬, 1회 컷신은 플래그로 안 반복).
   *   = 던전 방을 나갔다 들어오면 방만 초기화되고 진행은 남는 관례(방 리셋/탈출 로프). 새 맵 장치를 만들면 여기 '되돌릴 목록'에 넣을지 판단한다.
   */
  doEscape() {
    this.state = 'field'; this.menu = null; this.sound.sfx('close');
    this.escapes = (this.escapes || 0) + 1;   // 오버레이 씬(섭리오)이 열려 있으면 이 값이 바뀐 것을 보고 씬을 접는다
    const r = this.ride;
    if (r) { r.riding = false; r.moving = false; r.jumping = false; r.jumpY = 0; r.blocked = null; if (r.swimmer) { r.swimmer.dead = true; r.swimmer = null; } this.ride = null; }
    this.player.knock = null; this.prompt = null; this.fx = []; this.flames = []; this.flameEmitters = []; this.mash = null; this.booms = [];
    const spawnId = this.entrySpawn || 'start', def = MAPS[this.mapId], sp = def?.spawns?.[spawnId] || def?.spawns?.start || { x: this.player.x, y: this.player.y };
    for (const e of def?.entities || []) {                        // 뗏목: 입구에 가까운 끝으로 (route 0 또는 마지막)
      if (e.type !== 'raft') continue;
      const pts = [[e.x, e.y], ...(e.route || [])], last = pts.length - 1;
      const d0 = Math.hypot(pts[0][0] - sp.x, pts[0][1] - sp.y), d1 = Math.hypot(pts[last][0] - sp.x, pts[last][1] - sp.y);
      this.flags[e.flag || `raft_${e.id || 'raft'}`] = d1 < d0 ? last : 0;
    }
    this.changeMap(this.mapId, spawnId);
  }
  /** 메뉴 '비상탈출' 패널: 제목과 [탈출 / 취소]. */
  drawEscape(ctx, x, y) {
    ctx.font = FONT; ctx.textBaseline = 'top'; ctx.textAlign = 'left';
    const m = this.menu;
    drawBox(ctx, x, y, MENU_LAYOUT.width, MENU_LAYOUT.height);
    ctx.fillStyle = '#fff'; drawMenuText(ctx, L.escape_title, x + 8, y + 8, MENU_LAYOUT.width - 16);
    [L.escape_go, L.escape_cancel].forEach((label, i) => {
      const yy = y + 44 + i * 32; ctx.fillStyle = m.subIndex === i ? '#ffe066' : '#fff'; drawMenuText(ctx, label, x + 30, yy, MENU_LAYOUT.width - 38);
      if (m.subIndex === i) drawHeart(ctx, x + 17, yy + Math.round(F.size / 2) - 3);
    });
  }
  updateMenu() {
    const m = this.menu;
    const N = 5;   // 아이템 / 파티 / 비상탈출 / 설정 / 닫기
    if (m.sub === null) {
      if (Input.just('up')) { m.index = (m.index + N - 1) % N; this.sound.sfx('menu'); }
      if (Input.just('down')) { m.index = (m.index + 1) % N; this.sound.sfx('menu'); }
      if (Input.just('cancel') || (Input.just('confirm') && m.index === 4)) { this.state = 'field'; this.sound.sfx('close'); return; }
      if (Input.just('confirm')) { m.sub = m.index; m.subIndex = 0; this.sound.sfx('confirm'); }
    } else if (m.sub === 0) {                          // 아이템: 그냥 아이템(힐템)은 골라서 쓴다 → 대상 멤버 선택 (2026-09-10)
      const plain = plainItems(this.inventory), items = [...plain, ...keyItems(this.inventory)];
      m.subIndex = Math.max(0, Math.min(m.subIndex, items.length - 1));
      if (m.pick !== undefined && m.pick !== null) {   // 대상 고르는 중
        const members = [this.playerSprite || 'hyungsub', ...this.party];
        if (Input.just('left') || Input.just('up')) { m.pick = (m.pick + members.length - 1) % members.length; this.sound.sfx('menu'); }
        if (Input.just('right') || Input.just('down')) { m.pick = (m.pick + 1) % members.length; this.sound.sfx('menu'); }
        if (Input.just('cancel')) { m.pick = null; this.sound.sfx('cancel'); return; }
        if (Input.just('confirm')) { this.useItemOn(plain[m.subIndex], members[m.pick]); m.pick = null; if (m.subIndex >= plainItems(this.inventory).length) m.subIndex = Math.max(0, plainItems(this.inventory).length - 1); return; }
        return;
      }
      if (Input.just('up')) { m.subIndex = (m.subIndex + Math.max(1, items.length) - 1) % Math.max(1, items.length); this.sound.sfx('menu'); }
      if (Input.just('down')) { m.subIndex = (m.subIndex + 1) % Math.max(1, items.length); this.sound.sfx('menu'); }
      if (Input.just('cancel')) { m.sub = null; this.sound.sfx('cancel'); return; }
      if (Input.just('confirm')) { if (ITEMS[plain[m.subIndex]]?.heal) { m.pick = 0; this.sound.sfx('confirm'); } else this.sound.sfx('cancel'); }
    } else if (m.sub === 1) {                          // 파티: 보기만
      const count = 1 + this.party.length;
      if (Input.just('up')) { m.subIndex = (m.subIndex + count - 1) % count; this.sound.sfx('menu'); }
      if (Input.just('down')) { m.subIndex = (m.subIndex + 1) % count; this.sound.sfx('menu'); }
      if (Input.just('cancel') || Input.just('confirm')) { m.sub = null; this.sound.sfx('cancel'); }
    } else if (m.sub === 2) {                          // 비상탈출: [탈출 / 취소] — 끼었을 때. 스토리 유지, 뗏목만 입구 쪽으로, 입구 재진입 (doEscape)
      if (Input.just('up') || Input.just('down')) { m.subIndex = 1 - m.subIndex; this.sound.sfx('menu'); }
      if (Input.just('cancel') || (Input.just('confirm') && m.subIndex === 1)) { m.sub = null; this.sound.sfx('cancel'); return; }
      if (Input.just('confirm')) { this.doEscape(); return; }
    } else if (m.sub === 3) {                          // 설정
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
    if (this.state === 'battle-preview') {
      this.battlePreview.draw(ctx, SCREEN_W, SCREEN_H);
      if (this.fade.alpha > 0) { ctx.fillStyle = `rgba(${this.fade.color},${this.fade.alpha})`; ctx.fillRect(0, 0, SCREEN_W, SCREEN_H); }
      return;
    }
    if (this.state === 'shop') {
      this.shop.draw(ctx);
      if (this.fade.alpha > 0) { ctx.fillStyle = `rgba(${this.fade.color},${this.fade.alpha})`; ctx.fillRect(0, 0, SCREEN_W, SCREEN_H); }
      return;
    }
    if (this.shipAssault?.ocean) {
      ctx.save();
      if (this.shake) { const a = this.shake.amp; ctx.translate(Math.round(Math.sin(this.time * 73) * a), Math.round(Math.sin(this.time * 57) * a)); }
      this.shipAssault.draw(ctx);
      ctx.restore();
      this.textbox.draw(ctx);
      if (this.fade.alpha > 0) { ctx.fillStyle = `rgba(${this.fade.color},${this.fade.alpha})`; ctx.fillRect(0, 0, SCREEN_W, SCREEN_H); }
      return;
    }
    if (this.shipCastle?.fullFrame) {
      ctx.save();
      if (this.shake) { const a = this.shake.amp; ctx.translate(Math.round(Math.sin(this.time * 73) * a), Math.round(Math.sin(this.time * 57) * a)); }
      this.shipCastle.draw(ctx);
      ctx.restore();
      this.textbox.draw(ctx);
      if (this.fade.alpha > 0) { ctx.fillStyle = `rgba(${this.fade.color},${this.fade.alpha})`; ctx.fillRect(0, 0, SCREEN_W, SCREEN_H); }
      return;
    }
    if (this.shipMemory?.fullFrame) {
      ctx.save();
      if (this.shake) { const a = this.shake.amp; ctx.translate(Math.round(Math.sin(this.time * 73) * a), Math.round(Math.sin(this.time * 57) * a)); }
      this.shipMemory.draw(ctx);
      ctx.restore();
      this.textbox.draw(ctx);
      if (this.fade.alpha > 0) { ctx.fillStyle = `rgba(${this.fade.color},${this.fade.alpha})`; ctx.fillRect(0, 0, SCREEN_W, SCREEN_H); }
      return;
    }
    if (this.maillardArrival) {
      ctx.save();
      if (this.shake) { const a = this.shake.amp; ctx.translate(Math.round(Math.sin(this.time * 73) * a), Math.round(Math.sin(this.time * 57) * a)); }
      this.maillardArrival.draw(ctx);
      ctx.restore();
      this.textbox.draw(ctx);
      if (this.fade.alpha > 0) { ctx.fillStyle = `rgba(${this.fade.color},${this.fade.alpha})`; ctx.fillRect(0, 0, SCREEN_W, SCREEN_H); }
      return;
    }
    if (this.seaChase) {
      this.seaChase.draw(ctx);
      if (this.fade.alpha > 0) { ctx.fillStyle = `rgba(${this.fade.color},${this.fade.alpha})`; ctx.fillRect(0, 0, SCREEN_W, SCREEN_H); }
      return;
    }
    if (this.battle) {                                   // 전투 화면 (흔들림·페이드만 공유)
      ctx.save(); if (this.shake) { const a = this.shake.amp || 3; ctx.translate(Math.round((Math.random() * 2 - 1) * a), Math.round((Math.random() * 2 - 1) * a)); }
      this.battle.draw(ctx); ctx.restore();
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
    if (MAPS[this.mapId]?.backdrop === 'maillard_sunrise') this.sunrise.drawBackdrop(ctx);
    else if (MAPS[this.mapId]?.backdrop === 'purple_fire') this.drawBackdrop(ctx, cam);
    else if (MAPS[this.mapId]?.backdrop === 'teal_bush') this.drawBackdropTeal(ctx, cam);
    else if (MAPS[this.mapId]?.backdrop === 'obj_forest') this.drawBackdropTeal(ctx, cam, BACKDROP_OBJ);
    else if (MAPS[this.mapId]?.backdrop === 'youngcle_factory' || MAPS[this.mapId]?.backdrop === 'youngcle_furnace') {
      // 엄청대박인배 공장 / 용광로 변주(BUILD189, youngcle13·14): 같은 그리기, 그림만 다르다
      const factory = this.propImages[`assets/backdrops/${MAPS[this.mapId].backdrop}.png`];
      if (factory) {
        const offset = Math.min(factory.height - SCREEN_H, Math.max(0, Math.round(cam.y * 0.15)));
        ctx.drawImage(factory, 0, offset, SCREEN_W, SCREEN_H, 0, 0, SCREEN_W, SCREEN_H);
      }
    }
    else if (MAPS[this.mapId]?.backdrop === 'maillard_sea') {
      const sea = this.propImages['assets/backdrops/maillard_sea.png'];
      ctx.fillStyle = '#075783';
      ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
      if (sea) ctx.drawImage(sea, 0, -8, SCREEN_W, 240);
    }

    // 2D 줌: 월드(맵·엔티티·어두움)만 확대, UI 는 그대로
    ctx.save();
    const z = this.zoom;
    if (z.s < 0.9999) {
      ctx.translate(SCREEN_W / 2, SCREEN_H / 2); ctx.scale(z.s, z.s); ctx.translate(-SCREEN_W / 2, -SCREEN_H / 2);
    } else if (z.s > 1.0001) {
      const Fx = z.fx - cam.x, Fy = z.fy - cam.y;                       // 줌 초점(화면 좌표)
      const k = z.smax > 1 ? Math.min(1, (z.s - 1) / (z.smax - 1)) : 1; // 0(원래) → 1(최대 줌): 초점이 화면 중앙으로
      const Cx = Fx + (SCREEN_W / 2 - Fx) * k, Cy = Fy + (SCREEN_H / 2 - Fy) * k;
      ctx.translate(Cx, Cy); ctx.scale(z.s, z.s); ctx.translate(-Fx, -Fy);
    }
    this.map.draw(ctx, cam);
    this.drawRipples(ctx, cam);
    // y 정렬: 아래 있는 엔티티가 앞에 그려진다
    // y 정렬: 아래 있는 엔티티가 앞. 누운 플레이어는 침대 위에 보여야 하므로 맨 뒤(위)에 그린다
    const onProp = (e) => e === this.player && this.entities.some((p) => p.def.type === 'prop' && p.solid && p.overlaps(e.rect));
    const key = (e) => (e.def?.sortY ?? (e.y + e.h)) + (e.pose === 'lying' || onProp(e) || (this.ride && e === this.player) ? 10000 : 0);   // sortY: 항상 뒤에 그릴 소품 / 탈것에 탄 플레이어는 항상 위(덮이지 않게)
    const sorted = [...this.entities].sort((a, b) => key(a) - key(b));
    for (const e of sorted) {
      e.draw(ctx, cam);
      if (e === this.tvBroadcast?.anchor) this.tvBroadcast.draw(ctx, cam);
    }
    drawDarkSmoke(ctx, this, cam);
    for (const f of this.fx) { ctx.fillStyle = f.color; ctx.fillRect(Math.round(f.x - cam.x), Math.round(f.y - cam.y), 2, 2); }   // 물방울 등 작은 점
    if (this.sparks) { for (const p of this.sparks) { if (!(p.a > 0)) continue; ctx.globalAlpha = Math.min(1, p.a); ctx.fillStyle = p.color; const sz = p.size ?? (Math.floor(p.ang * 3) % 2 ? 4 : 2); ctx.fillRect(Math.round(p.x - cam.x) - sz / 2, Math.round(p.y - cam.y) - sz / 2, sz, sz); } ctx.globalAlpha = 1; }
    if (this.flames.length) { for (const p of this.flames) { const k = p.t / p.life; ctx.globalAlpha = 0.9 * (1 - k * k); ctx.fillStyle = k < 0.25 ? '#fff2a0' : k < 0.5 ? '#ffb43a' : k < 0.8 ? '#ff5a2a' : '#6a2a1a'; const sz = Math.max(1, Math.round(p.size * (1 - k * 0.6))); ctx.fillRect(Math.round(p.x - cam.x) - (sz >> 1), Math.round(p.y - cam.y) - (sz >> 1), sz, sz); } ctx.globalAlpha = 1; }   // 불꽃(컷신 {fire}/{rocket})
    if (this.booms.length) this.drawBooms(ctx, cam);
    this.bubble.draw(ctx, cam);
    this.vortex.draw(ctx, cam);
    drawEditorUnionWorld(ctx, this, cam);
    // 맵 JSON `dim: 0~1` — 살짝 어두운 공간(거실 등). 대화창/UI 는 어두워지지 않는다
    const dim = MAPS[this.mapId]?.dim;
    const light = MAPS[this.mapId]?.spotlight;
    const stageLit = drawEditorUnionLight(ctx, this, cam);
    if (!stageLit && light) {
      ctx.save(); ctx.translate(light.x - cam.x, light.y - cam.y); ctx.scale(1, light.ry / light.rx);
      const shade = ctx.createRadialGradient(0, 0, light.rx * 0.35, 0, 0, light.rx);
      shade.addColorStop(0, 'rgba(0,0,0,0)'); shade.addColorStop(1, `rgba(0,0,0,${dim || 0})`);
      ctx.fillStyle = shade; ctx.fillRect(-10000, -10000, 20000, 20000);
      const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, light.rx);
      glow.addColorStop(0, `rgba(220,202,255,${light.alpha})`); glow.addColorStop(1, 'rgba(220,202,255,0)');
      ctx.fillStyle = glow; ctx.fillRect(-light.rx, -light.rx, light.rx * 2, light.rx * 2);
      ctx.restore();
    } else if (!stageLit && dim) { ctx.fillStyle = `rgba(0,0,0,${dim})`; ctx.fillRect(-SCREEN_W * 2, -SCREEN_H * 2, SCREEN_W * 5, SCREEN_H * 5); }
    // 맵 JSON `vision: { radius, edge, noise }` — 주인공 중심 원형 시야(BUILD226 짜장 토리이 길, 사용자 “주인공 기준 3분의 2 원만 보이고 겉으로 갈수록 노이즈 어둠이 차게”):
    //   radius 까지 맑고 edge 에서 완전히 검다. 그 사이엔 거친 알갱이(noise)가 바깥으로 갈수록 짙게 차오른다. 대화창/UI 는 어두워지지 않는다
    const vision = MAPS[this.mapId]?.vision;
    if (!stageLit && vision) this.drawVision(ctx, cam, vision);
    drawEditorUnionLabels(ctx, this, cam);
    for (const e of this.entities) if (e.drawOverlay && !e.dead) e.drawOverlay(ctx, cam);   // 어두움 위에 그리는 것(낙석 빛기둥 등)
    if (MAPS[this.mapId]?.backdrop === 'maillard_sunrise') this.sunrise.drawWorldLight(ctx);
    ctx.restore();
    drawYoungcleLoungeEffects(ctx, this, cam);
    if (this.hurt > 0) { ctx.fillStyle = `rgba(255,40,40,${Math.min(0.45, this.hurt * 1.4)})`; ctx.fillRect(0, 0, SCREEN_W, SCREEN_H); }
    // 방송 채팅창(물리 해상도, 오른쪽) → 오류창 → 대화창 순서로 겹친다
    if (this.chat.open) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); this.chat.draw(ctx, 244); ctx.restore(); }
    this.sysdialog.draw(ctx);
    this.shipAssault?.drawDust(ctx);
    this.shipPursuitAmbient?.draw(ctx);
    this.shipCastle?.draw(ctx);
    this.textbox.draw(ctx);
    if (this.caption) this.drawCaption(ctx);
    drawEditorUnionOverlay(ctx, this);
    if (this.prompt) this.drawPrompt(ctx);
    if (this.mash) this.drawMash(ctx);
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
    ctx.font = FONT; ctx.textBaseline = 'top'; ctx.textAlign = 'left';
    const LH = F.lineH, layout = MENU_LAYOUT;
    const { x, y, width, height, inset } = layout;
    drawBox(ctx, 8, 8, 100, LH * 5 + 16);
    const items = [L.menu_items, L.menu_party, L.menu_escape, L.menu_settings, L.menu_close];
    items.forEach((label, i) => {
      ctx.fillStyle = (m.sub === null ? i === m.index : i === m.sub) ? '#ffe066' : '#fff';
      drawMenuText(ctx, label, 30, 16 + i * LH, 70);
      if (m.sub === null && i === m.index) drawHeart(ctx, 17, 16 + Math.round(F.size / 2) - 3 + i * LH);
    });
    if (m.sub === 0) {
      const plain = plainItems(this.inventory), keys = keyItems(this.inventory);
      const inventory = [...plain, ...keys], item = inventory[m.subIndex];
      drawBox(ctx, x, y, width, height);
      if (m.pick !== undefined && m.pick !== null) {
        const members = [this.playerSprite || 'hyungsub', ...this.party];
        const visible = menuWindow(members.length, m.pick, layout.targetRows);
        ctx.fillStyle = '#ffe066'; drawMenuText(ctx, item, x + inset, y + inset, width - inset * 2, 2);
        ctx.fillStyle = '#fff'; drawMenuText(ctx, L.menu_use_on, x + inset, 64, width - inset * 2);
        members.slice(visible.start, visible.end).forEach((id, row) => {
          const i = row + visible.start, ch = CHARACTERS[id] || { name: id };
          const ry = layout.targetY + row * layout.memberHeight, sel = i === m.pick;
          const name = i === 0 ? (this.has('void_fallen') ? '요플래' : ch.name) : (ch.partyName || ch.name);
          ctx.fillStyle = sel ? '#ffe066' : '#fff'; drawMenuText(ctx, name, x + 22, ry, width - 30);
          if (sel) drawHeart(ctx, x + 9, ry + Math.round(F.size / 2) - 3);
          const max = this.maxHpOf(id), hp = this.hpOf(id), barX = x + 224, barW = 116;
          ctx.fillStyle = '#fff'; drawMenuText(ctx, `HP ${hp}/${max}`, x + 22, ry + 24, 194);
          ctx.fillStyle = '#3a2020'; ctx.fillRect(barX, ry + 29, barW, 7);
          ctx.fillStyle = ch.hpColor || '#ffd23b'; ctx.fillRect(barX, ry + 29, Math.round(barW * Math.max(0, Math.min(1, hp / max))), 7);
        });
        ctx.fillStyle = '#9a9ab0'; drawMenuText(ctx, `${m.pick + 1}/${members.length}  ${L.menu_target_controls}`, x + inset, 326, width - inset * 2);
      } else {
        const rows = menuInventoryRows(plain, keys, L);
        const selectedRow = Math.max(0, rows.findIndex((row) => row.index === m.subIndex));
        const visible = menuWindow(rows.length, selectedRow, layout.listRows);
        ctx.fillStyle = '#ffe066'; drawMenuText(ctx, `${L.menu_money} ${this.money}${L.won}`, x + inset, y + inset, width - inset * 2);
        rows.slice(visible.start, visible.end).forEach((row, offset) => {
          const ry = layout.listY + offset * LH, selected = row.index === m.subIndex;
          ctx.fillStyle = row.index === null ? '#9a9ab0' : selected ? '#ffe066' : '#fff';
          drawMenuText(ctx, row.label, x + 22, ry, 226);
          if (selected) drawHeart(ctx, x + 9, ry + Math.round(F.size / 2) - 3);
          const heal = row.index === null ? null : ITEMS[row.label]?.heal;
          if (heal) {
            ctx.fillStyle = selected ? '#ffe066' : '#fff';
            drawMenuText(ctx, `HP ${heal > 0 ? '+' : ''}${heal}`, x + 254, ry, 94);
          }
        });
        ctx.fillStyle = '#9a9ab0';
        if (inventory.length) drawMenuText(ctx, `${m.subIndex + 1}/${inventory.length}  ${m.subIndex < plain.length ? L.menu_plain_items : L.menu_key_items}`, x + inset, 264, width - inset * 2);
        ctx.fillStyle = '#fff'; drawMenuText(ctx, item || L.no_items, x + inset, layout.footerY, width - inset * 2, 2);
        ctx.fillStyle = '#9a9ab0'; drawMenuText(ctx, ITEMS[plain[m.subIndex]]?.heal ? L.menu_item_controls : L.menu_browse_controls, x + inset, 326, width - inset * 2);
      }
    }
    if (m.sub === 1) this.drawParty(ctx, x, y);
    if (m.sub === 2) this.drawEscape(ctx, x, y);
    if (m.sub === 3) {
      drawBox(ctx, x, y, width, height);
      ctx.fillStyle = '#fff'; drawMenuText(ctx, L.menu_settings, x + inset, y + inset, width - inset * 2);
      const rows = [
        [L.setting_text_speed, L[TEXT_SPEEDS[this.settings.textSpeed].key]],
        [L.setting_sound, this.settings.sound ? L.on : L.off],
      ];
      rows.forEach(([k, v], i) => {
        ctx.fillStyle = i === m.subIndex ? '#ffe066' : '#fff';
        drawMenuText(ctx, k, x + 22, 52 + i * 32, 156);
        drawMenuText(ctx, '< ' + v + ' >', x + 194, 52 + i * 32, 154);
        if (i === m.subIndex) drawHeart(ctx, x + 9, 52 + Math.round(F.size / 2) - 3 + i * 32);
      });
      ctx.fillStyle = '#9a9ab0'; drawMenuText(ctx, L.menu_settings_controls, x + inset, 326, width - inset * 2);
    }
  }

  /** 파티 상태창: 초상화, 표시 이름, 역할, HP를 고정 높이 행에 표시한다. */
  drawParty(ctx, x, y) {
    const LH = F.lineH, layout = MENU_LAYOUT, members = [this.playerSprite || 'hyungsub', ...this.party];
    const selected = this.menu.subIndex || 0, visible = menuWindow(members.length, selected, layout.memberRows);
    drawBox(ctx, x, y, layout.width, layout.height);
    ctx.font = FONT; ctx.textBaseline = 'top'; ctx.textAlign = 'left';
    ctx.fillStyle = '#fff'; drawMenuText(ctx, L.menu_party, x + 8, y + 8, layout.width - 16);
    members.slice(visible.start, visible.end).forEach((id, row) => {
      const i = row + visible.start, ch = CHARACTERS[id] || { name: id };
      const ry = layout.memberY + row * layout.memberHeight;
      const face = this.portraits[id]; if (face) ctx.drawImage(face, x + 10, ry + 2, 48, 48);
      const name = i === 0 ? (this.has('void_fallen') ? '요플래' : ch.name) : (ch.partyName || ch.name);
      ctx.fillStyle = '#ffe066'; drawMenuText(ctx, name, x + 68, ry, layout.width - 76);
      ctx.fillStyle = '#fff'; drawMenuText(ctx, i === 0 ? L.party_leader : L.party_member, x + 68, ry + LH, layout.width - 76);
      const max = this.maxHpOf(id), hp = this.hpOf(id), barX = x + 224, barW = 116;
      drawMenuText(ctx, `HP ${hp}/${max}`, x + 68, ry + 38, 148);
      ctx.fillStyle = '#3a2020'; ctx.fillRect(barX, ry + 43, barW, 7);
      ctx.fillStyle = ch.hpColor || '#ffd23b'; ctx.fillRect(barX, ry + 43, Math.round(barW * Math.max(0, Math.min(1, hp / max))), 7);
    });
    ctx.fillStyle = '#9a9ab0';
    drawMenuText(ctx, members.length > layout.memberRows ? `${selected + 1}/${members.length}  ${L.menu_browse_controls}` : L.menu_back_controls, x + 8, 326, layout.width - 16);
  }

  /** 지역 이름 캡션: 페이드 인 → 유지 → 페이드 아웃 (언더테일 지역명처럼) */
  /** 캐릭터 주위로 파란 물방울 n개 (강아지 물 털기 등) — 컷신 {shakeOff} 가 매 프레임 조금씩 부른다 */
  emitDroplets(e, n = 2, color = '#5b8cff') { this.emitDropletsAt(e.x + e.w / 2, e.y + e.h - 18, n, color); }
  /** 한 점에서 파란 물방울 n개 (점프 이륙·착지 물튀김 등) */
  emitDropletsAt(cx, cy, n = 6, color = '#5b8cff') {
    for (let i = 0; i < n; i++) this.fx.push({ x: cx + (Math.random() - 0.5) * 18, y: cy + (Math.random() - 0.5) * 20, vx: (Math.random() - 0.5) * 190, vy: -70 - Math.random() * 90, t: 0.4 + Math.random() * 0.25, color });
  }
  /** 작은 안내 창(언더테일식 검은 상자·흰 테두리), 화면 위쪽 가운데. 텍스트로 넘길 수 없고 C 로만 닫힌다 */
  drawPrompt(ctx) {
    const p = this.prompt; ctx.font = FONT; ctx.textBaseline = 'top'; ctx.textAlign = 'left';
    const tw = Math.ceil(ctx.measureText(p.text).width), w = tw + 28, h = 28, x = Math.round((SCREEN_W - w) / 2), y = 54;
    ctx.fillStyle = '#fff'; ctx.fillRect(x - 2, y - 2, w + 4, h + 4); ctx.fillStyle = '#000'; ctx.fillRect(x, y, w, h);
    ctx.globalAlpha = 0.75 + 0.25 * Math.sin(p.t * 6); ctx.fillStyle = '#fff'; ctx.fillText(p.text, x + 14, y + 7); ctx.globalAlpha = 1;
  }

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
/** 배경 실루엣 팔레트 — drawBackdropTeal(pal). 청록숲(teal_bush)은 기존 값 그대로, 옵젝영역(obj_forest)은 초록 덤불에 먼 층·잎 점이 보라 (2026-09-11 "울창한 초록숲, 보라색도 살짝") */
const BACKDROP_TEAL = { mid: '#03110f', stem: '#020b0a', layers: [
  { par: 0.12, col: '#071c1a', rim: '#0b2926', leaf: '#0e3330', base: 130, n: 16, r: [34, 60], sway: 0.9 },
  { par: 0.22, col: '#0b2a27', rim: '#123b37', leaf: '#184944', base: 156, n: 14, r: [26, 46], sway: 1.3 },
  { par: 0.38, col: '#103b37', rim: '#1a5450', leaf: '#22665f', base: 186, n: 12, r: [18, 34], sway: 1.8 },
] };
const BACKDROP_OBJ = { mid: '#061408', stem: '#03100a', layers: [
  { par: 0.12, col: '#140a24', rim: '#211438', leaf: '#3a2358', base: 130, n: 16, r: [34, 60], sway: 0.9 },
  { par: 0.22, col: '#0a2612', rim: '#133a1e', leaf: '#4a2f6e', base: 156, n: 14, r: [26, 46], sway: 1.3 },
  { par: 0.38, col: '#0f3a1a', rim: '#1b5a2a', leaf: '#2e8a40', base: 186, n: 12, r: [18, 34], sway: 1.8 },
] };
export const BUILD = '2026-09-18.225';
const canvas = document.getElementById('screen');
const game = new Game(canvas);
window.game = game;   // 콘솔 디버깅용

function resize() {
  const s = pixelDisplayScale(canvas.width, canvas.height, innerWidth, innerHeight, devicePixelRatio);
  canvas.style.width = canvas.width * s + 'px';
  canvas.style.height = canvas.height * s + 'px';
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
  // rAF 의 now 는 프레임 시작 시각이라 load 직후 잡은 performance.now() 보다 앞설 수 있다 → 첫 프레임 dt 가 음수가 되어 걷기 프레임이 -1 로 떨어지고 그리기가 죽는다(2026-09-15 비데 방 입장 이동)
  const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
  last = now;
  game.dt = dt;
  game.update(dt);
  game.draw();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
