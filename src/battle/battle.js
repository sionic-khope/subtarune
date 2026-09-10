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
import { CHARACTERS } from '../data/characters.js';
import { ENEMIES } from '../data/enemies.js';
import { BATTLE_SPRITES, BATTLE_PREVIEW } from '../data/battle-sprites.js';
import { loadActorFrames, playbackFrameAt } from '../ui/battle-preview.js';
import { BattleAction } from '../ui/battle-action.js';
import { Board, Soul, Bullet, PATTERNS } from './bullets.js';
import { ITEMS, plainItems } from '../data/items.js';
import L from '../data/locale/ko.js';

const SCREEN_W = 480, SCREEN_H = 360, LH = 18;
const PARTY_ORDER = ['hyungsub', 'gyeongsub', 'ppaman'];   // 위→아래 (브리핑 순서)
const PARTY_X = 84, PARTY_YS = { 1: [172], 2: [118, 218], 3: [84, 162, 240] };   // 세로 간격 78px — 셋이 패널(y 268) 위에 다 들어온다 (2026-09-10 사용자)
const ENEMY_X = 396, ENEMY_YS = { 1: [186], 2: [124, 244], 3: [96, 186, 276] };
const ACTOR_SCALE = 0.66;            // 미리보기(0.25) 대비 (사용자 요청으로 10% 확대)
const APPROACH_SPEED = 820, RETURN_SPEED = 700;   // px/s — "생각보다 빠르게"
const ATTACK_SPEEDUP = 1.35;         // 공격 모션 재생 배속
const BETWEEN_ACTS = 0.08;           // 멤버 사이 딜레이(초) — "빠르게빠르게"
const HIT_AT = 0.14;                 // 공격 모션 시작 뒤 이 시점에 데미지·효과음
const stripTags = (t) => (t || '').replace(/\{[^}]*\}/g, '');

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
    this.result = null; this.pressed = false;
    if (cfg.bgm) game.sound.playBgm(cfg.bgm, { volume: 0.5, fadeIn: 0.15 });   // 전환 즉시(로딩 기다리지 않음 — 딜레이 지적)
    this.load();
  }

  async load() {
    await Promise.all([
      ...this.members.map(async (m) => { m.frames = await loadActorFrames(BATTLE_SPRITES[m.id], BATTLE_PREVIEW.colorKey); }),
      ...this.enemies.map(async (e) => { e.img = await this.loadEnemyImage(e.def); }),
    ]);
    this.members.forEach((m, i) => { m.pose = -0.12 * i; });   // 전투 시작 포즈: 공격 모션을 제자리에서 한 번(순서대로 살짝 어긋나게)
    this.setText(this.enemies.map((e) => e.def.lines?.appear).filter(Boolean).join('\n') || `* ${this.enemies[0].name} 이(가) 나타났다!`);
    this.state = 'intro'; this.t = 0;
  }
  loadEnemyImage(def) {
    return new Promise((resolve) => { const im = new Image(); im.onload = () => resolve(im); im.onerror = () => resolve(null); im.src = def.image || def.sheet?.src; });
  }

  // ── 유틸 ──
  alive() { return this.members.filter((m) => !m.down); }
  living() { return this.enemies.filter((e) => !e.dead); }
  setText(t) { this.text = stripTags(t); this.textT = 0; this.shown = 0; }
  get typed() { return this.shown >= this.text.length; }
  /** 전투 문구 타자: 22ms 마다 한 글자, 글자마다 나레이션 블립(띠리리링) */
  typeText(dt) {
    if (this.shown >= this.text.length) return;
    this.textT += dt; const n = Math.min(this.text.length, Math.floor(this.textT / 0.022));
    for (let i = this.shown; i < n; i++) if (this.text[i] !== ' ' && this.text[i] !== '\n') this.game.sound.blip('narrator');
    this.shown = n;
  }
  sfx(n) { this.game.sound.sfx(n); }

  // ── 진행 ──
  update(dt, input) {
    this.t += dt;
    for (const m of this.members) { if (m.action) m.action.update(dt); if (m.popup) { m.popup.t += dt; if (m.popup.t > 0.9) m.popup = null; } if (m.pose !== undefined && m.pose !== null) { m.pose += dt; const T = BATTLE_SPRITES[m.id].attack.reduce((a, f) => a + f.duration, 0); if (m.pose > T) m.pose = null; } }
    this.enemies.forEach((e, i) => { if (e.shake > 0) e.shake -= dt; if (e.blink > 0) e.blink -= dt; if (e.dying > 0) { e.dying -= dt; if (e.dying <= 0) { e.dead = true; } } if (e.popup) { e.popup.t += dt; if (e.popup.t > 0.9) e.popup = null; }
      const idle = e.def.idle || { swayX: 7, swayY: 2, period: 2.8 }; const ph = this.t * Math.PI * 2 / (idle.period || 2.8) + i * 1.9;   // 기본 모션: 좌우로 천천히(사용자: 정적인 느낌 없애기), 살짝 위아래
      e.ox = Math.sin(ph) * (idle.swayX ?? 7); e.oy = -Math.abs(Math.sin(ph * 2)) * (idle.swayY ?? 2); });
    this.board.update(dt); this.typeText(dt);
    switch (this.state) {
      case 'load': return;
      case 'intro': if (input.just('confirm') && !this.typed) { this.shown = this.text.length; return; } if (this.typed && this.t > 0.6 && (input.just('confirm') || this.t > 2.4)) this.beginMenu(); return;
      case 'menu': return this.updateMenu(input);
      case 'target': return this.updateTarget(input);
      case 'item': return this.updateItem(input);
      case 'item-target': return this.updateItemTarget(input);
      case 'text': if (input.just('confirm') && !this.typed) { this.shown = this.text.length; return; } if (this.typed && this.t > 0.5 && (input.just('confirm') || this.t > 1.8)) { this.state = this.after || 'menu'; this.t = 0; } return;
      case 'act': return this.updateAct(dt);
      case 'enemy-text': if (this.typed && this.t > 0.9) this.beginBullets(); return;
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
    this.setText('');
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
  updateItem(input) {
    const items = plainItems(this.game.inventory); if (!items.length) { this.state = 'menu'; return; }
    if (input.just('up')) { this.itemIdx = (this.itemIdx + items.length - 1) % items.length; this.sfx('menu'); }
    if (input.just('down')) { this.itemIdx = (this.itemIdx + 1) % items.length; this.sfx('menu'); }
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
  updateAct(dt) {
    if (this.cur) {
      const { plan, action } = this.cur;
      if (action.mode === 'attack' && !this.cur.hit && action.elapsed >= HIT_AT) { this.cur.hit = true; this.hitEnemy(plan.target, plan.member); }
      if (action.mode === 'idle') { this.cur = null; this.actWait = BETWEEN_ACTS; }
      return;
    }
    if (this.actWait > 0) { this.actWait -= dt; return; }
    if (this.actIdx >= this.plans.length) {
      if (!this.living().length) { this.state = 'win'; this.t = 0; this.setText(L.battle_win); this.game.sound.stopBgm(0.3); this.sfx('won'); return; }
      this.beginEnemyTurn(); return;
    }
    const plan = this.plans[this.actIdx++];
    if (plan.member.down) return;
    if (plan.type === 'item') { this.useItem(plan.target || plan.member, plan.name, plan.member); this.actWait = 0.6; return; }
    let target = plan.target; if (target.dead || target.dying > 0) target = this.living()[0]; if (!target) return;
    plan.target = target;
    const def = BATTLE_SPRITES[plan.member.id]; const attackT = def.attack.reduce((s, f) => s + f.duration, 0);
    const action = new FastAction(plan.member.home, [target.x - 44, target.y + 6], attackT / ATTACK_SPEEDUP); action.start();
    plan.member.action = action; this.cur = { plan, action, hit: false };
  }
  hitEnemy(e, by) {
    e.hp = Math.max(0, e.hp - 1); e.shake = 0.35; e.blink = 0.3; e.popup = { t: 0, text: '1' };
    this.sfx('hit'); this.sfx('damage');                        // 델타룬 공식: 베기(snd_laz) + 타격(snd_damage)
    if (e.hp <= 0) { e.dying = 0.5; this.sfx('vaporized'); this.setText(e.def.lines?.die || `* ${e.name} 이(가) 쓰러졌다.`); }   // 맞았을 때 문구는 없음(사용자)
  }
  useItem(m, name, by = m) {
    const def = ITEMS[name] || {}; const i = this.game.inventory.indexOf(name); if (i >= 0) this.game.inventory.splice(i, 1);
    if (def.heal) { const before = m.hp; m.hp = Math.min(m.maxHp, m.hp + def.heal); if (m.down && m.hp > 0) m.down = false; m.popup = { t: 0, text: '+' + (m.hp - before), heal: true }; }
    this.sfx('heal'); this.setText(`* ${by.name} 이(가) ${m.name} 에게 ${name} 을(를) 썼다.`);
  }

  // ── 적 턴 ──
  beginEnemyTurn() {
    const e = this.living()[Math.floor(this.rnd() * this.living().length)];
    const idle = e.def.lines?.idle || []; this.setText(idle.length ? idle[Math.floor(this.rnd() * idle.length)] : '');
    this.state = 'enemy-text'; this.t = 0;
  }
  beginBullets() {
    this.patterns = this.living().map((e) => { const cfgs = e.def.patterns || [{ type: 'rain' }]; const c = cfgs[e.patternIdx++ % cfgs.length]; return { p: PATTERNS[c.type](c), t: 0, dmg: c.damage ?? e.def.damage ?? 6 }; });
    const bw = Math.max(...this.living().map((e) => e.def.board?.[0] || 200)), bh = Math.max(...this.living().map((e) => e.def.board?.[1] || 150));
    this.board.setTarget(bw, bh, 240, 214); this.board.snap(); this.soul.center(this.board); this.soul.invuln = 0; this.bullets = [];
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
    if (!running && (!this.bullets.length || this.t > Math.max(...this.patterns.map((p) => p.p.duration)) + 1.2)) { this.bullets = []; this.state = 'board-close'; this.t = 0; this.board.setTarget(440, 84, 240, 310); }
  }
  hurtParty(dmg) {
    const alive = this.alive(); if (!alive.length) return;
    const m = alive[Math.floor(this.rnd() * alive.length)];
    m.hp = Math.max(0, m.hp - dmg); m.popup = { t: 0, text: String(dmg) };
    this.soul.invuln = 0.75; this.soul.hits++; this.sfx('hurt'); this.game.shake = { time: 0.15, amp: 2 };
    if (m.hp <= 0) { m.down = true; }
    if (!this.alive().length) { this.bullets = []; this.state = 'lose'; this.t = 0; this.board.setTarget(440, 84, 240, 310); this.setText(L.battle_lose); }
  }
  retry() {
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
    if (this.state === 'bullets' || this.state === 'board-close') { this.board.draw(ctx); if (this.state === 'bullets') { for (const b of this.bullets) b.draw(ctx); this.soul.draw(ctx); } this.drawHpStrip(ctx); }
    else this.drawPanel(ctx);
    if (this.state === 'lose') this.drawTextBox(ctx);
  }
  drawMember(ctx, m) {
    if (!m.frames) return;
    const act = m.action, posing = m.pose !== undefined && m.pose !== null && m.pose >= 0 && (!act || act.mode === 'idle');
    const mode = act ? act.mode : posing ? 'attack' : 'idle', running = mode === 'approach' || mode === 'return';
    const seq = m.frames[running ? 'run' : mode === 'attack' ? 'attack' : 'idle'];
    const { index } = playbackFrameAt(seq, posing ? m.pose : act && mode !== 'idle' ? act.elapsed * (mode === 'attack' ? ATTACK_SPEEDUP : 1) : this.t, mode !== 'attack');
    const fr = seq[index]; const def = BATTLE_SPRITES[m.id];
    const scale = (running ? def.run.scale : def.scale) * ACTOR_SCALE;
    const [px, py] = act ? act.position : m.home;
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
  /** 회피 중: 화면 아래 캐릭터별 색 HP 띠 (탄막 상자 아래) */
  drawHpStrip(ctx) {
    const n = this.members.length, cw = Math.floor(440 / n);
    this.members.forEach((m, i) => {
      const x = 20 + i * cw, y = 318;
      ctx.fillStyle = m.down ? '#777' : '#fff'; ctx.textAlign = 'left'; ctx.fillText(m.name, x + 12, y);
      ctx.fillStyle = '#3a2020'; ctx.fillRect(x + 12, y + 20, cw - 24, 7); ctx.fillStyle = m.down ? '#555' : this.hpColor(m); ctx.fillRect(x + 12, y + 20, Math.round((cw - 24) * m.hp / m.maxHp), 7);
      ctx.fillStyle = '#fff'; ctx.fillText(`${m.hp}/${m.maxHp}`, x + 12 + cw - 24 - 70, y);
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
  drawTextBox(ctx) {
    this.box(ctx, 20, 268, 440, 84); ctx.fillStyle = '#fff'; ctx.textAlign = 'left';
    this.text.slice(0, this.shown).split('\n').forEach((line, i) => ctx.fillText(line, 36, 282 + i * LH));
  }
  drawPanel(ctx) {
    if (['intro', 'win', 'lose', 'text', 'enemy-text', 'act', 'load'].includes(this.state)) { this.drawTextBox(ctx); return; }
    // 멤버 카드(델타룬식): 이름 · HP 바 · 현재 멤버 카드 안에 [공격하기] [아이템] 상자 버튼. 적 선택도 같은 패널 안(새 창 없음)
    const n = this.members.length, cw = Math.floor(440 / n);
    this.box(ctx, 20, 268, 440, 84);
    this.members.forEach((m, i) => {
      const x = 20 + i * cw, active = i === this.memberIdx && (this.state === 'menu' || this.state === 'target' || this.state === 'item' || this.state === 'item-target');
      if (active) { ctx.fillStyle = '#1a1a2a'; ctx.fillRect(x + 4, 272, cw - 8, 76); }
      ctx.fillStyle = m.down ? '#777' : active ? '#ffe066' : '#fff'; ctx.textAlign = 'left'; ctx.fillText(m.name, x + 12, 276);
      ctx.fillStyle = '#3a2020'; ctx.fillRect(x + 12, 296, cw - 24, 7); ctx.fillStyle = m.down ? '#555' : this.hpColor(m); ctx.fillRect(x + 12, 296, Math.round((cw - 24) * m.hp / m.maxHp), 7);   // 캐릭터별 색
      ctx.fillStyle = '#fff'; ctx.fillText(`${L.battle_hp} ${m.hp}/${m.maxHp}${m.down ? ' ' + L.battle_down : ''}`, x + 12, 306);
      const planned = this.plans.find((pl) => pl.member === m);
      if (planned && !active) this.drawIcon(ctx, planned.type === 'fight' ? 'sword' : 'bread', x + 12, 326);   // 정한 행동: 아이콘(빨간 검 / 초록 빵)
      if (active && this.state === 'menu') {                     // 상자 버튼 두 개
        [L.battle_fight, L.battle_item].forEach((label, k) => { const bx = x + 6 + (k ? 82 : 0), by = 326, bw = k ? 56 : 78, bh = 20; const sel = this.menuIdx === k;
          ctx.fillStyle = sel ? '#3a3000' : '#000'; ctx.fillRect(bx, by, bw, bh); ctx.strokeStyle = sel ? '#ffe066' : '#9a9ab0'; ctx.lineWidth = 2; ctx.strokeRect(bx + 1, by + 1, bw - 2, bh - 2);
          ctx.fillStyle = sel ? '#ffe066' : '#fff'; ctx.textAlign = 'center'; ctx.fillText(label, bx + bw / 2 + (sel ? 5 : 0), by + 2); ctx.textAlign = 'left'; if (sel) this.heart(ctx, bx + 3, by + 6); });
      }
      if (active && this.state === 'target') {                   // 적 선택: 카드 안에 "◀ 이름 ▶" 한 줄 (← → 로 고름), 적 위에는 화살표+HP
        const list = this.living(), e = list[this.targetIdx]; const many = list.length > 1;
        ctx.fillStyle = '#ffe066'; ctx.textAlign = 'center'; ctx.fillText(`${many ? '◀ ' : ''}${e ? e.name : ''}${many ? ' ▶' : ''}`, x + cw / 2, 328); ctx.textAlign = 'left';
      }
      if (active && this.state === 'item') {                     // 아이템: 카드 안에 '◀ 이름 ▶'
        const items = plainItems(this.game.inventory); const many = items.length > 1;
        ctx.fillStyle = '#ffe066'; ctx.textAlign = 'center'; ctx.fillText(`${many ? '◀ ' : ''}${items[this.itemIdx] || ''}${many ? ' ▶' : ''}`, x + cw / 2, 328); ctx.textAlign = 'left';
      }
      if (active && this.state === 'item-target') {              // 대상: '◀ 이름 ▶' (누구에게)
        const t = this.members[this.itemTargetIdx]; ctx.fillStyle = '#ffe066'; ctx.textAlign = 'center'; ctx.fillText(`◀ ${t ? t.name : ''} ▶`, x + cw / 2, 328); ctx.textAlign = 'left';
      }
    });
    if (this.state === 'item-target') {                           // 대상 멤버 위에 화살표
      const t = this.members[this.itemTargetIdx]; if (t) { const ax = t.home[0], ay = t.home[1] - 92; ctx.fillStyle = '#ffe066'; ctx.beginPath(); ctx.moveTo(ax - 7, ay); ctx.lineTo(ax + 7, ay); ctx.lineTo(ax, ay + 9); ctx.closePath(); ctx.fill(); }
    }
    if (this.state === 'target') {                                // 고르는 적 위에 화살표 + HP 바 (화면 위쪽, 창 없음)
      const e = this.living()[this.targetIdx]; if (e) { const ax = e.x, ay = Math.max(6, e.y - 112); ctx.fillStyle = '#ffe066'; ctx.beginPath(); ctx.moveTo(ax - 7, ay); ctx.lineTo(ax + 7, ay); ctx.lineTo(ax, ay + 9); ctx.closePath(); ctx.fill();   // 화살표 → 그 아래 HP 바·%
        ctx.fillStyle = '#7a1b1b'; ctx.fillRect(ax - 24, ay + 13, 48, 6); ctx.fillStyle = '#4cd964'; ctx.fillRect(ax - 24, ay + 13, Math.round(48 * e.hp / e.maxHp), 6); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(`${Math.round(100 * e.hp / e.maxHp)}%`, ax + 44, ay + 7); ctx.textAlign = 'left'; }
    }
    if (this.text && this.state === 'menu') { ctx.fillStyle = '#cfcfdd'; ctx.textAlign = 'center'; ctx.fillText(this.text.split('\n')[0], 240, 246); ctx.textAlign = 'left'; }
  }
}
