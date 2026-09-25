// ─────────────────────────────────────────────────────────────
// 턴제 전투 화면 (사용자 브리핑 2026-09-10) — 델타룬식 심플 턴제.
//   왼쪽: 우리 편 형섭·경섭·빠맨(위→아래, 파티에 있는 사람만). 오른쪽: 적(우리를 바라봄).
//   HP 형섭 100 / 경섭 120 / 빠맨 90 (characters.js hp). 경험치·공격력 없음: 우리 공격은 무조건 1 데미지, 적 hp = 맞아야 하는 횟수.
//   턴: 형섭→경섭→빠맨 순으로 행동 선택(하단 카드: [공격하기] [아이템]) → 공격하기는 적을 고르고 C → 순서대로 **빠르게** 달려가 공격 모션 한 방(효과음)·복귀,
//       멤버 사이 딜레이 짧게 → 적 턴: 하트(소울)가 흰 상자 안에서 탄막을 피한다(방향키, X 로 느리게). 맞으면 살아 있는 멤버 중 하나가 적의 damage 만큼 잃는다.
//   아이템은 '그냥 아이템'(src/data/items.js kind:'plain')만 뜬다 — 지금은 없음. 승리: 적 전부 0. 패배: 전원 0 → "다시 일어난다" 뒤 같은 전투 재시작.
//   적 추가 = src/data/enemies.js 항목 하나 + (원하면) src/battle/bullets.js 패턴 하나. 튜토리얼 기믹·행동하기(ACT)는 다음 브리핑.
//   컷신: { battle:{ enemies:['cs','cs'], bgm:'rude_buster', flag?:'..._won' } } — 끝날 때까지 기다리고 game.lastBattle = { win }.
// ─────────────────────────────────────────────────────────────
import { FONT } from '../ui/font.js';
import { CHARACTERS, PARTY_ORDER as WALK_ORDER } from '../data/characters.js';
import { ENEMIES } from '../data/enemies.js';
import { BATTLE_SPRITES, BATTLE_PREVIEW } from '../data/battle-sprites.js';
import { loadActorFrames, playbackFrameAt } from '../ui/battle-preview.js';
import { BattleAction } from '../ui/battle-action.js';
import { Board, Soul, Bullet, PATTERNS } from './bullets.js';
import { getBattleMode, NATIVE } from './modes.js';
import { BATTLE_BGS } from './backgrounds.js';
import { drawChoimisKaraoke } from './choimis-karaoke.js';
import { createChoimisDefenseCinematic } from './choimis-defense-cinematic.js';
import { CHOIMIS_RAP_VIDEO, createChoimisRapVideo } from './choimis-rap-video.js';
import { ITEMS, plainItems } from '../data/items.js';
import { useBattleItem } from '../core/item-use.js';
import L from '../data/locale/ko.js';
import { createBattleSupport } from './support/baron-cannon.js';
import { BARON_CANNON } from '../data/baron-cannon.js';
import { menuTextLines } from '../ui/menu-layout.js';
import { drawMosaicText } from '../ui/text-mosaic.js';

const SCREEN_W = 480, SCREEN_H = 360, LH = 18;
const PARTY_ORDER = ['hyungsub', ...WALK_ORDER];   // 위→아래 = 걷는 순서(형섭·경섭·빠맨) — characters.js 단일 진실
const PARTY_X = 84, PARTY_YS = { 1: [190], 2: [164, 224], 3: [104, 164, 224] };
const ENEMY_X = 396, ENEMY_YS = { 1: [176], 2: [120, 236], 3: [92, 168, 244], 4: [110, 246, 110, 246] };   // 4명은 2×2(아짐키야, def.dx 로 좌우 열을 벌린다, BUILD227)   // 큰 보스는 def.dx/dy 로 자리 보정(레드·블루: 위·아래로 엇갈리게)
const ACTOR_SCALE = 0.66;            // 미리보기(0.25) 대비 (사용자 요청으로 10% 확대)
const APPROACH_SPEED = 820, RETURN_SPEED = 700;   // px/s — "생각보다 빠르게"
const ATTACK_SPEEDUP = 1.35;         // 공격 모션 재생 배속
const BETWEEN_ACTS = 0.08;           // 멤버 사이 딜레이(초) — "빠르게빠르게"
const HIT_AT = 0.14;                 // 공격 모션 시작 뒤 이 시점에 데미지·효과음
const PREP_OPEN = 0.3;               // 적 턴: 탄막 상자가 패널 자리에서 펼쳐지는 시간(초) — 그 뒤 소울이 보이고 움직일 수 있다
const PREP_HOLD = 0.9;               // 말풍선이 다 뜬 뒤 탄막까지 준비 시간(초) (사용자: "펼쳐지고 대사 나오고 준비할 딜레이")
const BUBBLE_CPS = 0.03;             // 말풍선 타자 속도(초/글자)
const BGM_DELAY = 0;                 // 전투 화면이 열리는 순간 브금 (침묵 없음). 2026-09-11 타임라인: 징글 마지막 악절이 1.45~1.5s 에 끝나고 화면이 1.5s 에 열린다 → 그 자리에 바로 이어 붙인다
const BGM_FADE = 0;                  // 페이드 없음. rude_buster.mp3 는 0.000s 에 가장 큰 첫 타(peak 1.07)가 있어 0.3s 선형 페이드가 그 타를 통째로 삼켰다(사용자 2026-09-11 '시작 지점이 사라진 느낌'). 징글은 1.50s 에 끝나고 화면이 1.52s 에 열리므로 그 자리에서 원래 음량으로 바로 (tests/playtest/battle_bgm.mjs 가 currentTime·음량을 잰다)
const SMALL = FONT.replace(/^\d+px/, '12px');   // 말풍선·HP 숫자용 작은 글씨
const DOWN_TURNS = 3;                // 쓰러진 동료가 일어나기까지의 라운드 수 — 라운드(적 턴 끝)마다 회복 이펙트, 마지막에 반피로 부활 (사용자 2026-09-11)
const REVIVE_RATIO = 0.5;            // 부활 HP 비율(반피). 승리 시 쓰러진 동료도 이 비율로 일어난다
const LOSE_HOLD = 0.9;               // 전원 쓰러진 뒤 전장을 이만큼 보여 주고 어두워진다(게임 오버 = 셋 다 쓰러졌을 때만)
const RETRY_JINGLE = 1.5;            // 다시 도전: 검은 화면에서 징글이 끝나는 시간(표준 조우 타임라인과 같다) 뒤 전투 화면
const BOSS_VICTORY_FADE = 1.8;
const OPENING_FOCUS_FADE = 0.22;
const stripTags = (t) => (t || '').replace(/\{[^}]*\}/g, '');
const FRAME_CACHE = new Map(), IMAGE_CACHE = new Map();   // 전투마다 아틀라스를 다시 색키 처리하지 않는다(첫 전투 뒤엔 로딩 정지 없음)
const DOWN_SRC = (id) => `assets/battle/down/${id}.png`;   // HP 0 쓰러짐 정지 그림(PR #17, 96×96, 하단 기준점 48,89, 머리 오른쪽·발 왼쪽 — 누운 길이 81px ≈ 서 있는 키 81px 이라 배율 1)
const DOWN_SCALE = 1, DOWN_PIVOT = [48, 89];
const nextPatternConfig = (enemy) => {
  const enraged = !!enemy.def.enragedPatterns?.length && enemy.hp / enemy.maxHp <= enemy.def.enragedAt;
  const configs = (enraged ? enemy.def.enragedPatterns : enemy.def.patterns) || [];
  const index = enraged !== !!enemy.enraged ? 0 : (enemy.patternIdx || 0);
  if (enemy.def.alternatingPatternMode) {
    const regular = configs.filter(config => config.mode !== enemy.def.alternatingPatternMode);
    const alternate = configs.filter(config => config.mode === enemy.def.alternatingPatternMode);
    const round = Math.floor(index / 2);
    if (index % 2 === 0) return { enraged, config: regular[round % regular.length] };
    const cycleStart = round - round % alternate.length;
    const fits = (config, slot) => !config.avoidAdjacentType || [slot, slot + 1].every(offset =>
      regular[(cycleStart + offset) % regular.length]?.type !== config.avoidAdjacentType);
    for (let slot = 0; slot < alternate.length; slot++) {
      if (fits(alternate[slot], slot)) continue;
      const replacement = alternate.findIndex((config, other) => other !== slot && fits(config, slot) && fits(alternate[slot], other));
      if (replacement >= 0) [alternate[slot], alternate[replacement]] = [alternate[replacement], alternate[slot]];
    }
    return { enraged, config: alternate[round % alternate.length], cycle: Math.floor(round / alternate.length) };
  }
  return { enraged, config: configs.length ? configs[index % configs.length] : null };
};
const loadImage = (src) => new Promise((resolve) => { const im = new Image(); im.onload = () => resolve(im); im.onerror = () => resolve(null); im.src = src; });
const cached = (map, key, make) => { if (!map.has(key)) map.set(key, make()); return map.get(key); };

/** 빠른 접근/복귀용: BattleAction 의 이동 시간을 속도 기준으로 다시 잡는다 */
class FastAction extends BattleAction {
  constructor(home, target, attackDuration) {
    super(home, target, attackDuration);
    const d = Math.hypot(target[0] - home[0], target[1] - home[1]);
    this.approachT = d / APPROACH_SPEED; this.returnT = d / RETURN_SPEED;
  }
  update(dt) {
    this.elapsed += Math.max(0, dt);
    while (this.mode !== 'idle') {
      const duration = this.mode === 'attack' ? this.attackDuration : this.mode === 'approach' ? this.approachT : this.returnT;
      if (this.elapsed < duration) break;
      this.elapsed -= duration;
      if (this.mode === 'approach') this.mode = 'attack'; else if (this.mode === 'attack') this.mode = 'return'; else { this.reset(); return; }
    }
    if (this.mode === 'idle') this.position = [...this.home];
    else if (this.mode === 'attack') this.position = [...this.target];
    else { const T = this.mode === 'approach' ? this.approachT : this.returnT; const k = Math.min(1, this.elapsed / T); const a = this.mode === 'return' ? 1 - k : k; this.position = this.home.map((v, i) => v + (this.target[i] - v) * a); }
  }
}

export class Battle {
  /** 진입 연출 동안 아틀라스·적 이미지를 캐시에 올려 둔다 — 첫 전투도 로딩 정지 없이 징글이 끝나는 순간 화면이 열린다 (2026-09-11 브금 전환 타임라인) */
  static preload(game, enemyIds = []) {
    const ids = PARTY_ORDER.filter((id) => id === 'hyungsub' || game.party.includes(id));
    const pending = [];
    for (const id of ids) if (BATTLE_SPRITES[id]) {
      pending.push(cached(FRAME_CACHE, id, () => loadActorFrames(BATTLE_SPRITES[id], BATTLE_PREVIEW.colorKey)));
      pending.push(cached(IMAGE_CACHE, DOWN_SRC(id), () => loadImage(DOWN_SRC(id))));
    }
    for (const eid of enemyIds) {
      const def = ENEMIES[eid]; if (!def) continue;
      const sources = [def.image || def.sheet?.src, ...Object.values(def.actions || {}).map(action => action.src), ...Object.values(def.projectiles || {})];
      for (const src of sources) if (src) pending.push(cached(IMAGE_CACHE, src, () => loadImage(src)));
    }
    return Promise.all(pending);
  }
  constructor(game, cfg) {
    this.game = game; this.cfg = cfg;
    const ids = PARTY_ORDER.filter((id) => id === 'hyungsub' || game.party.includes(id));
    const ys = PARTY_YS[ids.length] || PARTY_YS[3];
    this.members = ids.map((id, i) => {
      const ch = CHARACTERS[id]; const max = game.maxHpOf ? game.maxHpOf(id) : (ch.hp ?? 100);   // 최대 HP = 기본 + 버프(레드·블루 버프 +20, game.hpBonus)
      const name = i === 0 && game.has?.('void_fallen') ? '요플래' : (ch.partyName || ch.name);
      return { id, name, maxHp: max, hp: Math.max(1, Math.min(max, game.partyHp?.[id] ?? max)), home: [PARTY_X, ys[i]], frames: null, action: null, popup: null, down: false, downTurns: 0, attackMode: CHARACTERS[id]?.attackMode };   // attackMode: 동료별 공격 방식(청소부 throw)
    });
    const eys = ENEMY_YS[cfg.enemies.length] || ENEMY_YS[3];
    this.enemies = cfg.enemies.map((id, i) => { const def = ENEMIES[id]; return { id, def, name: def.name, hp: def.hp, maxHp: def.hp, x: ENEMY_X + (def.dx || 0), y: eys[i] + (def.dy || 0), img: null, dead: false, dying: 0, shake: 0, blink: 0, popup: null, patternIdx: 0, animationTime: 0 }; });
    this.state = 'load'; this.t = 0; this.memberIdx = 0; this.menuIdx = 0; this.targetIdx = 0; this.itemIdx = 0; this.plans = []; this.text = ''; this.textT = 0;
    this.board = new Board(); this.board.color = cfg.boardColor; this.soul = new Soul(); this.bullets = []; this.patterns = []; this.rnd = Math.random; this.rapVideo = null; this.preparedRapVideo = null;
    this.modes = { attack: cfg.modes?.attack || 'rush', enemy: cfg.modes?.enemy || 'bullets' }; this.gimmick = null;   // 기믹 모드(src/battle/modes.js): 공격/적 턴을 미니게임으로 바꿔 끼움
    this.result = null; this.pressed = false; this.fx = []; this.retryT = undefined; this.openingShown = false;   // fx: 회복 반짝임(쓰러진 동료 위)
    this.support = createBattleSupport(this); this.interlude = null;
    this.load();
  }

  async load() {
    const loadToken = {};
    this.bgmLoadToken = loadToken;
    this.bgmWait = undefined;
    const choimisBattle = this.enemies.some(enemy => enemy.id === 'choimis_flower');
    if (choimisBattle && !this.preparedRapVideo) this.preparedRapVideo = createChoimisRapVideo({ ...CHOIMIS_RAP_VIDEO, autoplay: false });
    try {
      await Promise.all([
        choimisBattle ? this.game.sound.loadSfxFiles?.(['yellowheart_charge', 'yellowheart_shot', 'yellowheart_shot_big', 'choimis_chosouya', 'choimis_piercing_blood', 'choimis_lend_power']) : null,
        choimisBattle ? this.game.requestPropImage?.('assets/props/choimis-dolphin-breach.png') : null,
        this.preparedRapVideo?.ready,
        this.support?.load((src) => cached(IMAGE_CACHE, src, () => loadImage(src))),
        ...this.members.map(async (m) => { m.frames = await cached(FRAME_CACHE, m.id, () => loadActorFrames(BATTLE_SPRITES[m.id], BATTLE_PREVIEW.colorKey)); m.downImg = await cached(IMAGE_CACHE, DOWN_SRC(m.id), () => loadImage(DOWN_SRC(m.id))); }),
        ...this.enemies.map(async (e) => {
          e.img = await cached(IMAGE_CACHE, e.def.image || e.def.sheet?.src, () => this.loadEnemyImage(e.def));
          e.actionImages = Object.fromEntries(await Promise.all(Object.entries(e.def.actions || {}).map(async ([name, action]) => [name, await cached(IMAGE_CACHE, action.src, () => loadImage(action.src))])));
          e.projectiles = Object.fromEntries(await Promise.all(Object.entries(e.def.projectiles || {}).map(async ([key, src]) => [key, await cached(IMAGE_CACHE, src, () => loadImage(src))])));
        }),
      ]);
    } catch (err) { console.warn('[battle] 에셋 로드 실패', err); }
    if (this.bgmLoadToken !== loadToken) return;
    if (!this.cfg.seamlessIntro || this.retrying) this.game.fadeTo(0, 0.12);
    // 이어지는 전투의 첫 진입: 필드 캐릭터가 전투 모션으로 바뀌는 바로 그 순간 검 뽑는 소리(사용자 “검뽑는 사운드 나는 동시에 스프라이트도 모션과 함께 전환”)
    else if (this.cfg.seamlessSfx) { this.sfx(this.cfg.seamlessSfx); this.game.shake = { time: 0.3, amp: 3 }; }
    this.retrying = false;
    this.bgmWait = Math.max(BGM_DELAY, ...this.enemies.map(enemy => enemy.def.bgmDelay ?? 0));
    const preemptive = this.support?.preemptiveMode?.();
    if (preemptive) { this.startEnemyMode(preemptive); return; }
    this.members.forEach((m, i) => { m.pose = -0.12 * i; });   // 전투 시작 포즈: 공격 모션을 제자리에서 한 번(순서대로 살짝 어긋나게)
    // 인트로 문구 목록: cfg.intro(전투 안 대사 — 튜토리얼 기믹 등, 문자열 또는 {speaker, portrait, voice, text}) 없으면 적의 appear 줄
    this.introLines = (this.cfg.intro && this.cfg.intro.length) ? [...this.cfg.intro] : [this.enemies.map((e) => e.def.lines?.appear).filter(Boolean).join('\n') || `* ${this.enemies[0].name} 이(가) 나타났다!`];
    this.introLines.push(...this.enemies.flatMap(enemy => enemy.def.openingLines || []));
    this.showLine(this.introLines.shift());
    this.state = 'intro'; this.t = 0;
  }
  loadEnemyImage(def) {
    return new Promise((resolve) => { const im = new Image(); im.onload = () => resolve(im); im.onerror = () => resolve(null); im.src = def.image || def.sheet?.src; });
  }

  // ── 유틸 ──
  alive() { return this.members.filter((m) => !m.down); }
  living() { return this.enemies.filter((e) => !e.dead); }
  /** 때릴 수 있는 적(def.untargetable 제외 — 오방순·나람은 공격 전용, BUILD207). 승리 판정·공격 대상은 이걸 쓴다 */
  targets() { return this.living().filter((e) => !e.def.untargetable); }
  /** Explicit enemy metadata selects the boss victory transition, including mixed encounters. */
  get bossBattle() { return this.enemies.some(e => e.def.boss === true); }
  setText(t) { this.text = stripTags(t); this.textT = 0; this.shown = 0; this.speaker = null; this.portrait = null; this.voice = 'narrator'; this.lineMosaic = null; }
  /** 대사 한 줄: 문자열이면 나레이션, 객체면 화자 이름·초상화·목소리 */
  showLine(l) { if (typeof l === 'string') { this.setText(l); return; } this.setText(l.text); this.speaker = l.speaker || null; this.portrait = l.portrait || null; this.voice = l.voice || 'narrator'; this.lineMosaic = l.mosaic || null; }   // mosaic:{text,block} 는 그 글자만 모자이크(보지→지, BUILD208)
  get typed() { return this.shown >= this.text.length; }
  /** 전투 문구 타자: 22ms 마다 한 글자, 글자마다 나레이션 블립(띠리리링) */
  typeText(dt) {
    if (this.shown >= this.text.length) return;
    this.textT += dt; const n = Math.min(this.text.length, Math.floor(this.textT / (this.typeInterval || 0.022)));   // typeInterval: 막간(구출 말풍선)이 글자 간격을 늦출 수 있다
    for (let i = this.shown; i < n; i++) if (this.voice !== 'none' && this.text[i] !== ' ' && this.text[i] !== '\n') this.game.sound.blip(this.voice || 'narrator');
    this.shown = n;
  }
  sfx(n, options) { this.game.sound.sfx(n, options); }
  startRapVideo(options) { this.stopRapVideo(); this.rapVideo = this.preparedRapVideo || createChoimisRapVideo({ ...options, autoplay: false }); this.preparedRapVideo = null; this.syncRapVideo(this.rapVideo, 0); return this.rapVideo; }
  stopRapVideo(handle = this.rapVideo) { if (!handle) return; handle.stop(); if (this.rapVideo === handle) this.rapVideo = null; }
  syncRapVideo(handle, time) { handle?.sync({ time, muted: this.game.sound.muted, paused: this.game.sound.ctx?.state === 'suspended' }); }
  discardPreparedRapVideo() { this.preparedRapVideo?.stop(); this.preparedRapVideo = null; }
  drawBattleBoard(ctx) {
    if (!this.rapVideo) { this.board.draw(ctx); return; }
    ctx.fillStyle = 'rgba(0,0,0,0.58)'; ctx.fillRect(Math.round(this.board.x), Math.round(this.board.y), Math.round(this.board.w), Math.round(this.board.h));
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.strokeRect(Math.round(this.board.x) + 1.5, Math.round(this.board.y) + 1.5, Math.round(this.board.w) - 3, Math.round(this.board.h) - 3);
  }
  /** Cancel elapsed BGM delay and invalidate an in-flight load before exit or retry. */
  cancelPendingBgm() { this.bgmWait = undefined; this.bgmLoadToken = null; this.support?.cancelBgm?.(); }

  // ── 진행 ──
  update(dt, input) {
    this.t += dt;
    if (this.bgmWait !== undefined) { this.bgmWait -= dt; if (this.bgmWait <= Number.EPSILON) { this.bgmWait = undefined; if (this.cfg.bgm) this.game.sound.playBgm(this.cfg.bgm, { volume: 0.5, fadeIn: BGM_FADE }); } }
    for (const m of this.members) { if (m.action) m.action.update(dt); if (m.popup) { m.popup.t += dt; if (m.popup.t > 0.9) m.popup = null; } if (m.pose !== undefined && m.pose !== null) { m.pose += dt; const T = BATTLE_SPRITES[m.id].attack.reduce((a, f) => a + f.duration, 0); if (m.pose > T) m.pose = null; } }
    this.enemies.forEach((e, i) => { if (e.shake > 0) e.shake -= dt; if (e.blink > 0) e.blink -= dt; if (e.dying > 0) { e.dying -= dt; if (e.dying <= 0) { e.dead = true; } } if (e.popup) { e.popup.t += dt; if (e.popup.t > 0.9) e.popup = null; }
      if (e.def.reactive) {
        const missingHp = 1 - Math.max(0, Math.min(1, e.hp / e.maxHp));
        e.animationTime = (e.animationTime || 0) + dt * (1 + ((e.def.reactive.maxSpeed ?? 1) - 1) * missingHp);
      }
      const idle = e.def.idle || { swayX: 7, swayY: 2, period: 2.8 }; const idleTime = e.id === 'choimis_flower' ? (this.game.time ?? this.t) : this.t; const ph = idleTime * Math.PI * 2 / (idle.period || 2.8) + i * 1.9;   // 기본 모션: 좌우로 천천히(사용자: 정적인 느낌 없애기), 살짝 위아래
      e.ox = Math.sin(ph) * (idle.swayX ?? 7); e.oy = -Math.abs(Math.sin(ph * 2)) * (idle.swayY ?? 2); });
    this.support?.update?.(dt);                                                             // 지원 모듈 시계(영클 회피 이동 등, BUILD207)
    if (this.actorFocus?.phase !== 'out') this.board.update(dt);
    this.typeText(dt);
    this.fx = this.fx.filter((f) => { f.t += dt; if (f.t > 0) f.y += f.vy * dt; return f.t < f.life; });
    if (this.interlude) {
      if (this.interlude.update(dt, input)) { this.interlude.dispose?.(); this.interlude = null; this.beginMenu(); }
      return;
    }
    switch (this.state) {
      case 'load': return;
      case 'intro': if (input.just('confirm') && !this.typed) { this.shown = this.text.length; return; }
        if (this.typed && this.t > 0.6 && (input.just('confirm') || (this.t > 2.4 && !this.speaker))) { if (this.introLines.length) { this.showLine(this.introLines.shift()); this.t = 0.5; } else { const opening = this.support?.openingMode?.() || this.takeOpeningMode(); if (opening) this.startEnemyMode(opening); else this.beginMenu(); } } return;   // openingMode: 인트로 대사 뒤 적 턴 모드 연출(변신 영클 편집노조 흡수, BUILD214)
      case 'menu': return this.updateMenu(input);
      case 'target': return this.updateTarget(input);
      case 'item': return this.updateItem(input);
      case 'item-target': return this.updateItemTarget(input);
      case 'text': if (input.just('confirm') && !this.typed) { this.shown = this.text.length; return; }
        if (this.typed && this.t > 0.5 && (input.just('confirm') || (this.t > 1.8 && !this.speaker))) { if (this.turnLines?.length) { this.showLine(this.turnLines.shift()); this.t = 0; return; } this.state = this.after || 'menu'; this.t = 0; } return;
      case 'act': return this.updateAct(dt, input);
      case 'enemy-mode':
        if (this.actorFocus?.phase === 'out') {
          this.actorFocus.t = Math.min(this.actorFocus.duration, this.actorFocus.t + dt);
          if (this.actorFocus.t < this.actorFocus.duration) return;
          this.actorFocus.phase = 'hidden';
        }
        if (this.gimmick && this.gimmick.update(dt, input) && this.state === 'enemy-mode') {
          const restoreActors = !!this.actorFocus;
          const completedMode = this.activeEnemyMode;
          if (this.gimmick.preserveFinalFrame && !this.targets().length) {
            this.endingFrame = document.createElement('canvas');
            this.endingFrame.width = SCREEN_W; this.endingFrame.height = SCREEN_H;
            const context = this.endingFrame.getContext('2d');
            context.imageSmoothingEnabled = false;
            this.gimmick.draw(context);
            if (this.gimmick.hpStrip) this.drawHpStrip(context);
          }
          this.disposeGimmick();
          if (completedMode === 'choimis_pink_shooter') this.pendingPostOpening = completedMode;
          if (restoreActors) { this.actorFocus = { phase: 'in', t: 0, duration: OPENING_FOCUS_FADE }; this.state = 'enemy-mode-restore'; this.t = 0; }
          else this.afterEnemyPhase();
        }
        return;
      case 'enemy-mode-restore':
        this.actorFocus.t = Math.min(this.actorFocus.duration, this.actorFocus.t + dt);
        if (this.actorFocus.t >= this.actorFocus.duration) { this.actorFocus = null; this.afterEnemyPhase(); }
        return;
      case 'enemy-prep': return this.updatePrep(dt, input);
      case 'bullets': return this.updateBullets(dt, input);
      case 'board-close': if (this.t > 0.3) this.afterEnemyPhase(); return;
      case 'win': if (input.just('confirm') && !this.typed) { this.shown = this.text.length; return; } if (this.typed && this.t > 0.6 && input.just('confirm')) this.finish(true); return;
      case 'ending': return;
      case 'lose': if (this.t > LOSE_HOLD + 1.0 && input.just('confirm')) this.beginRetry(); return;   // 게임 오버 화면의 [다시 도전하기]
      case 'retry': if (this.retryT !== undefined) { this.retryT -= dt; if (this.retryT <= 0) { this.retryT = undefined; this.load(); } } return;
    }
  }
  beginMenu() {
    this.clearPatternPresentation();
    this.state = 'menu'; this.t = 0; this.plans = []; this.memberIdx = 0; this.menuIdx = 0;
    while (this.memberIdx < this.members.length && this.members[this.memberIdx].down) this.memberIdx++;
    const live = this.living(); const e = live[Math.floor(this.rnd() * Math.max(1, live.length))]; const idle = this.support?.idleFor?.(e) || e?.def.lines?.idle || [];
    this.setText(idle.length ? idle[Math.floor(this.rnd() * idle.length)] : '');   // 잡담 문구는 행동 선택 화면([공격하기][아이템])과 같은 패널에 공존 (사용자 2026-09-10)
  }
  /** Return the configured battle-local opening mode once per attempt. */
  takeOpeningMode() {
    if (this.openingShown) return null;
    const mode = this.cfg.openingMode || this.enemies.find(enemy => enemy.def.openingMode)?.def.openingMode;
    if (mode) this.openingShown = true;
    return mode || null;
  }
  /** 행동 창 버튼 목록: 지원 모듈이 buttons() 를 주면 그대로(kind fight/item/support), 아니면 [공격하기][아이템] + 해금된 지원 버튼(아이디어·대포) */
  menuButtons() {
    const custom = this.support?.buttons?.(); if (custom) return custom;
    const list = [{ label: L.battle_fight, kind: 'fight', enabled: true }, { label: L.battle_item, kind: 'item', enabled: true }];
    if (this.support?.unlocked) list.push({ ...this.support.button, kind: 'support', hint: true });
    return list;
  }
  updateMenu(input) {
    if (this.memberIdx >= this.members.length) { this.beginAct(); return; }
    const buttons = this.menuButtons(), buttonCount = buttons.length;
    if (input.just('left') || input.just('right')) { this.menuIdx = (this.menuIdx + (input.just('left') ? buttonCount - 1 : 1)) % buttonCount; this.sfx('menu'); }
    const btn = buttons[this.menuIdx] || buttons[0];
    if (btn.hint && (input.just('left') || input.just('right'))) this.setText(this.support.hint);
    if (input.just('confirm')) {
      this.sfx('confirm');
      if (btn.kind === 'fight' && btn.enabled === false) { this.sfx('cancel'); return; }   // 잠긴 공격하기(청소년전 BUILD339): X 표시, 눌러도 안 된다
      if (btn.kind === 'fight') { this.state = 'target'; this.targetIdx = 0; this.t = 0; }
      else if (btn.kind === 'support') {
        const action = this.support?.action(btn.id);
        if (action?.type === 'text') { this.setText(action.text); this.state = 'text'; this.after = 'menu'; this.t = 0; }   // 문구만 보여 주고 메뉴로
        else if (action?.queue) { this.plans.push(action); this.nextMember(); }   // 멤버별 지원 행동(청소년전 방어하기): 앞 멤버의 선택을 지우지 않는다
        else if (action) { this.plans = [action]; this.beginAct(); }
        else this.setText(this.support.hint);
      } else { const items = plainItems(this.game.inventory); if (!items.length) { this.setText(L.battle_no_items); this.state = 'text'; this.after = 'menu'; this.t = 0; } else { this.state = 'item'; this.itemIdx = 0; this.t = 0; } }
      return;
    }
    if (input.just('cancel') && this.plans.length) {           // 이전 멤버로 되돌아가기 (델타룬처럼)
      this.sfx('cancel'); this.support?.onPlanCancel?.(this.plans.pop()); this.memberIdx--; while (this.memberIdx > 0 && this.members[this.memberIdx].down) this.memberIdx--; this.menuIdx = 0;
    }
  }
  updateTarget(input) {
    const list = this.targets(); if (!list.length) { this.state = 'menu'; return; }
    if (input.just('left') || input.just('up')) { this.targetIdx = (this.targetIdx + list.length - 1) % list.length; this.sfx('menu'); }
    if (input.just('right') || input.just('down')) { this.targetIdx = (this.targetIdx + 1) % list.length; this.sfx('menu'); }
    if (input.just('cancel')) { this.sfx('cancel'); this.state = 'menu'; return; }
    if (input.just('confirm')) { this.sfx('confirm'); this.plans.push({ member: this.members[this.memberIdx], type: 'fight', target: list[this.targetIdx] }); this.nextMember(); }
  }
  /** 아이템: 2열 격자(델타룬 ITEM) — ↑↓ 한 칸, ←→ 열 이동 */
  updateItem(input) {
    const items = plainItems(this.game.inventory); if (!items.length) { this.state = 'menu'; return; }
    const move = (d) => { const i = this.itemIdx + d; if (i < 0 || i >= items.length) return; this.itemIdx = i; this.sfx('menu'); };
    if (input.just('up')) move(-1); if (input.just('down')) move(1); if (input.just('left')) move(-3); if (input.just('right')) move(3);
    if (input.just('cancel')) { this.sfx('cancel'); this.state = 'menu'; return; }
    if (input.just('confirm')) { this.sfx('confirm'); this.itemName = items[this.itemIdx]; this.state = 'item-target'; this.itemTargetIdx = this.memberIdx; this.t = 0; }
  }
  /** 아이템 대상: 살아 있는 멤버 중 ← → 로 고른다 */
  updateItemTarget(input) {
    const n = this.members.length;
    const step = (d) => { let i = this.itemTargetIdx; for (let k = 0; k < n; k++) { i = (i + d + n) % n; if (!this.members[i].down) break; } this.itemTargetIdx = i; this.sfx('menu'); };
    if (input.just('left') || input.just('up')) step(-1);
    if (input.just('right') || input.just('down')) step(1);
    if (input.just('cancel')) { this.sfx('cancel'); this.state = 'item'; return; }
    if (input.just('confirm')) { this.sfx('confirm'); this.plans.push({ member: this.members[this.memberIdx], type: 'item', name: this.itemName, target: this.members[this.itemTargetIdx] }); this.nextMember(); }
  }
  nextMember() {
    this.memberIdx++; while (this.memberIdx < this.members.length && this.members[this.memberIdx].down) this.memberIdx++;
    this.menuIdx = 0; this.state = 'menu'; this.t = 0;
    if (this.memberIdx >= this.members.length) { this.beginAct(); return; }
    // cfg.memberIntro[id]: 그 동료의 첫 차례가 오면 대사를 먼저(청소부 “뭐 뭐라고? 공격을 하라고?”, BUILD227) → 끝나면 그 동료의 메뉴
    const member = this.members[this.memberIdx], intro = this.cfg.memberIntro?.[member.id];
    if (intro?.length && !member.introShown) { member.introShown = true; this.turnLines = [...intro]; this.showLine(this.turnLines.shift()); this.after = 'menu'; this.state = 'text'; this.t = 0; }
  }

  // ── 행동 실행 ──
  beginAct() { this.state = 'act'; this.t = 0; this.actIdx = 0; this.actWait = 0; this.cur = null; this.setText(''); }   // 이전 문구(아이템 없음 등)가 남지 않게
  updateAct(dt, input) {
    if (this.cur?.gimmick) {
      if (this.gimmick.update(dt, input)) {
        const { plan, supportFollowup } = this.cur;
        this.disposeGimmick(); this.finishPartyAction(plan, !supportFollowup);
      }
      return;
    }
    if (this.cur) {
      const { plan, action } = this.cur;
      // cfg.memberDamage: 이번 전투만 특정 동료의 공격 피해(청소부 지팡이 던지기 1, BUILD227)
      if (action.mode === 'attack' && !this.cur.hit && action.elapsed >= HIT_AT) { this.cur.hit = true; this.hitEnemy(plan.target, plan.member, this.cfg.memberDamage?.[plan.member.id] ?? (this.game.attack || 1)); }
      if (action.mode === 'idle') this.finishPartyAction(plan);
      return;
    }
    if (this.actWait > 0) { this.actWait -= dt; return; }
    if (this.actIdx >= this.plans.length) {
      if (!this.targets().length) { this.beginWin(); return; }
      if (this.targets().every(enemy => enemy.hp <= 0 || enemy.dying > 0)) return;
      this.beginEnemyTurn(); return;
    }
    const plan = this.plans[this.actIdx++];
    if (plan.member.down) return;
    if (plan.type === 'skip') { this.actWait = 0.25; return; }   // 턴 넘기기(지원 버튼)
    if (plan.type === 'item') { this.useItem(plan.target || plan.member, plan.name, plan.member); this.actWait = 0.6; return; }
    let target = plan.target; if (target.dead || target.dying > 0) target = this.targets()[0]; if (!target) return;
    plan.target = target;
    const modeName = plan.mode || plan.member.attackMode || this.modes.attack; const create = getBattleMode('attack', modeName);
    if (typeof create === 'function') { this.gimmick = create(this, { plan, member: plan.member, target }); this.cur = { plan, gimmick: true }; return; }
    if (create !== NATIVE) console.warn('[battle] 모르는 공격 모드', modeName);
    const def = BATTLE_SPRITES[plan.member.id]; const attackT = def.attack.reduce((s, f) => s + f.duration, 0);
    const spot = this.support?.attackSpot?.(target, plan.member) || [target.x - 44, target.y + 6];   // 쓰러진 청소년처럼 자세가 바뀐 적은 지원 모듈이 멈출 자리를 준다
    const action = new FastAction(plan.member.home, spot, attackT / ATTACK_SPEEDUP); action.start();
    plan.member.action = action; this.cur = { plan, action, hit: false };
  }
  hitEnemy(e, by, dmg = this.game.attack || 1, { source = 'ordinary', sound = true } = {}) {
    if (!e || e.dead || e.dying > 0 || e.hp <= 0 || !(dmg > 0)) return 0;
    if (e.id === 'choimis_flower' && (e.finalePending || e.finaleStarted)) return 0;
    this.support?.onContact?.(e, dmg, source);
    if (this.support?.blocksDamage?.(e, source)) {
      e.shake = 0.25; e.popup = { t: 0, text: this.support.blockText?.(e) || L.battle_strip_blocked };   // 영클은 '피했다'(BUILD207)
      if (sound) this.sfx(this.support.blockSfx?.(e) || 'hit');
      return 0;
    }
    const adjusted = this.support?.adjustDamage?.(e, dmg, source) ?? dmg;                 // 방심한 영클은 1, 아이디어는 3(BUILD208)
    const defended = e.id === 'choimis_flower' && e.defenseBoosted && source !== 'choimis-eating-race'
      ? source === 'pink-shot' ? 1 : e.def.boostedAttackDamage
      : adjusted;
    const awaitsFinale = e.id === 'choimis_flower' && !e.finaleComplete;
    if (awaitsFinale && defended >= e.hp) e.finalePending = true;
    const damage = Math.min(awaitsFinale ? Math.max(0, e.hp - 1) : e.hp, defended);
    e.hp -= damage; e.shake = 0.35; e.blink = 0.3;
    this.support?.onHit?.(e, damage, source);
    if (sound) { this.sfx('hit'); this.sfx('damage'); }
    if (e.def.reactive?.hitSfx) this.sfx(e.def.reactive.hitSfx);
    if (e.hp <= 0) { e.dying = 0.5; this.sfx('vaporized'); this.setText(e.def.lines?.die || `* ${e.name} 이(가) 쓰러졌다.`); }   // 맞았을 때 문구는 없음(사용자)
    return damage;
  }
  finishPartyAction(plan, allowSupport = true) {
    this.cur = null; this.actWait = BETWEEN_ACTS;
    if (this.startPendingFinale()) return;
    const followup = allowSupport ? this.support?.afterAction?.(plan) : null;
    if (followup) { this.gimmick = followup; this.cur = { plan, gimmick: true, supportFollowup: true }; }
  }
  applyCannonDamage(target, damage = BARON_CANNON.damage) { return this.hitEnemy(target, null, damage, { source: 'cannon', sound: false }); }
  disposeGimmick() { this.gimmick?.dispose?.(); this.gimmick = null; this.activeEnemyMode = null; this.actorFocus = null; this.stopRapVideo(); this.clearPatternPresentation(); }
  /** BUILD300: consume a lethal hit only after the current action or full enemy phase has ended. */
  startPendingFinale() {
    const enemy = this.enemies.find(e => e.id === 'choimis_flower' && e.finalePending && !e.finaleStarted);
    if (!enemy) return false;
    enemy.finalePending = false; enemy.finaleStarted = true;
    this.plans = []; this.bullets = []; this.patterns = []; this.pendingPostOpening = null;
    this.startEnemyMode('choimis_finale', enemy);
    return true;
  }
  /** 지원 모듈이 고른 적 턴 모드를 바로 연다(인트로 대사 뒤 오프닝 연출 — 변신 영클 편집노조 흡수, BUILD214). 끝나면 여느 적 턴처럼 afterEnemyPhase → 막간/메뉴 */
  startEnemyMode(name, enemy = this.living()[0]) {
    const create = getBattleMode('enemy', name); if (typeof create !== 'function') { this.beginMenu(); return; }
    const actorFocus = name === 'choimis_pink_shooter' || name === 'choimis_pink_round'
      ? { phase: 'out', t: 0, duration: OPENING_FOCUS_FADE }
      : null;
    this.bubble = null; this.state = 'enemy-mode'; this.t = 0; this.setText(''); this.gimmick = create(this, { enemy });
    this.activeEnemyMode = name;
    this.actorFocus = actorFocus;
  }
  /** Opacity for combatants and their support clouds during a fullscreen opening-mode focus transition. */
  openingActorAlpha() {
    if (!this.actorFocus) return 1;
    const progress = Math.min(1, this.actorFocus.t / this.actorFocus.duration);
    return this.actorFocus.phase === 'out' ? 1 - progress : this.actorFocus.phase === 'in' ? progress : 0;
  }
  /** A pattern may stage its actor without changing the ordinary battle home. */
  clearPatternPresentation() { for (const enemy of this.enemies) enemy.patternPose = null; }
  useItem(m, name, by = m) {
    return useBattleItem(this, { name, target: m, member: by });
  }

  // ── 적 턴 ──
  boardSize() { const custom = this.support?.boardSizeFor?.(); if (custom) return custom; const live = this.living(); return [Math.max(...live.map((e) => e.def.board?.[0] || 200)), Math.max(...live.map((e) => e.def.board?.[1] || 150))]; }
  /** Read the next ordinary pattern config without advancing its cycle. */
  nextPatternConfig(enemy) { return nextPatternConfig(enemy); }
  /** 적 턴 준비(델타룬 전투 참고): 패널 자리에서 탄막 상자가 펼쳐지고 소울이 나타난다 + 적 옆 흰 말풍선에 한마디(작은 글씨, 타자) → 다 뜬 뒤 PREP_HOLD 준비 시간 → 탄막(말풍선은 사라짐). 바로 공격이 오지 않는다 */
  beginEnemyTurn() {
    const live = this.living(); const e = live[Math.floor(this.rnd() * live.length)];
    const selected = this.support?.patternsFor ? null : nextPatternConfig(e);
    const defName = this.support?.enemyModeFor?.(e) || selected?.config?.mode || e.def.defense || this.modes.enemy; const create = getBattleMode('enemy', defName);
    const lines = this.support?.speechFor?.(e) || e.def.lines?.speak || [];
    if (typeof create === 'function') {
      this.bubble = null; this.state = 'enemy-mode'; this.t = 0; this.setText('');
      if (selected?.config?.mode) { e.enraged = selected.enraged; e.patternIdx++; }
      this.activeEnemyMode = defName;
      this.actorFocus = defName === 'choimis_pink_shooter' || defName === 'choimis_pink_round'
        ? { phase: 'out', t: 0, duration: OPENING_FOCUS_FADE }
        : null;
      this.gimmick = create(this, { enemy: e, config: selected?.config || null, cycle: selected?.cycle || 0 }); return;
    }
    if (create !== NATIVE) console.warn('[battle] 모르는 적 턴 모드', defName);
    let text = lines.length ? lines[Math.floor(this.rnd() * lines.length)] : '...';
    // 패턴 설정에 speak 가 있으면 이번 턴에 나올 패턴의 말(다오 “미사일!” 뒤 미사일, BUILD266) — 지원 모듈이 패턴을 고르는 전투는 제외
    if (!this.support?.patternsFor) {
      if (selected?.config?.speak) text = selected.config.speak;
    }
    if (lines.length && e.def.lines.speakShuffle) {
      if (!e.speechBag?.length) e.speechBag = [...new Set(lines)];
      const choices = e.speechBag.filter(line => line !== e.lastSpeech);
      const pool = choices.length ? choices : e.speechBag;
      text = pool[Math.floor(this.rnd() * pool.length)];
      e.speechBag.splice(e.speechBag.indexOf(text), 1);
      e.lastSpeech = text;
    }
    const speakSfx = selected?.config?.speakSfx || e.def.lines?.speakSfx;
    this.bubble = { enemy: e, text, mosaic: e.def.lines?.speakMosaic?.[text], shown: 0, t: 0,
      voice: selected?.config?.speakSfx ? 'none' : this.support?.speechVoiceFor?.(e) || e.formDef?.voice || e.def.voice || 'narrator',
      minDuration: selected?.config?.speakDuration || 0 };
    if (speakSfx) this.sfx(speakSfx);
    this.board.x = 20; this.board.y = 246; this.board.w = 440; this.board.h = 72;             // 패널 상자에서 펼쳐진다
    const [bw, bh] = this.boardSize(), [cx, cy] = this.support?.boardCenter ?? [240, 214];
    this.board.setTarget(bw, bh, cx, cy);
    this.soul.center({ x: cx - bw / 2, y: cy - bh / 2, w: bw, h: bh }); this.soul.invuln = 0; this.bullets = [];
    this.state = 'enemy-prep'; this.t = 0; this.setText('');
  }
  updatePrep(dt, input) {
    const b = this.bubble;
    if (b) { b.t += dt; const n = Math.min(b.text.length, Math.floor(b.t / BUBBLE_CPS)); for (let i = b.shown; i < n; i++) if (b.text[i] !== ' ' && b.voice !== 'none') this.game.sound.blip(b.voice); b.shown = n; if (n >= b.text.length && b.doneAt === undefined) b.doneAt = this.t; }
    if (this.t > PREP_OPEN) this.soul.update(dt, input, this.board);                          // 준비 시간 동안 소울을 미리 움직일 수 있다
    if ((!b || b.doneAt !== undefined) && this.t > PREP_OPEN && this.t >= (b?.minDuration || 0) && this.t - (b?.doneAt ?? 0) > PREP_HOLD) this.beginBullets();
  }
  beginBullets() {
    this.clearPatternPresentation();
    const solo = this.bubble?.enemy;   // def.soloPattern: 말풍선을 띄운 적만 탄막을 낸다(아짐키야 넷이 동시에 쏘면 너무 어렵다, BUILD227)
    this.patterns = this.living().map((e) => {
      if (e.def.soloPattern && solo && e !== solo) return null;
      const enraged = !!e.def.enragedPatterns?.length && e.hp / e.maxHp <= e.def.enragedAt;
      if (enraged !== !!e.enraged) e.patternIdx = 0;
      e.enraged = enraged;
      const fromSupport = this.support?.patternsFor ? this.support.patternsFor(e) : undefined;
      if (Array.isArray(fromSupport) && fromSupport.length === 0) return null;                 // 지원 모듈이 [] 를 주면 이번 턴은 쉰다(조종실 실험체, BUILD207). null/undefined 는 예전대로 기본 패턴
      const cfgs = fromSupport || (enraged ? e.def.enragedPatterns : e.def.patterns) || [{ type: 'rain' }];
      const c = e.def.alternatingPatternMode && !fromSupport ? nextPatternConfig(e).config : cfgs[e.patternIdx % cfgs.length];
      e.patternIdx++;
      return { p: PATTERNS[c.type](c), t: 0, dmg: c.damage ?? e.def.damage ?? 6, enemy: e };
    }).filter(Boolean);
    const [bw, bh] = this.boardSize(), [cx, cy] = this.support?.boardCenter ?? [240, 214];
    this.board.setTarget(bw, bh, cx, cy); this.board.snap(); this.soul.invuln = 0; this.bullets = [];   // 소울은 준비 시간에 옮겨 둔 자리 그대로
    this.stopRapVideo();
    this.bubble = null;                                        // 말풍선은 탄막이 시작되면 사라진다(델타룬) — 상자 위를 가려 탄막을 숨기지 않게
    this.state = 'bullets'; this.t = 0; this.setText('');
  }
  updateBullets(dt, input) {
    this.soul.update(dt, input, this.board);
    let running = false;
    for (const pat of this.patterns) {
      if (pat.t >= pat.p.duration) { pat.enemy.patternPose = null; continue; } running = true;
      const volume = pat.enemy.def.attackSfxVolume;
      const api = { box: this.board.rect, soul: this.soul, rnd: this.rnd, emit: null, sfx: (name, options = {}) => this.sfx(name, { volume, ...options }) };
      api.emit = (o) => { const made = new Bullet({ ...o, dmg: o.dmg ?? pat.dmg }); this.bullets.push(made); return made; };   // 만든 탄을 돌려준다(패턴이 얼굴·몸통 탄을 계속 움직일 수 있게, BUILD207)
      api.images = pat.enemy?.projectiles;
      api.actor = { x: pat.enemy.x, y: pat.enemy.y, scale: pat.enemy.def.scale ?? 1 };
      api.present = pose => { pat.enemy.patternPose = pose ? { ...pose } : null; };
      api.trackProjectile = projectile => this.support?.onProjectile?.(projectile);
      api.vacuum = (on, seconds) => this.support?.onVacuum?.(on, seconds);
      api.interceptionActive = () => this.support?.interceptionActive ?? false;
      api.clearHazards = () => { this.bullets = []; };
      api.penalty = damage => { this.bullets = []; this.hurtAllParty(damage); };
      api.flash = duration => { this.game.fadeTo(0.8, 0, undefined, 'white'); this.game.fadeTo(0, duration); };
      api.shake = (time, amp) => { this.game.shake = { time, amp }; };
      api.say = (text, hold = 2) => { this.bubble = { enemy: pat.enemy, text, shown: 0, t: 0, voice: pat.enemy?.def.voice || 'narrator', patternHold: hold }; };
      api.startRapVideo = options => this.startRapVideo(options);
      api.stopRapVideo = handle => this.stopRapVideo(handle);
      api.syncRapVideo = (handle, time) => this.syncRapVideo(handle, time);
      pat.p.update(pat.t, dt, api); pat.t += dt;
      if (this.state === 'lose') return;
      if (this.interruptEnemyPhase()) return;
    }
    if (this.bubble?.patternHold) {
      const b = this.bubble; b.t += dt;
      const n = Math.min(b.text.length, Math.floor(b.t / BUBBLE_CPS));
      for (let i = b.shown; i < n; i++) if (b.text[i] !== ' ' && b.voice !== 'none') this.game.sound.blip(b.voice);
      b.shown = n;
      if (b.t > b.text.length * BUBBLE_CPS + b.patternHold) this.bubble = null;
    }
    for (const b of this.bullets) {
      b.update(dt, this.board);
      if (b.pickup) { if (!b.taken && Math.hypot(b.x - this.soul.x, b.y - this.soul.y) <= b.r + this.soul.r) { b.taken = true; this.support?.onPickup?.(b); } continue; }   // 줍는 탄(코인, BUILD214/215): 닿으면 support.onPickup(회복), 피해 없음
      if (this.soul.invuln <= 0 && b.hits(this.soul)) this.hurtParty(b.dmg);
      if (this.interruptEnemyPhase()) return;
    }
    this.bullets = this.bullets.filter((b) => !b.taken && !b.out(this.board));
    if (!running && (!this.bullets.length || this.t > Math.max(...this.patterns.map((p) => p.p.duration)) + 1.2)) { this.stopRapVideo(); this.clearPatternPresentation(); this.bullets = []; this.bubble = null; this.state = 'board-close'; this.t = 0; this.board.setTarget(440, 72, 240, 282); }
  }
  hurtParty(dmg) {
    const alive = this.alive(); if (!alive.length) return;
    const adjusted = this.support?.partyDamage?.(dmg) ?? dmg;                    // 조종실 전투: 맞을 때마다 +10(support/youngcle-ship.js)
    this.applyPartyDamage([alive[Math.floor(this.rnd() * alive.length)]], adjusted);
    this.support?.onPartyHurt?.(adjusted);
  }
  interruptEnemyPhase() {
    if (!this.support?.interruptEnemyPhase?.()) return false;
    this.stopRapVideo();
    this.clearPatternPresentation(); this.bullets = []; this.bubble = null; this.patterns = [];
    this.board.setTarget(440, 72, 240, 282); this.afterEnemyPhase();
    return true;
  }
  /** Unavoidable party-wide penalties hit every standing member once, independent of soul invulnerability. */
  hurtAllParty(dmg) { this.applyPartyDamage(this.alive().filter(m => m.hp > 0), dmg); }
  /** Shared HP/down/defeat path for random bullet hits and simultaneous party penalties. */
  applyPartyDamage(members, dmg) {
    if (!members.length) return;
    for (const m of members) {
      const damage = this.support?.adjustPartyDamage?.(m, dmg) ?? dmg;
      m.hp = Math.max(0, m.hp - damage); m.popup = { t: 0, text: String(damage) };
      if (m.hp <= 0) { m.down = true; m.downTurns = 0; m.action = null; m.pose = null; }
    }
    this.soul.invuln = 0.75; this.soul.hits++; this.sfx('hurt'); this.game.shake = { time: 0.15, amp: 2 };
    this.support?.onPartyDamage?.();
    // 게임 오버는 셋(전원)이 다 쓰러졌을 때만 (사용자 2026-09-11)
    if (!this.alive().length) { this.disposeGimmick(); this.discardPreparedRapVideo(); this.interlude?.dispose?.(); this.interlude = null; this.bullets = []; this.bubble = null; this.fx = []; this.state = 'lose'; this.t = 0; this.board.setTarget(440, 72, 240, 282); this.setText(''); this.game.sound.stopBgm(0.8); this.game.sound.preloadBgm(this.cfg.bgm); }
  }
  /** 라운드 경계(적 턴 끝): 쓰러진 동료마다 회복 이펙트(초록 반짝임 + heal 음), DOWN_TURNS 번째 라운드에 반피로 일어난다 — 사용자 2026-09-11 '한 턴마다 회복 이펙트, 3턴 지나면 반피 부활' */
  /** 승리: 돈·문구·브금 정리 → win 상태. 행동 단계 끝과 적 턴 끝(특별 패턴 피해로 쓰러뜨린 경우 — 2026-09-18 사용자 “특별 패턴에서 쓰러트렸는데 전투 안 끝나는 버그”) 양쪽에서 부른다 */
  beginWin() {
    if (this.state === 'win' || this.state === 'ending' || this.result) return;
    this.state = 'win';
    this.stopRapVideo(); this.discardPreparedRapVideo();
    this.standUpAll();
    const gain = this.enemies.reduce((a, e) => a + (e.def.money ?? 30), 0);
    this.game.money = (this.game.money || 0) + gain;
    this.t = 0; this.setText(this.cfg.skipVictoryText ? '' : L.battle_win_money.replace('{n}', gain));
    this.cancelPendingBgm();
    this.game.sound.stopBgm(this.bossBattle ? BOSS_VICTORY_FADE : 0.3);
    if (!this.bossBattle) this.sfx('won');
    if (this.cfg.skipVictoryText) this.finish(true);
  }
  afterEnemyPhase() {
    if (this.startPendingFinale()) return;
    if (!this.targets().length) { this.bullets = []; this.bubble = null; this.board.setTarget(440, 72, 240, 282); this.beginWin(); return; }
    const up = [];
    for (const m of this.members) {
      if (!m.down) continue;
      m.downTurns++;
      if (m.downTurns >= DOWN_TURNS) { this.standUp(m); up.push(m); this.sparkle(m, 26, true); }
      else this.sparkle(m, 10, false);
    }
    if (up.length || this.members.some((m) => m.down)) this.sfx('heal');
    if (this.pendingPostOpening === 'choimis_pink_shooter') {
      this.pendingPostOpening = null;
      const choimis = this.enemies.find(enemy => enemy.id === 'choimis_flower' && !enemy.dead);
      if (choimis && !choimis.defenseBoosted) {
        this.interlude = createChoimisDefenseCinematic(this, choimis);
        this.state = 'interlude'; this.t = 0; this.plans = [];
        return;
      }
    }
    this.interlude = this.support?.afterEnemyPhase() || null;
    if (this.interlude) { this.state = 'interlude'; this.t = 0; this.plans = []; return; }
    this.beginMenu();
    if (up.length) this.setText(up.map((m) => L.battle_revive.replace('{name}', m.name)).join('\n'));   // 잡담 문구 자리에 '다시 일어났다!'
  }
  standUp(m) { m.down = false; m.downTurns = 0; m.hp = Math.max(1, Math.ceil(m.maxHp * REVIVE_RATIO)); m.popup = { t: 0, text: '+' + m.hp, heal: true }; }
  /** 승리 시 쓰러진 동료도 반피로 일어난다(전투 밖에서 HP 0 으로 남지 않게) */
  standUpAll() { for (const m of this.members) if (m.down) this.standUp(m); }
  /** 회복 반짝임: 누운 몸 위에서 초록 점(부활 때는 + 모양 섞어서 더 많이)이 떠오른다 */
  sparkle(m, n, big) { for (let i = 0; i < n; i++) this.fx.push({ x: m.home[0] - 34 + this.rnd() * 68, y: m.home[1] - 6 + this.rnd() * 10, vy: -(28 + this.rnd() * 46), t: -this.rnd() * 0.25, life: 0.7 + this.rnd() * 0.5, plus: !!big && i % 3 === 0 }); }
  /** 게임 오버 → [다시 도전하기]: 즉시 검은 화면 + 징글·흔들림(표준 조우와 같은 타임라인) → HP·적 복구 → load() 가 화면을 걷고 브금을 튼다. 같은 전투를 처음부터 */
  beginRetry() {
    this.cancelPendingBgm();
    this.disposeGimmick(); this.discardPreparedRapVideo(); this.interlude?.dispose?.(); this.interlude = null; this.support?.reset(); this.cur = null;
    this.sfx('confirm'); this.state = 'retry'; this.t = 0; this.bubble = null; this.fx = []; this.bullets = []; this.plans = []; this.openingShown = false; this.pendingPostOpening = null;
    for (const m of this.members) { m.hp = m.maxHp; m.down = false; m.downTurns = 0; m.action = null; m.popup = null; m.pose = null; }
    for (const e of this.enemies) { e.hp = e.maxHp; e.dead = false; e.dying = 0; e.patternIdx = 0; e.enraged = false; e.defenseBoosted = false; e.pinkShotHits = 0; e.animationTime = 0; e.popup = null; e.shake = 0; e.blink = 0; e.speechBag = []; e.lastSpeech = null;
      if (e.id === 'choimis_flower') { e.finalePending = false; e.finaleStarted = false; e.finaleComplete = false; }
    }
    this.game.fadeTo(1, 0, undefined, 'black');
    this.game.sound.preloadBgm(this.cfg.bgm); this.sfx(this.cfg.seamlessIntro ? 'weaponpull' : 'battle_start'); this.game.shake = { time: 0.45, amp: 3 };
    this.retrying = true; this.retryT = this.cfg.seamlessIntro ? 0.35 : RETRY_JINGLE;
  }
  /** 전투 끝. `{ white: true }` 면 흰 화면을 그대로 유지한 채 넘어간다(점프슬램 뒤 전투 기본 화면이 잠깐 보이던 것 — 사용자 2026-09-17) */
  finish(win, { white = false } = {}) {
    if (this.state === 'ending') return;
    this.cancelPendingBgm();
    this.disposeGimmick(); this.discardPreparedRapVideo(); this.interlude?.dispose?.(); this.interlude = null; this.support?.dispose?.();
    for (const m of this.members) this.game.partyHp[m.id] = m.hp;
    this.result = { win }; this.state = 'ending'; this.whiteout = white;
    if (white) { this.game.fadeTo(1, 0, undefined, 'white'); this.game.endBattle(this.result); return; }
    this.game.fadeTo(1, win && this.bossBattle ? BOSS_VICTORY_FADE : 0.35, () => this.game.endBattle(this.result), 'black');
  }

  // ── 그리기 ──
  draw(ctx) {
    if (this.state === 'load' && this.cfg.seamlessIntro) return;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    if (this.whiteout) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, SCREEN_W, SCREEN_H); return; }   // 흰 화면 유지(피날레)
    if (this.state === 'ending' && this.endingFrame) { ctx.drawImage(this.endingFrame, 0, 0); return; }
    if (this.state === 'retry') return;                             // 징글 동안 검은 화면(표준 조우의 검은 화면과 같다)
    if (this.gimmick?.fullscreen) {
      this.gimmick.draw?.(ctx);
      if (this.gimmick.hpStrip) { ctx.save(); ctx.globalAlpha *= this.gimmick.hudAlpha ?? 1; this.drawHpStrip(ctx); ctx.restore(); }
      return;
    }
    if (this.interlude?.fullscreen) { this.interlude.draw(ctx); this.drawHpStrip(ctx); return; }
    const bg = BATTLE_BGS[this.cfg.bg]; if (bg) bg(ctx, this);            // 전투 배경(레지스트리 src/battle/backgrounds.js: teal / temple …)
    this.rapVideo?.draw(ctx, { x: 0, y: 0, w: SCREEN_W, h: SCREEN_H });
    ctx.font = FONT; ctx.textBaseline = 'top';
    const actorAlpha = this.openingActorAlpha();
    if (actorAlpha > 0) {
      ctx.save(); ctx.globalAlpha *= actorAlpha;
      this.support?.draw?.(ctx);
      for (const e of this.enemies) this.drawEnemy(ctx, e);
      this.support?.drawOverEnemies?.(ctx);
      const idle = this.members.filter((m) => !m.action || m.action.mode === 'idle'), busy = this.members.filter((m) => m.action && m.action.mode !== 'idle');
      for (const m of idle) this.drawMember(ctx, m);
      for (const m of busy) this.drawMember(ctx, m);
      for (const f of this.fx) { if (f.t < 0) continue; const k = 1 - f.t / f.life; ctx.globalAlpha = actorAlpha * Math.max(0, Math.min(1, k * 1.6)); ctx.fillStyle = f.plus ? '#eaffea' : '#7cff7c'; const X = Math.round(f.x), Y = Math.round(f.y);
        if (f.plus) { ctx.fillRect(X - 3, Y, 8, 2); ctx.fillRect(X, Y - 3, 2, 8); } else ctx.fillRect(X, Y, 3, 3); }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    if (this.interlude) this.interlude.draw(ctx);
    else if (this.gimmick) { if (this.gimmick.draw) this.gimmick.draw(ctx); else this.drawTextBox(ctx); }
    else if (['enemy-prep', 'bullets', 'board-close'].includes(this.state)) { this.support?.drawUnderBoard?.(ctx); this.drawBattleBoard(ctx); if (this.state === 'bullets' || (this.state === 'enemy-prep' && this.t > PREP_OPEN)) { for (const b of this.bullets) b.draw(ctx); this.soul.draw(ctx); } }
    else if (this.state !== 'lose') this.drawPanel(ctx);
    if (this.bubble) this.drawBubble(ctx);                          // 적 말풍선(준비 단계)
    this.support?.drawOverlay?.(ctx);
    drawChoimisKaraoke(ctx, this);
    this.drawHpStrip(ctx);                                          // HP 띠는 어느 상태에서나 맨 아래 (사용자: '체력바를 아예 아래로 빼')
    if (this.state === 'lose') this.drawGameOver(ctx);              // 전원 쓰러짐: 전장이 어두워지고 GAME OVER + [다시 도전하기]
  }
  /** 게임 오버(사용자 2026-09-11 '게임오버 기준은 셋 다 죽었을 때, 다시 도전하기 버튼'): LOSE_HOLD 동안 누운 셋을 보여 준 뒤 0.8s 에 걸쳐 어두워지고 GAME OVER · 문구 · [다시 도전하기](하트 커서, C) */
  drawGameOver(ctx) {
    const k = Math.min(1, Math.max(0, (this.t - LOSE_HOLD) / 0.8));
    ctx.fillStyle = `rgba(0,0,0,${0.92 * k})`; ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    if (k < 1) return;
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.font = FONT.replace(/^\d+px/, '34px'); ctx.fillStyle = '#fff'; ctx.fillText(L.battle_gameover, 240, 104);
    ctx.font = FONT; ctx.fillStyle = '#9a9ab0'; ctx.fillText(L.battle_lose, 240, 156);
    const label = L.battle_retry, bw = Math.ceil(ctx.measureText(label).width) + 44, bh = 24, bx = 240 - Math.round(bw / 2), by = 204;
    ctx.fillStyle = '#3a3000'; ctx.fillRect(bx, by, bw, bh); ctx.strokeStyle = '#ffe066'; ctx.lineWidth = 2; ctx.strokeRect(bx + 1, by + 1, bw - 2, bh - 2);
    ctx.fillStyle = '#ffe066'; ctx.fillText(label, 240 + 9, by + 4); this.heart(ctx, bx + 10, by + 9);
    ctx.textAlign = 'left';
  }
  /** 쓰러진 동료: 대기 첫 프레임을 90° 눕혀 발 자리에(머리 왼쪽·얼굴 위) + 바닥 그림자 — 행동 불능. 흐리게 하지 않고 또렷이 누워 있다(사용자 2026-09-11 '그냥 누워있고') */
  /** HP 0 으로 누운 동료: PR #17 쓰러짐 그림(assets/battle/down/<id>.png)을 발 위치(home)에 하단 기준점으로. 그림이 없으면(로드 실패) 서 있는 첫 프레임을 눕힌다 */
  drawLying(ctx, m) {
    const fr = m.frames.idle[0], sc = BATTLE_SPRITES[m.id].scale * ACTOR_SCALE, hh = Math.round(fr.image.height * sc), ww = Math.round(fr.image.width * sc);
    const [hx, hy] = m.home;
    if (this.cfg.bg !== 'choimis_sky') { ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(hx, hy + 6, Math.round(hh * 0.5), 6, 0, 0, Math.PI * 2); ctx.fill(); }
    if (m.downImg) {
      const w = Math.round(m.downImg.width * DOWN_SCALE), h = Math.round(m.downImg.height * DOWN_SCALE);
      ctx.drawImage(m.downImg, Math.round(hx - DOWN_PIVOT[0] * DOWN_SCALE), Math.round(hy - DOWN_PIVOT[1] * DOWN_SCALE), w, h);
    } else {
      ctx.save(); ctx.translate(Math.round(hx + hh * 0.45), Math.round(hy + 2)); ctx.rotate(-Math.PI / 2); ctx.globalAlpha = 0.92;
      ctx.drawImage(fr.image, Math.round(-fr.pivot[0] * sc), Math.round(-fr.pivot[1] * sc), ww, hh); ctx.restore();
    }
    if (m.popup) this.drawPopup(ctx, hx, hy - 48, m.popup.text, m.popup.t, m.popup.heal ? '#7cff7c' : '#ff5c5c');
  }
  drawMember(ctx, m) {
    if (!m.frames || m.action?.hidden) return;
    if (m.down) { this.drawLying(ctx, m); return; }
    const act = m.action, posing = m.pose !== undefined && m.pose !== null && m.pose >= 0 && (!act || act.mode === 'idle');
    const mode = act ? act.mode : posing ? 'attack' : 'idle', running = mode === 'approach' || mode === 'return';
    const seq = m.frames[running ? 'run' : mode === 'attack' ? 'attack' : 'idle'];
    const { index } = playbackFrameAt(seq, posing ? m.pose : act && mode !== 'idle' ? act.elapsed * (mode === 'attack' ? ATTACK_SPEEDUP : 1) : this.t, mode !== 'attack');
    const fr = seq[index]; const def = BATTLE_SPRITES[m.id];
    const scale = (running ? def.run.scale : def.scale) * ACTOR_SCALE;
    const picking = ['menu', 'target', 'item', 'item-target'].includes(this.state) && m === this.members[this.memberIdx];
    const [px0, py] = act ? act.position : m.home; const px = px0 + (!act && picking ? 10 : 0);   // 차례인 멤버는 한 발 앞으로(델타룬)
    if (!act?.airborne && this.cfg.bg !== 'choimis_sky') { ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(Math.round(px), Math.round(py + 2), 15, 3, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.save(); ctx.translate(Math.round(px), Math.round(py)); if (mode === 'return') ctx.scale(-1, 1);
    if (act?.rotation) { ctx.translate(0, -30); ctx.rotate(act.rotation); ctx.translate(0, 30); }
    const special = !act ? this.support?.memberImage?.(m) : null;   // 방어하기 자세(청소년전): 대기 첫 프레임과 같은 규격 384×512
    if (special) ctx.drawImage(special, Math.round(-seq[0].pivot[0] * scale), Math.round(-seq[0].pivot[1] * scale), Math.round(special.width * scale), Math.round(special.height * scale));
    else ctx.drawImage(fr.image, Math.round(-fr.pivot[0] * scale), Math.round(-fr.pivot[1] * scale), Math.round(fr.image.width * scale), Math.round(fr.image.height * scale));
    ctx.restore();
    if (m.popup) this.drawPopup(ctx, px, py - 70, m.popup.text, m.popup.t, m.popup.heal ? '#7cff7c' : '#ff5c5c');
  }
  drawEnemy(ctx, e) {
    const pose = this.support?.poseFor?.(e) || e.patternPose;
    if (e.dead) return;
    for (const clone of (pose?.clones || []).slice(0, 3)) {
      if (clone.hidden) continue;
      ctx.save();
      ctx.globalAlpha *= 0.82;
      if (clone.flipX) { ctx.translate(clone.x * 2, 0); ctx.scale(-1, 1); }
      this.drawEnemy(ctx, { ...e, blink: 0, dying: 0, popup: null,
        patternPose: { x: clone.x, y: clone.y, scale: clone.scale, sheet: clone.sheet, frame: clone.frame } });
      ctx.restore();
    }
    if (pose?.hidden) return;
    const action = pose?.sheet && pose.sheet !== 'idle' ? e.def.actions?.[pose.sheet] : null;
    const img = action ? e.actionImages?.[pose.sheet] : e.formImage || e.img, sh = action || e.formDef?.sheet || e.def.sheet;
    const x = pose?.x ?? e.x, y = pose?.y ?? e.y;
    const scale = pose?.scale ?? e.def.scale ?? 1;
    const scaleY = pose?.scaleY ?? action?.scaleY ?? e.formDef?.scaleY ?? e.def.scaleY ?? 1;
    const sx = (e.shake > 0 ? Math.round(Math.sin(e.shake * 60) * 3) : 0) + Math.round(pose ? 0 : e.ox || 0), sy = Math.round(pose ? 0 : e.oy || 0);
    if (e.blink > 0 && Math.floor(e.blink * 20) % 2) { if (e.popup) this.drawPopup(ctx, x, y - 60, e.popup.text, e.popup.t, '#fff'); return; }
    ctx.save(); if (e.dying > 0) ctx.globalAlpha = Math.max(0, e.dying / 0.5);
    if (img && sh && sh.count) {
      const fw = Math.floor(img.width / sh.cols), fh = Math.floor(img.height / (sh.rows || 1));
      const animationTime = e.def.reactive ? e.animationTime || 0 : e.id === 'choimis_flower' ? (this.game.time ?? this.t) : this.t;
      const i = pose?.frame === undefined ? Math.floor(animationTime * (sh.fps || 5.5)) % sh.count : Math.max(0, Math.min(sh.count - 1, Math.floor(pose.frame)));
      const s = scale / (sh.px || 1), syScale = s * scaleY, dw = Math.round(fw * s), dh = Math.round(fh * syScale); const [pvx, pvy] = sh.pivot || e.def.pivot || [fw / 2, fh];
      const left = Math.round(x - pvx * s + sx), top = Math.round(y - pvy * syScale + sy);
      const ghosts = !pose && e.hp > 0 ? (e.def.reactive?.afterimages || []).reduce((count, step) => e.hp / e.maxHp <= step.hp ? Math.max(count, step.count) : count, 0) : 0;
      if (ghosts) {
        const rightSpace = Math.max(0, SCREEN_W - left - dw);
        const direction = rightSpace >= ghosts * 2 ? 1 : -1;
        const spacing = Math.min(6, (direction > 0 ? rightSpace : Math.max(0, left)) / ghosts);
        ctx.save(); ctx.filter = 'brightness(0.5)';
        for (let ghost = ghosts; ghost > 0; ghost--) {
          const frame = Math.floor(Math.max(0, animationTime - ghost * 0.08) * (sh.fps || 5.5)) % sh.count;
          ctx.globalAlpha = 0.24 - ghost * 0.035;
          ctx.drawImage(img, (frame % sh.cols) * fw, Math.floor(frame / sh.cols) * fh, fw, fh, left + direction * Math.round(ghost * spacing), top, dw, dh);
        }
        ctx.restore();
      }
      // 지원 모듈이 그림을 직접 그릴 수 있다(청소년: 바람에 살짝 흩날림)
      if (!this.support?.drawEnemyImage?.(ctx, e, img, left, top, dw, dh)) ctx.drawImage(img, (i % sh.cols) * fw, Math.floor(i / sh.cols) * fh, fw, fh, left, top, dw, dh);
    } else if (img && sh) {
      const fw = Math.floor(img.width / sh.cols), fh = Math.floor(img.height / sh.rows); const frames = sh.frames || [0]; const col = frames[Math.floor(this.t * (sh.fps || 2)) % frames.length];
      const dw = Math.round(fw / 2 * scale), dh = Math.round(fh / 2 * scale * scaleY);
      ctx.drawImage(img, col * fw, sh.row * fh, fw, fh, Math.round(x - dw / 2 + sx), Math.round(y - dh + sy), dw, dh);
    } else if (img) {
      const dw = Math.round(img.width * scale), dh = Math.round(img.height * scale * scaleY); const [pvx, pvy] = e.def.pivot || [img.width / 2, img.height];
      ctx.drawImage(img, Math.round(x - pvx * scale + sx), Math.round(y - pvy * scale * scaleY + sy), dw, dh);
    } else { ctx.fillStyle = '#7a8'; ctx.fillRect(x - 20 + sx, y - 44 + sy, 40, 44); }
    ctx.restore();
    if (e.popup) this.drawPopup(ctx, x, y - 60, e.popup.text, e.popup.t, '#fff');
  }
  drawPopup(ctx, x, y, text, t, col) {
    ctx.save(); ctx.globalAlpha = t < 0.6 ? 1 : Math.max(0, 1 - (t - 0.6) / 0.3); ctx.fillStyle = col; ctx.textAlign = 'center';
    ctx.fillText(text, Math.round(x), Math.round(y - Math.min(14, t * 40))); ctx.restore(); ctx.textAlign = 'left';
  }
  /** 청록숲 전투 배경: 화면 위쪽에 아주 옅은 청록 잎 구름 (사용자: '진짜 살짝만') */
  hpColor(m) { return CHARACTERS[m.id]?.hpColor || '#ffd23b'; }
  /** 화면 맨 아래 HP 띠(델타룬식, 사용자 참고 이미지 2026-09-10): 얼굴 · 이름 · HP · 색 바(바 위에 숫자). 현재 차례는 노란 이름, 정한 행동은 얼굴 귀퉁이 아이콘. 회피 중에도 그대로 */
  drawHpStrip(ctx) {
    // 칸 폭은 세 명 기준으로 고정(BUILD244 사용자 “혼자일 때 전투 체력 UI 가 다르고 체력바가 너무 길다”): 한 명이어도 억빠맨·경섭과 함께일 때의 첫 칸과 같은 자리·같은 바 길이
    const n = this.members.length, cw = Math.floor(440 / Math.max(3, n)), y = 322;
    const picking = ['menu', 'target', 'item', 'item-target'].includes(this.state);
    const small = FONT.replace(/^\d+px/, '12px');
    this.members.forEach((m, i) => {
      const x = 20 + i * cw, active = picking && i === this.memberIdx;
      const face = this.game.portraits?.[m.id];
      if (face) { ctx.save(); if (m.down) ctx.globalAlpha = 0.4; ctx.drawImage(face, x + 4, y + 2, 26, 26); ctx.restore(); }
      if (m.down) { const left = Math.max(0, DOWN_TURNS - m.downTurns); ctx.fillStyle = '#c0392b'; ctx.fillRect(x + 1, y, 14, 14); ctx.font = SMALL; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText(String(left), x + 8, y + 1); ctx.textAlign = 'left'; }   // 일어나기까지 남은 라운드
      const planned = this.plans.find((pl) => pl.member === m); if (planned) this.drawIcon(ctx, planned.type === 'fight' ? 'sword' : 'bread', x + 20, y + 18);
      ctx.font = FONT; ctx.textAlign = 'left'; ctx.fillStyle = m.down ? '#777' : active ? '#ffe066' : '#fff'; ctx.fillText(m.name, x + 34, y + 6);
      const nameW = Math.ceil(ctx.measureText(m.name).width);
      const bx = x + 34 + nameW + 24, bw = Math.min(96, x + cw - 6 - bx);
      ctx.font = small; ctx.fillStyle = '#fff'; ctx.fillText('HP', bx - 19, y + 15);
      ctx.fillStyle = '#7a1b1b'; ctx.fillRect(bx, y + 16, bw, 9); ctx.fillStyle = m.down ? '#555' : this.hpColor(m); ctx.fillRect(bx, y + 16, Math.round(bw * m.hp / m.maxHp), 9);   // 캐릭터별 색(하늘/빨강/연보라)
      ctx.textAlign = 'right'; ctx.fillStyle = m.down ? '#ff6b6b' : '#fff'; ctx.fillText(`${m.hp}/ ${m.maxHp}`, bx + bw, y + 3);
      ctx.textAlign = 'left'; ctx.font = FONT;
    });
  }
  /** 12x12 픽셀 아이콘: sword(빨간 검) / bread(초록 빵) — 델타룬 카드의 행동 표시 */
  drawIcon(ctx, kind, x, y) {
    const P = (px, py, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x + px, y + py, w, h); };
    if (kind === 'sword') {
      for (let i = 0; i < 7; i++) { P(9 - i, 1 + i, 2, 1, '#ff4b4b'); P(10 - i, 1 + i, 1, 1, '#ffb3b3'); }   // 날(빨강, 하이라이트)
      P(1, 8, 4, 1, '#c9a52a'); P(3, 9, 2, 1, '#c9a52a'); P(2, 10, 2, 2, '#7a4f2e'); P(0, 9, 2, 2, '#7a4f2e');   // 날밑·손잡이
    } else if (kind === 'cannon') {
      P(1, 3, 10, 5, '#ddd'); P(8, 2, 4, 7, '#fff'); P(2, 8, 3, 3, '#999'); P(8, 8, 3, 3, '#999');
    } else if (kind === 'strip') {
      P(2, 0, 2, 5, '#da86b5'); P(8, 0, 2, 5, '#da86b5'); P(1, 5, 10, 6, '#ded5df'); P(4, 7, 4, 3, '#29202f');
    } else if (kind === 'idea') {                                                   // 억빠맨 얼굴(파란 곰·크림 주둥이) + 전구(BUILD208)
      P(0, 3, 8, 8, '#4a5ec8'); P(0, 2, 2, 2, '#4a5ec8'); P(6, 2, 2, 2, '#4a5ec8'); P(1, 3, 1, 1, '#f3a6c4'); P(6, 3, 1, 1, '#f3a6c4'); P(2, 7, 4, 3, '#f3e6c8'); P(3, 8, 2, 1, '#29202f'); P(2, 5, 1, 1, '#111'); P(5, 5, 1, 1, '#111');
      P(9, 1, 3, 3, '#ffe066'); P(10, 0, 1, 1, '#ffe066'); P(9, 4, 3, 1, '#c9a52a'); P(10, 5, 1, 1, '#9a7a1a');
    } else {
      P(2, 4, 8, 6, '#4cd964'); P(3, 3, 6, 1, '#4cd964'); P(1, 5, 1, 4, '#4cd964'); P(10, 5, 1, 4, '#4cd964');   // 빵 덩어리(초록)
      P(3, 3, 6, 1, '#8dffa8'); P(4, 5, 2, 1, '#2f8f44'); P(7, 6, 2, 1, '#2f8f44'); P(2, 10, 8, 1, '#2f8f44');   // 윤기·칼집
    }
  }
  box(ctx, x, y, w, h) { ctx.fillStyle = '#000'; ctx.fillRect(x, y, w, h); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3); }
  heart(ctx, x, y) { ctx.fillStyle = '#ff0000'; ctx.fillRect(x, y + 1, 2, 2); ctx.fillRect(x + 3, y + 1, 2, 2); ctx.fillRect(x - 1, y + 3, 7, 2); ctx.fillRect(x, y + 5, 5, 1); ctx.fillRect(x + 1, y + 6, 3, 1); ctx.fillRect(x + 2, y + 7, 1, 1); }
  /** 위쪽 상자(y 246~318): 나레이션·전투 안 대사 (화자 이름표·초상화). 긴 줄은 상자 폭에서 접는다(튜토리얼 대사 깨짐 방지) */
  drawTextBox(ctx) {
    this.box(ctx, 20, 246, 440, 72); ctx.fillStyle = '#fff'; ctx.textAlign = 'left';
    let tx = 36;
    if (this.speaker) {                                            // 화자 이름표 + 초상화 (전투 안 대사)
      const w = 16 + this.speaker.length * 16; this.box(ctx, 24, 224, w, 26); ctx.fillStyle = '#fff'; ctx.fillText(this.speaker, 32, 228);
      const face = this.portrait && this.game.portraits?.[this.portrait]; if (face) { ctx.drawImage(face, 30, 258, 48, 48); tx = 90; }
    }
    ctx.fillStyle = '#fff';
    this.wrapText(ctx, this.text.slice(0, this.shown), 440 - (tx - 20) - 14).slice(0, 3).forEach((line, i) => {
      const y = 254 + i * LH, mo = this.lineMosaic;
      if (!mo || !line.includes(mo.text)) { ctx.fillText(line, tx, y); return; }
      let x = tx; const parts = line.split(mo.text);
      parts.forEach((part, k) => { ctx.fillText(part, x, y); x += ctx.measureText(part).width; if (k < parts.length - 1) { drawMosaicText(ctx, mo.text, x, y, mo.block); x += ctx.measureText(mo.text).width; } });
    });
  }
  /** 단어 단위 줄바꿈(현재 폰트 기준) — '\n' 은 그대로 줄을 나눈다 */
  wrapText(ctx, text, maxW) {
    const lines = [];
    for (const para of text.split('\n')) {
      let cur = '';
      for (const word of para.split(' ')) { const t = cur ? cur + ' ' + word : word; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = word; } else cur = t; }
      lines.push(cur);
    }
    return lines;
  }
  /** 적 말풍선(델타룬 전투 참고): 적 왼쪽에 큰 흰 풍선 + 적 쪽 꼬리, 검은 작은 글씨를 한 글자씩 */
  drawBubble(ctx) {
    const b = this.bubble, e = b.enemy; if (!e || e.dead) return;
    ctx.save(); ctx.font = SMALL; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    const w = 172, pad = 10, lh = 14; const lines = menuTextLines(ctx, b.text, w - pad * 2, 20);
    const h = Math.max(50, lines.length * lh + pad * 2);
    // 지원 모듈이 말하는 자리(꼬리 끝)를 정할 수 있다(청소년전: 말하는 가재맨 옆)
    const anchor = this.support?.bubbleAnchor?.(b);
    const x = anchor ? Math.round(anchor[0] - 20 - w) : Math.round(e.x - 66 - w), cy = anchor ? Math.max(6 + h / 2, anchor[1]) : b.patternHold ? 28 + h / 2 : Math.max(6 + h / 2, Math.round(e.y - 62)), y = Math.round(cy - h / 2);
    ctx.fillStyle = '#fff'; this.roundRect(ctx, x, y, w, h, 9); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x + w - 2, cy - 10); ctx.lineTo(x + w + 18, cy + 1); ctx.lineTo(x + w - 2, cy + 8); ctx.closePath(); ctx.fill();   // 꼬리(적 쪽)
    ctx.fillStyle = '#000';
    menuTextLines(ctx, b.text.slice(0, b.shown), w - pad * 2, 20).forEach((line, i) => drawMosaicText(ctx, line, x + pad, y + pad + i * lh, b.mosaic));
    ctx.restore(); ctx.font = FONT; ctx.textBaseline = 'top';
  }
  roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r); ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath(); }
  hpBar(ctx, x, y, w, hp, max, col, bg) { ctx.fillStyle = bg; ctx.fillRect(x, y, w, 9); ctx.fillStyle = col; ctx.fillRect(x, y, Math.round(w * hp / max), 9); }
  /** 행동 선택 패널(y 246~318, 델타룬 전투 참고):
   *  menu   — 위 두 줄 잡담 문구 + 아랫줄 현재 멤버 이름과 [공격하기][아이템] 상자 버튼(글자보다 넓게)
   *  target — 적 목록(하트 커서 ↑↓, 이름·HP 바·숫자)  item — 2열 격자  item-target — 멤버 목록(색 HP 바). HP 띠는 맨 아래(drawHpStrip) */
  drawPanel(ctx) {
    if (['intro', 'win', 'lose', 'text', 'act', 'load', 'ending', 'enemy-mode'].includes(this.state)) { this.drawTextBox(ctx); return; }
    this.box(ctx, 20, 246, 440, 72); ctx.textAlign = 'left'; ctx.fillStyle = '#fff';
    const m = this.members[this.memberIdx]; if (!m) return;
    const row = (i) => 254 + i * 18;
    if (this.state === 'menu') {
      if (this.text) this.wrapText(ctx, this.text.slice(0, this.shown), 408).slice(0, 2).forEach((line, i) => ctx.fillText(line, 36, 252 + i * 16));   // 잡담 문구
      const by = 292; ctx.fillStyle = '#ffe066'; ctx.fillText(m.name, 36, by + 2);                    // 누구 차례인지
      let bx = 36 + Math.ceil(ctx.measureText(m.name).width) + 16;
      const buttons = this.menuButtons();
      buttons.forEach(({ label, enabled, icon, kind }, k) => { const bw = Math.ceil(ctx.measureText(label).width) + (icon ? 44 : 30), bh = icon ? 24 : 20; const sel = this.menuIdx === k;
        ctx.fillStyle = sel ? '#3a3000' : '#000'; ctx.fillRect(bx, by, bw, bh); ctx.strokeStyle = sel ? '#ffe066' : '#9a9ab0'; ctx.lineWidth = 2; ctx.strokeRect(bx + 1, by + 1, bw - 2, bh - 2);
        if (icon) this.drawIcon(ctx, icon, bx + 18, by + 4);
        if (icon && this.support?.requiredHits) {
          const step = Math.floor((bw - 12) / this.support.requiredHits);
          for (let i = 0; i < this.support.requiredHits; i++) { ctx.fillStyle = i < this.support.charge ? '#ffe066' : '#45404d'; ctx.fillRect(bx + 6 + i * step, by + 20, step - 2, 2); }
        }
        ctx.fillStyle = !enabled ? '#777' : sel ? '#ffe066' : '#fff'; ctx.fillText(label, bx + (icon ? 32 : 18), by + 2); if (sel) this.heart(ctx, bx + 6, by + 6);
        if (!enabled && kind === 'fight') { ctx.strokeStyle = '#ff4d4d'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(bx + 6, by + 4); ctx.lineTo(bx + bw - 6, by + bh - 4); ctx.moveTo(bx + bw - 6, by + 4); ctx.lineTo(bx + 6, by + bh - 4); ctx.stroke(); }
        bx += bw + 8; });
    } else if (this.state === 'target') {                          // 델타룬 FIGHT: 적 목록 + HP 바, 하트 커서
      this.targets().forEach((e, i) => { const y = row(i), sel = i === this.targetIdx; if (sel) this.heart(ctx, 38, y + 5); ctx.fillStyle = sel ? '#ffe066' : '#fff'; ctx.fillText(e.name, 54, y);
        this.hpBar(ctx, 250, y + 4, 90, e.hp, e.maxHp, '#4cd964', '#7a1b1b'); ctx.fillStyle = '#fff'; ctx.fillText(`${e.hp}/${e.maxHp}`, 350, y); });
    } else if (this.state === 'item') {                            // 델타룬 ITEM: 2열 격자
      const items = plainItems(this.game.inventory), page = Math.floor(this.itemIdx / 6) * 6;
      items.slice(page, page + 6).forEach((it, k) => { const i = page + k, x = 36 + Math.floor(k / 3) * 212, y = row(k % 3), sel = i === this.itemIdx; if (sel) this.heart(ctx, x + 2, y + 5); ctx.fillStyle = sel ? '#ffe066' : '#fff'; ctx.fillText(it + (ITEMS[it]?.heal ? ` (+${ITEMS[it].heal})` : ''), x + 18, y); });
    } else if (this.state === 'item-target') {                     // 누구에게: 멤버 목록 + 색 HP 바
      const all = ITEMS[this.itemName]?.target === 'party';
      this.members.forEach((t, i) => { const y = row(i), sel = all || i === this.itemTargetIdx; if (sel) this.heart(ctx, 38, y + 5); ctx.fillStyle = sel ? '#ffe066' : t.down ? '#777' : '#fff'; ctx.fillText(t.name, 54, y);
        this.hpBar(ctx, 250, y + 4, 90, t.hp, t.maxHp, this.hpColor(t), '#3a2020'); ctx.fillStyle = '#fff'; ctx.fillText(`${t.hp}/${t.maxHp}`, 350, y); });
    }
    if (this.state === 'item-target') {                           // 대상 멤버 위에 화살표
      const targets = ITEMS[this.itemName]?.target === 'party' ? this.members : [this.members[this.itemTargetIdx]];
      for (const t of targets) if (t) { const ax = t.home[0], ay = t.home[1] - 92; ctx.fillStyle = '#ffe066'; ctx.beginPath(); ctx.moveTo(ax - 7, ay); ctx.lineTo(ax + 7, ay); ctx.lineTo(ax, ay + 9); ctx.closePath(); ctx.fill(); }
    }
    if (this.state === 'target') {                                // 고르는 적 위에 화살표 (HP 는 목록에)
      // 커서는 때릴 수 있는 적(untargetable 제외) 위에 — 오방순 위에 뜨던 버그(BUILD210)
      const e = this.targets()[this.targetIdx]; if (e) { const ax = e.x, ay = Math.max(6, e.y - 112); ctx.fillStyle = '#ffe066'; ctx.beginPath(); ctx.moveTo(ax - 7, ay); ctx.lineTo(ax + 7, ay); ctx.lineTo(ax, ay + 9); ctx.closePath(); ctx.fill(); }
    }
  }
}
