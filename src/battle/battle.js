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
import { ITEMS, plainItems } from '../data/items.js';
import L from '../data/locale/ko.js';

const SCREEN_W = 480, SCREEN_H = 360, LH = 18;
const PARTY_ORDER = ['hyungsub', ...WALK_ORDER];   // 위→아래 = 걷는 순서(형섭·경섭·빠맨) — characters.js 단일 진실
const PARTY_X = 84, PARTY_YS = { 1: [150], 2: [100, 200], 3: [70, 145, 220] };   // 세로 간격 75px — 셋이 패널(y 246) 위에 다 들어온다 (2026-09-10 사용자, HP 띠를 맨 아래로 빼면서 위로)
const ENEMY_X = 396, ENEMY_YS = { 1: [176], 2: [120, 236], 3: [92, 168, 244] };
const ACTOR_SCALE = 0.66;            // 미리보기(0.25) 대비 (사용자 요청으로 10% 확대)
const APPROACH_SPEED = 820, RETURN_SPEED = 700;   // px/s — "생각보다 빠르게"
const ATTACK_SPEEDUP = 1.35;         // 공격 모션 재생 배속
const BETWEEN_ACTS = 0.08;           // 멤버 사이 딜레이(초) — "빠르게빠르게"
const HIT_AT = 0.14;                 // 공격 모션 시작 뒤 이 시점에 데미지·효과음
const PREP_OPEN = 0.3;               // 적 턴: 탄막 상자가 패널 자리에서 펼쳐지는 시간(초) — 그 뒤 소울이 보이고 움직일 수 있다
const PREP_HOLD = 0.9;               // 말풍선이 다 뜬 뒤 탄막까지 준비 시간(초) (사용자: "펼쳐지고 대사 나오고 준비할 딜레이")
const BUBBLE_CPS = 0.03;             // 말풍선 타자 속도(초/글자)
const BGM_DELAY = 0;                 // 전투 화면이 열리는 순간 브금 (침묵 없음). 2026-09-11 타임라인: 징글 마지막 악절이 1.45~1.5s 에 끝나고 화면이 1.5s 에 열린다 → 그 자리에 바로 이어 붙인다
const BGM_FADE = 0.3;                // 징글 꼬리에서 브금으로 넘어가는 페이드(초) — 0 은 쾅, 0.2s 침묵도 어색, 0.15 도 급함 → 0.3 (사용자 2026-09-11)
const SMALL = FONT.replace(/^\d+px/, '12px');   // 말풍선·HP 숫자용 작은 글씨
const stripTags = (t) => (t || '').replace(/\{[^}]*\}/g, '');
const FRAME_CACHE = new Map(), IMAGE_CACHE = new Map();   // 전투마다 아틀라스를 다시 색키 처리하지 않는다(첫 전투 뒤엔 로딩 정지 없음)
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
    for (const id of ids) if (BATTLE_SPRITES[id]) cached(FRAME_CACHE, id, () => loadActorFrames(BATTLE_SPRITES[id], BATTLE_PREVIEW.colorKey));
    for (const eid of enemyIds) { const def = ENEMIES[eid]; if (!def) continue; const src = def.image || def.sheet?.src; cached(IMAGE_CACHE, src, () => new Promise((resolve) => { const im = new Image(); im.onload = () => resolve(im); im.onerror = () => resolve(null); im.src = src; })); }
  }
  constructor(game, cfg) {
    this.game = game; this.cfg = cfg;
    const ids = PARTY_ORDER.filter((id) => id === 'hyungsub' || game.party.includes(id));
    const ys = PARTY_YS[ids.length] || PARTY_YS[3];
    this.members = ids.map((id, i) => {
      const ch = CHARACTERS[id]; const max = ch.hp ?? 100;
      const name = i === 0 && game.has?.('void_fallen') ? '요플래' : (ch.partyName || ch.name);
      return { id, name, maxHp: max, hp: Math.max(1, Math.min(max, game.partyHp?.[id] ?? max)), home: [PARTY_X, ys[i]], frames: null, action: null, popup: null, down: false };
    });
    const eys = ENEMY_YS[cfg.enemies.length] || ENEMY_YS[3];
    this.enemies = cfg.enemies.map((id, i) => { const def = ENEMIES[id]; return { id, def, name: def.name, hp: def.hp, maxHp: def.hp, x: ENEMY_X, y: eys[i], img: null, dead: false, dying: 0, shake: 0, blink: 0, popup: null, patternIdx: 0 }; });
    this.state = 'load'; this.t = 0; this.memberIdx = 0; this.menuIdx = 0; this.targetIdx = 0; this.itemIdx = 0; this.plans = []; this.text = ''; this.textT = 0;
    this.board = new Board(); this.soul = new Soul(); this.bullets = []; this.patterns = []; this.rnd = Math.random;
    this.modes = { attack: cfg.modes?.attack || 'rush', enemy: cfg.modes?.enemy || 'bullets' }; this.gimmick = null;   // 기믹 모드(src/battle/modes.js): 공격/적 턴을 미니게임으로 바꿔 끼움
    this.result = null; this.pressed = false;
    this.load();                                                       // 브금·페이드인은 load() 가 에셋을 다 준비한 뒤 — 검은 화면/로딩 정지 아래에서 첫 소절이 지나가지 않게 (사용자 2026-09-10 '초반이 패스당한 느낌')
  }

  async load() {
    try {
      await Promise.all([
        ...this.members.map(async (m) => { m.frames = await cached(FRAME_CACHE, m.id, () => loadActorFrames(BATTLE_SPRITES[m.id], BATTLE_PREVIEW.colorKey)); }),
        ...this.enemies.map(async (e) => { e.img = await cached(IMAGE_CACHE, e.def.image || e.def.sheet?.src, () => this.loadEnemyImage(e.def)); }),
      ]);
    } catch (err) { console.warn('[battle] 에셋 로드 실패', err); }
    this.game.fadeTo(0, 0.12);                                                                  // 검은 화면은 델타룬처럼 거의 바로 걷는다
    this.bgmWait = BGM_DELAY;                                                                   // 화면이 열리는 순간(BGM_DELAY 0) 징글 꼬리에 이어 브금
    this.members.forEach((m, i) => { m.pose = -0.12 * i; });   // 전투 시작 포즈: 공격 모션을 제자리에서 한 번(순서대로 살짝 어긋나게)
    // 인트로 문구 목록: cfg.intro(전투 안 대사 — 튜토리얼 기믹 등, 문자열 또는 {speaker, portrait, voice, text}) 없으면 적의 appear 줄
    this.introLines = (this.cfg.intro && this.cfg.intro.length) ? [...this.cfg.intro] : [this.enemies.map((e) => e.def.lines?.appear).filter(Boolean).join('\n') || `* ${this.enemies[0].name} 이(가) 나타났다!`];
    this.showLine(this.introLines.shift());
    this.state = 'intro'; this.t = 0;
  }
  loadEnemyImage(def) {
    return new Promise((resolve) => { const im = new Image(); im.onload = () => resolve(im); im.onerror = () => resolve(null); im.src = def.image || def.sheet?.src; });
  }

  // ── 유틸 ──
  alive() { return this.members.filter((m) => !m.down); }
  living() { return this.enemies.filter((e) => !e.dead); }
  setText(t) { this.text = stripTags(t); this.textT = 0; this.shown = 0; this.speaker = null; this.portrait = null; this.voice = 'narrator'; }
  /** 대사 한 줄: 문자열이면 나레이션, 객체면 화자 이름·초상화·목소리 */
  showLine(l) { if (typeof l === 'string') { this.setText(l); return; } this.setText(l.text); this.speaker = l.speaker || null; this.portrait = l.portrait || null; this.voice = l.voice || 'narrator'; }
  get typed() { return this.shown >= this.text.length; }
  /** 전투 문구 타자: 22ms 마다 한 글자, 글자마다 나레이션 블립(띠리리링) */
  typeText(dt) {
    if (this.shown >= this.text.length) return;
    this.textT += dt; const n = Math.min(this.text.length, Math.floor(this.textT / 0.022));
    for (let i = this.shown; i < n; i++) if (this.text[i] !== ' ' && this.text[i] !== '\n') this.game.sound.blip(this.voice || 'narrator');
    this.shown = n;
  }
  sfx(n) { this.game.sound.sfx(n); }

  // ── 진행 ──
  update(dt, input) {
    this.t += dt;
    if (this.bgmWait !== undefined) { this.bgmWait -= dt; if (this.bgmWait <= 0) { this.bgmWait = undefined; if (this.cfg.bgm) this.game.sound.playBgm(this.cfg.bgm, { volume: 0.5, fadeIn: BGM_FADE }); } }   // 화면이 열리는 순간 짧은 페이드로
    for (const m of this.members) { if (m.action) m.action.update(dt); if (m.popup) { m.popup.t += dt; if (m.popup.t > 0.9) m.popup = null; } if (m.pose !== undefined && m.pose !== null) { m.pose += dt; const T = BATTLE_SPRITES[m.id].attack.reduce((a, f) => a + f.duration, 0); if (m.pose > T) m.pose = null; } }
    this.enemies.forEach((e, i) => { if (e.shake > 0) e.shake -= dt; if (e.blink > 0) e.blink -= dt; if (e.dying > 0) { e.dying -= dt; if (e.dying <= 0) { e.dead = true; } } if (e.popup) { e.popup.t += dt; if (e.popup.t > 0.9) e.popup = null; }
      const idle = e.def.idle || { swayX: 7, swayY: 2, period: 2.8 }; const ph = this.t * Math.PI * 2 / (idle.period || 2.8) + i * 1.9;   // 기본 모션: 좌우로 천천히(사용자: 정적인 느낌 없애기), 살짝 위아래
      e.ox = Math.sin(ph) * (idle.swayX ?? 7); e.oy = -Math.abs(Math.sin(ph * 2)) * (idle.swayY ?? 2); });
    this.board.update(dt); this.typeText(dt);
    switch (this.state) {
      case 'load': return;
      case 'intro': if (input.just('confirm') && !this.typed) { this.shown = this.text.length; return; }
        if (this.typed && this.t > 0.6 && (input.just('confirm') || (this.t > 2.4 && !this.speaker))) { if (this.introLines.length) { this.showLine(this.introLines.shift()); this.t = 0.5; } else this.beginMenu(); } return;
      case 'menu': return this.updateMenu(input);
      case 'target': return this.updateTarget(input);
      case 'item': return this.updateItem(input);
      case 'item-target': return this.updateItemTarget(input);
      case 'text': if (input.just('confirm') && !this.typed) { this.shown = this.text.length; return; } if (this.typed && this.t > 0.5 && (input.just('confirm') || this.t > 1.8)) { this.state = this.after || 'menu'; this.t = 0; } return;
      case 'act': return this.updateAct(dt, input);
      case 'enemy-mode': if (this.gimmick && this.gimmick.update(dt, input) && this.state === 'enemy-mode') { this.gimmick = null; this.beginMenu(); } return;
      case 'enemy-prep': return this.updatePrep(dt, input);
      case 'bullets': return this.updateBullets(dt, input);
      case 'board-close': if (this.t > 0.3) this.beginMenu(); return;
      case 'win': if (input.just('confirm') && !this.typed) { this.shown = this.text.length; return; } if (this.typed && this.t > 0.6 && input.just('confirm')) this.finish(true); return;
      case 'ending': return;
      case 'lose': if (this.t > 0.8 && input.just('confirm')) this.retry(); return;
    }
  }
  beginMenu() {
    this.state = 'menu'; this.t = 0; this.plans = []; this.memberIdx = 0; this.menuIdx = 0;
    while (this.memberIdx < this.members.length && this.members[this.memberIdx].down) this.memberIdx++;
    const live = this.living(); const e = live[Math.floor(this.rnd() * Math.max(1, live.length))]; const idle = e?.def.lines?.idle || [];
    this.setText(idle.length ? idle[Math.floor(this.rnd() * idle.length)] : '');   // 잡담 문구는 행동 선택 화면([공격하기][아이템])과 같은 패널에 공존 (사용자 2026-09-10)
  }
  updateMenu(input) {
    if (this.memberIdx >= this.members.length) { this.beginAct(); return; }
    if (input.just('left') || input.just('right')) { this.menuIdx = 1 - this.menuIdx; this.sfx('menu'); }
    if (input.just('confirm')) {
      this.sfx('confirm');
      if (this.menuIdx === 0) { this.state = 'target'; this.targetIdx = 0; this.t = 0; }
      else { const items = plainItems(this.game.inventory); if (!items.length) { this.setText(L.battle_no_items); this.state = 'text'; this.after = 'menu'; this.t = 0; } else { this.state = 'item'; this.itemIdx = 0; this.t = 0; } }
      return;
    }
    if (input.just('cancel') && this.plans.length) {           // 이전 멤버로 되돌아가기 (델타룬처럼)
      this.sfx('cancel'); this.plans.pop(); this.memberIdx--; while (this.memberIdx > 0 && this.members[this.memberIdx].down) this.memberIdx--; this.menuIdx = 0;
    }
  }
  updateTarget(input) {
    const list = this.living(); if (!list.length) { this.state = 'menu'; return; }
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
    if (this.memberIdx >= this.members.length) this.beginAct();
  }

  // ── 행동 실행 ──
  beginAct() { this.state = 'act'; this.t = 0; this.actIdx = 0; this.actWait = 0; this.cur = null; this.setText(''); }   // 이전 문구(아이템 없음 등)가 남지 않게
  updateAct(dt, input) {
    if (this.cur?.gimmick) { if (this.gimmick.update(dt, input)) { this.gimmick = null; this.cur = null; this.actWait = BETWEEN_ACTS; } return; }   // 미니게임 공격 모드
    if (this.cur) {
      const { plan, action } = this.cur;
      if (action.mode === 'attack' && !this.cur.hit && action.elapsed >= HIT_AT) { this.cur.hit = true; this.hitEnemy(plan.target, plan.member); }
      if (action.mode === 'idle') { this.cur = null; this.actWait = BETWEEN_ACTS; }
      return;
    }
    if (this.actWait > 0) { this.actWait -= dt; return; }
    if (this.actIdx >= this.plans.length) {
      if (!this.living().length) { const gain = this.enemies.reduce((a, e) => a + (e.def.money ?? 30), 0); this.game.money = (this.game.money || 0) + gain; this.state = 'win'; this.t = 0; this.setText(L.battle_win_money.replace('{n}', gain)); this.game.sound.stopBgm(0.3); this.sfx('won'); return; }   // 표준 승리 문구: '전투에서 승리했다! n원을 얻었다.' + 델타룬 snd_won
      this.beginEnemyTurn(); return;
    }
    const plan = this.plans[this.actIdx++];
    if (plan.member.down) return;
    if (plan.type === 'item') { this.useItem(plan.target || plan.member, plan.name, plan.member); this.actWait = 0.6; return; }
    let target = plan.target; if (target.dead || target.dying > 0) target = this.living()[0]; if (!target) return;
    plan.target = target;
    const modeName = plan.member.attackMode || this.modes.attack; const create = getBattleMode('attack', modeName);
    if (typeof create === 'function') { this.gimmick = create(this, { plan, member: plan.member, target }); this.cur = { plan, gimmick: true }; return; }
    if (create !== NATIVE) console.warn('[battle] 모르는 공격 모드', modeName);
    const def = BATTLE_SPRITES[plan.member.id]; const attackT = def.attack.reduce((s, f) => s + f.duration, 0);
    const action = new FastAction(plan.member.home, [target.x - 44, target.y + 6], attackT / ATTACK_SPEEDUP); action.start();
    plan.member.action = action; this.cur = { plan, action, hit: false };
  }
  hitEnemy(e, by, dmg = 1) {
    e.hp = Math.max(0, e.hp - dmg); e.shake = 0.35; e.blink = 0.3; e.popup = { t: 0, text: String(dmg) };
    this.sfx('hit'); this.sfx('damage');                        // 델타룬 공식: 베기(snd_laz) + 타격(snd_damage)
    if (e.hp <= 0) { e.dying = 0.5; this.sfx('vaporized'); this.setText(e.def.lines?.die || `* ${e.name} 이(가) 쓰러졌다.`); }   // 맞았을 때 문구는 없음(사용자)
  }
  useItem(m, name, by = m) {
    const def = ITEMS[name] || {}; const i = this.game.inventory.indexOf(name); if (i >= 0) this.game.inventory.splice(i, 1);
    if (def.heal) { const before = m.hp; m.hp = Math.min(m.maxHp, m.hp + def.heal); if (m.down && m.hp > 0) m.down = false; m.popup = { t: 0, text: '+' + (m.hp - before), heal: true }; }
    this.sfx('heal'); this.setText(`* ${by.name} 이(가) ${m.name} 에게 ${name} 을(를) 썼다.`);
  }

  // ── 적 턴 ──
  boardSize() { const live = this.living(); return [Math.max(...live.map((e) => e.def.board?.[0] || 200)), Math.max(...live.map((e) => e.def.board?.[1] || 150))]; }
  /** 적 턴 준비(델타룬 전투 참고): 패널 자리에서 탄막 상자가 펼쳐지고 소울이 나타난다 + 적 옆 흰 말풍선에 한마디(작은 글씨, 타자) → 다 뜬 뒤 PREP_HOLD 준비 시간 → 탄막(말풍선은 사라짐). 바로 공격이 오지 않는다 */
  beginEnemyTurn() {
    const live = this.living(); const e = live[Math.floor(this.rnd() * live.length)]; const lines = e.def.lines?.speak || [];
    const defName = e.def.defense || this.modes.enemy; const create = getBattleMode('enemy', defName);
    if (typeof create === 'function') { this.gimmick = create(this, { enemy: e }); this.bubble = null; this.state = 'enemy-mode'; this.t = 0; this.setText(''); return; }   // 적 턴 미니게임 모드
    if (create !== NATIVE) console.warn('[battle] 모르는 적 턴 모드', defName);
    this.bubble = { enemy: e, text: lines.length ? lines[Math.floor(this.rnd() * lines.length)] : '...', shown: 0, t: 0, voice: e.def.voice || 'narrator' };
    this.board.x = 20; this.board.y = 246; this.board.w = 440; this.board.h = 72;             // 패널 상자에서 펼쳐진다
    const [bw, bh] = this.boardSize(); this.board.setTarget(bw, bh, 240, 214);
    this.soul.center({ x: 240 - bw / 2, y: 214 - bh / 2, w: bw, h: bh }); this.soul.invuln = 0; this.bullets = [];
    this.state = 'enemy-prep'; this.t = 0; this.setText('');
  }
  updatePrep(dt, input) {
    const b = this.bubble;
    if (b) { b.t += dt; const n = Math.min(b.text.length, Math.floor(b.t / BUBBLE_CPS)); for (let i = b.shown; i < n; i++) if (b.text[i] !== ' ') this.game.sound.blip(b.voice); b.shown = n; if (n >= b.text.length && b.doneAt === undefined) b.doneAt = this.t; }
    if (this.t > PREP_OPEN) this.soul.update(dt, input, this.board);                          // 준비 시간 동안 소울을 미리 움직일 수 있다
    if ((!b || b.doneAt !== undefined) && this.t > PREP_OPEN && this.t - (b?.doneAt ?? 0) > PREP_HOLD) this.beginBullets();
  }
  beginBullets() {
    this.patterns = this.living().map((e) => { const cfgs = e.def.patterns || [{ type: 'rain' }]; const c = cfgs[e.patternIdx++ % cfgs.length]; return { p: PATTERNS[c.type](c), t: 0, dmg: c.damage ?? e.def.damage ?? 6 }; });
    const [bw, bh] = this.boardSize();
    this.board.setTarget(bw, bh, 240, 214); this.board.snap(); this.soul.invuln = 0; this.bullets = [];   // 소울은 준비 시간에 옮겨 둔 자리 그대로
    this.bubble = null;                                        // 말풍선은 탄막이 시작되면 사라진다(델타룬) — 상자 위를 가려 탄막을 숨기지 않게
    this.state = 'bullets'; this.t = 0; this.setText('');
  }
  updateBullets(dt, input) {
    this.soul.update(dt, input, this.board);
    const api = { box: this.board.rect, soul: this.soul, rnd: this.rnd, emit: null };
    let running = false;
    for (const pat of this.patterns) {
      if (pat.t >= pat.p.duration) continue; running = true;
      api.emit = (o) => this.bullets.push(new Bullet({ ...o, dmg: o.dmg ?? pat.dmg }));
      pat.p.update(pat.t, dt, api); pat.t += dt;
    }
    for (const b of this.bullets) {
      b.update(dt, this.board);
      if (this.soul.invuln <= 0 && b.hits(this.soul)) this.hurtParty(b.dmg);
    }
    this.bullets = this.bullets.filter((b) => !b.out(this.board));
    if (!running && (!this.bullets.length || this.t > Math.max(...this.patterns.map((p) => p.p.duration)) + 1.2)) { this.bullets = []; this.bubble = null; this.state = 'board-close'; this.t = 0; this.board.setTarget(440, 72, 240, 282); }
  }
  hurtParty(dmg) {
    const alive = this.alive(); if (!alive.length) return;
    const m = alive[Math.floor(this.rnd() * alive.length)];
    m.hp = Math.max(0, m.hp - dmg); m.popup = { t: 0, text: String(dmg) };
    this.soul.invuln = 0.75; this.soul.hits++; this.sfx('hurt'); this.game.shake = { time: 0.15, amp: 2 };
    if (m.hp <= 0) { m.down = true; }
    if (!this.alive().length) { this.bullets = []; this.bubble = null; this.state = 'lose'; this.t = 0; this.board.setTarget(440, 72, 240, 282); this.setText(L.battle_lose); }
  }
  retry() {
    this.bubble = null;
    for (const m of this.members) { m.hp = m.maxHp; m.down = false; }
    for (const e of this.enemies) { e.hp = e.maxHp; e.dead = false; e.dying = 0; e.patternIdx = 0; }
    this.setText(this.enemies.map((e) => e.def.lines?.appear).filter(Boolean).join('\n')); this.state = 'intro'; this.t = 0;
  }
  finish(win) {
    if (this.state === 'ending') return;
    for (const m of this.members) this.game.partyHp[m.id] = m.hp;
    this.result = { win }; this.state = 'ending';
    this.game.fadeTo(1, 0.35, () => this.game.endBattle(this.result), 'black');   // 검게 덮고 필드로 (컷신의 {fade:'in'} 이 걷는다)
  }

  // ── 그리기 ──
  draw(ctx) {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    if (this.cfg.bg === 'teal') this.drawTealBg(ctx);
    ctx.font = FONT; ctx.textBaseline = 'top';
    for (const e of this.enemies) this.drawEnemy(ctx, e);
    const idle = this.members.filter((m) => !m.action || m.action.mode === 'idle'), busy = this.members.filter((m) => m.action && m.action.mode !== 'idle');
    for (const m of idle) this.drawMember(ctx, m);
    for (const m of busy) this.drawMember(ctx, m);
    if (this.gimmick) { if (this.gimmick.draw) this.gimmick.draw(ctx); else this.drawTextBox(ctx); }
    else if (['enemy-prep', 'bullets', 'board-close'].includes(this.state)) { this.board.draw(ctx); if (this.state === 'bullets' || (this.state === 'enemy-prep' && this.t > PREP_OPEN)) { for (const b of this.bullets) b.draw(ctx); this.soul.draw(ctx); } }
    else this.drawPanel(ctx);
    if (this.state === 'lose') this.drawTextBox(ctx);
    if (this.bubble) this.drawBubble(ctx);                          // 적 말풍선(준비 단계)
    this.drawHpStrip(ctx);                                          // HP 띠는 어느 상태에서나 맨 아래 (사용자: '체력바를 아예 아래로 빼')
  }
  drawMember(ctx, m) {
    if (!m.frames) return;
    const act = m.action, posing = m.pose !== undefined && m.pose !== null && m.pose >= 0 && (!act || act.mode === 'idle');
    const mode = act ? act.mode : posing ? 'attack' : 'idle', running = mode === 'approach' || mode === 'return';
    const seq = m.frames[running ? 'run' : mode === 'attack' ? 'attack' : 'idle'];
    const { index } = playbackFrameAt(seq, posing ? m.pose : act && mode !== 'idle' ? act.elapsed * (mode === 'attack' ? ATTACK_SPEEDUP : 1) : this.t, mode !== 'attack');
    const fr = seq[index]; const def = BATTLE_SPRITES[m.id];
    const scale = (running ? def.run.scale : def.scale) * ACTOR_SCALE;
    const picking = ['menu', 'target', 'item', 'item-target'].includes(this.state) && m === this.members[this.memberIdx];
    const [px0, py] = act ? act.position : m.home; const px = px0 + (!act && picking ? 10 : 0);   // 차례인 멤버는 한 발 앞으로(델타룬)
    ctx.save(); ctx.translate(Math.round(px), Math.round(py)); if (mode === 'return') ctx.scale(-1, 1);
    if (m.down) ctx.globalAlpha = 0.35;
    ctx.drawImage(fr.image, Math.round(-fr.pivot[0] * scale), Math.round(-fr.pivot[1] * scale), Math.round(fr.image.width * scale), Math.round(fr.image.height * scale));
    ctx.restore();
    if (m.popup) this.drawPopup(ctx, px, py - 70, m.popup.text, m.popup.t, m.popup.heal ? '#7cff7c' : '#ff5c5c');
  }
  drawEnemy(ctx, e) {
    if (e.dead) return;
    const sh = e.def.sheet; const sx = (e.shake > 0 ? Math.round(Math.sin(e.shake * 60) * 3) : 0) + Math.round(e.ox || 0), sy = Math.round(e.oy || 0);
    if (e.blink > 0 && Math.floor(e.blink * 20) % 2) { if (e.popup) this.drawPopup(ctx, e.x, e.y - 60, e.popup.text, e.popup.t, '#fff'); return; }
    ctx.save(); if (e.dying > 0) ctx.globalAlpha = Math.max(0, e.dying / 0.5);
    if (e.img && sh) {
      const fw = Math.floor(e.img.width / sh.cols), fh = Math.floor(e.img.height / sh.rows); const frames = sh.frames || [0]; const col = frames[Math.floor(this.t * (sh.fps || 2)) % frames.length];
      const s = e.def.scale ?? 1, dw = Math.round(fw / 2 * s), dh = Math.round(fh / 2 * s);
      ctx.drawImage(e.img, col * fw, sh.row * fh, fw, fh, Math.round(e.x - dw / 2 + sx), Math.round(e.y - dh + sy), dw, dh);
    } else if (e.img) {                                          // 단일 PNG: 발 pivot 을 (e.x, e.y) 에 놓는다 (PR #7 가이드: 64×64, pivot 32,60 → 아래 4px 여백)
      const s = e.def.scale ?? 1, dw = Math.round(e.img.width * s), dh = Math.round(e.img.height * s); const [pvx, pvy] = e.def.pivot || [e.img.width / 2, e.img.height];
      ctx.drawImage(e.img, Math.round(e.x - pvx * s + sx), Math.round(e.y - pvy * s + sy), dw, dh);
    } else { ctx.fillStyle = '#7a8'; ctx.fillRect(e.x - 20 + sx, e.y - 44 + sy, 40, 44); }
    ctx.restore();
    if (e.popup) this.drawPopup(ctx, e.x, e.y - 60, e.popup.text, e.popup.t, '#fff');
  }
  drawPopup(ctx, x, y, text, t, col) {
    ctx.save(); ctx.globalAlpha = t < 0.6 ? 1 : Math.max(0, 1 - (t - 0.6) / 0.3); ctx.fillStyle = col; ctx.textAlign = 'center';
    ctx.fillText(text, Math.round(x), Math.round(y - Math.min(14, t * 40))); ctx.restore(); ctx.textAlign = 'left';
  }
  /** 청록숲 전투 배경: 화면 위쪽에 아주 옅은 청록 잎 구름 (사용자: '진짜 살짝만') */
  drawTealBg(ctx) {
    ctx.save(); ctx.globalAlpha = 0.16;
    const blobs = [[30, 8, 58], [120, -6, 70], [220, 10, 62], [330, -4, 74], [430, 12, 60], [70, 40, 34], [280, 44, 38], [400, 46, 30]];
    for (const [x, y, r] of blobs) { ctx.fillStyle = '#1c6e66'; ctx.beginPath(); ctx.arc(x + Math.sin(this.t * 0.3 + x) * 2, y, r, 0, Math.PI * 2); ctx.fill(); }
    ctx.globalAlpha = 0.1; ctx.fillStyle = '#2c9a8f';
    for (const [x, y, r] of blobs) { ctx.beginPath(); ctx.arc(x + 10, y - 8, r * 0.55, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }
  hpColor(m) { return CHARACTERS[m.id]?.hpColor || '#ffd23b'; }
  /** 화면 맨 아래 HP 띠(델타룬식, 사용자 참고 이미지 2026-09-10): 얼굴 · 이름 · HP · 색 바(바 위에 숫자). 현재 차례는 노란 이름, 정한 행동은 얼굴 귀퉁이 아이콘. 회피 중에도 그대로 */
  drawHpStrip(ctx) {
    const n = this.members.length, cw = Math.floor(440 / n), y = 322;
    const picking = ['menu', 'target', 'item', 'item-target'].includes(this.state);
    const small = FONT.replace(/^\d+px/, '12px');
    this.members.forEach((m, i) => {
      const x = 20 + i * cw, active = picking && i === this.memberIdx;
      const face = this.game.portraits?.[m.id];
      if (face) { ctx.save(); if (m.down) ctx.globalAlpha = 0.4; ctx.drawImage(face, x + 4, y + 2, 26, 26); ctx.restore(); }
      const planned = this.plans.find((pl) => pl.member === m); if (planned) this.drawIcon(ctx, planned.type === 'fight' ? 'sword' : 'bread', x + 20, y + 18);
      ctx.font = FONT; ctx.textAlign = 'left'; ctx.fillStyle = m.down ? '#777' : active ? '#ffe066' : '#fff'; ctx.fillText(m.name, x + 34, y + 6);
      const nameW = Math.ceil(ctx.measureText(m.name).width);
      const bx = x + 34 + nameW + 24, bw = Math.min(96, x + cw - 6 - bx);
      ctx.font = small; ctx.fillStyle = '#fff'; ctx.fillText('HP', bx - 19, y + 15);
      ctx.fillStyle = '#7a1b1b'; ctx.fillRect(bx, y + 16, bw, 9); ctx.fillStyle = m.down ? '#555' : this.hpColor(m); ctx.fillRect(bx, y + 16, Math.round(bw * m.hp / m.maxHp), 9);   // 캐릭터별 색(하늘/빨강/연보라)
      ctx.textAlign = 'right'; ctx.fillStyle = m.down ? '#aaa' : '#fff'; ctx.fillText(`${m.hp}/ ${m.maxHp}`, bx + bw, y + 3);
      ctx.textAlign = 'left'; ctx.font = FONT;
    });
  }
  /** 12x12 픽셀 아이콘: sword(빨간 검) / bread(초록 빵) — 델타룬 카드의 행동 표시 */
  drawIcon(ctx, kind, x, y) {
    const P = (px, py, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x + px, y + py, w, h); };
    if (kind === 'sword') {
      for (let i = 0; i < 7; i++) { P(9 - i, 1 + i, 2, 1, '#ff4b4b'); P(10 - i, 1 + i, 1, 1, '#ffb3b3'); }   // 날(빨강, 하이라이트)
      P(1, 8, 4, 1, '#c9a52a'); P(3, 9, 2, 1, '#c9a52a'); P(2, 10, 2, 2, '#7a4f2e'); P(0, 9, 2, 2, '#7a4f2e');   // 날밑·손잡이
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
    this.wrapText(ctx, this.text.slice(0, this.shown), 440 - (tx - 20) - 14).slice(0, 3).forEach((line, i) => ctx.fillText(line, tx, 254 + i * LH));
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
    const w = 172, pad = 10, lh = 14; const lines = this.wrapText(ctx, b.text, w - pad * 2);
    const h = Math.max(50, lines.length * lh + pad * 2);
    const x = Math.round(e.x - 66 - w), cy = Math.max(6 + h / 2, Math.round(e.y - 62)), y = Math.round(cy - h / 2);
    ctx.fillStyle = '#fff'; this.roundRect(ctx, x, y, w, h, 9); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x + w - 2, cy - 10); ctx.lineTo(x + w + 18, cy + 1); ctx.lineTo(x + w - 2, cy + 8); ctx.closePath(); ctx.fill();   // 꼬리(적 쪽)
    ctx.fillStyle = '#000'; let left = b.shown;
    lines.forEach((line, i) => { if (left <= 0) return; ctx.fillText(line.slice(0, left), x + pad, y + pad + i * lh); left -= line.length + 1; });
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
      [L.battle_fight, L.battle_item].forEach((label, k) => { const bw = Math.ceil(ctx.measureText(label).width) + 30, bh = 20; const sel = this.menuIdx === k;   // 상자 = 하트 자리 + 글자 + 여백
        ctx.fillStyle = sel ? '#3a3000' : '#000'; ctx.fillRect(bx, by, bw, bh); ctx.strokeStyle = sel ? '#ffe066' : '#9a9ab0'; ctx.lineWidth = 2; ctx.strokeRect(bx + 1, by + 1, bw - 2, bh - 2);
        ctx.fillStyle = sel ? '#ffe066' : '#fff'; ctx.fillText(label, bx + 18, by + 2); if (sel) this.heart(ctx, bx + 6, by + 6); bx += bw + 8; });
    } else if (this.state === 'target') {                          // 델타룬 FIGHT: 적 목록 + HP 바, 하트 커서
      this.living().forEach((e, i) => { const y = row(i), sel = i === this.targetIdx; if (sel) this.heart(ctx, 38, y + 5); ctx.fillStyle = sel ? '#ffe066' : '#fff'; ctx.fillText(e.name, 54, y);
        this.hpBar(ctx, 250, y + 4, 90, e.hp, e.maxHp, '#4cd964', '#7a1b1b'); ctx.fillStyle = '#fff'; ctx.fillText(`${e.hp}/${e.maxHp}`, 350, y); });
    } else if (this.state === 'item') {                            // 델타룬 ITEM: 2열 격자
      const items = plainItems(this.game.inventory), page = Math.floor(this.itemIdx / 6) * 6;
      items.slice(page, page + 6).forEach((it, k) => { const i = page + k, x = 36 + Math.floor(k / 3) * 212, y = row(k % 3), sel = i === this.itemIdx; if (sel) this.heart(ctx, x + 2, y + 5); ctx.fillStyle = sel ? '#ffe066' : '#fff'; ctx.fillText(it + (ITEMS[it]?.heal ? ` (+${ITEMS[it].heal})` : ''), x + 18, y); });
    } else if (this.state === 'item-target') {                     // 누구에게: 멤버 목록 + 색 HP 바
      this.members.forEach((t, i) => { const y = row(i), sel = i === this.itemTargetIdx; if (sel) this.heart(ctx, 38, y + 5); ctx.fillStyle = t.down ? '#777' : sel ? '#ffe066' : '#fff'; ctx.fillText(t.name, 54, y);
        this.hpBar(ctx, 250, y + 4, 90, t.hp, t.maxHp, this.hpColor(t), '#3a2020'); ctx.fillStyle = '#fff'; ctx.fillText(`${t.hp}/${t.maxHp}`, 350, y); });
      ctx.fillStyle = '#9a9ab0'; ctx.textAlign = 'right'; ctx.fillText(this.itemName || '', 444, 254); ctx.textAlign = 'left';
    }
    if (this.state === 'item-target') {                           // 대상 멤버 위에 화살표
      const t = this.members[this.itemTargetIdx]; if (t) { const ax = t.home[0], ay = t.home[1] - 92; ctx.fillStyle = '#ffe066'; ctx.beginPath(); ctx.moveTo(ax - 7, ay); ctx.lineTo(ax + 7, ay); ctx.lineTo(ax, ay + 9); ctx.closePath(); ctx.fill(); }
    }
    if (this.state === 'target') {                                // 고르는 적 위에 화살표 (HP 는 목록에)
      const e = this.living()[this.targetIdx]; if (e) { const ax = e.x, ay = Math.max(6, e.y - 112); ctx.fillStyle = '#ffe066'; ctx.beginPath(); ctx.moveTo(ax - 7, ay); ctx.lineTo(ax + 7, ay); ctx.lineTo(ax, ay + 9); ctx.closePath(); ctx.fill(); }
    }
  }
}
