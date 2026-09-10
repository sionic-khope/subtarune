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
const PARTY_X = 84, PARTY_YS = { 1: [178], 2: [120, 236], 3: [92, 178, 264] };
const ENEMY_X = 396, ENEMY_YS = { 1: [186], 2: [124, 244], 3: [96, 186, 276] };
const ACTOR_SCALE = 0.6;             // 미리보기(0.25) 대비 — 화면에 셋을 세로로 세우려면 작게
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
    this.load();
  }

  async load() {
    await Promise.all([
      ...this.members.map(async (m) => { m.frames = await loadActorFrames(BATTLE_SPRITES[m.id], BATTLE_PREVIEW.colorKey); }),
      ...this.enemies.map(async (e) => { e.img = await this.loadEnemyImage(e.def); }),
    ]);
    if (this.cfg.bgm) this.game.sound.playBgm(this.cfg.bgm, { volume: 0.5 });
    this.setText(this.enemies.map((e) => e.def.lines?.appear).filter(Boolean).join('\n') || `* ${this.enemies[0].name} 이(가) 나타났다!`);
    this.state = 'intro'; this.t = 0;
  }
  loadEnemyImage(def) {
    return new Promise((resolve) => { const im = new Image(); im.onload = () => resolve(im); im.onerror = () => resolve(null); im.src = def.image || def.sheet?.src; });
  }

  // ── 유틸 ──
  alive() { return this.members.filter((m) => !m.down); }
  living() { return this.enemies.filter((e) => !e.dead); }
  setText(t) { this.text = stripTags(t); this.textT = 0; }
  sfx(n) { this.game.sound.sfx(n); }

  // ── 진행 ──
  update(dt, input) {
    this.t += dt;
    for (const m of this.members) { if (m.action) m.action.update(dt); if (m.popup) { m.popup.t += dt; if (m.popup.t > 0.9) m.popup = null; } }
    for (const e of this.enemies) { if (e.shake > 0) e.shake -= dt; if (e.blink > 0) e.blink -= dt; if (e.dying > 0) { e.dying -= dt; if (e.dying <= 0) { e.dead = true; } } if (e.popup) { e.popup.t += dt; if (e.popup.t > 0.9) e.popup = null; } }
    this.board.update(dt);
    switch (this.state) {
      case 'load': return;
      case 'intro': if (this.t > 0.6 && (input.just('confirm') || this.t > 2.2)) this.beginMenu(); return;
      case 'menu': return this.updateMenu(input);
      case 'target': return this.updateTarget(input);
      case 'item': return this.updateItem(input);
      case 'text': if (this.t > 0.5 && (input.just('confirm') || this.t > 1.6)) { this.state = this.after || 'menu'; this.t = 0; } return;
      case 'act': return this.updateAct(dt);
      case 'enemy-text': if (this.t > 0.9) this.beginBullets(); return;
      case 'bullets': return this.updateBullets(dt, input);
      case 'board-close': if (this.t > 0.3) this.beginMenu(); return;
      case 'win': if (this.t > 0.6 && input.just('confirm')) this.finish(true); return;
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
    if (input.just('up') || input.just('left')) { this.targetIdx = (this.targetIdx + list.length - 1) % list.length; this.sfx('menu'); }
    if (input.just('down') || input.just('right')) { this.targetIdx = (this.targetIdx + 1) % list.length; this.sfx('menu'); }
    if (input.just('cancel')) { this.sfx('cancel'); this.state = 'menu'; return; }
    if (input.just('confirm')) { this.sfx('confirm'); this.plans.push({ member: this.members[this.memberIdx], type: 'fight', target: list[this.targetIdx] }); this.nextMember(); }
  }
  updateItem(input) {
    const items = plainItems(this.game.inventory); if (!items.length) { this.state = 'menu'; return; }
    if (input.just('up')) { this.itemIdx = (this.itemIdx + items.length - 1) % items.length; this.sfx('menu'); }
    if (input.just('down')) { this.itemIdx = (this.itemIdx + 1) % items.length; this.sfx('menu'); }
    if (input.just('cancel')) { this.sfx('cancel'); this.state = 'menu'; return; }
    if (input.just('confirm')) { this.sfx('confirm'); const name = items[this.itemIdx]; this.plans.push({ member: this.members[this.memberIdx], type: 'item', name }); this.nextMember(); }
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
      if (!this.living().length) { this.state = 'win'; this.t = 0; this.setText(L.battle_win); return; }
      this.beginEnemyTurn(); return;
    }
    const plan = this.plans[this.actIdx++];
    if (plan.member.down) return;
    if (plan.type === 'item') { this.useItem(plan.member, plan.name); this.actWait = 0.5; return; }
    let target = plan.target; if (target.dead || target.dying > 0) target = this.living()[0]; if (!target) return;
    plan.target = target;
    const def = BATTLE_SPRITES[plan.member.id]; const attackT = def.attack.reduce((s, f) => s + f.duration, 0);
    const action = new FastAction(plan.member.home, [target.x - 44, target.y + 6], attackT / ATTACK_SPEEDUP); action.start();
    plan.member.action = action; this.cur = { plan, action, hit: false };
  }
  hitEnemy(e, by) {
    e.hp = Math.max(0, e.hp - 1); e.shake = 0.35; e.blink = 0.3; e.popup = { t: 0, text: '1' };
    this.sfx('hit');
    if (e.hp <= 0) { e.dying = 0.5; this.setText(e.def.lines?.die || `* ${e.name} 이(가) 쓰러졌다.`); } else this.setText(e.def.lines?.hurt || '');
  }
  useItem(m, name) {
    const def = ITEMS[name] || {}; const i = this.game.inventory.indexOf(name); if (i >= 0) this.game.inventory.splice(i, 1);
    if (def.heal) { m.hp = Math.min(m.maxHp, m.hp + def.heal); m.popup = { t: 0, text: '+' + def.heal, heal: true }; }
    this.sfx('item'); this.setText(`* ${m.name} 이(가) ${name} 을(를) 썼다.`);
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
    ctx.font = FONT; ctx.textBaseline = 'top';
    for (const e of this.enemies) this.drawEnemy(ctx, e);
    const idle = this.members.filter((m) => !m.action || m.action.mode === 'idle'), busy = this.members.filter((m) => m.action && m.action.mode !== 'idle');
    for (const m of idle) this.drawMember(ctx, m);
    for (const m of busy) this.drawMember(ctx, m);
    if (this.state === 'bullets' || this.state === 'board-close') { this.board.draw(ctx); if (this.state === 'bullets') { for (const b of this.bullets) b.draw(ctx); this.soul.draw(ctx); } }
    else this.drawPanel(ctx);
    if (this.state === 'lose') this.drawTextBox(ctx);
  }
  drawMember(ctx, m) {
    if (!m.frames) return;
    const act = m.action, mode = act ? act.mode : 'idle', running = mode === 'approach' || mode === 'return';
    const seq = m.frames[running ? 'run' : mode === 'attack' ? 'attack' : 'idle'];
    const { index } = playbackFrameAt(seq, act && mode !== 'idle' ? act.elapsed * (mode === 'attack' ? ATTACK_SPEEDUP : 1) : this.t, mode !== 'attack');
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
    const sh = e.def.sheet; const sx = e.shake > 0 ? Math.round(Math.sin(e.shake * 60) * 3) : 0;
    if (e.blink > 0 && Math.floor(e.blink * 20) % 2) { if (e.popup) this.drawPopup(ctx, e.x, e.y - 60, e.popup.text, e.popup.t, '#fff'); return; }
    ctx.save(); if (e.dying > 0) ctx.globalAlpha = Math.max(0, e.dying / 0.5);
    if (e.img && sh) {
      const fw = Math.floor(e.img.width / sh.cols), fh = Math.floor(e.img.height / sh.rows); const frames = sh.frames || [0]; const col = frames[Math.floor(this.t * (sh.fps || 2)) % frames.length];
      const s = e.def.scale ?? 1, dw = Math.round(fw / 2 * s), dh = Math.round(fh / 2 * s);
      ctx.drawImage(e.img, col * fw, sh.row * fh, fw, fh, Math.round(e.x - dw / 2 + sx), Math.round(e.y - dh), dw, dh);
    } else if (e.img) {
      const s = e.def.scale ?? 1, dw = Math.round(e.img.width * s), dh = Math.round(e.img.height * s);
      ctx.drawImage(e.img, Math.round(e.x - dw / 2 + sx), Math.round(e.y - dh), dw, dh);
    } else { ctx.fillStyle = '#7a8'; ctx.fillRect(e.x - 20 + sx, e.y - 44, 40, 44); }
    ctx.restore();
    if (e.popup) this.drawPopup(ctx, e.x, e.y - 60, e.popup.text, e.popup.t, '#fff');
  }
  drawPopup(ctx, x, y, text, t, col) {
    ctx.save(); ctx.globalAlpha = t < 0.6 ? 1 : Math.max(0, 1 - (t - 0.6) / 0.3); ctx.fillStyle = col; ctx.textAlign = 'center';
    ctx.fillText(text, Math.round(x), Math.round(y - Math.min(14, t * 40))); ctx.restore(); ctx.textAlign = 'left';
  }
  box(ctx, x, y, w, h) { ctx.fillStyle = '#000'; ctx.fillRect(x, y, w, h); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3); }
  heart(ctx, x, y) { ctx.fillStyle = '#ff0000'; ctx.fillRect(x, y + 1, 2, 2); ctx.fillRect(x + 3, y + 1, 2, 2); ctx.fillRect(x - 1, y + 3, 7, 2); ctx.fillRect(x, y + 5, 5, 1); ctx.fillRect(x + 1, y + 6, 3, 1); ctx.fillRect(x + 2, y + 7, 1, 1); }
  drawTextBox(ctx) {
    this.box(ctx, 20, 268, 440, 84); ctx.fillStyle = '#fff'; ctx.textAlign = 'left';
    this.text.split('\n').forEach((line, i) => ctx.fillText(line, 36, 282 + i * LH));
  }
  drawPanel(ctx) {
    if (this.state === 'intro' || this.state === 'win' || this.state === 'lose' || this.state === 'text' || this.state === 'enemy-text' || this.state === 'act' || this.state === 'load') { this.drawTextBox(ctx); return; }
    // 멤버 카드 (델타룬식): 이름 · HP 바 · 현재 멤버 위에 [공격하기] [아이템]
    const n = this.members.length, cw = Math.floor(440 / n);
    this.box(ctx, 20, 268, 440, 84);
    this.members.forEach((m, i) => {
      const x = 20 + i * cw, active = i === this.memberIdx && (this.state === 'menu' || this.state === 'target' || this.state === 'item');
      ctx.fillStyle = m.down ? '#777' : active ? '#ffe066' : '#fff'; ctx.textAlign = 'left'; ctx.fillText(m.name, x + 12, 278);
      ctx.fillStyle = '#7a1b1b'; ctx.fillRect(x + 12, 300, cw - 24, 8); ctx.fillStyle = m.down ? '#555' : '#ffd23b'; ctx.fillRect(x + 12, 300, Math.round((cw - 24) * m.hp / m.maxHp), 8);
      ctx.fillStyle = '#fff'; ctx.fillText(`${L.battle_hp} ${m.hp}/${m.maxHp}${m.down ? ' ' + L.battle_down : ''}`, x + 12, 314);
      if (this.plans.some((p) => p.member === m)) { ctx.fillStyle = '#9fd3ff'; ctx.fillText(L.battle_fight, x + 12, 334); }
      if (active && this.state === 'menu') {                     // 버튼 두 개
        [L.battle_fight, L.battle_item].forEach((label, k) => { const bx = x + 12 + k * 84, by = 334; ctx.fillStyle = this.menuIdx === k ? '#ffe066' : '#fff'; ctx.fillText(label, bx + 12, by); if (this.menuIdx === k) this.heart(ctx, bx, by + 4); });
      }
    });
    if (this.state === 'target') {                                // 적 목록 (이름 + HP%)
      const list = this.living(); this.box(ctx, 120, 150, 240, 24 + list.length * LH + 8);
      ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.fillText(L.battle_target, 134, 158);
      list.forEach((e, i) => { const y = 180 + i * LH; if (i === this.targetIdx) this.heart(ctx, 134, y + 4); ctx.fillStyle = i === this.targetIdx ? '#ffe066' : '#fff'; ctx.fillText(e.name, 150, y); ctx.fillStyle = '#7a1b1b'; ctx.fillRect(250, y + 4, 80, 8); ctx.fillStyle = '#4cd964'; ctx.fillRect(250, y + 4, Math.round(80 * e.hp / e.maxHp), 8); ctx.fillStyle = '#fff'; ctx.fillText(`${Math.round(100 * e.hp / e.maxHp)}%`, 336, y); });
    }
    if (this.state === 'item') {
      const items = plainItems(this.game.inventory); this.box(ctx, 120, 150, 240, 24 + items.length * LH + 8);
      ctx.fillStyle = '#fff'; ctx.fillText(L.battle_item, 134, 158);
      items.forEach((name, i) => { const y = 180 + i * LH; if (i === this.itemIdx) this.heart(ctx, 134, y + 4); ctx.fillStyle = i === this.itemIdx ? '#ffe066' : '#fff'; ctx.fillText(name, 150, y); });
    }
    if (this.text && this.state === 'menu') { ctx.fillStyle = '#cfcfdd'; ctx.textAlign = 'center'; ctx.fillText(this.text.split('\n')[0], 240, 246); ctx.textAlign = 'left'; }
  }
}
